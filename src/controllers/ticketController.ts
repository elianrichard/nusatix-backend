import { Request, Response, NextFunction } from 'express';
import { sequelize, Show, Ticket, Event } from '../models';
import { ShowAttributes } from '../models/showModel';
import { fetchJsonFromIpfs, uploadJsonToIpfs } from '../services/ipfsService';
import { convertSolToIdr } from '../services/currencyConverterService';
import { Op, Transaction } from 'sequelize';
import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import {
  Metaplex,
  keypairIdentity,
} from '@metaplex-foundation/js';
import { Nft, Sft } from '@metaplex-foundation/js';

interface PrepareTicketRequestBody {
  show_id: number;
}

interface FinalizeTicketRequestBody {
  ticket_id: number;
  user_wallet_address: string;
}

const getRandomNftImageUrl = (): string => {
  const nftId = Math.floor(Math.random() * 27) + 1;
  return `https://nusatix.elianrichard.my.id/nfts/${nftId}.png`;
};

export const prepareTicketForPurchase = async (req: Request, res: Response, next: NextFunction) => {
  const transaction: Transaction = await sequelize.transaction();
  try {
    const { show_id }: PrepareTicketRequestBody = req.body;

    if (!show_id) {
      await transaction.rollback();
      return res.status(400).json({ message: 'show_id is required.' });
    }

    const show = await Show.findByPk(show_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      include: [{ model: Event, as: 'event', required: true }]
    });

    if (!show) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Show not found.' });
    }
    const showWithEvent = show as Show & { event?: Event };
    if (!showWithEvent.is_active || (showWithEvent.event && !showWithEvent.event.is_active)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Show or Event is not active.' });
    }
    if (showWithEvent.tickets_sold >= showWithEvent.total_tickets) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tickets sold out for this show.' });
    }
    if (!showWithEvent.metadata_template_ipfs_cid) {
      await transaction.rollback();
      return res.status(500).json({ message: 'Show metadata template IPFS CID is not set.' });
    }

    let metadataTemplate: any;
    try {
      metadataTemplate = await fetchJsonFromIpfs(showWithEvent.metadata_template_ipfs_cid);
    } catch (ipfsError) {
      await transaction.rollback();
      console.log('Failed to fetch metadata template from IPFS:', ipfsError);
      return res.status(500).json({ message: 'Failed to fetch metadata template from IPFS.' });
    }

    const randomImageUrl = getRandomNftImageUrl();

    const uniqueTicketIdentifierSuffix = `${showWithEvent.show_id}-${showWithEvent.tickets_sold + 1}-${Date.now()}`;
    const finalMetadata = {
      name: `${metadataTemplate.name || showWithEvent.show_name || 'Ticket'} #${uniqueTicketIdentifierSuffix}`,
      description: metadataTemplate.description || `Ticket for ${showWithEvent.show_name || showWithEvent.event?.event_name}`,
      image: randomImageUrl,
      attributes: [
        ...(metadataTemplate.attributes || []),
      ],
    };

    let finalMetadataIpfsCid: string;
    try {
      const pinataMetadataName = `TicketMetadata-${uniqueTicketIdentifierSuffix}.json`;
      finalMetadataIpfsCid = await uploadJsonToIpfs(finalMetadata, { name: pinataMetadataName });
    } catch (ipfsError) {
      await transaction.rollback();
      console.log('Failed to upload final metadata to IPFS:', ipfsError);
      return res.status(500).json({ message: 'Failed to upload final ticket metadata to IPFS.' });
    }
    const nftMetadataUrl = `ipfs://${finalMetadataIpfsCid}`;

    const temporaryTicket = await Ticket.create({
      show_id: showWithEvent.show_id,
      owner_wallet_address: 'PENDING_OWNER',
      nft_mint_address: 'PENDING_MINT',
      nft_metadata_url: nftMetadataUrl,
      nft_name: finalMetadata.name,
      nft_image_url: finalMetadata.image || null,
    }, { transaction });

    await transaction.commit();

    res.status(200).json({
      message: 'Ticket prepared for purchase. Please proceed to payment and finalize.',
      ticket_id: temporaryTicket.ticket_id,
      metadata_ipfs_cid: finalMetadataIpfsCid,
      nft_image_url: randomImageUrl,
      sol_price: showWithEvent.sol_price,
      idr_price: await convertSolToIdr(showWithEvent.sol_price),
    });

  } catch (error) {
    const typedTransaction = transaction as Transaction & { finished?: string };
    if (!typedTransaction.finished || (typedTransaction.finished && typedTransaction.finished !== 'commit' && typedTransaction.finished !== 'rollback')) {
      await transaction.rollback();
    }
    console.error('[Prepare Ticket Error]', error);
    next(error);
  }
};


