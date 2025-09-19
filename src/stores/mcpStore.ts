import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchMCPMetadata, MCPServerMetadata, MCPToolInfo } from '../services/mcpService';

export type MCPServerConfig = {
  name?: string;
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
  parsed?: MCPConfig;
  servers: Record<string, MCPServerItem>;

  saveJson: (rawJson: string) => Promise<void>;
  // Convenience alias for saving JSON config
  setJson: (rawJson: string) => Promise<void>;
  // Get current config as pretty JSON
  getJson: () => string;
  setEnabled: (key: string, enabled: boolean) => void;
  refreshServer: (key: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  hydrateFromParsed: (parsed: MCPConfig) => void;
};

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
      actualConnectMethod: prev?.actualConnectMethod,
      name: prev?.name ?? cfg.name,
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
      parsed: { mcpServers: {} },
      servers: {},

      hydrateFromParsed: (parsed) => {
        set((state) => ({
          parsed,
          servers: buildServers(state.servers, parsed),
        }));
      },

      // Pretty-print current parsed config
      getJson: () => {
        try {
          const current = get().parsed ?? { mcpServers: {} };
          return JSON.stringify(current, null, 2);
        } catch {
          return JSON.stringify({ mcpServers: {} }, null, 2);
        }
      },

      // Alias for saveJson for clearer semantics
      setJson: async (rawJson: string) => {
        await get().saveJson(rawJson);
      },

      saveJson: async (rawJson: string) => {
        let parsed: MCPConfig | undefined;
        
        // Handle empty string or whitespace-only content (treat as empty config)
        if (!rawJson.trim()) {
          parsed = { mcpServers: {} } as MCPConfig;
        } else {
          try {
            const obj = JSON.parse(rawJson);
            if (!obj || typeof obj !== 'object') {
              // Ignore invalid structures; keep previous config
              return;
            }
            parsed = { mcpServers: obj.mcpServers ?? {} } as MCPConfig;
          } catch {
            // If JSON parsing fails, ignore and keep previous config (no error)
            return;
          }
        }

        // Update state immediately
        set((state) => ({ parsed, servers: buildServers(state.servers, parsed!) }));

        // Kick off refresh asynchronously so UI is not blocked
        Promise.resolve().then(() => get().refreshAll()).catch((err) => {
          // eslint-disable-next-line no-console
          console.error('Refresh after save failed:', err);
        });
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
        const tasks: Promise<void>[] = [];
        for (const k of keys) {
          const item = servers[k];
          if (item?.enabled) {
            tasks.push(get().refreshServer(k));
          }
        }
        await Promise.allSettled(tasks);
      },
    }),
    {
      name: 'mcp-store',
      partialize: (state) => ({ parsed: state.parsed, servers: state.servers }),
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
