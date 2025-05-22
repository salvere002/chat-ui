import { useEffect, useRef } from 'react';
import { useServiceConfigStore } from '../stores';
import { ChatService } from '../services/chatService';
import { ServiceConfig } from '../stores/serviceConfigStore';

/**
 * Custom hook to monitor and react to service configuration changes
 * 
 * @param onConfigChange - Optional callback when config changes
 * @returns The current service configuration
 */
export function useServiceConfig(onConfigChange?: (config: ServiceConfig) => void) {
  const { getCurrentConfig, currentAdapterType } = useServiceConfigStore();
  const currentConfig = getCurrentConfig();
  const previousConfigRef = useRef<ServiceConfig | undefined>(currentConfig);

  useEffect(() => {
    // Check if config has changed
    const hasChanged = previousConfigRef.current?.adapterType !== currentConfig?.adapterType ||
                      previousConfigRef.current?.baseUrl !== currentConfig?.baseUrl;

    if (currentConfig && hasChanged) {
      // Update ChatService with new configuration
      ChatService.configure({
        adapterType: currentConfig.adapterType,
        baseUrl: currentConfig.baseUrl,
        sessionEndpoint: currentConfig.sessionEndpoint
      });

      // Call the callback if provided
      if (onConfigChange) {
        onConfigChange(currentConfig);
      }

      // Update the ref
      previousConfigRef.current = currentConfig;
    }
  }, [currentConfig, currentAdapterType, onConfigChange]);

  return currentConfig;
}

/**
 * Hook to get specific service config values with automatic updates
 */
export function useServiceConfigValue<K extends keyof ServiceConfig>(key: K): ServiceConfig[K] | undefined {
  const currentConfig = useServiceConfig();
  return currentConfig?.[key];
}

/**
 * Hook to check if service is configured and ready
 */
export function useServiceReady(): boolean {
  const currentConfig = useServiceConfig();
  return !!(currentConfig?.baseUrl && currentConfig?.adapterType);
} 