export const finalizeTicketPurchase = async (req: Request, res: Response, next: NextFunction) => {
  const transaction: Transaction = await sequelize.transaction();
  try {
    const { ticket_id, user_wallet_address }: FinalizeTicketRequestBody = req.body;

    if (!ticket_id || !user_wallet_address) {
      await transaction.rollback();
      return res.status(400).json({ message: 'ticket_id and user_wallet_address are required.' });
    }

    const ticket = await Ticket.findByPk(ticket_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      include: [{
        model: Show,
        as: 'show',
        required: true
      }]
    });

    if (!ticket) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Temporary ticket not found.' });
    }
    
    const ticketWithShow = ticket as Ticket & { show?: Show & ShowAttributes };

    if (ticketWithShow.owner_wallet_address !== 'PENDING_OWNER' || ticketWithShow.nft_mint_address !== 'PENDING_MINT') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Ticket already finalized or processing.' });
    }

    if (!ticketWithShow.show) {
      await transaction.rollback();
      return res.status(500).json({ message: 'Associated show not found for the ticket.' });
    }

    const solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(solanaRpcUrl, 'confirmed');

    const backendWalletSecretKeyString = process.env.BACKEND_WALLET_SECRET_KEY;
    if (!backendWalletSecretKeyString) {
      await transaction.rollback();
      console.log('BACKEND_WALLET_SECRET_KEY environment variable not set.');
      return res.status(500).json({ message: 'Server configuration error for Solana wallet.' });
    }

    let backendWallet: Keypair;
    try {
      const secretKeyArray = Uint8Array.from(JSON.parse(backendWalletSecretKeyString));
      backendWallet = Keypair.fromSecretKey(secretKeyArray);
    } catch (e) {
      await transaction.rollback();
      console.log('Failed to parse BACKEND_WALLET_SECRET_KEY:', e);
      return res.status(500).json({ message: 'Invalid server configuration for Solana wallet secret.' });
    }

    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(backendWallet))

    const buyerPublicKey = new PublicKey(user_wallet_address);

    const mintKeypair = Keypair.generate();
    console.log(`Creating new NFT mint: ${mintKeypair.publicKey.toBase58()}`);
    console.log(`Attempting to mint NFT with URI: ${ticketWithShow.nft_metadata_url}`);

    const nftDetails = {
      uri: ticketWithShow.nft_metadata_url,
      name: ticketWithShow.show?.show_name || "NusaTix Ticket",
      symbol: "NXTIX",
      sellerFeeBasisPoints: 0,
      creators: [{ address: backendWallet.publicKey, verified: true, share: 100 }],
      isMutable: false,
    };

    let createdNft: Nft | Sft;
    try {
      const { nft } = await metaplex.nfts().create({
        uri: nftDetails.uri,
        name: nftDetails.name,
        symbol: nftDetails.symbol,
        sellerFeeBasisPoints: nftDetails.sellerFeeBasisPoints,
        creators: nftDetails.creators,
        isMutable: nftDetails.isMutable,
        tokenOwner: buyerPublicKey,
      }, { commitment: 'finalized' });

      createdNft = nft;
      console.log(`NFT minted successfully! Address: ${createdNft.address.toBase58()}`);
      console.log(`Minted NFT Name: ${createdNft.name}, URI: ${createdNft.uri}`);
    } catch (solanaError) {
      await transaction.rollback();
      console.log('[Solana Minting Error]', solanaError);
      if (solanaError instanceof Error && solanaError.message.includes("Expected clicked Identity driver")) {
        console.log("Critical: Metaplex Identity not set. Check `metaplex.use(keypairIdentity(backendWallet))`.")
      }
      return res.status(500).json({ message: 'Failed to mint NFT on Solana.', error: (solanaError as Error).message });
    }

    const nftMintAddress = createdNft.address.toBase58();

    const solPriceForTicket = ticketWithShow.show.sol_price;
    const idrPriceForTicket = await convertSolToIdr(solPriceForTicket);

    await ticket.update({
      owner_wallet_address: user_wallet_address,
      nft_mint_address: nftMintAddress,
      purchase_price_sol: solPriceForTicket,
      purchase_price_idr: idrPriceForTicket,
    }, { transaction });

    const showToUpdate = ticketWithShow.show;
    if (showToUpdate.tickets_sold < showToUpdate.total_tickets) {
        showToUpdate.tickets_sold += 1;
        await showToUpdate.save({ transaction });
    } else {
        await transaction.rollback();
        return res.status(400).json({ message: 'Tickets sold out (race condition during finalize).' });
    }

    await transaction.commit();

    res.status(200).json({
      message: 'Ticket purchase finalized and NFT minted (simulated Solana interaction).',
      ticket: ticketWithShow,
    });

  } catch (error) {
    const typedTransaction = transaction as Transaction & { finished?: string };
    if (!typedTransaction.finished || (typedTransaction.finished && typedTransaction.finished !== 'commit' && typedTransaction.finished !== 'rollback')) {
      await transaction.rollback();
    }
    console.error('[Finalize Ticket Error]', error);
    next(error);
  }
};

export const getUserTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userWalletAddress } = req.params;

    if (!userWalletAddress) {
      return res.status(400).json({ message: 'User wallet address is required.' });
    }

    try {
      new PublicKey(userWalletAddress);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid Solana wallet address format.' });
    }

    const tickets = await Ticket.findAll({
      where: {
        owner_wallet_address: userWalletAddress,
        nft_mint_address: { 
          [Op.ne]: 'PENDING_MINT'
        }
      },
      include: [
        {
          model: Show,
          as: 'show',
          required: true,
          include: [
            {
              model: Event,
              as: 'event',
              required: true,
            },
          ],
        },
      ],
      order: [['purchased_at', 'DESC']],
    });

    if (!tickets || tickets.length === 0) {
      return res.status(200).json([]);
    }

    const formattedTickets = await Promise.all(
      tickets.map(async (ticketInstanceUntyped) => {
        const ticketInstance = ticketInstanceUntyped as Ticket & {
          show?: Show & { 
            event?: Event 
          }
        };

        return {
          ticket_id: ticketInstance.ticket_id,
          nft_mint_address: ticketInstance.nft_mint_address,
          nft_name: ticketInstance.nft_name,
          nft_image_url: ticketInstance.nft_image_url,
          purchased_at: ticketInstance.purchased_at,
          event_name: ticketInstance.show?.event?.event_name,
          show_name: ticketInstance.show?.show_name,
          show_date: ticketInstance.show?.show_date,
          show_start_time: ticketInstance.show?.show_start_time,
        };
      })
    );

    res.status(200).json(formattedTickets);
  } catch (error) {
    next(error);
  }
};