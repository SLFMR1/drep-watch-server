import axios from "axios";
import { getCache, setCache } from "../supabase/memcached";
import supabase from "../supabase/db";

interface Drep {
  email: string | null;
  name: string | null;
  drep_id: string;
}

const BATCHSIZE = 50;

class DrepModel {
  email: string | null;
  name: string | null;
  drep_id: string;
  constructor({ email, name, drep_id }: Drep) {
    this.email = email;
    this.name = name;
    this.drep_id = drep_id;
  }
  static async getDrep(
    id: string,
    ids?: string[]
  ): Promise<
    | {
        drep_id: string;
        body: {
          image: {
            contentUrl: string | undefined;
          };
          givenName: {
            "@value":
              | string
              | {
                  "@value": string | undefined;
                }
              | undefined;
          };
          motivations?: {
            "@value": string | undefined;
          };
          objectives?: {
            "@value": string | undefined;
          };
          qualifications?: {
            "@value": string | undefined;
          };
          paymentAddress?: {
            "@value": string | undefined;
          };
          references?: Array<{
            "@type": string;
            label: {
              "@value": string;
            };
            uri: {
              "@value": string;
            };
          }>;
        };
        voting_power?: number | null;
      }
    | undefined
  > {
    try {
      interface DrepInfoResponse {
        drep_id: string;
        hex: string;
        has_script: boolean;
        anchor_url: string;
        anchor_hash: string;
        active_epoch_no: number;
        amount: string;
        status: string;
        deposit: string;
      }

      let votingPower: string | undefined = undefined;
      let votingPowerNumeric: number | null = null;
      try {
        console.log(`[getDrep] Attempting to fetch drep info for ID: ${id}`);
        const infoResponse = await axios.post<DrepInfoResponse[]>(
          `https://api.koios.rest/api/v1/drep_info`,
          {
            _drep_ids: [id],
          },
          {
            headers: {
              Authorization:
                `Bearer ${process.env.KOIOS_API_TOKEN}`,
            },
            timeout: 10000
          }
        );
        
        console.log(`[getDrep] Koios /drep_info raw response data:`, JSON.stringify(infoResponse.data, null, 2));
        
        if (infoResponse.data?.[0]?.amount) {
          votingPower = infoResponse.data[0].amount;
          const parsedAmount = parseInt(votingPower, 10);
          if (isNaN(parsedAmount)) {
             console.warn(`[getDrep] Failed to parse voting power string "${votingPower}" for ${id} into a number.`);
             votingPowerNumeric = null;
          } else {
             votingPowerNumeric = parsedAmount;
             console.log(`[getDrep] Voting power FOUND and PARSED for ${id}: ${votingPowerNumeric} (from 'amount' field)`);
          }
        } else {
          console.log(`[getDrep] Voting power ('amount' field) NOT FOUND for ${id} in drep_info response.`);
        }
      } catch (infoError: any) {
        console.error(`[getDrep] Error fetching drep_info for ${id}. Status: ${infoError.response?.status}, Message:`, infoError.message);
        if (infoError.response?.data) {
          console.error('[getDrep] Error response data:', JSON.stringify(infoError.response.data, null, 2));
        }
      }

      interface DrepMetadataResponse {
        drep_id: string;
        hex: string;
        has_script: boolean;
        meta_url: string;
        hash: string;
        json: any;
        bytes: any;
        warning: any;
        language: any;
        comment: any;
        is_valid: boolean;
        meta_json: any;
      }

      console.log(`Fetching drep metadata for ID: ${id}`);
      
      const { data } = await axios.post<DrepMetadataResponse[]>(
        `https://api.koios.rest/api/v1/drep_metadata`,
        {
          _drep_ids: [id],
        },
        {
          headers: {
            Authorization:
              `Bearer ${process.env.KOIOS_API_TOKEN}`,
          },
        }
      );

      console.log("============== COMPLETE KOIOS API RESPONSE ==============");
      console.log(JSON.stringify(data, null, 2));
      console.log("========================================================");

      if (!data?.[0] || (!data[0].meta_json && !data[0].meta_url)) {
          console.log("No data, or missing both meta_json and meta_url. Cannot proceed.");
          return undefined;
      }

      if (data[0].meta_json) {
        console.log("============== METADATA STRUCTURE ==============");
        console.log("meta_json structure:", JSON.stringify(data[0].meta_json, null, 2));
        
        if (data[0].meta_json.body) {
          console.log("body structure:", JSON.stringify(data[0].meta_json.body, null, 2));
          console.log("motivations:", data[0].meta_json.body.motivations);
          console.log("objectives:", data[0].meta_json.body.objectives);
          console.log("qualifications:", data[0].meta_json.body.qualifications);
          console.log("references:", data[0].meta_json.body.references);
        }
        console.log("=================================================");

        let drepName: string | undefined = undefined; // Default to undefined
        const rawGivenName = data[0].meta_json?.body?.givenName;
        if (typeof rawGivenName === 'string') {
          drepName = rawGivenName; // Direct string
        } else if (typeof rawGivenName?.['@value'] === 'string') {
          drepName = rawGivenName['@value']; // Nested { @value: string }
        } else if (typeof rawGivenName?.['@value']?.['@value'] === 'string'){
           drepName = rawGivenName['@value']['@value']; // Double Nested { @value: { @value: string }}
        }
        // Add more checks here if other formats emerge

        let imageUrl: string | undefined = undefined; // Default to undefined
        const rawImage = data[0].meta_json?.body?.image;
        if (typeof rawImage === 'string') {
          imageUrl = rawImage; // Direct string URL
        } else if (typeof rawImage?.contentUrl === 'string') {
          imageUrl = rawImage.contentUrl; // Nested { contentUrl: string }
        }
        // Add more checks here if other formats emerge

        const result = {
          body: {
            givenName: { "@value": drepName },
            image: { contentUrl: imageUrl },
            motivations: data[0].meta_json?.body?.motivations,
            objectives: data[0].meta_json?.body?.objectives,
            qualifications: data[0].meta_json?.body?.qualifications,
            paymentAddress: data[0].meta_json?.body?.paymentAddress,
            references: data[0].meta_json?.body?.references,
          },
          drep_id: data[0]?.drep_id ?? id,
        };
        
        console.log("============== RESULT OBJECT BEING RETURNED ==============");
        console.log(JSON.stringify(result, null, 2));
        console.log("=========================================================");
        
        return { ...result, voting_power: votingPowerNumeric };
      } else if (data[0].meta_url) {
        let url = data[0].meta_url;
        let cid: string | null = null;

        // --- Improved IPFS URL Handling ---
        if (url.startsWith('ipfs://')) {
          cid = url.substring(7); // Get the part after ipfs://
        } else {
          // Fallback to previous logic for other potential formats like /ipfs/CID
          const parts = url.split('/');
          const ipfsIndex = parts.findIndex(part => part === 'ipfs');
          if (ipfsIndex !== -1 && ipfsIndex + 1 < parts.length) {
            cid = parts[ipfsIndex + 1];
          }
        }

        // Construct dweb link only if a CID was successfully extracted
        let fetchUrl = url; // Default to original URL
        if (cid) {
          fetchUrl = `https://dweb.link/ipfs/${cid}`;
          console.log(`[IPFS URL Handled] Original: ${url}, Fetching: ${fetchUrl}`);
        } else {
          console.log(`[IPFS URL Handled] Could not extract CID from: ${url}. Fetching original URL.`);
        }
        // --- End Improved IPFS URL Handling ---

        if (fetchUrl) { // Use the potentially modified fetchUrl
          try {
             const urlResponse = await axios.get(fetchUrl);
             if (urlResponse.status === 200) {
                const urlData = urlResponse.data.body || urlResponse.data; // Also handle cases where data is not nested in body
    
                // --- Refactored givenName parsing ---
                let drepName: string | undefined = undefined;
                const rawGivenNameUrl = urlData.givenName;
                if (typeof rawGivenNameUrl === 'string') {
                  drepName = rawGivenNameUrl;
                } else if (typeof rawGivenNameUrl?.['@value'] === 'string') {
                  drepName = rawGivenNameUrl['@value'];
                } else if (typeof rawGivenNameUrl?.['@value']?.['@value'] === 'string'){
                  drepName = rawGivenNameUrl['@value']['@value'];
                }
                
                // --- Refactored image parsing ---
                let imageUrl: string | undefined = undefined;
                const rawImageUrl = urlData.image;
                if (typeof rawImageUrl === 'string') {
                  imageUrl = rawImageUrl;
                } else if (typeof rawImageUrl?.contentUrl === 'string') {
                  imageUrl = rawImageUrl.contentUrl;
                }
                
                return {
                  body: {
                    givenName: { "@value": drepName },
                    image: { contentUrl: imageUrl },
                    motivations: urlData?.motivations,
                    objectives: urlData?.objectives,
                    qualifications: urlData?.qualifications,
                    paymentAddress: urlData?.paymentAddress,
                    references: urlData?.references,
                  },
                  drep_id: data[0]?.drep_id ?? id,
                  voting_power: votingPowerNumeric,
                };
              }
          } catch (error) {
            console.error(`Error fetching meta_url for ${id}:`, error);
          }
        }
      }
      return {
        drep_id: id,
        body: {
          givenName: {
            "@value": undefined,
          },
          image: {
            contentUrl: undefined,
          },
          motivations: undefined,
          objectives: undefined,
          qualifications: undefined,
          paymentAddress: undefined,
          references: undefined,
        },
        voting_power: null,
      };
    } catch (err: any) {
      return {
        drep_id: id,
        body: {
          givenName: {
            "@value": undefined,
          },
          image: {
            contentUrl: undefined,
          },
          motivations: undefined,
          objectives: undefined,
          qualifications: undefined,
          paymentAddress: undefined,
          references: undefined,
        },
        voting_power: null,
      };
    }
  }

