import { Request, Response } from 'express';
import axios from 'axios';

// Get protocol parameters from Koios API
export const getProtocolParameters = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      'https://api.koios.rest/api/v1/epoch_params',
      {
        headers: {
          Authorization: `Bearer ${process.env.KOIOS_API_TOKEN}`,
        },
      }
    );

    if (!response.data || !response.data[0]) {
      throw new Error('No protocol parameters data received from Koios');
    }

    const params = response.data[0];
    
    // Transform Koios response to match expected format
    const protocolParams = {
      linearFee: {
        minFeeA: params.min_fee_a?.toString() || "44",
        minFeeB: params.min_fee_b?.toString() || "155381"
      },
      coinsPerUTxOByte: params.coins_per_utxo_size?.toString() || "4310",
      poolDeposit: params.pool_deposit?.toString() || "500000000",
      keyDeposit: params.key_deposit?.toString() || "2000000",
      maxValSize: params.max_val_size || 5000,
      maxTxSize: params.max_tx_size || 16384,
      priceMem: params.price_mem || 0.0577,
      priceStep: params.price_step || 0.0000721
    };

    res.status(200).json(protocolParams);
  } catch (error: any) {
    console.error('Error fetching protocol parameters:', error);
    res.status(500).json({ 
      message: 'Failed to fetch protocol parameters',
      error: error.message 
    });
  }
};

// Get current slot from Koios API
export const getCurrentSlot = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      'https://api.koios.rest/api/v1/tip',
      {
        headers: {
          Authorization: `Bearer ${process.env.KOIOS_API_TOKEN}`,
        },
      }
    );

    if (!response.data || !response.data[0] || typeof response.data[0].abs_slot !== 'number') {
      throw new Error('Invalid slot data received from Koios');
    }

    res.status(200).json({ currentSlot: response.data[0].abs_slot });
  } catch (error: any) {
    console.error('Error fetching current slot:', error);
    res.status(500).json({ 
      message: 'Failed to fetch current slot',
      error: error.message 
    });
  }
}; 