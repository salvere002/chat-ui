import { ApiClient, defaultApiClient } from './apiClient';
import { BaseAdapter } from './adapters/BaseAdapter';
import { RestApiAdapter } from './adapters/RestApiAdapter';
import { MockAdapter } from './adapters/MockAdapter';

/**
 * Service adapter types
 */
export type AdapterType = 'rest' | 'mock';

/**
 * Service environment configuration
 */
export interface ServiceConfig {
  adapterType: AdapterType;
  apiBaseUrl?: string;
  useMockInDev?: boolean; // Option to use mock adapter in development
}

/**
 * Default service configuration
 */
const DEFAULT_CONFIG: ServiceConfig = {
  adapterType: 'rest',
  apiBaseUrl: 'http://localhost:5001/api',
  useMockInDev: true
};

/**
 * Service factory for creating and managing service adapters
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private adapters: Map<AdapterType, BaseAdapter> = new Map();
  private apiClients: Map<string, ApiClient> = new Map();
  private config: ServiceConfig;
  
  private constructor(config: ServiceConfig = DEFAULT_CONFIG) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
    
    // Initialize with the default API client
    this.apiClients.set('default', defaultApiClient);
    
    // Auto-use mock adapter in development if configured
    if (this.config.useMockInDev && process.env.NODE_ENV === 'development') {
      this.config.adapterType = 'mock';
    }
  }
  
  /**
   * Get the ServiceFactory singleton instance
   */
  public static getInstance(config?: ServiceConfig): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory(config);
    } else if (config) {
      // Update config if provided
      ServiceFactory.instance.config = {
        ...ServiceFactory.instance.config,
        ...config
      };
    }
    
    return ServiceFactory.instance;
  }
  
  /**
   * Get an API client by name or create a new one
   */
  public getApiClient(baseUrl?: string): ApiClient {
    if (!baseUrl) {
      return this.apiClients.get('default')!;
    }
    
    if (!this.apiClients.has(baseUrl)) {
      this.apiClients.set(baseUrl, new ApiClient({
        baseUrl,
        defaultHeaders: {
          'Content-Type': 'application/json'
        }
      }));
    }
    
    return this.apiClients.get(baseUrl)!;
  }
  
  /**
   * Get the current service adapter based on configuration
   */
  public getAdapter(): BaseAdapter {
    const adapterType = this.config.adapterType;
    
    if (!this.adapters.has(adapterType)) {
      this.createAdapter(adapterType);
    }
    
    return this.adapters.get(adapterType)!;
  }
  
  /**
   * Switch to a different adapter type
   */
  public switchAdapter(adapterType: AdapterType): BaseAdapter {
    this.config.adapterType = adapterType;
    
    if (!this.adapters.has(adapterType)) {
      this.createAdapter(adapterType);
    }
    
    return this.getAdapter();
  }
  
  /**
   * Create a new adapter of the specified type
   */
  private createAdapter(adapterType: AdapterType): void {
    const apiClient = this.getApiClient(this.config.apiBaseUrl);
    
    switch (adapterType) {
      case 'rest':
        this.adapters.set(adapterType, new RestApiAdapter(apiClient));
        break;
      case 'mock':
        this.adapters.set(adapterType, new MockAdapter(apiClient));
        break;
      default:
        throw new Error(`Unknown adapter type: ${adapterType}`);
    }
  }
}

// Create and export a default service factory instance
export const serviceFactory = ServiceFactory.getInstance();

// Export a default adapter instance for convenience
export const defaultAdapter = serviceFactory.getAdapter(); 