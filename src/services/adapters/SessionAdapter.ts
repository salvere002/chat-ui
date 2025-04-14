import { AbstractBaseAdapter } from './BaseAdapter';
import { ApiClient } from '../apiClient';
import { MessageRequest, MessageResponse, StreamMessageChunk, FileUploadResponse } from '../../types/api';
import { StreamCallbacks, ProgressCallback } from './BaseAdapter';

export class SessionAdapter extends AbstractBaseAdapter {
  private sessionCookie: string | null = null;
  private readonly endpoint: string;

  constructor(apiClient: ApiClient, endpoint: string) {
    super(apiClient);
    this.endpoint = endpoint;
  }

  private async makeRequest<T>(data: any): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.sessionCookie) {
      headers['Cookie'] = `session=${this.sessionCookie}`;
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      credentials: 'include', // This is important for cookie handling
    });

    // Update session cookie from response
    const newSessionCookie = response.headers.get('set-cookie');
    if (newSessionCookie) {
      const match = newSessionCookie.match(/session=([^;]+)/);
      if (match) {
        this.sessionCookie = match[1];
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    return this.makeRequest<MessageResponse>(request);
  }

  async sendStreamingMessage(request: MessageRequest, callbacks: StreamCallbacks): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };

    if (this.sessionCookie) {
      headers['Cookie'] = `session=${this.sessionCookie}`;
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      credentials: 'include',
    });

    // Update session cookie from response
    const newSessionCookie = response.headers.get('set-cookie');
    if (newSessionCookie) {
      const match = newSessionCookie.match(/session=([^;]+)/);
      if (match) {
        this.sessionCookie = match[1];
      }
    }

    if (!response.ok) {
      callbacks.onError(new Error(`HTTP error! status: ${response.status}`));
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError(new Error('No response body'));
      return;
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          callbacks.onComplete();
          break;
        }

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            callbacks.onChunk(data);
          }
        }
      }
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  async uploadFile(fileId: string, file: File, onProgress: ProgressCallback): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileId', fileId);

    const headers: Record<string, string> = {};
    if (this.sessionCookie) {
      headers['Cookie'] = `session=${this.sessionCookie}`;
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    // Update session cookie from response
    const newSessionCookie = response.headers.get('set-cookie');
    if (newSessionCookie) {
      const match = newSessionCookie.match(/session=([^;]+)/);
      if (match) {
        this.sessionCookie = match[1];
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getFiles(): Promise<FileUploadResponse[]> {
    return this.makeRequest<FileUploadResponse[]>({ action: 'getFiles' });
  }

  async getFile(fileId: string): Promise<FileUploadResponse> {
    return this.makeRequest<FileUploadResponse>({ action: 'getFile', fileId });
  }
} 