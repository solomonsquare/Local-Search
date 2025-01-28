# Location Search

A web application that allows users to search for specific locations (restaurants, shops, etc.) within exact postcodes or areas using Google Maps API.

## Features

- Search for places within specific postcodes or areas
- Displays results only within the exact specified area
- Interactive map with markers for each location
- Click markers to view additional information about each place

## Setup

1. Clone this repository
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file in the root directory and add your Google Maps API key:
   ```
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

   To get an API key:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Maps JavaScript API and Places API
   - Create credentials (API key)
   - Make sure to restrict the API key for security

4. Run the application:
   ```bash
   python app.py
   ```

5. Open your browser and navigate to `http://localhost:5000`

## Usage

1. Enter a search query in the format: "[place type] in [location]"
   - Example: "restaurants in SW12BB"
   - Example: "coffee shops in Westgate road"

2. Click the Search button to find locations
3. Click on markers to view more information about each place

## Note

The application will only show results that are exactly within the specified area or postcode boundaries. 