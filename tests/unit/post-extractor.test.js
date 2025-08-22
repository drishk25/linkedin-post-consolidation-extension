/**
 * Unit tests for PostExtractor class
 * Tests post data extraction functionality
 */

import { PostExtractor } from '../../content/post-extractor.js';

describe('PostExtractor', () => {
  let extractor;
  let mockPost;

  beforeEach(() => {
    extractor = new PostExtractor();
    mockPost = testUtils.createMockPost();
    document.body.appendChild(mockPost);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      expect(extractor.settings).toEqual({
        extractImages: true,
        extractMetrics: true,
        extractComments: false
      });
    });

    it('should accept custom settings', () => {
      const customExtractor = new PostExtractor({
        extractImages: false,
        extractComments: true
      });

      expect(customExtractor.settings).toEqual({
        extractImages: false,
        extractMetrics: true,
        extractComments: true
      });
    });
  });

  describe('extractPost', () => {
    it('should extract basic post data', async () => {
      const postData = await extractor.extractPost(mockPost);

      expect(postData).toBeValidPostData();
      expect(postData.id).toBe('urn:li:activity:123456789');
      expect(postData.author.name).toBe('John Doe');
      expect(postData.content).toBe('This is a test post content.');
    });

    it('should extract author information', async () => {
      const postData = await extractor.extractPost(mockPost);

      expect(postData.author).toEqual({
        name: 'John Doe',
        title: expect.any(String),
        profileUrl: expect.stringMatching(/linkedin\.com/)
      });
    });

    it('should extract timestamp', async () => {
      const postData = await extractor.extractPost(mockPost);

      expect(postData.timestamp).toBe('2023-01-01T00:00:00Z');
      expect(new Date(postData.timestamp)).toBeInstanceOf(Date);
    });

    it('should extract metrics when enabled', async () => {
      extractor.settings.extractMetrics = true;
      const postData = await extractor.extractPost(mockPost);

      expect(postData.metrics).toEqual({
        likes: expect.any(Number),
        comments: expect.any(Number),
        shares: expect.any(Number)
      });
    });

    it('should skip metrics when disabled', async () => {
      extractor.settings.extractMetrics = false;
      const postData = await extractor.extractPost(mockPost);

      expect(postData.metrics).toBeUndefined();
    });

    it('should generate correct post URL', async () => {
      const postData = await extractor.extractPost(mockPost);

      expect(postData.url).toBeValidLinkedInUrl();
      expect(postData.url).toContain('urn:li:activity:123456789');
    });

    it('should handle missing elements gracefully', async () => {
      const emptyPost = document.createElement('div');
      emptyPost.className = 'feed-shared-update-v2';
      
      const postData = await extractor.extractPost(emptyPost);

      expect(postData).toBeDefined();
      expect(postData.author.name).toBe('Unknown');
      expect(postData.content).toBe('');
    });
  });

  describe('extractAuthor', () => {
    it('should extract author name', () => {
      const author = extractor.extractAuthor(mockPost);
      expect(author.name).toBe('John Doe');
    });

    it('should handle missing author name', () => {
      const postWithoutAuthor = document.createElement('div');
      const author = extractor.extractAuthor(postWithoutAuthor);
      expect(author.name).toBe('Unknown');
    });

    it('should extract profile URL when available', () => {
      const profileLink = document.createElement('a');
      profileLink.href = 'https://www.linkedin.com/in/johndoe';
      profileLink.className = 'feed-shared-actor__name';
      mockPost.appendChild(profileLink);

      const author = extractor.extractAuthor(mockPost);
      expect(author.profileUrl).toBe('https://www.linkedin.com/in/johndoe');
    });
  });

  describe('extractContent', () => {
    it('should extract post content', () => {
      const content = extractor.extractContent(mockPost);
      expect(content).toBe('This is a test post content.');
    });

    it('should handle posts with no content', () => {
      const postWithoutContent = document.createElement('div');
      const content = extractor.extractContent(postWithoutContent);
      expect(content).toBe('');
    });

    it('should clean up content formatting', () => {
      const contentElement = mockPost.querySelector('.feed-shared-text');
      contentElement.innerHTML = '  This is content with   extra spaces  ';
      
      const content = extractor.extractContent(mockPost);
      expect(content).toBe('This is content with extra spaces');
    });
  });

  describe('extractTimestamp', () => {
    it('should extract ISO timestamp', () => {
      const timestamp = extractor.extractTimestamp(mockPost);
      expect(timestamp).toBe('2023-01-01T00:00:00Z');
    });

    it('should handle missing timestamp', () => {
      const postWithoutTimestamp = document.createElement('div');
      const timestamp = extractor.extractTimestamp(postWithoutTimestamp);
      expect(timestamp).toBeNull();
    });

    it('should parse relative timestamps', () => {
      const timeElement = mockPost.querySelector('time');
      timeElement.removeAttribute('datetime');
      timeElement.textContent = '2h';

      const timestamp = extractor.extractTimestamp(mockPost);
      expect(timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('extractMetrics', () => {
    it('should extract like count', () => {
      const metrics = extractor.extractMetrics(mockPost);
      expect(metrics.likes).toBeGreaterThanOrEqual(0);
    });

    it('should extract comment count', () => {
      const metrics = extractor.extractMetrics(mockPost);
      expect(metrics.comments).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing metrics', () => {
      const postWithoutMetrics = document.createElement('div');
      const metrics = extractor.extractMetrics(postWithoutMetrics);
      
      expect(metrics).toEqual({
        likes: 0,
        comments: 0,
        shares: 0
      });
    });
  });

  describe('extractImages', () => {
    it('should extract image URLs when enabled', () => {
      const img = document.createElement('img');
      img.src = 'https://example.com/image.jpg';
      img.className = 'feed-shared-image';
      mockPost.appendChild(img);

      extractor.settings.extractImages = true;
      const images = extractor.extractImages(mockPost);
      
      expect(images).toContain('https://example.com/image.jpg');
    });

    it('should return empty array when disabled', () => {
      extractor.settings.extractImages = false;
      const images = extractor.extractImages(mockPost);
      
      expect(images).toEqual([]);
    });

    it('should handle posts without images', () => {
      const images = extractor.extractImages(mockPost);
      expect(images).toEqual([]);
    });
  });

  describe('generatePostId', () => {
    it('should extract URN from data attribute', () => {
      const id = extractor.generatePostId(mockPost);
      expect(id).toBe('urn:li:activity:123456789');
    });

    it('should generate fallback ID when URN missing', () => {
      mockPost.removeAttribute('data-urn');
      const id = extractor.generatePostId(mockPost);
      
      expect(id).toMatch(/^post_\d+$/);
    });
  });

  describe('generatePostUrl', () => {
    it('should generate correct LinkedIn URL', () => {
      const url = extractor.generatePostUrl('urn:li:activity:123456789');
      
      expect(url).toBe('https://www.linkedin.com/feed/update/urn:li:activity:123456789');
      expect(url).toBeValidLinkedInUrl();
    });

    it('should handle different URN formats', () => {
      const url = extractor.generatePostUrl('urn:li:share:987654321');
      
      expect(url).toBe('https://www.linkedin.com/feed/update/urn:li:share:987654321');
    });
  });

  describe('error handling', () => {
    it('should handle null post element', async () => {
      const postData = await extractor.extractPost(null);
      expect(postData).toBeNull();
    });

    it('should handle DOM exceptions gracefully', async () => {
      const mockPostWithError = {
        querySelector: jest.fn().mockImplementation(() => {
          throw new Error('DOM error');
        })
      };

      const postData = await extractor.extractPost(mockPostWithError);
      expect(postData).toBeDefined();
      expect(postData.author.name).toBe('Unknown');
    });
  });
});