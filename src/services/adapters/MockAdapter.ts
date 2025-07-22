import { AbstractBaseAdapter, StreamCallbacks, ProgressCallback } from './BaseAdapter';
import { ApiError, MessageRequest, MessageResponse, FileUploadResponse } from '../../types/api';
import { ApiClient, DataTransformer } from '../apiClient';

// Mock responses for demo/offline use
const MOCK_RESPONSES = {
  greeting: "Hello! I'm a mock AI assistant. I can simulate responses for demo purposes.",
  echo: (text: string) => `You said: "${text}"`,
  notUnderstand: "I'm sorry, I don't understand that request. This is a mock response for demonstration purposes.",
  imageResponse: {
    text: "Here's a placeholder image I generated:",
    imageUrl: "https://via.placeholder.com/512x512.png?text=AI+Generated+Image"
  }
};

/**
 * Mock adapter for offline/demo use
 * Simulates API responses without requiring a backend
 */
export class MockAdapter extends AbstractBaseAdapter {
  private mockFiles: Record<string, FileUploadResponse> = {};
  
  constructor(apiClient: ApiClient) {
    super(apiClient);
    
    // Initialize with some mock files
    this.mockFiles = {
      'mock-file-1': {
        id: 'mock-file-1',
        name: 'sample-document.pdf',
        type: 'application/pdf',
        size: 1024 * 1024 * 2.5, // 2.5MB
        url: 'https://via.placeholder.com/100x100.png?text=PDF'
      },
      'mock-file-2': {
        id: 'mock-file-2',
        name: 'sample-image.jpg',
        type: 'image/jpeg',
        size: 1024 * 512, // 512KB
        url: 'https://via.placeholder.com/800x600.png?text=Sample+Image'
      }
    };
  }
  
  /**
   * Mock implementation doesn't use apiClient.request directly,
   * but we implement transform functions for consistency with other adapters
   */
  private transformMessageResponse: DataTransformer<any, MessageResponse> = (rawData) => {
    return rawData as MessageResponse;
  };
  
  private transformFileResponse: DataTransformer<any, FileUploadResponse> = (rawData) => {
    return rawData as FileUploadResponse;
  };
  
  private transformFilesListResponse: DataTransformer<any, FileUploadResponse[]> = (rawData) => {
    return Array.isArray(rawData) ? rawData : [];
  };
  
  /**
   * Send a message and get a complete response
   */
  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    await this.simulateNetworkDelay();
    
    const { text, history } = request;
    let response: MessageResponse;
    
    // Check if thinking mode should be enabled
    const enableThinking = text.includes('/think');
    
    // Generate different responses based on the request and history
    if (text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi')) {
      response = { text: MOCK_RESPONSES.greeting };
    } else if (text.toLowerCase().includes('image')) {
      response = MOCK_RESPONSES.imageResponse;
    } else if (history && history.length > 0) {
      // Show that we have access to conversation history
      response = { text: `${MOCK_RESPONSES.echo(text)} (I can see our conversation has ${history.length} previous messages)` };
    } else {
      response = { text: MOCK_RESPONSES.echo(text) };
    }
    
    // Add thinking content if enabled
    if (enableThinking) {
      response.thinking = "Let me think about this question... I need to consider multiple aspects here. First, let me analyze the user's intent. They seem to be asking about... Based on my understanding, I should provide... Let me structure my response carefully. I'll make sure to cover all important points.";
      response.thinkingMetadata = {
        backend: 'mock',
        format: 'complete'
      };
    }
    
