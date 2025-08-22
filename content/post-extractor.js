/**
 * Post Extractor
 * Extracts data from LinkedIn post DOM elements
 */

export class PostExtractor {
  constructor(settings = {}) {
    this.settings = {
      extractImages: true,
      extractMetrics: true,
      extractComments: false,
      ...settings
    };
  }

  /**
   * Extract all data from a post element
   * @param {Element} postElement - Post DOM element
   * @returns {object|null} Extracted post data
   */
  extractPost(postElement) {
    try {
      if (!postElement) {
        throw new Error('Post element is null or undefined');
      }

      const postData = {
        id: this.generatePostId(postElement),
        url: this.generatePostUrl(postElement),
        author: this.extractAuthor(postElement),
        content: this.extractContent(postElement),
        timestamp: this.extractTimestamp(postElement)
      };

      // Add optional data based on settings
      if (this.settings.extractMetrics) {
        postData.metrics = this.extractMetrics(postElement);
      }

      if (this.settings.extractImages) {
        postData.images = this.extractImages(postElement);
      }

      return postData;

    } catch (error) {
      console.error('Error extracting post data:', error);
      return null;
    }
  }

  /**
   * Generate post ID from element
   * @param {Element} postElement - Post DOM element
   * @returns {string} Post ID
   */
  generatePostId(postElement) {
    // Handle non-DOM elements in tests
    if (!postElement || typeof postElement.getAttribute !== 'function') {
      return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Try to get URN from data attributes
    const urn = postElement.getAttribute('data-urn') || 
                postElement.getAttribute('data-id') ||
                postElement.getAttribute('data-activity-urn');
    
    if (urn) {
      return urn;
    }

    // Generate fallback ID
    return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate post URL
   * @param {Element} postElement - Post DOM element
   * @returns {string} Post URL
   */
  generatePostUrl(postElement) {
    const id = this.generatePostId(postElement);
    
    if (id.includes('urn:li:activity:')) {
      const activityId = id.replace('urn:li:activity:', '');
      return `https://www.linkedin.com/feed/update/${id}`;
    }
    
    return window.location?.href || 'https://www.linkedin.com/feed/';
  }

  /**
   * Extract author information
   * @param {Element} postElement - Post DOM element
   * @returns {object} Author data
   */
  extractAuthor(postElement) {
    const authorName = this.extractAuthorName(postElement);
    const authorTitle = this.extractAuthorTitle(postElement);
    const authorProfileUrl = this.extractAuthorProfileUrl(postElement);

    return {
      name: authorName,
      title: authorTitle,
      profileUrl: authorProfileUrl
    };
  }

  /**
   * Extract author name
   * @param {Element} postElement - Post DOM element
   * @returns {string} Author name
   */
  extractAuthorName(postElement) {
    // Common LinkedIn selectors for author name
    const selectors = [
      '.feed-shared-actor__name',
      '.update-components-actor__name',
      '.feed-shared-actor__title',
      '[data-control-name="actor_name"]'
    ];

    for (const selector of selectors) {
      const element = postElement.querySelector(selector);
      if (element) {
        // Check for visually hidden text first (more reliable)
        const hiddenText = element.querySelector('.visually-hidden');
        if (hiddenText) {
          return hiddenText.textContent.trim();
        }
        return element.textContent.trim();
      }
    }

    return 'Unknown';
  }

  /**
   * Extract author title
   * @param {Element} postElement - Post DOM element
   * @returns {string} Author title
   */
  extractAuthorTitle(postElement) {
    const selectors = [
      '.feed-shared-actor__description',
      '.update-components-actor__description',
      '.feed-shared-actor__sub-description'
    ];

    for (const selector of selectors) {
      const element = postElement.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        // Filter out timestamps and other non-title content
        if (text && !text.includes('•') && !text.match(/\d+[mhd]/) && !text.includes('ago')) {
          return text;
        }
      }
    }

    return '';
  }

  /**
   * Extract author profile URL
   * @param {Element} postElement - Post DOM element
   * @returns {string} Author profile URL
   */
  extractAuthorProfileUrl(postElement) {
    const selectors = [
      '.feed-shared-actor__container-link',
      '.update-components-actor__container a',
      '.feed-shared-actor a[href*="/in/"]',
      'a[href*="linkedin.com/in/"]'
    ];

    for (const selector of selectors) {
      const element = postElement.querySelector(selector);
      if (element && element.href) {
        return element.href;
      }
    }

    return '';
  }

  /**
   * Extract post content
   * @param {Element} postElement - Post DOM element
   * @returns {string} Post content text
   */
  extractContent(postElement) {
    const selectors = [
      '.feed-shared-text',
      '.update-components-text',
      '.feed-shared-update-v2__description',
      '[data-test-id="main-feed-activity-card"] .break-words'
    ];

    for (const selector of selectors) {
      const element = postElement.querySelector(selector);
      if (element) {
        // Handle "see more" expanded content
        const expandedContent = element.querySelector('.feed-shared-inline-show-more-text');
        if (expandedContent) {
          return this.cleanContent(expandedContent.textContent);
        }
        
        return this.cleanContent(element.textContent);
      }
    }

    return '';
  }

  /**
   * Clean content text by normalizing whitespace
   * @param {string} text - Raw text content
   * @returns {string} Cleaned text
   */
  cleanContent(text) {
    if (!text) return '';
    // Replace multiple whitespace characters with single spaces
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Extract timestamp
   * @param {Element} postElement - Post DOM element
   * @returns {string|null} Timestamp or null if not found
   */
  extractTimestamp(postElement) {
    const selectors = [
      'time[datetime]',
      '.feed-shared-actor__sub-description time',
      '.update-components-actor__sub-description time',
      '[data-test-id="main-feed-activity-card"] time'
    ];

    for (const selector of selectors) {
      const element = postElement.querySelector(selector);
      if (element) {
        // Check for datetime attribute first
        const datetime = element.getAttribute('datetime');
        if (datetime) {
          return datetime;
        }

        // Try to parse from text content
        const timeText = element.textContent.trim();
        return this.parseRelativeTime(timeText);
      }
    }

    return null;
  }

  /**
   * Extract post metrics
   * @param {Element} postElement - Post DOM element
   * @returns {object} Metrics data
   */
  extractMetrics(postElement) {
    return {
      likes: this.extractLikes(postElement),
      comments: this.extractComments(postElement),
      shares: this.extractShares(postElement)
    };
  }

  /**
   * Extract likes count
   * @param {Element} postElement - Post DOM element
   * @returns {number} Likes count
   */
  extractLikes(postElement) {
    const selectors = [
      '.social-counts-reactions__count',
      '.social-counts-reactions .social-counts-reactions__count',
      '[data-test-id="social-actions-bar"] button[aria-label*="like"]'
    ];

    for (const selector of selectors) {
      const element = postElement.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        return this.parseMetricNumber(text);
      }
    }

    return 0;
  }

  /**
   * Extract comments count
   * @param {Element} postElement - Post DOM element
   * @returns {number} Comments count
   */
  extractComments(postElement) {
    const selectors = [
      '.social-counts-comments',
      '[data-test-id="social-actions-bar"] button[aria-label*="comment"]'
    ];

    for (const selector of selectors) {
      const element = postElement.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        return this.parseMetricNumber(text);
      }
    }

    return 0;
  }

