import type { Request, Response } from "express";
import supabase from "../supabase/db";
import DrepModel from "../models/Drep";
import { QuestionModel } from "../models/Question";
import { AnswerModel } from "../models/Answer";

interface DrepRequestBody {
  email: string;
  name: string;
  wallet_address: string;
}

const createDrep = async (
  req: Request<{}, {}, DrepRequestBody>,
  res: Response
) => {
  try {
    const { email, name, wallet_address } = req.body;

    if (!email || !name || !wallet_address) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const existingAdminByPoolId = await supabase
      .from("users")
      .select("wallet_address")
      .eq("wallet_address", wallet_address)
      .single();

    if (existingAdminByPoolId.data) {
      return res.status(409).json({
        success: false,
        message: "Admin with this drep_id already exists",
      });
    }

    const { error } = await supabase
      .from("dreps")
      .insert([{ email, name, wallet_address }])
      .select();

    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res
      .status(201)
      .json({ success: true, message: "Admin created successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const getDrepProfile = async (req: Request, res: Response) => {
  try {
    const { drep_id } = req.body;

    console.log("getDrepProfile called with drep_id:", drep_id);

    if (!drep_id) throw { status: 400, message: "Request body not correct" };

    const drepQuestions = await QuestionModel.getDrepQuestions(drep_id);

    if (drepQuestions === undefined)
      throw { status: 400, message: "Could not fetch questions" };
    const drepAnswers = await AnswerModel.getDrepAnswers(drep_id);

    if (drepAnswers === undefined)
      throw { status: 400, message: "Could not fetch answers" };

    const drepMetadata = await DrepModel.getDrep(drep_id);
    // if (drepMetadata === undefined)
    //   throw { status: 400, message: "Could not fetch drep" };

    console.log("============== DREP METADATA FROM MODEL ==============");
    console.log(JSON.stringify(drepMetadata, null, 2));
    console.log("====================================================");

    const resBody = {
      questionsAsked: drepQuestions,
      questionsAnswers: drepAnswers,
      image: drepMetadata?.body?.image?.contentUrl,
      name: drepMetadata?.body?.givenName["@value"],
      motivations: typeof drepMetadata?.body?.motivations === 'string' 
        ? drepMetadata?.body?.motivations 
        : drepMetadata?.body?.motivations?.["@value"],
      objectives: typeof drepMetadata?.body?.objectives === 'string' 
        ? drepMetadata?.body?.objectives 
        : drepMetadata?.body?.objectives?.["@value"],
      qualifications: typeof drepMetadata?.body?.qualifications === 'string' 
        ? drepMetadata?.body?.qualifications 
        : drepMetadata?.body?.qualifications?.["@value"],
      paymentAddress: typeof drepMetadata?.body?.paymentAddress === 'string' 
        ? drepMetadata?.body?.paymentAddress 
        : drepMetadata?.body?.paymentAddress?.["@value"],
      references: drepMetadata?.body?.references,
      drep_id: drepMetadata?.drep_id,
      voting_power: drepMetadata?.voting_power,
    }; 

    console.log("============== RESPONSE SENT TO CLIENT ==============");
    console.log(JSON.stringify(resBody, null, 2));
    console.log("References structure:", JSON.stringify(resBody.references, null, 2));
    console.log("===================================================");
    
    res.status(200).json(resBody);
  } catch (err: any) {
    console.error("Error in getDrepProfile:", err);
    res.status(err.status).json({ message: err.message });
  }
};
const getDrepSearch = async (req: Request, res: Response) => {
  try {
    const search_query = req.query.search_query as string;
    if (!search_query) {
      throw { status: 404, message: "No Query Provided" };
    }
    if (search_query === "") {
      throw { status: 404, message: "No Query Provided" }
    }
    
    if (search_query.startsWith('drep1')) {
      try {
        const isActive = await DrepModel.getIsUserAdmin(search_query);
        
        const drepData = await DrepModel.getDrep(search_query);
        
        return res.status(200).json({
          drep_id: drepData?.drep_id ?? search_query,
          active: Boolean(isActive),
          image: drepData?.body?.image?.contentUrl ?? null,
          givenName: typeof drepData?.body?.givenName["@value"] === "string"
            ? drepData?.body?.givenName["@value"]
            : null
        });
      } catch (err) {
        console.error("Error checking dRep status:", err);
      }
    }
    
    const dreps = await DrepModel.getDrepByQuery(search_query);
    console.log(dreps);
    if (!dreps) {
      throw { status: 404, message: "No dreps found" };
    }

    res.status(200).json(dreps);

  } catch (err: any) {
    res.status(err.status).json({ message: err.message });
  }
};
const getDreps = async (req: Request, res: Response) => {
  try {
    let page = 1;
    if (!!parseInt(req.query.page as string)) {
      page = parseInt(req.query.page as string);
    }
    
    const includeTotal = req.query.includeTotal === 'true';
    
    console.log(`Fetching dReps for page ${page}, includeTotal: ${includeTotal}`);
    
    try {
      const dreps = await DrepModel.getDreps(page);
      
      if (!dreps || (typeof dreps === 'object' && 'message' in dreps)) {
        console.error("Error fetching dReps:", dreps);
        return res.status(500).json({ 
          dreps: "Database connection error", 
          nextPage: null 
        });
      }

      if (Array.isArray(dreps)) {
        if (dreps.length > 0) {
          console.log("Sample drep from model:", JSON.stringify(dreps[0], null, 2));
        }
        
        const responseData: any = { 
          dreps, 
          nextPage: dreps.length < 100 ? null : page + 1 
        };
        
        if (includeTotal) {
          try {
            const total = await DrepModel.getTotalDrepsCount();
            responseData.totalDreps = total;
          } catch (error) {
            console.error("Error getting total drep count:", error);
            responseData.totalDreps = 1207;
          }
        }
        
        return res.status(200).json(responseData);
      } else {
        console.error("Unexpected response format from DrepModel.getDreps:", dreps);
        return res.status(500).json({ 
          dreps: "Server error: Invalid response format", 
          nextPage: null 
        });
      }
    } catch (error) {
      console.error("Error in getDreps controller:", error);
      return res.status(500).json({ 
        dreps: "Database connection error", 
        nextPage: null 
      });
    }
  } catch (err: any) {
    console.error("Outer error in getDreps:", err);
    return res.status(err.status || 500).json({ 
      message: err.message || "Server error",
      dreps: "Database connection error",
      nextPage: null
    });
  }
};

const getDrepProposals = async (req: Request, res: Response) => {
  try {
    const drep_id = req.params.drep_id as string;

    if (!drep_id) throw { status: 400, message: "No Drep ID found" };

    const dreps = await DrepModel.getDrepProposals(drep_id);

    if (!dreps) {
      // Send empty array if no proposals found, matching expected structure
      return res.status(200).json({ proposals: [] });
    }

    // Wrap the response
    res.status(200).json({ proposals: dreps });
  } catch (err: any) {
    // Also ensure error response structure is helpful if needed
    console.error("Error in getDrepProposals controller:", err);
    const status = err.status || 500;
    const message = err.message || "Failed to fetch dRep proposals";
    res.status(status).json({ message: message, proposals: [] }); // Send empty array on error
  }
};

const getDrepStatus = async (req: Request, res: Response) => {
  try {
    const drep_id = req.params.drep_id as string;

    if (!drep_id) throw { status: 400, message: "No Drep ID found" };

    const isActive = await DrepModel.getIsUserAdmin(drep_id);

    res.status(200).json({ active: isActive });
  } catch (err: any) {
    res.status(err.status).json({ message: err.message });
  }
};

// Function to search DREPs by name OR ID in the indexed 'dreps' table
const searchIndexedDrepsByName = async (req: Request, res: Response) => {
  // Rename parameter for clarity
  const searchQuery = req.query.query as string; 
  console.log(`[searchIndexedDreps] Received query: '${searchQuery}'`);

  if (!searchQuery) {
    console.log('[searchIndexedDreps] Query parameter missing.');
    return res.status(400).json({ message: "Missing 'query' parameter" });
  }

  try {
    let queryBuilder;
    const isDrepId = searchQuery.startsWith('drep1');

    if (isDrepId) {
      console.log('[searchIndexedDreps] Query identified as dRep ID. Searching drep_id column.');
      queryBuilder = supabase
        .from('dreps')
        .select('*')
        .eq('drep_id', searchQuery); // Exact match for ID
    } else {
      console.log('[searchIndexedDreps] Query identified as name. Searching name column (ilike).');
      queryBuilder = supabase
        .from('dreps')
        .select('*')
        .ilike('name', `%${searchQuery}%`); // Case-insensitive substring search for name
    }

    // Apply limit
    queryBuilder = queryBuilder.limit(50); 

    const { data, error } = await queryBuilder;

    console.log(`[searchIndexedDreps] Supabase response for query '${searchQuery}':`);
    if (error) {
      console.error('[searchIndexedDreps] Supabase error:', error);
      throw { status: 500, message: error.message }; // Propagate error
    } else {
      console.log(`[searchIndexedDreps] Supabase data length: ${data?.length ?? 0}`);
    }

    res.status(200).json(data || []);

  } catch (err: any) {
    console.error("Error in searchIndexedDreps execution:", err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
};

// Function to get the total count from the indexed 'dreps' table
const getIndexedDrepsCount = async (req: Request, res: Response) => {
  try {
    const { count, error } = await supabase
      .from('dreps')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error("Error getting indexed dreps count:", error);
      throw { status: 500, message: error.message };
    }

    res.status(200).json({ count: count ?? 0 });
  } catch (err: any) {
    console.error("Error in getIndexedDrepsCount:", err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
};

// Function to fetch paginated DREPs from the indexed 'dreps' table, sorted by answers
const getIndexedDrepsPaginated = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = (page - 1) * limit;

  // --- Added Sorting Parameters --- 
  const sortBy = req.query.sortBy as string || 'questions_answered_count'; // Default sort
  const sortOrder = req.query.sortOrder as string || 'desc';
  const ascending = sortOrder === 'asc';
  // --- End Added Sorting Parameters --- 

  console.log(`[getIndexedDrepsPaginated] Fetching page ${page}, limit ${limit}, offset ${offset}, sortBy ${sortBy}, sortOrder ${sortOrder}`);

  try {
    // --- Build Query with Dynamic Sorting --- 
    let query = supabase
      .from('dreps')
      .select('*', { count: 'exact' });

    // Apply primary sort based on sortBy parameter
    switch (sortBy) {
      case 'questions_answered_count':
        query = query.order('questions_answered_count', { ascending: ascending, nullsFirst: false });
        break;
      case 'questions_asked_count':
        query = query.order('questions_asked_count', { ascending: ascending, nullsFirst: false });
        break;
      case 'name':
        // Ensure case-insensitive sorting for name if possible, or use default db collation
        query = query.order('name', { ascending: ascending, nullsFirst: true });
        break;
      case 'voting_power':
        // Sort by voting power, always putting NULLs last
        query = query.order('voting_power', { ascending: ascending, nullsFirst: false }); 
        break;
      default:
        // Fallback to default sort if sortBy is unrecognized
        console.warn(`[getIndexedDrepsPaginated] Unrecognized sortBy value '${sortBy}'. Defaulting to questions_answered_count desc.`);
        query = query.order('questions_answered_count', { ascending: false, nullsFirst: false });
    }
    
    // --- Add Name Filter BEFORE Ordering/Pagination when sorting by name ---
    if (sortBy === 'name') {
      console.log('[getIndexedDrepsPaginated] Applying name filter: not null and not empty.');
      query = query.not('name', 'is', null); // Exclude null names
      query = query.neq('name', ''); // Exclude empty string names
    }
    // --- End Name Filter ---

    // Apply secondary sort
    if (sortBy === 'questions_answered_count' || sortBy === 'questions_asked_count') { 
      // Default case or when sorting by question counts, use voting_power desc as secondary
      console.log(`[getIndexedDrepsPaginated] Applying secondary sort: voting_power desc (nulls last)`);
      query = query.order('voting_power', { ascending: false, nullsFirst: false }); 
    } else if (sortBy !== 'name') { 
      // For other primary sorts (excluding name), use name asc as secondary
      console.log(`[getIndexedDrepsPaginated] Applying secondary sort: name asc (nulls first)`);
      query = query.order('name', { ascending: true, nullsFirst: true });
    }

    // Apply tertiary sort by created_at as a final tie-breaker
    console.log(`[getIndexedDrepsPaginated] Applying tertiary sort: created_at desc`);
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    // --- End Build Query --- 

    // Execute the query
    const { data, error, count } = await query;

    if (error) {
      console.error('[getIndexedDrepsPaginated] Supabase error:', error);
      throw { status: 500, message: error.message };
    }

    console.log(`[getIndexedDrepsPaginated] Fetched ${data?.length} records.`);

    const hasNextPage = offset + limit < (count ?? 0);
    const nextPage = hasNextPage ? page + 1 : null;

    res.status(200).json({
      dreps: data || [],
      nextPage: nextPage,
      totalDreps: count
    });

  } catch (err: any) {
    console.error("Error in getIndexedDrepsPaginated:", err);
    res.status(err.status || 500).json({
      message: err.message || 'Internal server error fetching indexed dreps',
      dreps: [],
      nextPage: null
    });
  }
};

export {
  createDrep,
  getDrepProfile,
  getDrepSearch,
  getDreps,
  getDrepProposals,
  getDrepStatus,
  searchIndexedDrepsByName,
  getIndexedDrepsCount,
  getIndexedDrepsPaginated
};
