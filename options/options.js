/**
 * Options page JavaScript for LinkedIn Post Consolidation Extension
 * Handles tab switching, authentication, settings persistence, and form validation
 */

class OptionsManager {
    constructor() {
        this.currentTab = 'general';
        this.authManager = null;
        this.init();
    }

    async init() {
        this.setupTabSwitching();
        this.setupEventListeners();
        await this.loadSettings();
        this.setupAuthManager();
    }

    /**
     * Setup tab switching functionality
     */
    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }

    /**
     * Switch to specified tab
     */
    switchTab(tabId) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');

        this.currentTab = tabId;
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Google authentication
        document.getElementById('connect-google').addEventListener('click', () => this.handleGoogleAuth());
        document.getElementById('disconnect-google').addEventListener('click', () => this.handleGoogleDisconnect());

        // Settings form submissions
        document.getElementById('general-form').addEventListener('submit', (e) => this.handleGeneralSettings(e));
        document.getElementById('extraction-form').addEventListener('submit', (e) => this.handleExtractionSettings(e));
        document.getElementById('export-form').addEventListener('submit', (e) => this.handleExportSettings(e));

        // Test connections
        document.getElementById('test-sheets-connection').addEventListener('click', () => this.testSheetsConnection());

        // Reset buttons
        document.getElementById('reset-general').addEventListener('click', () => this.resetGeneralSettings());
        document.getElementById('reset-extraction').addEventListener('click', () => this.resetExtractionSettings());
        document.getElementById('reset-export').addEventListener('click', () => this.resetExportSettings());

        // Import/Export settings
        document.getElementById('export-settings').addEventListener('click', () => this.exportSettings());
        document.getElementById('import-settings').addEventListener('click', () => this.importSettings());
        document.getElementById('settings-file').addEventListener('change', (e) => this.handleSettingsImport(e));

        // Real-time validation
        this.setupRealTimeValidation();
    }

    /**
     * Setup real-time form validation
     */
    setupRealTimeValidation() {
        // Spreadsheet URL validation
        const spreadsheetUrl = document.getElementById('spreadsheet-url');
        spreadsheetUrl.addEventListener('input', (e) => {
            this.validateSpreadsheetUrl(e.target.value);
        });

        // Sheet name validation
        const sheetName = document.getElementById('sheet-name');
        sheetName.addEventListener('input', (e) => {
            this.validateSheetName(e.target.value);
        });

        // Batch size validation
        const batchSize = document.getElementById('batch-size');
        batchSize.addEventListener('input', (e) => {
            this.validateBatchSize(e.target.value);
        });
    }

    /**
     * Load all settings from storage
     */
    async loadSettings() {
        try {
            const settings = await chrome.storage.sync.get([
                'autoScan',
                'scanInterval',
                'extractImages',
                'extractMetrics',
                'extractComments',
                'spreadsheetUrl',
                'sheetName',
                'batchSize',
                'autoExport',
                'googleAuth'
            ]);

            // General settings
            document.getElementById('auto-scan').checked = settings.autoScan || false;
            document.getElementById('scan-interval').value = settings.scanInterval || 5;

            // Extraction settings
            document.getElementById('extract-images').checked = settings.extractImages !== false;
            document.getElementById('extract-metrics').checked = settings.extractMetrics !== false;
            document.getElementById('extract-comments').checked = settings.extractComments || false;

            // Export settings
            document.getElementById('spreadsheet-url').value = settings.spreadsheetUrl || '';
            document.getElementById('sheet-name').value = settings.sheetName || 'LinkedIn Posts';
            document.getElementById('batch-size').value = settings.batchSize || 50;
            document.getElementById('auto-export').checked = settings.autoExport || false;

            // Update auth status
            this.updateAuthStatus(settings.googleAuth);

        } catch (error) {
            console.error('Error loading settings:', error);
            this.showNotification('Error loading settings', 'error');
        }
    }

    /**
     * Setup authentication manager
     */
    setupAuthManager() {
        // This will communicate with the background script for auth
        this.authManager = {
            authenticate: () => this.sendMessage({ action: 'authenticate' }),
            disconnect: () => this.sendMessage({ action: 'disconnect' }),
            getAuthStatus: () => this.sendMessage({ action: 'getAuthStatus' })
        };
    }

    /**
     * Handle Google authentication
     */
    async handleGoogleAuth() {
        try {
            this.showLoading('connect-google', 'Connecting...');
            
            const result = await this.authManager.authenticate();
            
            if (result.success) {
                await chrome.storage.sync.set({ googleAuth: result.authInfo });
                this.updateAuthStatus(result.authInfo);
                this.showNotification('Successfully connected to Google!', 'success');
            } else {
                throw new Error(result.error || 'Authentication failed');
            }
        } catch (error) {
            console.error('Authentication error:', error);
            this.showNotification('Failed to connect to Google: ' + error.message, 'error');
        } finally {
            this.hideLoading('connect-google', 'Connect Google Account');
        }
    }

    /**
     * Handle Google disconnection
     */
    async handleGoogleDisconnect() {
        try {
            await this.authManager.disconnect();
            await chrome.storage.sync.remove('googleAuth');
            this.updateAuthStatus(null);
            this.showNotification('Disconnected from Google', 'success');
        } catch (error) {
            console.error('Disconnect error:', error);
            this.showNotification('Error disconnecting: ' + error.message, 'error');
        }
    }

    /**
     * Update authentication status display
     */
    updateAuthStatus(authInfo) {
        const authStatus = document.getElementById('auth-status');
        const connectBtn = document.getElementById('connect-google');
        const disconnectBtn = document.getElementById('disconnect-google');

        if (authInfo && authInfo.email) {
            authStatus.innerHTML = `
                <div class="auth-success">
                    <span class="status-icon">✓</span>
                    Connected as: ${authInfo.email}
                </div>
            `;
            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'inline-block';
        } else {
            authStatus.innerHTML = `
                <div class="auth-disconnected">
                    <span class="status-icon">⚠</span>
                    Not connected to Google
                </div>
            `;
            connectBtn.style.display = 'inline-block';
            disconnectBtn.style.display = 'none';
        }
    }

    /**
     * Handle general settings form submission
     */
    async handleGeneralSettings(e) {
        e.preventDefault();
        
        try {
            const settings = {
                autoScan: document.getElementById('auto-scan').checked,
                scanInterval: parseInt(document.getElementById('scan-interval').value)
            };

            await chrome.storage.sync.set(settings);
            this.showNotification('General settings saved!', 'success');
        } catch (error) {
            console.error('Error saving general settings:', error);
            this.showNotification('Error saving settings', 'error');
        }
    }

    /**
     * Handle extraction settings form submission
     */
    async handleExtractionSettings(e) {
        e.preventDefault();
        
        try {
            const settings = {
                extractImages: document.getElementById('extract-images').checked,
                extractMetrics: document.getElementById('extract-metrics').checked,
                extractComments: document.getElementById('extract-comments').checked
            };

            await chrome.storage.sync.set(settings);
            this.showNotification('Extraction settings saved!', 'success');
        } catch (error) {
            console.error('Error saving extraction settings:', error);
            this.showNotification('Error saving settings', 'error');
        }
    }

    /**
     * Handle export settings form submission
     */
    async handleExportSettings(e) {
        e.preventDefault();
        
        const spreadsheetUrl = document.getElementById('spreadsheet-url').value;
        const sheetName = document.getElementById('sheet-name').value;
        const batchSize = parseInt(document.getElementById('batch-size').value);

        // Validate inputs
        if (!this.validateSpreadsheetUrl(spreadsheetUrl)) return;
        if (!this.validateSheetName(sheetName)) return;
        if (!this.validateBatchSize(batchSize)) return;

        try {
            const settings = {
                spreadsheetUrl,
                sheetName,
                batchSize,
                autoExport: document.getElementById('auto-export').checked
            };

            await chrome.storage.sync.set(settings);
            this.showNotification('Export settings saved!', 'success');
        } catch (error) {
            console.error('Error saving export settings:', error);
            this.showNotification('Error saving settings', 'error');
        }
    }

    /**
     * Validate spreadsheet URL
     */
    validateSpreadsheetUrl(url) {
        const urlPattern = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/;
        const isValid = !url || urlPattern.test(url);
        
        this.setFieldValidation('spreadsheet-url', isValid, 
            isValid ? '' : 'Please enter a valid Google Sheets URL');
        
        return isValid;
    }

    /**
     * Validate sheet name
     */
    validateSheetName(name) {
        const isValid = name.length > 0 && name.length <= 100;
        
        this.setFieldValidation('sheet-name', isValid, 
            isValid ? '' : 'Sheet name must be 1-100 characters');
        
        return isValid;
    }

    /**
     * Validate batch size
     */
    validateBatchSize(size) {
        const isValid = size >= 1 && size <= 1000;
        
        this.setFieldValidation('batch-size', isValid, 
            isValid ? '' : 'Batch size must be between 1 and 1000');
        
        return isValid;
    }

    /**
     * Set field validation state
     */
    setFieldValidation(fieldId, isValid, message) {
        const field = document.getElementById(fieldId);
        const errorElement = field.parentNode.querySelector('.field-error');
        
        if (isValid) {
            field.classList.remove('error');
            if (errorElement) errorElement.textContent = '';
        } else {
            field.classList.add('error');
            if (errorElement) errorElement.textContent = message;
        }
    }

    /**
     * Test Google Sheets connection
     */
    async testSheetsConnection() {
        try {
            this.showLoading('test-sheets-connection', 'Testing...');
            
            const result = await this.sendMessage({ 
                action: 'testConnection',
                spreadsheetUrl: document.getElementById('spreadsheet-url').value
            });
            
            if (result.success) {
                this.showNotification('Connection test successful!', 'success');
            } else {
                throw new Error(result.error || 'Connection test failed');
            }
        } catch (error) {
            console.error('Connection test error:', error);
            this.showNotification('Connection test failed: ' + error.message, 'error');
        } finally {
            this.hideLoading('test-sheets-connection', 'Test Connection');
        }
    }

    /**
     * Reset general settings to defaults
     */
    async resetGeneralSettings() {
        if (confirm('Reset general settings to defaults?')) {
            document.getElementById('auto-scan').checked = false;
            document.getElementById('scan-interval').value = 5;
            await this.handleGeneralSettings({ preventDefault: () => {} });
        }
    }

    /**
     * Reset extraction settings to defaults
     */
    async resetExtractionSettings() {
        if (confirm('Reset extraction settings to defaults?')) {
            document.getElementById('extract-images').checked = true;
            document.getElementById('extract-metrics').checked = true;
            document.getElementById('extract-comments').checked = false;
            await this.handleExtractionSettings({ preventDefault: () => {} });
        }
    }

    /**
     * Reset export settings to defaults
     */
    async resetExportSettings() {
        if (confirm('Reset export settings to defaults?')) {
            document.getElementById('spreadsheet-url').value = '';
            document.getElementById('sheet-name').value = 'LinkedIn Posts';
            document.getElementById('batch-size').value = 50;
            document.getElementById('auto-export').checked = false;
            await this.handleExportSettings({ preventDefault: () => {} });
        }
    }

    /**
     * Export settings to file
     */
    async exportSettings() {
        try {
            const settings = await chrome.storage.sync.get();
            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'linkedin-extension-settings.json';
            a.click();
            
            URL.revokeObjectURL(url);
            this.showNotification('Settings exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Error exporting settings', 'error');
        }
    }

    /**
     * Trigger settings import file dialog
     */
    importSettings() {
        document.getElementById('settings-file').click();
    }

    /**
     * Handle settings import from file
     */
    async handleSettingsImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const settings = JSON.parse(text);
            
            await chrome.storage.sync.set(settings);
            await this.loadSettings();
            
            this.showNotification('Settings imported successfully!', 'success');
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Error importing settings: Invalid file format', 'error');
        }
        
        // Reset file input
        e.target.value = '';
    }

    /**
     * Send message to background script
     */
    async sendMessage(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, resolve);
        });
    }

    /**
     * Show loading state on button
     */
    showLoading(buttonId, text) {
        const button = document.getElementById(buttonId);
        button.disabled = true;
        button.textContent = text;
        button.classList.add('loading');
    }

    /**
     * Hide loading state on button
     */
    hideLoading(buttonId, originalText) {
        const button = document.getElementById(buttonId);
        button.disabled = false;
        button.textContent = originalText;
        button.classList.remove('loading');
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Setup close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
    }
}

// Initialize options manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OptionsManager();
});