  static async getBulkDrep(ids: string[]): Promise<
    | {
        drep_id: string;
        body: {
          image: {
            contentUrl: string | undefined;
          };
          givenName: {
            "@value": string | undefined;
          };
        };
        voting_power?: number | null;
      }[]
    | undefined
  > {
    try {
      if (!ids || ids.length === 0) return [];
      
      const filteredIds = ids.filter((drep) => drep.startsWith("drep1"));
      if (filteredIds.length === 0) return [];
      
      interface DrepInfoResponse {
        drep_id: string;
        amount: string;
      }
      let votingPowerMap = new Map<string, number | null>();
      try {
        console.log(`Fetching bulk drep info for ${filteredIds.length} IDs`);
        const infoResponse = await axios.post<DrepInfoResponse[]> (
          `https://api.koios.rest/api/v1/drep_info`,
          {
            _drep_ids: filteredIds,
          },
          {
            headers: {
              Authorization:
                `Bearer ${process.env.KOIOS_API_TOKEN}`,
            },
            timeout: 15000 // Increased timeout for bulk request
          }
        );

        if (infoResponse.data) {
          infoResponse.data.forEach(info => {
            if (info.drep_id && info.amount) {
              const amountString = info.amount;
              let parsedAmount: number | null = parseInt(amountString, 10);
              if (isNaN(parsedAmount)) {
                console.warn(`[getBulkDrep] Failed to parse voting power string "${amountString}" for ${info.drep_id} into a number.`);
                parsedAmount = null;
              }
              votingPowerMap.set(info.drep_id, parsedAmount);
            }
          });
          console.log(`Successfully mapped voting power (parsed as number) for ${votingPowerMap.size} DReps.`);
        } else {
          console.log("No data received from bulk drep_info endpoint.");
        }
      } catch (infoError: any) {
        console.error("Error fetching bulk drep_info:", infoError.message);
        // Continue without voting power if this fails
      }

      interface DrepMetadataResponse {
        drep_id: string;
        hex: string;
        has_script: boolean;
        meta_url: string;
        hash: string;
        meta_json: any;
        bytes: any;
        warning: any;
        language: any;
        comment: any;
        is_valid: boolean;
      }

      const { data } = await axios.post<DrepMetadataResponse[]>(
        `https://api.koios.rest/api/v1/drep_metadata`,
        {
          _drep_ids: filteredIds,
        },
        {
          headers: {
            Authorization:
              `Bearer ${process.env.KOIOS_API_TOKEN}`,
          },
        }
      );

      const results = [];
      
      // Process the data we received
      for (const item of data) {
        if (!item) continue;
        
        // First try to get metadata from meta_json if it exists
        if (item.meta_json && item.meta_json.body) {
          const metaBody = item.meta_json.body;
          
          // --- Refactored givenName parsing (Bulk - meta_json) ---
          let drepName: string | undefined = undefined;
          const rawGivenName = metaBody.givenName;
          if (typeof rawGivenName === 'string') {
            drepName = rawGivenName;
          } else if (typeof rawGivenName?.['@value'] === 'string') {
            drepName = rawGivenName['@value'];
          } else if (typeof rawGivenName?.['@value']?.['@value'] === 'string'){
            drepName = rawGivenName['@value']['@value'];
          }
          
          // --- Refactored image parsing (Bulk - meta_json) ---
          let imageUrl: string | undefined = undefined;
          const rawImage = metaBody.image;
          if (typeof rawImage === 'string') {
            imageUrl = rawImage;
          } else if (typeof rawImage?.contentUrl === 'string') {
            imageUrl = rawImage.contentUrl;
          }
          
          results.push({
            body: {
              givenName: { "@value": drepName },
              image: { contentUrl: imageUrl },
            },
            drep_id: item.drep_id,
            voting_power: votingPowerMap.get(item.drep_id) ?? null,
          });
          continue;
        }
        
        // If no meta_json, try to get from URL
        if (item.meta_url) {
          let url = item.meta_url;
          let cid: string | null = null;

          // --- Improved IPFS URL Handling (Bulk) ---
          if (url.startsWith('ipfs://')) {
            cid = url.substring(7);
          } else {
            const parts = url.split('/');
            const ipfsIndex = parts.findIndex(part => part === 'ipfs');
            if (ipfsIndex !== -1 && ipfsIndex + 1 < parts.length) {
              cid = parts[ipfsIndex + 1];
            }
          }

          let fetchUrl = url;
          if (cid) {
            fetchUrl = `https://dweb.link/ipfs/${cid}`;
            // console.log(`[Bulk IPFS URL] Original: ${url}, Fetching: ${fetchUrl}`); // Optional logging
          } else {
            // console.log(`[Bulk IPFS URL] Could not extract CID from: ${url}. Fetching original.`);
          }
          // --- End Improved IPFS URL Handling (Bulk) ---

          try {
            const urlResponse = await axios.get(fetchUrl, {
              timeout: 5000, // Add timeout for external URLs
            });
            if (urlResponse.status === 200) {
              const urlData = urlResponse.data.body || urlResponse.data;
              
              // --- Refactored givenName parsing (Bulk - meta_url) ---
              let drepName: string | undefined = undefined;
              const rawGivenNameUrl = urlData.givenName;
              if (typeof rawGivenNameUrl === 'string') {
                drepName = rawGivenNameUrl;
              } else if (typeof rawGivenNameUrl?.['@value'] === 'string') {
                drepName = rawGivenNameUrl['@value'];
              } else if (typeof rawGivenNameUrl?.['@value']?.['@value'] === 'string'){
                drepName = rawGivenNameUrl['@value']['@value'];
              }
              
              // --- Refactored image parsing (Bulk - meta_url) ---
              let imageUrl: string | undefined = undefined;
              const rawImageUrl = urlData.image;
              if (typeof rawImageUrl === 'string') {
                imageUrl = rawImageUrl;
              } else if (typeof rawImageUrl?.contentUrl === 'string') {
                imageUrl = rawImageUrl.contentUrl;
              }
              
              results.push({
                body: {
                  givenName: { "@value": drepName },
                  image: { contentUrl: imageUrl },
                },
                drep_id: item.drep_id,
                voting_power: votingPowerMap.get(item.drep_id) ?? null,
              });
              continue;
            }
          } catch (error) {
            console.error(`Error fetching meta_url for ${item.drep_id}:`, error);
          }
        }
        
        // If we reached here, add with empty data
        results.push({
          drep_id: item.drep_id,
          body: {
            givenName: { "@value": undefined },
            image: { contentUrl: undefined },
          },
          voting_power: votingPowerMap.get(item.drep_id) ?? null,
        });
      }
      
      // Make sure all requested dreps are included
      for (const id of filteredIds) {
        if (!results.some(r => r.drep_id === id)) {
          results.push({
            drep_id: id,
            body: {
              givenName: { "@value": undefined },
              image: { contentUrl: undefined },
            },
            voting_power: votingPowerMap.get(id) ?? null,
          });
        }
      }

      return results;
    } catch (err) {
      console.error("Error in getBulkDrep:", err);
      return [];
    }
  }