    // We can use our transformer for consistency, though it's not needed in this mock implementation
    return this.transformMessageResponse(response);
  }
  
  /**
   * Send a message and get a streaming response
   */
  async sendStreamingMessage(
    request: MessageRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const { onChunk, onComplete, onError } = callbacks;
    
    try {
      const { text, history } = request;
      let responseText = '';
      
      // Check if thinking mode should be enabled
      const enableThinking = text.includes('/think');
      
      // Determine which mock response to use
      if (text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi')) {
        responseText = MOCK_RESPONSES.greeting;
      } else if (text.toLowerCase().includes('image')) {
        responseText = MOCK_RESPONSES.imageResponse.text;
      } else if (history && history.length > 0) {
        // Show that we have access to conversation history
        responseText = `${MOCK_RESPONSES.echo(text)} (I can see our conversation has ${history.length} previous messages)`;
      } else {
        responseText = MOCK_RESPONSES.echo(text);
      }
      
      
      // Stream thinking content first if thinking mode is enabled
      if (enableThinking) {
        const thinkingSteps = [
          "Let me think about this question...",
          " I need to consider multiple aspects here.",
          " First, let me analyze the user's intent.",
          " They seem to be asking about...",
          " Based on my understanding, I should provide...",
          " Let me structure my response carefully.",
          " I'll make sure to cover all important points."
        ];

        // Stream thinking content
        for (let i = 0; i < thinkingSteps.length; i++) {
          await this.simulateNetworkDelay(200, 400);
          
          onChunk({
            thinking: thinkingSteps[i],
            thinkingComplete: false,
            thinkingMetadata: {
              backend: 'mock',
              format: 'streaming',
              step: i + 1
            }
          });
        }

        // Mark thinking complete
        await this.simulateNetworkDelay(200);
        onChunk({
          thinking: "",
          thinkingComplete: true,
          thinkingMetadata: {
            backend: 'mock',
            format: 'streaming'
          }
        });
      }
      
      // Split the response into words to simulate streaming
      const words = responseText.split(' ');
      
      // Stream the response word by word
      for (let i = 0; i < words.length; i++) {
        await this.simulateNetworkDelay(50, 150);
        
        // Add a space after each word except the last one
        const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
        
        onChunk({
          text: chunk,
        });
      }
      
      // Add image at the end if the request was about images
      if (text.toLowerCase().includes('image')) {
        await this.simulateNetworkDelay(500, 1000);
        onChunk({
          imageUrl: MOCK_RESPONSES.imageResponse.imageUrl,
        });
      }
      
      // Complete the response
      await this.simulateNetworkDelay(100, 300);
      onChunk({ complete: true });
      onComplete();
    } catch (error) {
      console.error('Error in mock streaming:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Upload a file with progress tracking
   */
  async uploadFile(
    fileId: string,
    file: File,
    onProgress: ProgressCallback
  ): Promise<FileUploadResponse> {
    return new Promise(async (resolve, reject) => {
      try {
        // Initialize progress
        onProgress(fileId, 0);
        
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await this.simulateNetworkDelay(100, 300);
          onProgress(fileId, progress);
        }
        
        // Create a mock file response
        const mockFileResponse: FileUploadResponse = {
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file), // Create a local object URL for the file
        };
        
        // Store the mock file
        this.mockFiles[fileId] = mockFileResponse;
        
        // Apply our transformer for consistency
        resolve(this.transformFileResponse(mockFileResponse));
      } catch (error) {
        console.error(`Mock upload error for ${fileId}:`, error);
        reject(error);
      }
    });
  }
  
  /**
   * Get all uploaded files
   */
  async getFiles(): Promise<FileUploadResponse[]> {
    await this.simulateNetworkDelay();
    return this.transformFilesListResponse(Object.values(this.mockFiles));
  }
  
  /**
   * Get a single uploaded file by ID
   */
  async getFile(fileId: string): Promise<FileUploadResponse> {
    await this.simulateNetworkDelay();
    
    const file = this.mockFiles[fileId];
    if (!file) {
      throw new ApiError(`File with ID ${fileId} not found`, 404);
    }
    
    return this.transformFileResponse(file);
  }
  
  /**
   * Simulate network delay for mock responses
   */
  private async simulateNetworkDelay(min = 200, max = 800): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
} 