import os
import time
import uuid
import random
from datetime import datetime, timedelta

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from streaming import create_sse_response, stream_response_generator, detect_studio_request, build_studio_response
from config_loader import config_manager
from chart_generator import ChartGenerator

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

PROCESSING_DELAY_SECONDS = 3
THINKING_TEXT = (
    "Let me think about this question... I need to consider multiple aspects here. "
    "First, let me analyze the user's intent. They seem to be asking about... "
    "Based on my understanding, I should provide... Let me structure my response carefully. "
    "I'll make sure to cover all important points."
)


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def set_test_cookies(response):
    """Add test cookies to verify proxy cookie handling"""
    # Set a session cookie (no expiry, deleted when browser closes)
    response.set_cookie(
        'session_cookie',
        'test_session_value',
        path='/',
        domain='example.com',  # This should be rewritten by proxy
        secure=True,  # This should be conditionally preserved by proxy
        httponly=True,
    )

    # Set a persistent cookie (with expiry)
    expiry = datetime.now() + timedelta(days=30)
    response.set_cookie(
        'persistent_cookie',
        'test_persistent_value',
        expires=expiry,
        path='/',
        domain='example.com',  # This should be rewritten by proxy
        secure=True,  # This should be conditionally preserved by proxy
        httponly=True,
        samesite='Strict',  # This should be rewritten to Lax by proxy
    )

    return response


def get_request_payload():
    payload = request.get_json(silent=True)
    return payload if isinstance(payload, dict) else {}


def normalize_uploaded_files(files):
    if not isinstance(files, list):
        return []
    return [item for item in files if isinstance(item, dict)]


def extract_text_from_message(message):
    if isinstance(message, str):
        return message
    if not isinstance(message, dict):
        return ''

    for key in ('content', 'text', 'delta'):
        value = message.get(key)
        if isinstance(value, str) and value:
            return value

    parts = message.get('parts')
    if isinstance(parts, list):
        for part in parts:
            if not isinstance(part, dict):
                continue
            for key in ('text', 'content', 'delta'):
                value = part.get(key)
                if isinstance(value, str) and value:
                    return value

    return ''


def extract_text_and_files(payload):
    """Accept REST, A2A, or AG-UI payload shapes and normalize to text + files."""
    text = payload.get('text', '') if isinstance(payload.get('text'), str) else ''

    if not text:
        text = extract_text_from_message(payload.get('message'))

    if not text:
        input_text = payload.get('input')
        if isinstance(input_text, str):
            text = input_text

    if not text:
        messages = payload.get('messages')
        if isinstance(messages, list):
            for item in reversed(messages):
                if not isinstance(item, dict):
                    continue
                role = item.get('role')
                content = item.get('content')
                if isinstance(content, str) and content:
                    if role == 'user':
                        text = content
                        break
                    if not text:
                        text = content

    uploaded_files = normalize_uploaded_files(payload.get('files'))
    if not uploaded_files:
        uploaded_files = normalize_uploaded_files(payload.get('attachments'))

    return text, uploaded_files


def detect_chart_response(text):
    chart_type = ChartGenerator.detect_chart_request(text)
    if not chart_type:
        return None

    data_context = ChartGenerator.detect_data_context(text)
    if chart_type == 'all':
        return ChartGenerator.create_all_charts_markdown(data_context)

    single_chart_data = ChartGenerator.generate_chart_data(chart_type, data_context)
    return ChartGenerator.create_chart_markdown(single_chart_data)


def maybe_generate_image_url(uploaded_files):
    include_image = any(f.get('type', '').startswith('image/') for f in uploaded_files) or (random.random() < 0.3)
    if not include_image:
        return None

    image_size = 200 + (int(time.time()) % 100)
    return f"https://picsum.photos/{image_size}/{image_size}?random={int(time.time())}"


def build_response_text(text, uploaded_files, chart_response):
    studio_file = detect_studio_request(text)
    if studio_file:
        return build_studio_response(text, uploaded_files, studio_file)
    if chart_response:
        return chart_response
    file_names = ', '.join([f.get('name', 'unknown') for f in uploaded_files]) if uploaded_files else 'None'
    return f'AI response to: "{text}". Files received: {file_names}.'


