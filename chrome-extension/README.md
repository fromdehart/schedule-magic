# Activity Magic Chrome Extension

A simple Chrome extension for Activity Magic that allows you to quickly capture text and URLs from any webpage and copy them to your clipboard.

## Features

- **Quick Capture**: Copy current page URL or selected text with one click
- **Text Selection**: Use selected text on a page as activity content
- **Current Page**: Quickly copy the current page URL
- **Copy & Open**: Copy content and automatically open Activity Magic
- **Simple Workflow**: No authentication required - just copy and paste

## Installation

1. **Download the Extension**:
   - Download or clone this repository
   - Navigate to the `chrome-extension` folder

2. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

## Usage

### Capturing Content

1. **Click the Extension Icon** in your Chrome toolbar
2. **Choose Input Method**:
   - **Use Current Page**: Copies the current webpage URL
   - **Use Selection**: Copies any text you've selected on the page
   - **Manual Entry**: Type or paste activity details

3. **Copy & Open**: Click "Copy & Open App" to copy content and open Activity Magic
4. **Paste & Process**: In Activity Magic, paste the content and let AI process it

### Quick Actions

- **Current Page**: Instantly copy the URL of the page you're viewing
- **Selection**: Highlight text on any page and copy it
- **Open App**: Quickly open Activity Magic in a new tab

## File Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── content.js            # Content script for page interaction
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

## Permissions

The extension requires minimal permissions:

- **activeTab**: Access to the current tab for URL and text selection

## Development

### Making Changes

1. **Edit Files**: Modify the extension files as needed
2. **Reload Extension**: Go to `chrome://extensions/` and click the refresh icon
3. **Test**: Click the extension icon to test your changes

### Building Icons

The extension includes icons in multiple sizes. To update them:

1. Create a 128x128px icon
2. Use an image editor to create 16px, 32px, and 48px versions
3. Replace the files in the `icons/` folder

## Troubleshooting

### Common Issues

1. **Extension Not Loading**:
   - Check that all files are in the correct folder
   - Ensure `manifest.json` is valid JSON
   - Check Chrome's developer console for errors

2. **Copy Not Working**:
   - Make sure you have permission to access the clipboard
   - Try manually copying the text from the textarea

3. **Text Selection Not Working**:
   - Make sure the content script has permission to run
   - Check that the page allows script injection

### Debug Mode

To debug the extension:

1. Go to `chrome://extensions/`
2. Click "Inspect views: popup"
3. Use the browser's developer tools to debug

## Privacy & Security

- **No Data Collection**: The extension doesn't collect or store any data
- **Local Only**: All functionality happens locally in your browser
- **Minimal Permissions**: Only requests necessary permissions for functionality
- **No External Calls**: No API calls or external requests

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the Activity Magic documentation
3. Check the extension's console logs for error messages