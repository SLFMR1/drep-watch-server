console.log("DEBUG: drepIndexer.ts script execution started."); // Top-level log

import supabase from '../supabase/db';
import DrepModel from '../models/Drep'; // Assuming DrepModel is the default export or named export
import { QuestionModel } from '../models/Question';
import { AnswerModel } from '../models/Answer';
import dotenv from 'dotenv';
dotenv.config();

const PAGE_SIZE = 100; // Assuming Koios/Model returns 100 per page
const UPSERT_CHUNK_SIZE = 25; // Upsert data in smaller chunks

/**
 * Fetches ALL DREPs using pagination, calculates their question/answer counts,
 * and upserts the data into the 'dreps' table in Supabase batch by batch.
 */
export const indexDrepsToSupabase = async (): Promise<void> => {
  console.log('Starting DREP indexing process (with pagination)...');
  let currentPage = 1;
  let totalDrepsProcessed = 0;
  let keepFetching = true;

  while (keepFetching) {
    console.log(`Fetching page ${currentPage}...`);
    let currentBatchDreps: any[] | undefined = undefined; // Initialize to undefined
    try {
      currentBatchDreps = await DrepModel.getDreps(currentPage, true); // Fetch current page
      console.log(
        `DrepModel.getDreps page ${currentPage} call completed. Result length: ${currentBatchDreps?.length ?? 'undefined'}`
      );
      // Optional: Log full result for debugging specific pages
      // console.log(`Page ${currentPage} data:`, JSON.stringify(currentBatchDreps, null, 2));

    } catch (fetchError) {
      console.error(`Error occurred during DrepModel.getDreps call for page ${currentPage}:`, fetchError);
      // Decide if we should stop or try the next page? Stopping for now.
      keepFetching = false;
      break;
    }

    if (!currentBatchDreps || !Array.isArray(currentBatchDreps) || currentBatchDreps.length === 0) {
      console.log(`No DREPs found on page ${currentPage} or invalid data returned. Assuming end of list.`);
      keepFetching = false;
      break;
    }

    const batchSize = currentBatchDreps.length;
    console.log(`Fetched ${batchSize} DREPs on page ${currentPage}. Processing batch in chunks of ${UPSERT_CHUNK_SIZE}...`);

    let chunkUpsertPromises = [];
    let drepDataForChunk = [];

    for (let i = 0; i < currentBatchDreps.length; i++) {
      const drep = currentBatchDreps[i];

      if (!drep || !drep.drep_id) {
        console.warn(`[Chunk ${Math.floor(i / UPSERT_CHUNK_SIZE) + 1}] Skipping DREP with missing data:`, drep);
        continue;
      }

      const drepId = drep.drep_id;
      console.log(`[Page ${currentPage}, Chunk ${Math.floor(i / UPSERT_CHUNK_SIZE) + 1}] Processing DREP ID: ${drepId}`);

      try {
        const questionsAskedCount = await QuestionModel.getDrepQuestions(drepId);
        // console.log(`[Loop] Fetched questions for ${drepId}: ${questionsAskedCount}`); // Reduce logging verbosity now
        const questionsAnsweredCount = await AnswerModel.getDrepAnswers(drepId);
        // console.log(`[Loop] Fetched answers for ${drepId}: ${questionsAnsweredCount}`); // Reduce logging verbosity now

        const drepRecord = {
          drep_id: drepId,
          name: drep.givenName || '',
          image_url: drep.image || null,
          status: drep.active === true ? 'active' : drep.active === false ? 'inactive' : null,
          questions_asked_count: questionsAskedCount, // Already returns 0 on error
          questions_answered_count: questionsAnsweredCount, // Already returns 0 on error
          voting_power: drep.voting_power || null,
          email: null,
          wallet_address: null,
          search_variants: null,
        };
        // Log the data being prepared for upsert
        console.log(` -> Prepared: ID=${drepRecord.drep_id}, Name='${drepRecord.name}', Qs=${drepRecord.questions_asked_count}, As=${drepRecord.questions_answered_count}, VP=${drepRecord.voting_power}`);

        drepDataForChunk.push(drepRecord);

        // If chunk is full or it's the last item in the batch, process the chunk
        if (drepDataForChunk.length === UPSERT_CHUNK_SIZE || i === currentBatchDreps.length - 1) {
          if (drepDataForChunk.length > 0) {
            console.log(`Upserting chunk of ${drepDataForChunk.length} records (Page ${currentPage})...`);
            // Create a promise for the upsert operation
            const upsertPromise = supabase
              .from('dreps')
              .upsert(drepDataForChunk, { onConflict: 'drep_id' })
              .then(({ error: upsertError }) => {
                if (upsertError) {
                  console.error(`Supabase upsert error for chunk (Page ${currentPage}):`, upsertError);
                  throw upsertError; // Throw error to be caught by Promise.all
                }
                console.log(`Supabase upsert successful for chunk (Page ${currentPage}).`);
              });
            chunkUpsertPromises.push(upsertPromise);
            totalDrepsProcessed += drepDataForChunk.length; // Increment total count here
            drepDataForChunk = []; // Reset chunk
          }
        }
      } catch (error) {
        console.error(`Error processing DREP ${drepId} from page ${currentPage}:`, error);
        // Continue to next DREP even if one fails
      }
    } // End for loop iterating through page batch

    // Wait for all chunk upserts for the current page to complete
    try {
      console.log(`Waiting for ${chunkUpsertPromises.length} chunk upserts for page ${currentPage} to complete...`);
      await Promise.all(chunkUpsertPromises);
      console.log(`All chunk upserts for page ${currentPage} completed.`);
    } catch (pageUpsertError) {
      console.error(`An error occurred during upserting chunks for page ${currentPage}. Stopping indexer.`, pageUpsertError);
      keepFetching = false; // Stop fetching further pages if any chunk upsert failed
      break;
    }

    // Check if this was the last page
    if (batchSize < PAGE_SIZE) {
      console.log(`Fetched ${batchSize} DREPs, which is less than page size ${PAGE_SIZE}. Assuming end of list.`);
      keepFetching = false;
    } else {
      currentPage++; // Move to the next page
    }
  } // End while loop

  console.log(`DREP indexing process completed. Total DREPs processed and upserted: ${totalDrepsProcessed}.`);
};

// Potential: Add a function to trigger indexing via API or cron
// export const triggerIndexing = async () => { ... };

// Add this block for testing:
/*
(async () => {
  try {
    console.log("Starting manual indexing test...");
    await indexDrepsToSupabase();
    console.log("Manual indexing test finished successfully.");
    process.exit(0); // Exit successfully
  } catch (error) {
    console.error("Manual indexing test failed:", error);
    process.exit(1); // Exit with error
  }
})();
*/ 