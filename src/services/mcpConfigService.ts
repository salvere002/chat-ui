import { serviceFactory } from './serviceFactory';
import type { MCPConfigPayload } from '../types/mcp';
import useAuthStore from '../stores/authStore';

/**
 * Push MCP config to the current backend via the current adapter.
 * Adapter implements its own endpoint conventions.
 */
export async function saveMcpConfigViaAdapter(config: MCPConfigPayload): Promise<void> {
  await useAuthStore.getState().bootstrap();
  const adapter = serviceFactory.getAdapter();
  await adapter.saveMcpConfig(config);
}

/**
 * Pull MCP config from the backend via the current adapter.
 */
export async function getMcpConfigViaAdapter(): Promise<MCPConfigPayload> {
  await useAuthStore.getState().bootstrap();
  const adapter = serviceFactory.getAdapter();
  return adapter.getMcpConfig();
}

export function isMcpConfigSupported(): boolean {
  try {
    const adapter = serviceFactory.getAdapter();
    return !!adapter.capabilities?.mcpConfig;
  } catch {
    return false;
  }
}
