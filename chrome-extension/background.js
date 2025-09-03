// Background script for Activity Magic Chrome Extension

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Activity Magic extension installed');
    
    // Open the main app in a new tab
    chrome.tabs.create({
      url: 'http://localhost:5173'
    });
  }
});

// Handle extension icon click (when popup is not available)
chrome.action.onClicked.addListener((tab) => {
  // This will only fire if there's no popup defined
  // Since we have a popup, this won't be called
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processActivity') {
    handleProcessActivity(request.data, sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function handleProcessActivity(data, sendResponse) {
  try {
    const SUPABASE_URL = 'https://tahwuajfswlpefihwsdm.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_fvOHP6ZjPM8A80QgypO2Ug_hqwB7DSH';

    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('Error processing activity:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Context menu setup (optional - for right-click functionality)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'addToActivityMagic',
    title: 'Add to Activity Magic',
    contexts: ['selection', 'link', 'page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'addToActivityMagic') {
    let content = '';
    
    if (info.selectionText) {
      content = info.selectionText;
    } else if (info.linkUrl) {
      content = info.linkUrl;
    } else if (info.pageUrl) {
      content = info.pageUrl;
    }
    
    // Open popup with content (this is a simplified approach)
    chrome.action.openPopup();
  }
});
