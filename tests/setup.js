/**
 * Test setup configuration for LinkedIn Post Consolidation Extension
 * Sets up global mocks, utilities, and test environment
 */

require('@testing-library/jest-dom');
const { chrome } = require('jest-chrome');

// Mock Chrome APIs
global.chrome = chrome;

// Mock DOM APIs that might not be available in test environment
global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback;
  }
  
  observe() {
    // Mock implementation
  }
  
  disconnect() {
    // Mock implementation
  }
  
  takeRecords() {
    return [];
  }
};

global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  
  observe() {
    // Mock implementation
  }
  
  unobserve() {
    // Mock implementation
  }
  
  disconnect() {
    // Mock implementation
  }
};

// Mock fetch API
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup Chrome extension mocks
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Setup default Chrome API responses
  chrome.storage.sync.get.mockImplementation((keys, callback) => {
    const result = {};
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        result[key] = null;
      });
    } else if (typeof keys === 'object') {
      Object.assign(result, keys);
    }
    if (callback) callback(result);
    return Promise.resolve(result);
  });
  
  chrome.storage.sync.set.mockImplementation((items, callback) => {
    if (callback) callback();
    return Promise.resolve();
  });
  
  chrome.storage.local.get.mockImplementation((keys, callback) => {
    const result = {};
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        result[key] = null;
      });
    } else if (typeof keys === 'object') {
      Object.assign(result, keys);
    }
    if (callback) callback(result);
    return Promise.resolve(result);
  });
  
  chrome.storage.local.set.mockImplementation((items, callback) => {
    if (callback) callback();
    return Promise.resolve();
  });
  
  chrome.tabs.query.mockImplementation((queryInfo, callback) => {
    const tabs = [
      {
        id: 1,
        url: 'https://www.linkedin.com/feed/',
        title: 'LinkedIn Feed',
        active: true,
        windowId: 1
      }
    ];
    if (callback) callback(tabs);
    return Promise.resolve(tabs);
  });
  
  chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
    const response = { success: true };
    if (callback) callback(response);
    return Promise.resolve(response);
  });
  
  chrome.runtime.sendMessage.mockImplementation((message, callback) => {
    const response = { success: true };
    if (callback) callback(response);
    return Promise.resolve(response);
  });
  
  // Mock runtime API
  chrome.runtime.onMessage = {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    hasListener: jest.fn()
  };
  chrome.runtime.openOptionsPage = jest.fn();
  
  // Mock storage onChanged API
  chrome.storage.onChanged = {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    hasListener: jest.fn()
  };
  
  // Mock identity API for Google authentication
  chrome.identity = {
    getAuthToken: jest.fn().mockImplementation((options, callback) => {
      const token = 'mock-auth-token';
      if (callback) callback(token);
      return Promise.resolve(token);
    }),
    removeCachedAuthToken: jest.fn().mockImplementation((details, callback) => {
      if (callback) callback();
      return Promise.resolve();
    }),
    getProfileUserInfo: jest.fn().mockImplementation((callback) => {
      const userInfo = { email: 'test@example.com', id: '123' };
      if (callback) callback(userInfo);
      return Promise.resolve(userInfo);
    })
  };
});

// Cleanup after each test
afterEach(() => {
  // Clean up any DOM modifications
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Reset fetch mock
  fetch.mockClear();
});

// Global test utilities
global.testUtils = {
  // Create mock LinkedIn post element
  createMockPost: (options = {}) => {
    const post = document.createElement('div');
    post.className = 'feed-shared-update-v2';
    post.setAttribute('data-urn', options.urn || 'urn:li:activity:123456789');
    
    // Author with profile link
    const authorLink = document.createElement('a');
    authorLink.href = options.profileUrl || 'https://www.linkedin.com/in/johndoe';
    authorLink.className = 'feed-shared-actor__container-link';
    
    const author = document.createElement('div');
    author.className = 'feed-shared-actor__name';
    author.textContent = options.author || 'John Doe';
    authorLink.appendChild(author);
    post.appendChild(authorLink);
    
    // Content
    const content = document.createElement('div');
    content.className = 'feed-shared-text';
    content.textContent = options.content || 'This is a test post content.';
    post.appendChild(content);
    
    // Timestamp
    const timestamp = document.createElement('time');
    timestamp.className = 'feed-shared-actor__sub-description';
    timestamp.setAttribute('datetime', options.timestamp || '2023-01-01T00:00:00Z');
    timestamp.textContent = options.timestampText || '1d';
    post.appendChild(timestamp);
    
    // Metrics
    const metrics = document.createElement('div');
    metrics.className = 'social-counts-reactions';
    
    const likes = document.createElement('span');
    likes.textContent = options.likes || '10 likes';
    metrics.appendChild(likes);
    
    const comments = document.createElement('span');
    comments.textContent = options.comments || '5 comments';
    metrics.appendChild(comments);
    
    post.appendChild(metrics);
    
    return post;
  },
  
  // Create mock Chrome storage data
  createMockStorageData: (overrides = {}) => {
    return {
      autoScan: false,
      scanInterval: 5,
      extractImages: true,
      extractMetrics: true,
      extractComments: false,
      spreadsheetUrl: '',
      sheetName: 'LinkedIn Posts',
      batchSize: 50,
      autoExport: false,
      googleAuth: null,
      ...overrides
    };
  },
  
  // Create mock post data
  createMockPostData: (overrides = {}) => {
    return {
      id: 'urn:li:activity:123456789',
      url: 'https://www.linkedin.com/feed/update/urn:li:activity:123456789',
      author: {
        name: 'John Doe',
        title: 'Software Engineer',
        profileUrl: 'https://www.linkedin.com/in/johndoe'
      },
      content: 'This is a test post content.',
      timestamp: '2023-01-01T00:00:00Z',
      metrics: {
        likes: 10,
        comments: 5,
        shares: 2
      },
      images: [],
      extractedAt: new Date().toISOString(),
      ...overrides
    };
  },
  
  // Wait for async operations
  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 100);
        }
      };
      
      check();
    });
  },
  
  // Simulate user interaction
  simulateClick: (element) => {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(event);
  },
  
  // Mock Google Sheets API responses
  mockGoogleSheetsAPI: () => {
    global.gapi = {
      load: jest.fn((api, callback) => {
        if (callback) callback();
      }),
      client: {
        init: jest.fn().mockResolvedValue(),
        sheets: {
          spreadsheets: {
            values: {
              append: jest.fn().mockResolvedValue({
                result: {
                  updates: {
                    updatedRows: 1
                  }
                }
              }),
              get: jest.fn().mockResolvedValue({
                result: {
                  values: []
                }
              })
            }
          }
        }
      }
    };
  }
};

// Custom Jest matchers
expect.extend({
  toBeValidPostData(received) {
    const requiredFields = ['id', 'url', 'author', 'content', 'timestamp'];
    const missingFields = requiredFields.filter(field => !(field in received));
    
    if (missingFields.length > 0) {
      return {
        message: () => `Expected post data to have required fields: ${missingFields.join(', ')}`,
        pass: false
      };
    }
    
    return {
      message: () => 'Expected post data to be invalid',
      pass: true
    };
  },
  
  toBeValidLinkedInUrl(received) {
    const linkedInUrlPattern = /^https:\/\/(www\.)?linkedin\.com\//;
    const pass = linkedInUrlPattern.test(received);
    
    return {
      message: () => pass 
        ? `Expected ${received} not to be a valid LinkedIn URL`
        : `Expected ${received} to be a valid LinkedIn URL`,
      pass
    };
  }
});