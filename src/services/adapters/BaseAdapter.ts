import { ApiClient } from '../apiClient';
import { MessageFile } from '../../types/chat';
import { 
  MessageRequest, 
  MessageResponse, 
  StreamMessageChunk,
  FileUploadResponse
} from '../../types/api';

/**
 * Callbacks for stream message processing
 */
export interface StreamCallbacks {
  onChunk: (chunk: StreamMessageChunk) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * File upload progress callback
 */
export type ProgressCallback = (fileId: string, progress: number) => void;

/**
 * Base service adapter interface
 * Defines the core functionality that all adapters must implement
 */
export interface BaseAdapter {
  /**
   * Send a message and get a complete response
   */
  sendMessage(request: MessageRequest): Promise<MessageResponse>;
  
  /**
   * Send a message and get a streaming response
   */
  sendStreamingMessage(
    request: MessageRequest, 
    callbacks: StreamCallbacks
  ): Promise<void>;
  
  /**
   * Upload a file
   */
  uploadFile(
    fileId: string, 
    file: File, 
    onProgress: ProgressCallback
  ): Promise<FileUploadResponse>;
  
  /**
   * Get all uploaded files
   */
  getFiles(): Promise<FileUploadResponse[]>;
  
  /**
   * Get a single uploaded file by ID
   */
  getFile(fileId: string): Promise<FileUploadResponse>;
}

/**
 * Abstract base class for service adapters
 * Provides common functionality and enforces the adapter interface
 */
export abstract class AbstractBaseAdapter implements BaseAdapter {
  protected apiClient: ApiClient;
  
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }
  
  abstract sendMessage(request: MessageRequest): Promise<MessageResponse>;
  abstract sendStreamingMessage(request: MessageRequest, callbacks: StreamCallbacks): Promise<void>;
  abstract uploadFile(fileId: string, file: File, onProgress: ProgressCallback): Promise<FileUploadResponse>;
  abstract getFiles(): Promise<FileUploadResponse[]>;
  abstract getFile(fileId: string): Promise<FileUploadResponse>;
} 