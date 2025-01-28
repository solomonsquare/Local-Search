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

# Get Google Maps API key from environment variable
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')

# Verify API key is loaded
if not GOOGLE_MAPS_API_KEY:
    logger.error("Google Maps API key not found in environment variables!")
else:
    logger.info(f"API Key loaded successfully (length: {len(GOOGLE_MAPS_API_KEY)})")

@app.route('/')
def index():
    # Add API key verification in the route
    if not GOOGLE_MAPS_API_KEY:
        return "Error: Google Maps API key not configured!", 500
    
    logger.debug(f"Rendering template with API key (masked): {GOOGLE_MAPS_API_KEY[:8]}...{GOOGLE_MAPS_API_KEY[-4:]}")
    return render_template('index.html', api_key=GOOGLE_MAPS_API_KEY)

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