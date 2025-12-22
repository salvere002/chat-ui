import { serviceFactory } from './serviceFactory';
import { useAgentStore, useAuthStore, useServiceConfigStore } from '../stores';
import type { Agent } from '../types/chat';

const getAdapterKey = (): string => {
  const state = useServiceConfigStore.getState();
  const baseUrl = state.configs[state.currentAdapterType]?.baseUrl ?? '';
  return `${state.currentAdapterType}:${baseUrl}`;
};

const isUnsupported = (error: unknown): boolean => {
  return error instanceof Error && error.message.includes('Feature not supported');
};

let bootstrapPromise: Promise<void> | null = null;
let bootstrapKey: string | null = null;

export class AgentService {
  static async bootstrap(): Promise<void> {
    const requestKey = getAdapterKey();
    if (bootstrapPromise && bootstrapKey === requestKey) {
      return bootstrapPromise;
    }

    const promise = (async () => {
      try {
        await useAuthStore.getState().bootstrap();
      } catch {
        // Best-effort: proceed even if auth bootstrap fails
      }

      let agents: Agent[];
      try {
        agents = await serviceFactory.getAdapter().getAgents();
      } catch (error) {
        if (!isUnsupported(error)) {
          console.warn('Failed to fetch agents via adapter:', error);
        }
        return;
      }

      if (!Array.isArray(agents)) {
        console.warn('Adapter getAgents returned an invalid payload.');
        return;
      }

      if (getAdapterKey() !== requestKey) {
        return;
      }

      try {
        useAgentStore.getState().setAgents(agents);
      } catch (error) {
        console.warn('Failed to apply remote agents:', error);
      }
    })();

    bootstrapPromise = promise;
    bootstrapKey = requestKey;

    try {
      await promise;
    } finally {
      if (bootstrapPromise === promise) {
        bootstrapPromise = null;
      }
    }
  }
}
