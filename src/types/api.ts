import { MessageFile } from './chat';

/**
 * Custom API Error class with additional properties
 */
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// =========================================
// Request Types
// =========================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface MessageRequest {
  text: string;
  files?: MessageFile[];
  history?: ConversationMessage[];
}

export interface UploadRequest {
  file: File;
}

// =========================================
// Response Types
// =========================================

export interface MessageResponse {
  text: string;
  imageUrl?: string;
  // Thinking content support for non-streaming
  thinking?: string;
  thinkingMetadata?: {
    backend?: string;
    format?: string;
    step?: number;
  };
}

export interface StreamMessageChunk {
  text?: string;
  imageUrl?: string;
  complete?: boolean;
  // Thinking content support
  thinking?: string;
  thinkingComplete?: boolean;
  thinkingMetadata?: {
    backend?: string;
    format?: string;
    step?: number;
  };
}

export interface FileUploadResponse {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  status: number;
  details?: any;
}

// =========================================
// API Endpoint Definitions
// =========================================

export interface ApiEndpoints {
  // Message endpoints
  'message/fetch': {
    request: MessageRequest;
    response: MessageResponse;
  };
  'message/stream': {
    request: MessageRequest;
    response: StreamMessageChunk;
  };
  // File endpoints
  'upload': {
    request: FormData;
    response: FileUploadResponse;
  };
  'files': {
    request: void;
    response: FileUploadResponse[];
  };
  'files/:id': {
    request: void;
    response: FileUploadResponse;
  };
}

// Type helper for getting request/response types for a specific endpoint
export type EndpointRequest<T extends keyof ApiEndpoints> = ApiEndpoints[T]['request'];
export type EndpointResponse<T extends keyof ApiEndpoints> = ApiEndpoints[T]['response']; 