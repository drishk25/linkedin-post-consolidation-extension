# LinkedIn Post Consolidation Chrome Extension

A powerful Chrome extension that consolidates and exports your LinkedIn saved posts to Google Sheets with detailed analytics and data extraction capabilities.

## 🚀 Features

- **Automated Post Extraction**: Automatically scans and extracts LinkedIn posts from your feed
- **Smart Data Processing**: Extracts author information, content, timestamps, and engagement metrics
- **Google Sheets Integration**: Export data directly to Google Sheets with customizable formatting
- **Real-time Scanning**: Dynamic content loading as you scroll through LinkedIn
- **Local Storage**: Secure local caching of extracted data
- **Duplicate Detection**: Intelligent filtering to avoid duplicate entries
- **Batch Processing**: Efficient handling of large numbers of posts
- **Privacy Focused**: All data processing happens locally in your browser

## 📋 Requirements

- Google Chrome browser (version 88+)
- LinkedIn account
- Google account (for Sheets export functionality)

## 🛠 Installation

### Method 1: Load Unpacked (Development)

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/drishk25/linkedin-post-consolidation-extension.git
   cd linkedin-post-consolidation-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate extension icons**
   - Open `assets/icons/create-icons.html` in your browser
   - Icons will auto-download (save them in the `assets/icons/` folder)

4. **Load extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the project folder

5. **Configure Google OAuth (Optional)**
   - Update `client_id` in `manifest.json` with your Google OAuth credentials
   - Set up OAuth consent screen in Google Cloud Console

## 🎯 Usage

### Basic Usage

1. **Navigate to LinkedIn**: Go to `https://www.linkedin.com/feed/`
2. **Activate Extension**: Click the extension icon in Chrome toolbar
3. **Start Scanning**: The extension automatically detects and extracts posts
4. **View Data**: Check extracted data in the extension popup
5. **Export**: Use the export functionality to save to Google Sheets

### Advanced Features

- **Custom Scanning**: Configure scan parameters in the options page
- **Data Filtering**: Set up filters for specific content types
- **Batch Export**: Export large datasets efficiently
- **Analytics**: View extraction statistics and metrics

## 🔧 Configuration

### Extension Settings

Access settings by right-clicking the extension icon → Options:

- **Scan Interval**: How often to check for new posts
- **Extract Images**: Include image URLs in extracted data
- **Extract Metrics**: Include likes, comments, and shares
- **Batch Size**: Number of posts to process at once
- **Auto Export**: Automatically export to Google Sheets

### Google Sheets Setup

1. Create a Google Cloud Project
2. Enable Google Sheets API
3. Create OAuth 2.0 credentials
4. Update `manifest.json` with your client ID
5. Configure OAuth consent screen

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern="storage"
npm test -- --testPathPattern="post-extractor"

# Run tests with coverage
npm test -- --coverage
```

### Manual Testing

1. **Load extension** in Chrome developer mode
2. **Navigate to LinkedIn** feed
3. **Open Developer Tools** (F12) and check Console
4. **Verify post detection** messages appear
5. **Check Chrome storage** in Application tab
6. **Test export functionality** with Google Sheets

## 📁 Project Structure

```
├── assets/                 # Static assets
│   ├── icons/             # Extension icons
│   └── styles/            # CSS stylesheets
├── background/            # Background scripts
├── content/               # Content scripts
│   ├── content.js         # Main content script
│   ├── dom-scanner.js     # DOM scanning logic
│   ├── post-extractor.js  # Post data extraction
│   └── ui-overlay.js      # UI overlay components
├── options/               # Options page
├── popup/                 # Extension popup
├── tests/                 # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── utils/            # Test utilities
├── utils/                 # Utility modules
│   ├── storage.js        # Chrome storage wrapper
│   ├── data-formatter.js # Data formatting utilities
│   ├── linkedin-selectors.js # LinkedIn DOM selectors
│   └── error-handler.js  # Error handling utilities
├── manifest.json         # Extension manifest
└── package.json          # Node.js dependencies
```

## 🔒 Privacy & Security

- **Local Processing**: All data extraction happens locally in your browser
- **No External Servers**: No data is sent to third-party servers
- **Secure Storage**: Uses Chrome's secure storage APIs
- **OAuth Security**: Google Sheets integration uses secure OAuth 2.0
- **Minimal Permissions**: Requests only necessary permissions

## 🐛 Troubleshooting

### Common Issues

**Extension won't load:**
- Check for JavaScript errors in `chrome://extensions/`
- Verify all required files are present
- Ensure icons are generated properly

**No posts detected:**
- Check if content script loaded on LinkedIn
- Verify LinkedIn page structure hasn't changed
- Check browser console for error messages

**Export not working:**
- Verify Google OAuth credentials are configured
- Check Google Sheets API is enabled
- Ensure proper OAuth consent screen setup

### Debug Commands

Run these in the browser console on LinkedIn:

```javascript
// Check extension status
console.log('Extension loaded:', window.linkedinExtensionLoaded);

// View stored posts
chrome.storage.local.get('posts', console.log);

// Check settings
chrome.storage.sync.get('settings', console.log);

// Manual post scan
if (window.domScanner) window.domScanner.findAllPosts();
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage
npm run test:coverage
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- LinkedIn for providing the platform
- Google for Chrome Extension APIs and Sheets API
- Jest testing framework
- All contributors and testers

## 📞 Support

For support, please:
1. Check the [troubleshooting section](#-troubleshooting)
2. Search existing [GitHub issues](https://github.com/drishk25/linkedin-post-consolidation-extension/issues)
3. Create a new issue with detailed information

---

**⚠️ Disclaimer**: This extension is not affiliated with LinkedIn. Use responsibly and in accordance with LinkedIn's Terms of Service.