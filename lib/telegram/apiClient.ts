// API client for Telegram endpoints with automatic session handling
import { getSessionFromStorage, saveSessionToStorage, clearSessionFromStorage } from './sessionManager';

interface TelegramApiResponse {
  success: boolean;
  error?: string;
  message?: string;
  [key: string]: any;
}

interface RequestConfig extends RequestInit {
  includeSession?: boolean;
}

// Enhanced fetch wrapper that handles Telegram sessions
export async function telegramApiFetch(
  endpoint: string, 
  config: RequestConfig = {}
): Promise<{ data: TelegramApiResponse; response: Response }> {
  const { includeSession = true, headers = {}, ...restConfig } = config;
  
  // Prepare headers
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers
  };
  
  // Include session in headers if available and requested
  if (includeSession) {
    const sessionString = getSessionFromStorage();
    if (sessionString) {
      (requestHeaders as Record<string, string>)['x-telegram-session'] = sessionString;
    }
  }
  
  // Make the request
  const response = await fetch(endpoint, {
    ...restConfig,
    headers: requestHeaders,
    credentials: 'include'
  });
  
  let data: TelegramApiResponse;
  try {
    data = await response.json();
  } catch (error) {
    data = { 
      success: false, 
      error: 'Failed to parse server response',
      message: 'Invalid response format'
    };
  }
  
  // Handle session updates from response headers
  const newSession = response.headers.get('x-telegram-session');
  const shouldClearSession = response.headers.get('x-telegram-session-clear');
  
  if (shouldClearSession === 'true') {
    clearSessionFromStorage();
  } else if (newSession) {
    let userId, phoneNumber;
    if (data && typeof data === 'object') {
      userId = data.userId || data.userInfo?.user?.id;
      phoneNumber = data.phoneNumber || data.userInfo?.user?.phone;
    }
    saveSessionToStorage(newSession, userId, phoneNumber);
  }
  
  return { data, response };
}

// Convenience methods for common HTTP verbs
export async function telegramApiGet(endpoint: string, config: RequestConfig = {}) {
  return telegramApiFetch(endpoint, { ...config, method: 'GET' });
}

export async function telegramApiPost(endpoint: string, body?: any, config: RequestConfig = {}) {
  return telegramApiFetch(endpoint, {
    ...config,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined
  });
}

export async function telegramApiPut(endpoint: string, body?: any, config: RequestConfig = {}) {
  return telegramApiFetch(endpoint, {
    ...config,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined
  });
}

export async function telegramApiDelete(endpoint: string, config: RequestConfig = {}) {
  return telegramApiFetch(endpoint, { ...config, method: 'DELETE' });
}

// Consolidated API helpers using new endpoints
export const checkSession = () => telegramApiGet('/api/telegram/auth');

export const sendCode = (phoneNumber: string) => 
  telegramApiPost('/api/telegram/auth', { action: 'send-code', phoneNumber });

export const verifyCode = (phoneNumber: string, phoneCodeHash: string, phoneCode: string, password?: string) => 
  telegramApiPost('/api/telegram/auth', { action: 'verify-code', phoneNumber, phoneCodeHash, phoneCode, password });

export const logout = () => 
  telegramApiPost('/api/telegram/auth', { action: 'logout' });

// Utility to export all auth functions as a single object
export const telegramAPI = {
  checkSession,
  sendCode,
  verifyCode,
  logout
}; 