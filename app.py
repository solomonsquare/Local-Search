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

# Security headers
Talisman(app, 
         content_security_policy={
             'default-src': "'self'",
             'script-src': ["'self'", "'unsafe-inline'", "api.mapbox.com"],
             'style-src': ["'self'", "'unsafe-inline'", "api.mapbox.com", "fonts.googleapis.com"],
             'img-src': ["'self'", "api.mapbox.com", "data:"],
             'font-src': ["'self'", "fonts.gstatic.com"],
             'connect-src': ["'self'", "api.mapbox.com"]
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
    return render_template('index.html')

@app.route('/api/geocode')
def geocode():
    """Proxy endpoint for Mapbox geocoding"""
    search_text = request.args.get('q')
    if not search_text:
        return jsonify({'error': 'No search text provided'}), 400

    # Forward the request to Mapbox
    response = requests.get(
        'https://api.mapbox.com/geocoding/v5/mapbox.places/{}.json'.format(search_text),
        params={
            'access_token': MAPBOX_ACCESS_TOKEN,
            'limit': 5
        }
    )
    return jsonify(response.json())

@app.route('/api/directions')
def directions():
    """Proxy endpoint for Mapbox directions"""
    coordinates = request.args.get('coordinates')
    if not coordinates:
        return jsonify({'error': 'No coordinates provided'}), 400

    # Forward the request to Mapbox
    response = requests.get(
        'https://api.mapbox.com/directions/v5/mapbox/driving/{}'.format(coordinates),
        params={
            'access_token': MAPBOX_ACCESS_TOKEN,
            'geometries': 'geojson'
        }
    )
    return jsonify(response.json())

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