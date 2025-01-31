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
        # First try Mapbox
        mapbox_response = requests.get(
            'https://api.mapbox.com/geocoding/v5/mapbox.places/{}.json'.format(search_text),
            params={
                'access_token': MAPBOX_ACCESS_TOKEN,
                'limit': 5
            }
        )
        mapbox_data = mapbox_response.json()

        # Then try OpenStreetMap
        osm_response = requests.get(
            'https://nominatim.openstreetmap.org/search',
            params={
                'q': search_text,
                'format': 'json',
                'limit': 5,
                'addressdetails': 1
            },
            headers={'User-Agent': 'LocalSearch/1.0'}
        )
        osm_data = osm_response.json()

        # Combine and format results
        combined_features = []
        
        # Add Mapbox results
        if mapbox_response.ok:
            combined_features.extend(mapbox_data.get('features', []))
            
        # Add OSM results
        if osm_response.ok:
            for osm_result in osm_data:
                feature = {
                    'id': f"osm-{osm_result['place_id']}",
                    'type': 'Feature',
                    'place_type': [osm_result.get('type', 'place')],
                    'text': osm_result.get('display_name', '').split(',')[0],
                    'place_name': osm_result.get('display_name', ''),
                    'center': [float(osm_result['lon']), float(osm_result['lat'])],
                    'properties': osm_result.get('address', {})
                }
                combined_features.append(feature)

        return jsonify({'type': 'FeatureCollection', 'features': combined_features[:5]})
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