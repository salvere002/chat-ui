import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useServiceConfigStore, useMcpStore } from '../stores';
import { getMcpConfigViaAdapter, isMcpConfigSupported } from '../services/mcpConfigService';
import { AgentService } from '../services/agentService';
import { ModelService } from '../services/modelService';

/**
 * Hook that bootstraps services when the adapter configuration changes.
 * Handles MCP config sync and Agent/Model service initialization.
 */
export function useServiceBootstrap(): void {
  const { type: currentAdapterType, url: currentAdapterBaseUrl } = useServiceConfigStore(
    useShallow((s) => ({
      type: s.currentAdapterType,
      url: s.configs[s.currentAdapterType].baseUrl,
    }))
  );

  // Bootstrap + re-sync: pull MCP config whenever adapter changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!isMcpConfigSupported()) return;
        const remote = await getMcpConfigViaAdapter();
        if (cancelled) return;
        if (remote && typeof remote === 'object') {
          await useMcpStore.getState().setJson(JSON.stringify(remote));
        }
      } catch {
        // Ignore adapters/backends that don't support MCP sync or any fetch errors
        // Local persisted config remains in effect
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentAdapterType, currentAdapterBaseUrl]);

  // Bootstrap agents/models whenever adapter changes
  useEffect(() => {
    void AgentService.bootstrap();
    void ModelService.bootstrap();
  }, [currentAdapterType, currentAdapterBaseUrl]);
}

export default useServiceBootstrap;
