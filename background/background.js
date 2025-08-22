/**
 * Background Service Worker
 * Handles Google Sheets API integration and extension lifecycle
 */

class BackgroundService {
  constructor() {
    this.authManager = null;
    this.sheetsAPI = null;
    this.initialized = false;
    
    this.init();
  }

  /**
   * Initialize background service
   */
  async init() {
    try {
      // Import modules
      await this.loadModules();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize components
      this.authManager = new GoogleAuthManager();
      this.sheetsAPI = new SheetsAPI();
      
      this.initialized = true;
      console.log('LinkedIn Consolidator background service initialized');
      
    } catch (error) {
      console.error('Failed to initialize background service:', error);
    }
  }

  /**
   * Load required modules
   */
  async loadModules() {
    // Modules are loaded via import in manifest
    // This is a placeholder for any dynamic imports if needed
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });
  }

  /**
   * Handle extension installation
   */
  async handleInstallation(details) {
    console.log('Extension installed:', details);
    
    if (details.reason === 'install') {
      // First time installation
      await this.setupDefaultSettings();
      
      // Open welcome page
      chrome.tabs.create({
        url: chrome.runtime.getURL('options/options.html?welcome=true')
      });
    } else if (details.reason === 'update') {
      // Extension updated
      console.log('Extension updated from version:', details.previousVersion);
    }
  }

  /**
   * Handle messages from content scripts and popup
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'EXPORT_TO_SHEETS':
          sendResponse(await this.exportToSheets(message.posts));
          break;

        case 'AUTHENTICATE_GOOGLE':
          sendResponse(await this.authenticateGoogle());
          break;

        case 'GET_AUTH_STATUS':
          sendResponse(await this.getAuthStatus());
          break;

        case 'REVOKE_AUTH':
          sendResponse(await this.revokeAuth());
          break;

        case 'CREATE_SHEET':
          sendResponse(await this.createSheet(message.title));
          break;

        case 'LIST_SHEETS':
          sendResponse(await this.listSheets());
          break;

        case 'CONTENT_SCRIPT_READY':
          this.handleContentScriptReady(sender.tab);
          sendResponse({ success: true });
          break;

        case 'ERROR_LOGGED':
          this.handleErrorLogged(message.error, sender.tab);
          sendResponse({ success: true });
          break;

        case 'GET_EXTENSION_INFO':
          sendResponse(await this.getExtensionInfo());
          break;

        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * Handle tab updates
   */
  handleTabUpdate(tabId, changeInfo, tab) {
    // Check if tab is LinkedIn and content script is needed
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('linkedin.com')) {
      // Content script should auto-inject via manifest
      console.log('LinkedIn tab loaded:', tab.url);
    }
  }

  /**
   * Handle extension startup
   */
  handleStartup() {
    console.log('Extension started');
  }

  /**
   * Setup default settings
   */
  async setupDefaultSettings() {
    const defaultSettings = {
      googleSheetsId: '',
      autoExport: false,
      dataFields: ['url', 'author', 'content', 'metrics', 'timestamp'],
      scanningPreferences: {
        includeImages: true,
        includeVideos: true,
        maxPostsPerScan: 100
      },
      exportFormat: 'detailed',
      notifications: true,
      debugMode: false
    };

    await chrome.storage.sync.set({ settings: defaultSettings });
    console.log('Default settings configured');
  }

  /**
   * Export posts to Google Sheets
   */
  async exportToSheets(posts) {
    try {
      if (!posts || posts.length === 0) {
        throw new Error('No posts to export');
      }

      // Check authentication
      const authStatus = await this.getAuthStatus();
      if (!authStatus.authenticated) {
        throw new Error('Google authentication required');
      }

      // Get settings
      const { settings } = await chrome.storage.sync.get('settings');
      
      let sheetId = settings.googleSheetsId;
      
      // Create new sheet if none specified
      if (!sheetId) {
        const timestamp = new Date().toISOString().split('T')[0];
        const sheetTitle = `LinkedIn Posts Export - ${timestamp}`;
        const createResult = await this.createSheet(sheetTitle);
        sheetId = createResult.sheetId;
        
        // Save sheet ID to settings
        settings.googleSheetsId = sheetId;
        await chrome.storage.sync.set({ settings });
      }

      // Export posts
      const result = await this.sheetsAPI.exportPosts(posts, sheetId);
      
      return {
        success: true,
        sheetId: sheetId,
        sheetUrl: result.sheetUrl,
        exportedCount: posts.length
      };

    } catch (error) {
      console.error('Export to sheets failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Authenticate with Google
   */
  async authenticateGoogle() {
    try {
      const result = await this.authManager.authenticate();
      return {
        success: true,
        authenticated: true,
        user: result.user
      };
    } catch (error) {
      console.error('Google authentication failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get authentication status
   */
  async getAuthStatus() {
    try {
      const isAuthenticated = await this.authManager.isAuthenticated();
      const user = isAuthenticated ? await this.authManager.getUserInfo() : null;
      
      return {
        authenticated: isAuthenticated,
        user: user
      };
    } catch (error) {
      console.error('Error checking auth status:', error);
      return {
        authenticated: false,
        error: error.message
      };
    }
  }

  /**
   * Revoke authentication
   */
  async revokeAuth() {
    try {
      await this.authManager.revokeAuth();
      return { success: true };
    } catch (error) {
      console.error('Error revoking auth:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create new Google Sheet
   */
  async createSheet(title) {
    try {
      const result = await this.sheetsAPI.createSheet(title);
      return {
        success: true,
        sheetId: result.sheetId,
        sheetUrl: result.sheetUrl
      };
    } catch (error) {
      console.error('Error creating sheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List user's Google Sheets
   */
  async listSheets() {
    try {
      const sheets = await this.sheetsAPI.listSheets();
      return {
        success: true,
        sheets: sheets
      };
    } catch (error) {
      console.error('Error listing sheets:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle content script ready
   */
  handleContentScriptReady(tab) {
    console.log('Content script ready on tab:', tab.id, tab.url);
    
    // Update badge or icon if needed
    this.updateBadge(tab.id);
  }

  /**
   * Handle error logged from content script
   */
  handleErrorLogged(error, tab) {
    console.error('Error from content script:', error, 'Tab:', tab.url);
    
    // Could implement error reporting here
  }

  /**
   * Get extension information
   */
  async getExtensionInfo() {
    const manifest = chrome.runtime.getManifest();
    const authStatus = await this.getAuthStatus();
    
    return {
      version: manifest.version,
      name: manifest.name,
      authenticated: authStatus.authenticated,
      user: authStatus.user
    };
  }

  /**
   * Update extension badge
   */
  updateBadge(tabId, text = '', color = '#0a66c2') {
    chrome.action.setBadgeText({
      text: text,
      tabId: tabId
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: color,
      tabId: tabId
    });
  }

  /**
   * Show notification
   */
  showNotification(title, message, type = 'basic') {
    chrome.notifications.create({
      type: type,
      iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
      title: title,
      message: message
    });
  }
}

// Initialize background service
const backgroundService = new BackgroundService();

// Make it globally available for debugging
self.BackgroundService = backgroundService;