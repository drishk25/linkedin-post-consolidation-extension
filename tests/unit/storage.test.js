/**
 * Unit tests for Storage utility class
 * Tests Chrome storage API wrapper functionality
 */

import { Storage } from '../../utils/storage.js';

describe('Storage', () => {
  let storage;

  beforeEach(() => {
    storage = new Storage();
  });

  describe('get', () => {
    it('should retrieve single value from sync storage', async () => {
      const mockValue = 'test-value';
      chrome.storage.sync.get.mockResolvedValue({ testKey: mockValue });

      const result = await storage.get('testKey');

      expect(chrome.storage.sync.get).toHaveBeenCalledWith(['testKey']);
      expect(result).toBe(mockValue);
    });

    it('should retrieve multiple values from sync storage', async () => {
      const mockData = { key1: 'value1', key2: 'value2' };
      chrome.storage.sync.get.mockResolvedValue(mockData);

      const result = await storage.get(['key1', 'key2']);

      expect(chrome.storage.sync.get).toHaveBeenCalledWith(['key1', 'key2']);
      expect(result).toEqual(mockData);
    });

    it('should return default value when key not found', async () => {
      chrome.storage.sync.get.mockResolvedValue({});

      const result = await storage.get('nonexistent', 'default');

      expect(result).toBe('default');
    });

    it('should retrieve from local storage when specified', async () => {
      const mockValue = 'local-value';
      chrome.storage.local.get.mockResolvedValue({ testKey: mockValue });

      const result = await storage.get('testKey', null, 'local');

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['testKey']);
      expect(result).toBe(mockValue);
    });

    it('should handle Chrome API errors gracefully', async () => {
      const error = new Error('Storage error');
      chrome.storage.sync.get.mockRejectedValue(error);

      await expect(storage.get('testKey')).rejects.toThrow('Storage error');
    });
  });

  describe('set', () => {
    it('should store single value in sync storage', async () => {
      await storage.set('testKey', 'testValue');

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        testKey: 'testValue'
      });
    });

    it('should store multiple values in sync storage', async () => {
      const data = { key1: 'value1', key2: 'value2' };
      await storage.set(data);

      expect(chrome.storage.sync.set).toHaveBeenCalledWith(data);
    });

    it('should store in local storage when specified', async () => {
      await storage.set('testKey', 'testValue', 'local');

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        testKey: 'testValue'
      });
    });

    it('should handle Chrome API errors gracefully', async () => {
      const error = new Error('Storage error');
      chrome.storage.sync.set.mockRejectedValue(error);

      await expect(storage.set('testKey', 'testValue')).rejects.toThrow('Storage error');
    });
  });

  describe('remove', () => {
    it('should remove single key from sync storage', async () => {
      await storage.remove('testKey');

      expect(chrome.storage.sync.remove).toHaveBeenCalledWith(['testKey']);
    });

    it('should remove multiple keys from sync storage', async () => {
      await storage.remove(['key1', 'key2']);

      expect(chrome.storage.sync.remove).toHaveBeenCalledWith(['key1', 'key2']);
    });

    it('should remove from local storage when specified', async () => {
      await storage.remove('testKey', 'local');

      expect(chrome.storage.local.remove).toHaveBeenCalledWith(['testKey']);
    });
  });

  describe('clear', () => {
    it('should clear sync storage', async () => {
      await storage.clear();

      expect(chrome.storage.sync.clear).toHaveBeenCalled();
    });

    it('should clear local storage when specified', async () => {
      await storage.clear('local');

      expect(chrome.storage.local.clear).toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should retrieve all data from sync storage', async () => {
      const mockData = { key1: 'value1', key2: 'value2' };
      chrome.storage.sync.get.mockResolvedValue(mockData);

      const result = await storage.getAll();

      expect(chrome.storage.sync.get).toHaveBeenCalledWith(null);
      expect(result).toEqual(mockData);
    });

    it('should retrieve all data from local storage when specified', async () => {
      const mockData = { posts: [], stats: {} };
      chrome.storage.local.get.mockResolvedValue(mockData);

      const result = await storage.getAll('local');

      expect(chrome.storage.local.get).toHaveBeenCalledWith(null);
      expect(result).toEqual(mockData);
    });
  });

  describe('onChanged', () => {
    it('should add storage change listener', () => {
      const callback = jest.fn();
      storage.onChanged(callback);

      expect(chrome.storage.onChanged.addListener).toHaveBeenCalledWith(callback);
    });

    it('should trigger callback on storage changes', () => {
      const callback = jest.fn();
      storage.onChanged(callback);

      // Simulate storage change
      const changes = {
        testKey: { oldValue: 'old', newValue: 'new' }
      };
      const areaName = 'sync';

      // Get the registered callback and call it
      const registeredCallback = chrome.storage.onChanged.addListener.mock.calls[0][0];
      registeredCallback(changes, areaName);

      expect(callback).toHaveBeenCalledWith(changes, areaName);
    });
  });

  describe('getBytesInUse', () => {
    it('should get bytes in use for sync storage', async () => {
      chrome.storage.sync.getBytesInUse.mockResolvedValue(1024);

      const result = await storage.getBytesInUse();

      expect(chrome.storage.sync.getBytesInUse).toHaveBeenCalledWith(null);
      expect(result).toBe(1024);
    });

    it('should get bytes in use for specific keys', async () => {
      chrome.storage.sync.getBytesInUse.mockResolvedValue(512);

      const result = await storage.getBytesInUse(['key1', 'key2']);

      expect(chrome.storage.sync.getBytesInUse).toHaveBeenCalledWith(['key1', 'key2']);
      expect(result).toBe(512);
    });

    it('should get bytes in use for local storage when specified', async () => {
      chrome.storage.local.getBytesInUse.mockResolvedValue(2048);

      const result = await storage.getBytesInUse(null, 'local');

      expect(chrome.storage.local.getBytesInUse).toHaveBeenCalledWith(null);
      expect(result).toBe(2048);
    });
  });

  describe('settings management', () => {
    it('should get settings with defaults', async () => {
      const mockSettings = testUtils.createMockStorageData();
      chrome.storage.sync.get.mockResolvedValue(mockSettings);

      const settings = await storage.getSettings();

      expect(settings).toEqual(mockSettings);
    });

    it('should merge with default settings when some keys missing', async () => {
      const partialSettings = { autoScan: true };
      chrome.storage.sync.get.mockResolvedValue(partialSettings);

      const settings = await storage.getSettings();

      expect(settings.autoScan).toBe(true);
      expect(settings.extractImages).toBe(true); // default value
      expect(settings.sheetName).toBe('LinkedIn Posts'); // default value
    });

    it('should save settings', async () => {
      const newSettings = { autoScan: true, extractImages: false };

      await storage.saveSettings(newSettings);

      expect(chrome.storage.sync.set).toHaveBeenCalledWith(newSettings);
    });
  });

  describe('posts management', () => {
    it('should get posts from local storage', async () => {
      const mockPosts = [testUtils.createMockPostData()];
      chrome.storage.local.get.mockResolvedValue({ posts: mockPosts });

      const posts = await storage.getPosts();

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['posts']);
      expect(posts).toEqual(mockPosts);
    });

    it('should return empty array when no posts stored', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      const posts = await storage.getPosts();

      expect(posts).toEqual([]);
    });

    it('should save posts to local storage', async () => {
      const mockPosts = [testUtils.createMockPostData()];

      await storage.savePosts(mockPosts);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ posts: mockPosts });
    });

    it('should add single post', async () => {
      const existingPosts = [testUtils.createMockPostData({ id: 'post1' })];
      const newPost = testUtils.createMockPostData({ id: 'post2' });
      
      chrome.storage.local.get.mockResolvedValue({ posts: existingPosts });

      await storage.addPost(newPost);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        posts: [...existingPosts, newPost]
      });
    });

    it('should not add duplicate posts', async () => {
      const existingPost = testUtils.createMockPostData({ id: 'post1' });
      const existingPosts = [existingPost];
      
      chrome.storage.local.get.mockResolvedValue({ posts: existingPosts });

      await storage.addPost(existingPost);

      // Should not add duplicate
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        posts: existingPosts
      });
    });

    it('should clear all posts', async () => {
      await storage.clearPosts();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith(['posts']);
    });
  });

  describe('stats management', () => {
    it('should get stats from local storage', async () => {
      const mockStats = { postsFound: 10, postsExported: 5 };
      chrome.storage.local.get.mockResolvedValue({ stats: mockStats });

      const stats = await storage.getStats();

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['stats']);
      expect(stats).toEqual(mockStats);
    });

    it('should return default stats when none stored', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      const stats = await storage.getStats();

      expect(stats).toEqual({
        postsFound: 0,
        postsExported: 0,
        lastScan: null
      });
    });

    it('should save stats to local storage', async () => {
      const mockStats = { postsFound: 15, postsExported: 10 };

      await storage.saveStats(mockStats);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ stats: mockStats });
    });

    it('should update stats incrementally', async () => {
      const existingStats = { postsFound: 10, postsExported: 5, lastScan: null };
      const updates = { postsFound: 15 };
      
      chrome.storage.local.get.mockResolvedValue({ stats: existingStats });

      await storage.updateStats(updates);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        stats: { ...existingStats, ...updates }
      });
    });
  });

  describe('error handling', () => {
    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('QUOTA_BYTES_PER_ITEM quota exceeded');
      chrome.storage.sync.set.mockRejectedValue(quotaError);

      await expect(storage.set('largeKey', 'x'.repeat(10000)))
        .rejects.toThrow('QUOTA_BYTES_PER_ITEM quota exceeded');
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      chrome.storage.sync.get.mockRejectedValue(networkError);

      await expect(storage.get('testKey')).rejects.toThrow('Network error');
    });
  });

  describe('migration', () => {
    it('should migrate old data format', async () => {
      const oldData = {
        'linkedin-posts': [testUtils.createMockPostData()],
        'linkedin-settings': { autoScan: true }
      };
      
      chrome.storage.local.get.mockResolvedValue(oldData);

      const migrated = await storage.migrateOldData();

      expect(migrated).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        posts: oldData['linkedin-posts']
      });
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        oldData['linkedin-settings']
      );
    });

    it('should skip migration when no old data exists', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      const migrated = await storage.migrateOldData();

      expect(migrated).toBe(false);
    });
  });
});