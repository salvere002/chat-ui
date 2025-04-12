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
  createdAt: Date;
  updatedAt: Date;
}

// Agent type for different message sending methods
export type Agent = 'stream' | 'fetch'; 