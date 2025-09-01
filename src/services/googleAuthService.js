// src/services/googleAuthService.js
class GoogleAuthService {
  constructor() {
    this.clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000/auth/callback';
    this.tokenKey = 'deepwork_google_tokens';
  }

  // Helper method for API requests with proper error handling
  async makeAuthRequest(url, options = {}) {
    try {
      console.log('Making auth request to:', url);
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...options.headers,
        },
      });

      console.log('Auth response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Auth API Error:', errorText);
        throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Google Auth API Error:', error);
      throw error;
    }
  }

  // Generate OAuth URL with offline access for long-lived tokens
  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      access_type: 'offline', // Ensures we get refresh token
      prompt: 'consent',      // Forces consent screen to get refresh token
      approval_prompt: 'force' // Legacy parameter for extra compatibility
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  // Exchange code for tokens with retry logic
  async exchangeCodeForTokens(code, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Exchanging code for tokens (attempt ${attempt}/${retries})`);
        
        const params = new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
        });

        const response = await this.makeAuthRequest('https://oauth2.googleapis.com/token', {
          method: 'POST',
          body: params,
        });

        // Save tokens with extended expiry
        this.saveTokens(response);
        return response;

      } catch (error) {
        console.error(`Auth attempt ${attempt} failed:`, error);
        
        if (attempt === retries) {
          throw new Error(`Authentication failed after ${retries} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Save tokens with error handling and long expiry
  saveTokens(tokens) {
    try {
      const tokenData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        // Set expiry to a very long time if user doesn't want time limits
        // Use actual expires_in but with generous buffer
        expires_at: Date.now() + ((tokens.expires_in || 3600) * 1000),
        token_type: tokens.token_type || 'Bearer',
        // Flag to indicate user wants persistent session
        persistent_session: true,
        created_at: Date.now()
      };
      
      localStorage.setItem(this.tokenKey, JSON.stringify(tokenData));
      console.log('Tokens saved successfully with persistent session');
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw new Error('Failed to save authentication tokens');
    }
  }

  // Get stored tokens
  getTokens() {
    try {
      const tokens = localStorage.getItem(this.tokenKey);
      return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      return null;
    }
  }

  // Check if user is authenticated - more lenient for persistent sessions
  isAuthenticated() {
    const tokens = this.getTokens();
    if (!tokens || !tokens.access_token) {
      return false;
    }

    // If it's a persistent session, be more lenient with expiry
    if (tokens.persistent_session) {
      // Check if token is extremely old (30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      if (tokens.created_at && tokens.created_at > thirtyDaysAgo) {
        return true;
      }
    }

    // Standard expiry check with small buffer
    const oneMinuteFromNow = Date.now() + (1 * 60 * 1000);
    return tokens.expires_at > oneMinuteFromNow;
  }

  // Get valid access token with automatic refresh
  async getValidAccessToken() {
    const tokens = this.getTokens();
    if (!tokens) {
      throw new Error('No authentication tokens found');
    }

    // If token is still valid, return it
    if (this.isAuthenticated()) {
      return tokens.access_token;
    }

    // Try to refresh token if available
    if (tokens.refresh_token) {
      try {
        console.log('Refreshing access token...');
        await this.refreshTokens(tokens.refresh_token);
        const newTokens = this.getTokens();
        return newTokens?.access_token;
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Don't clear tokens immediately for persistent sessions
        if (!tokens.persistent_session) {
          this.clearTokens();
        }
        throw new Error('Authentication expired. Please sign in again.');
      }
    }

    throw new Error('Authentication expired. Please sign in again.');
  }

  // Refresh tokens with enhanced error handling
  async refreshTokens(refreshToken) {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await this.makeAuthRequest('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: params,
      });

      // Update stored tokens
      const currentTokens = this.getTokens();
      const updatedTokens = {
        ...currentTokens,
        access_token: response.access_token,
        expires_at: Date.now() + (response.expires_in * 1000),
        // Keep the persistent session flag
        persistent_session: currentTokens.persistent_session,
        last_refreshed: Date.now()
      };

      // Update refresh token if provided
      if (response.refresh_token) {
        updatedTokens.refresh_token = response.refresh_token;
      }

      this.saveTokens(updatedTokens);
      console.log('Tokens refreshed successfully');
      return response;

    } catch (error) {
      console.error('Error refreshing tokens:', error);
      throw error;
    }
  }

  // Clear stored tokens
  clearTokens() {
    try {
      localStorage.removeItem(this.tokenKey);
      console.log('Tokens cleared');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Sign out - only clears when user explicitly signs out
  signOut() {
    this.clearTokens();
    console.log('User signed out - tokens cleared');
  }

  // Check if session is persistent
  isPersistentSession() {
    const tokens = this.getTokens();
    return tokens?.persistent_session || false;
  }

  // Get session info for display
  getSessionInfo() {
    const tokens = this.getTokens();
    if (!tokens) return null;

    return {
      isAuthenticated: this.isAuthenticated(),
      isPersistent: tokens.persistent_session,
      createdAt: tokens.created_at,
      lastRefreshed: tokens.last_refreshed,
      expiresAt: tokens.expires_at
    };
  }
}

export default new GoogleAuthService();