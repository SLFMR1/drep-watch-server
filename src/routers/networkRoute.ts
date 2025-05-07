import express from 'express';
import { getProtocolParameters, getCurrentSlot } from '../controllers/networkController';

const networkRoutes = express.Router();

// Get protocol parameters
networkRoutes.get('/protocol-parameters', getProtocolParameters);

// Get current slot
networkRoutes.get('/current-slot', getCurrentSlot);

export default networkRoutes; 