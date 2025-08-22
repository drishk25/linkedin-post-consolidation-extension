# LinkedIn Post Consolidation Extension - Testing Framework

This directory contains a comprehensive testing suite for the LinkedIn Post Consolidation Chrome Extension, including unit tests, integration tests, and end-to-end tests.

## Testing Structure

```
tests/
├── unit/                 # Unit tests for individual components
├── integration/          # Integration tests for component interactions
├── e2e/                 # End-to-end tests using Playwright
├── fixtures/            # Test data and mock files
├── mocks/               # Mock implementations
├── setup.js             # Global test setup and utilities
├── package.json         # Test dependencies and scripts
└── README.md           # This file
```

## Test Types

### Unit Tests
- **Location**: `tests/unit/`
- **Purpose**: Test individual components in isolation
- **Framework**: Jest with jsdom
- **Coverage**: PostExtractor, Storage, DOMScanner, UIOverlay, utilities

### Integration Tests
- **Location**: `tests/integration/`
- **Purpose**: Test component interactions and workflows
- **Framework**: Jest with Chrome extension mocks
- **Coverage**: Content script coordination, message passing, storage integration

### End-to-End Tests
- **Location**: `tests/e2e/`
- **Purpose**: Test complete user workflows in real browser
- **Framework**: Playwright with Chrome extension support
- **Coverage**: Full extension functionality, UI interactions, Google Sheets integration

## Setup and Installation

### Prerequisites
- Node.js 16+ 
- Chrome browser
- Extension built and ready for testing

### Install Dependencies
```bash
cd tests
npm install
```

### Environment Setup
1. Build the extension in the parent directory
2. Ensure Chrome is installed and accessible
3. Set up test environment variables (if needed)

## Running Tests

### All Tests
```bash
npm run test:all
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### End-to-End Tests Only
```bash
npm run test:e2e
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Configuration

### Jest Configuration
- **Environment**: jsdom for DOM testing
- **Setup**: Global mocks for Chrome APIs
- **Coverage**: Comprehensive coverage reporting
- **Matchers**: Custom matchers for extension-specific assertions

### Playwright Configuration
- **Browser**: Chromium with extension loading
- **Viewport**: 1280x720 for consistent testing
- **Screenshots**: On failure only
- **Videos**: Retained on failure
- **Traces**: On first retry

## Writing Tests

### Unit Test Example
```javascript
import { PostExtractor } from '../../content/post-extractor.js';

describe('PostExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new PostExtractor();
  });

  it('should extract post data correctly', async () => {
    const mockPost = testUtils.createMockPost();
    const result = await extractor.extractPost(mockPost);
    
    expect(result).toBeValidPostData();
    expect(result.author.name).toBe('John Doe');
  });
});
```

### Integration Test Example
```javascript
describe('Content Script Integration', () => {
  it('should scan and extract posts', async () => {
    const domScanner = new DOMScanner();
    const postExtractor = new PostExtractor();
    
    const posts = domScanner.findPosts();
    const extracted = await Promise.all(
      posts.map(post => postExtractor.extractPost(post))
    );
    
    expect(extracted).toHaveLength(posts.length);
  });
});
```

### E2E Test Example
```javascript
test('should scan posts end-to-end', async ({ page }) => {
  await page.goto('http://localhost:3000/mock-linkedin.html');
  await page.click('[data-extension-id="extension-id"]');
  await page.click('#scan-posts');
  
  await page.waitForSelector('#progress-section', { state: 'hidden' });
  
  const postsFound = await page.locator('#posts-found').textContent();
  expect(parseInt(postsFound)).toBeGreaterThan(0);
});
```

## Test Utilities

### Global Test Utils
Available via `global.testUtils`:

- `createMockPost(options)` - Create mock LinkedIn post elements
- `createMockStorageData(overrides)` - Create mock Chrome storage data
- `createMockPostData(overrides)` - Create mock extracted post data
- `waitFor(condition, timeout)` - Wait for async conditions
- `simulateClick(element)` - Simulate user interactions
- `mockGoogleSheetsAPI()` - Mock Google Sheets API responses

### Custom Jest Matchers
- `toBeValidPostData(received)` - Validate post data structure
- `toBeValidLinkedInUrl(received)` - Validate LinkedIn URLs

### Chrome API Mocks
Comprehensive mocks for:
- `chrome.storage.sync` and `chrome.storage.local`
- `chrome.tabs.query` and `chrome.tabs.sendMessage`
- `chrome.runtime.sendMessage` and `chrome.runtime.onMessage`
- `chrome.identity` for Google authentication

## Mock Data and Fixtures

### Test Fixtures
- **Mock LinkedIn Pages**: HTML files simulating LinkedIn structure
- **Sample Post Data**: JSON files with realistic post data
- **Settings Configurations**: Various extension settings for testing

### Mock Implementations
- **Google Sheets API**: Mock responses for authentication and data operations
- **Chrome Extension APIs**: Complete mock implementations
- **DOM APIs**: Mocks for browser APIs not available in test environment

## Continuous Integration

### GitHub Actions
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:all
      - run: npm run test:coverage
```

### Coverage Requirements
- **Minimum Coverage**: 80% overall
- **Critical Components**: 90% coverage required
- **Integration Tests**: Must cover all major workflows
- **E2E Tests**: Must cover complete user journeys

## Debugging Tests

### Debug Unit/Integration Tests
```bash
# Run specific test file
npm test -- post-extractor.test.js

# Run with debugging
npm test -- --inspect-brk post-extractor.test.js

# Run single test
npm test -- --testNamePattern="should extract post data"
```

### Debug E2E Tests
```bash
# Run in headed mode
npm run test:e2e -- --headed

# Run with debugging
npm run test:e2e -- --debug

# Run specific test
npm run test:e2e -- --grep "should scan posts"
```

### Common Issues

1. **Chrome Extension Not Loading**
   - Ensure extension is built
   - Check manifest.json validity
   - Verify file paths in test config

2. **Mock API Failures**
   - Check mock setup in beforeEach
   - Verify Chrome API mock implementations
   - Ensure proper cleanup in afterEach

3. **Timing Issues in E2E Tests**
   - Use proper wait conditions
   - Increase timeouts for slow operations
   - Add explicit waits for async operations

## Performance Testing

### Benchmarks
- **Post Extraction**: < 100ms per post
- **DOM Scanning**: < 500ms for 100 posts
- **Storage Operations**: < 50ms per operation
- **UI Updates**: < 16ms for smooth animations

### Load Testing
- Test with 1000+ posts
- Measure memory usage during scanning
- Verify no memory leaks in long-running operations

## Security Testing

### Data Validation
- Test input sanitization
- Verify XSS prevention
- Check data encryption for sensitive information

### Permission Testing
- Verify minimal required permissions
- Test permission boundaries
- Ensure secure communication with external APIs

## Accessibility Testing

### A11y Compliance
- Keyboard navigation testing
- Screen reader compatibility
- Color contrast validation
- Focus management testing

## Browser Compatibility

### Supported Browsers
- Chrome 88+
- Chromium-based browsers
- Edge 88+

### Testing Matrix
- Different Chrome versions
- Various screen resolutions
- Different operating systems

## Contributing to Tests

### Guidelines
1. Write tests for all new features
2. Maintain existing test coverage
3. Use descriptive test names
4. Follow existing patterns and conventions
5. Update documentation when adding new test utilities

### Code Review Checklist
- [ ] Tests cover happy path and edge cases
- [ ] Proper mocking and cleanup
- [ ] Performance considerations addressed
- [ ] Accessibility requirements met
- [ ] Documentation updated

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Chrome Extension Testing Guide](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)