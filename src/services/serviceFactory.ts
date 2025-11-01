import { ApiClient, defaultApiClient } from './apiClient';
import { BaseAdapter } from './adapters/BaseAdapter';
import { RestApiAdapter } from './adapters/RestApiAdapter';
import { MockAdapter } from './adapters/MockAdapter';
import { SessionAdapter } from './adapters/SessionAdapter';
import { configManager } from '../utils/config';

/**
 * Service adapter types
 */
export type AdapterType = 'rest' | 'mock' | 'session';

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
  adapterType: configManager.getServicesConfig().adapterType as AdapterType,
  apiBaseUrl: configManager.getApiConfig().baseUrl,
  useMockInDev: configManager.getServicesConfig().useMockInDev
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
      // If no baseUrl is provided, use the default client
      return this.apiClients.get('default')!;
    }
    
    // For non-default URLs, check if we already have a client for this URL
    const clientKey = baseUrl;
    if (!this.apiClients.has(clientKey)) {
      // Create a new client if we don't have one for this URL
      this.apiClients.set(clientKey, new ApiClient({
        baseUrl,
        defaultHeaders: {
          'Content-Type': 'application/json'
        },
        timeout: configManager.getApiConfig().timeout,
        useProxy: configManager.getApiConfig().useProxy !== false,
      }));
    }
    
    return this.apiClients.get(clientKey)!;
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
  public switchAdapter(adapterType: AdapterType, apiBaseUrl?: string): BaseAdapter {
    // Update configuration
    this.config.adapterType = adapterType;

    if (apiBaseUrl) {
      this.config.apiBaseUrl = apiBaseUrl;
    }

    // Clear all existing adapters to avoid multiple active adapters
    this.adapters.clear();

    // Drop existing ApiClient for this baseUrl to avoid interceptor leakage
    const clientKey = this.config.apiBaseUrl;
    if (clientKey && this.apiClients.has(clientKey)) {
      this.apiClients.delete(clientKey);
    }

    // Create and return the fresh adapter
    this.createAdapter(adapterType);
    return this.getAdapter();
  }
  
  /**
   * Create a new adapter of the specified type
   */
  private createAdapter(adapterType: AdapterType): void {
    // Always get the latest API client with the current configuration
    const apiClient = this.getApiClient(this.config.apiBaseUrl);
    
    switch (adapterType) {
      case 'rest':
        this.adapters.set(adapterType, new RestApiAdapter(apiClient));
        break;
      case 'mock':
        this.adapters.set(adapterType, new MockAdapter(apiClient));
        break;
      case 'session':
        this.adapters.set(adapterType, new SessionAdapter(apiClient));
        break;
      default:
        throw new Error(`Unknown adapter type: ${adapterType}`);
    }
  }
  
  /**
   * Update the default API client with a new base URL
   */
  public updateDefaultApiClient(baseUrl: string): ApiClient {
    // Update the config
    this.config.apiBaseUrl = baseUrl;
    
    const apiClient = new ApiClient({
      baseUrl,
      defaultHeaders: {
        'Content-Type': 'application/json'
      },
      timeout: configManager.getApiConfig().timeout,
      useProxy: configManager.getApiConfig().useProxy !== false,
    });
    
    this.apiClients.set('default', apiClient);
    
    // Clear existing adapters to force recreation on next request
    this.adapters.clear();
    
    return apiClient;
  }
}

export const serviceFactory = ServiceFactory.getInstance();
