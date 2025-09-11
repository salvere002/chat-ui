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

// Build a same-origin, proxy-routed base URL so MCP HTTP/SSE
// requests go through our project proxy: /api/proxy/{ENCODED_BASE}/...
function toProxiedBase(baseUrl: string): URL {
  // Use window.location.origin to create an absolute URL
  // Example result: https://app-host/api/proxy/https%3A%2F%2Fremote.host
  return new URL(`/api/proxy/${encodeURIComponent(baseUrl)}`, window.location.origin);
}

export async function fetchMCPMetadata(url: string, method?: ConnectMethod): Promise<MCPServerMetadata> {
  const sdk = await loadSdk();

  // Use Streamable HTTP transport first; fall back to SSE per SDK README
  let client: any | undefined;
  let actualConnectMethod: ConnectMethod;
  try {
    const { Client } = sdk as any;
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js');

    client = new Client({ name: 'chat-ui', version: '1.0.0' });
    // IMPORTANT: route via our proxy to avoid CORS/cookie domain issues
    const target = toProxiedBase(url);

    const tryStream = async () => {
      const transport = new (StreamableHTTPClientTransport as any)(target);
      await client.connect(transport);
      actualConnectMethod = 'streamable-http';
    };
    const trySse = async () => {
      const sseTransport = new (SSEClientTransport as any)(target);
      await client.connect(sseTransport);
      actualConnectMethod = 'sse';
    };

    if (method === 'streamable-http') {
      await tryStream();
    } else if (method === 'sse') {
      await trySse();
    } else {
      try {
        await tryStream();
      } catch {
        await trySse();
      }
    }
    // Connected if no error thrown by transports

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
        inputSchema: t.inputSchema ? {
          type: t.inputSchema.type,
          properties: t.inputSchema.properties,
          required: t.inputSchema.required
        } : undefined
      }));
    } catch {}

    // No manual HTTP fallback; only rely on SDK client per requirements.

    try {
      await client.close?.();
    } catch {}

    return { name, version, tools, actualConnectMethod };
  } catch (err: any) {
    // Provide a clearer error up the chain
    const message = typeof err?.message === 'string' ? err.message : 'Failed to fetch MCP metadata';
    throw new Error(message);
  }
}
