/**
 * Data Formatter Utility
 * Handles formatting and validation of extracted post data
 */

export class DataFormatter {
  constructor() {
    this.dateFormats = {
      iso: 'YYYY-MM-DDTHH:mm:ss.sssZ',
      readable: 'MMM DD, YYYY at HH:mm',
      short: 'MM/DD/YYYY'
    };
  }

  /**
   * Format post data for export
   * @param {object} rawPostData - Raw extracted post data
   * @returns {object} Formatted post data
   */
  formatPostData(rawPostData) {
    try {
      const formatted = {
        id: this.sanitizeString(rawPostData.id),
        url: this.formatUrl(rawPostData.url),
        author: this.formatAuthorData(rawPostData.author),
        content: this.formatContent(rawPostData.content),
        metrics: this.formatMetrics(rawPostData.metrics),
        media: this.formatMediaData(rawPostData.media),
        timestamp: this.formatTimestamp(rawPostData.timestamp),
        postType: this.determinePostType(rawPostData),
        extractedAt: new Date().toISOString(),
        platform: 'LinkedIn'
      };

      // Validate required fields
      this.validatePostData(formatted);
      
      return formatted;
    } catch (error) {
      console.error('Data Formatting Error:', error, { rawData: rawPostData });
      return null;
    }
  }

  /**
   * Format author data
   * @param {object} authorData - Raw author data
   * @returns {object} Formatted author data
   */
  formatAuthorData(authorData) {
    if (!authorData) return { name: 'Unknown', profile: '', image: '' };

    return {
      name: this.sanitizeString(authorData.name || 'Unknown'),
      profile: this.formatUrl(authorData.profile),
      image: this.formatUrl(authorData.image),
      title: this.sanitizeString(authorData.title || ''),
      company: this.sanitizeString(authorData.company || '')
    };
  }

  /**
   * Format post content
   * @param {string} content - Raw content text
   * @returns {object} Formatted content data
   */
  formatContent(content) {
    if (!content) return { text: '', wordCount: 0, characterCount: 0, hashtags: [], mentions: [] };

    const cleanText = this.sanitizeString(content);
    
    return {
      text: cleanText,
      wordCount: this.countWords(cleanText),
      characterCount: cleanText.length,
      hashtags: this.extractHashtags(cleanText),
      mentions: this.extractMentions(cleanText),
      hasLinks: this.hasLinks(cleanText),
      sentiment: this.analyzeSentiment(cleanText)
    };
  }

  /**
   * Format metrics data
   * @param {object} metrics - Raw metrics data
   * @returns {object} Formatted metrics data
   */
  formatMetrics(metrics) {
    if (!metrics) return { likes: 0, comments: 0, shares: 0, views: 0, engagementRate: 0 };

    const formatted = {
      likes: this.parseNumber(metrics.likes),
      comments: this.parseNumber(metrics.comments),
      shares: this.parseNumber(metrics.shares),
      views: this.parseNumber(metrics.views),
      reactions: this.formatReactions(metrics.reactions)
    };

    // Calculate engagement rate
    formatted.engagementRate = this.calculateEngagementRate(formatted);
    
    return formatted;
  }

  /**
   * Format media data
   * @param {object} media - Raw media data
   * @returns {object} Formatted media data
   */
  formatMediaData(media) {
    if (!media) return { images: [], videos: [], documents: [], hasMedia: false };

    return {
      images: this.formatImageArray(media.images),
      videos: this.formatVideoArray(media.videos),
      documents: this.formatDocumentArray(media.documents),
      hasMedia: this.hasAnyMedia(media)
    };
  }

