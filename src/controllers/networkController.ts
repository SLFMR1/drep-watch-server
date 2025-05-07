import { Request, Response } from 'express';
import axios from 'axios';
import NodeCache from 'node-cache';
import { blockfrost } from '../blockfrost';

// Initialize cache with 5 minute TTL
const cache = new NodeCache({ stdTTL: 300 });

// Default protocol parameters as fallback
const DEFAULT_PROTOCOL_PARAMS = {
  linearFee: {
    minFeeA: "44",
    minFeeB: "155381"
  },
  coinsPerUTxOByte: "4310",
  poolDeposit: "500000000",
  keyDeposit: "2000000",
  maxValSize: 5000,
  maxTxSize: 16384,
  priceMem: 0.0577,
  priceStep: 0.0000721
};

// Get protocol parameters from Koios API with caching and retries
export const getProtocolParameters = async (req: Request, res: Response) => {
  try {
    // Check cache first
    const cachedParams = cache.get('protocol_params');
    if (cachedParams) {
      console.log('Returning cached protocol parameters');
      return res.status(200).json(cachedParams);
    }

    const maxRetries = 3;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching protocol parameters from Koios (attempt ${attempt}/${maxRetries})...`);
        const response = await axios.get(
          'https://api.koios.rest/api/v1/epoch_params',
          {
            headers: {
              Authorization: `Bearer ${process.env.KOIOS_API_TOKEN}`,
            },
            timeout: 2000 // 2 second timeout
          }
        );

        if (!response.data || !response.data[0]) {
          throw new Error('No protocol parameters data received from Koios');
        }

        const params = response.data[0];
        
        // Transform Koios response to match expected format
        const protocolParams = {
          linearFee: {
            minFeeA: params.min_fee_a?.toString() || DEFAULT_PROTOCOL_PARAMS.linearFee.minFeeA,
            minFeeB: params.min_fee_b?.toString() || DEFAULT_PROTOCOL_PARAMS.linearFee.minFeeB
          },
          coinsPerUTxOByte: params.coins_per_utxo_size?.toString() || DEFAULT_PROTOCOL_PARAMS.coinsPerUTxOByte,
          poolDeposit: params.pool_deposit?.toString() || DEFAULT_PROTOCOL_PARAMS.poolDeposit,
          keyDeposit: params.key_deposit?.toString() || DEFAULT_PROTOCOL_PARAMS.keyDeposit,
          maxValSize: params.max_val_size || DEFAULT_PROTOCOL_PARAMS.maxValSize,
          maxTxSize: params.max_tx_size || DEFAULT_PROTOCOL_PARAMS.maxTxSize,
          priceMem: params.price_mem || DEFAULT_PROTOCOL_PARAMS.priceMem,
          priceStep: params.price_step || DEFAULT_PROTOCOL_PARAMS.priceStep
        };

        // Cache the successful response
        cache.set('protocol_params', protocolParams);
        
        return res.status(200).json(protocolParams);
      } catch (error: any) {
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          console.warn('All retry attempts failed, using fallback protocol parameters');
          // Cache the fallback values
          cache.set('protocol_params', DEFAULT_PROTOCOL_PARAMS);
          return res.status(200).json(DEFAULT_PROTOCOL_PARAMS);
        }

        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } catch (error: any) {
    console.error('Error in getProtocolParameters:', error);
    // Return fallback values on error
    return res.status(200).json(DEFAULT_PROTOCOL_PARAMS);
  }
};

// Get current slot from Blockfrost (primary) or Koios (fallback) with caching and retries
export const getCurrentSlot = async (req: Request, res: Response) => {
  try {
    // Check cache first
    const cachedSlot = cache.get('current_slot');
    if (cachedSlot) {
      console.log('Returning cached current slot');
      return res.status(200).json({ currentSlot: cachedSlot });
    }

    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    // Try Blockfrost first
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching current slot from Blockfrost (attempt ${attempt}/${maxRetries})...`);
        const blockfrostResponse = await blockfrost.blocksLatest();
        
        if (!blockfrostResponse || typeof blockfrostResponse.slot !== 'number') {
          throw new Error('Invalid slot data received from Blockfrost');
        }

        const currentSlot = blockfrostResponse.slot;
        
        // Cache the successful response
        cache.set('current_slot', currentSlot);
        
        return res.status(200).json({ currentSlot });
      } catch (error: any) {
        console.warn(`Blockfrost attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          console.warn('All Blockfrost attempts failed, trying Koios...');
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If Blockfrost fails, try Koios
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching current slot from Koios (attempt ${attempt}/${maxRetries})...`);
        const response = await axios.get(
          'https://api.koios.rest/api/v1/tip',
          {
            headers: {
              Authorization: `Bearer ${process.env.KOIOS_API_TOKEN}`,
            },
            timeout: 2000 // 2 second timeout
          }
        );

        if (!response.data || !response.data[0] || typeof response.data[0].abs_slot !== 'number') {
          throw new Error('Invalid slot data received from Koios');
        }

        const currentSlot = response.data[0].abs_slot;
        
        // Cache the successful response
        cache.set('current_slot', currentSlot);
        
        return res.status(200).json({ currentSlot });
      } catch (error: any) {
        console.warn(`Koios attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          console.warn('All Koios attempts failed, using fallback current slot');
          // Use a reasonable fallback slot number
          const fallbackSlot = Math.floor(Date.now() / 1000); // Current Unix timestamp as fallback
          cache.set('current_slot', fallbackSlot);
          return res.status(200).json({ currentSlot: fallbackSlot });
        }

        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } catch (error: any) {
    console.error('Error in getCurrentSlot:', error);
    // Return fallback slot on error
    const fallbackSlot = Math.floor(Date.now() / 1000);
    return res.status(200).json({ currentSlot: fallbackSlot });
  }
}; 