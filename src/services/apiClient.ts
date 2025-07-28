import { ApiError } from '../types/api';
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
        }
      }

      let response = await fetch(processedRequest.url, {
        ...processedRequest,
        signal: combinedSignal,
      });
      clearTimeout(timeoutId);

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
      let buffer = '';
      let field = '';
      let dataBuffer: string[] = [];

      while (true) {
        // Check if the request has been aborted
        if (combinedSignal.aborted) {
          reader.cancel();
          return; // Exit silently, abort error will be handled by fetch promise rejection
        }
        
        const { done, value } = await reader.read();
        if (done) {
          if (dataBuffer.length > 0) { // Process any remaining buffered data as a final event
            try {
              const jsonData = dataBuffer.join('\n');
              if (jsonData && jsonData.toLowerCase() !== '[done]') {
                const chunkData = JSON.parse(jsonData) as StreamMessageChunk;
                callbacks.onChunk(chunkData);
              }
            } catch (e) {
              console.error('Error parsing final stream data JSON:', dataBuffer.join('\n'), e);
            }
          }
          callbacks.onComplete();
          break;
        }

        const rawChunk = decoder.decode(value, { stream: true });
        
        // Apply stream chunk interceptors first
        const interceptorResult = this.applyStreamChunkInterceptors(rawChunk, buffer, callbacks);
        
        if (interceptorResult.customHandling) {
          // Interceptor handled everything, continue to next chunk
          continue;
        }
        
        if (!interceptorResult.shouldContinue) {
          // Interceptor wants to stop processing
          break;
        }
        
        // Use processed chunk from interceptors or default parsing
        buffer += interceptorResult.processedChunk;
        
        let eolIndex;
        // Process buffer line by line (\n is the standard field separator)
        while ((eolIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.substring(0, eolIndex);
          buffer = buffer.substring(eolIndex + 1);

          if (line.trim() === '') { // Empty line: dispatch event
            if (dataBuffer.length > 0) {
              const jsonData = dataBuffer.join('\n'); // Join multi-line data fields
              if (jsonData && jsonData.toLowerCase() !== '[done]') {
                try {
                  const chunkData = JSON.parse(jsonData) as StreamMessageChunk;
                  callbacks.onChunk(chunkData);
                } catch (e) {
                  console.error('Error parsing stream data JSON:', jsonData, e);
                  // Consider calling callbacks.onError if parsing fails for a critical message
                }
              } else if (jsonData.toLowerCase() === '[done]') {
                 // OpenAI specific: [DONE] indicates end of useful data before stream formally closes
                 // onComplete will be called when stream is actually done.
              }
              dataBuffer = []; // Reset for next event
            }
            // Reset event name for next event
            continue;
          }

          const colonIndex = line.indexOf(':');
          if (colonIndex <= 0) { // Not a valid field (no colon, or colon at start)
            field = line; // Could be a comment if line starts with colon, or just a field name with no value
          } else {
            field = line.substring(0, colonIndex);
            const fieldValue = line.substring(colonIndex + 1).trimLeft(); // Remove leading space from value

            if (field === 'data') {
              dataBuffer.push(fieldValue);
            } else if (field === 'event') {
              // Event type handled by caller if needed
            } else if (field === 'id') {
              // Field handled by caller if needed
            } else if (field === 'retry') {
              // Field handled by caller if needed
            }
            // Ignore unknown fields and comments (lines starting with a colon)
          }
        }
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