import { serviceFactory } from './serviceFactory';
import { useAuthStore, useModelStore, useServiceConfigStore } from '../stores';
import type { Model } from '../types/chat';

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

export class ModelService {
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

      let models: Model[];
      try {
        models = await serviceFactory.getAdapter().getModels();
      } catch (error) {
        if (!isUnsupported(error)) {
          console.warn('Failed to fetch models via adapter:', error);
        }
        return;
      }

      if (!Array.isArray(models)) {
        console.warn('Adapter getModels returned an invalid payload.');
        return;
      }

      if (getAdapterKey() !== requestKey) {
        return;
      }

      try {
        useModelStore.getState().setModels(models);
      } catch (error) {
        console.warn('Failed to apply remote models:', error);
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
