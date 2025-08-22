/**
 * Error Handler Utility
 * Centralized error handling and logging for the extension
 */

export class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
    this.debugMode = false;
    
    // Initialize error tracking
    this.init();
  }

  /**
   * Initialize error handler
   */
  init() {
    // Listen for unhandled errors
    window.addEventListener('error', (event) => {
      this.logError('Unhandled Error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', event.reason);
    });

    // Check if debug mode is enabled
    this.checkDebugMode();
  }

  /**
   * Check if debug mode is enabled
   */
  async checkDebugMode() {
    try {
      // This will be updated when Storage is imported
      this.debugMode = false;
    } catch (error) {
      console.warn('Could not check debug mode:', error);
    }
  }

  /**
   * Log an error with context
   * @param {string} type - Error type/category
   * @param {Error|string} error - Error object or message
   * @param {object} context - Additional context information
   */
  logError(type, error, context = {}) {
    const errorEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type: type,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      context: context,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Add to errors array
    this.errors.unshift(errorEntry);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console based on severity
    if (this.debugMode || this.isHighSeverity(type)) {
      console.error(`[LinkedIn Consolidator] ${type}:`, error, context);
    } else {
      console.warn(`[LinkedIn Consolidator] ${type}:`, errorEntry.message);
    }

    // Save to storage for debugging
    this.saveErrorsToStorage();

    // Send to background script for potential reporting
    this.notifyBackground(errorEntry);
  }

  /**
   * Log a warning
   * @param {string} type - Warning type
   * @param {string} message - Warning message
   * @param {object} context - Additional context
   */
  logWarning(type, message, context = {}) {
    const warningEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type: `Warning: ${type}`,
      message: message,
      context: context,
      url: window.location.href
    };

    this.errors.unshift(warningEntry);
    
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    if (this.debugMode) {
      console.warn(`[LinkedIn Consolidator] ${type}:`, message, context);
    }

    this.saveErrorsToStorage();
  }

  /**
   * Log an info message
   * @param {string} type - Info type
   * @param {string} message - Info message
   * @param {object} context - Additional context
   */
  logInfo(type, message, context = {}) {
    if (this.debugMode) {
      console.info(`[LinkedIn Consolidator] ${type}:`, message, context);
    }
  }

  /**
   * Check if error type is high severity
   * @param {string} type - Error type
   * @returns {boolean} True if high severity
   */
  isHighSeverity(type) {
    const highSeverityTypes = [
      'DOM Extraction Failed',
      'Google Sheets API Error',
      'Authentication Failed',
      'Data Loss Risk',
      'Extension Crash'
    ];
    
    return highSeverityTypes.some(severityType => 
      type.toLowerCase().includes(severityType.toLowerCase())
    );
  }

  /**
   * Save errors to storage for debugging
   */
  async saveErrorsToStorage() {
    try {
      // This will be updated when Storage is imported
      console.debug('Error log updated:', this.errors.length, 'errors');
    } catch (error) {
      console.error('Failed to save error log:', error);
    }
  }

  /**
   * Notify background script of error
   * @param {object} errorEntry - Error entry object
   */
  notifyBackground(errorEntry) {
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'ERROR_LOGGED',
          error: errorEntry
        }).catch(() => {
          // Ignore errors when background script is not available
        });
      }
    } catch (error) {
      // Ignore errors when chrome.runtime is not available
    }
  }

  /**
   * Get recent errors
   * @param {number} limit - Number of errors to return
   * @returns {Array} Array of error entries
   */
  getRecentErrors(limit = 10) {
    return this.errors.slice(0, limit);
  }

  /**
   * Get errors by type
   * @param {string} type - Error type to filter by
   * @returns {Array} Array of filtered error entries
   */
  getErrorsByType(type) {
    return this.errors.filter(error => 
      error.type.toLowerCase().includes(type.toLowerCase())
    );
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors = [];
    this.saveErrorsToStorage();
    this.logInfo('Error Handler', 'Error log cleared');
  }

  /**
   * Get error statistics
   * @returns {object} Error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errors.length,
      byType: {},
      recent24h: 0,
      recentHour: 0
    };

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    this.errors.forEach(error => {
      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;

      // Count recent errors
      const errorTime = new Date(error.timestamp);
      if (errorTime > oneDayAgo) {
        stats.recent24h++;
      }
      if (errorTime > oneHourAgo) {
        stats.recentHour++;
      }
    });

    return stats;
  }

  /**
   * Handle DOM extraction errors specifically
   * @param {string} selector - CSS selector that failed
   * @param {Element} container - Container element
   * @param {string} operation - Operation being performed
   */
  handleDOMError(selector, container, operation) {
    this.logError('DOM Extraction Failed', `Failed to find element: ${selector}`, {
      selector: selector,
      operation: operation,
      containerTag: container ? container.tagName : 'null',
      containerClass: container ? container.className : 'null',
      availableElements: container ? Array.from(container.children).map(el => el.tagName).join(', ') : 'none'
    });
  }

  /**
   * Handle API errors
   * @param {string} api - API name
   * @param {Error} error - Error object
   * @param {object} requestData - Request data that caused the error
   */
  handleAPIError(api, error, requestData = {}) {
    this.logError(`${api} API Error`, error, {
      api: api,
      requestData: requestData,
      status: error.status || 'unknown',
      statusText: error.statusText || 'unknown'
    });
  }

  /**
   * Handle authentication errors
   * @param {string} service - Service name (e.g., 'Google Sheets')
   * @param {Error} error - Error object
   */
  handleAuthError(service, error) {
    this.logError('Authentication Failed', error, {
      service: service,
      errorCode: error.code || 'unknown'
    });
  }

  /**
   * Create error report for debugging
   * @returns {object} Comprehensive error report
   */
  createErrorReport() {
    return {
      timestamp: new Date().toISOString(),
      extensionVersion: chrome.runtime.getManifest().version,
      userAgent: navigator.userAgent,
      url: window.location.href,
      stats: this.getErrorStats(),
      recentErrors: this.getRecentErrors(20),
      settings: this.debugMode ? 'Debug mode enabled' : 'Debug mode disabled'
    };
  }

  /**
   * Export errors as JSON for debugging
   * @returns {string} JSON string of error report
   */
  exportErrors() {
    return JSON.stringify(this.createErrorReport(), null, 2);
  }

  /**
   * Handle error (alias for logError)
   * @param {string} type - Error type
   * @param {Error|string} error - Error object or message
   * @param {object} context - Additional context
   */
  handleError(type, error, context = {}) {
    this.logError(type, error, context);
  }

  /**
   * Handle warning (alias for logWarning)
   * @param {string} type - Warning type
   * @param {string} message - Warning message
   * @param {object} context - Additional context
   */
  handleWarning(type, message, context = {}) {
    this.logWarning(type, message, context);
  }

  /**
   * Handle info (alias for logInfo)
   * @param {string} type - Info type
   * @param {string} message - Info message
   * @param {object} context - Additional context
   */
  handleInfo(type, message, context = {}) {
    this.logInfo(type, message, context);
  }
}

// Helper functions for common error scenarios
export const handleError = (type, error, context) => {
  console.error(`[LinkedIn Consolidator] ${type}:`, error, context);
};

export const handleWarning = (type, message, context) => {
  console.warn(`[LinkedIn Consolidator] ${type}:`, message, context);
};

export const handleInfo = (type, message, context) => {
  console.info(`[LinkedIn Consolidator] ${type}:`, message, context);
};