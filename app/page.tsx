'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoginScreen } from '@/components/telegram/LoginScreen';
import { telegramAPI } from '@/lib/telegram/apiClient';
import { hasSessionInStorage, getSessionDiagnostics, clearSessionFromStorage } from '@/lib/telegram/sessionManager';
import Link from 'next/link';

interface AuthState {
  isConnected: boolean;
  isLoading: boolean;
  statusMessage: string;
  statusIsError: boolean;
  requiresCode: boolean;
  requiresPassword: boolean;
  phoneNumber: string;
  phoneCode: string;
  password: string;
  phoneCodeHash: string;
}

export default function Home() {
  const [authState, setAuthState] = useState<AuthState>({
    isConnected: false,
    isLoading: false,
    statusMessage: '',
    statusIsError: false,
    requiresCode: false,
    requiresPassword: false,
    phoneNumber: '',
    phoneCode: '',
    password: '',
    phoneCodeHash: ''
  });

  const [sessionDiagnostics, setSessionDiagnostics] = useState(getSessionDiagnostics());

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, statusMessage: 'Checking session...' }));
    setSessionDiagnostics(getSessionDiagnostics());

    try {
      const { data } = await telegramAPI.checkSession();
      
      if (data.isConnected) {
        setAuthState(prev => ({
          ...prev,
          isConnected: true,
          isLoading: false,
          statusMessage: 'Connected to Telegram',
          statusIsError: false
        }));
      } else {
        setAuthState(prev => ({
          ...prev,
          isConnected: false,
          isLoading: false,
          statusMessage: 'Not connected to Telegram',
          statusIsError: false
        }));
      }
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        statusMessage: error.message || 'Failed to check session',
        statusIsError: true
      }));
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAuthState(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSendCode = useCallback(async () => {
    if (!authState.phoneNumber.trim()) {
      setAuthState(prev => ({
        ...prev,
        statusMessage: 'Please enter a phone number',
        statusIsError: true
      }));
      return;
    }

    setAuthState(prev => ({ ...prev, isLoading: true, statusMessage: 'Sending code...' }));

    try {
      const { data } = await telegramAPI.sendCode(authState.phoneNumber);
      
      if (data.success) {
        setAuthState(prev => ({
          ...prev,
          requiresCode: true,
          phoneCodeHash: data.phoneCodeHash,
          isLoading: false,
          statusMessage: 'Code sent! Check Telegram for your verification code.',
          statusIsError: false
        }));
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          statusMessage: data.error || 'Failed to send code',
          statusIsError: true
        }));
      }
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        statusMessage: error.message || 'Failed to send code',
        statusIsError: true
      }));
    }
  }, [authState.phoneNumber]);

  const handleVerifyCode = useCallback(async () => {
    if (!authState.phoneCode.trim()) {
      setAuthState(prev => ({
        ...prev,
        statusMessage: 'Please enter the verification code',
        statusIsError: true
      }));
      return;
    }

    setAuthState(prev => ({ ...prev, isLoading: true, statusMessage: 'Verifying code...' }));

    try {
      const { data } = await telegramAPI.verifyCode(
        authState.phoneNumber,
        authState.phoneCodeHash,
        authState.phoneCode,
        authState.password || undefined
      );
      
      if (data.success) {
        setAuthState(prev => ({
          ...prev,
          isConnected: true,
          requiresCode: false,
          requiresPassword: false,
          isLoading: false,
          statusMessage: 'Successfully connected to Telegram!',
          statusIsError: false
        }));
      } else if (data.passwordRequired) {
        setAuthState(prev => ({
          ...prev,
          requiresPassword: true,
          requiresCode: false,
          isLoading: false,
          statusMessage: 'Please enter your 2FA password',
          statusIsError: false
        }));
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          statusMessage: data.error || 'Failed to verify code',
          statusIsError: true
        }));
      }
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        statusMessage: error.message || 'Failed to verify code',
        statusIsError: true
      }));
    }
  }, [authState.phoneNumber, authState.phoneCodeHash, authState.phoneCode, authState.password]);

  const handleLogout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, statusMessage: 'Logging out...' }));

    try {
      await telegramAPI.logout();
      setAuthState({
        isConnected: false,
        isLoading: false,
        statusMessage: 'Logged out successfully',
        statusIsError: false,
        requiresCode: false,
        requiresPassword: false,
        phoneNumber: '',
        phoneCode: '',
        password: '',
        phoneCodeHash: ''
      });
      setSessionDiagnostics(getSessionDiagnostics());
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        statusMessage: error.message || 'Failed to logout',
        statusIsError: true
      }));
    }
  }, []);

  const handleBackToLogin = useCallback(() => {
    setAuthState(prev => ({
      ...prev,
      requiresCode: false,
      requiresPassword: false,
      phoneCode: '',
      password: '',
      statusMessage: '',
      statusIsError: false
    }));
  }, []);

  const handleSessionRecovery = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, statusMessage: 'Recovering session...' }));
    await checkSession();
  }, [checkSession]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Info Card */}
          <div className="mb-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              GRID.WTF Telegram Client DEMO
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Full working version: <Link className="underline text-blue-500 hover:text-blue-600" href="https://grid.wtf" target="_blank" rel="noopener noreferrer">https://grid.wtf</Link></li>
              <li>• Sessions are stored locally in your browser</li>
              <li>• You need valid Telegram API credentials (see env.example)</li>
              <li>• Only authentication is supported (SDK is in progress)</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
            {authState.isConnected ? (
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Connected!
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You are successfully authenticated with Telegram.
                </p>
                <button
                  onClick={handleLogout}
                  disabled={authState.isLoading}
                  className="w-full py-3 px-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors"
                >
                  {authState.isLoading ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            ) : (
              <LoginScreen
                statusMessage={authState.statusMessage}
                statusIsError={authState.statusIsError}
                isLoading={authState.isLoading}
                requiresCode={authState.requiresCode}
                requiresPassword={authState.requiresPassword}
                phoneNumber={authState.phoneNumber}
                phoneCode={authState.phoneCode}
                password={authState.password}
                onInputChange={handleInputChange}
                onSendCode={handleSendCode}
                onVerifyCode={handleVerifyCode}
                onBackToLogin={handleBackToLogin}
                onSessionRecovery={handleSessionRecovery}
                sessionDiagnostics={sessionDiagnostics}
                isDarkTheme={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 