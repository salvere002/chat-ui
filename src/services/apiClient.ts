import { ApiError } from '../types/api';
import { createParser } from 'eventsource-parser';
import { configManager } from '../utils/config';
import { StreamCallbacks } from './adapters/BaseAdapter';
import { StreamMessageChunk } from '../types/api';

/**
 * Configuration for the API client
 */
export interface ApiClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

/**
 * Request interceptor function type
 */
export type RequestInterceptor = (
  request: RequestInit & { url: string }
) => RequestInit & { url: string };

/**
 * Response interceptor function type
 */
export type ResponseInterceptor = (
  response: Response,
  requestOptions: RequestInit & { url: string }
) => Promise<Response>;

/**
 * Error interceptor function type
 */
export type ErrorInterceptor = (
  error: any,
  requestOptions: RequestInit & { url: string }
) => Promise<Response | void>;

/**
 * Data transformer function type
 * Transforms raw response data to the expected type
 */
export type DataTransformer<R, T> = (rawData: R) => T;

/**
 * Stream chunk interceptor function type
 * Processes individual chunks during streaming
 */
export type StreamChunkInterceptor = (
  rawChunk: string,
  accumulated: string,
  callbacks: StreamCallbacks
) => {
  processedChunk?: string;
  shouldContinue: boolean;
  customHandling?: boolean; // If true, interceptor handles callbacks itself
};

/**
 * Stream response interceptor function type
 * Similar to ResponseInterceptor but specifically for streaming responses
 */
export type StreamResponseInterceptor = (
  response: Response,
  requestOptions: RequestInit & { url: string }
) => Promise<Response>;

