import PinataClient, { PinataPinResponse } from '@pinata/sdk';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const pinataApiKey = process.env.PINATA_API_KEY;
const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

if (!pinataApiKey || !pinataSecretApiKey) {
  console.log(
    'Pinata API Key atau Secret API Key tidak ditemukan di .env. IPFS service mungkin tidak berfungsi.'
  );
}

const pinata = pinataApiKey && pinataSecretApiKey ? new PinataClient(pinataApiKey, pinataSecretApiKey) : null;

/**
 * Mengupload objek JSON ke IPFS menggunakan Pinata.
 * @param jsonData Objek JSON yang akan diupload.
 * @param pinataMetadata Opsional, metadata untuk Pinata (misal: nama pin).
 * @returns Promise yang resolve dengan IPFS CID (IpfsHash dari response Pinata).
 * @throws Error jika upload gagal atau Pinata client tidak terinisialisasi.
 */
export const uploadJsonToIpfs = async (
  jsonData: object,
  pinataMetadata?: { name?: string; keyvalues?: Record<string, string | number | Date> }
): Promise<string> => {
  if (!pinata) {
    throw new Error('Pinata client tidak terinisialisasi. Cek API keys.');
  }

  try {
    const options = {
      pinataMetadata: {
        name: pinataMetadata?.name || `nusatixmetadata-${Date.now()}`,
        keyvalues: pinataMetadata?.keyvalues || {},
      },
      pinataOptions: {
        cidVersion: 0,
      },
    };

    const result: PinataPinResponse = await pinata.pinJSONToIPFS(jsonData, options as any);
    console.log('JSON successfully pinned to IPFS:', result);
    return result.IpfsHash;
  } catch (error) {
    console.error('Error uploading JSON to IPFS via Pinata:', error);
    throw new Error(`Failed to upload JSON to IPFS: ${(error as Error).message}`);
  }
};

/**
 * Mengambil konten JSON dari IPFS menggunakan public gateway.
 * @param cid IPFS CID dari file JSON.
 * @returns Promise yang resolve dengan objek JSON yang diambil.
 * @throws Error jika fetch gagal.
 */
export const fetchJsonFromIpfs = async (cid: string): Promise<object> => {
  const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

  try {
    const response = await axios.get(gatewayUrl);
    if (response.status === 200 && typeof response.data === 'object') {
      return response.data;
    } else {
      throw new Error(`Failed to fetch valid JSON from IPFS. Status: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error fetching JSON from IPFS (CID: ${cid}):`, error);
    throw new Error(`Failed to fetch JSON from IPFS (CID: ${cid}): ${(error as Error).message}`);
  }
};

// Contoh penggunaan (bisa dihapus atau dikomentari)
// export const testIpfsUpload = async () => {
//   if (!pinata) return;
//   try {
//     const exampleJson = {
//       name: "Test NFT Ticket",
//       description: "This is a test ticket for IPFS upload.",
//       attributes: [{ trait_type: "Color", value: "Blue" }]
//     };
//     const cid = await uploadJsonToIpfs(exampleJson, { name: "TestTicket.json" });
//     console.log(`Uploaded test JSON to IPFS. CID: ${cid}`);

//     const fetchedJson = await fetchJsonFromIpfs(cid);
//     console.log('Fetched JSON from IPFS:', fetchedJson);

//   } catch (error) {
//     console.error('Error in IPFS test function:', error);
//   }
// };
// testIpfsUpload(); // Panggil untuk tes jika perlu, setelah memastikan API keys ada