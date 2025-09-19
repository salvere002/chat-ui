export type MCPConnectMethod = 'streamable-http' | 'sse' | 'stream' | 'http';

export type MCPServerConfig = {
  name?: string;
  url: string;
  connect?: MCPConnectMethod;
};

export type MCPConfigPayload = {
  mcpServers: Record<string, MCPServerConfig>;
};

export type SaveMCPConfigOptions = {
  // If true, replace any existing server config on backend
  replace?: boolean;
};
