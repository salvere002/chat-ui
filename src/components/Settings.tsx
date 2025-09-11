import React, { useState, useEffect, useRef } from 'react';
import { ResponseMode } from '../types/chat';
import { useServiceConfigStore } from '../stores';
import { AdapterType } from '../services/chatService';
import SettingsMcpTab from './SettingsMcpTab';

interface SettingsProps {
  onClose: () => void;
  selectedResponseMode: ResponseMode;
  onResponseModeChange: (responseMode: ResponseMode) => void;
}


const Settings: React.FC<SettingsProps> = ({ 
  onClose, 
  selectedResponseMode, 
  onResponseModeChange 
}) => {
  const {
    currentAdapterType,
    getCurrentConfig,
    updateConfig,
    setCurrentAdapterType,
    resetToDefaults
  } = useServiceConfigStore();

  // Get current configuration
  const currentConfig = getCurrentConfig();
  
  
  // Form state
  const [backendUrl, setBackendUrl] = useState(currentConfig.baseUrl);
  const [adapterType, setAdapterType] = useState<AdapterType>(currentAdapterType);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Update form when adapter type changes
  useEffect(() => {
    const config = useServiceConfigStore.getState().getConfig(adapterType);
    setBackendUrl(config.baseUrl);
  }, [adapterType]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Update configuration for the current adapter type
      updateConfig(adapterType, {
        baseUrl: backendUrl
      });
      
      // Set as current adapter type (this will automatically configure ChatService)
      setCurrentAdapterType(adapterType);
      
      // Close settings
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };
  
  // Handle reset to defaults
  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    resetToDefaults();
    const state = useServiceConfigStore.getState();
    const newCurrentConfig = state.getCurrentConfig();
    setAdapterType(state.currentAdapterType);
    setBackendUrl(newCurrentConfig.baseUrl);
    setShowResetConfirm(false);
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
  };

  
  const [activeTab, setActiveTab] = useState<'general' | 'mcp'>('general');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  useEffect(() => {
    // Lock the modal height based on the initial General tab height
    if (activeTab === 'general' && !lockedHeight && containerRef.current) {
      setLockedHeight(containerRef.current.offsetHeight);
    }
  }, [activeTab, lockedHeight]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-tooltip p-4 animate-fade-in">
      <div
        ref={containerRef}
        className="bg-bg-primary rounded-lg w-full max-w-[760px] max-h-[85vh] overflow-hidden shadow-lg flex flex-col animate-slide-up"
        style={lockedHeight ? { height: lockedHeight } : undefined}
      >
        <div className="flex items-center justify-between px-6 py-5 bg-bg-secondary border-b border-border-primary">
          <h2 className="text-xl font-semibold text-text-primary m-0">Settings</h2>
          <button 
            className="flex items-center justify-center w-8 h-8 p-0 bg-transparent border-none rounded-md text-text-tertiary text-2xl cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:text-text-primary hover:rotate-90" 
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-4 bg-bg-primary border-b border-border-secondary">
            <div className="flex w-full items-center p-1 rounded-md bg-bg-secondary border border-border-primary">
              <button
                className={`flex-1 px-3 py-2 rounded-md text-sm text-center ${
                  activeTab === 'general'
                    ? 'bg-bg-primary text-text-primary border border-border-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setActiveTab('general')}
              >
                General
              </button>
              <button
                className={`flex-1 px-3 py-2 rounded-md text-sm text-center ${
                  activeTab === 'mcp'
                    ? 'bg-bg-primary text-text-primary border border-border-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setActiveTab('mcp')}
              >
                MCP Tools
              </button>
            </div>
          </div>

          {activeTab === 'general' && (
            <form onSubmit={handleSubmit} className="p-6 bg-bg-primary">
              <div className="mb-6 last:mb-0">
                <h3 className="text-base font-semibold text-text-primary m-0 mb-4 pb-3 border-b border-border-secondary">Connection</h3>
                <div className="mb-4 last:mb-0">
                  <label htmlFor="adapter-type" className="block mb-2 text-sm font-medium text-text-secondary">Connection Method:</label>
                  <select
                    id="adapter-type"
                    value={adapterType}
                    onChange={(e) => setAdapterType(e.target.value as AdapterType)}
                    className="w-full p-3 bg-bg-secondary text-text-primary border border-border-primary rounded-md font-sans text-sm transition-all duration-150 appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_12px_center] bg-[length:16px] pr-7 hover:border-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)] focus:bg-bg-primary"
                  >
                    <option value="rest">REST API</option>
                    <option value="session">Session Based</option>
                    <option value="mock">Mock (Testing)</option>
                  </select>
                </div>
                <div className="mb-4 last:mb-0">
                  <label htmlFor="backend-url" className="block mb-2 text-sm font-medium text-text-secondary">Backend URL:</label>
                  <input
                    id="backend-url"
                    type="text"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    placeholder="http://localhost:5001/api"
                    className="w-full p-3 bg-bg-secondary text-text-primary border border-border-primary rounded-md font-sans text-sm transition-all duration-150 hover:border-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)] focus:bg-bg-primary"
                  />
                </div>
              </div>
              <div className="mb-6 last:mb-0">
                <h3 className="text-base font-semibold text-text-primary m-0 mb-4 pb-3 border-b border-border-secondary">Response</h3>
                <div className="mb-4 last:mb-0">
                  <label htmlFor="response-mode" className="block mb-2 text-sm font-medium text-text-secondary">Response Mode:</label>
                  <select
                    id="response-mode"
                    value={selectedResponseMode}
                    onChange={(e) => onResponseModeChange(e.target.value as ResponseMode)}
                    className="w-full p-3 bg-bg-secondary text-text-primary border border-border-primary rounded-md font-sans text-sm transition-all duration-150 appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_12px_center] bg-[length:16px] pr-7 hover:border-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)] focus:bg-bg-primary"
                  >
                    <option value="stream">Stream (Real-time)</option>
                    <option value="fetch">Fetch (Complete)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-secondary">
                <button type="submit" className="px-5 py-3 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98]">Save Changes</button>
                <button type="button" className="px-5 py-3 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary" onClick={handleReset}>Reset to Defaults</button>
              </div>
            </form>
          )}

          {activeTab === 'mcp' && (
            <div className="p-6 bg-bg-primary">
              <SettingsMcpTab />
            </div>
          )}
        </div>
      </div>
      
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-modal p-4 animate-fade-in">
          <div className="bg-bg-primary rounded-lg w-full max-w-md p-6 shadow-lg animate-slide-up">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Reset to Default Settings?</h3>
            <p className="text-text-secondary mb-6 text-sm leading-relaxed">
              This will reset all connection settings to their default values. Any custom configurations will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                className="px-4 py-2 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary"
                onClick={cancelReset}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-red-500 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-red-600 hover:-translate-y-px hover:shadow-sm active:scale-[0.98]"
                onClick={confirmReset}
              >
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings; 
