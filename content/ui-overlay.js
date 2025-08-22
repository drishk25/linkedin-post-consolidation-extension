/**
 * UI Overlay
 * Creates and manages the floating overlay interface
 */

export class UIOverlay {
  constructor(scanner, storage, errorHandler) {
    this.scanner = scanner;
    this.storage = storage;
    this.errorHandler = errorHandler;
    
    this.overlay = null;
    this.isVisible = false;
    this.isExpanded = false;
    this.currentPosts = [];
    
    this.init();
  }

  /**
   * Initialize UI overlay
   */
  init() {
    this.createOverlay();
    this.bindEvents();
    this.loadSettings();
  }

  /**
   * Create the overlay HTML structure
   */
  createOverlay() {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'linkedin-consolidator-overlay';
    this.overlay.className = 'linkedin-consolidator-overlay';
    
    this.overlay.innerHTML = `
      <div class="overlay-toggle" id="overlay-toggle">
        <div class="toggle-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z" fill="currentColor"/>
            <path d="M7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H14V17H7V15Z" fill="currentColor"/>
          </svg>
        </div>
        <div class="toggle-badge" id="toggle-badge">0</div>
      </div>
      
      <div class="overlay-panel" id="overlay-panel">
        <div class="panel-header">
          <div class="header-title">
            <h3>LinkedIn Post Consolidator</h3>
            <div class="header-subtitle">Extract and export your saved posts</div>
          </div>
          <button class="close-btn" id="close-btn">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        
        <div class="panel-content">
          <div class="status-section">
            <div class="page-status" id="page-status">
              <div class="status-indicator"></div>
              <span class="status-text">Detecting page...</span>
            </div>
            <div class="posts-count" id="posts-count">
              <span class="count-number">0</span>
              <span class="count-label">posts found</span>
            </div>
          </div>
          
          <div class="scan-section">
            <div class="scan-controls" id="scan-controls">
              <button class="scan-btn primary" id="start-scan-btn">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2V14M2 8H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Start Scan
              </button>
              <button class="scan-btn secondary" id="stop-scan-btn" style="display: none;">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="10" height="10" fill="currentColor"/>
                </svg>
                Stop Scan
              </button>
            </div>
            
            <div class="scan-progress" id="scan-progress" style="display: none;">
              <div class="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
              </div>
              <div class="progress-text" id="progress-text">Scanning posts...</div>
            </div>
          </div>
          
          <div class="results-section" id="results-section" style="display: none;">
            <div class="results-header">
              <h4>Extracted Posts</h4>
              <div class="results-count" id="results-count">0 posts</div>
            </div>
            
            <div class="results-list" id="results-list">
              <!-- Posts will be populated here -->
            </div>
            
            <div class="export-controls">
              <button class="export-btn primary" id="export-btn">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 10V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V10M8 2V10M8 10L5 7M8 10L11 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Export to Google Sheets
              </button>
              <button class="export-btn secondary" id="clear-btn">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 4H14M6 4V2.5C6 2.22386 6.22386 2 6.5 2H9.5C9.77614 2 10 2.22386 10 2.5V4M12.5 4V12.5C12.5 13.3284 11.8284 14 11 14H5C4.17157 14 3.5 13.3284 3.5 12.5V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Clear Results
              </button>
            </div>
          </div>
          
          <div class="settings-section">
            <button class="settings-btn" id="settings-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M13.5 8C13.5 8.39782 13.4678 8.78695 13.4067 9.16459L14.8165 10.2829C14.9349 10.3742 14.9667 10.5374 14.8929 10.6708L13.6071 12.8292C13.5333 12.9626 13.3701 13.0222 13.2367 12.9484L11.5613 12.1613C11.0208 12.5156 10.4174 12.7717 9.77174 12.9134L9.5 14.75C9.47826 14.8933 9.35652 15 9.21087 15H6.78913C6.64348 15 6.52174 14.8933 6.5 14.75L6.22826 12.9134C5.58261 12.7717 4.97917 12.5156 4.43870 12.1613L2.76330 12.9484C2.62989 13.0222 2.46667 12.9626 2.39293 12.8292L1.10707 10.6708C1.03333 10.5374 1.06511 10.3742 1.18348 10.2829L2.59326 9.16459C2.53217 8.78695 2.5 8.39782 2.5 8C2.5 7.60218 2.53217 7.21305 2.59326 6.83541L1.18348 5.71712C1.06511 5.62583 1.03333 5.46261 1.10707 5.32920L2.39293 3.17080C2.46667 3.03739 2.62989 2.97783 2.76330 3.05157L4.43870 3.83870C4.97917 3.48435 5.58261 3.22826 6.22826 3.08696L6.5 1.25C6.52174 1.10674 6.64348 1 6.78913 1H9.21087C9.35652 1 9.47826 1.10674 9.5 1.25L9.77174 3.08696C10.4174 3.22826 11.0208 3.48435 11.5613 3.83870L13.2367 3.05157C13.3701 2.97783 13.5333 3.03739 13.6071 3.17080L14.8929 5.32920C14.9667 5.46261 14.9349 5.62583 14.8165 5.71712L13.4067 6.83541C13.4678 7.21305 13.5 7.60218 13.5 8Z" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              Settings
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(this.overlay);
    
    this.errorHandler.handleInfo('UI Overlay', 'Overlay created and added to page');
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Toggle overlay
    const toggleBtn = this.overlay.querySelector('#overlay-toggle');
    toggleBtn.addEventListener('click', () => this.toggleOverlay());
    
    // Close overlay
    const closeBtn = this.overlay.querySelector('#close-btn');
    closeBtn.addEventListener('click', () => this.hideOverlay());
    
    // Scan controls
    const startScanBtn = this.overlay.querySelector('#start-scan-btn');
    const stopScanBtn = this.overlay.querySelector('#stop-scan-btn');
    
    startScanBtn.addEventListener('click', () => this.startScan());
    stopScanBtn.addEventListener('click', () => this.stopScan());
    
    // Export controls
    const exportBtn = this.overlay.querySelector('#export-btn');
    const clearBtn = this.overlay.querySelector('#clear-btn');
    
    exportBtn.addEventListener('click', () => this.exportToSheets());
    clearBtn.addEventListener('click', () => this.clearResults());
    
    // Settings
    const settingsBtn = this.overlay.querySelector('#settings-btn');
    settingsBtn.addEventListener('click', () => this.openSettings());
    
    // Listen for scanner events
    document.addEventListener('linkedinPageChanged', (e) => this.handlePageChange(e.detail));
    document.addEventListener('linkedinScanStarted', (e) => this.handleScanStarted(e.detail));
    document.addEventListener('linkedinScanProgress', (e) => this.handleScanProgress(e.detail));
    document.addEventListener('linkedinScanCompleted', (e) => this.handleScanCompleted(e.detail));
    document.addEventListener('linkedinScanError', (e) => this.handleScanError(e.detail));
    document.addEventListener('linkedinScanStopped', (e) => this.handleScanStopped(e.detail));
    
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (this.isExpanded && !this.overlay.contains(e.target)) {
        this.hideOverlay();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        this.toggleOverlay();
      }
      if (e.key === 'Escape' && this.isExpanded) {
        this.hideOverlay();
      }
    });
  }

  /**
   * Load settings and update UI
   */
  async loadSettings() {
    try {
      const settings = await this.storage.getSettings();
      this.updatePageStatus();
      this.updatePostsCount();
      
      // Load cached posts if available
      const cachedPosts = await this.storage.getCachedPosts();
      if (cachedPosts.length > 0) {
        this.currentPosts = cachedPosts;
        this.updateResults();
      }
      
    } catch (error) {
      this.errorHandler.handleError('UI Overlay', error);
    }
  }

  /**
   * Toggle overlay visibility
   */
  toggleOverlay() {
    if (this.isExpanded) {
      this.hideOverlay();
    } else {
      this.showOverlay();
    }
  }

  /**
   * Show overlay
   */
  showOverlay() {
    this.overlay.classList.add('expanded');
    this.isExpanded = true;
    this.updatePageStatus();
    this.updatePostsCount();
    
    this.errorHandler.handleInfo('UI Overlay', 'Overlay shown');
  }

  /**
   * Hide overlay
   */
  hideOverlay() {
    this.overlay.classList.remove('expanded');
    this.isExpanded = false;
    
    this.errorHandler.handleInfo('UI Overlay', 'Overlay hidden');
  }

  /**
   * Update page status indicator
   */
  updatePageStatus() {
    const statusElement = this.overlay.querySelector('#page-status');
    const pageInfo = this.scanner.getPageInfo();
    
    let statusText = 'Unknown page';
    let statusClass = 'unknown';
    
    if (pageInfo.isSavedPostsPage) {
      statusText = 'Saved Posts page';
      statusClass = 'saved-posts';
    } else if (pageInfo.isFeedPage) {
      statusText = 'LinkedIn Feed';
      statusClass = 'feed';
    } else {
      statusText = 'LinkedIn page';
      statusClass = 'linkedin';
    }
    
    statusElement.className = `page-status ${statusClass}`;
    statusElement.querySelector('.status-text').textContent = statusText;
  }

  /**
   * Update posts count
   */
  updatePostsCount() {
    const countElement = this.overlay.querySelector('#posts-count');
    const pageInfo = this.scanner.getPageInfo();
    
    const countNumber = countElement.querySelector('.count-number');
    const countLabel = countElement.querySelector('.count-label');
    
    countNumber.textContent = pageInfo.postCount;
    countLabel.textContent = pageInfo.postCount === 1 ? 'post found' : 'posts found';
    
    // Update badge
    const badge = this.overlay.querySelector('#toggle-badge');
    badge.textContent = this.currentPosts.length;
    badge.style.display = this.currentPosts.length > 0 ? 'block' : 'none';
  }

  /**
   * Start scanning process
   */
  async startScan() {
    try {
      const settings = await this.storage.getSettings();
      
      const scanOptions = {
        maxPosts: settings.scanningPreferences.maxPostsPerScan,
        includeImages: settings.scanningPreferences.includeImages,
        includeVideos: settings.scanningPreferences.includeVideos
      };
      
      await this.scanner.startScan(scanOptions);
      
    } catch (error) {
      this.errorHandler.handleError('UI Overlay', error);
      this.showNotification('Failed to start scan: ' + error.message, 'error');
    }
  }

  /**
   * Stop scanning process
   */
  stopScan() {
    this.scanner.stopScan();
  }

  /**
   * Handle page change event
   */
  handlePageChange(detail) {
    this.updatePageStatus();
    this.updatePostsCount();
    
    // Clear results if on different page type
    if (!detail.isSavedPostsPage && !detail.isFeedPage) {
      this.clearResults();
    }
  }

  /**
   * Handle scan started event
   */
  handleScanStarted(detail) {
    const startBtn = this.overlay.querySelector('#start-scan-btn');
    const stopBtn = this.overlay.querySelector('#stop-scan-btn');
    const progressSection = this.overlay.querySelector('#scan-progress');
    
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    progressSection.style.display = 'block';
    
    this.updateProgress(0, 'Starting scan...');
    this.showNotification('Scan started', 'info');
  }

  /**
   * Handle scan progress event
   */
  handleScanProgress(detail) {
    const { progress, extractedCount } = detail;
    const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    
    this.updateProgress(percentage, `Extracted ${extractedCount} posts...`);
    this.updatePostsCount();
  }

  /**
   * Handle scan completed event
   */
  handleScanCompleted(detail) {
    const { posts, totalExtracted } = detail;
    
    this.currentPosts = posts;
    this.resetScanControls();
    this.updateResults();
    this.updatePostsCount();
    
    this.showNotification(`Scan completed! Extracted ${totalExtracted} posts`, 'success');
  }

  /**
   * Handle scan error event
   */
  handleScanError(detail) {
    this.resetScanControls();
    this.showNotification('Scan failed: ' + detail.error, 'error');
  }

  /**
   * Handle scan stopped event
   */
  handleScanStopped(detail) {
    this.resetScanControls();
    this.showNotification(`Scan stopped. Extracted ${detail.extractedCount} posts`, 'warning');
  }

  /**
   * Reset scan controls to initial state
   */
  resetScanControls() {
    const startBtn = this.overlay.querySelector('#start-scan-btn');
    const stopBtn = this.overlay.querySelector('#stop-scan-btn');
    const progressSection = this.overlay.querySelector('#scan-progress');
    
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    progressSection.style.display = 'none';
  }

  /**
   * Update progress bar
   */
  updateProgress(percentage, text) {
    const progressFill = this.overlay.querySelector('#progress-fill');
    const progressText = this.overlay.querySelector('#progress-text');
    
    progressFill.style.width = `${Math.min(percentage, 100)}%`;
    progressText.textContent = text;
  }

  /**
   * Update results section
   */
  updateResults() {
    const resultsSection = this.overlay.querySelector('#results-section');
    const resultsCount = this.overlay.querySelector('#results-count');
    const resultsList = this.overlay.querySelector('#results-list');
    
    if (this.currentPosts.length === 0) {
      resultsSection.style.display = 'none';
      return;
    }
    
    resultsSection.style.display = 'block';
    resultsCount.textContent = `${this.currentPosts.length} posts`;
    
    // Generate results list
    resultsList.innerHTML = this.currentPosts.slice(0, 5).map(post => `
      <div class="result-item">
        <div class="result-author">
          <img src="${post.author.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNlNWU3ZWIiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMyIgZmlsbD0iIzk5YTNhZiIvPgo8cGF0aCBkPSJNNyAyMC42NjJDNy4zNDY1MSAxOC4zNDQgOS4xNzk4IDE2LjUgMTIgMTYuNUMxNC44MjAyIDE2LjUgMTYuNjUzNSAxOC4zNDQgMTcgMjAuNjYyIiBmaWxsPSIjOTlhM2FmIi8+Cjwvc3ZnPgo='}" alt="${post.author.name}" class="author-avatar">
          <div class="author-info">
            <div class="author-name">${post.author.name}</div>
            <div class="post-time">${post.timestamp.relative}</div>
          </div>
        </div>
        <div class="result-content">
          ${post.content.text.substring(0, 100)}${post.content.text.length > 100 ? '...' : ''}
        </div>
        <div class="result-metrics">
          <span class="metric">👍 ${post.metrics.likes}</span>
          <span class="metric">💬 ${post.metrics.comments}</span>
          <span class="metric">🔄 ${post.metrics.shares}</span>
        </div>
      </div>
    `).join('');
    
    if (this.currentPosts.length > 5) {
      resultsList.innerHTML += `
        <div class="result-item more-items">
          <div class="more-text">+${this.currentPosts.length - 5} more posts</div>
        </div>
      `;
    }
  }

  /**
   * Export posts to Google Sheets
   */
  async exportToSheets() {
    try {
      if (this.currentPosts.length === 0) {
        this.showNotification('No posts to export', 'warning');
        return;
      }
      
      this.showNotification('Exporting to Google Sheets...', 'info');
      
      // Send message to background script to handle export
      const response = await chrome.runtime.sendMessage({
        type: 'EXPORT_TO_SHEETS',
        posts: this.currentPosts
      });
      
      if (response.success) {
        this.showNotification('Successfully exported to Google Sheets!', 'success');
        
        // Add to export history
        await this.storage.addExportHistory({
          postCount: this.currentPosts.length,
          sheetUrl: response.sheetUrl
        });
      } else {
        throw new Error(response.error || 'Export failed');
      }
      
    } catch (error) {
      this.errorHandler.handleError('UI Overlay', error);
      this.showNotification('Export failed: ' + error.message, 'error');
    }
  }

  /**
   * Clear results
   */
  async clearResults() {
    this.currentPosts = [];
    this.scanner.clearExtractedPosts();
    await this.storage.savePosts([]);
    
    this.updateResults();
    this.updatePostsCount();
    
    this.showNotification('Results cleared', 'info');
  }

  /**
   * Open settings
   */
  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `overlay-notification ${type}`;
    notification.textContent = message;
    
    // Add to overlay
    this.overlay.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide and remove notification
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Update overlay visibility based on page
   */
  updateVisibility() {
    const pageInfo = this.scanner.getPageInfo();
    
    // Show overlay on LinkedIn pages
    if (pageInfo.url.includes('linkedin.com')) {
      this.overlay.style.display = 'block';
    } else {
      this.overlay.style.display = 'none';
    }
  }

  /**
   * Cleanup overlay
   */
  cleanup() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.errorHandler.handleInfo('UI Overlay', 'Cleanup completed');
  }
}