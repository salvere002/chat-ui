// Define structure for a single attached file within a message
export interface MessageFile {
  id: string; // Unique identifier for this file instance in the message (could be backend ID)
  name: string;
  type: string; // MIME type
  size: number;
  url: string; // URL for accessing the file (could be backend URL or data URI if small)
}

export interface Message {
  id: string; // Unique ID for the message itself
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  files?: MessageFile[]; // User message can have multiple files
  // AI specific fields
  imageUrl?: string; // URL of an image sent by the AI
  isComplete?: boolean; // Flag for streaming responses (true/undefined if complete)
  // Thinking content support
  thinkingContent?: string; // Complete thinking text
  isThinkingComplete?: boolean; // Thinking phase finished
  thinkingCollapsed?: boolean; // UI state for thinking section (default: true)
  // Branch structure
  parentId?: string; // Parent message ID for tree structure
  branchId: string; // Unique identifier for this branch path
  children: string[]; // Child message IDs
  branchPoint?: boolean; // True if this message has multiple child branches
}

// Define a type for the preview file state
export interface PreviewFile {
  id: string;
  file: File;
  previewUrl: string; // Use object URL for preview
  progress: number; // Upload progress 0-100
  status: 'pending' | 'uploading' | 'complete' | 'error';
  // Store the final file details if provided on completion
  finalFileData?: MessageFile;
}

// Define type for file upload state tracked within ChatInterface
export type FileUploadState = PreviewFile;

// Chat session type
export interface Chat {
  id: string;
  messages: Message[];
  title?: string;
  name?: string; // Include name for compatibility 
  createdAt: Date;
  updatedAt: Date;
}

// Branch node metadata
export interface BranchNode {
  id: string;
  messageId: string; // Message this branch starts from
  depth: number; // How deep in the tree
  childBranches: string[]; // Child branch IDs
}

// Response mode type for different message sending methods
export type ResponseMode = 'stream' | 'fetch'; 