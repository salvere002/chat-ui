import { create } from 'zustand';
import { AgentStore } from '../types/store';
import { Agent } from '../types/chat';

// Helper function to ensure agent has all required fields for UI compatibility
const sanitizeAgent = (agent: Partial<Agent>): Agent => {
  if (!agent.id || !agent.name) {
    throw new Error('Agent must have id and name');
  }
  
  return {
    isActive: true,
    description: '',
    model: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: 'You are a helpful AI assistant.',
    ...agent,
    id: agent.id,
    name: agent.name
  } as Agent;
};

// Mock agents data for initial testing
const defaultAgents: Agent[] = [
  {
    id: 'assistant',
    name: 'Assistant',
    description: 'General purpose AI assistant',
    model: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: 'You are a helpful AI assistant.',
    isActive: true
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'AI specialized in creative writing and storytelling',
    model: 'gpt-4-turbo',
    temperature: 0.9,
    maxTokens: 3000,
    systemPrompt: 'You are a creative writing assistant. Help users with storytelling, creative writing, and imaginative content.',
    isActive: true
  },
  {
    id: 'analyst',
    name: 'Analyst',
    description: 'AI specialized in data analysis and technical tasks',
    model: 'gpt-4-turbo',
    temperature: 0.3,
    maxTokens: 2000,
    systemPrompt: 'You are a data analyst and technical assistant. Provide precise, analytical responses with a focus on accuracy and technical detail.',
    isActive: true
  }
];

// Create the agent store with Zustand
const useAgentStore = create<AgentStore>((set, get) => ({
  // State
  agents: defaultAgents,
  selectedAgentId: 'assistant', // Default to assistant

  // Actions
  setAgents: (agents: Agent[]) => {
    const sanitizedAgents = agents.map(agent => sanitizeAgent(agent));
    set({ agents: sanitizedAgents });
  },

  addAgent: (agent: Agent) => {
    const sanitizedAgent = sanitizeAgent(agent);
    set((state) => ({
      agents: [...state.agents, sanitizedAgent]
    }));
  },

  updateAgent: (agentId: string, updates: Partial<Agent>) => {
    set((state) => ({
      agents: state.agents.map(agent => {
        if (agent.id === agentId) {
          const updatedAgent = { ...agent, ...updates };
          // Ensure the updated agent still has required fields
          return sanitizeAgent(updatedAgent);
        }
        return agent;
      })
    }));
  },

  removeAgent: (agentId: string) => {
    set((state) => {
      const newAgents = state.agents.filter(agent => agent.id !== agentId);
      const newSelectedAgentId = state.selectedAgentId === agentId 
        ? (newAgents.length > 0 ? newAgents[0].id : null)
        : state.selectedAgentId;
      
      return {
        agents: newAgents,
        selectedAgentId: newSelectedAgentId
      };
    });
  },

  setSelectedAgent: (agentId: string | null) => {
    set({ selectedAgentId: agentId });
  },

  getSelectedAgent: () => {
    const state = get();
    return state.agents.find(agent => agent.id === state.selectedAgentId) || null;
  }
}));

export default useAgentStore;