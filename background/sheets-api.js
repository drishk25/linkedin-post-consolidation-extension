/**
 * Google Sheets API Integration
 * Handles creating and updating Google Sheets with LinkedIn post data
 */

class SheetsAPI {
  constructor() {
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    this.driveUrl = 'https://www.googleapis.com/drive/v3';
    this.authManager = null;
  }

  /**
   * Set authentication manager
   * @param {GoogleAuthManager} authManager - Authentication manager instance
   */
  setAuthManager(authManager) {
    this.authManager = authManager;
  }

  /**
   * Create a new Google Sheet
   * @param {string} title - Sheet title
   * @returns {Promise<object>} Created sheet information
   */
  async createSheet(title) {
    try {
      if (!this.authManager) {
        this.authManager = new GoogleAuthManager();
      }

      const headers = await this.authManager.getAuthHeaders();
      
      const sheetData = {
        properties: {
          title: title,
          locale: 'en_US',
          autoRecalc: 'ON_CHANGE',
          timeZone: 'America/New_York'
        },
        sheets: [{
          properties: {
            title: 'LinkedIn Posts',
            gridProperties: {
              rowCount: 1000,
              columnCount: 26
            }
          }
        }]
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(sheetData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create sheet: ${error.error?.message || response.statusText}`);
      }

      const sheet = await response.json();
      
      // Set up the sheet with headers
      await this.setupSheetHeaders(sheet.spreadsheetId);
      
      // Make sheet publicly viewable (optional)
      await this.makeSheetViewable(sheet.spreadsheetId);

      console.log('Google Sheet created successfully:', sheet.spreadsheetId);

      return {
        sheetId: sheet.spreadsheetId,
        sheetUrl: sheet.spreadsheetUrl,
        title: title
      };

    } catch (error) {
      console.error('Failed to create Google Sheet:', error);
      throw error;
    }
  }

  /**
   * Setup sheet headers
   * @param {string} sheetId - Sheet ID
   */
  async setupSheetHeaders(sheetId) {
    try {
      const headers = [
        'Post ID', 'Post URL', 'Author Name', 'Author Profile', 'Author Title', 'Author Company',
        'Content Text', 'Word Count', 'Character Count', 'Hashtags', 'Mentions', 'Post Type',
        'Likes', 'Comments', 'Shares', 'Views', 'Engagement Rate (%)', 'Sentiment',
        'Has Media', 'Images Count', 'Videos Count', 'Documents Count',
        'Posted Date', 'Relative Time', 'Day of Week', 'Time of Day', 'Extracted Date'
      ];

      await this.updateRange(sheetId, 'A1:AA1', [headers]);
      
      // Format headers
      await this.formatHeaders(sheetId);

    } catch (error) {
      console.error('Failed to setup sheet headers:', error);
      throw error;
    }
  }

  /**
   * Format sheet headers
   * @param {string} sheetId - Sheet ID
   */
  async formatHeaders(sheetId) {
    try {
      const authHeaders = await this.authManager.getAuthHeaders();
      
      const formatRequest = {
        requests: [{
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 27
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.04, green: 0.4, blue: 0.76 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 11,
                  bold: true
                },
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
          }
        }, {
          updateSheetProperties: {
            properties: {
              sheetId: 0,
              gridProperties: {
                frozenRowCount: 1
              }
            },
            fields: 'gridProperties.frozenRowCount'
          }
        }]
      };

      const response = await fetch(`${this.baseUrl}/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(formatRequest)
      });

      if (!response.ok) {
        console.warn('Failed to format headers, but continuing...');
      }

    } catch (error) {
      console.warn('Header formatting failed:', error);
      // Don't throw error, formatting is optional
    }
  }

