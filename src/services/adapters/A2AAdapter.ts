import { ApiClient, DataTransformer } from '../apiClient';
import { AbstractBaseAdapter, StreamCallbacks, ProgressCallback } from './BaseAdapter';
import { MessageRequest, MessageResponse, FileUploadResponse, StreamMessageChunk } from '../../types/api';
import { mapA2AChunk, normalizeMessageResponse, toA2APayload } from './protocolPayload';

const A2A_SEND_ENDPOINTS = ['/message:send', '/message/send'];
const A2A_STREAM_ENDPOINTS = ['/message:stream', '/message/stream'];

/**
 * Adapter for A2A protocol backends.
 *
 * Endpoint strategy:
 * 1. Try canonical endpoints first (`/message:send`, `/message:stream`)
 * 2. Fall back to slash variants for compatibility
 */
export class A2AAdapter extends AbstractBaseAdapter {
  constructor(apiClient: ApiClient) {
    super(apiClient);
  }

  async sendMessage(request: MessageRequest, abortSignal?: AbortSignal): Promise<MessageResponse> {
    const payload = toA2APayload(request);
    const errors: Error[] = [];

    for (let i = 0; i < A2A_SEND_ENDPOINTS.length; i += 1) {
      const endpoint = A2A_SEND_ENDPOINTS[i];
      try {
        return await this.apiClient.request<MessageResponse, unknown>(
          endpoint,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
          this.transformA2AResponse,
          abortSignal
        );
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // If a direct send endpoint is unavailable, use streaming as a fallback and aggregate text.
    try {
      return await this.sendMessageViaStream(request, abortSignal);
    } catch (error) {
      const fallbackError = error instanceof Error ? error : new Error(String(error));
      const directError = errors.length > 0 ? ` Direct endpoint errors: ${errors.map((e) => e.message).join(' | ')}` : '';
      throw new Error(`A2A send failed.${directError} Fallback stream error: ${fallbackError.message}`);
    }
  }

  private transformA2AResponse: DataTransformer<unknown, MessageResponse> = (rawData) => {
    return normalizeMessageResponse(rawData);
  };

  async sendStreamingMessage(
    request: MessageRequest,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const payload = toA2APayload(request);
    let lastError: Error | null = null;

    for (let i = 0; i < A2A_STREAM_ENDPOINTS.length; i += 1) {
      const endpoint = A2A_STREAM_ENDPOINTS[i];
      let streamError: Error | null = null;
      let streamCompleted = false;
      let seenTerminalChunk = false;

      await this.apiClient.streamMessages(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify(payload),
        },
        {
          onChunk: (rawChunk: StreamMessageChunk) => {
            if (streamError) return;
            try {
              const mapped = mapA2AChunk(rawChunk);
              if (!mapped) return;
              if (mapped.complete) seenTerminalChunk = true;
              callbacks.onChunk(mapped);
            } catch (error) {
              streamError = error instanceof Error ? error : new Error(String(error));
            }
          },
          onComplete: () => {
            if (streamError) return;
            streamCompleted = true;
            callbacks.onComplete();
          },
          onError: (error) => {
            streamError = error;
          },
        },
        abortSignal
      );

      if (!streamError && streamCompleted) {
        return;
      }

      if (!streamError && seenTerminalChunk) {
        callbacks.onComplete();
        return;
      }

      if (streamError) {
        lastError = streamError;
        if (abortSignal?.aborted) {
          break;
        }
        continue;
      }
    }

    callbacks.onError(lastError ?? new Error('Unable to establish an A2A streaming connection'));
  }

  private async sendMessageViaStream(request: MessageRequest, abortSignal?: AbortSignal): Promise<MessageResponse> {
    return new Promise<MessageResponse>((resolve, reject) => {
      let text = '';
      let imageUrl: string | undefined;
      let thinking = '';
      let done = false;

      const safeResolve = (value: MessageResponse) => {
        if (done) return;
        done = true;
        resolve(value);
      };

      const safeReject = (error: Error) => {
        if (done) return;
        done = true;
        reject(error);
      };

      this.sendStreamingMessage(
        request,
        {
          onChunk: (chunk) => {
            if (chunk.text) text += chunk.text;
            if (chunk.imageUrl) imageUrl = chunk.imageUrl;
            if (chunk.thinking) thinking += chunk.thinking;
            if (chunk.complete) {
              safeResolve({
                text,
                ...(imageUrl ? { imageUrl } : {}),
                ...(thinking ? { thinking } : {}),
              });
            }
          },
          onComplete: () => {
            safeResolve({
              text,
              ...(imageUrl ? { imageUrl } : {}),
              ...(thinking ? { thinking } : {}),
            });
          },
          onError: (error) => {
            safeReject(error);
          },
        },
        abortSignal
      ).catch((error) => {
        safeReject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  async uploadFile(fileId: string, file: File, onProgress: ProgressCallback): Promise<FileUploadResponse> {
    onProgress(fileId, 0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileId', fileId);

    try {
      const response = await this.apiClient.request<FileUploadResponse>(
        '/upload',
        {
          method: 'POST',
          body: formData,
        },
        this.transformFileUploadResponse
      );

      onProgress(fileId, 100);
      return response;
    } catch (error) {
      onProgress(fileId, 0);
      throw error;
    }
  }

  private transformFileUploadResponse: DataTransformer<any, FileUploadResponse> = (rawData) => {
    const response = rawData as FileUploadResponse;
    if (response.url && response.url.startsWith('/')) {
      const origin = new URL(this.apiClient.getBaseUrl()).origin;
      response.url = origin + response.url;
    }
    return response;
  };

  async getFiles(): Promise<FileUploadResponse[]> {
    return this.apiClient.request<FileUploadResponse[]>(
      '/files',
      { method: 'GET' },
      this.transformFilesResponse
    );
  }

  private transformFilesResponse: DataTransformer<any, FileUploadResponse[]> = (rawData) => {
    return (Array.isArray(rawData) ? rawData : []) as FileUploadResponse[];
  };

  async getFile(fileId: string): Promise<FileUploadResponse> {
    return this.apiClient.request<FileUploadResponse>(
      `/files/${fileId}`,
      { method: 'GET' },
      this.transformFileUploadResponse
    );
  }
}
