# Chat UI Backend

This is the Flask backend for the Chat UI application.

## Setup

1. Make sure you have Python 3.8+ installed

2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

Start the development server:
```bash
python app.py
```

The server will run on `http://localhost:5001` by default (as configured in config.json).

## API Endpoints

- **GET /health** - Health check endpoint
- **POST /api/upload** - Upload files
- **GET /api/files/<filename>** - Retrieve uploaded files
- **POST /api/message/stream** - Send a message and receive a streaming response
- **POST /api/message/fetch** - Send a message and receive a complete response

## Deployment

For production deployment, consider using Gunicorn:
```bash
gunicorn -w 4 -b 0.0.0.0:5001 app:app
``` 