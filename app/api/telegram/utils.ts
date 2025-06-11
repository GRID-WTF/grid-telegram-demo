import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import { NextRequest, NextResponse } from 'next/server';

// Connection pool to reuse Telegram clients - with enhanced management
const clientPool: Record<string, { client: TelegramClient, lastUsed: number, validated: boolean }> = {};

// Clear all clients from the pool (useful for AUTH_RESTART recovery)
export async function clearAllClients() {
  console.log('🗑️ Clearing all clients from pool...');
  
  const poolKeys = Object.keys(clientPool);
  for (const key of poolKeys) {
    try {
      const pooledClient = clientPool[key];
      if (pooledClient.client.connected) {
        await pooledClient.client.disconnect();
      }
    } catch (err) {
      console.warn('⚠️ Error disconnecting client during clear all:', err);
    }
    delete clientPool[key];
  }
  
  console.log(`✅ Cleared ${poolKeys.length} clients from pool`);
}

// Initialize a new Telegram client with the provided session string
export async function getClient(sessionString: string | null = null, forceNew: boolean = false) {
  console.log('🔄 getClient called with session:', sessionString ? `${sessionString.slice(0, 20)}...` : 'null', 'forceNew:', forceNew);
  
  // Use server-side environment variables (remove NEXT_PUBLIC_ prefix)
  // If the variables aren't set yet, fallback to the client-side ones for now
  const apiId = parseInt(process.env.TELEGRAM_API_ID || process.env.NEXT_PUBLIC_TELEGRAM_API_ID || '0');
  const apiHash = process.env.TELEGRAM_API_HASH || process.env.NEXT_PUBLIC_TELEGRAM_API_HASH || '';
  
  if (!apiId || !apiHash) {
    throw new Error('API credentials not found. Please set TELEGRAM_API_ID and TELEGRAM_API_HASH environment variables.');
  }
  
  console.log('📋 Using API credentials - ID:', apiId, 'Hash:', apiHash ? 'Present' : 'Missing');
  
  // Use session string as key for connection pooling - but be more careful about reuse
  const poolKey = sessionString ? `session_${sessionString.slice(0, 32)}` : 'anonymous';
  
  // If forceNew is true, remove any existing client from pool first
  if (forceNew && clientPool[poolKey]) {
    console.log('🔄 Force new client requested, removing existing from pool');
    try {
      if (clientPool[poolKey].client.connected) {
        await clientPool[poolKey].client.disconnect();
      }
    } catch (err) {
      console.warn('⚠️ Error disconnecting existing client:', err);
    }
    delete clientPool[poolKey];
  }
  
  // Check if we already have a connected client for this session (unless forceNew)
  if (!forceNew && clientPool[poolKey]) {
    console.log('🔄 Checking existing client in pool...');
    const pooledClient = clientPool[poolKey];
    const now = Date.now();
    
    try {
      // Verify the client is still connected and authorized
      if (pooledClient.client.connected) {
        // Check if we recently validated this client (within 5 minutes)
        const timeSinceValidation = now - pooledClient.lastUsed;
        const VALIDATION_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
        
        if (pooledClient.validated && timeSinceValidation < VALIDATION_CACHE_TIME) {
          console.log('✅ Reusing recently validated client');
          pooledClient.lastUsed = now;
          return pooledClient.client;
        }
        
        const isAuth = await pooledClient.client.isUserAuthorized();
        console.log('✅ Existing client status - Connected:', true, 'Authorized:', isAuth);
        if (isAuth) {
          console.log('✅ Reusing existing authenticated client');
          pooledClient.lastUsed = now;
          pooledClient.validated = true;
          return pooledClient.client;
        } else {
          console.log('⚠️ Existing client not authorized, will create new one');
        }
      } else {
        console.log('⚠️ Existing client not connected, will create new one');
      }
    } catch (err: any) {
      console.log('⚠️ Error checking existing client, will create new one:', err.message);
    }
    // Remove the invalid client from pool
    delete clientPool[poolKey];
  }
  
  // Create StringSession instance - make sure it's a valid string
  const stringSession = new StringSession(sessionString || '');
  console.log('📱 Creating new Telegram client with session length:', sessionString?.length || 0);
  
  // Initialize with proper connection settings
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
    useWSS: false, // Use TCP connection which is more reliable
    timeout: 30000, // 30 seconds timeout
    retryDelay: 1000, // 1 second retry delay
    maxConcurrentDownloads: 1, // Limit concurrent operations
  });
  
  // Connect if not already connected
  try {
    console.log('🔌 Connecting to Telegram...');
    const connectStart = Date.now();
    await client.connect();
    console.log('✅ Connected to Telegram in', Date.now() - connectStart, 'ms');
    
    // Check authorization status
    const isAuthorized = await client.isUserAuthorized();
    console.log('🔐 Authorization status:', isAuthorized);
    
    // Only store in pool if connected and authorized (for session-based clients)
    if (client.connected && (isAuthorized || !sessionString)) {
      clientPool[poolKey] = {
        client,
        lastUsed: Date.now(),
        validated: isAuthorized
      };
      console.log('💾 Stored client in pool with key:', poolKey);
    }
    
     } catch (err: any) {
     console.error('❌ Failed to connect Telegram client:', err.message);
     throw err;
   }
  
  return client;
}

// Function to explicitly disconnect a client (for logout, etc.)
export async function disconnectClient(sessionString: string | null = null) {
  const poolKey = sessionString ? `session_${sessionString.slice(0, 32)}` : 'anonymous';
  
  console.log('🔌 Disconnecting client with key:', poolKey);
  
  if (clientPool[poolKey]) {
    const pooledClient = clientPool[poolKey];
    try {
      if (pooledClient.client.connected) {
        await pooledClient.client.disconnect();
        console.log('✅ Disconnected Telegram client');
      }
    } catch (err) {
      console.warn('⚠️ Error disconnecting client:', err);
    } finally {
      delete clientPool[poolKey];
      console.log('🗑️ Removed client from pool');
    }
  }
}

// Helper to safely cast the session string
export function safeSessionSave(client: TelegramClient): string {
  try {
    const session = client.session.save();
    const sessionString = typeof session === 'string' ? session : '';
    console.log('💾 Saved session string length:', sessionString.length);
    return sessionString;
  } catch (error) {
    console.error('❌ Error saving session:', error);
    return '';
  }
}

// Session management - now expecting session data from client
export function getSessionFromRequest(request: NextRequest) {
  console.log('🍪 Getting session from request...');
  
  // Try to get session from request body first (for POST requests)
  const sessionString = request.headers.get('x-telegram-session') || null;
  
  console.log('💾 Session string from header:', sessionString ? `${sessionString.slice(0, 20)}... (${sessionString.length} chars)` : 'none');
  
  return { sessionString, shouldClearCookie: false };
}

// Session save response - now returns session to be stored client-side
export function createSessionResponse(sessionString: string, response: NextResponse) {
  console.log('💾 Creating session response...');
  
  if (!sessionString) {
    console.warn('⚠️ Empty session string, not including in response');
    return null;
  }
  
  // Set session in response header for client to store
  response.headers.set('x-telegram-session', sessionString);
  console.log('✅ Set session in response header');
  
  return sessionString;
}

// Clear session response - signal client to clear localStorage
export function clearSessionFromResponse(response: NextResponse) {
  console.log('🗑️ Signaling session clear...');
  
  response.headers.set('x-telegram-session-clear', 'true');
  console.log('✅ Set session clear header');
} 