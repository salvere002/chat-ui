import { serviceFactory } from './serviceFactory';
import useAuthStore from '../stores/authStore';
import type { PythonPreviewResponse } from '../types/api';

export async function renderPythonPreview(
  code: string,
  abortSignal?: AbortSignal
): Promise<PythonPreviewResponse> {
  try {
    await useAuthStore.getState().bootstrap();
  } catch {
    // Best-effort auth bootstrap; preview can still proceed.
  }

  const adapter = serviceFactory.getAdapter();
  if (!adapter.capabilities?.pythonPreview || !adapter.renderPythonPreview) {
    return { ok: false, error: 'Python preview is not supported by the current adapter.' };
  }

  return adapter.renderPythonPreview(code, abortSignal);
}

export function isPythonPreviewSupported(): boolean {
  try {
    const adapter = serviceFactory.getAdapter();
    return !!adapter.capabilities?.pythonPreview && typeof adapter.renderPythonPreview === 'function';
  } catch {
    return false;
  }
}
