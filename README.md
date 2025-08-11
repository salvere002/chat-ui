# Chat UI

A modern chat application featuring a React frontend with a Flask backend that supports AI text messaging, file uploads, and advanced conversation branching.

## Features

### **Core Chat Features**
- **Real-time streaming responses** using Server-Sent Events
- **Message branching system** - Create and explore different conversation paths from any point
- **Multiple chat sessions** with persistent history
- **Response mode selection** - Toggle between streaming and batch responses
- **AI thinking display** - UI support for showing AI reasoning process when provided by backend
- **File upload and download** capabilities with progress tracking
- **Rich message support** - Markdown, math equations (KaTeX), code highlighting, interactive charts

### **UI/UX Features**
- **Dynamic theme system** - Light and dark mode with smooth transitions
- **Toast notifications** - Success, error, warning, and info messages
- **Responsive design** - Mobile-first responsive layout
- **Loading indicators** and typing animations
- **Error boundaries** for graceful error handling

### **Advanced Features**
- **Service adapter pattern** - Support for REST, Mock, and Session-based APIs
- **Centralized configuration management** with environment-specific settings
- **State management** using Zustand for optimal performance
- **TypeScript support** throughout the application

## Project Structure

```
chat-ui/
├── src/                          # Frontend React application
│   ├── components/               # React components
│   │   ├── ChatInterface.tsx     # Main chat interface
│   │   ├── MessageList.tsx       # Message display with branching
│   │   ├── MessageInput.tsx      # User input with file upload
│   │   ├── Sidebar.tsx          # Chat navigation
│   │   └── Settings.tsx         # Configuration modal
│   ├── stores/                   # Zustand state management
│   │   ├── chatStore.ts         # Chat sessions and messages
│   │   ├── themeStore.ts        # Theme management
│   │   ├── toastStore.ts        # Notifications
│   │   └── serviceConfigStore.ts # Service configuration
│   ├── services/                 # API communication layer
│   │   ├── adapters/            # Service adapter implementations
│   │   ├── chatService.ts       # Main chat service
│   │   └── serviceFactory.ts    # Service factory pattern
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Utility functions
├── backend/                     # Flask backend server
│   ├── app.py                   # Main Flask application
│   ├── streaming.py            # SSE streaming implementation
│   ├── config_loader.py        # Configuration management
│   └── uploads/                # File upload storage
├── docs/                       # Documentation
└── config.json                # Centralized configuration file
```

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

- **Node.js** (v18 or newer) - Required for React 19
- **Python** 3.8+ - For backend Flask server
- **npm** or **yarn** - Package management

### Frontend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Development mode:**
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173` (Vite default)

3. **Production build:**
   ```bash
   npm run build
   ```

4. **Type checking:**
   ```bash
   npm run typecheck
   ```

### Backend Setup

#### **Quick Start (Recommended)**
```bash
# Run both frontend and backend simultaneously
npm run start
```

#### **Manual Setup**

1. **Using the setup script:**
   ```bash
   ./setup_backend.sh
   ```

2. **Manual installation:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python app.py
   ```

The backend server will start on `http://localhost:5001` by default.

## Configuration Changes

If you need to modify the application configuration:

1. Edit the `config.json` file in the project root
2. Restart both frontend and backend applications to apply changes

For production deployment, make sure to update the API base URL and other settings in the configuration file.

## Advanced Features

### **Message Branching System**

The application features a sophisticated conversation branching system that allows users to explore different conversational paths from any point in the chat.

#### **How Branching Works**
- **Create Branches**: Edit any previous message to create a new conversation branch
- **Navigate Branches**: Use branch controls to switch between different conversation paths  
- **Visual Indicators**: Branch points are clearly marked with navigation controls
- **Preserve History**: All conversation paths are preserved and accessible

#### **Branch Management**
- **Tree Structure**: Messages are organized in a tree-like hierarchy
- **Active Path Tracking**: The system tracks your current path through the conversation tree
- **Branch Operations**: Create, switch between, and delete branches as needed
- **Persistent State**: Branch structure is maintained across sessions

#### **Technical Implementation**
The branching system uses several key data structures in `chatStore`:

- **`branchTree`**: Maps branch relationships for each chat session
- **`messageBranches`**: Links message IDs to their originating branches  
- **`activeBranchPath`**: Tracks the current active path through the tree
- **Message Properties**: Each message includes `branchId`, `parentId`, and `branchPoint` flags

### **Response Mode Selection**

Choose between different response delivery methods:
- **Stream Mode**: Real-time streaming responses using Server-Sent Events
- **Fetch Mode**: Traditional request-response for complete messages

### **AI Thinking Display**

The UI provides built-in support for displaying AI reasoning processes when backends provide thinking content:

#### **UI Features**
- **Collapsible Section**: Thinking content appears in an expandable section labeled "Thoughts"
- **Stream Support**: Works with both streaming and fetch response modes
- **Auto-scroll**: Thinking content auto-scrolls during streaming for easy reading
- **State Persistence**: Thinking section expand/collapse state is preserved

#### **Backend Integration**
- **API Support**: Any backend can include thinking data in MessageResponse or StreamMessageChunk
- **Automatic Display**: UI automatically shows thinking section when thinking content is provided
- **Format Flexibility**: Supports both complete thinking text and incremental streaming