  /**
   * Format timestamp
   * @param {string|Date} timestamp - Raw timestamp
   * @returns {object} Formatted timestamp data
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return { iso: null, readable: 'Unknown', relative: 'Unknown' };

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }

      return {
        iso: date.toISOString(),
        readable: this.formatReadableDate(date),
        relative: this.getRelativeTime(date),
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
        timeOfDay: this.getTimeOfDay(date)
      };
    } catch (error) {
      console.warn('Timestamp Formatting Warning:', `Invalid timestamp: ${timestamp}`);
      return { iso: null, readable: 'Invalid Date', relative: 'Unknown' };
    }
  }

  /**
   * Determine post type based on content
   * @param {object} postData - Post data
   * @returns {string} Post type
   */
  determinePostType(postData) {
    if (postData.media?.videos?.length > 0) return 'video';
    if (postData.media?.images?.length > 1) return 'carousel';
    if (postData.media?.images?.length === 1) return 'image';
    if (postData.media?.documents?.length > 0) return 'document';
    if (postData.content?.text?.includes('poll')) return 'poll';
    return 'text';
  }

  /**
   * Sanitize string content
   * @param {string} str - Input string
   * @returns {string} Sanitized string
   */
  sanitizeString(str) {
    if (!str) return '';
    
    return str
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
      .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove non-printable characters
      .substring(0, 10000); // Limit length
  }

  /**
   * Format URL
   * @param {string} url - Input URL
   * @returns {string} Formatted URL
   */
  formatUrl(url) {
    if (!url) return '';
    
    try {
      // Handle relative URLs
      if (url.startsWith('/')) {
        url = 'https://www.linkedin.com' + url;
      }
      
      // Validate URL
      new URL(url);
      return url;
    } catch (error) {
      console.warn('URL Formatting Warning:', `Invalid URL: ${url}`);
      return '';
    }
  }

