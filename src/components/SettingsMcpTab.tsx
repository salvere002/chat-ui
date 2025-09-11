import React, { useEffect, useState } from 'react';
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

const JsonEditor: React.FC<{
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  isSidebar?: boolean;
}> = ({ value, onChange, error, isSidebar = false }) => {
  return (
    <div className="mb-4 last:mb-0 flex flex-col h-full">
      <label className="block mb-2 text-sm font-medium text-text-secondary">MCP JSON Configuration</label>
      <div className="flex-1 min-h-0 flex flex-col">
        <TextareaAutosize
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          minRows={isSidebar ? 12 : 6}
          maxRows={isSidebar ? 48 : 16}
          style={{ 
            transition: 'height 150ms ease'
          }}
          className="w-full p-3 bg-bg-secondary text-text-primary border border-border-primary rounded-md font-mono text-xs leading-5 resize-none transition-all duration-150 hover:border-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)] focus:bg-bg-primary"
        />
      </div>
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
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
  const { setEnabled, refreshServer } = useMcpStore(useShallow((state) => ({
    setEnabled: state.setEnabled,
    refreshServer: state.refreshServer,
  })));
  if (!item) return null;
  const isLoading = item.status === 'connecting';
  const hasError = item.status === 'error';
  
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
                className="px-2 py-1 bg-transparent text-text-secondary border border-border-primary rounded text-[10px] font-medium cursor-pointer transition-all duration-150 hover:bg-bg-primary hover:text-text-primary hover:border-text-tertiary disabled:opacity-60"
                onClick={() => refreshServer(item.key)}
                disabled={isLoading}
              >
                Refresh
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
  
  // Original layout for panel mode
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
            className="px-3 py-1.5 bg-transparent text-text-secondary border border-border-primary rounded-md text-xs font-medium cursor-pointer transition-all duration-150 hover:bg-bg-primary hover:text-text-primary hover:border-text-tertiary disabled:opacity-60"
            onClick={() => refreshServer(item.key)}
            disabled={isLoading}
          >
            Refresh
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
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftJson, setDraftJson] = useState<string>('');

  useEffect(() => {
    setError(null);
  }, [draftJson]);

  const handleSave = async () => {
    setError(null);
    try {
      await saveJson(draftJson);
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Invalid JSON');
    }
  };

  const handleRefreshAll = async () => {
    await refreshAll();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {!isEditing && (
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <button
            className="px-4 py-2 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary"
            onClick={() => {
              const initial = JSON.stringify(parsed ?? { mcpServers: {} }, null, 2);
              setDraftJson(initial);
              setIsEditing(true);
              setError(null);
            }}
          >
            Edit JSON
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
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-1 min-h-0">
            <JsonEditor value={draftJson} onChange={setDraftJson} error={error} isSidebar={isSidebar} />
          </div>
          <div className="flex items-center gap-2 mt-4 flex-shrink-0">
            <button
              className="px-4 py-2 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98]"
              onClick={handleSave}
            >
              Save & Refresh
            </button>
            <button
              className="px-4 py-2 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary"
              onClick={() => { setIsEditing(false); setError(null); }}
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
