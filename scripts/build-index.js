const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:8080';

async function buildFullIndex() {
  console.log('Starting to build full drep search index...');
  
  const totalPages = 25; // Adjust based on ~50 dreps per page (1207 ÷ 50 ≈ 25 pages)
  const chunkSize = 5; // Process in chunks to avoid overwhelming the server
  
  for (let startPage = 1; startPage <= totalPages; startPage += chunkSize) {
    const endPage = Math.min(startPage + chunkSize - 1, totalPages);
    console.log(`Building index for pages ${startPage} to ${endPage}...`);
    
    try {
      const { data } = await axios.get(
        `${BASE_URL}/api/v1/drep/build-search-index?maxPages=${endPage - startPage + 1}&startPage=${startPage}`
      );
      
      console.log(`Started chunk: ${data.message}`);
      
      // Wait a bit between chunks to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`Error building index for pages ${startPage}-${endPage}:`, 
        error.response?.data || error.message);
    }
  }
  
  console.log('Index build requests completed. The indexing will continue processing in the background.');
}

buildFullIndex().catch(console.error); 