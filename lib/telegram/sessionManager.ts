// Client-side session management for Telegram
const TELEGRAM_SESSION_KEY = 'telegram_session_data';
const TELEGRAM_BACKUP_SESSION_KEY = 'telegram_session_backup';

// Interface for session data
interface TelegramSessionData {
  sessionString: string;
  timestamp: number;
  userId?: string;
  phoneNumber?: string;
  deviceId?: string;
}

// Generate a device ID for this browser instance
function getDeviceId(): string {
  const DEVICE_ID_KEY = 'telegram_device_id';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = 'web_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

// Store session data in localStorage with backup
export function saveSessionToStorage(sessionString: string, userId?: string, phoneNumber?: string): void {
  if (!sessionString || typeof window === 'undefined') {
    console.warn('Cannot save session: invalid session string or not in browser environment');
    return;
  }

  try {
    const sessionData: TelegramSessionData = {
      sessionString,
      timestamp: Date.now(),
      userId,
      phoneNumber,
      deviceId: getDeviceId()
    };
    
    // Save to primary storage
    localStorage.setItem(TELEGRAM_SESSION_KEY, JSON.stringify(sessionData));
    
    // Create backup copy for recovery
    localStorage.setItem(TELEGRAM_BACKUP_SESSION_KEY, JSON.stringify(sessionData));
    
    console.log('✅ Session saved to localStorage with backup', {
      userId,
      phoneNumber: phoneNumber ? phoneNumber.substring(0, 5) + '***' : undefined,
      deviceId: sessionData.deviceId
    });
  } catch (error) {
    console.error('❌ Failed to save session to localStorage:', error);
  }
}

// Retrieve session data from localStorage with backup recovery
export function getSessionFromStorage(): string | null {
  if (typeof window === 'undefined') {
    console.warn('Cannot get session: not in browser environment');
    return null;
  }

  const tryGetSession = (key: string, isBackup = false): string | null => {
    try {
      const storedData = localStorage.getItem(key);
      if (!storedData) {
        return null;
      }

      const sessionData: TelegramSessionData = JSON.parse(storedData);
      
      // Check if session is too old (30 days)
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (Date.now() - sessionData.timestamp > maxAge) {
        console.log(`Session expired in ${isBackup ? 'backup' : 'primary'} storage`);
        return null;
      }

      console.log(`✅ Session retrieved from ${isBackup ? 'backup' : 'primary'} storage`, {
        age: Math.floor((Date.now() - sessionData.timestamp) / (1000 * 60 * 60)) + ' hours',
        deviceId: sessionData.deviceId,
        hasUserId: !!sessionData.userId,
        hasPhoneNumber: !!sessionData.phoneNumber
      });
      
      return sessionData.sessionString;
    } catch (error) {
      console.error(`❌ Failed to retrieve session from ${isBackup ? 'backup' : 'primary'} storage:`, error);
      return null;
    }
  };

  // Try primary storage first
  let session = tryGetSession(TELEGRAM_SESSION_KEY, false);
  
  // If primary fails, try backup
  if (!session) {
    console.log('Primary session not found, trying backup...');
    session = tryGetSession(TELEGRAM_BACKUP_SESSION_KEY, true);
    
    if (session) {
      console.log('🔄 Recovered session from backup, restoring to primary storage');
      // Restore the backup to primary storage
      const backupData = localStorage.getItem(TELEGRAM_BACKUP_SESSION_KEY);
      if (backupData) {
        localStorage.setItem(TELEGRAM_SESSION_KEY, backupData);
      }
    }
  }

  if (!session) {
    console.log('No valid session found in primary or backup storage');
    clearSessionFromStorage(); // Clear any corrupted data
  }

  return session;
}

// Clear session data from localStorage (both primary and backup)
export function clearSessionFromStorage(): void {
  if (typeof window === 'undefined') {
    console.warn('Cannot clear session: not in browser environment');
    return;
  }

  try {
    localStorage.removeItem(TELEGRAM_SESSION_KEY);
    localStorage.removeItem(TELEGRAM_BACKUP_SESSION_KEY);
    console.log('✅ Session cleared from localStorage (primary and backup)');
  } catch (error) {
    console.error('❌ Failed to clear session from localStorage:', error);
  }
}

// Check if a session exists in localStorage
export function hasSessionInStorage(): boolean {
  return getSessionFromStorage() !== null;
}

// Update session timestamp (for extending session lifetime)
export function refreshSessionTimestamp(): void {
  if (typeof window === 'undefined') return;

  try {
    const storedData = localStorage.getItem(TELEGRAM_SESSION_KEY);
    if (!storedData) return;

    const sessionData: TelegramSessionData = JSON.parse(storedData);
    sessionData.timestamp = Date.now();
    
    localStorage.setItem(TELEGRAM_SESSION_KEY, JSON.stringify(sessionData));
    localStorage.setItem(TELEGRAM_BACKUP_SESSION_KEY, JSON.stringify(sessionData));
    console.log('✅ Session timestamp refreshed (primary and backup)');
  } catch (error) {
    console.error('❌ Failed to refresh session timestamp:', error);
  }
}

// Get session diagnostics for debugging
export function getSessionDiagnostics(): {
  hasPrimary: boolean;
  hasBackup: boolean;
  primaryAge?: number;
  backupAge?: number;
  deviceId?: string;
  phoneNumber?: string;
  userId?: string;
} {
  if (typeof window === 'undefined') {
    return { hasPrimary: false, hasBackup: false };
  }

  const getDiagnostics = (key: string) => {
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;
      
      const sessionData: TelegramSessionData = JSON.parse(data);
      return {
        age: Date.now() - sessionData.timestamp,
        deviceId: sessionData.deviceId,
        phoneNumber: sessionData.phoneNumber,
        userId: sessionData.userId
      };
    } catch {
      return null;
    }
  };

  const primary = getDiagnostics(TELEGRAM_SESSION_KEY);
  const backup = getDiagnostics(TELEGRAM_BACKUP_SESSION_KEY);

  return {
    hasPrimary: !!primary,
    hasBackup: !!backup,
    primaryAge: primary?.age,
    backupAge: backup?.age,
    deviceId: primary?.deviceId || backup?.deviceId,
    phoneNumber: primary?.phoneNumber || backup?.phoneNumber,
    userId: primary?.userId || backup?.userId
  };
}

// Force restore from backup
export function restoreFromBackup(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const backupData = localStorage.getItem(TELEGRAM_BACKUP_SESSION_KEY);
    if (!backupData) {
      console.log('No backup session found to restore');
      return false;
    }

    localStorage.setItem(TELEGRAM_SESSION_KEY, backupData);
    console.log('✅ Session restored from backup');
    return true;
  } catch (error) {
    console.error('❌ Failed to restore session from backup:', error);
    return false;
  }
} 