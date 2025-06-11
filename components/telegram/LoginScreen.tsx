import { useState } from 'react';
import { cn } from "@/lib/utils";

// Common country codes data
const COUNTRY_CODES = [
  { code: '+1', country: 'US', name: 'United States', flag: '🇺🇸' },
  { code: '+1', country: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: '+44', country: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+49', country: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'FR', name: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: '+31', country: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+46', country: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: '+45', country: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: '+41', country: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', country: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: '+32', country: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: '+351', country: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: '+7', country: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: '+380', country: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: '+48', country: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: '+420', country: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: '+36', country: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: '+90', country: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: '+91', country: 'IN', name: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'CN', name: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: '+65', country: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: '+852', country: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: '+61', country: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: '+64', country: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: '+55', country: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: '+54', country: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: '+56', country: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: '+57', country: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: '+51', country: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: '+27', country: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: '+20', country: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: '+971', country: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+972', country: 'IL', name: 'Israel', flag: '🇮🇱' },
];

interface SessionDiagnostics {
  hasPrimary: boolean;
  hasBackup: boolean;
  primaryAge?: number;
  backupAge?: number;
  deviceId?: string;
  phoneNumber?: string;
  userId?: string;
}

interface LoginScreenProps {
  statusMessage: string;
  statusIsError?: boolean;
  isLoading: boolean;
  requiresCode: boolean;
  requiresPassword: boolean;
  phoneNumber: string;
  phoneCode: string;
  password: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendCode: () => void;
  onVerifyCode?: () => void;
  onLogin?: () => void;
  onClose?: () => void;
  onBackToLogin?: () => void;
  onSessionRecovery?: () => void;
  sessionDiagnostics?: SessionDiagnostics;
  isDarkTheme?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  statusMessage,
  statusIsError = false,
  isLoading,
  requiresCode,
  requiresPassword,
  phoneNumber,
  phoneCode,
  password,
  onInputChange,
  onSendCode,
  onVerifyCode,
  onLogin,
  onClose,
  onBackToLogin,
  onSessionRecovery,
  sessionDiagnostics,
  isDarkTheme = false,
}) => {
  // Parse existing phone number to extract country code and number
  const parsePhoneNumber = (fullNumber: string) => {
    if (!fullNumber.startsWith('+')) {
      return { countryCode: '+1', nationalNumber: fullNumber };
    }
    
    // Find matching country code
    const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    for (const country of sortedCodes) {
      if (fullNumber.startsWith(country.code)) {
        return {
          countryCode: country.code,
          nationalNumber: fullNumber.slice(country.code.length)
        };
      }
    }
    
    // Default fallback
    return { countryCode: '+1', nationalNumber: fullNumber.slice(1) };
  };

  const { countryCode: initialCountryCode, nationalNumber: initialNationalNumber } = parsePhoneNumber(phoneNumber);
  const [selectedCountryCode, setSelectedCountryCode] = useState(initialCountryCode);
  const [nationalNumber, setNationalNumber] = useState(initialNationalNumber);

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountryCode = e.target.value;
    setSelectedCountryCode(newCountryCode);
    
    // Update the full phone number
    const fullNumber = newCountryCode + nationalNumber;
    const syntheticEvent = {
      target: {
        name: 'phoneNumber',
        value: fullNumber
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(syntheticEvent);
  };

  const handleNationalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNationalNumber = e.target.value.replace(/[^0-9]/g, ''); // Only allow digits
    setNationalNumber(newNationalNumber);
    
    // Update the full phone number
    const fullNumber = selectedCountryCode + newNationalNumber;
    const syntheticEvent = {
      target: {
        name: 'phoneNumber',
        value: fullNumber
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(syntheticEvent);
  };

  const handleAction = () => {
    if (requiresCode || requiresPassword) {
      if (onVerifyCode) onVerifyCode();
      else if (onLogin) onLogin();
    } else {
      onSendCode();
    }
  };

  const actionButtonText = requiresCode || requiresPassword ? "Log In" : "Next";
  const isActionButtonDisabled = isLoading || (!requiresCode && !nationalNumber.trim()) || (requiresCode && !phoneCode.trim());

  const selectedCountry = COUNTRY_CODES.find(country => country.code === selectedCountryCode) || COUNTRY_CODES[0];

  return (
    <div className={cn(
      "flex-1 h-full min-h-[500px] flex flex-col",
      isDarkTheme ? 'bg-gray-900' : 'bg-white'
    )}>
      {/* Header with Logo */}
      <div className={cn(
        "px-6 py-6 text-center",
        isDarkTheme ? 'bg-gray-900' : 'bg-white'
      )}>
        <div className="flex flex-col items-center space-y-4">
          {/* Telegram Logo Placeholder - you can replace this with actual logo */}
          <div className="w-20 h-20 rounded-2xl shadow-lg p-2 bg-blue-500 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.417 15.181l-.397 5.584c.568 0 .814-.244 1.109-.537l2.663-2.545 5.518 4.041c1.012.564 1.725.267 1.998-.931L23.93 3.821l.001-.001c.321-1.496-.541-2.081-1.527-1.714l-21.29 8.151c-1.453.564-1.431 1.374-.247 1.741l5.443 1.693L18.953 5.78c.595-.394 1.136-.176.691.218l-9.227 8.27z"/>
            </svg>
          </div>
          <div>
            <h1 className={cn("text-2xl font-semibold", isDarkTheme ? 'text-white' : 'text-gray-900')}>
              {requiresCode ? 'Enter Code' : requiresPassword ? 'Enter Password' : 'Sign in to Telegram'}
            </h1>
            <p className={cn("text-sm mt-1", isDarkTheme ? 'text-gray-400' : 'text-gray-600')}>
              {requiresCode 
                ? 'We\'ve sent you a code via Telegram' 
                : requiresPassword 
                ? 'Your account is protected with an additional password'
                : 'Please confirm your country code and enter your phone number'
              }
            </p>
            {(requiresCode || requiresPassword) && onBackToLogin && (
              <button className="text-sm text-blue-500 hover:text-blue-600" onClick={onBackToLogin}>
                Back to Login
              </button>
            )}
            {!requiresCode && !requiresPassword && (
              <div className="mt-2">
                <a
                  href="https://telegram.org/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 text-xs"
                >
                  Privacy Policy
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-6">
        {/* Status Message */}
        {statusMessage && (
          <div className={cn(
            "mb-6 p-4 rounded-xl text-sm flex items-center space-x-3",
            statusIsError
              ? (isDarkTheme ? 'bg-red-900/20 text-red-300 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200')
              : (isLoading
                  ? (isDarkTheme ? 'bg-blue-900/20 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200')
                  : (isDarkTheme ? 'bg-yellow-900/20 text-yellow-300 border border-yellow-800' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'))
          )}>
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                {statusIsError
                  ? <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                  : <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A.75.75 0 0 0 10.747 14h.506a.75.75 0 0 0 .747-.696l.459-2.066a.25.25 0 0 1 .244-.304H13a.75.75 0 0 0 0-1.5H9Z" clipRule="evenodd" />
                }
              </svg>
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">
          {/* Phone Number Section */}
          {!requiresCode && !requiresPassword && (
            <div className="space-y-3">
              <label className={cn("block text-sm font-medium", isDarkTheme ? 'text-gray-300' : 'text-gray-700')}>
                Phone Number
              </label>
              <div className="space-y-3">
                {/* Country Code Selector */}
                <div className="relative">
                  <select
                    value={selectedCountryCode}
                    onChange={handleCountryCodeChange}
                    className={cn(
                      "w-full appearance-none pl-4 pr-10 py-4 rounded-xl border-2 focus:outline-none focus:ring-0 transition-colors text-base",
                      isDarkTheme
                        ? 'bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 hover:bg-gray-100'
                    )}
                    disabled={isLoading}
                  >
                    {COUNTRY_CODES.map((country, index) => (
                      <option key={`${country.code}-${country.country}-${index}`} value={country.code}>
                        {country.flag} {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                  <div className={cn("absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none", isDarkTheme ? 'text-gray-400' : 'text-gray-500')}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Phone Number Input */}
                <div className="relative">
                  <div className={cn("absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none", isDarkTheme ? 'text-gray-500' : 'text-gray-400')}>
                    <span className="font-medium">{selectedCountryCode}</span>
                  </div>
                  <input
                    type="tel"
                    value={nationalNumber}
                    onChange={handleNationalNumberChange}
                    placeholder="Phone number"
                    className={cn(
                      "w-full py-4 pr-4 rounded-xl border-2 focus:outline-none focus:ring-0 transition-colors text-base",
                      isDarkTheme
                        ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-blue-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500 hover:bg-gray-100'
                    )}
                    style={{ paddingLeft: `${selectedCountryCode.length * 8 + 32}px` }}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Code Input */}
          {requiresCode && (
            <div className="space-y-3">
              <label className={cn("block text-sm font-medium", isDarkTheme ? 'text-gray-300' : 'text-gray-700')}>
                Code
              </label>
              <input
                type="text"
                name="phoneCode"
                value={phoneCode}
                onChange={onInputChange}
                className={cn(
                  "w-full px-4 py-4 rounded-xl border-2 focus:outline-none focus:ring-0 transition-colors text-base text-center tracking-widest",
                  isDarkTheme
                    ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500 hover:bg-gray-100'
                )}
                disabled={isLoading}
                placeholder="Code"
                autoFocus
                maxLength={6}
              />
            </div>
          )}

          {/* Password Input */}
          {requiresPassword && (
            <div className="space-y-3">
              <label className={cn("block text-sm font-medium", isDarkTheme ? 'text-gray-300' : 'text-gray-700')}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={onInputChange}
                className={cn(
                  "w-full px-4 py-4 rounded-xl border-2 focus:outline-none focus:ring-0 transition-colors text-base",
                  isDarkTheme
                    ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500 hover:bg-gray-100'
                )}
                disabled={isLoading}
                placeholder="Password"
                autoFocus
              />
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleAction}
            className={cn(
              "w-full py-4 px-6 rounded-xl font-semibold text-base transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20",
              isActionButtonDisabled
                ? (isDarkTheme ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-500 cursor-not-allowed')
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
            )}
            disabled={isActionButtonDisabled}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Please wait...</span>
              </div>
            ) : (
              actionButtonText
            )}
          </button>

          {/* Session Recovery Section */}
          {onSessionRecovery && sessionDiagnostics && (sessionDiagnostics.hasPrimary || sessionDiagnostics.hasBackup) && !requiresCode && !requiresPassword && (
            <div className={cn(
              "mt-6 p-4 rounded-xl border-2 border-dashed",
              isDarkTheme ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50/50'
            )}>
              <div className="text-center space-y-3">
                <div className={cn("text-sm", isDarkTheme ? 'text-gray-300' : 'text-gray-600')}>
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="font-medium">Session Found</span>
                  </div>
                  <div className="text-xs space-y-1">
                    {sessionDiagnostics.phoneNumber && (
                      <div>Phone: {sessionDiagnostics.phoneNumber.substring(0, 5)}***</div>
                    )}
                    {sessionDiagnostics.primaryAge && (
                      <div>
                        Saved: {Math.floor(sessionDiagnostics.primaryAge / (1000 * 60 * 60))} hours ago
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={onSessionRecovery}
                  disabled={isLoading}
                  className={cn(
                    "w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-yellow-500/20",
                    isLoading
                      ? (isDarkTheme ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-500 cursor-not-allowed')
                      : (isDarkTheme 
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                          : 'bg-yellow-500 hover:bg-yellow-600 text-white'),
                    "transform hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Recover Session</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 