  /**
   * Extract shares count
   * @param {Element} postElement - Post DOM element
   * @returns {number} Shares count
   */
  extractShares(postElement) {
    const selectors = [
      '.social-counts-shares',
      '[data-test-id="social-actions-bar"] button[aria-label*="share"]'
    ];

    for (const selector of selectors) {
      const element = postElement.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        return this.parseMetricNumber(text);
      }
    }

    return 0;
  }

  /**
   * Extract images
   * @param {Element} postElement - Post DOM element
   * @returns {Array} Array of image URLs
   */
  extractImages(postElement) {
    const images = [];
    const imageElements = postElement.querySelectorAll('img[src]');

    imageElements.forEach((img) => {
      if (img.src && !img.src.includes('data:image') && !img.src.includes('spacer.gif')) {
        images.push(img.src);
      }
    });

    return images;
  }

  /**
   * Parse metric number from text
   * @param {string} text - Text containing number
   * @returns {number} Parsed number
   */
  parseMetricNumber(text) {
    if (!text) return 0;
    
    // Remove non-numeric characters except K, M, B
    const cleanText = text.replace(/[^\d.,KMB]/gi, '');
    
    if (cleanText.toLowerCase().includes('k')) {
      return Math.round(parseFloat(cleanText) * 1000);
    }
    if (cleanText.toLowerCase().includes('m')) {
      return Math.round(parseFloat(cleanText) * 1000000);
    }
    if (cleanText.toLowerCase().includes('b')) {
      return Math.round(parseFloat(cleanText) * 1000000000);
    }
    
    const num = parseInt(cleanText.replace(/[,\.]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Parse relative time to ISO string
   * @param {string} timeText - Relative time text (e.g., "2h", "1d")
   * @returns {string} ISO timestamp
   */
  parseRelativeTime(timeText) {
    const now = new Date();
    
    // Match patterns like "2h", "1d", "3w", "1mo", "2y"
    const match = timeText.match(/(\d+)([mhdwy]|mo)/i);
    
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      
      switch (unit) {
        case 'm':
          return new Date(now.getTime() - value * 60 * 1000).toISOString();
        case 'h':
          return new Date(now.getTime() - value * 60 * 60 * 1000).toISOString();
        case 'd':
          return new Date(now.getTime() - value * 24 * 60 * 60 * 1000).toISOString();
        case 'w':
          return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000).toISOString();
        case 'mo':
          return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000).toISOString();
        case 'y':
          return new Date(now.getTime() - value * 365 * 24 * 60 * 60 * 1000).toISOString();
      }
    }
    
    return now.toISOString();
  }
}