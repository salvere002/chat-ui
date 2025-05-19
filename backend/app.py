import os
import json
import time
import uuid
import random
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
from werkzeug.utils import secure_filename
from streaming import create_sse_response, stream_response_generator
from config_loader import config_manager

app = Flask(__name__)

# Get configuration
config = config_manager.get_backend_config()
server_config = config_manager.get_server_config()
uploads_config = config_manager.get_uploads_config()
cors_config = config_manager.get_cors_config()

# Enable CORS if configured
if cors_config.get("enabled", True):
    CORS(app)

# Configure uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), uploads_config.get("folder", "uploads"))
ALLOWED_EXTENSIONS = set(uploads_config.get("allowedExtensions", ["png", "jpg", "jpeg", "gif", "pdf", "txt", "doc", "docx"]))
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = uploads_config.get("maxContentLength", 16 * 1024 * 1024)  # Default 16MB

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def set_test_cookies(response):
    """Add test cookies to verify proxy cookie handling"""
    # Set a session cookie (no expiry, deleted when browser closes)
    response.set_cookie('session_cookie', 'test_session_value', 
                       path='/', 
                       domain='example.com',  # This should be rewritten by proxy
                       secure=True,          # This should be conditionally preserved by proxy
                       httponly=True)
    
    # Set a persistent cookie (with expiry)
    expiry = datetime.now() + timedelta(days=30)
    response.set_cookie('persistent_cookie', 'test_persistent_value',
                       expires=expiry,
                       path='/',
                       domain='example.com',  # This should be rewritten by proxy
                       secure=True,          # This should be conditionally preserved by proxy
                       httponly=True,
                       samesite='Strict')    # This should be rewritten to Lax by proxy
    
    return response

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload and return file metadata"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add timestamp to ensure uniqueness
        timestamp = int(time.time())
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        # Prepare file metadata for response
        file_id = str(uuid.uuid4())
        file_url = f"/api/files/{unique_filename}"
        
        response = jsonify({
            'id': file_id,
            'name': filename,
            'type': file.content_type,
            'size': os.path.getsize(file_path),
            'url': file_url
        })
        
        # Add test cookies to response
        response = set_test_cookies(response)
        
        return response
    
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/files/<filename>', methods=['GET'])
def get_file(filename):
    """Serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/message/stream', methods=['POST'])
def stream_message():
    """Handle streaming message responses using SSE"""
    data = request.json
    text = data.get('text', '')
    uploaded_files = data.get('files', [])
    
    # Determine if we should include an image in the response
    include_image = any(f.get('type', '').startswith('image/') for f in uploaded_files) or (random.random() < 0.3)
    
    image_url = None
    if include_image:
        # Use a random placeholder image
        image_size = 200 + (int(time.time()) % 100)
        image_url = f"https://picsum.photos/{image_size}/{image_size}?random={int(time.time())}"
    
    # Create an SSE response using our generator
    response = create_sse_response(
        stream_response_generator(text, uploaded_files, image_url)
    )
    
    # Note: Cannot set cookies on SSE responses as they're streamed
    # If you need cookies for SSE, set them in a previous request
    
    return response

@app.route('/api/message/fetch', methods=['POST'])
def fetch_message():
    """Handle complete message responses"""
    data = request.json
    text = data.get('text', '')
    uploaded_files = data.get('files', [])
    
    # Determine if we should include an image in the response
    include_image = any(f.get('type', '').startswith('image/') for f in uploaded_files) or (random.random() < 0.3)
    
    image_url = None
    if include_image:
        # Use a random placeholder image
        image_size = 200 + (int(time.time()) % 100)
        image_url = f"https://picsum.photos/{image_size}/{image_size}?random={int(time.time())}"
    
    # Simulate response generation
    response_text = f"AI fetch response to: \"{text}\". Files received: {', '.join([f['name'] for f in uploaded_files]) if uploaded_files else 'None'}. This is a complete response."
    
    response = jsonify({
        'text': response_text,
        'imageUrl': image_url
    })
    
    # Add test cookies to response
    response = set_test_cookies(response)
    
    return response

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    response = jsonify({'status': 'healthy'})
    response = set_test_cookies(response)
    return response

if __name__ == '__main__':
    port = int(os.environ.get('PORT', server_config.get("port", 5001)))
    app.run(
        host=server_config.get("host", "0.0.0.0"), 
        port=port, 
        debug=server_config.get("debug", True)
    ) 