def build_standard_response_data(text, uploaded_files):
    chart_response = detect_chart_response(text)
    image_url = maybe_generate_image_url(uploaded_files)
    response_text = build_response_text(text, uploaded_files, chart_response)

    response_data = {
        'text': response_text,
        'imageUrl': image_url,
    }

    if '/think' in text:
        response_data['thinking'] = THINKING_TEXT
        response_data['thinkingMetadata'] = {
            'backend': 'python',
            'format': 'complete',
        }

    return response_data, chart_response, image_url


def build_a2a_send_response(text, uploaded_files):
    response_data, _, _ = build_standard_response_data(text, uploaded_files)

    message = {
        'role': 'assistant',
        'content': response_data['text'],
        'parts': [{'type': 'text', 'text': response_data['text']}],
    }

    payload = {
        'message': message,
        'text': response_data['text'],
        'metadata': {
            'protocol': 'a2a',
            'status': 'completed',
        },
    }

    if response_data.get('imageUrl'):
        payload['imageUrl'] = response_data['imageUrl']
        payload['message']['imageUrl'] = response_data['imageUrl']

    if response_data.get('thinking'):
        payload['thinking'] = response_data['thinking']

    return payload


def build_agui_send_response(text, uploaded_files):
    response_data, _, _ = build_standard_response_data(text, uploaded_files)

    payload = {
        'id': f'run_{uuid.uuid4().hex[:12]}',
        'type': 'RUN_COMPLETED',
        'status': 'completed',
        'text': response_data['text'],
        'output_text': response_data['text'],
        'result': {
            'text': response_data['text'],
        },
        'metadata': {
            'protocol': 'ag-ui',
        },
    }

    if response_data.get('imageUrl'):
        payload['imageUrl'] = response_data['imageUrl']
        payload['result']['imageUrl'] = response_data['imageUrl']

    if response_data.get('thinking'):
        payload['thinking'] = response_data['thinking']

    return payload


def stream_response_generator_a2a(text, uploaded_files, image_url=None, chart_response=None):
    for chunk in stream_response_generator(text, uploaded_files, image_url, chart_response):
        thinking = chunk.get('thinking')
        if thinking:
            yield {
                'type': 'reasoning_delta',
                'reasoning': thinking,
                'protocol': 'a2a',
            }

        text_delta = chunk.get('text')
        if text_delta:
            event = {
                'type': 'message_delta',
                'delta': text_delta,
            }
            if chunk.get('imageUrl'):
                event['imageUrl'] = chunk.get('imageUrl')
            yield event

        if chunk.get('complete'):
            yield {
                'type': 'message_complete',
                'complete': True,
            }


def stream_response_generator_agui(text, uploaded_files, image_url=None, chart_response=None):
    for chunk in stream_response_generator(text, uploaded_files, image_url, chart_response):
        thinking = chunk.get('thinking')
        if thinking:
            yield {
                'type': 'THINKING',
                'reasoning': thinking,
            }

        text_delta = chunk.get('text')
        if text_delta:
            event = {
                'type': 'TEXT_DELTA',
                'delta': text_delta,
            }
            if chunk.get('imageUrl'):
                event['imageUrl'] = chunk.get('imageUrl')
            yield event

        if chunk.get('complete'):
            yield {
                'type': 'RUN_FINISHED',
            }


def wants_event_stream():
    accept = request.headers.get('Accept', '')
    return 'text/event-stream' in accept.lower()


@app.route('/api/upload', methods=['POST'])
@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload and return file metadata"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        timestamp = int(time.time())
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)

        file_id = str(uuid.uuid4())
        file_url = f"/api/files/{unique_filename}"

        response = jsonify({
            'id': file_id,
            'name': filename,
            'type': file.content_type,
            'size': os.path.getsize(file_path),
            'url': file_url,
        })

        return set_test_cookies(response)

    return jsonify({'error': 'File type not allowed'}), 400


