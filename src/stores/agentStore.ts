import { create } from 'zustand';
import { AgentStore } from '../types/store';
import { Agent } from '../types/chat';

// Create the agent store with Zustand
const useAgentStore = create<AgentStore>((set) => ({
  // State
  selectedAgent: 'stream' as Agent,
  
  // Actions
  setSelectedAgent: (agent: Agent) => {
    set({ selectedAgent: agent });
  }
}));

export default useAgentStore; 