// Configuration file template for Travel Planner
// Copy this file to 'config.js' and replace the placeholder values

const CONFIG = {
    // Get your Google Maps API key from: https://console.cloud.google.com/apis/credentials
    // 
    // Steps to get your API key:
    // 1. Go to Google Cloud Console: https://console.cloud.google.com/
    // 2. Create a new project or select an existing one
    // 3. Enable the following APIs:
    //    - Geocoding API (required for address search)
    //    - Maps JavaScript API (optional, if you want to use Google Maps instead of OpenStreetMap)
    // 4. Go to "Credentials" and create an "API Key"
    // 5. Restrict the API key to your domain for security (optional but recommended)
    // 6. Replace the placeholder below with your actual API key
    GOOGLE_MAPS_API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY_HERE',
    
    // Default map center coordinates (New York City)
    DEFAULT_MAP_CENTER: {
        lat: 40.7128,
        lng: -74.0060
    },
    
    // Default zoom level
    DEFAULT_ZOOM: 13
};

// Make config available globally
window.CONFIG = CONFIG;

// Instructions for setup:
// 1. Copy this file and rename it to 'config.js'
// 2. Replace 'YOUR_GOOGLE_MAPS_API_KEY_HERE' with your actual Google Maps API key
// 3. The config.js file is already added to .gitignore so it won't be committed to version control
