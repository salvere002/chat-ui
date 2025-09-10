import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchMCPMetadata, MCPServerMetadata, MCPToolInfo } from '../services/mcpService';

export type MCPServerConfig = {
  url: string;
  connect?: 'streamable-http' | 'sse' | 'stream' | 'http';
};

export type MCPConfig = {
  mcpServers: Record<string, MCPServerConfig>;
};

export type MCPServerStatus = 'idle' | 'connecting' | 'ok' | 'error';

export type MCPServerItem = {
  key: string;
  url: string;
  enabled: boolean;
  status: MCPServerStatus;
  connectMethod?: 'streamable-http' | 'sse';
  actualConnectMethod?: 'streamable-http' | 'sse';
  name?: string;
  version?: string;
  tools?: MCPToolInfo[];
  error?: string;
  lastUpdated?: number;
};

type MCPStore = {
  rawJson: string;
  parsed?: MCPConfig;
  servers: Record<string, MCPServerItem>;

  setRawJson: (text: string) => void;
  resetRawToParsed: () => void;
  saveJson: () => Promise<void>;
  setEnabled: (key: string, enabled: boolean) => void;
  refreshServer: (key: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  hydrateFromParsed: (parsed: MCPConfig) => void;
};

const DEFAULT_JSON = '';

const normalizeConnect = (c?: string): 'streamable-http' | 'sse' | undefined => {
  if (!c) return undefined;
  const v = String(c).toLowerCase();
  if (v === 'sse') return 'sse';
  if (v === 'streamable-http') return 'streamable-http';
  return undefined;
};

const buildServers = (
  current: Record<string, MCPServerItem>,
  parsed: MCPConfig
): Record<string, MCPServerItem> => {
  const next: Record<string, MCPServerItem> = {};
  const entries = Object.entries(parsed.mcpServers ?? {});
  for (const [key, cfg] of entries) {
    const prev = current[key];
    next[key] = {
      key,
      url: cfg.url,
      enabled: prev?.enabled ?? true,
      status: prev?.status ?? 'idle',
      connectMethod: normalizeConnect(cfg.connect),
      name: prev?.name,
      version: prev?.version,
      tools: prev?.tools,
      error: undefined,
      lastUpdated: prev?.lastUpdated,
    };
  }
  return next;
};

const useMcpStore = create<MCPStore>()(
  persist(
    (set, get) => ({
      rawJson: DEFAULT_JSON,
      parsed: { mcpServers: {} },
      servers: {},

      setRawJson: (text) => set({ rawJson: text }),

      resetRawToParsed: () => {
        const { parsed } = get();
        const fallback = { mcpServers: {} } as MCPConfig;
        const json = JSON.stringify(parsed ?? fallback, null, 2);
        set({ rawJson: json });
      },

      hydrateFromParsed: (parsed) => {
        set((state) => ({
          parsed,
          servers: buildServers(state.servers, parsed),
        }));
      },

      saveJson: async () => {
        const { rawJson } = get();
        let parsed: MCPConfig | undefined;
        
        // Handle empty string or whitespace-only content
        if (!rawJson.trim()) {
          parsed = { mcpServers: {} } as MCPConfig;
        } else {
          try {
            const obj = JSON.parse(rawJson);
            // If JSON is valid but doesn't have mcpServers, create empty config
            if (!obj || typeof obj !== 'object' || !obj.mcpServers) {
              parsed = { mcpServers: {} } as MCPConfig;
            } else {
              parsed = { mcpServers: obj.mcpServers } as MCPConfig;
            }
          } catch (e: any) {
            // If JSON parsing fails, just create empty config (no error)
            parsed = { mcpServers: {} } as MCPConfig;
          }
        }

        set((state) => ({ parsed, servers: buildServers(state.servers, parsed!) }));

        await get().refreshAll();
      },

      setEnabled: (key, enabled) => {
        set((state) => ({
          servers: {
            ...state.servers,
            [key]: { ...state.servers[key], enabled },
          },
        }));
      },

      refreshServer: async (key) => {
        const state = get();
        const item = state.servers[key];
        if (!item) return;

        set(({ servers }) => ({
          servers: { ...servers, [key]: { ...servers[key], status: 'connecting', error: undefined } },
        }));

        try {
          const meta: MCPServerMetadata = await fetchMCPMetadata(item.url, item.connectMethod);
          set(({ servers }) => ({
            servers: {
              ...servers,
              [key]: {
                ...servers[key],
                name: meta.name,
                version: meta.version,
                tools: meta.tools,
                actualConnectMethod: meta.actualConnectMethod,
                status: 'ok',
                error: undefined,
                lastUpdated: Date.now(),
              },
            },
          }));
        } catch (e: any) {
          set(({ servers }) => ({
            servers: {
              ...servers,
              [key]: { ...servers[key], status: 'error', error: e?.message || 'Failed to fetch' },
            },
          }));
        }
      },

      refreshAll: async () => {
        const { servers } = get();
        const keys = Object.keys(servers);
        for (const k of keys) {
          const item = servers[k];
          if (item?.enabled) {
            // refresh enabled servers only
            // eslint-disable-next-line no-await-in-loop
            await get().refreshServer(k);
          }
        }
      },
    }),
    {
      name: 'mcp-store',
      partialize: (state) => ({ rawJson: state.rawJson, parsed: state.parsed, servers: state.servers }),
    }
  )
);

// Initialize servers map on first load based on parsed
if (typeof window !== 'undefined') {
  try {
    const st = useMcpStore.getState();
    if (st.parsed) {
      st.hydrateFromParsed(st.parsed);
    }
  } catch (e) {
    console.error(e);
  }
}

export default useMcpStore;
