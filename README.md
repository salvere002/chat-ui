# Chat UI

A modern chat application featuring a React frontend with a Flask backend that supports AI text messaging, file uploads, and image generation.

## Features

- Real-time streaming responses using Server-Sent Events
- File upload and download capabilities
- Dynamic UI with typing indicators
- Theme switching (light/dark mode)
- Multiple chat sessions
- Message editing and regeneration
- Centralized configuration management

## Project Structure

- `src/` - Frontend React application
- `backend/` - Flask backend server
- `config.json` - Centralized configuration file

## Configuration

The application uses a centralized `config.json` file to manage all configuration settings:

```json
{
  "frontend": {
    "api": {
      "baseUrl": "http://localhost:5001/api",
      "timeout": 30000,
      "defaultHeaders": {
        "Content-Type": "application/json"
      }
    },
    "services": {
      "adapterType": "rest",
      "useMockInDev": true,
      "sessionEndpoint": "http://localhost:5001/api/session"
    },
    "ui": {
      "defaultTheme": "light"
    }
  },
  "backend": {
    "server": {
      "host": "0.0.0.0",
      "port": 5001,
      "debug": true
    },
    "uploads": {
      "folder": "uploads",
      "allowedExtensions": ["png", "jpg", "jpeg", "gif", "pdf", "txt", "doc", "docx"],
      "maxContentLength": 16777216
    },
    "cors": {
      "enabled": true
    }
  }
}
```

Modify this file to change application settings.

## Setup Instructions

### Prerequisites

- Node.js (v14 or newer)
- Python 3.8+
- npm or yarn

### Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the frontend:
   ```bash
   npm run build
   ```

3. Note: The frontend will typically run on `http://localhost:5173` or `http://localhost:3000` depending on your Vite configuration. If it uses port 3000, make sure to update the `API_BASE_URL` in `src/services/api.ts` to match.

### Backend Setup

#### Option 1: Using the setup script
1. Run the setup script:
   ```bash
   ./setup_backend.sh
   ```
   This will create a virtual environment, install dependencies and start the server.

#### Option 2: Manual setup
1. Create a virtual environment (optional but recommended):
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   pip install flask-cors
   ```

3. Run the backend server:
   ```bash
   python app.py
   ```
   
   The server will start on http://localhost:5001 by default (as specified in config.json).

## Configuration Changes

If you need to modify the application configuration:

1. Edit the `config.json` file in the project root
2. Restart both frontend and backend applications to apply changes

For production deployment, make sure to update the API base URL and other settings in the configuration file.