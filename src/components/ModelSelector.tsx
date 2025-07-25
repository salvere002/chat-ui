import React, { useState, useRef, useEffect } from 'react';
import { FaCog, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useModelStore } from '../stores';

const ModelSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const { models, selectedModelId, setSelectedModel, getSelectedModel } = useModelStore();
  const selectedModel = getSelectedModel();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      // Find the input area container (the div with bg-bg-secondary)
      const inputArea = buttonRef.current.closest('div[class*="bg-bg-secondary"]');
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
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        ref={buttonRef}
        className="flex items-center justify-between px-2 py-1 bg-bg-primary border border-border-secondary rounded-full cursor-pointer transition-all duration-200 text-xs w-[110px] gap-0.5 min-h-[24px] hover:bg-bg-secondary hover:border-border-hover focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_2px_var(--color-accent-light)]"
        onClick={toggleDropdown}
        type="button"
      >
        <span className="font-medium text-text-primary whitespace-nowrap overflow-hidden text-ellipsis text-xs flex-1 min-w-0 leading-none">
          {selectedModel?.name || (models.filter(model => model.isActive !== false).length > 0 ? 'No Model' : 'No Models')}
        </span>
        {isOpen ? <FaChevronUp size={7} /> : <FaChevronDown size={7} />}
      </button>

      {isOpen && (
        <div 
          className="fixed min-w-[180px] bg-bg-primary border border-border-secondary rounded-lg shadow-lg z-[9999] max-h-[300px] overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            transform: 'translate(-10%, -110%)'
          }}
        >
          {models.filter(model => model.isActive !== false).map((model, index, array) => (
            <div
              key={model.id}
              className={`flex items-center p-2 cursor-pointer transition-colors duration-200 gap-2 ${
                selectedModelId === model.id 
                  ? 'bg-accent-light text-accent-primary' 
                  : 'hover:bg-bg-secondary'
              } ${
                index === 0 ? 'rounded-t-lg' : ''
              } ${
                index === array.length - 1 ? 'rounded-b-lg' : ''
              }`}
              onClick={() => handleModelSelect(model.id)}
            >
              <div className="w-4 h-4 rounded-full bg-accent-primary flex items-center justify-center text-text-inverse text-xs overflow-hidden flex-shrink-0">
                <FaCog size={8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium mb-0.5 text-xs">{model.name}</div>
                {model.description && (
                  <div className={`text-xs leading-snug ${
                    selectedModelId === model.id 
                      ? 'text-accent-primary opacity-80' 
                      : 'text-text-secondary'
                  }`}>
                    {model.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;