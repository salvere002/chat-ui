import config from '../../config.json';

/**
 * Configuration manager for static application configuration
 * This manager only provides read-only access to static configurations.
 * For dynamic service configurations, use the serviceConfigStore.
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: typeof config;
  
  private constructor() {
    this.config = config;
  }

  /**
   * Get frontend meta configuration
   */
  public getFrontendMeta() {
    // Optional block; provide safe fallback
    return (this.config.frontend as any).meta || {};
  }

  /**
   * Get the client stage value used for outbound requests
   * Defaults to 'production' if not specified
   */
  public getClientStage(): string {
    const meta = this.getFrontendMeta();
    const stage = (meta as any).stage;
    return typeof stage === 'string' && stage.trim() ? stage : 'production';
  }

  /**
   * Get the singleton instance of ConfigManager
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get the entire configuration object
   */
  public getConfig(): typeof config {
    return this.config;
  }

  /**
   * Get frontend specific configuration
   */
  public getFrontendConfig() {
    return this.config.frontend;
  }

  /**
   * Get API configuration
   */
  public getApiConfig() {
    return this.config.frontend.api;
  }

  /**
   * Get services configuration
   */
  public getServicesConfig() {
    return this.config.frontend.services;
  }

  /**
   * Get UI configuration
   */
  public getUiConfig() {
    return this.config.frontend.ui;
  }

  /**
   * Get UI defaults block (with safe fallbacks)
   */
  public getUiDefaults() {
    const ui = this.getUiConfig() as any;
    return ui?.defaults || {};
  }

  /**
   * Default response mode: 'stream' | 'fetch'
   */
  public getDefaultResponseMode(): 'stream' | 'fetch' {
    const defaults = this.getUiDefaults();
    const val = defaults.responseMode;
    return val === 'fetch' ? 'fetch' : 'stream';
  }

  /**
   * Default toggle for showing suggestions
   */
  public getDefaultShowSuggestions(): boolean {
    const defaults = this.getUiDefaults();
    const val = defaults.showSuggestions;
    return typeof val === 'boolean' ? val : true;
  }

  /**
   * Default background texture enabled (boolean)
   */
  public getDefaultBackgroundTextureEnabled(): boolean {
    const defaults = this.getUiDefaults();
    const val = (defaults as any).backgroundTexture;
    return typeof val === 'boolean' ? val : false;
  }

  /**
   * Get development configuration
   */
  public getDevConfig() {
    return this.config.frontend.dev;
  }

  /**
   * Get auth configuration
   */
  public getAuthConfig() {
    const auth: any = (this.config.frontend as any).auth || {};
    return {
      enabled: Boolean(auth.enabled),
      baseUrl: auth.baseUrl || this.getApiConfig().baseUrl,
    } as { enabled: boolean; baseUrl: string };
  }

  /**
   * Get default suggestions for chat interface
   */
  public getDefaultSuggestions(): string[] {
    return this.config.frontend.ui.defaultSuggestions || [
      "What can you help me with?",
      "Tell me a fun fact",
      "How do I learn programming?"
    ];
  }
} 

// Export a singleton instance
export const configManager = ConfigManager.getInstance();

// Export direct config access for convenience
export const { frontend, backend } = config; 
