import { BlockFrostAPI } from "@blockfrost/blockfrost-js"; // using import syntax
import dotenv from "dotenv";
dotenv.config();

export const blockfrost = new BlockFrostAPI({
  projectId: process.env.BLOCKFROST_PROJECT_ID ?? "",
  requestTimeout: 2000, // Add 2-second timeout
});
