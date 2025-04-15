import config from '../../config.json';

/**
 * Configuration manager for the application
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: typeof config;
  
  private constructor() {
    this.config = config;
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
}

// Export a singleton instance
export const configManager = ConfigManager.getInstance();

// Export direct config access for convenience
export const { frontend, backend } = config; 