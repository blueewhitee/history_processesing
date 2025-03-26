# YouTube Watch History Analyzer

This tool analyzes your YouTube watch history to provide insights about your viewing habits.

## How It Works

This tool works through the following process:

1. **Data Collection**: You provide your YouTube watch history (from Google Takeout) and a YouTube API key.

2. **Data Processing**:
   - The tool extracts YouTube video IDs from your watch history
   - It makes API calls to YouTube to retrieve category information for each video
   - The data is processed in batches to avoid hitting API rate limits
   - The tool enriches your watch history with category information for each video

3. **Analysis & Visualization**:
   - Categories are counted and ranked by frequency
   - For the browser version, a pie chart shows your top 10 most-watched categories
   - Statistics are displayed showing percentages of your viewing habits

4. **Data Export**:
   - The processed data can be downloaded as a JSON file for further analysis
   - This includes all your watch history entries with added category information

## Browser Version

### How to Use

1. **Get a YouTube API Key**
   - Go to the [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one
   - Enable the YouTube Data API v3
   - Create an API key and copy it

2. **Download Your Watch History**
   - Go to [Google Takeout](https://takeout.google.com/)
   - Deselect all services except YouTube
   - In YouTube settings, select only "history" and deselect all other data
   - Choose to export once and download the file as a zip
   - Extract the zip file and locate your watch-history.json

3. **Use the Analyzer**
   - Open index.html in your browser
   - Enter your YouTube API key
   - Upload your watch-history.json file
   - Click "Process History" and wait for processing to complete

4. **View Results**
   - Once processing is complete, you'll see statistics about your watch history
   - You can download the processed data for further analysis

## Command-Line Version

If you prefer to use the command-line version or encounter issues with the browser version, you can use the Node.js script.

### Prerequisites

- Node.js installed on your system
- Your YouTube API key
- Your watch-history.json file

### Usage

```bash
node node-analyzer.js --api-key YOUR_API_KEY --input path/to/watch-history.json [--output processed-data.json]
```

Example:
```bash
node node-analyzer.js --api-key AIzaSyC1a8HG7DAx_CyJ --input watch-history.json --output processed.json
```

The script will process your watch history and save the results to the specified output file. If no output file is specified, it will create one with a timestamp in the filename.

## Features

- Analyzes video categories to show what types of content you watch the most
- Visualizes category distribution in a pie chart (browser version)
- Allows downloading the processed data with category information
- Command-line support for automated processing

## Privacy Notice

This tool processes your data entirely in your browser or on your local machine. Your watch history and API key are not sent to any external servers.
