import React, { useState, useEffect } from 'react';
import { ResponseMode } from '../types/chat';
import { useServiceConfigStore } from '../stores';
import { AdapterType } from '../services/chatService';
import './Settings.css';

interface SettingsProps {
  onClose: () => void;
  selectedResponseMode: ResponseMode;
  onResponseModeChange: (responseMode: ResponseMode) => void;
}

type SettingsTab = 'general';

const Settings: React.FC<SettingsProps> = ({ 
  onClose, 
  selectedResponseMode, 
  onResponseModeChange 
}) => {
  const {
    currentAdapterType,
    getCurrentConfig,
    updateConfig,
    setCurrentAdapterType
  } = useServiceConfigStore();

  // Get current configuration
  const currentConfig = getCurrentConfig();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  
  // Form state
  const [backendUrl, setBackendUrl] = useState(currentConfig.baseUrl);
  const [adapterType, setAdapterType] = useState<AdapterType>(currentAdapterType);

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
        baseUrl: backendUrl,
        sessionEndpoint: backendUrl + '/session'
      });
      
      // Set as current adapter type (this will automatically configure ChatService)
      setCurrentAdapterType(adapterType);
      
      // Close settings
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };
  
  // Handle click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div className="settings-overlay" onClick={handleOverlayClick}>
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button 
            className="close-button" 
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="settings-form">
          {/* General Tab */}
          {activeTab === 'general' && (
            <>
              <div className="settings-section">
                <h3>Connection</h3>
                
                <div className="form-group">
                  <label htmlFor="adapter-type">Connection Method:</label>
                  <select
                    id="adapter-type"
                    value={adapterType}
                    onChange={(e) => setAdapterType(e.target.value as AdapterType)}
                  >
                    <option value="rest">REST API</option>
                    <option value="session">Session Based</option>
                    <option value="mock">Mock (Testing)</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="backend-url">Backend URL:</label>
                  <input
                    id="backend-url"
                    type="text"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    placeholder="http://localhost:5001/api"
                  />
                </div>
              </div>
              
              <div className="settings-section">
                <h3>Response</h3>
                
                <div className="form-group">
                  <label htmlFor="response-mode">Response Mode:</label>
                  <select
                    id="response-mode"
                    value={selectedResponseMode}
                    onChange={(e) => onResponseModeChange(e.target.value as ResponseMode)}
                  >
                    <option value="stream">Stream (Real-time)</option>
                    <option value="fetch">Fetch (Complete)</option>
                  </select>
                </div>
              </div>
            </>
          )}
          
          <div className="settings-actions">
            <button type="submit" className="save-button">Save Changes</button>
            <button type="button" className="cancel-button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings; 