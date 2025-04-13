import { ApiError } from '../types/api';

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
 * API Client with interceptor support
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.defaultHeaders = config.defaultHeaders || {};
    this.timeout = config.timeout || 30000; // Default 30 second timeout
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
   * Make an HTTP request with timeout support
   */
  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    
    // Prepare request options with defaults
    const requestOptions: RequestInit & { url: string } = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...(options.headers || {}),
      },
      url: fullUrl,
    };

    try {
      // Apply request interceptors
      const processedRequest = this.applyRequestInterceptors(requestOptions);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      // Execute the fetch with timeout
      const fetchPromise = fetch(processedRequest.url, {
        ...processedRequest,
        signal: controller.signal,
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
      
      // Return JSON or text data based on content type
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text() as unknown as T;
      }
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

  /**
   * HTTP GET request
   */
  async get<T>(url: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * HTTP POST request
   */
  async post<T>(url: string, data?: any, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      headers,
      body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * HTTP PUT request
   */
  async put<T>(url: string, data?: any, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * HTTP DELETE request
   */
  async delete<T>(url: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * Create a server-sent event stream
   */
  createEventStream(url: string, options: RequestInit = {}): EventSource {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    return new EventSource(fullUrl);
  }
}

// Create a default API client instance
export const defaultApiClient = new ApiClient({
  baseUrl: 'http://localhost:5001/api',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
}); 