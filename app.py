from flask import Flask, render_template, jsonify, request, send_from_directory
import os
from dotenv import load_dotenv
import logging
from flask_talisman import Talisman
from werkzeug.middleware.proxy_fix import ProxyFix
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Security headers with updated CSP
Talisman(app, 
         content_security_policy={
             'default-src': ["'self'", "api.mapbox.com", "events.mapbox.com"],
             'script-src': ["'self'", "'unsafe-inline'", "api.mapbox.com", "nominatim.openstreetmap.org"],
             'style-src': ["'self'", "'unsafe-inline'", "api.mapbox.com", "fonts.googleapis.com"],
             'img-src': ["'self'", "api.mapbox.com", "*.mapbox.com", "*.openstreetmap.org", "data:", "blob:"],
             'font-src': ["'self'", "fonts.gstatic.com"],
             'worker-src': ["'self'", "blob:"],
             'connect-src': ["'self'", "api.mapbox.com", "events.mapbox.com", "*.tiles.mapbox.com", "nominatim.openstreetmap.org"],
             'frame-src': ["'self'"]
         },
         force_https=True)

# Handle proxy headers
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Production configuration
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=1800,  # 30 minutes
)

# Get API key from environment variables
MAPBOX_ACCESS_TOKEN = os.getenv('MAPBOX_ACCESS_TOKEN')

# Verify API key is loaded
if not MAPBOX_ACCESS_TOKEN:
    logger.error("Mapbox access token not found in environment variables!")
    raise RuntimeError("Mapbox access token is required to run the application")

@app.route('/')
def index():
    """Render the main application page"""
    return render_template('index.html', mapbox_token=MAPBOX_ACCESS_TOKEN)

@app.route('/api/geocode')
def geocode():
    """Combined endpoint for Mapbox and OpenStreetMap geocoding"""
    search_text = request.args.get('q')
    if not search_text:
        return jsonify({'error': 'No search text provided'}), 400

    try:
        # Parse query to check if it's a category search
        parts = search_text.lower().split(' in ')
        category = parts[0] if len(parts) > 1 else None
        location = parts[1] if len(parts) > 1 else search_text

        # First get the area boundary if it's a category search
        area_response = None
        if category:
            area_response = requests.get(
                'https://api.mapbox.com/geocoding/v5/mapbox.places/{}.json'.format(location),
                params={
                    'access_token': MAPBOX_ACCESS_TOKEN,
                    'limit': 1,
                    'types': 'place,locality,neighborhood,address'
                }
            )
            area_data = area_response.json()

        # Then search for places
        search_area = location if category else search_text
        mapbox_response = requests.get(
            'https://api.mapbox.com/geocoding/v5/mapbox.places/{}.json'.format(
                category if category else search_text
            ),
            params={
                'access_token': MAPBOX_ACCESS_TOKEN,
                'limit': 10,
                'proximity': ','.join(map(str, area_data['features'][0]['center'])) if category and area_response and area_response.ok and area_data.get('features') else None,
                'bbox': ','.join(map(str, area_data['features'][0]['bbox'])) if category and area_response and area_response.ok and area_data.get('features') and 'bbox' in area_data['features'][0] else None
            }
        )
        mapbox_data = mapbox_response.json()

        # Get OSM data for additional context
        osm_response = requests.get(
            'https://nominatim.openstreetmap.org/search',
            params={
                'q': search_area,
                'format': 'json',
                'limit': 5,
                'addressdetails': 1,
                'polygon_geojson': 1
            },
            headers={'User-Agent': 'LocalSearch/1.0'}
        )
        osm_data = osm_response.json()

        # Combine and format results
        combined_features = []
        
        # If it's a category search and we have area data, add it first
        if category and area_response and area_response.ok and area_data.get('features'):
            area_feature = area_data['features'][0]
            # Add OSM polygon if available
            if osm_data and len(osm_data) > 0 and 'geojson' in osm_data[0]:
                area_feature['geometry'] = osm_data[0]['geojson']
            combined_features.append(area_feature)

        # Add Mapbox results
        if mapbox_response.ok:
            # Filter results if we have a bounding box
            if category and area_response and area_response.ok and area_data.get('features'):
                area_feature = area_data['features'][0]
                if 'bbox' in area_feature:
                    bbox = area_feature['bbox']
                    filtered_features = [
                        f for f in mapbox_data.get('features', [])
                        if bbox[0] <= f['center'][0] <= bbox[2] and
                           bbox[1] <= f['center'][1] <= bbox[3]
                    ]
                    combined_features.extend(filtered_features)
                else:
                    combined_features.extend(mapbox_data.get('features', []))
            else:
                combined_features.extend(mapbox_data.get('features', []))

        return jsonify({'type': 'FeatureCollection', 'features': combined_features[:10]})
    except requests.exceptions.RequestException as e:
        logger.error(f"Geocoding error: {str(e)}")
        return jsonify({'error': 'Failed to fetch location data'}), 500

@app.route('/api/directions')
def directions():
    """Proxy endpoint for Mapbox directions"""
    coordinates = request.args.get('coordinates')
    if not coordinates:
        return jsonify({'error': 'No coordinates provided'}), 400

    try:
        # Forward the request to Mapbox
        response = requests.get(
            'https://api.mapbox.com/directions/v5/mapbox/driving/{}'.format(coordinates),
            params={
                'access_token': MAPBOX_ACCESS_TOKEN,
                'geometries': 'geojson',
                'overview': 'full'
            }
        )
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        logger.error(f"Directions error: {str(e)}")
        return jsonify({'error': 'Failed to fetch directions data'}), 500

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                             'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    # Production settings
    app.run(host='0.0.0.0', 
           port=int(os.getenv('PORT', 5000)),
           debug=False) 