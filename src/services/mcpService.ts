export type MCPToolParameter = {
  type: string;
  description?: string;
  default?: any;
};

export type MCPToolInfo = {
  name: string;
  description?: string;
  title?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, MCPToolParameter>;
    required?: string[];
  };
};

export type MCPServerMetadata = {
  name?: string;
  version?: string;
  tools: MCPToolInfo[];
  actualConnectMethod?: ConnectMethod;
};

async function loadSdk(): Promise<any> {
  try {
    const sdk = await import('@modelcontextprotocol/sdk/client/index.js');
    return sdk as any;
  } catch (e) {
    throw new Error('MCP SDK not installed. Run: npm i @modelcontextprotocol/sdk');
  }
}

export type ConnectMethod = 'streamable-http' | 'sse' | undefined;

import { configManager } from '../utils/config';

// Build the effective base URL for MCP HTTP/SSE
// When proxy is enabled, route via /api/proxy/{ENCODED_BASE}
// When disabled, use the target base URL directly
function toEffectiveBase(baseUrl: string): URL {
  const useProxy = configManager.getApiConfig().useProxy !== false;
  if (useProxy) {
    return new URL(`/api/proxy/${encodeURIComponent(baseUrl)}`, window.location.origin);
  }
  return new URL(baseUrl);
}

export async function fetchMCPMetadata(url: string, method?: ConnectMethod): Promise<MCPServerMetadata> {
  const sdk = await loadSdk();

  // Use Streamable HTTP transport first; fall back to SSE per SDK README
  try {
    const { Client } = sdk as any;
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js');

    // Route via proxy when enabled; otherwise direct
    const target = toEffectiveBase(url);

    const connectAndFetch = async (
      connectMethod: Exclude<ConnectMethod, undefined>
    ): Promise<MCPServerMetadata> => {
      const client = new (Client as any)({ name: 'chat-ui', version: '1.0.0' });
      try {
        const transport =
          connectMethod === 'streamable-http'
            ? new (StreamableHTTPClientTransport as any)(target)
            : new (SSEClientTransport as any)(target);

        await client.connect(transport);

        let name: string | undefined;
        let version: string | undefined;
        try {
          const info = (await (client.getServerInfo?.() ?? client.server?.getInfo?.())) ?? {};
          name = info.name ?? info.server?.name;
          version = info.version ?? info.server?.version;
        } catch {}

        let tools: MCPToolInfo[] = [];
        try {
          const resp = await (client.listTools?.() ?? client.tools?.list?.());
          const raw = Array.isArray(resp?.tools) ? resp.tools : Array.isArray(resp) ? resp : [];
          tools = raw.map((t: any) => ({
            name: t.name,
            description: t.description,
            title: t.title,
            inputSchema: t.inputSchema
              ? {
                  type: t.inputSchema.type,
                  properties: t.inputSchema.properties,
                  required: t.inputSchema.required,
                }
              : undefined,
          }));
        } catch {}

        return { name, version, tools, actualConnectMethod: connectMethod };
      } finally {
        // Always close on success or failure: the SSE transport uses EventSource which can keep
        // reconnecting after an auth/redirect failure unless explicitly closed.
        try {
          await client.close?.();
        } catch {}
      }
    };

    if (method === 'streamable-http') {
      return await connectAndFetch('streamable-http');
    } else if (method === 'sse') {
      return await connectAndFetch('sse');
    } else {
      try {
        return await connectAndFetch('streamable-http');
      } catch {
        return await connectAndFetch('sse');
      }
    }
  } catch (err: any) {
    // Provide a clearer error up the chain
    const message = typeof err?.message === 'string' ? err.message : 'Failed to fetch MCP metadata';
    throw new Error(message);
  }
}