  static async getDrepByQuery(search_query: string): Promise<
    | {
        drep_id: string;
        active: boolean;
        image: string | null;
        givenName: string | null;
      }
    | {
        drep_id: string;
        active: boolean;
        image: string | null;
        givenName: string | null;
      }[]
    | undefined
  > {
    try {
      if (search_query.startsWith('drep1')) {
        try {
          const { data } = await axios.get<{
            drep_id: string;
            active: boolean;
          }>(
            `https://cardano-mainnet.blockfrost.io/api/v0/governance/dreps/${search_query}`,
            {
              headers: {
                project_id: process.env.BLOCKFROST_PROJECT_ID,
              },
            }
          );

          const drepData = await this.getDrep(search_query);

          if (!data || !drepData) return undefined;
          
          return {
            drep_id: data.drep_id,
            active: data?.active,
            givenName:
              typeof drepData?.body?.givenName === "string"
                ? drepData?.body?.givenName
                : typeof drepData?.body?.givenName["@value"] === "string"
                ? drepData.body.givenName["@value"]
                : drepData?.body?.givenName["@value"]?.["@value"] ?? null,
            image: drepData?.body?.image?.contentUrl ?? null,
          };
        } catch (err) {
          return undefined;
        }
      }
      
      try {
        const dreps = await this.getDreps(1);
        if (Array.isArray(dreps)) {
          const matchingDreps = dreps.filter(drep => 
            drep.givenName && 
            drep.givenName.toLowerCase().includes(search_query.toLowerCase())
          );
          
          if (matchingDreps.length > 0) {
            if (matchingDreps.length === 1) {
              return {
                drep_id: matchingDreps[0].drep_id,
                active: matchingDreps[0].active || false,
                givenName: matchingDreps[0].givenName,
                image: matchingDreps[0].image
              };
            }
            
            return matchingDreps.map(drep => ({
              drep_id: drep.drep_id,
              active: drep.active || false,
              givenName: drep.givenName,
              image: drep.image
            }));
          }
        }
        
        return undefined;
      } catch (err) {
        return undefined;
      }
    } catch (err) {
      return undefined;
    }
  }

