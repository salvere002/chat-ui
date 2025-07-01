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

## Message Branching and Versioning

This application supports message branching, allowing users to explore different conversational paths from any user message.

### How it Works

-   **Creating a Branch**: To create a new branch, simply edit any of your previous messages. Instead of overwriting the original message, the application will preserve the original and create a new "branch" with your edited message and the subsequent AI response.
-   **Switching Branches**: When a message has multiple branches, a branch switcher will appear below the message. You can use the arrow buttons to navigate between the different versions of the conversation.
-   **Branch Indicator**: The switcher displays the current branch number and the total number of available branches (e.g., "1/3").

### Data Structure

The branching feature is managed within the `chatStore` using a few key data structures:

-   **`Message`**: The `Message` object in `src/types/chat.ts` has been extended to support branching:
    -   `branchId`: Identifies which branch the message belongs to.
    -   `parentId`: The ID of the message from which this message was branched.
    -   `branchPoint`: A boolean flag that is `true` if a message is the starting point for one or more branches.
-   **`branchTree`**: A `Map` that stores the relationships between branches, forming a tree-like structure for each chat session.
-   **`messageBranches`**: A `Map` that links a message ID to the different branch IDs that originate from it.
-   **`activeBranchPath`**: A `Map` that keeps track of the currently active branch path for each chat, from the 'main' branch to the current tip.