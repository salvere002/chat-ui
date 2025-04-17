import React, { useState, useEffect } from 'react';
import { Agent } from '../types/chat';
import { configManager } from '../utils/config';
import { ChatService, AdapterType } from '../services/chatService';
import './Settings.css';

interface SettingsProps {
  onClose: () => void;
  selectedAgent: Agent;
  onAgentChange: (agent: Agent) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  onClose, 
  selectedAgent, 
  onAgentChange 
}) => {
  // Get current configuration
  const [backendUrl, setBackendUrl] = useState(configManager.getApiConfig().baseUrl);
  const [adapterType, setAdapterType] = useState<AdapterType>(
    configManager.getServicesConfig().adapterType as AdapterType
  );
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Update configuration in the config manager first
      configManager.updateApiConfig({
        baseUrl: backendUrl
      });
      
      configManager.updateServicesConfig({
        adapterType: adapterType,
        sessionEndpoint: backendUrl + '/session'
      });
      
      // Update ChatService with the new configuration
      ChatService.configure({
        adapterType,
        sessionEndpoint: backendUrl + '/session',
        baseUrl: backendUrl
      });
      
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
        
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="settings-section">
            <h3>Connection</h3>
            
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
          </div>
          
          <div className="settings-section">
            <h3>Response</h3>
            
            <div className="form-group">
              <label htmlFor="response-mode">Response Mode:</label>
              <select
                id="response-mode"
                value={selectedAgent}
                onChange={(e) => onAgentChange(e.target.value as Agent)}
              >
                <option value="stream">Stream (Real-time)</option>
                <option value="fetch">Fetch (Complete)</option>
              </select>
            </div>
          </div>
          
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