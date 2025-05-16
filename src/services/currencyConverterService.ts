import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price';

interface CacheEntry {
  price: number;
  timestamp: number;
}
const cache: Record<string, CacheEntry> = {};
const CACHE_DURATION_MS = 5 * 60 * 1000;

export const getSolToIdrRate = async (): Promise<number> => {
  const cacheKey = 'sol-idr';
  const now = Date.now();

  if (cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_DURATION_MS)) {
    return cache[cacheKey].price;
  }

  try {
    const response = await axios.get(COINGECKO_API_URL, {
      params: {
        ids: 'solana',
        vs_currencies: 'idr',
      },
    });

    if (response.data && response.data.solana && typeof response.data.solana.idr === 'number') {
      const rate = response.data.solana.idr;
      cache[cacheKey] = { price: rate, timestamp: now };
      return rate;
    } else {
      throw new Error('Invalid response format from CoinGecko API');
    }
  } catch (error) {
    console.log('Error fetching SOL to IDR rate from CoinGecko:', error);
    if (cache[cacheKey]) return cache[cacheKey].price;
    return 0;
  }
};

export const convertSolToIdr = async (solAmount: number | null | undefined): Promise<number | null> => {
  if (solAmount === null || solAmount === undefined || isNaN(solAmount)) {
    return null;
  }
  try {
    const rate = await getSolToIdrRate();
    return solAmount * rate;
  } catch (error) {
    console.log(`Failed to convert SOL to IDR for amount ${solAmount}: ${(error as Error).message}`);
    return null;
  }
};