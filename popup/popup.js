/**
 * Popup JavaScript for LinkedIn Post Consolidation Extension
 * Handles UI interactions, status updates, and communication with content scripts
 */

class PopupManager {
    constructor() {
        this.currentTab = null;
        this.isScanning = false;
        this.isExporting = false;
        this.stats = {
            postsFound: 0,
            postsExported: 0,
            lastScan: null
        };
        this.init();
    }

    async init() {
        await this.getCurrentTab();
        this.setupEventListeners();
        await this.loadSettings();
        await this.updateStatus();
        await this.loadStats();
    }

    /**
     * Get current active tab
     */
    async getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
        } catch (error) {
            console.error('Error getting current tab:', error);
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Main action buttons
        document.getElementById('scan-posts').addEventListener('click', () => this.handleScanPosts());
        document.getElementById('export-posts').addEventListener('click', () => this.handleExportPosts());
        document.getElementById('toggle-overlay').addEventListener('click', () => this.handleToggleOverlay());
        document.getElementById('clear-data').addEventListener('click', () => this.handleClearData());

        // Settings and navigation
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        document.getElementById('help-btn').addEventListener('click', () => this.openHelp());
        document.getElementById('feedback-btn').addEventListener('click', () => this.openFeedback());

        // Progress controls
        document.getElementById('cancel-operation').addEventListener('click', () => this.handleCancelOperation());

        // Quick settings
        document.getElementById('auto-export').addEventListener('change', (e) => this.handleQuickSetting('autoExport', e.target.checked));
        document.getElementById('include-images').addEventListener('change', (e) => this.handleQuickSetting('extractImages', e.target.checked));

        // Notification close
        document.getElementById('notification-close').addEventListener('click', () => this.hideNotification());

        // Listen for messages from content scripts
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });
    }

    /**
     * Load settings and update UI
     */
    async loadSettings() {
        try {
            const settings = await chrome.storage.sync.get([
                'autoExport',
                'extractImages',
                'googleAuth'
            ]);

            // Update quick settings checkboxes
            document.getElementById('auto-export').checked = settings.autoExport || false;
            document.getElementById('include-images').checked = settings.extractImages !== false;

            // Update Google auth status
            this.updateGoogleStatus(settings.googleAuth);

        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    /**
     * Load and display stats
     */
    async loadStats() {
        try {
            const data = await chrome.storage.local.get(['stats', 'posts']);
            
            if (data.stats) {
                this.stats = { ...this.stats, ...data.stats };
            }

            if (data.posts) {
                this.stats.postsFound = data.posts.length;
            }

            this.updateStatsDisplay();

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    /**
     * Update status indicators
     */
    async updateStatus() {
        // Check if on LinkedIn
        const isLinkedIn = this.currentTab && this.currentTab.url && 
                          this.currentTab.url.includes('linkedin.com');
        
        this.updateLinkedInStatus(isLinkedIn);
        
        // Update button states
        this.updateButtonStates();
    }

    /**
     * Update LinkedIn connection status
     */
    updateLinkedInStatus(isConnected) {
        const statusElement = document.getElementById('linkedin-status');
        const iconElement = document.getElementById('linkedin-icon');
        const textElement = statusElement.querySelector('.status-text');

        if (isConnected) {
            iconElement.textContent = '✓';
            iconElement.className = 'status-icon connected';
            textElement.textContent = 'Connected to LinkedIn';
        } else {
            iconElement.textContent = '⚠';
            iconElement.className = 'status-icon warning';
            textElement.textContent = 'Not on LinkedIn';
        }
    }

    /**
     * Update Google connection status
     */
    updateGoogleStatus(authInfo) {
        const statusElement = document.getElementById('google-status');
        const iconElement = document.getElementById('google-icon');
        const textElement = statusElement.querySelector('.status-text');

        if (authInfo && authInfo.email) {
            iconElement.textContent = '✓';
            iconElement.className = 'status-icon connected';
            textElement.textContent = `Connected as ${authInfo.email}`;
        } else {
            iconElement.textContent = '⚠';
            iconElement.className = 'status-icon warning';
            textElement.textContent = 'Google not connected';
        }
    }

    /**
     * Update button enabled/disabled states
     */
    updateButtonStates() {
        const isLinkedIn = this.currentTab && this.currentTab.url && 
                          this.currentTab.url.includes('linkedin.com');
        
        const scanButton = document.getElementById('scan-posts');
        const exportButton = document.getElementById('export-posts');
        const overlayButton = document.getElementById('toggle-overlay');

        // Scan button - enabled only on LinkedIn
        scanButton.disabled = !isLinkedIn || this.isScanning;
        
        // Export button - enabled if we have posts and not currently exporting
        exportButton.disabled = this.stats.postsFound === 0 || this.isExporting;
        
        // Overlay button - enabled only on LinkedIn
        overlayButton.disabled = !isLinkedIn;
    }

    /**
     * Update stats display
     */
    updateStatsDisplay() {
        document.getElementById('posts-found').textContent = this.stats.postsFound;
        document.getElementById('posts-exported').textContent = this.stats.postsExported;
        
        const lastScanElement = document.getElementById('last-scan');
        if (this.stats.lastScan) {
            const date = new Date(this.stats.lastScan);
            lastScanElement.textContent = this.formatRelativeTime(date);
        } else {
            lastScanElement.textContent = 'Never';
        }
    }

    /**
     * Handle scan posts action
     */
    async handleScanPosts() {
        if (!this.currentTab || this.isScanning) return;

        try {
            this.isScanning = true;
            this.updateButtonStates();
            this.showProgress('Scanning Posts...', 'Initializing scan...');

            // Send message to content script to start scanning
            const response = await this.sendMessageToTab({
                action: 'startScan'
            });

            if (!response || !response.success) {
                throw new Error(response?.error || 'Failed to start scan');
            }

        } catch (error) {
            console.error('Scan error:', error);
            this.showNotification('Failed to start scan: ' + error.message, 'error');
            this.isScanning = false;
            this.hideProgress();
            this.updateButtonStates();
        }
    }

    /**
     * Handle export posts action
     */
    async handleExportPosts() {
        if (this.stats.postsFound === 0 || this.isExporting) return;

        try {
            this.isExporting = true;
            this.updateButtonStates();
            this.showProgress('Exporting Posts...', 'Preparing export...');

            // Send message to background script to start export
            const response = await this.sendMessageToBackground({
                action: 'exportPosts'
            });

            if (!response || !response.success) {
                throw new Error(response?.error || 'Failed to export posts');
            }

        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Failed to export posts: ' + error.message, 'error');
            this.isExporting = false;
            this.hideProgress();
            this.updateButtonStates();
        }
    }

    /**
     * Handle toggle overlay action
     */
    async handleToggleOverlay() {
        if (!this.currentTab) return;

        try {
            const response = await this.sendMessageToTab({
                action: 'toggleOverlay'
            });

            if (response && response.success) {
                this.showNotification('Overlay toggled', 'success');
            } else {
                throw new Error(response?.error || 'Failed to toggle overlay');
            }

        } catch (error) {
            console.error('Toggle overlay error:', error);
            this.showNotification('Failed to toggle overlay: ' + error.message, 'error');
        }
    }

    /**
     * Handle clear data action
     */
    async handleClearData() {
        if (!confirm('Are you sure you want to clear all saved post data? This action cannot be undone.')) {
            return;
        }

        try {
            await chrome.storage.local.remove(['posts', 'stats']);
            
            this.stats = {
                postsFound: 0,
                postsExported: 0,
                lastScan: null
            };
            
            this.updateStatsDisplay();
            this.updateButtonStates();
            this.showNotification('Data cleared successfully', 'success');

        } catch (error) {
            console.error('Clear data error:', error);
            this.showNotification('Failed to clear data: ' + error.message, 'error');
        }
    }

    /**
     * Handle cancel operation
     */
    async handleCancelOperation() {
        try {
            if (this.isScanning) {
                await this.sendMessageToTab({ action: 'cancelScan' });
                this.isScanning = false;
            }
            
            if (this.isExporting) {
                await this.sendMessageToBackground({ action: 'cancelExport' });
                this.isExporting = false;
            }

            this.hideProgress();
            this.updateButtonStates();
            this.showNotification('Operation cancelled', 'warning');

        } catch (error) {
            console.error('Cancel operation error:', error);
        }
    }

    /**
     * Handle quick setting changes
     */
    async handleQuickSetting(key, value) {
        try {
            await chrome.storage.sync.set({ [key]: value });
            this.showNotification('Setting updated', 'success');
        } catch (error) {
            console.error('Setting update error:', error);
            this.showNotification('Failed to update setting', 'error');
        }
    }

    /**
     * Handle messages from content scripts and background
     */
    handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'scanProgress':
                this.updateProgress(message.progress, message.text);
                break;
                
            case 'scanComplete':
                this.handleScanComplete(message.data);
                break;
                
            case 'scanError':
                this.handleScanError(message.error);
                break;
                
            case 'exportProgress':
                this.updateProgress(message.progress, message.text);
                break;
                
            case 'exportComplete':
                this.handleExportComplete(message.data);
                break;
                
            case 'exportError':
                this.handleExportError(message.error);
                break;
        }
        
        sendResponse({ success: true });
    }

    /**
     * Handle scan completion
     */
    async handleScanComplete(data) {
        this.isScanning = false;
        this.hideProgress();
        
        this.stats.postsFound = data.postsFound || 0;
        this.stats.lastScan = new Date().toISOString();
        
        await this.saveStats();
        this.updateStatsDisplay();
        this.updateButtonStates();
        
        this.showNotification(`Scan complete! Found ${this.stats.postsFound} posts`, 'success');
        
        // Auto-export if enabled
        const settings = await chrome.storage.sync.get(['autoExport']);
        if (settings.autoExport && this.stats.postsFound > 0) {
            setTimeout(() => this.handleExportPosts(), 1000);
        }
    }

    /**
     * Handle scan error
     */
    handleScanError(error) {
        this.isScanning = false;
        this.hideProgress();
        this.updateButtonStates();
        this.showNotification('Scan failed: ' + error, 'error');
    }

    /**
     * Handle export completion
     */
    async handleExportComplete(data) {
        this.isExporting = false;
        this.hideProgress();
        
        this.stats.postsExported = data.postsExported || 0;
        
        await this.saveStats();
        this.updateStatsDisplay();
        this.updateButtonStates();
        
        this.showNotification(`Export complete! ${this.stats.postsExported} posts exported`, 'success');
    }

    /**
     * Handle export error
     */
    handleExportError(error) {
        this.isExporting = false;
        this.hideProgress();
        this.updateButtonStates();
        this.showNotification('Export failed: ' + error, 'error');
    }

    /**
     * Save stats to storage
     */
    async saveStats() {
        try {
            await chrome.storage.local.set({ stats: this.stats });
        } catch (error) {
            console.error('Error saving stats:', error);
        }
    }

    /**
     * Show progress section
     */
    showProgress(title, text) {
        const progressSection = document.getElementById('progress-section');
        const progressTitle = document.getElementById('progress-title');
        const progressText = document.getElementById('progress-text');
        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = document.getElementById('progress-percentage');

        progressTitle.textContent = title;
        progressText.textContent = text;
        progressFill.style.width = '0%';
        progressPercentage.textContent = '0%';
        
        progressSection.classList.remove('hidden');
    }

    /**
     * Update progress
     */
    updateProgress(progress, text) {
        const progressText = document.getElementById('progress-text');
        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = document.getElementById('progress-percentage');

        const percentage = Math.round(progress * 100);
        
        progressText.textContent = text;
        progressFill.style.width = percentage + '%';
        progressPercentage.textContent = percentage + '%';
    }

    /**
     * Hide progress section
     */
    hideProgress() {
        const progressSection = document.getElementById('progress-section');
        progressSection.classList.add('hidden');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notification-message');

        messageElement.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Auto-hide after 5 seconds
        setTimeout(() => this.hideNotification(), 5000);
    }

    /**
     * Hide notification
     */
    hideNotification() {
        const notification = document.getElementById('notification');
        notification.classList.remove('show');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 300);
    }

    /**
     * Open settings page
     */
    openSettings() {
        chrome.runtime.openOptionsPage();
    }

    /**
     * Open help page
     */
    openHelp() {
        chrome.tabs.create({
            url: 'https://github.com/your-repo/linkedin-extension/wiki/help'
        });
    }

    /**
     * Open feedback page
     */
    openFeedback() {
        chrome.tabs.create({
            url: 'https://github.com/your-repo/linkedin-extension/issues/new'
        });
    }

    /**
     * Send message to current tab
     */
    async sendMessageToTab(message) {
        if (!this.currentTab) return null;
        
        try {
            return await chrome.tabs.sendMessage(this.currentTab.id, message);
        } catch (error) {
            console.error('Error sending message to tab:', error);
            return null;
        }
    }

    /**
     * Send message to background script
     */
    async sendMessageToBackground(message) {
        try {
            return await chrome.runtime.sendMessage(message);
        } catch (error) {
            console.error('Error sending message to background:', error);
            return null;
        }
    }

    /**
     * Format relative time
     */
    formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});