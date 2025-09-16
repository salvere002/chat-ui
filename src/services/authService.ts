import { ApiClient } from './apiClient';
import { configManager } from '../utils/config';

type AuthUser = {
  userId: string;
  [key: string]: any;
};

// Resolve auth base URL: config first, env override optional, else fall back to main API base URL
const cfg = configManager.getAuthConfig();
const AUTH_BASE_URL = (import.meta as any).env?.VITE_AUTH_BASE_URL || cfg.baseUrl || configManager.getApiConfig().baseUrl;

// Dedicated API client for auth (no user-id header injection needed here)
const authApiClient = new ApiClient({
  baseUrl: AUTH_BASE_URL,
  defaultHeaders: configManager.getApiConfig().defaultHeaders,
  timeout: configManager.getApiConfig().timeout,
});

export class AuthService {
  // Fetch current user info; adjust the path to your auth endpoint
  static async getCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
    // Hardcoded auth endpoint path
    return authApiClient.request<AuthUser>(
      '/auth/me',
      { method: 'GET' },
      (data: any) => data as AuthUser,
      signal
    );
  }
}

export type { AuthUser };