  /**
   * Parse number from string
   * @param {string|number} value - Input value
   * @returns {number} Parsed number
   */
  parseNumber(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    // Handle LinkedIn's number formatting (e.g., "1.2K", "5M")
    const str = String(value).toLowerCase().replace(/,/g, '');
    
    if (str.includes('k')) {
      return Math.round(parseFloat(str) * 1000);
    }
    if (str.includes('m')) {
      return Math.round(parseFloat(str) * 1000000);
    }
    if (str.includes('b')) {
      return Math.round(parseFloat(str) * 1000000000);
    }
    
    const num = parseInt(str, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Count words in text
   * @param {string} text - Input text
   * @returns {number} Word count
   */
  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract hashtags from text
   * @param {string} text - Input text
   * @returns {Array} Array of hashtags
   */
  extractHashtags(text) {
    if (!text) return [];
    const matches = text.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi);
    return matches ? [...new Set(matches.map(tag => tag.toLowerCase()))] : [];
  }

  /**
   * Extract mentions from text
   * @param {string} text - Input text
   * @returns {Array} Array of mentions
   */
  extractMentions(text) {
    if (!text) return [];
    const matches = text.match(/@[\w\u00c0-\u024f\u1e00-\u1eff]+/gi);
    return matches ? [...new Set(matches.map(mention => mention.toLowerCase()))] : [];
  }

  /**
   * Check if text contains links
   * @param {string} text - Input text
   * @returns {boolean} True if contains links
   */
  hasLinks(text) {
    if (!text) return false;
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    return urlRegex.test(text);
  }

  /**
   * Basic sentiment analysis
   * @param {string} text - Input text
   * @returns {string} Sentiment (positive, negative, neutral)
   */
  analyzeSentiment(text) {
    if (!text) return 'neutral';
    
    const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'awesome', 'perfect', 'outstanding'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'failed', 'problem', 'issue'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Format reactions data
   * @param {object} reactions - Raw reactions data
   * @returns {object} Formatted reactions
   */
  formatReactions(reactions) {
    if (!reactions) return {};
    
    const formatted = {};
    Object.keys(reactions).forEach(type => {
      formatted[type] = this.parseNumber(reactions[type]);
    });
    
    return formatted;
  }

  /**
   * Calculate engagement rate
   * @param {object} metrics - Formatted metrics
   * @returns {number} Engagement rate percentage
   */
  calculateEngagementRate(metrics) {
    const totalEngagement = metrics.likes + metrics.comments + metrics.shares;
    if (metrics.views > 0) {
      return Math.round((totalEngagement / metrics.views) * 100 * 100) / 100; // Round to 2 decimal places
    }
    return 0;
  }

  /**
   * Format image array
   * @param {Array} images - Raw images array
   * @returns {Array} Formatted images
   */
  formatImageArray(images) {
    if (!Array.isArray(images)) return [];
    
    return images.map((img, index) => ({
      url: this.formatUrl(img.url || img),
      alt: this.sanitizeString(img.alt || `Image ${index + 1}`),
      width: img.width || null,
      height: img.height || null
    })).filter(img => img.url);
  }

  /**
   * Format video array
   * @param {Array} videos - Raw videos array
   * @returns {Array} Formatted videos
   */
  formatVideoArray(videos) {
    if (!Array.isArray(videos)) return [];
    
    return videos.map((video, index) => ({
      url: this.formatUrl(video.url || video),
      thumbnail: this.formatUrl(video.thumbnail),
      duration: video.duration || null,
      title: this.sanitizeString(video.title || `Video ${index + 1}`)
    })).filter(video => video.url);
  }

  /**
   * Format document array
   * @param {Array} documents - Raw documents array
   * @returns {Array} Formatted documents
   */
  formatDocumentArray(documents) {
    if (!Array.isArray(documents)) return [];
    
    return documents.map((doc, index) => ({
      url: this.formatUrl(doc.url || doc),
      title: this.sanitizeString(doc.title || `Document ${index + 1}`),
      type: doc.type || 'unknown'
    })).filter(doc => doc.url);
  }

  /**
   * Check if post has any media
   * @param {object} media - Media data
   * @returns {boolean} True if has media
   */
  hasAnyMedia(media) {
    if (!media) return false;
    return (media.images && media.images.length > 0) ||
           (media.videos && media.videos.length > 0) ||
           (media.documents && media.documents.length > 0);
  }

  /**
   * Format readable date
   * @param {Date} date - Date object
   * @returns {string} Readable date string
   */
  formatReadableDate(date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get relative time
   * @param {Date} date - Date object
   * @returns {string} Relative time string
   */
  getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  }

  /**
   * Get time of day category
   * @param {Date} date - Date object
   * @returns {string} Time of day
   */
  getTimeOfDay(date) {
    const hour = date.getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  /**
   * Validate post data
   * @param {object} postData - Formatted post data
   * @throws {Error} If validation fails
   */
  validatePostData(postData) {
    const required = ['id', 'author', 'content'];
    
    for (const field of required) {
      if (!postData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (!postData.author.name) {
      throw new Error('Author name is required');
    }
    
    if (!postData.content.text && !postData.media.hasMedia) {
      throw new Error('Post must have either text content or media');
    }
  }

  /**
   * Format data for Google Sheets export
   * @param {Array} posts - Array of formatted posts
   * @returns {Array} Array of rows for sheets
   */
  formatForSheetsExport(posts) {
    const headers = [
      'Post ID', 'Post URL', 'Author Name', 'Author Profile', 'Content Text',
      'Word Count', 'Character Count', 'Hashtags', 'Mentions', 'Post Type',
      'Likes', 'Comments', 'Shares', 'Views', 'Engagement Rate',
      'Has Media', 'Images Count', 'Videos Count', 'Documents Count',
      'Posted Date', 'Relative Time', 'Day of Week', 'Time of Day',
      'Sentiment', 'Extracted Date'
    ];
    
    const rows = [headers];
    
    posts.forEach(post => {
      rows.push([
        post.id,
        post.url,
        post.author.name,
        post.author.profile,
        post.content.text,
        post.content.wordCount,
        post.content.characterCount,
        post.content.hashtags.join(', '),
        post.content.mentions.join(', '),
        post.postType,
        post.metrics.likes,
        post.metrics.comments,
        post.metrics.shares,
        post.metrics.views,
        post.metrics.engagementRate + '%',
        post.media.hasMedia ? 'Yes' : 'No',
        post.media.images.length,
        post.media.videos.length,
        post.media.documents.length,
        post.timestamp.readable,
        post.timestamp.relative,
        post.timestamp.dayOfWeek,
        post.timestamp.timeOfDay,
        post.content.sentiment,
        post.extractedAt
      ]);
    });
    
    return rows;
  }
}