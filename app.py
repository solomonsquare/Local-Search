from flask import Flask, render_template, jsonify, request, send_from_directory
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Get API keys from environment variables
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')
MAPBOX_ACCESS_TOKEN = os.getenv('MAPBOX_ACCESS_TOKEN')

# Verify API keys are loaded
if not GOOGLE_MAPS_API_KEY:
    logger.error("Google Maps API key not found in environment variables!")
if not MAPBOX_ACCESS_TOKEN:
    logger.error("Mapbox access token not found in environment variables!")
else:
    logger.info(f"API Keys loaded successfully")

@app.route('/')
def index():
    # Add API key verification in the route
    if not GOOGLE_MAPS_API_KEY or not MAPBOX_ACCESS_TOKEN:
        return "Error: Required API keys not configured!", 500
    
    logger.debug(f"Rendering template with API key (masked): {GOOGLE_MAPS_API_KEY[:8]}...{GOOGLE_MAPS_API_KEY[-4:]}")
    return render_template('index.html', 
                         api_key=GOOGLE_MAPS_API_KEY,
                         mapbox_token=MAPBOX_ACCESS_TOKEN)

@app.route('/debug')
def debug_info():
    """Route to verify API key and environment setup"""
    return {
        'api_key_present': bool(GOOGLE_MAPS_API_KEY),
        'api_key_length': len(GOOGLE_MAPS_API_KEY) if GOOGLE_MAPS_API_KEY else 0,
        'api_key_masked': f"{GOOGLE_MAPS_API_KEY[:8]}...{GOOGLE_MAPS_API_KEY[-4:]}" if GOOGLE_MAPS_API_KEY else None,
        'environment': app.env,
        'debug_mode': app.debug
    }

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                             'favicon.ico', mimetype='image/vnd.microsoft.icon')

if __name__ == '__main__':
    app.run(debug=True) 