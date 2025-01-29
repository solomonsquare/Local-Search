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

# Get API key from environment variables
MAPBOX_ACCESS_TOKEN = os.getenv('MAPBOX_ACCESS_TOKEN')

# Verify API key is loaded
if not MAPBOX_ACCESS_TOKEN:
    logger.error("Mapbox access token not found in environment variables!")
else:
    logger.info("API Key loaded successfully")

@app.route('/')
def index():
    # Add API key verification in the route
    if not MAPBOX_ACCESS_TOKEN:
        return "Error: Required API key not configured!", 500
    
    return render_template('index.html', 
                         mapbox_token=MAPBOX_ACCESS_TOKEN)

@app.route('/debug')
def debug_info():
    """Route to verify API key and environment setup"""
    return {
        'mapbox_token_present': bool(MAPBOX_ACCESS_TOKEN),
        'environment': app.env,
        'debug_mode': app.debug
    }

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                             'favicon.ico', mimetype='image/vnd.microsoft.icon')

if __name__ == '__main__':
    app.run(debug=True) 