#### **Mock Adapter Testing**
For development and testing purposes, the Mock adapter includes a special feature:
- **Test Trigger**: Include `/think` in your message to simulate thinking responses
- **Example**: `"/think How does photosynthesis work?"` triggers mock thinking content
- **Note**: This is purely for testing the thinking UI - real backends don't need special triggers

### **Interactive Chart Rendering**

The application supports embedding interactive charts directly within chat messages using markdown code blocks.

#### **How to Create Charts**

Charts are created by including properly formatted JSON data in code blocks with chart type specification:

````markdown
```chart:bar
{
  "type": "bar",
  "data": [
    {"name": "Jan", "value": 400},
    {"name": "Feb", "value": 300},
    {"name": "Mar", "value": 500}
  ],
  "config": {
    "title": "Monthly Sales",
    "xLabel": "Month",
    "yLabel": "Sales ($)"
  }
}
```
````

#### **Chart Format**

**Basic Structure:**
- **Code Block Syntax**: Use ````chart:type` where `type` is the chart type
- **Alternative Formats**: `chart-type` or `chart_type` also work
- **JSON Content**: Must contain valid chart data object

**Required Fields:**
- **`type`** (string): Chart type - one of `bar`, `line`, `pie`, `area`, `scatter`
- **`data`** (array): Array of data points with key-value pairs

**Optional Fields:**
- **`config`** (object): Configuration options for customizing the chart

#### **Chart Types & Data Format**

**Bar Chart** (`bar`)
```json
{
  "type": "bar",
  "data": [
    {"name": "Category A", "value": 100},
    {"name": "Category B", "value": 200}
  ]
}
```

**Line Chart** (`line`)
```json
{
  "type": "line",
  "data": [
    {"name": "Jan", "value": 100},
    {"name": "Feb", "value": 150}
  ]
}
```

**Pie Chart** (`pie`)
```json
{
  "type": "pie",
  "data": [
    {"name": "Desktop", "value": 60},
    {"name": "Mobile", "value": 40}
  ]
}
```

**Area Chart** (`area`)
```json
{
  "type": "area",
  "data": [
    {"name": "Q1", "revenue": 1000, "expenses": 600},
    {"name": "Q2", "revenue": 1200, "expenses": 700}
  ]
}
```

**Scatter Plot** (`scatter`)
```json
{
  "type": "scatter",
  "data": [
    {"x": 10, "y": 20},
    {"x": 15, "y": 25}
  ]
}
```

#### **Configuration Options**

The `config` object supports these optional fields:

- **`title`** (string): Chart title displayed at the top
- **`xLabel`** (string): Label for the X-axis
- **`yLabel`** (string): Label for the Y-axis
- **`colors`** (array): Array of color strings for chart elements
- **`height`** (number): Chart height in pixels (default: 320)
- **`xKey`** (string): Data key for X-axis values (default: "name")
- **`yKey`** (string|array): Data key(s) for Y-axis values (default: "value")

#### **Multi-Series Charts**

For charts with multiple data series, use arrays for `yKey`:

```json
{
  "type": "bar",
  "data": [
    {"month": "Jan", "sales": 400, "target": 350},
    {"month": "Feb", "sales": 300, "target": 320}
  ],
  "config": {
    "xKey": "month",
    "yKey": ["sales", "target"]
  }
}
```


### **Service Adapter System**

Flexible backend communication through adapter pattern:
- **REST Adapter**: Standard HTTP API communication
- **Session Adapter**: Session-based API calls
- **Mock Adapter**: Development and testing mock responses with thinking simulation support

### **File Upload System**

Comprehensive file handling with progress tracking:
- **Supported Formats**: Images, PDFs, documents, text files
- **Progress Tracking**: Real-time upload progress indicators
- **Preview System**: File previews before sending messages
- **Error Recovery**: Robust error handling for failed uploads

### **State Management**

Efficient state management using Zustand:
- **Multiple Stores**: Specialized stores for different domains (chat, theme, config)
- **Performance Optimized**: Minimal re-renders and efficient updates
- **Persistent Storage**: Local storage integration where needed
- **Type Safety**: Full TypeScript support throughout

## Technology Stack

### **Frontend**
- **React 19.1.0** - Latest React with improved performance
- **TypeScript 5.8.3** - Type safety and developer experience
- **Vite 6.2.6** - Fast build tool with HMR
- **Tailwind CSS 4.1.11** - Utility-first CSS framework
- **Zustand 5.0.3** - Lightweight state management
- **React Markdown** - Markdown rendering with KaTeX math support
- **Recharts** - Interactive chart rendering library
- **React Icons** - Comprehensive icon library

### **Backend** 
- **Flask 2.0.1** - Python web framework
- **Flask-CORS** - Cross-origin resource sharing
- **Werkzeug** - WSGI utilities for secure file handling
- **Server-Sent Events** - Real-time streaming implementation

### **Development Tools**
- **ESLint & Prettier** - Code quality and formatting
- **PostCSS & Autoprefixer** - CSS processing
- **Concurrently** - Run multiple processes simultaneously