@app.route('/api/files/<filename>', methods=['GET'])
@app.route('/files/<filename>', methods=['GET'])
def get_file(filename):
    """Serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/api/message/stream', methods=['POST'])
@app.route('/message/stream', methods=['POST'])
def stream_message():
    """REST-compatible streaming response endpoint (also handles A2A slash fallback)."""
    payload = get_request_payload()
    text, uploaded_files = extract_text_and_files(payload)

    time.sleep(PROCESSING_DELAY_SECONDS)
    chart_response = detect_chart_response(text)
    image_url = maybe_generate_image_url(uploaded_files)

    return create_sse_response(
        stream_response_generator(text, uploaded_files, image_url, chart_response)
    )


@app.route('/api/message/fetch', methods=['POST'])
@app.route('/message/fetch', methods=['POST'])
def fetch_message():
    """REST-compatible non-streaming response endpoint."""
    payload = get_request_payload()
    text, uploaded_files = extract_text_and_files(payload)

    time.sleep(PROCESSING_DELAY_SECONDS)
    response_data, _, _ = build_standard_response_data(text, uploaded_files)

    response = jsonify(response_data)
    return set_test_cookies(response)


@app.route('/message:send', methods=['POST'])
@app.route('/api/message:send', methods=['POST'])
@app.route('/message/send', methods=['POST'])
@app.route('/api/message/send', methods=['POST'])
def a2a_send_message():
    """A2A non-streaming endpoint."""
    payload = get_request_payload()
    text, uploaded_files = extract_text_and_files(payload)

    time.sleep(PROCESSING_DELAY_SECONDS)
    response_data = build_a2a_send_response(text, uploaded_files)

    response = jsonify(response_data)
    return set_test_cookies(response)


@app.route('/message:stream', methods=['POST'])
@app.route('/api/message:stream', methods=['POST'])
def a2a_stream_message():
    """A2A canonical streaming endpoint."""
    payload = get_request_payload()
    text, uploaded_files = extract_text_and_files(payload)

    time.sleep(PROCESSING_DELAY_SECONDS)
    chart_response = detect_chart_response(text)
    image_url = maybe_generate_image_url(uploaded_files)

    return create_sse_response(
        stream_response_generator_a2a(text, uploaded_files, image_url, chart_response)
    )


@app.route('/runs', methods=['POST'])
@app.route('/api/runs', methods=['POST'])
def agui_runs():
    """AG-UI endpoint that supports both run (JSON) and stream (SSE) based on Accept header."""
    payload = get_request_payload()
    text, uploaded_files = extract_text_and_files(payload)

    time.sleep(PROCESSING_DELAY_SECONDS)

    if wants_event_stream():
        chart_response = detect_chart_response(text)
        image_url = maybe_generate_image_url(uploaded_files)
        return create_sse_response(
            stream_response_generator_agui(text, uploaded_files, image_url, chart_response)
        )

    response_data = build_agui_send_response(text, uploaded_files)
    response = jsonify(response_data)
    return set_test_cookies(response)


@app.route('/run', methods=['POST'])
@app.route('/api/run', methods=['POST'])
def agui_run():
    """AG-UI non-streaming fallback endpoint."""
    payload = get_request_payload()
    text, uploaded_files = extract_text_and_files(payload)

    time.sleep(PROCESSING_DELAY_SECONDS)
    response_data = build_agui_send_response(text, uploaded_files)

    response = jsonify(response_data)
    return set_test_cookies(response)


@app.route('/runs/stream', methods=['POST'])
@app.route('/api/runs/stream', methods=['POST'])
@app.route('/run/stream', methods=['POST'])
@app.route('/api/run/stream', methods=['POST'])
@app.route('/stream', methods=['POST'])
@app.route('/api/stream', methods=['POST'])
def agui_stream_message():
    """AG-UI streaming fallback endpoints."""
    payload = get_request_payload()
    text, uploaded_files = extract_text_and_files(payload)

    time.sleep(PROCESSING_DELAY_SECONDS)
    chart_response = detect_chart_response(text)
    image_url = maybe_generate_image_url(uploaded_files)

    return create_sse_response(
        stream_response_generator_agui(text, uploaded_files, image_url, chart_response)
    )


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    response = jsonify({'status': 'healthy'})
    return set_test_cookies(response)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', server_config.get("port", 5001)))
    app.run(
        host=server_config.get("host", "0.0.0.0"),
        port=port,
        debug=server_config.get("debug", True),
    )
