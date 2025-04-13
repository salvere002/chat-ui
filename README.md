# Chat UI

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
   pip install flask-cors
   ```

3. Run the backend server:
   ```