/**
 * API Client with interceptor support
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  
  // Stream-specific interceptors
  private streamRequestInterceptors: RequestInterceptor[] = [];
  private streamResponseInterceptors: StreamResponseInterceptor[] = [];
  private streamErrorInterceptors: ErrorInterceptor[] = [];
  private streamChunkInterceptors: StreamChunkInterceptor[] = [];

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.defaultHeaders = config.defaultHeaders || {};
    this.timeout = config.timeout || 30000; // Default 30 second timeout
  }

  /**
   * Get the base URL configured for the API client.
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Add a request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add a response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Add an error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Add a stream request interceptor
   */
  addStreamRequestInterceptor(interceptor: RequestInterceptor): void {
    this.streamRequestInterceptors.push(interceptor);
  }

  /**
   * Add a stream response interceptor
   */
  addStreamResponseInterceptor(interceptor: StreamResponseInterceptor): void {
    this.streamResponseInterceptors.push(interceptor);
  }

  /**
   * Add a stream error interceptor
   */
  addStreamErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.streamErrorInterceptors.push(interceptor);
  }

  /**
   * Add a stream chunk interceptor
   */
  addStreamChunkInterceptor(interceptor: StreamChunkInterceptor): void {
    this.streamChunkInterceptors.push(interceptor);
  }

  /**
   * Execute all request interceptors
   */
  private applyRequestInterceptors(requestOptions: RequestInit & { url: string }): RequestInit & { url: string } {
    return this.requestInterceptors.reduce(
      (options, interceptor) => interceptor(options),
      requestOptions
    );
  }

  /**
   * Execute all response interceptors
   */
  private async applyResponseInterceptors(
    response: Response,
    requestOptions: RequestInit & { url: string }
  ): Promise<Response> {
    let processedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor(processedResponse, requestOptions);
    }
    
    return processedResponse;
  }

  /**
   * Execute all error interceptors
   */
  private async applyErrorInterceptors(
    error: any,
    requestOptions: RequestInit & { url: string }
  ): Promise<Response | void> {
    for (const interceptor of this.errorInterceptors) {
      try {
        const result = await interceptor(error, requestOptions);
        if (result) return result;
      } catch (e) {
        console.error('Error in error interceptor:', e);
      }
    }
    throw error;
  }

  /**
   * Execute all stream request interceptors
   */
  private applyStreamRequestInterceptors(requestOptions: RequestInit & { url: string }): RequestInit & { url: string } {
    return this.streamRequestInterceptors.reduce(
      (options, interceptor) => interceptor(options),
      requestOptions
    );
  }

  /**
   * Execute all stream response interceptors
   */
  private async applyStreamResponseInterceptors(
    response: Response,
    requestOptions: RequestInit & { url: string }
  ): Promise<Response> {
    let processedResponse = response;
    
    for (const interceptor of this.streamResponseInterceptors) {
      processedResponse = await interceptor(processedResponse, requestOptions);
    }
    
    return processedResponse;
  }

  /**
   * Execute all stream error interceptors
   */
  private async applyStreamErrorInterceptors(
    error: any,
    requestOptions: RequestInit & { url: string }
  ): Promise<Response | void> {
    for (const interceptor of this.streamErrorInterceptors) {
      try {
        const result = await interceptor(error, requestOptions);
        if (result) return result;
      } catch (e) {
        console.error('Error in stream error interceptor:', e);
      }
    }
    throw error;
  }

  /**
   * Execute all stream chunk interceptors
   */
  private applyStreamChunkInterceptors(
    rawChunk: string,
    accumulated: string,
    callbacks: StreamCallbacks
  ): { processedChunk: string; shouldContinue: boolean; customHandling: boolean } {
    let processedChunk = rawChunk;
    let shouldContinue = true;
    let customHandling = false;

    for (const interceptor of this.streamChunkInterceptors) {
      const result = interceptor(processedChunk, accumulated, callbacks);
      
      if (result.customHandling) {
        customHandling = true;
        break;
      }
      
      if (result.processedChunk !== undefined) {
        processedChunk = result.processedChunk;
      }
      
      if (!result.shouldContinue) {
        shouldContinue = false;
        break;
      }
    }

    return { processedChunk, shouldContinue, customHandling };
  }

  /**
   * Make an HTTP request with timeout support and data transformation
   */
  public async request<T, R = any>(
    url: string, 
    options: RequestInit = {}, 
    transformer?: DataTransformer<R, T>,
    abortSignal?: AbortSignal
  ): Promise<T> {
    const actualTargetBaseUrl = this.baseUrl; // This is the e.g., https://actual-backend.com
    const endpointPath = url.startsWith('/') ? url : `/${url}`; // Ensure endpoint starts with a slash

    const fullUrl = `/api/proxy/${encodeURIComponent(actualTargetBaseUrl)}${endpointPath}`;
    
    // Prepare request options with defaults
    let processedRequest: RequestInit & { url: string }; // Defined here for wider scope in catch block
    
    const requestOptions: RequestInit & { url: string } = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...(options.headers || {}),
      },
      url: fullUrl,
    };

    // If body is FormData, remove Content-Type header to let the browser set it
    if (options.body instanceof FormData) {
      if (requestOptions.headers) {
        delete (requestOptions.headers as Record<string, string>)['Content-Type'];
        delete (requestOptions.headers as Record<string, string>)['content-type'];
      }
    }

    try {
      // Apply request interceptors
      processedRequest = this.applyRequestInterceptors(requestOptions);
      
      // Create a combined abort controller that responds to both timeout and user cancellation
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), this.timeout);
      
      // Create a combined signal that responds to both user abort and timeout
      let combinedSignal = timeoutController.signal;
      
      // Store listener references for cleanup
      const listeners: { signal: AbortSignal; handler: () => void }[] = [];
      
      if (abortSignal) {
        // If AbortSignal.any is supported, use it
        if (typeof AbortSignal.any === 'function') {
          combinedSignal = AbortSignal.any([abortSignal, timeoutController.signal]);
        } else {
          // Fallback: create a new controller and listen to both signals
          const combinedController = new AbortController();
          combinedSignal = combinedController.signal;
          
          const abortHandler = () => combinedController.abort();
          abortSignal.addEventListener('abort', abortHandler);
          timeoutController.signal.addEventListener('abort', abortHandler);
          
          // Store listeners for cleanup
          listeners.push(
            { signal: abortSignal, handler: abortHandler },
            { signal: timeoutController.signal, handler: abortHandler }
          );
        }
      }
      
      // Execute the fetch with combined signal
      const fetchPromise = fetch(processedRequest.url, {
        ...processedRequest,
        signal: combinedSignal,
      });
      
      // Execute the request
      let response: Response;
      try {
        response = await fetchPromise;
      } catch (error) {
        // Handle network errors and timeouts
        const processedError = await this.applyErrorInterceptors(
          error instanceof Error ? error : new Error(String(error)),
          processedRequest
        );
        
        if (processedError instanceof Response) {
          response = processedError;
        } else {
          throw error;
        }
      } finally {
        clearTimeout(timeoutId);
        // Cleanup listeners
        listeners.forEach(({ signal, handler }) => {
          signal.removeEventListener('abort', handler);
        });
      }
      
      // Apply response interceptors regardless of status
      response = await this.applyResponseInterceptors(response, processedRequest);
      
      // Handle error responses
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: response.statusText };
        }
        
        const apiError = new ApiError(
          errorData.message || 'Unknown error',
          response.status,
          errorData
        );
        
        // Apply error interceptors
        const processedError = await this.applyErrorInterceptors(apiError, processedRequest);
        if (processedError instanceof Response) {
          response = processedError;
          // Re-check status after interceptor processing
          if (!response.ok) {
            // Create new error for the processed response
            let newErrorData;
            try {
              newErrorData = await response.json();
            } catch (e) {
              newErrorData = { message: response.statusText };
            }
            throw new ApiError(
              newErrorData.message || 'Request failed after error handling',
              response.status,
              newErrorData
            );
          }
        } else {
          throw apiError;
        }
      }
      
      // Get raw response data based on content type
      const contentType = response.headers.get('content-type');
      let rawData: R;
      if (contentType && contentType.includes('application/json')) {
        rawData = await response.json();
      } else {
        rawData = await response.text() as unknown as R;
      }
      
      // Apply transformation if provided, otherwise return raw data as T
      if (transformer) {
        return transformer(rawData);
      }
      
      return rawData as unknown as T;
    } catch (error) {
      // Re-throw any unhandled errors
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : String(error),
        0,
        { originalError: error }
      );
    }
  }

  public async streamMessages(
    url: string,
    streamSetupOptions: RequestInit,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const actualTargetBaseUrl = this.baseUrl;
    const endpointPath = url.startsWith('/') ? url : `/${url}`;

    const fullUrl = `/api/proxy/${encodeURIComponent(actualTargetBaseUrl)}${endpointPath}`;

    let processedRequest: RequestInit & { url: string }; // For broader scope
    const requestOptions: RequestInit & { url: string } = {
      ...streamSetupOptions,
      signal: abortSignal || streamSetupOptions.signal,
      headers: {
        ...this.defaultHeaders,
        ...(streamSetupOptions.headers || {}),
        'Accept': 'text/event-stream',
      },
      url: fullUrl,
    };

    try {
      processedRequest = this.applyStreamRequestInterceptors(requestOptions);
      
      // Create a combined abort controller that responds to both timeout and user cancellation
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), this.timeout);
      
      // Create a combined signal that responds to both user abort and timeout
      let combinedSignal = timeoutController.signal;
      
      // Store listener references for cleanup
      const listeners: { signal: AbortSignal; handler: () => void }[] = [];
      
      if (abortSignal) {
        // If AbortSignal.any is supported, use it
        if (typeof AbortSignal.any === 'function') {
          combinedSignal = AbortSignal.any([abortSignal, timeoutController.signal]);
        } else {
          // Fallback: create a new controller and listen to both signals
          const combinedController = new AbortController();
          combinedSignal = combinedController.signal;
          
          const abortHandler = () => combinedController.abort();
          abortSignal.addEventListener('abort', abortHandler);
          timeoutController.signal.addEventListener('abort', abortHandler);
          
          // Store listeners for cleanup
          listeners.push(
            { signal: abortSignal, handler: abortHandler },
            { signal: timeoutController.signal, handler: abortHandler }
          );
        }
      }

      let response = await fetch(processedRequest.url, {
        ...processedRequest,
        signal: combinedSignal,
      });
      clearTimeout(timeoutId);
      
      // Cleanup listeners after fetch completes
      listeners.forEach(({ signal, handler }) => {
        signal.removeEventListener('abort', handler);
      });

      response = await this.applyStreamResponseInterceptors(response, processedRequest);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          try {
            errorData = { message: await response.text() };
          } catch (e2) {
            errorData = { message: response.statusText };
          }
        }
        const apiError = new ApiError(
          errorData.message || `Stream setup failed with status ${response.status}`,
          response.status,
          errorData
        );
        
        const errorHandledByInterceptor = await this.applyStreamErrorInterceptors(apiError, processedRequest);
        if (errorHandledByInterceptor instanceof Response) {
          // If an error interceptor returns a Response, we can't stream from it.
          // This indicates the interceptor handled the error and "short-circuited".
          // We should probably not proceed with streaming and ensure onComplete or onError is called.
          // For now, re-throwing the original ApiError or a new one.
          console.warn('Error interceptor returned a Response during stream setup. Aborting stream.');
          throw apiError; 
        }
        throw apiError; // If interceptor didn't throw or return a new Response
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get stream reader');
      }

      const decoder = new TextDecoder();

      // Set up SSE parser; feed it chunks after optional interceptors
      const parser = createParser({
        onEvent: (event) => {
          const data = event.data;
          if (!data || data.trim() === '' || data.trim().toUpperCase() === '[DONE]') {
            return; // Ignore keep-alives and [DONE]
          }
          try {
            const chunkData = JSON.parse(data) as StreamMessageChunk;
            callbacks.onChunk(chunkData);
          } catch (e) {
            // If parsing fails, log and continue (don't break the stream)
            console.error('Error parsing SSE data JSON:', data, e);
          }
        },
        onError: (err) => {
          // Non-fatal parse errors; log for debugging.
          console.debug('SSE parse warning:', err);
        },
      });

      let accumulated = '';
      while (true) {
        if (combinedSignal.aborted) {
          try { reader.cancel(); } catch {}
          return;
        }

        const { done, value } = await reader.read();
        if (done) {
          // End of stream
          callbacks.onComplete();
          break;
        }

        const rawChunk = decoder.decode(value, { stream: true });

        // Allow adapter-specific interceptors first (e.g., OpenAI custom handling)
        const interceptorResult = this.applyStreamChunkInterceptors(rawChunk, accumulated, callbacks);

        if (interceptorResult.customHandling) {
          // Interceptor handled this chunk fully
          accumulated += rawChunk;
          continue;
        }
        if (!interceptorResult.shouldContinue) {
          // Interceptor requested to stop processing
          break;
        }

        const toFeed = interceptorResult.processedChunk ?? rawChunk;
        parser.feed(toFeed);
        accumulated += toFeed;
      }
    } catch (error) {
      const finalError = error instanceof Error ? error : new Error(String(error));
      try {
        // Ensure processedRequest is defined for error interceptors, fallback to requestOptions
        const reqOptsForError = processedRequest! ?? requestOptions;
        await this.applyStreamErrorInterceptors(finalError, reqOptsForError);
        callbacks.onError(finalError); 
      } catch (interceptedError) {
        callbacks.onError(interceptedError instanceof Error ? interceptedError : new Error(String(interceptedError)));
      }
    }
  }
}

// Create a default API client instance
export const defaultApiClient = new ApiClient({
  baseUrl: configManager.getApiConfig().baseUrl,
  defaultHeaders: configManager.getApiConfig().defaultHeaders,
  timeout: configManager.getApiConfig().timeout
}); 
