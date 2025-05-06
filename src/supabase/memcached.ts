import memjs from "memjs";

const client = memjs.Client.create(
  process.env.MEMCACHIER_URL || "", 
  {
    username: process.env.MEMCACHIER_USERNAME || "",
    password: process.env.MEMCACHIER_PASSWORD || "",
    expires: 172800
  }
);

async function setCache(
  key: string,
  value: string
): Promise<{ success: boolean }> {
  try {
    const isStored = await client.set(key, value, {
      expires: 172800,
    });
    return { success: isStored };
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
    return { success: false };
  }
}

async function getCache(key: string): Promise<{ error: any; data: string | null }> {
  try {
    const isStored = await client.get(key);

    if(!isStored?.value){
      return { error: "Cache miss: No data found for the given key", data: null };
    }

    return { error: null, data: isStored.value?.toString("utf-8") };
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return { error: `Failed to retrieve data from cache: ${error}`, data: null };
  }
}

export { getCache, setCache };
