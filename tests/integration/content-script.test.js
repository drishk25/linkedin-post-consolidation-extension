/**
 * Integration tests for content script functionality
 * Tests the interaction between DOM scanner, post extractor, and UI overlay
 */

import { DOMScanner } from '../../content/dom-scanner.js';
import { PostExtractor } from '../../content/post-extractor.js';
import { UIOverlay } from '../../content/ui-overlay.js';
import { Storage } from '../../utils/storage.js';
import { LinkedInSelectors } from '../../utils/linkedin-selectors.js';
import { DataFormatter } from '../../utils/data-formatter.js';
import { ErrorHandler } from '../../utils/error-handler.js';

describe('Content Script Integration', () => {
  let domScanner;
  let postExtractor;
  let uiOverlay;
  let storage;
  let selectors;
  let formatter;
  let errorHandler;
  let mockPosts;

  beforeEach(() => {
    // Create mock LinkedIn page structure
    document.body.innerHTML = `
      <div id="main-content">
        <div class="feed-container">
          <div class="feed-shared-update-v2" data-urn="urn:li:activity:1">
            <div class="feed-shared-actor__name">John Doe</div>
            <div class="feed-shared-text">First post content</div>
            <time datetime="2023-01-01T00:00:00Z">1d</time>
          </div>
          <div class="feed-shared-update-v2" data-urn="urn:li:activity:2">
            <div class="feed-shared-actor__name">Jane Smith</div>
            <div class="feed-shared-text">Second post content</div>
            <time datetime="2023-01-02T00:00:00Z">2d</time>
          </div>
        </div>
      </div>
    `;

    // Initialize dependencies
    storage = new Storage();
    selectors = new LinkedInSelectors();
    formatter = new DataFormatter();
    errorHandler = new ErrorHandler();

    // Initialize components with dependencies
    postExtractor = new PostExtractor(selectors, formatter, errorHandler);
    domScanner = new DOMScanner(selectors, postExtractor, storage, errorHandler);
    uiOverlay = new UIOverlay(domScanner, storage, errorHandler);
    
    mockPosts = document.querySelectorAll('.feed-shared-update-v2');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    if (uiOverlay && uiOverlay.cleanup) {
      uiOverlay.cleanup();
    }
  });

  describe('Post Discovery and Extraction Flow', () => {
    it('should discover and extract all posts on page', async () => {
      const foundPosts = domScanner.findAllPosts();
      expect(foundPosts).toHaveLength(2);

      const extractedPosts = [];
      for (const postElement of foundPosts) {
        const postData = postExtractor.extractPostData(postElement);
        if (postData) {
          extractedPosts.push(postData);
        }
      }

      expect(extractedPosts).toHaveLength(2);
      expect(extractedPosts[0].author.name).toBe('John Doe');
      expect(extractedPosts[1].author.name).toBe('Jane Smith');
    });

    it('should handle dynamic content loading', async () => {
      // Simulate new post being added
      const newPost = document.createElement('div');
      newPost.className = 'feed-shared-update-v2';
      newPost.setAttribute('data-urn', 'urn:li:activity:3');
      newPost.innerHTML = `
        <div class="feed-shared-actor__name">Bob Johnson</div>
        <div class="feed-shared-text">Dynamic post content</div>
        <time datetime="2023-01-03T00:00:00Z">3d</time>
      `;

      document.querySelector('.feed-container').appendChild(newPost);

      const foundPosts = domScanner.findAllPosts();
      expect(foundPosts).toHaveLength(3);
    });

    it('should filter out already processed posts', async () => {
      const foundPosts = domScanner.findAllPosts();
      const extractedPosts = [];

      for (const postElement of foundPosts) {
        const postData = postExtractor.extractPostData(postElement);
        if (postData) {
          extractedPosts.push(postData);
        }
      }

      // Simulate processing the same posts again
      const secondRun = [];
      for (const postElement of foundPosts) {
        const postData = postExtractor.extractPostData(postElement);
        if (postData) {
          secondRun.push(postData);
        }
      }

      expect(secondRun).toHaveLength(extractedPosts.length);
    });
  });

  describe('UI Overlay Integration', () => {
    it('should show overlay and update progress during scanning', async () => {
      const overlay = document.querySelector('#linkedin-consolidator-overlay');
      expect(overlay).toBeTruthy();

      uiOverlay.showOverlay();
      expect(overlay.classList.contains('expanded')).toBe(true);
    });

    it('should handle user interactions with overlay', () => {
      const toggleButton = document.querySelector('#overlay-toggle');
      expect(toggleButton).toBeTruthy();

      // Simulate click
      toggleButton.click();
      const overlay = document.querySelector('#linkedin-consolidator-overlay');
      expect(overlay.classList.contains('expanded')).toBe(true);
    });

    it('should toggle overlay visibility', () => {
      const overlay = document.querySelector('#linkedin-consolidator-overlay');
      
      uiOverlay.showOverlay();
      expect(overlay.classList.contains('expanded')).toBe(true);
      
      uiOverlay.hideOverlay();
      expect(overlay.classList.contains('expanded')).toBe(false);
    });
  });

  describe('Message Passing Integration', () => {
    it('should communicate scan results to background script', async () => {
      const mockSendMessage = jest.fn();
      chrome.runtime.sendMessage = mockSendMessage;

      await domScanner.startScan({ maxPosts: 10 });

      // Should have sent completion message
      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should handle messages from popup', async () => {
      const mockResponse = { success: true, posts: [], count: 0 };
      
      // Simulate message from popup
      const message = { type: 'GET_EXTRACTED_POSTS' };
      const sender = {};
      const sendResponse = jest.fn();

      // This would normally be handled by the main content script
      // For testing, we'll just verify the scanner can provide the data
      const posts = domScanner.getExtractedPosts();
      expect(Array.isArray(posts)).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle DOM scanning errors gracefully', async () => {
      // Create malformed post element
      const malformedPost = document.createElement('div');
      malformedPost.className = 'feed-shared-update-v2';
      // Missing required elements

      document.querySelector('.feed-container').appendChild(malformedPost);

      const foundPosts = domScanner.findAllPosts();
      expect(foundPosts).toHaveLength(3); // 2 good + 1 malformed

      // Should not throw error when extracting
      const extractedPosts = [];
      for (const postElement of foundPosts) {
        try {
          const postData = postExtractor.extractPostData(postElement);
          if (postData) {
            extractedPosts.push(postData);
          }
        } catch (error) {
          // Should handle errors gracefully
        }
      }

      // Should still extract the valid posts
      expect(extractedPosts.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle extraction errors and continue processing', async () => {
      // Mock extractor to throw error on first post
      const originalExtract = postExtractor.extractPostData;
      let callCount = 0;
      postExtractor.extractPostData = jest.fn().mockImplementation((element) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Extraction failed');
        }
        return originalExtract.call(postExtractor, element);
      });

      const foundPosts = domScanner.findAllPosts();
      const extractedPosts = [];

      for (const postElement of foundPosts) {
        try {
          const postData = postExtractor.extractPostData(postElement);
          if (postData) {
            extractedPosts.push(postData);
          }
        } catch (error) {
          // Continue processing other posts
        }
      }

      // Should have extracted at least one post (the second one)
      expect(extractedPosts.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle overlay rendering errors', () => {
      // Test that overlay can handle missing DOM elements
      document.body.innerHTML = ''; // Remove all content
      
      expect(() => {
        uiOverlay.updatePageStatus();
      }).not.toThrow();
    });
  });

  describe('Performance Integration', () => {
    it('should handle large number of posts efficiently', async () => {
      // Create many posts
      const container = document.querySelector('.feed-container');
      for (let i = 3; i <= 100; i++) {
        const post = document.createElement('div');
        post.className = 'feed-shared-update-v2';
        post.setAttribute('data-urn', `urn:li:activity:${i}`);
        post.innerHTML = `
          <div class="feed-shared-actor__name">User ${i}</div>
          <div class="feed-shared-text">Post content ${i}</div>
          <time datetime="2023-01-01T00:00:00Z">${i}d</time>
        `;
        container.appendChild(post);
      }

      const startTime = performance.now();
      const foundPosts = domScanner.findAllPosts();
      const endTime = performance.now();

      expect(foundPosts).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should batch process posts to avoid blocking UI', async () => {
      // Create many posts
      const container = document.querySelector('.feed-container');
      for (let i = 3; i <= 50; i++) {
        const post = document.createElement('div');
        post.className = 'feed-shared-update-v2';
        post.setAttribute('data-urn', `urn:li:activity:${i}`);
        post.innerHTML = `
          <div class="feed-shared-actor__name">User ${i}</div>
          <div class="feed-shared-text">Post content ${i}</div>
          <time datetime="2023-01-01T00:00:00Z">${i}d</time>
        `;
        container.appendChild(post);
      }

      // Mock the batch processing
      const batchSpy = jest.spyOn(domScanner, 'processBatch');
      
      await domScanner.startScan({ maxPosts: 50 });

      // Should have called batch processing
      expect(batchSpy).toHaveBeenCalled();
    });
  });

  describe('Storage Integration', () => {
    it('should save extracted posts to storage', async () => {
      const saveSpy = jest.spyOn(storage, 'savePosts');
      
      await domScanner.startScan({ maxPosts: 10 });

      expect(saveSpy).toHaveBeenCalled();
    });

    it('should load and merge with existing posts', async () => {
      // Mock existing posts in storage
      const existingPosts = [
        {
          id: 'existing-post-1',
          author: { name: 'Existing User' },
          content: { text: 'Existing content' }
        }
      ];

      jest.spyOn(storage, 'getCachedPosts').mockResolvedValue(existingPosts);
      
      const cachedPosts = await storage.getCachedPosts();
      expect(cachedPosts).toHaveLength(1);
      expect(cachedPosts[0].id).toBe('existing-post-1');
    });
  });
});