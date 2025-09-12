import React, { useEffect, useMemo, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import useMcpStore from '../stores/mcpStore';
import { useShallow } from 'zustand/react/shallow';

import { MCPToolInfo } from '../services/mcpService';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react';

const ToolBadge: React.FC<{ tool: MCPToolInfo; isSidebar?: boolean }> = ({ tool, isSidebar = false }) => {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    placement: isSidebar ? 'right' : 'top',
  });
  const hover = useHover(context, { move: false, delay: { open: 80, close: 80 } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  const hasContent = Boolean(tool.description || tool.title || tool.inputSchema);

  return (
    <>
      <span
        ref={refs.setReference}
        className="inline-flex items-center px-2 py-1 rounded-md text-[11px] bg-bg-primary border border-border-primary text-text-secondary cursor-help transition-colors duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary"
        {...getReferenceProps()}
      >
        {tool.name}
      </span>
      {open && hasContent && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className={`px-3 py-3 bg-bg-elevated text-text-primary text-xs rounded-md shadow-lg border border-border-primary w-max pointer-events-none z-tooltip ${isSidebar ? 'max-w-sm' : 'max-w-lg'}`}
            {...getFloatingProps()}
          >
            <div className="font-medium mb-2">{tool.title || tool.name}</div>
            {tool.description && (
              <div className="text-text-secondary leading-relaxed mb-3 whitespace-pre-wrap">
                {tool.description}
              </div>
            )}
            {tool.inputSchema?.properties && (
              <div className="border-t border-border-secondary pt-2">
                <div className="font-medium text-text-primary mb-2">Parameters:</div>
                <div className="space-y-1">
                  {Object.entries(tool.inputSchema.properties).map(([paramName, param]) => (
                    <div key={paramName} className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-text-primary">{paramName}</span>
                        <span className="text-text-tertiary">({param.type})</span>
                        {tool.inputSchema?.required?.includes(paramName) && (
                          <span className="text-red-400 text-[10px]">required</span>
                        )}
                      </div>
                      {param.description && (
                        <div className="text-text-secondary text-[11px] ml-0.5 leading-tight">
                          {param.description.length > 100 ? `${param.description.substring(0, 100)}...` : param.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

const JsonEditor: React.FC<{ value: string; onChange: (v: string) => void; isSidebar?: boolean }> = ({ value, onChange, isSidebar = false }) => {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [maxRows, setMaxRows] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!areaRef.current) return;
    const el = areaRef.current;
    const compute = () => {
      const h = el.clientHeight || 0;
      const lineHeight = 20; // matches leading-5
      const rows = Math.max(6, Math.floor(h / lineHeight) - 1);
      setMaxRows(rows);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const handleBlur = () => {
    try {
      const obj = JSON.parse(value);
      const pretty = JSON.stringify(obj, null, 2);
      if (pretty !== value) {
        onChange(pretty);
      }
    } catch (e: any) {
      // Ignore invalid JSON; keep as-is without errors
    }
  };
  return (
    <div className="mb-2 flex flex-col h-full">
      <label className="block mb-2 text-sm font-medium text-text-secondary">MCP JSON Configuration</label>
      {isSidebar ? (
        <div ref={areaRef} className="flex-1 min-h-0">
          <TextareaAutosize
            value={value}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
            onBlur={handleBlur}
            spellCheck={false}
            minRows={6}
            maxRows={maxRows ?? 24}
            style={{ transition: 'height 150ms ease' }}
            className="w-full p-3 bg-bg-secondary text-text-primary border border-border-primary rounded-md font-mono text-xs leading-5 resize-none transition-all duration-150 hover:border-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)] focus:bg-bg-primary"
          />
        </div>
      ) : (
        <div ref={areaRef} className="flex-1 min-h-0">
          <TextareaAutosize
            value={value}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
            onBlur={handleBlur}
            spellCheck={false}
            minRows={6}
            maxRows={maxRows ?? 12}
            style={{ transition: 'height 150ms ease' }}
            className="w-full p-3 bg-bg-secondary text-text-primary border border-border-primary rounded-md font-mono text-xs leading-5 resize-none transition-all duration-150 hover:border-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)] focus:bg-bg-primary"
          />
        </div>
      )}
    </div>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => {
  return (
    <div 
      className="relative inline-flex items-center cursor-pointer"
      onClick={() => onChange(!checked)}
    >
      <div className={`relative w-11 h-6 rounded-full transition-all duration-200 ${checked ? 'bg-accent-primary' : 'bg-bg-tertiary'}`}>
        <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 transition-transform duration-200 shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {}} // Handled by div onClick
        className="sr-only"
        aria-label={label}
      />
    </div>
  );
};

const ServerCard: React.FC<{ serverKey: string; isSidebar?: boolean }> = ({ serverKey, isSidebar = false }) => {
  const item = useMcpStore((state) => state.servers[serverKey]);
  const { setEnabled, refreshServer, parsed, saveJson } = useMcpStore(useShallow((state) => ({
    setEnabled: state.setEnabled,
    refreshServer: state.refreshServer,
    parsed: state.parsed,
    saveJson: state.saveJson,
  })));
  if (!item) return null;
  const isLoading = item.status === 'connecting';
  const hasError = item.status === 'error';
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!parsed) return;
    setDeleting(true);
    try {
      const next = { ...parsed, mcpServers: { ...(parsed.mcpServers || {}) } } as any;
      delete next.mcpServers[serverKey];
      await saveJson(JSON.stringify(next));
    } catch (e) {
      // noop; ignore
    } finally {
      setDeleting(false);
    }
  };

  if (isSidebar) {
    return (
      <div className="p-3 border border-border-secondary rounded-md bg-bg-secondary flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="m-0 text-sm font-semibold text-text-primary truncate">{item.key}</h4>
            <p className="m-0 text-xs text-text-tertiary truncate">{item.url}</p>
            {(item.name || item.version) && (
              <p className="m-0 text-xs text-text-secondary truncate">
                {item.name ?? 'Unknown'} {item.version ? `• v${item.version}` : ''}
              </p>
            )}
            {item.error && <p className="m-0 text-xs text-error truncate">{item.error}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap ${
                hasError
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : isLoading
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {hasError ? 'error' : isLoading ? 'connecting' : 'ok'}
              </span>
              {item.status === 'ok' && item.actualConnectMethod && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
                  {item.actualConnectMethod}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Toggle checked={item.enabled} onChange={(v) => setEnabled(item.key, v)} label="Enable" />
              <button
                className="p-1 bg-transparent text-text-tertiary border border-border-primary rounded-md cursor-pointer transition-all duration-150 hover:bg-bg-primary hover:text-accent-primary hover:border-text-tertiary disabled:opacity-60"
                onClick={() => refreshServer(item.key)}
                disabled={isLoading}
                title="Refresh this MCP server"
                aria-label="Refresh MCP server"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-3-6.7" />
                  <polyline points="21 3 21 9 15 9" />
                </svg>
              </button>
              <button
                className="p-1 bg-transparent text-text-tertiary border border-border-primary rounded-md cursor-pointer transition-all duration-150 hover:bg-bg-primary hover:text-error hover:border-text-tertiary disabled:opacity-60"
                onClick={handleDelete}
                disabled={deleting}
                title="Delete this MCP server"
                aria-label="Delete MCP server"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {Array.isArray(item.tools) && item.tools.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tools.map((t: MCPToolInfo) => (
              <ToolBadge key={t.name} tool={t} isSidebar={isSidebar} />
            ))}
          </div>
        )}
        {item.lastUpdated && (
          <p className="m-0 text-[10px] text-text-tertiary">Updated {new Date(item.lastUpdated).toLocaleTimeString()}</p>
        )}
      </div>
    );
  }
  return (
    <div className="p-4 border border-border-secondary rounded-md bg-bg-secondary flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="m-0 text-sm font-semibold text-text-primary truncate">{item.key}</h4>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              hasError
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : isLoading
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {hasError ? 'error' : isLoading ? 'connecting' : 'ok'}
            </span>
            {item.status === 'ok' && item.actualConnectMethod && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {item.actualConnectMethod}
              </span>
            )}
          </div>
          <p className="m-0 text-xs text-text-tertiary truncate">{item.url}</p>
          {(item.name || item.version) && (
            <p className="m-0 text-xs text-text-secondary">
              {item.name ?? 'Unknown'} {item.version ? `• v${item.version}` : ''}
            </p>
          )}
          {item.error && <p className="m-0 text-xs text-error">{item.error}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Toggle checked={item.enabled} onChange={(v) => setEnabled(item.key, v)} label="Enable" />
            <span>Enable</span>
          </div>
          <button
            className="p-1 bg-transparent text-text-tertiary border border-border-primary rounded-md cursor-pointer transition-all duration-150 hover:bg-bg-primary hover:text-accent-primary hover:border-text-tertiary disabled:opacity-60"
            onClick={() => refreshServer(item.key)}
            disabled={isLoading}
            title="Refresh this MCP server"
            aria-label="Refresh MCP server"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </button>
          <button
            className="p-1 bg-transparent text-text-tertiary border border-border-primary rounded-md cursor-pointer transition-all duration-150 hover:bg-bg-primary hover:text-error hover:border-text-tertiary disabled:opacity-60"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete this MCP server"
            aria-label="Delete MCP server"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>
      {Array.isArray(item.tools) && item.tools.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.tools.map((t: MCPToolInfo) => (
            <ToolBadge key={t.name} tool={t} isSidebar={isSidebar} />
          ))}
        </div>
      )}
      {item.lastUpdated && (
        <p className="m-0 text-[10px] text-text-tertiary">Updated {new Date(item.lastUpdated).toLocaleTimeString()}</p>
      )}
    </div>
  );
};

const SettingsMcpTab: React.FC<{ isSidebar?: boolean }> = ({ isSidebar = false }) => {
  const { parsed, saveJson, refreshAll } = useMcpStore(useShallow((state) => ({
    parsed: state.parsed,
    saveJson: state.saveJson,
    refreshAll: state.refreshAll,
  })));
  const serverKeys = useMcpStore(useShallow((state) => Object.keys(state.servers)));
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftJson, setDraftJson] = useState<string>('');
  const [addUrl, setAddUrl] = useState<string>('');
  const [addConnect, setAddConnect] = useState<string>(''); // '', 'streamable-http', 'sse'
  const [addBusy, setAddBusy] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addName, setAddName] = useState<string>('');

  useEffect(() => {
    // No error surfacing for JSON format per requirements
  }, [draftJson]);

  const draftServerKeys = useMemo(() => {
    try {
      if (draftJson && draftJson.trim()) {
        const obj = JSON.parse(draftJson);
        return Object.keys((obj && obj.mcpServers) || {});
      }
    } catch {}
    return Object.keys(parsed?.mcpServers || {});
  }, [draftJson, parsed]);

  const generateKey = (urlStr: string, existing: string[], preferredName?: string): string => {
    let base = 'mcp';
    if (preferredName && preferredName.trim()) {
      base = preferredName.trim().toLowerCase().replace(/\s+/g, '-');
    } else {
      try {
        const u = new URL(urlStr);
        const segs = u.pathname.split('/').filter(Boolean);
        const tail = segs[segs.length - 1] || '';
        base = [u.hostname, tail].filter(Boolean).join('-');
      } catch {}
    }
    if (!base) base = 'mcp';
    let candidate = base;
    let n = 1;
    while (existing.includes(candidate)) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    return candidate;
  };

  const handleSave = async () => {
    await saveJson(draftJson);
    setIsEditing(false);
  };


  const handleRefreshAll = async () => {
    await refreshAll();
  };

  const handleAdd = async () => {
    setAddError(null);
    if (!addUrl.trim()) {
      setAddError('URL is required');
      return;
    }
    try {
      // Validate URL
      // Throws if invalid
      // eslint-disable-next-line no-new
      new URL(addUrl.trim());
    } catch (e: any) {
      setAddError('Invalid URL');
      return;
    }
    // Modify the draft JSON content (not persisting yet)
    setAddBusy(true);
    try {
      let obj: any = {};
      if (draftJson && draftJson.trim()) {
        try {
          obj = JSON.parse(draftJson);
        } catch {
          // If draft is invalid, fall back to current parsed config instead of erroring
          obj = { mcpServers: { ...(parsed?.mcpServers || {}) } };
        }
      }
      if (!obj || typeof obj !== 'object') obj = {};
      if (!obj.mcpServers || typeof obj.mcpServers !== 'object') obj.mcpServers = {};

      const key = generateKey(addUrl.trim(), draftServerKeys, addName);
      obj.mcpServers[key] = {
        ...(addName.trim() ? { name: addName.trim() } : {}),
        url: addUrl.trim(),
        ...(addConnect ? { connect: addConnect as 'streamable-http' | 'sse' } : {}),
      };

      const pretty = JSON.stringify(obj, null, 2);
      setDraftJson(pretty);
      setAddUrl('');
      setAddName('');
      setAddConnect('');
    } catch (e: any) {
      setAddError(e?.message || 'Failed to add');
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {!isEditing && (
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <button
            className="px-4 py-2 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary"
            onClick={() => {
              const initial = JSON.stringify(parsed ?? { mcpServers: {} }, null, 2);
              setDraftJson(initial);
              setIsEditing(true);
            }}
          >
            Edit MCP
          </button>
          <button
            className="px-4 py-2 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary"
            onClick={handleRefreshAll}
            disabled={!parsed || serverKeys.length === 0}
          >
            Refresh All
          </button>
        </div>
      )}

      {isEditing && (
        <div className="mb-3 p-3 border border-border-secondary rounded-md bg-bg-secondary flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Name (optional)"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className={`w-full px-3 py-2 bg-bg-primary text-text-primary border border-border-primary rounded-md text-sm focus:outline-none focus:border-border-focus`}
            />
            <input
              type="text"
              placeholder="https://host.tld/mcp"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              className={`w-full px-3 py-2 bg-bg-primary text-text-primary border border-border-primary rounded-md text-sm focus:outline-none focus:border-border-focus`}
            />
            <div className="w-full flex flex-col">
              <label className="text-xs text-text-secondary mb-1">Transport</label>
              <select
                value={addConnect}
                onChange={(e) => setAddConnect(e.target.value)}
                className="px-3 py-2 bg-bg-primary text-text-primary border border-border-primary rounded-md text-sm focus:outline-none focus:border-border-focus"
                aria-label="Transport"
                title="Transport"
              >
                <option value="">Auto</option>
                <option value="streamable-http">streamable-http</option>
                <option value="sse">sse</option>
              </select>
            </div>
            <button
              className={`w-full px-4 py-2 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover disabled:opacity-60`}
              onClick={handleAdd}
              disabled={addBusy}
            >
              Add MCP
            </button>
          </div>
          {addError && <p className="m-0 text-xs text-error">{addError}</p>}
        </div>
      )}

      {isEditing && (
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-1 min-h-0">
            <JsonEditor value={draftJson} onChange={setDraftJson} isSidebar={isSidebar} />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-secondary flex-shrink-0">
            <button
              className="px-5 py-3 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98]"
              onClick={handleSave}
            >
              Save & Refresh
            </button>
            <button
              className="px-5 py-3 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary"
              onClick={() => { setIsEditing(false); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 gap-3 pr-2">
            {serverKeys.length === 0 ? (
              <p className="m-0 text-sm text-text-tertiary">No MCP servers defined. Add them to the JSON and save.</p>) : (
              serverKeys.map((k) => <ServerCard key={k} serverKey={k} isSidebar={isSidebar} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsMcpTab;