  static async getDreps(page: number, forceRefresh: boolean = false): Promise<
    | {
        drep_id: string;
        givenName: string | null;
        image: string | null;
        active?: boolean;
        voting_power?: number | null;
      }[]
    | undefined
  > {
    try {
      const CACHE_KEY = `dreps_page_${page}_desc`;
      
      // Only check cache if not forcing a refresh
      if (!forceRefresh) {
        const cachedDreps = await getCache(CACHE_KEY);

        if (cachedDreps?.data) {
          return JSON.parse(cachedDreps?.data);
        }
      }

      const { data } = await axios.get<
        {
          drep_id: string;
        }[]
      >(
        `https://cardano-mainnet.blockfrost.io/api/v0/governance/dreps?page=${page}&order=desc`,
        {
          headers: {
            project_id: process.env.BLOCKFROST_PROJECT_ID,
          },
        }
      );

      let response: {
        drep_id: string;
        givenName: string | null;
        image: string | null;
        active?: boolean;
        voting_power?: number | null;
      }[] = [];

      console.log(data.length);

      for (let i = 0; i < data.length; i += BATCHSIZE) {
        const batch = data
          .slice(i, i + BATCHSIZE)
          .map(({ drep_id }) => drep_id);

        const results = await this.getBulkDrep(batch);

        if (!results) continue;

        // const results = await Promise.all(batch);

        console.log(i);

        for (const result of results) {
          if (result) {
            try {
              const isActive = await this.getIsUserAdmin(result.drep_id);

              // --- Refactored givenName extraction from getBulkDrep result ---
              let finalGivenName: string | null = null;
              const resultGivenName = result?.body?.givenName;
              if (typeof resultGivenName?.['@value'] === 'string') {
                finalGivenName = resultGivenName['@value'];
              } // Add more checks if getBulkDrep changes its return structure

              // --- Refactored image extraction from getBulkDrep result ---
              let finalImageUrl: string | null = null;
              const resultImage = result?.body?.image;
              if (typeof resultImage?.contentUrl === 'string') {
                finalImageUrl = resultImage.contentUrl;
              }

              response.push({
                drep_id: result.drep_id,
                givenName: finalGivenName, // Use extracted name
                image: finalImageUrl, // Use extracted image
                active: Boolean(isActive),
                voting_power: result.voting_power,
              });
            } catch (error) {
              console.error(`Error checking active status for ${result.drep_id}:`, error);
              // Still try to extract name/image even if active status check fails
              let fallbackGivenName: string | null = null;
              const resultGivenName = result?.body?.givenName;
              if (typeof resultGivenName?.['@value'] === 'string') {
                fallbackGivenName = resultGivenName['@value'];
              }
              let fallbackImageUrl: string | null = null;
              const resultImage = result?.body?.image;
              if (typeof resultImage?.contentUrl === 'string') {
                fallbackImageUrl = resultImage.contentUrl;
              }
              response.push({
                drep_id: result.drep_id,
                givenName: fallbackGivenName,
                image: fallbackImageUrl,
                active: false, // Default active to false on error
                voting_power: null,
              });
            }
          }
        }
      }

  
      for (const drep of data) {
        if (!response.some(r => r.drep_id === drep.drep_id)) {
          try {
            const isActive = await this.getIsUserAdmin(drep.drep_id);
            response.push({
              drep_id: drep.drep_id,
              givenName: null,
              image: null,
              active: Boolean(isActive),
              voting_power: null,
            });
          } catch (error) {
            console.error(`Error checking active status for ${drep.drep_id}:`, error);
            response.push({
              drep_id: drep.drep_id,
              givenName: null,
              image: null,
              active: false,
              voting_power: null,
            });
          }
        }
      }

      await setCache(CACHE_KEY, JSON.stringify(response));

      return response;
    } catch (err: any) {
      return err;
    }
  }
  static async getDrepProposals(address: string): Promise<
    | {
        title: string;
        vote: "Yes" | "No" | "Abstain";
        abstract?: string;
        motivation?: string;
        rationale?: string;
      }[]
    | undefined
  > {
    // --- Log function entry --- 
    console.log(`>>> Entering getDrepProposals for address: ${address}`);
    try {
      type IVote = "Yes" | "No" | "Abstain";

      interface Votes {
        proposal_tx_hash: string;
        vote: IVote;
      }

      interface ProposalProcedure {
        meta_url: string;
      }

      interface TxInfo {
        tx_hash: string;
        proposal_procedures: ProposalProcedure[];
      }

      interface MetaUrlResponse {
        body?: {
          title?: string;
          abstract?: string;
          motivation?: string;
          rationale?: string;
        };
        title?: string;
        abstract?: string;
        motivation?: string;
        rationale?: string;
      }

      // --- ADDED: Simple log before first Koios call --- 
      console.log("!!! About to call Koios /drep_votes !!!");

      const response = await axios.get<Votes[]>(
        `https://api.koios.rest/api/v1/drep_votes?_drep_id=${address}`,
        {
          headers: {
            accept: "application/json",
            Authorization:
              `Bearer ${process.env.KOIOS_API_TOKEN}`,
          },
        }
      );

      // --- Log raw Koios /drep_votes response --- 
      console.log("===== Raw Koios /drep_votes response =====");
      console.log(JSON.stringify(response.data, null, 2));
      console.log("==========================================");

      const txInfoResponse = await axios.post<TxInfo[]>(
        "https://api.koios.rest/api/v1/tx_info",
        {
          _tx_hashes: response.data.map(
            (proposal) => proposal.proposal_tx_hash
          ),
          _inputs: false,
          _metadata: false,
          _assets: false,
          _withdrawals: false,
          _certs: false,
          _scripts: false,
          _bytecode: false,
          _governance: true,
        },
        {
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            Authorization:
              `Bearer ${process.env.KOIOS_API_TOKEN}`,
          },
        }
      );

      // --- Log raw Koios /tx_info response --- 
      console.log("===== Raw Koios /tx_info response =====");
      console.log(JSON.stringify(txInfoResponse.data, null, 2));
      console.log("=======================================");

      const metaUrls = txInfoResponse.data.flatMap((tx) =>
        tx.proposal_procedures.map((procedure) => ({
          meta_url: procedure.meta_url,
          vote: response.data.find(
            (vote) => vote.proposal_tx_hash === tx.tx_hash
          )?.vote,
        }))
      );

      const metaUrlResponses = [];
      for (const url of metaUrls) {
        if (!url.meta_url || !url.vote) continue; // Skip if essential data is missing

        let proposalTitle: string | undefined = "[Metadata Unavailable]"; // Default title
        let proposalAbstract: string | undefined = undefined;
        let proposalMotivation: string | undefined = undefined;
        let proposalRationale: string | undefined = undefined;

        let metaUrl = url.meta_url.startsWith("ipfs://")
          ? `https://dweb.link/ipfs/${url.meta_url.slice(7)}` // Use dweb.link
          : url.meta_url;
        
        try {
          console.log(`Attempting to fetch metadata from: ${metaUrl}`);
          const metaResponse = await axios.get<MetaUrlResponse>(metaUrl, {
            headers: { accept: "application/json" },
            timeout: 10000 // Add a timeout (10 seconds)
          });
          const body = metaResponse.data?.body ?? metaResponse.data; // Check body or top-level
          proposalTitle = body?.title ?? "[Title Not Found in Metadata]";
          proposalAbstract = body?.abstract;
          proposalMotivation = body?.motivation;
          proposalRationale = body?.rationale;

        } catch (err: any) {
          console.warn(`Failed to fetch metadata from ${metaUrl}: ${err.message}. Status: ${err.response?.status}`);

          // Try fallback gateway if it was an IPFS URL and the error seems network/gateway related
          if (url.meta_url.startsWith("ipfs://") && (err.response?.status === 403 || err.response?.status === 429 || err.code === 'ECONNABORTED' || !err.response)) {
            // --- Use cf-ipfs.com as fallback ---
            metaUrl = `https://cf-ipfs.com/ipfs/${url.meta_url.slice(7)}`; // Fallback gateway
            console.log(`Retrying with fallback gateway: ${metaUrl}`);
            try {
              const fallbackResponse = await axios.get<MetaUrlResponse>(metaUrl, {
                headers: { accept: "application/json" },
                timeout: 15000 // Slightly longer timeout for fallback
              });
              const body = fallbackResponse.data?.body ?? fallbackResponse.data; // Check body or top-level
              proposalTitle = body?.title ?? "[Title Not Found in Metadata]";
              proposalAbstract = body?.abstract;
              proposalMotivation = body?.motivation;
              proposalRationale = body?.rationale;
            } catch (fallbackErr: any) {
              console.error(`Failed to fetch metadata from fallback ${metaUrl}: ${fallbackErr.message}. Status: ${fallbackErr.response?.status}`);
              // Keep the default title and undefined details if fallback also fails
              proposalTitle = "[Metadata Fetch Failed]"; 
              proposalAbstract = undefined;
              proposalMotivation = undefined;
              proposalRationale = undefined;
            }
          } else {
             // Keep the default title if it wasn't an IPFS url or a non-gateway error
             proposalTitle = "[Metadata Fetch Error]"; 
          }
        }

        metaUrlResponses.push({
          title: proposalTitle,
          vote: url.vote as IVote,
          abstract: proposalAbstract,
          motivation: proposalMotivation,
          rationale: proposalRationale,
        });
      }

      return metaUrlResponses;
    } catch (err: any) {
      // --- Log error --- 
      console.error(`XXX Error caught in getDrepProposals for address: ${address}`, err);
      console.error("Error fetching dRep proposals: ", err);
      return undefined; // Return undefined on major errors (like Koios failing)
    }
  }

  static async getIsUserAdmin(drep_id: string): Promise<boolean> {
    try {
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

      if (!data) return false;
      return data.active;
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404) {
        return false;
      }
      console.log("Error checking dRep admin status:", err);
      return false;
    }
  }

  static async getTotalDrepsCount(): Promise<number> {
    try {
      const response = await axios.get(
        'https://cardano-mainnet.blockfrost.io/api/v0/governance/dreps',
        {
          headers: {
            project_id: process.env.BLOCKFROST_PROJECT_ID,
          },
        }
      );
      
      return response.data?.length || 1207;
    } catch (err) {
      return 1207;
    }
  }
}
export default DrepModel;
