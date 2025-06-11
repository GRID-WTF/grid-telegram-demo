import { NextRequest, NextResponse } from 'next/server';
import { Api } from 'telegram/tl';
import { getClient, getSessionFromRequest, safeSessionSave, createSessionResponse, clearSessionFromResponse, disconnectClient } from '../utils';

// Consolidated auth endpoint - handles all authentication operations
export async function GET(request: NextRequest) {
  try {
    // GET method handles session validation (replaces check-session)
    const { sessionString } = getSessionFromRequest(request);

    if (!sessionString) {
      const response = NextResponse.json({ 
        isConnected: false,
        message: 'No session found'
      });
      clearSessionFromResponse(response);
      return response;
    }

    const client = await getClient(sessionString);
    
    if (!client.connected) {
      await client.connect();
    }
    
    const isAuthorized = await client.isUserAuthorized();
    
    if (isAuthorized) {
      const updatedSession = safeSessionSave(client);
      
      const response = NextResponse.json({ 
        isConnected: true,
        message: 'Session valid and connected'
      });
      
      if (updatedSession) {
        createSessionResponse(updatedSession, response);
      }
      
      return response;
    }
    
    return NextResponse.json({ 
      isConnected: false,
      message: 'Session exists but not authorized'
    });
  } catch (error: any) {
    console.error('Error checking session:', error);
    return NextResponse.json({ 
      isConnected: false,
      error: error.message || 'Failed to check session'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, phoneNumber, phoneCodeHash, phoneCode, password } = body;

    switch (action) {
      case 'send-code':
        return await handleSendCode(request, phoneNumber);
      case 'verify-code':
        return await handleVerifyCode(request, phoneNumber, phoneCodeHash, phoneCode, password);
      case 'logout':
        return await handleLogout(request);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in auth endpoint:', error);
    return NextResponse.json({ 
      error: error.message || 'Authentication failed'
    }, { status: 500 });
  }
}

async function handleSendCode(request: NextRequest, phoneNumber: string) {
  if (!phoneNumber) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  const normalizedPhoneNumber = phoneNumber.trim().replace(/\s+/g, '');
  if (!normalizedPhoneNumber.startsWith('+') || !/^\+\d+$/.test(normalizedPhoneNumber)) {
    return NextResponse.json({ 
      error: 'Phone number must start with country code (e.g. +1) and contain only digits' 
    }, { status: 400 });
  }

  try {
    // Try re-using a previously created anonymous client or a session based client (if present).
    // This helps avoid triggering FloodWait by creating multiple short-lived clients.

    const { sessionString } = getSessionFromRequest(request);

    // We only force a new client if no client exists for this key or the previous attempt threw AUTH_RESTART.
    let client = await getClient(sessionString, false);
    
    // If the client is connected but somehow already authorised (e.g. user restarted flow) we log out to start fresh.
    if (await client.isUserAuthorized()) {
      console.log('⚠️ Client already authorized, logging out to start fresh auth flow');
      try {
        await client.invoke(new Api.auth.LogOut());
      } catch (logoutError) {
        console.warn('⚠️ Error during logout (continuing anyway):', logoutError);
      }
    }

    const apiId = parseInt(process.env.TELEGRAM_API_ID || process.env.NEXT_PUBLIC_TELEGRAM_API_ID || '0');
    const apiHash = process.env.TELEGRAM_API_HASH || process.env.NEXT_PUBLIC_TELEGRAM_API_HASH || '';
    
    if (!apiId || !apiHash) {
      throw new Error('API credentials not found');
    }

    console.log('📞 Sending code to:', normalizedPhoneNumber);
    const result = await client.invoke(new Api.auth.SendCode({
      phoneNumber: normalizedPhoneNumber,
      apiId,
      apiHash,
      settings: new Api.CodeSettings({
        allowFlashcall: false,
        currentNumber: true,
        allowAppHash: true,
      })
    }));

    const phoneCodeHash = (result as any).phoneCodeHash;
    if (!phoneCodeHash) {
      throw new Error('Failed to get phone code hash from Telegram');
    }

    const savedSession = safeSessionSave(client);
    const response = NextResponse.json({
      success: true,
      phoneCodeHash,
      message: 'Code sent successfully'
    });

    createSessionResponse(savedSession, response);
    return response;
  } catch (error: any) {
    console.error('❌ Send code error:', error);
    
    // ------------------------------------------------------------------
    // Detect AUTH_RESTART (happens when Telegram invalidates the attempt)
    // ------------------------------------------------------------------
    if (error.message?.includes('AUTH_RESTART')) {
      console.log('🔄 AUTH_RESTART detected, attempting recovery...');
      
      try {
        // Force create a completely new client and try again
        console.log('🔄 Creating fresh client for AUTH_RESTART recovery');
        const freshClient = await getClient(null, true); // forceNew = true
        
        const apiId = parseInt(process.env.TELEGRAM_API_ID || process.env.NEXT_PUBLIC_TELEGRAM_API_ID || '0');
        const apiHash = process.env.TELEGRAM_API_HASH || process.env.NEXT_PUBLIC_TELEGRAM_API_HASH || '';
        
        const result = await freshClient.invoke(new Api.auth.SendCode({
          phoneNumber: normalizedPhoneNumber,
          apiId,
          apiHash,
          settings: new Api.CodeSettings({
            allowFlashcall: false,
            currentNumber: true,
            allowAppHash: true,
          })
        }));

        const phoneCodeHash = (result as any).phoneCodeHash;
        if (!phoneCodeHash) {
          throw new Error('Failed to get phone code hash from Telegram');
        }

        const savedSession = safeSessionSave(freshClient);
        const response = NextResponse.json({
          success: true,
          phoneCodeHash,
          message: 'Code sent successfully (after auth restart)'
        });

        // Clear any previous session and set the new one
        clearSessionFromResponse(response);
        createSessionResponse(savedSession, response);
        return response;
      } catch (retryError: any) {
        console.error('❌ AUTH_RESTART recovery failed:', retryError);
        return NextResponse.json({
          success: false,
          error: 'Authentication restart required. Please try again in a few moments.',
          authRestart: true
        }, { status: 500 });
      }
    }
    
    // Detect FLOOD WAIT via error properties or message
    if (error.code === 420 || (typeof error.seconds === 'number') || error.message?.includes('FLOOD_WAIT')) {
      // Prefer the explicit seconds value when available
      const waitTime = typeof error.seconds === 'number'
        ? error.seconds
        : (() => {
            const match = error.message?.match(/FLOOD_WAIT_(\d+)/);
            return match ? parseInt(match[1]) : null;
          })();
      
      return NextResponse.json({
        success: false,
        floodWait: true,
        waitTime,
        error: waitTime 
          ? `Too many attempts. Please wait ${waitTime} seconds before trying again.`
          : 'Too many attempts. Please wait before trying again.'
      }, { status: 429 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send code'
    }, { status: 500 });
  }
}

async function handleVerifyCode(request: NextRequest, phoneNumber: string, phoneCodeHash: string, phoneCode: string, password?: string) {
  if (!phoneNumber || !phoneCodeHash || !phoneCode) {
    return NextResponse.json({
      success: false,
      error: 'Phone number, code hash, and verification code are required'
    }, { status: 400 });
  }

  if (!/^\d+$/.test(phoneCode.trim())) {
    return NextResponse.json({
      success: false,
      codeInvalid: true,
      error: 'Verification code should contain only digits'
    }, { status: 400 });
  }

  try {
    const { sessionString } = getSessionFromRequest(request);
    const client = await getClient(sessionString);

    if (await client.isUserAuthorized()) {
      const updatedSession = safeSessionSave(client);
      const response = NextResponse.json({
        success: true,
        message: 'Already authenticated'
      });
      createSessionResponse(updatedSession, response);
      return response;
    }

    const normalizedPhoneNumber = phoneNumber.trim().replace(/\s+/g, '');

    try {
      await client.invoke(new Api.auth.SignIn({
        phoneNumber: normalizedPhoneNumber,
        phoneCodeHash,
        phoneCode
      }));
    } catch (error: any) {
      if (error.message?.includes('PASSWORD_REQUIRED')) {
        if (!password) {
          const updatedSession = safeSessionSave(client);
          const response = NextResponse.json({
            success: false,
            passwordRequired: true,
            message: '2FA password required'
          });
          createSessionResponse(updatedSession, response);
          return response;
        }

        return NextResponse.json({
          success: false,
          error: '2FA authentication is not fully implemented yet'
        }, { status: 501 });
      }
      throw error;
    }

    const updatedSession = safeSessionSave(client);
    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful'
    });

    createSessionResponse(updatedSession, response);
    return response;
  } catch (error: any) {
    if (error.message?.includes('PHONE_CODE_EXPIRED')) {
      return NextResponse.json({
        success: false,
        codeExpired: true,
        error: 'Verification code has expired. Please request a new code.'
      }, { status: 400 });
    }

    if (error.message?.includes('PHONE_CODE_INVALID')) {
      return NextResponse.json({
        success: false,
        codeInvalid: true,
        error: 'Invalid verification code. Please check and try again.'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to verify code'
    }, { status: 500 });
  }
}

async function handleLogout(request: NextRequest) {
  try {
    const { sessionString } = getSessionFromRequest(request);

    if (!sessionString) {
      const response = NextResponse.json({
        success: true,
        message: 'No active session to logout from'
      });
      clearSessionFromResponse(response);
      return response;
    }

    const client = await getClient(sessionString);
    
    if (client.connected) {
      try {
        await client.invoke(new Api.auth.LogOut());
      } catch (logoutError) {
        console.warn('Error during Telegram API logout:', logoutError);
      }
    }
    
    await disconnectClient(sessionString);
    
    const response = NextResponse.json({
      success: true,
      message: 'Successfully logged out'
    });
    
    clearSessionFromResponse(response);
    return response;
  } catch (error: any) {
    const { sessionString } = getSessionFromRequest(request);
    if (sessionString) {
      await disconnectClient(sessionString);
    }
    
    const response = NextResponse.json({
      success: false,
      error: error.message || 'Error during logout'
    }, { status: 500 });
    
    clearSessionFromResponse(response);
    return response;
  }
} 