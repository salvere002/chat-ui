import { ApiClient } from './apiClient';
import { configManager } from '../utils/config';

export interface Person {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface SearchPersonsRequest {
  query: string;
}

export interface SearchPersonsResponse {
  persons?: Person[];
}

export interface SendEmailRequest {
  screenshot: Blob;
  subject: string;
  message: string;
  recipients: Array<{
    email: string;
    name: string;
  }>;
}

export interface SendEmailResponse {
  success: boolean;
  message?: string;
  sent_count?: number;
}

// Get base URL from config, with environment variable override option
const cfg = configManager.getApiConfig();
const EMAIL_BASE_URL = (import.meta as any).env?.VITE_EMAIL_BASE_URL || cfg.baseUrl;

// Dedicated API client for email operations
const emailApiClient = new ApiClient({
  baseUrl: EMAIL_BASE_URL,
  defaultHeaders: cfg.defaultHeaders,
  timeout: cfg.timeout,
  useProxy: cfg.useProxy,
});

export class EmailService {
  /**
   * Search for persons by name or email
   */
  static async searchPersons(
    query: string,
    signal?: AbortSignal
  ): Promise<Person[]> {
    try {
      const response = await emailApiClient.request<any>(
        '/search-persons',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        },
        undefined,
        signal
      );

      // Handle different response formats
      if (response && typeof response === 'object') {
        if (response.persons && Array.isArray(response.persons)) {
          return response.persons;
        } else if (Array.isArray(response)) {
          return response;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error searching persons:', error);
      // Return empty array instead of throwing, so UI can fallback to manual input
      return [];
    }
  }

  /**
   * Send email with screenshot attachment
   */
  static async sendEmail(
    request: SendEmailRequest,
    signal?: AbortSignal
  ): Promise<SendEmailResponse> {
    const formData = new FormData();
    formData.append('screenshot', request.screenshot, 'conversation-screenshot.png');
    formData.append('subject', request.subject);
    formData.append('message', request.message);
    formData.append('recipients', JSON.stringify(request.recipients));

    const response = await emailApiClient.request<SendEmailResponse>(
      '/send-email',
      {
        method: 'POST',
        body: formData,
      },
      undefined,
      signal
    );

    return response;
  }
}

