/**
 * LinkedIn DOM Selectors
 * Centralized selectors for LinkedIn's DOM elements with fallbacks
 */

export class LinkedInSelectors {
  constructor() {
    // Main post containers
    this.postSelectors = [
      'div[data-id^="urn:li:activity"]', // Primary post selector
      '.feed-shared-update-v2',          // Alternative post container
      '.occludable-update',              // Legacy post container
      'article[data-id]'                 // Generic article with data-id
    ];

    // Post content selectors
    this.contentSelectors = {
      // Post text content
      text: [
        '.feed-shared-text .break-words',
        '.feed-shared-update-v2__description .break-words',
        '.feed-shared-text__text-view',
        '.feed-shared-inline-show-more-text .break-words'
      ],

      // Author information
      author: {
        name: [
          '.feed-shared-actor__name .visually-hidden',
          '.feed-shared-actor__name',
          '.update-components-actor__name .visually-hidden',
          '.update-components-actor__name'
        ],
        profile: [
          '.feed-shared-actor__container-link',
          '.update-components-actor__container .app-aware-link',
          '.feed-shared-actor a[href*="/in/"]'
        ],
        image: [
          '.feed-shared-actor__avatar .EntityPhoto-circle-3',
          '.feed-shared-actor__avatar img',
          '.update-components-actor__avatar img'
        ]
      },

      // Post metrics
      metrics: {
        likes: [
          '.social-counts-reactions__count',
          '.feed-shared-social-action-bar__reaction-count',
          'button[aria-label*="reaction"] .visually-hidden'
        ],
        comments: [
          '.social-counts-comments .social-counts-comments__count',
          'button[aria-label*="comment"] .visually-hidden',
          '.feed-shared-social-action-bar__comment-count'
        ],
        shares: [
          '.social-counts-shares .social-counts-shares__count',
          'button[aria-label*="repost"] .visually-hidden',
          '.feed-shared-social-action-bar__repost-count'
        ]
      },

      // Media content
      media: {
        images: [
          '.feed-shared-image img',
          '.feed-shared-mini-update-v2 img',
          '.feed-shared-carousel__content img',
          '.update-components-image img'
        ],
        videos: [
          '.feed-shared-video video',
          '.feed-shared-mini-update-v2 video',
          '.update-components-video video'
        ],
        documents: [
          '.feed-shared-document',
          '.feed-shared-mini-update-v2__document',
          '.update-components-document'
        ]
      },

      // Timestamp
      timestamp: [
        '.feed-shared-actor__sub-description .visually-hidden',
        '.feed-shared-actor__sub-description time',
        '.update-components-actor__sub-description time',
        'time[datetime]'
      ],

      // Post URL
      postUrl: [
        '.feed-shared-control-menu__trigger',
        '.feed-shared-actor__container-link',
        'a[href*="/posts/"]'
      ]
    };

    // Saved posts specific selectors
    this.savedPostsSelectors = {
      container: [
        '.saved-items',
        '.my-items-saved',
        '[data-view-name="saved-items"]'
      ],
      posts: [
        '.saved-item',
        '.my-items-saved__item',
        '.saved-items__item'
      ]
    };

    // Navigation and page detection
    this.navigationSelectors = {
      savedPostsPage: [
        'a[href*="/my-items/saved-posts/"]',
        'a[href*="/saved/"]'
      ],
      feedPage: [
        '.feed-container',
        '.scaffold-layout__main'
      ]
    };

    // Loading and pagination
    this.loadingSelectors = {
      spinner: [
        '.feed-shared-update-v2__loader',
        '.artdeco-spinner',
        '.loading-spinner'
      ],
      loadMore: [
        '.scaffold-finite-scroll__load-button',
        '.feed-shared-update-v2__load-more'
      ]
    };
  }

