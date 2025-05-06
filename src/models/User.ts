import axios from "axios";
import { blockfrost } from "../blockfrost";
import supabase from "../supabase/db";

interface User {
  email: string | null;
  name: string | null;
  wallet_address: string;
  is_admin: boolean;
}
class UserModel {
  email: string | null;
  name: string | null;
  wallet_address: string;
  constructor({ email, name, wallet_address }: User) {
    this.email = email;
    this.name = name;
    this.wallet_address = wallet_address;
  }
  static async getUserByWalletAddress(
    wallet_address: string,
    drep_id: string
  ): Promise<User | undefined> {
    try {

      const isAdmin = await this.getIsUserAdmin(drep_id);

      console.log(isAdmin);

      return {
        name: null,
        email:  null,
        wallet_address: wallet_address,
        is_admin: isAdmin,
      } as User;
    } catch (err: any) {
      console.log(err)
      return undefined;
    }
  }
  static async getUserDelegatedTo(
    wallet_address: string
  ): Promise<{ pool_id: string | null; active: boolean } | undefined> {
    try {
      // @ts-ignore Blockfrost didn't update their SDK with the latest types
      const { drep_id, active } = await blockfrost.accounts(wallet_address);

      return { pool_id: drep_id, active };
    } catch (err: any) {
      return undefined;
    }
  }
  static async getIsUserAdmin(drep_id: string): Promise<Boolean> {
    try {
      // If no drep_id provided, user is not an admin
      if (!drep_id) return false;
      
      const { data } = await axios.get<{
        active: boolean;
      }>(
        `https://cardano-mainnet.blockfrost.io/api/v0/governance/dreps/${drep_id}`,
        {
          headers: {
            project_id: process.env.BLOCKFROST_PROJECT_ID,
          },
        }
      );

      // if (error) throw error;
      if (!data) return false;
      return data.active;
    } catch (err: any) {
      // Check if error is 404 (drep not found) vs other errors
      const status = err.response?.status;
      if (status === 404) {
        // dRep ID doesn't exist
        return false;
      }
      console.log("Error checking dRep admin status:", err);
      // For other errors, assume false but log the error
      return false;
    }
  }
}
export { User, UserModel };
