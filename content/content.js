/**
 * Main Content Script
 * Initializes and coordinates all content script components using dynamic imports
 */

class LinkedInConsolidator {
  constructor() {
    this.initialized = false;
    this.components = {};
    this.settings = null;
    
    this.init();
  }

  /**
   * Initialize the extension
   */
  async init() {
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
      } else {
        this.initializeComponents();
      }
      
    } catch (error) {
      console.error('[LinkedIn Consolidator] Main Content Script Error:', error);
    }
  }

  /**
   * Initialize all components
   */
  async initializeComponents() {
    try {
      // Check if we're on LinkedIn
      if (!this.isLinkedInPage()) {
        console.info('[LinkedIn Consolidator] Not on LinkedIn, skipping initialization');
        return;
      }

      console.info('[LinkedIn Consolidator] Initializing LinkedIn Post Consolidator');

      // Load all modules using dynamic imports
      await this.loadModules();

      // Load settings
      this.settings = await this.components.storage.getSettings();

      // Set up message listeners
      this.setupMessageListeners();

      // Set up page visibility handling
      this.setupVisibilityHandling();

      // Mark as initialized
      this.initialized = true;

      console.info('[LinkedIn Consolidator] LinkedIn Post Consolidator initialized successfully');

      // Notify background script
      this.notifyBackgroundScript('CONTENT_SCRIPT_READY');

    } catch (error) {
      console.error('[LinkedIn Consolidator] Main Content Script Error:', error);
    }
  }

  /**
   * Load all required modules using dynamic imports
   */
  async loadModules() {
    try {
      // Import utility modules
      const [
        { Storage },
        { LinkedInSelectors },
        { DataFormatter },
        { ErrorHandler, handleError, handleWarning, handleInfo },
        { PostExtractor },
        { DOMScanner },
        { UIOverlay }
      ] = await Promise.all([
        import(chrome.runtime.getURL('utils/storage.js')),
        import(chrome.runtime.getURL('utils/linkedin-selectors.js')),
        import(chrome.runtime.getURL('utils/data-formatter.js')),
        import(chrome.runtime.getURL('utils/error-handler.js')),
        import(chrome.runtime.getURL('content/post-extractor.js')),
        import(chrome.runtime.getURL('content/dom-scanner.js')),
        import(chrome.runtime.getURL('content/ui-overlay.js'))
      ]);

      // Initialize base components first
      const storage = new Storage();
      const selectors = new LinkedInSelectors();
      const formatter = new DataFormatter();
      const errorHandler = new ErrorHandler();

      // Initialize components that depend on base components
      const extractor = new PostExtractor(selectors, formatter, errorHandler);
      const scanner = new DOMScanner(selectors, extractor, storage, errorHandler);
      const overlay = new UIOverlay(scanner, storage, errorHandler);

      // Store all components
      this.components = {
        storage,
        selectors,
        formatter,
        errorHandler,
        extractor,
        scanner,
        overlay
      };

      // Set up global error handlers for backward compatibility
      window.handleError = handleError;
      window.handleWarning = handleWarning;
      window.handleInfo = handleInfo;

      console.info('[LinkedIn Consolidator] All modules loaded successfully');

    } catch (error) {
      console.error('[LinkedIn Consolidator] Failed to load modules:', error);
      throw error;
    }
  }

  /**
   * Check if current page is LinkedIn
   */
  isLinkedInPage() {
    return window.location.hostname.includes('linkedin.com');
  }

  /**
   * Setup message listeners for communication with background script
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    console.info('[LinkedIn Consolidator] Message listeners set up');
  }

  /**
   * Handle messages from background script or popup
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_PAGE_INFO':
          sendResponse(await this.getPageInfo());
          break;

        case 'START_SCAN':
          sendResponse(await this.startScan(message.options));
          break;

        case 'STOP_SCAN':
          sendResponse(await this.stopScan());
          break;

        case 'GET_EXTRACTED_POSTS':
          sendResponse(await this.getExtractedPosts());
          break;

        case 'CLEAR_POSTS':
          sendResponse(await this.clearPosts());
          break;

        case 'GET_SETTINGS':
          sendResponse(await this.getSettings());
          break;

        case 'UPDATE_SETTINGS':
          sendResponse(await this.updateSettings(message.settings));
          break;

        case 'TOGGLE_OVERLAY':
          sendResponse(await this.toggleOverlay());
          break;

        case 'GET_ERROR_LOG':
          sendResponse(await this.getErrorLog());
          break;

        case 'PING':
          sendResponse({ status: 'ready', initialized: this.initialized });
          break;

        default:
          console.warn('[LinkedIn Consolidator] Unknown message type:', message.type);
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[LinkedIn Consolidator] Message handling error:', error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * Setup page visibility handling
   */
  setupVisibilityHandling() {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageHidden();
      } else {
        this.handlePageVisible();
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.handlePageUnload();
    });

    console.info('[LinkedIn Consolidator] Visibility handling set up');
  }

  /**
   * Handle page becoming hidden
   */
  handlePageHidden() {
    console.info('[LinkedIn Consolidator] Page hidden');
  }

  /**
   * Handle page becoming visible
   */
  handlePageVisible() {
    console.info('[LinkedIn Consolidator] Page visible');
  }

  /**
   * Handle page unload
   */
  handlePageUnload() {
    this.cleanup();
  }

  /**
   * Get current page information
   */
  async getPageInfo() {
    if (!this.components.scanner) {
      throw new Error('Scanner not initialized');
    }

    return this.components.scanner.getPageInfo();
  }

  /**
   * Start scanning for posts
   */
  async startScan(options = {}) {
    if (!this.components.scanner) {
      throw new Error('Scanner not initialized');
    }

    try {
      const posts = await this.components.scanner.startScan(options);
      return { success: true, posts: posts, count: posts.length };
    } catch (error) {
      throw new Error(`Scan failed: ${error.message}`);
    }
  }

  /**
   * Stop current scan
   */
  async stopScan() {
    if (!this.components.scanner) {
      throw new Error('Scanner not initialized');
    }

    this.components.scanner.stopScan();
    return { success: true };
  }

  /**
   * Get extracted posts
   */
  async getExtractedPosts() {
    if (!this.components.scanner) {
      throw new Error('Scanner not initialized');
    }

    const posts = this.components.scanner.getExtractedPosts();
    return { posts: posts, count: posts.length };
  }

  /**
   * Clear extracted posts
   */
  async clearPosts() {
    if (!this.components.scanner) {
      throw new Error('Scanner not initialized');
    }

    this.components.scanner.clearExtractedPosts();
    await this.components.storage.savePosts([]);
    return { success: true };
  }

  /**
   * Get current settings
   */
  async getSettings() {
    if (!this.components.storage) {
      throw new Error('Storage not initialized');
    }

    return await this.components.storage.getSettings();
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings) {
    if (!this.components.storage) {
      throw new Error('Storage not initialized');
    }

    const success = await this.components.storage.saveSettings(newSettings);
    if (success) {
      this.settings = newSettings;
      return { success: true };
    } else {
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Toggle overlay visibility
   */
  async toggleOverlay() {
    if (!this.components.overlay) {
      throw new Error('Overlay not initialized');
    }

    this.components.overlay.toggleOverlay();
    return { success: true };
  }

  /**
   * Get error log
   */
  async getErrorLog() {
    if (!this.components.errorHandler) {
      throw new Error('Error handler not initialized');
    }

    return {
      errors: this.components.errorHandler.getRecentErrors(50),
      stats: this.components.errorHandler.getErrorStats()
    };
  }

  /**
   * Notify background script
   */
  notifyBackgroundScript(type, data = {}) {
    try {
      chrome.runtime.sendMessage({
        type: type,
        data: data,
        timestamp: new Date().toISOString(),
        url: window.location.href
      }).catch(error => {
        console.warn('[LinkedIn Consolidator] Could not notify background script:', error.message);
      });
    } catch (error) {
      // Ignore errors when chrome.runtime is not available
    }
  }

  /**
   * Cleanup all components
   */
  cleanup() {
    try {
      console.info('[LinkedIn Consolidator] Cleaning up components');

      // Cleanup individual components
      if (this.components.scanner) {
        this.components.scanner.cleanup();
      }
      if (this.components.overlay) {
        this.components.overlay.cleanup();
      }

      // Clear references
      this.components = {};
      this.initialized = false;

      console.info('[LinkedIn Consolidator] Cleanup completed');

    } catch (error) {
      console.error('[LinkedIn Consolidator] Cleanup error:', error);
    }
  }

  /**
   * Get extension status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      components: Object.keys(this.components),
      url: window.location.href,
      isLinkedIn: this.isLinkedInPage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reinitialize extension (useful for debugging)
   */
  async reinitialize() {
    console.info('[LinkedIn Consolidator] Reinitializing extension');
    
    this.cleanup();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await this.initializeComponents();
    
    console.info('[LinkedIn Consolidator] Reinitialization completed');
  }
}

// Initialize the extension
const linkedInConsolidator = new LinkedInConsolidator();

// Make it globally available for debugging
window.LinkedInConsolidator = linkedInConsolidator;

// Log successful initialization
console.info('[LinkedIn Consolidator] LinkedIn Post Consolidator content script loaded');