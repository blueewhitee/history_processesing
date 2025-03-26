document.addEventListener('DOMContentLoaded', function() {
    const apiKeyInput = document.getElementById('apiKey');
    const fileInput = document.getElementById('historyFile');
    const processBtn = document.getElementById('processBtn');
    const statusElement = document.getElementById('processingStatus');
    
    // Check for saved API key
    const savedApiKey = localStorage.getItem('youtubeApiKey');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }
    
    processBtn.addEventListener('click', async function() {
        // Get API key and save it
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            statusElement.innerHTML = '<div class="alert alert-danger">Please enter a YouTube API key</div>';
            return;
        }
        
        localStorage.setItem('youtubeApiKey', apiKey);
        
        // Check if file is selected
        if (!fileInput.files || fileInput.files.length === 0) {
            statusElement.innerHTML = '<div class="alert alert-danger">Please select a watch history file</div>';
            return;
        }
        
        // Read file
        try {
            statusElement.innerHTML = '<div class="alert alert-info">Processing your watch history... This may take a few minutes.</div>';
            
            const file = fileInput.files[0];
            const fileContents = await readFile(file);
            const watchHistory = JSON.parse(fileContents);
            
            // Process the watch history to extract only the needed fields
            const processedData = await processWatchHistory(watchHistory, apiKey);
            
            // Download the simplified data
            downloadSimplifiedData(processedData);
            
            statusElement.innerHTML = '<div class="alert alert-success">Processing complete! Simplified data has been downloaded.</div>';
        } catch (error) {
            statusElement.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            console.error(error);
        }
    });
    
    // File reader helper function
    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => resolve(event.target.result);
            reader.onerror = error => reject(error);
            reader.readAsText(file);
        });
    }
    
    // Process watch history to extract only needed fields
    async function processWatchHistory(watchHistory, apiKey) {
        // Filter for YouTube entries
        const youtubeEntries = watchHistory.filter(entry => 
            entry.titleUrl && entry.titleUrl.includes('youtube.com/watch'));
        
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
        
        // Process in batches (YouTube API allows max 50 IDs per request)
        const batchSize = 50;
        const batches = [];
        for (let i = 0; i < simplifiedEntries.length; i += batchSize) {
            batches.push(simplifiedEntries.slice(i, i + batchSize));
        }
        
        // Process all batches
        const enrichedEntries = [];
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            statusElement.innerHTML = `<div class="alert alert-info">Processing batch ${i+1} of ${batches.length}...</div>`;
            
            // Get video details from YouTube API
            const videoIds = batch.map(entry => entry.videoId);
            try {
                const categoryInfo = await fetchVideoCategories(videoIds, apiKey);
                
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
                
                // Add delay between batches to avoid rate limiting
                if (i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`Error processing batch ${i+1}:`, error);
                // Continue with next batch even if this one fails
            }
        }
        
        return enrichedEntries;
    }
    
    // Function to extract video ID from YouTube URL
    function extractVideoId(url) {
        if (!url) return null;
        
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = url.match(regex);
        return match ? match[1] : null;
    }
    
    // Fetch video categories from YouTube API
    async function fetchVideoCategories(videoIds, apiKey) {
        const idsParam = videoIds.join(',');
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${idsParam}&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`YouTube API error: ${data.error.message}`);
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
        
        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                if (item.id && item.snippet?.categoryId) {
                    result[item.id] = {
                        categoryId: item.snippet.categoryId,
                        categoryName: categoryMap[item.snippet.categoryId] || 'Unknown Category',
                        channelName: item.snippet.channelTitle || ''
                    };
                }
            });
        }
        
        return result;
    }
    
    // Download simplified data as JSON
    function downloadSimplifiedData(data) {
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `simplified-watch-history-${new Date().getTime()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
});