  /**
   * Get the best available selector for an element type
   * @param {string} type - Type of selector needed
   * @param {string} subtype - Subtype for nested selectors
   * @returns {string} CSS selector
   */
  getSelector(type, subtype = null) {
    if (subtype && this.contentSelectors[type] && this.contentSelectors[type][subtype]) {
      return this.contentSelectors[type][subtype][0];
    }
    
    if (this.contentSelectors[type]) {
      return Array.isArray(this.contentSelectors[type]) 
        ? this.contentSelectors[type][0] 
        : this.contentSelectors[type];
    }

    if (this[type + 'Selectors']) {
      return Array.isArray(this[type + 'Selectors']) 
        ? this[type + 'Selectors'][0] 
        : this[type + 'Selectors'];
    }

    return null;
  }

  /**
   * Get all fallback selectors for an element type
   * @param {string} type - Type of selector needed
   * @param {string} subtype - Subtype for nested selectors (supports dot notation like 'author.name')
   * @returns {Array} Array of CSS selectors
   */
  getAllSelectors(type, subtype = null) {
    if (subtype) {
      // Handle dot notation for nested selectors (e.g., 'author.name')
      const parts = subtype.split('.');
      let current = this.contentSelectors[type];
      
      for (const part of parts) {
        if (current && typeof current === 'object' && current[part]) {
          current = current[part];
        } else {
          current = null;
          break;
        }
      }
      
      if (current) {
        return Array.isArray(current) ? current : [current];
      }
    }
    
    if (this.contentSelectors[type]) {
      return Array.isArray(this.contentSelectors[type]) 
        ? this.contentSelectors[type] 
        : [this.contentSelectors[type]];
    }

    if (this[type + 'Selectors']) {
      return Array.isArray(this[type + 'Selectors']) 
        ? this[type + 'Selectors'] 
        : [this[type + 'Selectors']];
    }

    return [];
  }

  /**
   * Find element using fallback selectors
   * @param {Element} container - Container element to search within
   * @param {string} type - Type of selector
   * @param {string} subtype - Subtype for nested selectors
   * @returns {Element|null} Found element or null
   */
  findElement(container, type, subtype = null) {
    const selectors = this.getAllSelectors(type, subtype);
    
    for (const selector of selectors) {
      const element = container.querySelector(selector);
      if (element) {
        return element;
      }
    }
    
    return null;
  }

  /**
   * Find all elements using fallback selectors
   * @param {Element} container - Container element to search within
   * @param {string} type - Type of selector
   * @param {string} subtype - Subtype for nested selectors
   * @returns {NodeList} Found elements
   */
  findElements(container, type, subtype = null) {
    const selectors = this.getAllSelectors(type, subtype);
    
    for (const selector of selectors) {
      const elements = container.querySelectorAll(selector);
      if (elements.length > 0) {
        return elements;
      }
    }
    
    return [];
  }

  /**
   * Check if current page is saved posts page
   * @returns {boolean} True if on saved posts page
   */
  isSavedPostsPage() {
    return window.location.href.includes('/my-items/saved-posts/') ||
           window.location.href.includes('/saved/') ||
           document.querySelector('[data-view-name="saved-items"]') !== null;
  }

  /**
   * Check if current page is LinkedIn feed
   * @returns {boolean} True if on LinkedIn feed
   */
  isFeedPage() {
    return window.location.href.includes('/feed/') ||
           document.querySelector('.feed-container') !== null ||
           document.querySelector('.scaffold-layout__main') !== null;
  }

  /**
   * Get post ID from post element
   * @param {Element} postElement - Post DOM element
   * @returns {string|null} Post ID or null
   */
  getPostId(postElement) {
    // Try data-id attribute first
    const dataId = postElement.getAttribute('data-id');
    if (dataId) {
      return dataId;
    }

    // Try to extract from post URL
    const urlElement = this.findElement(postElement, 'content', 'postUrl');
    if (urlElement && urlElement.href) {
      const match = urlElement.href.match(/\/posts\/([^/?]+)/);
      if (match) {
        return match[1];
      }
    }

    // Generate fallback ID based on content hash
    const textElement = this.findElement(postElement, 'content', 'text');
    if (textElement) {
      const text = textElement.textContent.trim();
      return 'post_' + this.simpleHash(text);
    }

    return null;
  }

  /**
   * Simple hash function for generating IDs
   * @param {string} str - String to hash
   * @returns {string} Hash string
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Wait for element to appear in DOM
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Element>} Promise that resolves with element
   */
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations) => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }
}