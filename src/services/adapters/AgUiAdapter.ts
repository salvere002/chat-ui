import { ApiClient, DataTransformer } from '../apiClient';
import { AbstractBaseAdapter, StreamCallbacks, ProgressCallback } from './BaseAdapter';
import { MessageRequest, MessageResponse, FileUploadResponse, StreamMessageChunk } from '../../types/api';
import { mapAgUiChunk, normalizeMessageResponse, toAgUiPayload } from './protocolPayload';

const AGUI_RUN_ENDPOINTS = ['/runs', '/run'];
const AGUI_STREAM_ENDPOINTS = ['/runs', '/runs/stream', '/run/stream', '/stream'];

/**
 * Adapter for AG-UI protocol backends.
 *
 * AG-UI is event-first; we support both direct run responses and event streams.
 */
export class AgUiAdapter extends AbstractBaseAdapter {
  constructor(apiClient: ApiClient) {
    super(apiClient);
  }

  async sendMessage(request: MessageRequest, abortSignal?: AbortSignal): Promise<MessageResponse> {
    const payload = toAgUiPayload(request);
    const errors: Error[] = [];

    for (let i = 0; i < AGUI_RUN_ENDPOINTS.length; i += 1) {
      const endpoint = AGUI_RUN_ENDPOINTS[i];
      try {
        return await this.apiClient.request<MessageResponse, unknown>(
          endpoint,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
          this.transformAgUiResponse,
          abortSignal
        );
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Most AG-UI providers are streaming-first; aggregate stream events as fallback.
    try {
      return await this.sendMessageViaStream(request, abortSignal);
    } catch (error) {
      const fallbackError = error instanceof Error ? error : new Error(String(error));
      const directError = errors.length > 0 ? ` Direct endpoint errors: ${errors.map((e) => e.message).join(' | ')}` : '';
      throw new Error(`AG-UI send failed.${directError} Fallback stream error: ${fallbackError.message}`);
    }
  }

  private transformAgUiResponse: DataTransformer<unknown, MessageResponse> = (rawData) => {
    return normalizeMessageResponse(rawData);
  };

  async sendStreamingMessage(
    request: MessageRequest,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const payload = toAgUiPayload(request);
    let lastError: Error | null = null;

    for (let i = 0; i < AGUI_STREAM_ENDPOINTS.length; i += 1) {
      const endpoint = AGUI_STREAM_ENDPOINTS[i];
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
              const mapped = mapAgUiChunk(rawChunk);
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

    callbacks.onError(lastError ?? new Error('Unable to establish an AG-UI streaming connection'));
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
