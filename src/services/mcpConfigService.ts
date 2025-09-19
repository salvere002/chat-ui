import { serviceFactory } from './serviceFactory';
import type { MCPConfigPayload, SaveMCPConfigOptions } from '../types/mcp';

/**
 * Push MCP config to the current backend via the current adapter.
 * Adapter implements its own endpoint conventions.
 */
export async function saveMcpConfigViaAdapter(config: MCPConfigPayload, opts?: SaveMCPConfigOptions): Promise<void> {
  const adapter = serviceFactory.getAdapter();
  await adapter.saveMcpConfig(config, opts);
}

/**
 * Pull MCP config from the backend via the current adapter.
 */
export async function getMcpConfigViaAdapter(): Promise<MCPConfigPayload> {
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
