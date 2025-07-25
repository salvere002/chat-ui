import { create } from 'zustand';
import { ModelStore } from '../types/store';
import { Model } from '../types/chat';

// Helper function to ensure model has all required fields for UI compatibility
const sanitizeModel = (model: Partial<Model>): Model => {
  if (!model.id || !model.name) {
    throw new Error('Model must have id and name');
  }
  
  return {
    isActive: true,
    description: '',
    provider: 'openai',
    contextLength: 4096,
    inputCost: 0,
    outputCost: 0,
    ...model,
    id: model.id,
    name: model.name
  } as Model;
};

// Default models data
const defaultModels: Model[] = [
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Most capable GPT-4 model with improved instruction following',
    provider: 'openai',
    contextLength: 128000,
    inputCost: 0.01,
    outputCost: 0.03,
    isActive: true
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'High-intelligence flagship model for complex tasks',
    provider: 'openai',
    contextLength: 8192,
    inputCost: 0.03,
    outputCost: 0.06,
    isActive: true
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast, cost-efficient model for simpler tasks',
    provider: 'openai',
    contextLength: 16385,
    inputCost: 0.0015,
    outputCost: 0.002,
    isActive: true
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    description: 'Most powerful model for highly complex tasks',
    provider: 'anthropic',
    contextLength: 200000,
    inputCost: 0.015,
    outputCost: 0.075,
    isActive: true
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    description: 'Balanced performance and speed for everyday tasks',
    provider: 'anthropic',
    contextLength: 200000,
    inputCost: 0.003,
    outputCost: 0.015,
    isActive: true
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: 'Fast and cost-effective for simple tasks',
    provider: 'anthropic',
    contextLength: 200000,
    inputCost: 0.00025,
    outputCost: 0.00125,
    isActive: true
  }
];

// Create the model store with Zustand
const useModelStore = create<ModelStore>((set, get) => ({
  // State
  models: defaultModels,
  selectedModelId: 'gpt-4-turbo', // Default to GPT-4 Turbo

  // Actions
  setModels: (models: Model[]) => {
    const sanitizedModels = models.map(model => sanitizeModel(model));
    set({ models: sanitizedModels });
  },

  addModel: (model: Model) => {
    const sanitizedModel = sanitizeModel(model);
    set((state) => ({
      models: [...state.models, sanitizedModel]
    }));
  },

  updateModel: (modelId: string, updates: Partial<Model>) => {
    set((state) => ({
      models: state.models.map(model => {
        if (model.id === modelId) {
          const updatedModel = { ...model, ...updates };
          // Ensure the updated model still has required fields
          return sanitizeModel(updatedModel);
        }
        return model;
      })
    }));
  },

  removeModel: (modelId: string) => {
    set((state) => {
      const newModels = state.models.filter(model => model.id !== modelId);
      const newSelectedModelId = state.selectedModelId === modelId 
        ? (newModels.length > 0 ? newModels[0].id : null)
        : state.selectedModelId;
      
      return {
        models: newModels,
        selectedModelId: newSelectedModelId
      };
    });
  },

  setSelectedModel: (modelId: string | null) => {
    set({ selectedModelId: modelId });
  },

  getSelectedModel: () => {
    const state = get();
    return state.models.find(model => model.id === state.selectedModelId) || null;
  }
}));

export default useModelStore;