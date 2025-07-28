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
  },
  {
    id: 'deepresearch',
    name: 'Deep Research',
    description: 'AI specialized in comprehensive research and analysis',
    model: 'gpt-4-turbo',
    temperature: 0.5,
    maxTokens: 4000,
    systemPrompt: 'You are a deep research assistant. Provide thorough, well-researched responses with detailed analysis and comprehensive coverage of topics.',
    isActive: true,
    isDeepResearch: true
  }
];

// Create the agent store with Zustand
const useAgentStore = create<AgentStore>((set, get) => ({
  // State
  agents: defaultAgents,
  selectedAgentId: 'assistant', // Default to assistant
  deepResearchEnabled: false,

  // Actions
  setAgents: (agents: Agent[]) => {
    const sanitizedAgents = agents.map(agent => sanitizeAgent(agent));
    const activeAgents = sanitizedAgents.filter(agent => agent.isActive !== false);
    const currentState = get();
    
    // Auto-select first active agent if no current selection or current selection not in new list
    let newSelectedAgentId = currentState.selectedAgentId;
    if (!newSelectedAgentId || !activeAgents.find(agent => agent.id === newSelectedAgentId)) {
      newSelectedAgentId = activeAgents.length > 0 ? activeAgents[0].id : null;
    }
    
    set({ 
      agents: sanitizedAgents,
      selectedAgentId: newSelectedAgentId
    });
  },

  addAgent: (agent: Agent) => {
    const sanitizedAgent = sanitizeAgent(agent);
    set((state) => {
      const newAgents = [...state.agents, sanitizedAgent];
      // Auto-select this agent if no agent is currently selected and this agent is active
      const newSelectedAgentId = !state.selectedAgentId && sanitizedAgent.isActive !== false
        ? sanitizedAgent.id
        : state.selectedAgentId;
      
      return {
        agents: newAgents,
        selectedAgentId: newSelectedAgentId
      };
    });
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

  getUserSelectedAgent: () => {
    const state = get();
    return state.agents.find(agent => agent.id === state.selectedAgentId) || null;
  },

  // Deep research functionality
  setDeepResearchEnabled: (enabled: boolean) => {
    set({ deepResearchEnabled: enabled });
  },

  getSelectableAgents: () => {
    const state = get();
    return state.agents.filter(agent => 
      agent.isActive !== false && (
        state.deepResearchEnabled 
          ? agent.isDeepResearch === true
          : agent.isDeepResearch !== true
      )
    );
  },

  getEffectiveAgent: () => {
    const state = get();
    if (state.deepResearchEnabled) {
      return state.agents.find(agent => agent.isDeepResearch === true && agent.isActive !== false) || null;
    }
    return state.getUserSelectedAgent();
  }
}));

export default useAgentStore;