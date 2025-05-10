import { Request, Response, NextFunction } from 'express';
import { sequelize, Show, Ticket, Event } from '../models';
import { fetchJsonFromIpfs, uploadJsonToIpfs } from '../services/ipfsService';
import { Transaction } from 'sequelize';

interface MintTicketRequestBody {
  show_id: number;
  user_wallet_address: string;
}

export const mintTicket = async (req: Request, res: Response, next: NextFunction) => {
  const transaction: Transaction = await sequelize.transaction(); // Mulai transaksi database

  try {
    const { show_id, user_wallet_address }: MintTicketRequestBody = req.body;

    // TODO: validation
    if (!show_id || !user_wallet_address) {
      await transaction.rollback();
      return res.status(400).json({ message: 'show_id and user_wallet_address are required.' });
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
    // Cast show to include the event property for type safety
    const showWithEvent = show as Show & { event?: Event };

    if (!showWithEvent.is_active || (showWithEvent.event && !showWithEvent.event.is_active)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Show or Event is not active.' });
    }
    if (show.tickets_sold >= show.total_tickets) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tickets sold out for this show.' });
    }
    if (!show.metadata_template_ipfs_cid) {
      await transaction.rollback();
      return res.status(500).json({ message: 'Show metadata template IPFS CID is not set.' });
    }

    let metadataTemplate: any;
    try {
      metadataTemplate = await fetchJsonFromIpfs(show.metadata_template_ipfs_cid);
    } catch (ipfsError) {
      await transaction.rollback();
      console.error('Failed to fetch metadata template from IPFS:', ipfsError);
      return res.status(500).json({ message: 'Failed to fetch metadata template from IPFS.' });
    }

    const uniqueTicketIdentifier = `TICKET-${show.show_id}-${show.tickets_sold + 1}-${Date.now()}`;

    const uniqueMetadata = {
      ...metadataTemplate,
      name: `${metadataTemplate.name || showWithEvent.show_name || 'Ticket'} #${uniqueTicketIdentifier}`,
      attributes: [
        ...(metadataTemplate.attributes || []),
        { trait_type: "Ticket ID", value: uniqueTicketIdentifier },
        { trait_type: "Owner", value: user_wallet_address },
        { trait_type: "Show Name", value: showWithEvent.show_name || (showWithEvent.event?.event_name || '') },
        { trait_type: "Show Date", value: new Date(showWithEvent.show_date).toLocaleDateString() },
      ],
    };

    let uniqueMetadataIpfsCid: string;
    try {
      const pinataMetadataName = `Ticket-${uniqueTicketIdentifier}-Metadata-${Date.now()}.json`;
      uniqueMetadataIpfsCid = await uploadJsonToIpfs(uniqueMetadata, { name: pinataMetadataName });
    } catch (ipfsError) {
      await transaction.rollback();
      console.error('Failed to upload unique metadata to IPFS:', ipfsError);
      return res.status(500).json({ message: 'Failed to upload unique ticket metadata to IPFS.' });
    }

    const nftMetadataUrl = `ipfs://${uniqueMetadataIpfsCid}`;

    console.log(`[STUB] Minting NFT on Solana for wallet ${user_wallet_address} with metadata URI ${nftMetadataUrl}`);
    const simulatedNftMintAddress = `solana_nft_mint_addr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const simulatedIdrPrice = (show.sol_price || 0) * 250000; // Simulasi kurs

    const newTicket = await Ticket.create({
      show_id: show.show_id,
      owner_wallet_address: user_wallet_address,
      nft_mint_address: simulatedNftMintAddress,
      nft_metadata_url: nftMetadataUrl,
      purchase_price_sol: show.sol_price,
      purchase_price_idr: simulatedIdrPrice,
    }, { transaction });

    show.tickets_sold += 1;
    await show.save({ transaction });

    await transaction.commit();

    res.status(201).json({
      message: 'Ticket minted successfully (simulated Solana interaction).',
      ticket: newTicket,
      show_tickets_remaining: show.total_tickets - show.tickets_sold,
    });

  } catch (error) {
    const typedTransaction = transaction as Transaction & { finished?: string };
    if (typedTransaction.finished && typedTransaction.finished !== 'commit' && typedTransaction.finished !== 'rollback') {
        await transaction.rollback();
    }
    console.error('[Mint Ticket Error]', error);
    next(error);
  }
};