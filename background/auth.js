/**
 * Google Authentication Manager
 * Handles OAuth2 authentication with Google APIs
 */

class GoogleAuthManager {
  constructor() {
    this.clientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // Will be replaced with actual client ID
    this.scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ];
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Authenticate user with Google
   * @returns {Promise<object>} Authentication result
   */
  async authenticate() {
    try {
      // Use Chrome Identity API for OAuth2
      const token = await this.getAuthToken(true);
      
      if (!token) {
        throw new Error('Failed to obtain access token');
      }

      this.accessToken = token;
      
      // Get user info
      const userInfo = await this.getUserInfo();
      
      // Store tokens securely
      await this.storeTokens(token);
      
      console.log('Google authentication successful');
      
      return {
        success: true,
        user: userInfo,
        token: token
      };

    } catch (error) {
      console.error('Google authentication failed:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Get authentication token using Chrome Identity API
   * @param {boolean} interactive - Whether to show interactive login
   * @returns {Promise<string>} Access token
   */
  async getAuthToken(interactive = false) {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken(
        { 
          interactive: interactive,
          scopes: this.scopes
        },
        (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(token);
          }
        }
      );
    });
  }

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>} Authentication status
   */
  async isAuthenticated() {
    try {
      // Try to get cached token
      const cachedToken = await this.getCachedToken();
      
      if (cachedToken && !this.isTokenExpired(cachedToken)) {
        this.accessToken = cachedToken.token;
        return true;
      }

      // Try to get token silently (non-interactive)
      const token = await this.getAuthToken(false);
      
      if (token) {
        this.accessToken = token;
        await this.storeTokens(token);
        return true;
      }

      return false;

    } catch (error) {
      console.warn('Authentication check failed:', error);
      return false;
    }
  }

  /**
   * Get current access token
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    if (this.accessToken && !this.isTokenExpired()) {
      return this.accessToken;
    }

    // Try to refresh token
    const token = await this.getAuthToken(false);
    
    if (token) {
      this.accessToken = token;
      await this.storeTokens(token);
      return token;
    }

    throw new Error('No valid access token available');
  }

  /**
   * Get user information from Google
   * @returns {Promise<object>} User information
   */
  async getUserInfo() {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.statusText}`);
      }

      const userInfo = await response.json();
      
      return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        verified_email: userInfo.verified_email
      };

    } catch (error) {
      console.error('Failed to get user info:', error);
      throw error;
    }
  }

  /**
   * Revoke authentication
   * @returns {Promise<void>}
   */
  async revokeAuth() {
    try {
      // Revoke token with Google
      if (this.accessToken) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${this.accessToken}`, {
          method: 'POST'
        });
      }

      // Remove cached token using Chrome Identity API
      const token = await this.getAuthToken(false).catch(() => null);
      if (token) {
        chrome.identity.removeCachedAuthToken({ token: token }, () => {
          console.log('Cached token removed');
        });
      }

      // Clear stored tokens
      await this.clearStoredTokens();
      
      // Clear instance variables
      this.accessToken = null;
      this.refreshToken = null;
      this.tokenExpiry = null;

      console.log('Authentication revoked successfully');

    } catch (error) {
      console.error('Failed to revoke authentication:', error);
      throw error;
    }
  }

  /**
   * Store tokens securely
   * @param {string} token - Access token
   */
  async storeTokens(token) {
    try {
      const tokenData = {
        token: token,
        timestamp: Date.now(),
        // Chrome Identity API handles token expiry automatically
        expiry: Date.now() + (3600 * 1000) // Assume 1 hour expiry
      };

      await chrome.storage.local.set({
        'google_auth_token': tokenData
      });

      console.log('Tokens stored securely');

    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  /**
   * Get cached token
   * @returns {Promise<object|null>} Cached token data
   */
  async getCachedToken() {
    try {
      const result = await chrome.storage.local.get('google_auth_token');
      return result.google_auth_token || null;
    } catch (error) {
      console.error('Failed to get cached token:', error);
      return null;
    }
  }

  /**
   * Clear stored tokens
   */
  async clearStoredTokens() {
    try {
      await chrome.storage.local.remove('google_auth_token');
      console.log('Stored tokens cleared');
    } catch (error) {
      console.error('Failed to clear stored tokens:', error);
    }
  }

  /**
   * Check if token is expired
   * @param {object} tokenData - Token data object
   * @returns {boolean} True if expired
   */
  isTokenExpired(tokenData = null) {
    if (!tokenData && !this.tokenExpiry) {
      return true;
    }

    const expiry = tokenData ? tokenData.expiry : this.tokenExpiry;
    const now = Date.now();
    
    // Add 5 minute buffer
    return now >= (expiry - 5 * 60 * 1000);
  }

  /**
   * Make authenticated API request
   * @param {string} url - API endpoint URL
   * @param {object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async makeAuthenticatedRequest(url, options = {}) {
    try {
      const token = await this.getAccessToken();
      
      const authOptions = {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      };

      const response = await fetch(url, authOptions);
      
      // Handle token expiry
      if (response.status === 401) {
        console.log('Token expired, attempting to refresh');
        
        // Clear current token and try again
        this.accessToken = null;
        await this.clearStoredTokens();
        
        const newToken = await this.getAccessToken();
        authOptions.headers['Authorization'] = `Bearer ${newToken}`;
        
        return await fetch(url, authOptions);
      }

      return response;

    } catch (error) {
      console.error('Authenticated request failed:', error);
      throw error;
    }
  }

  /**
   * Get authentication headers
   * @returns {Promise<object>} Headers object
   */
  async getAuthHeaders() {
    const token = await this.getAccessToken();
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Validate current authentication
   * @returns {Promise<boolean>} True if valid
   */
  async validateAuth() {
    try {
      const userInfo = await this.getUserInfo();
      return !!userInfo.id;
    } catch (error) {
      console.warn('Auth validation failed:', error);
      return false;
    }
  }

  /**
   * Get authentication status details
   * @returns {Promise<object>} Status details
   */
  async getAuthStatus() {
    try {
      const isAuth = await this.isAuthenticated();
      
      if (!isAuth) {
        return {
          authenticated: false,
          user: null,
          error: null
        };
      }

      const user = await this.getUserInfo();
      
      return {
        authenticated: true,
        user: user,
        error: null
      };

    } catch (error) {
      return {
        authenticated: false,
        user: null,
        error: error.message
      };
    }
  }

  /**
   * Refresh authentication silently
   * @returns {Promise<boolean>} Success status
   */
  async refreshAuth() {
    try {
      const token = await this.getAuthToken(false);
      
      if (token) {
        this.accessToken = token;
        await this.storeTokens(token);
        return true;
      }

      return false;

    } catch (error) {
      console.warn('Silent auth refresh failed:', error);
      return false;
    }
  }
}

// Make available globally
self.GoogleAuthManager = GoogleAuthManager;