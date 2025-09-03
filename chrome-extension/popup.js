// DOM elements
const activityText = document.getElementById('activityText');
const useCurrentPageBtn = document.getElementById('useCurrentPage');
const useSelectionBtn = document.getElementById('useSelection');
const openAppBtn = document.getElementById('openApp');
const copyAndOpenBtn = document.getElementById('copyAndOpen');
const openDashboardBtn = document.getElementById('openDashboard');
const statusDiv = document.getElementById('status');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Set up event listeners
  useCurrentPageBtn.addEventListener('click', useCurrentPage);
  useSelectionBtn.addEventListener('click', useSelection);
  openAppBtn.addEventListener('click', openApp);
  copyAndOpenBtn.addEventListener('click', copyAndOpen);
  openDashboardBtn.addEventListener('click', openDashboard);

  // Auto-focus textarea
  activityText.focus();
});

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}

async function useCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      activityText.value = tab.url;
      showStatus('Current page URL added!', 'success');
    } else {
      showStatus('Could not get current page URL', 'error');
    }
  } catch (error) {
    console.error('Error getting current page:', error);
    showStatus('Could not get current page', 'error');
  }
}

async function useSelection() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject content script to get selected text
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        return window.getSelection().toString();
      }
    });

    const selectedText = results[0]?.result;
    if (selectedText && selectedText.trim()) {
      activityText.value = selectedText.trim();
      showStatus('Selected text added!', 'success');
    } else {
      showStatus('No text selected on the page', 'error');
    }
  } catch (error) {
    console.error('Error getting selection:', error);
    showStatus('Could not get selected text', 'error');
  }
}

function openApp() {
  chrome.tabs.create({ url: 'http://localhost:5173' });
  window.close();
}

async function copyAndOpen() {
  const text = activityText.value.trim();
  
  if (!text) {
    showStatus('Please enter some text or use the quick actions', 'error');
    return;
  }

  try {
    // Copy the text to clipboard
    await navigator.clipboard.writeText(text);
    
    // Open the main app
    chrome.tabs.create({ url: 'http://localhost:5173' });
    
    showStatus('Copied! Paste in Activity Magic to process.', 'success');
    
    // Close popup after a short delay
    setTimeout(() => {
      window.close();
    }, 1500);
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    showStatus('Could not copy to clipboard. Please copy manually.', 'error');
  }
}

function openDashboard() {
  chrome.tabs.create({ url: 'https://tahwuajfswlpefihwsdm.supabase.co' });
  window.close();
}