# 🗺️ Travel Planner

A beautiful, interactive travel planning website that helps you organize your trips day by day with real-time Google Maps integration.

## ✨ Features

- **Day-by-Day Planning**: Organize your travel itinerary by days
- **Real-Time Google Maps**: Interactive map with live traffic data
- **Location Management**: Add, edit, and remove locations for each day
- **Smart Routing**: Automatic route planning between locations
- **Visual Markers**: Color-coded markers for each day
- **Local Storage**: Your plans are automatically saved locally
- **Export/Import Functionality**: Download your travel plans as JSON and import them back
- **Responsive Design**: Works perfectly on desktop and mobile
- **Modern UI**: Beautiful, intuitive interface

## 🚀 Quick Start

### Prerequisites

1. **Google Maps API Key**: You need a Google Maps API key with the following APIs enabled:
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Directions API

### Setup Instructions

1. **Get Google Maps API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the required APIs (Maps JavaScript API, Places API, Geocoding API, Directions API)
   - Create credentials (API Key)
   - Restrict the API key to your domain for security

2. **Configure the API Key**:
   - Open `index.html`
   - Find line 102: `<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=initMap" async defer></script>`
   - Replace `YOUR_API_KEY` with your actual Google Maps API key

3. **Run the Application**:
   - Simply open `index.html` in your web browser
   - Or serve it using a local web server (recommended for full functionality)

### Using a Local Server (Recommended)

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## 📱 How to Use

### Creating Your First Trip

1. **Set Travel Dates**: Click on the start and end date fields to set your travel period
2. **Add Days**: Click "Add Day" to create daily plans
3. **Add Locations**: For each day, click "Add Location" to add places to visit
4. **Fill Location Details**: 
   - Enter location name and address
   - Optionally add visit time and notes
   - The system will automatically find coordinates and place markers on the map

### Managing Your Trip

- **View on Map**: All locations appear as color-coded markers on the Google Maps
- **Routes**: The system automatically draws routes between locations for each day
- **Edit Locations**: Delete locations using the × button on each location card
- **Reorder Days**: Days are automatically numbered and dated based on your start date
- **Real-time Traffic**: Toggle traffic information using the car icon on the map

### Advanced Features

- **Center Map**: Use the crosshair button to center the map on your current location
- **Export Plan**: Download your complete travel plan as a JSON file
- **Import Plan**: Load a previously exported travel plan from a JSON file
- **Auto-save**: Your plans are automatically saved to your browser's local storage
- **Clear All**: Reset and start a new trip plan

### Import/Export Functionality

**Exporting Your Plan**:
1. Click the "Export Plan" button in the sidebar
2. Your travel plan will be downloaded as a `travel-plan.json` file
3. This file contains all your days, locations, notes, and trip details

**Importing a Plan**:
1. Click the "Import Plan" button in the sidebar
2. Select a previously exported JSON file
3. The system will validate the file format and import your plan
4. If you have an existing plan, you'll be asked to confirm before replacing it

**JSON Format**: The exported JSON includes:
- Trip title, start date, and end date
- All days with their locations and notes
- Complete location details including coordinates
- Timestamps for notes

This feature is perfect for:
- Backing up your travel plans
- Sharing plans with travel companions
- Moving plans between devices
- Creating templates for similar trips

## 🗂️ File Structure

```
travel-planner/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## 🎨 Customization

### Color Themes
You can customize the color scheme by modifying the CSS variables in `styles.css`:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --accent-color: #f093fb;
}
```

### Map Styles
Customize the map appearance in `script.js` by modifying the `styles` array in the map initialization.

## 🔧 Troubleshooting

### Common Issues

1. **Map not loading**: 
   - Check your Google Maps API key
   - Ensure all required APIs are enabled
   - Check browser console for error messages

2. **Geocoding not working**:
   - Verify Geocoding API is enabled
   - Check API quotas and billing

3. **Locations not saving**:
   - Ensure localStorage is enabled in your browser
   - Try clearing browser cache and cookies

### API Quotas

Be aware of Google Maps API quotas:
- Maps JavaScript API: 28,000 requests per month (free tier)
- Geocoding API: $5 per 1000 requests
- Directions API: $5 per 1000 requests

## 🔐 Security Notes

- Always restrict your Google Maps API key to specific domains in production
- Consider implementing server-side proxy for API calls in production environments
- The current implementation stores data locally - consider adding user authentication for multi-device access

## 🌟 Future Enhancements

Potential features to add:
- User authentication and cloud storage
- Collaborative trip planning
- Integration with booking platforms
- Weather information
- Budget tracking
- Photo attachments
- Social sharing

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

---

**Enjoy planning your travels! 🌍✈️** 