const fs = require('fs');
const https = require('https');

// Configuration
let apiKey = '';
let inputFile = '';
let outputFile = '';

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--api-key' && i + 1 < args.length) {
    apiKey = args[i + 1];
    i++;
  } else if (args[i] === '--input' && i + 1 < args.length) {
    inputFile = args[i + 1];
    i++;
  } else if (args[i] === '--output' && i + 1 < args.length) {
    outputFile = args[i + 1];
    i++;
  }
}

// Validate inputs
if (!apiKey || !inputFile) {
  console.log('Usage: node simplified-extractor.js --api-key YOUR_API_KEY --input watch-history.json [--output simplified-data.json]');
  process.exit(1);
}

// Set default output file if not provided
if (!outputFile) {
  outputFile = `simplified-history-${Date.now()}.json`;
}

// Utility function to extract video ID from YouTube URL
function extractVideoId(url) {
  if (!url) return null;
  
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Helper function to fetch data from YouTube API
function fetchVideoCategories(videoIds) {
  return new Promise((resolve, reject) => {
    const idsParam = videoIds.join(',');
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${idsParam}&key=${apiKey}`;
    
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          
          if (jsonData.error) {
            reject(new Error(`YouTube API error: ${jsonData.error.message}`));
            return;
          }
          
          const categoryMap = {
            '1': 'Film & Animation',
            '2': 'Autos & Vehicles',
            '10': 'Music',
            '15': 'Pets & Animals',
            '17': 'Sports',
            '18': 'Short Movies',
            '19': 'Travel & Events',
            '20': 'Gaming',
            '21': 'Videoblogging',
            '22': 'People & Blogs',
            '23': 'Comedy',
            '24': 'Entertainment',
            '25': 'News & Politics',
            '26': 'Howto & Style',
            '27': 'Education',
            '28': 'Science & Technology',
            '29': 'Nonprofits & Activism',
            '30': 'Movies',
            '31': 'Anime/Animation',
            '32': 'Action/Adventure',
            '33': 'Classics',
            '34': 'Comedy',
            '35': 'Documentary',
            '36': 'Drama',
            '37': 'Family',
            '38': 'Foreign',
            '39': 'Horror',
            '40': 'Sci-Fi/Fantasy',
            '41': 'Thriller',
            '42': 'Shorts',
            '43': 'Shows',
            '44': 'Trailers'
          };
          
          const result = {};
          
          if (jsonData.items && jsonData.items.length > 0) {
            jsonData.items.forEach(item => {
              if (item.id && item.snippet) {
                const channelName = item.snippet.channelTitle || '';
                result[item.id] = {
                  categoryId: item.snippet.categoryId || '',
                  categoryName: categoryMap[item.snippet.categoryId] || 'Unknown Category',
                  channelName: channelName
                };
              }
            });
          }
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Sleep function to add delay between API calls
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to process watch history
async function processWatchHistory() {
  console.log('Reading watch history file...');
  
  try {
    // Read and parse the input file
    const fileContents = fs.readFileSync(inputFile, 'utf8');
    const watchHistory = JSON.parse(fileContents);
    
    console.log(`Found ${watchHistory.length} entries in watch history`);
    
    // Filter for YouTube entries only
    const youtubeEntries = watchHistory.filter(entry => 
      entry.titleUrl && entry.titleUrl.includes('youtube.com/watch'));
    
    console.log(`Found ${youtubeEntries.length} YouTube video entries`);
    
    // Extract only needed fields with video IDs
    const simplifiedEntries = youtubeEntries.map(entry => {
      const videoId = extractVideoId(entry.titleUrl);
      // Extract channel name from subtitles if available
      const channelName = entry.subtitles && entry.subtitles[0] ? entry.subtitles[0].name : "";
      
      return {
        title: entry.title || "",
        titleUrl: entry.titleUrl || "",
        name: channelName,
        time: entry.time || "",
        videoId: videoId || "",
        categoryId: "",
        categoryName: ""
      };
    }).filter(entry => entry.videoId);
    
    console.log(`Successfully extracted ${simplifiedEntries.length} video IDs`);
    
    // Process in batches (YouTube API allows max 50 IDs per request)
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < simplifiedEntries.length; i += batchSize) {
      batches.push(simplifiedEntries.slice(i, i + batchSize));
    }
    
    console.log(`Divided data into ${batches.length} batches for processing`);
    
    // Process all batches
    const enrichedEntries = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i+1} of ${batches.length}...`);
      
      // Get video details from YouTube API
      const videoIds = batch.map(entry => entry.videoId);
      try {
        const categoryInfo = await fetchVideoCategories(videoIds);
        
        // Enrich entries with category info
        const enrichedBatch = batch.map(entry => {
          const info = categoryInfo[entry.videoId] || {};
          return {
            ...entry,
            name: entry.name || info.channelName || "",
            categoryId: info.categoryId || "",
            categoryName: info.categoryName || ""
          };
        });
        
        enrichedEntries.push(...enrichedBatch);
        
        console.log(`Batch ${i+1} processed successfully`);
        
        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          console.log('Waiting before next batch to avoid rate limiting...');
          await sleep(1000);
        }
      } catch (error) {
        console.error(`Error processing batch ${i+1}:`, error.message);
        // Continue with next batch even if this one fails
      }
    }
    
    console.log('Processing complete!');
    
    // Save the processed data
    fs.writeFileSync(outputFile, JSON.stringify(enrichedEntries, null, 2));
    console.log(`\nSimplified data saved to ${outputFile}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Start processing
processWatchHistory();