/**
 * End-to-end tests for LinkedIn Post Consolidation Extension
 * Tests the complete user workflow in a real browser environment
 */

import { test, expect } from '@playwright/test';

test.describe('LinkedIn Extension E2E Tests', () => {
  let extensionId;

  test.beforeAll(async ({ browser }) => {
    // Get extension ID from the loaded extension
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to chrome://extensions to get extension ID
    await page.goto('chrome://extensions/');
    
    // Find our extension (this is a simplified approach)
    const extensions = await page.locator('[id^="extension-"]').all();
    for (const ext of extensions) {
      const name = await ext.locator('.extension-name').textContent();
      if (name?.includes('LinkedIn Post Consolidation')) {
        extensionId = await ext.getAttribute('id');
        break;
      }
    }
    
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to a mock LinkedIn page for testing
    await page.goto('http://localhost:3000/mock-linkedin.html');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Extension Installation and Setup', () => {
    test('should load extension successfully', async ({ page }) => {
      // Check if extension is loaded by looking for content script injection
      const extensionLoaded = await page.evaluate(() => {
        return window.linkedinExtensionLoaded === true;
      });
      
      expect(extensionLoaded).toBe(true);
    });

    test('should show popup when extension icon is clicked', async ({ page }) => {
      // Click extension icon (this requires the extension to be loaded)
      await page.click(`[data-extension-id="${extensionId}"]`);
      
      // Wait for popup to appear
      const popup = await page.waitForSelector('.popup-container');
      expect(popup).toBeTruthy();
      
      // Check popup content
      await expect(page.locator('.app-title')).toHaveText('LinkedIn Posts');
      await expect(page.locator('#scan-posts')).toBeVisible();
      await expect(page.locator('#export-posts')).toBeVisible();
    });

    test('should open options page', async ({ page }) => {
      // Click extension icon
      await page.click(`[data-extension-id="${extensionId}"]`);
      
      // Click settings button in popup
      await page.click('#settings-btn');
      
      // Wait for options page to open in new tab
      const [optionsPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.click('#settings-btn')
      ]);
      
      await optionsPage.waitForLoadState();
      
      // Verify options page content
      await expect(optionsPage.locator('h1')).toHaveText('LinkedIn Post Consolidation Settings');
      await expect(optionsPage.locator('.tab-button[data-tab="general"]')).toBeVisible();
    });
  });

  test.describe('Post Scanning Functionality', () => {
    test('should detect posts on LinkedIn page', async ({ page }) => {
      // Inject mock LinkedIn posts into the page
      await page.evaluate(() => {
        const container = document.createElement('div');
        container.className = 'feed-container';
        
        for (let i = 1; i <= 3; i++) {
          const post = document.createElement('div');
          post.className = 'feed-shared-update-v2';
          post.setAttribute('data-urn', `urn:li:activity:${i}`);
          
          post.innerHTML = `
            <div class="feed-shared-actor__name">Test User ${i}</div>
            <div class="feed-shared-text">This is test post content ${i}</div>
            <time datetime="2023-01-0${i}T00:00:00Z">${i}d</time>
            <div class="social-counts-reactions">
              <span>${i * 10} likes</span>
              <span>${i * 5} comments</span>
            </div>
          `;
          
          container.appendChild(post);
        }
        
        document.body.appendChild(container);
      });

      // Open extension popup
      await page.click(`[data-extension-id="${extensionId}"]`);
      
      // Start scanning
      await page.click('#scan-posts');
      
      // Wait for scan to complete
      await page.waitForSelector('#progress-section', { state: 'visible' });
      await page.waitForSelector('#progress-section', { state: 'hidden', timeout: 10000 });
      
      // Check that posts were found
      const postsFound = await page.locator('#posts-found').textContent();
      expect(parseInt(postsFound)).toBe(3);
    });

    test('should show overlay during scanning', async ({ page }) => {
      // Trigger overlay display
      await page.evaluate(() => {
        window.postMessage({ action: 'showOverlay' }, '*');
      });
      
      // Wait for overlay to appear
      const overlay = await page.waitForSelector('.linkedin-overlay');
      expect(overlay).toBeTruthy();
      
      // Check overlay content
      await expect(page.locator('.overlay-title')).toHaveText('LinkedIn Post Scanner');
      await expect(page.locator('.btn-start-scan')).toBeVisible();
      await expect(page.locator('.btn-stop-scan')).toBeVisible();
    });

    test('should update progress during scanning', async ({ page }) => {
      // Show overlay
      await page.evaluate(() => {
        window.postMessage({ action: 'showOverlay' }, '*');
      });
      
      await page.waitForSelector('.linkedin-overlay');
      
      // Start scan
      await page.click('.btn-start-scan');
      
      // Wait for progress updates
      await page.waitForSelector('.progress-bar', { state: 'visible' });
      
      // Check that progress is updating
      const progressBar = page.locator('.progress-fill');
      await expect(progressBar).toHaveCSS('width', /\d+%/);
      
      // Wait for completion
      await page.waitForFunction(() => {
        const progress = document.querySelector('.progress-fill');
        return progress && progress.style.width === '100%';
      }, { timeout: 10000 });
    });

    test('should handle scan cancellation', async ({ page }) => {
      // Show overlay and start scan
      await page.evaluate(() => {
        window.postMessage({ action: 'showOverlay' }, '*');
      });
      
      await page.waitForSelector('.linkedin-overlay');
      await page.click('.btn-start-scan');
      
      // Cancel scan
      await page.click('.btn-stop-scan');
      
      // Verify scan was cancelled
      const statusText = await page.locator('.status-text').textContent();
      expect(statusText).toContain('cancelled');
    });
  });

  test.describe('Settings Management', () => {
    test('should save and load settings', async ({ page }) => {
      // Open options page
      const [optionsPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.evaluate(() => {
          chrome.runtime.openOptionsPage();
        })
      ]);
      
      await optionsPage.waitForLoadState();
      
      // Change settings
      await optionsPage.check('#auto-scan');
      await optionsPage.fill('#scan-interval', '10');
      await optionsPage.click('button[type="submit"]');
      
      // Wait for save confirmation
      await optionsPage.waitForSelector('.notification.success');
      
      // Reload page and verify settings persisted
      await optionsPage.reload();
      await optionsPage.waitForLoadState();
      
      const autoScanChecked = await optionsPage.isChecked('#auto-scan');
      const scanInterval = await optionsPage.inputValue('#scan-interval');
      
      expect(autoScanChecked).toBe(true);
      expect(scanInterval).toBe('10');
    });

    test('should validate form inputs', async ({ page }) => {
      const [optionsPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.evaluate(() => {
          chrome.runtime.openOptionsPage();
        })
      ]);
      
      await optionsPage.waitForLoadState();
      
      // Switch to export tab
      await optionsPage.click('.tab-button[data-tab="export"]');
      
      // Enter invalid spreadsheet URL
      await optionsPage.fill('#spreadsheet-url', 'invalid-url');
      await optionsPage.click('button[type="submit"]');
      
      // Check for validation error
      const errorMessage = await optionsPage.locator('.field-error').textContent();
      expect(errorMessage).toContain('valid Google Sheets URL');
    });

    test('should export and import settings', async ({ page }) => {
      const [optionsPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.evaluate(() => {
          chrome.runtime.openOptionsPage();
        })
      ]);
      
      await optionsPage.waitForLoadState();
      
      // Switch to advanced tab
      await optionsPage.click('.tab-button[data-tab="advanced"]');
      
      // Export settings
      const [download] = await Promise.all([
        optionsPage.waitForEvent('download'),
        optionsPage.click('#export-settings')
      ]);
      
      expect(download.suggestedFilename()).toBe('linkedin-extension-settings.json');
      
      // Import settings (would require file upload simulation)
      await optionsPage.click('#import-settings');
      const fileInput = optionsPage.locator('#settings-file');
      expect(fileInput).toBeVisible();
    });
  });

  test.describe('Google Sheets Integration', () => {
    test('should handle Google authentication', async ({ page }) => {
      const [optionsPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.evaluate(() => {
          chrome.runtime.openOptionsPage();
        })
      ]);
      
      await optionsPage.waitForLoadState();
      
      // Switch to Google tab
      await optionsPage.click('.tab-button[data-tab="google"]');
      
      // Mock successful authentication
      await optionsPage.evaluate(() => {
        window.mockGoogleAuth = {
          success: true,
          authInfo: { email: 'test@example.com' }
        };
      });
      
      // Click connect button
      await optionsPage.click('#connect-google');
      
      // Wait for auth status update
      await optionsPage.waitForSelector('.auth-success');
      
      const authStatus = await optionsPage.locator('#auth-status').textContent();
      expect(authStatus).toContain('test@example.com');
    });

    test('should test Google Sheets connection', async ({ page }) => {
      const [optionsPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.evaluate(() => {
          chrome.runtime.openOptionsPage();
        })
      ]);
      
      await optionsPage.waitForLoadState();
      
      // Switch to export tab
      await optionsPage.click('.tab-button[data-tab="export"]');
      
      // Enter valid spreadsheet URL
      await optionsPage.fill('#spreadsheet-url', 'https://docs.google.com/spreadsheets/d/test123/edit');
      
      // Mock successful connection test
      await optionsPage.evaluate(() => {
        window.mockConnectionTest = { success: true };
      });
      
      // Test connection
      await optionsPage.click('#test-sheets-connection');
      
      // Wait for success notification
      await optionsPage.waitForSelector('.notification.success');
      
      const notification = await optionsPage.locator('.notification-message').textContent();
      expect(notification).toContain('Connection test successful');
    });
  });

  test.describe('Data Export', () => {
    test('should export posts to Google Sheets', async ({ page }) => {
      // First, scan some posts
      await page.evaluate(() => {
        // Add mock posts to page
        const container = document.createElement('div');
        container.className = 'feed-container';
        
        const post = document.createElement('div');
        post.className = 'feed-shared-update-v2';
        post.setAttribute('data-urn', 'urn:li:activity:test');
        post.innerHTML = `
          <div class="feed-shared-actor__name">Test User</div>
          <div class="feed-shared-text">Test post content</div>
          <time datetime="2023-01-01T00:00:00Z">1d</time>
        `;
        
        container.appendChild(post);
        document.body.appendChild(container);
      });

      // Open popup and scan
      await page.click(`[data-extension-id="${extensionId}"]`);
      await page.click('#scan-posts');
      
      // Wait for scan completion
      await page.waitForFunction(() => {
        const postsFound = document.querySelector('#posts-found');
        return postsFound && parseInt(postsFound.textContent) > 0;
      });
      
      // Mock successful export
      await page.evaluate(() => {
        window.mockExport = { success: true, postsExported: 1 };
      });
      
      // Export posts
      await page.click('#export-posts');
      
      // Wait for export completion
      await page.waitForSelector('.notification.success');
      
      const notification = await page.locator('.notification-message').textContent();
      expect(notification).toContain('Export complete');
      
      // Check stats update
      const postsExported = await page.locator('#posts-exported').textContent();
      expect(parseInt(postsExported)).toBe(1);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network error
      await page.route('**/googleapis.com/**', route => {
        route.abort('failed');
      });
      
      // Open popup and try to export
      await page.click(`[data-extension-id="${extensionId}"]`);
      await page.click('#export-posts');
      
      // Wait for error notification
      await page.waitForSelector('.notification.error');
      
      const notification = await page.locator('.notification-message').textContent();
      expect(notification).toContain('failed');
    });

    test('should handle invalid LinkedIn page', async ({ page }) => {
      // Navigate to non-LinkedIn page
      await page.goto('http://localhost:3000/non-linkedin.html');
      
      // Open popup
      await page.click(`[data-extension-id="${extensionId}"]`);
      
      // Check that scan button is disabled
      const scanButton = page.locator('#scan-posts');
      await expect(scanButton).toBeDisabled();
      
      // Check status message
      const statusText = await page.locator('#linkedin-status .status-text').textContent();
      expect(statusText).toContain('Not on LinkedIn');
    });
  });

  test.describe('Performance', () => {
    test('should handle large number of posts', async ({ page }) => {
      // Inject many posts
      await page.evaluate(() => {
        const container = document.createElement('div');
        container.className = 'feed-container';
        
        for (let i = 1; i <= 100; i++) {
          const post = document.createElement('div');
          post.className = 'feed-shared-update-v2';
          post.setAttribute('data-urn', `urn:li:activity:${i}`);
          post.innerHTML = `
            <div class="feed-shared-actor__name">User ${i}</div>
            <div class="feed-shared-text">Post content ${i}</div>
            <time datetime="2023-01-01T00:00:00Z">1d</time>
          `;
          container.appendChild(post);
        }
        
        document.body.appendChild(container);
      });

      // Measure scan performance
      const startTime = Date.now();
      
      // Open popup and scan
      await page.click(`[data-extension-id="${extensionId}"]`);
      await page.click('#scan-posts');
      
      // Wait for completion
      await page.waitForFunction(() => {
        const postsFound = document.querySelector('#posts-found');
        return postsFound && parseInt(postsFound.textContent) === 100;
      }, { timeout: 30000 });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(15000); // 15 seconds
      
      // Check all posts were found
      const postsFound = await page.locator('#posts-found').textContent();
      expect(parseInt(postsFound)).toBe(100);
    });
  });
});