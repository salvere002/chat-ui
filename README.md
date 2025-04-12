# Chat UI with Flask Backend

A modern chat application featuring a React frontend with a Flask backend that supports AI text messaging, file uploads, and image generation.

## Features

- Real-time streaming responses using Server-Sent Events
- File upload and download capabilities
- Dynamic UI with typing indicators
- Theme switching (light/dark mode)
- Multiple chat sessions
- Message editing and regeneration

## Project Structure

- `src/` - Frontend React application
- `backend/` - Flask backend server

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
   ```

3. Run the backend server:
   ```bash
   python app.py
   ```

## Running the Application

### Development Mode

Run both frontend and backend together:
```bash
npm install -g concurrently  # Install concurrently if you don't have it
npm run start
```

Or run them separately:

- Backend:
  ```bash
  npm run start:backend
  ```

- Frontend:
  ```bash
  npm run start:frontend
  ```

The frontend will be available at http://localhost:5173 or http://localhost:3000
The backend API will be available at http://localhost:5000

### Production Mode

For production deployment:

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Serve the static files from the Flask app or another web server

3. Run the Flask backend with a production server like Gunicorn:
   ```bash
   cd backend
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

## Features

- Real-time streaming responses using Server-Sent Events
- File upload and download
- Dynamic UI with typing indicators
- Theme switching (light/dark mode)
- Multiple chat sessions
- Message editing and regeneration 