import React, { useState, useRef, useEffect } from 'react';
import { FaUser, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useAgentStore } from '../stores';
import './AgentSelector.css';

const AgentSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const { agents, selectedAgentId, setSelectedAgent, getSelectedAgent } = useAgentStore();
  const selectedAgent = getSelectedAgent();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      // Find the message input area (parent container)
      const inputArea = buttonRef.current.closest('.message-input-area');
      if (inputArea) {
        const inputRect = inputArea.getBoundingClientRect();
        const buttonRect = buttonRef.current.getBoundingClientRect();
        
        setDropdownPosition({
          top: inputRect.top - 8, // Position just above the input area
          left: buttonRect.left
        });
      }
    }
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="agent-selector" ref={dropdownRef}>
      <button
        ref={buttonRef}
        className="agent-selector-button"
        onClick={toggleDropdown}
        type="button"
      >
        <span className="agent-name">
          {selectedAgent?.name || 'Select Agent'}
        </span>
        {isOpen ? <FaChevronUp size={7} /> : <FaChevronDown size={7} />}
      </button>

      {isOpen && (
        <div 
          className="agent-dropdown"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left
          }}
        >
          {agents.filter(agent => agent.isActive !== false).map((agent) => (
            <div
              key={agent.id}
              className={`agent-option ${selectedAgentId === agent.id ? 'selected' : ''}`}
              onClick={() => handleAgentSelect(agent.id)}
            >
              <div className="agent-avatar">
                {agent.avatar ? (
                  <img src={agent.avatar} alt={agent.name} />
                ) : (
                  <FaUser />
                )}
              </div>
              <div className="agent-details">
                <div className="agent-name">{agent.name}</div>
                {agent.description && (
                  <div className="agent-description">{agent.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentSelector;