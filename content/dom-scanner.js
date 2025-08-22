/**
 * DOM Scanner
 * Scans LinkedIn pages for posts and manages extraction process
 */

export class DOMScanner {
  constructor(selectors, extractor, storage, errorHandler) {
    this.selectors = selectors;
    this.extractor = extractor;
    this.storage = storage;
    this.errorHandler = errorHandler;
    
    this.isScanning = false;
    this.scanProgress = { current: 0, total: 0 };
    this.extractedPosts = [];
    this.observers = [];
    
    this.init();
  }

  /**
   * Initialize DOM scanner
   */
  init() {
    this.setupMutationObserver();
    this.bindEvents();
  }

  /**
   * Setup mutation observer to detect new posts
   */
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      if (this.isScanning) return; // Don't interfere with active scanning
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          this.handleNewNodes(mutation.addedNodes);
        }
      });
    });

    // Observe the main content area
    const targetNode = document.querySelector('.scaffold-layout__main, .feed-container, body');
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true
      });
      
      this.observers.push(observer);
      this.errorHandler.handleInfo('DOM Scanner', 'Mutation observer initialized');
    }
  }

  /**
   * Handle new nodes added to DOM
   * @param {NodeList} addedNodes - Newly added nodes
   */
  handleNewNodes(addedNodes) {
    addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Check if the node itself is a post
        if (this.isPostElement(node)) {
          this.notifyNewPost(node);
        }
        
        // Check for posts within the node
        const posts = this.findPostsInElement(node);
        posts.forEach(post => this.notifyNewPost(post));
      }
    });
  }

  /**
   * Check if element is a post
   * @param {Element} element - Element to check
   * @returns {boolean} True if element is a post
   */
  isPostElement(element) {
    const postSelectors = this.selectors.getAllSelectors('post');
    return postSelectors.some(selector => element.matches(selector));
  }

  /**
   * Find posts within an element
   * @param {Element} element - Container element
   * @returns {Array} Array of post elements
   */
  findPostsInElement(element) {
    const posts = [];
    const postSelectors = this.selectors.getAllSelectors('post');
    
    postSelectors.forEach(selector => {
      const foundPosts = element.querySelectorAll(selector);
      foundPosts.forEach(post => {
        if (!posts.includes(post)) {
          posts.push(post);
        }
      });
    });
    
    return posts;
  }

  /**
   * Notify about new post found
   * @param {Element} postElement - Post element
   */
  notifyNewPost(postElement) {
    this.errorHandler.handleInfo('DOM Scanner', 'New post detected in DOM');
    
    // Dispatch custom event for UI components
    const event = new CustomEvent('linkedinPostDetected', {
      detail: { postElement }
    });
    document.dispatchEvent(event);
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Listen for page navigation
    window.addEventListener('popstate', () => {
      this.handlePageChange();
    });

    // Listen for URL changes (for SPA navigation)
    let currentUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.handlePageChange();
      }
    }, 1000);
  }

  /**
   * Handle page changes
   */
  handlePageChange() {
    this.errorHandler.handleInfo('DOM Scanner', `Page changed to: ${window.location.href}`);
    
    // Reset scanning state
    this.isScanning = false;
    this.scanProgress = { current: 0, total: 0 };
    
    // Notify UI components
    const event = new CustomEvent('linkedinPageChanged', {
      detail: { 
        url: window.location.href,
        isSavedPostsPage: this.selectors.isSavedPostsPage(),
        isFeedPage: this.selectors.isFeedPage()
      }
    });
    document.dispatchEvent(event);
  }

  /**
   * Start scanning for posts
   * @param {object} options - Scanning options
   * @returns {Promise<Array>} Array of extracted posts
   */
  async startScan(options = {}) {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    try {
      this.isScanning = true;
      this.extractedPosts = [];
      
      const settings = await this.storage.getSettings();
      const scanOptions = {
        maxPosts: options.maxPosts || settings.scanningPreferences.maxPostsPerScan || 100,
        includeImages: options.includeImages !== undefined ? options.includeImages : settings.scanningPreferences.includeImages,
        includeVideos: options.includeVideos !== undefined ? options.includeVideos : settings.scanningPreferences.includeVideos,
        scrollToLoad: options.scrollToLoad !== undefined ? options.scrollToLoad : true,
        ...options
      };

      this.errorHandler.handleInfo('DOM Scanner', `Starting scan with options:`, scanOptions);

      // Dispatch scan start event
      this.dispatchScanEvent('scanStarted', { options: scanOptions });

      // Find initial posts
      const initialPosts = this.findAllPosts();
      this.scanProgress.total = Math.min(initialPosts.length, scanOptions.maxPosts);
      
      this.errorHandler.handleInfo('DOM Scanner', `Found ${initialPosts.length} initial posts`);

      // Extract posts in batches
      const batchSize = 5;
      for (let i = 0; i < initialPosts.length && this.extractedPosts.length < scanOptions.maxPosts; i += batchSize) {
        const batch = initialPosts.slice(i, i + batchSize);
        await this.processBatch(batch, scanOptions);
        
        // Update progress
        this.scanProgress.current = Math.min(this.extractedPosts.length, this.scanProgress.total);
        this.dispatchScanEvent('scanProgress', { 
          progress: this.scanProgress,
          extractedCount: this.extractedPosts.length
        });

        // Small delay to prevent overwhelming the browser
        await this.delay(100);
      }

      // Try to load more posts if needed
      if (scanOptions.scrollToLoad && this.extractedPosts.length < scanOptions.maxPosts) {
        await this.loadMorePosts(scanOptions);
      }

      // Save extracted posts
      await this.storage.savePosts(this.extractedPosts);

      this.errorHandler.handleInfo('DOM Scanner', `Scan completed. Extracted ${this.extractedPosts.length} posts`);
      
      // Dispatch scan complete event
      this.dispatchScanEvent('scanCompleted', { 
        posts: this.extractedPosts,
        totalExtracted: this.extractedPosts.length
      });

      return this.extractedPosts;

    } catch (error) {
      this.errorHandler.handleError('DOM Scanner', error);
      this.dispatchScanEvent('scanError', { error: error.message });
      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Stop current scan
   */
  stopScan() {
    if (this.isScanning) {
      this.isScanning = false;
      this.errorHandler.handleInfo('DOM Scanner', 'Scan stopped by user');
      
      this.dispatchScanEvent('scanStopped', { 
        extractedCount: this.extractedPosts.length 
      });
    }
  }

  /**
   * Find all posts on current page
   * @returns {Array} Array of post elements
   */
  findAllPosts() {
    const posts = [];
    const postSelectors = this.selectors.getAllSelectors('post');
    
    postSelectors.forEach(selector => {
      const foundPosts = document.querySelectorAll(selector);
      foundPosts.forEach(post => {
        if (!posts.includes(post) && this.isValidPost(post)) {
          posts.push(post);
        }
      });
    });
    
    return posts;
  }

  /**
   * Check if post element is valid for extraction
   * @param {Element} postElement - Post element to validate
   * @returns {boolean} True if valid
   */
  isValidPost(postElement) {
    // Check if post has minimum required content
    const hasAuthor = this.selectors.findElement(postElement, 'author', 'name');
    const hasContent = this.selectors.findElement(postElement, 'text') || 
                      this.selectors.findElement(postElement, 'media', 'images');
    
    return hasAuthor && hasContent;
  }

  /**
   * Process a batch of posts
   * @param {Array} postElements - Array of post elements
   * @param {object} options - Processing options
   */
  async processBatch(postElements, options) {
    for (const postElement of postElements) {
      if (!this.isScanning) break; // Check if scan was stopped
      
      try {
        const postData = this.extractor.extractPostData(postElement);
        
        if (postData && this.shouldIncludePost(postData, options)) {
          this.extractedPosts.push(postData);
          
          this.errorHandler.handleInfo('DOM Scanner', `Extracted post ${this.extractedPosts.length}: ${postData.id}`);
          
          // Check if we've reached the limit
          if (this.extractedPosts.length >= options.maxPosts) {
            break;
          }
        }
      } catch (error) {
        this.errorHandler.handleWarning('DOM Scanner', `Failed to extract post`, { error: error.message });
      }
    }
  }

  /**
   * Check if post should be included based on options
   * @param {object} postData - Extracted post data
   * @param {object} options - Scanning options
   * @returns {boolean} True if should include
   */
  shouldIncludePost(postData, options) {
    // Filter by media preferences
    if (!options.includeImages && postData.media.images.length > 0) {
      return false;
    }
    
    if (!options.includeVideos && postData.media.videos.length > 0) {
      return false;
    }
    
    // Filter by content type if specified
    if (options.postTypes && !options.postTypes.includes(postData.postType)) {
      return false;
    }
    
    // Filter by author if specified
    if (options.authorFilter && !postData.author.name.toLowerCase().includes(options.authorFilter.toLowerCase())) {
      return false;
    }
    
    return true;
  }

  /**
   * Try to load more posts by scrolling
   * @param {object} options - Scanning options
   */
  async loadMorePosts(options) {
    const maxScrollAttempts = 5;
    let scrollAttempts = 0;
    let lastPostCount = this.extractedPosts.length;
    
    while (scrollAttempts < maxScrollAttempts && this.extractedPosts.length < options.maxPosts && this.isScanning) {
      // Scroll to bottom
      window.scrollTo(0, document.body.scrollHeight);
      
      // Wait for new content to load
      await this.delay(2000);
      
      // Look for new posts
      const newPosts = this.findAllPosts();
      const unprocessedPosts = newPosts.slice(lastPostCount);
      
      if (unprocessedPosts.length > 0) {
        await this.processBatch(unprocessedPosts, options);
        
        // Update progress
        this.scanProgress.total = Math.min(newPosts.length, options.maxPosts);
        this.scanProgress.current = Math.min(this.extractedPosts.length, this.scanProgress.total);
        
        this.dispatchScanEvent('scanProgress', { 
          progress: this.scanProgress,
          extractedCount: this.extractedPosts.length
        });
        
        lastPostCount = newPosts.length;
        scrollAttempts = 0; // Reset attempts if we found new posts
      } else {
        scrollAttempts++;
        this.errorHandler.handleInfo('DOM Scanner', `No new posts found, attempt ${scrollAttempts}/${maxScrollAttempts}`);
      }
    }
  }

  /**
   * Dispatch scan-related events
   * @param {string} eventType - Event type
   * @param {object} detail - Event detail
   */
  dispatchScanEvent(eventType, detail) {
    const event = new CustomEvent(`linkedinScan${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`, {
      detail: detail
    });
    document.dispatchEvent(event);
  }

  /**
   * Get current scan progress
   * @returns {object} Progress information
   */
  getScanProgress() {
    return {
      isScanning: this.isScanning,
      progress: this.scanProgress,
      extractedCount: this.extractedPosts.length
    };
  }

  /**
   * Get extracted posts
   * @returns {Array} Array of extracted posts
   */
  getExtractedPosts() {
    return [...this.extractedPosts];
  }

  /**
   * Clear extracted posts
   */
  clearExtractedPosts() {
    this.extractedPosts = [];
    this.scanProgress = { current: 0, total: 0 };
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup observers and event listeners
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isScanning = false;
    this.errorHandler.handleInfo('DOM Scanner', 'Cleanup completed');
  }

  /**
   * Get page information
   * @returns {object} Page information
   */
  getPageInfo() {
    return {
      url: window.location.href,
      isSavedPostsPage: this.selectors.isSavedPostsPage(),
      isFeedPage: this.selectors.isFeedPage(),
      postCount: this.findAllPosts().length,
      isScanning: this.isScanning
    };
  }

  /**
   * Wait for posts to load on page
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} True if posts found
   */
  async waitForPosts(timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const posts = this.findAllPosts();
      if (posts.length > 0) {
        this.errorHandler.handleInfo('DOM Scanner', `Found ${posts.length} posts after ${Date.now() - startTime}ms`);
        return true;
      }
      
      await this.delay(500);
    }
    
    this.errorHandler.handleWarning('DOM Scanner', `No posts found after ${timeout}ms timeout`);
    return false;
  }
}