  /**
   * Make sheet viewable by anyone with link
   * @param {string} sheetId - Sheet ID
   */
  async makeSheetViewable(sheetId) {
    try {
      const authHeaders = await this.authManager.getAuthHeaders();
      
      const permissionData = {
        role: 'reader',
        type: 'anyone'
      };

      const response = await fetch(`${this.driveUrl}/files/${sheetId}/permissions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(permissionData)
      });

      if (response.ok) {
        console.log('Sheet made publicly viewable');
      }

    } catch (error) {
      console.warn('Failed to make sheet public:', error);
      // Don't throw error, this is optional
    }
  }

  /**
   * Export posts to Google Sheet
   * @param {Array} posts - Array of post objects
   * @param {string} sheetId - Target sheet ID
   * @returns {Promise<object>} Export result
   */
  async exportPosts(posts, sheetId) {
    try {
      if (!posts || posts.length === 0) {
        throw new Error('No posts to export');
      }

      console.log(`Exporting ${posts.length} posts to sheet ${sheetId}`);

      // Format posts data for sheets
      const formattedData = this.formatPostsForSheets(posts);
      
      // Find next empty row
      const nextRow = await this.findNextEmptyRow(sheetId);
      
      // Calculate range
      const endColumn = this.numberToColumn(formattedData[0].length);
      const range = `A${nextRow}:${endColumn}${nextRow + formattedData.length - 1}`;
      
      // Update sheet with data
      await this.updateRange(sheetId, range, formattedData);
      
      // Auto-resize columns
      await this.autoResizeColumns(sheetId);

      const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;

      console.log('Posts exported successfully to Google Sheets');

      return {
        success: true,
        sheetId: sheetId,
        sheetUrl: sheetUrl,
        exportedCount: posts.length,
        range: range
      };

    } catch (error) {
      console.error('Failed to export posts to Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Format posts data for Google Sheets
   * @param {Array} posts - Array of post objects
   * @returns {Array} Formatted data array
   */
  formatPostsForSheets(posts) {
    return posts.map(post => [
      post.id || '',
      post.url || '',
      post.author?.name || '',
      post.author?.profile || '',
      post.author?.title || '',
      post.author?.company || '',
      post.content?.text || '',
      post.content?.wordCount || 0,
      post.content?.characterCount || 0,
      post.content?.hashtags?.join(', ') || '',
      post.content?.mentions?.join(', ') || '',
      post.postType || '',
      post.metrics?.likes || 0,
      post.metrics?.comments || 0,
      post.metrics?.shares || 0,
      post.metrics?.views || 0,
      post.metrics?.engagementRate || 0,
      post.content?.sentiment || '',
      post.media?.hasMedia ? 'Yes' : 'No',
      post.media?.images?.length || 0,
      post.media?.videos?.length || 0,
      post.media?.documents?.length || 0,
      post.timestamp?.readable || '',
      post.timestamp?.relative || '',
      post.timestamp?.dayOfWeek || '',
      post.timestamp?.timeOfDay || '',
      post.extractedAt || new Date().toISOString()
    ]);
  }

  /**
   * Update a range in the sheet
   * @param {string} sheetId - Sheet ID
   * @param {string} range - Range to update (e.g., 'A1:C3')
   * @param {Array} values - 2D array of values
   */
  async updateRange(sheetId, range, values) {
    try {
      const authHeaders = await this.authManager.getAuthHeaders();
      
      const updateData = {
        range: range,
        majorDimension: 'ROWS',
        values: values
      };

      const response = await fetch(
        `${this.baseUrl}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(updateData)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to update range: ${error.error?.message || response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Failed to update sheet range:', error);
      throw error;
    }
  }

  /**
   * Find the next empty row in the sheet
   * @param {string} sheetId - Sheet ID
   * @returns {Promise<number>} Next empty row number
   */
  async findNextEmptyRow(sheetId) {
    try {
      const authHeaders = await this.authManager.getAuthHeaders();
      
      // Get data from column A to find last used row
      const response = await fetch(
        `${this.baseUrl}/${sheetId}/values/A:A`,
        {
          headers: authHeaders
        }
      );

      if (!response.ok) {
        console.warn('Could not determine last row, using row 2');
        return 2; // Start after headers
      }

      const data = await response.json();
      const lastRow = data.values ? data.values.length : 1;
      
      return lastRow + 1;

    } catch (error) {
      console.warn('Error finding next empty row:', error);
      return 2; // Default to row 2 (after headers)
    }
  }

  /**
   * Auto-resize columns in the sheet
   * @param {string} sheetId - Sheet ID
   */
  async autoResizeColumns(sheetId) {
    try {
      const authHeaders = await this.authManager.getAuthHeaders();
      
      const resizeRequest = {
        requests: [{
          autoResizeDimensions: {
            dimensions: {
              sheetId: 0,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 27
            }
          }
        }]
      };

      const response = await fetch(`${this.baseUrl}/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(resizeRequest)
      });

      if (response.ok) {
        console.log('Columns auto-resized successfully');
      }

    } catch (error) {
      console.warn('Failed to auto-resize columns:', error);
      // Don't throw error, this is optional
    }
  }

  /**
   * List user's Google Sheets
   * @returns {Promise<Array>} Array of sheet objects
   */
  async listSheets() {
    try {
      const authHeaders = await this.authManager.getAuthHeaders();
      
      const query = "mimeType='application/vnd.google-apps.spreadsheet'";
      const response = await fetch(
        `${this.driveUrl}/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc`,
        {
          headers: authHeaders
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to list sheets: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      return data.files.map(file => ({
        id: file.id,
        name: file.name,
        url: file.webViewLink,
        modifiedTime: file.modifiedTime
      }));

    } catch (error) {
      console.error('Failed to list Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Get sheet information
   * @param {string} sheetId - Sheet ID
   * @returns {Promise<object>} Sheet information
   */
  async getSheetInfo(sheetId) {
    try {
      const authHeaders = await this.authManager.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/${sheetId}`, {
        headers: authHeaders
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get sheet info: ${error.error?.message || response.statusText}`);
      }

      const sheet = await response.json();
      
      return {
        id: sheet.spreadsheetId,
        title: sheet.properties.title,
        url: sheet.spreadsheetUrl,
        sheets: sheet.sheets.map(s => ({
          id: s.properties.sheetId,
          title: s.properties.title,
          rowCount: s.properties.gridProperties.rowCount,
          columnCount: s.properties.gridProperties.columnCount
        }))
      };

    } catch (error) {
      console.error('Failed to get sheet info:', error);
      throw error;
    }
  }

  /**
   * Convert number to column letter (1 = A, 26 = Z, 27 = AA)
   * @param {number} num - Column number
   * @returns {string} Column letter
   */
  numberToColumn(num) {
    let result = '';
    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result;
  }

  /**
   * Validate sheet access
   * @param {string} sheetId - Sheet ID
   * @returns {Promise<boolean>} True if accessible
   */
  async validateSheetAccess(sheetId) {
    try {
      await this.getSheetInfo(sheetId);
      return true;
    } catch (error) {
      console.warn('Sheet access validation failed:', error);
      return false;
    }
  }

  /**
   * Clear sheet data (keeping headers)
   * @param {string} sheetId - Sheet ID
   * @returns {Promise<boolean>} Success status
   */
  async clearSheetData(sheetId) {
    try {
      const authHeaders = await this.authManager.getAuthHeaders();
      
      const clearRequest = {
        requests: [{
          updateCells: {
            range: {
              sheetId: 0,
              startRowIndex: 1, // Keep headers (row 0)
              startColumnIndex: 0
            },
            fields: 'userEnteredValue'
          }
        }]
      };

      const response = await fetch(`${this.baseUrl}/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(clearRequest)
      });

      return response.ok;

    } catch (error) {
      console.error('Failed to clear sheet data:', error);
      return false;
    }
  }
}

// Make available globally
self.SheetsAPI = SheetsAPI;