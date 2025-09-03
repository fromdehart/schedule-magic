// Content script for Activity Magic Chrome Extension
// This script runs on every webpage and provides context menu functionality

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelection') {
    const selection = window.getSelection().toString().trim();
    sendResponse({ selection });
  } else if (request.action === 'getPageInfo') {
    const pageInfo = {
      url: window.location.href,
      title: document.title,
      description: getMetaDescription(),
      image: getMetaImage()
    };
    sendResponse({ pageInfo });
  }
});

function getMetaDescription() {
  const metaDescription = document.querySelector('meta[name="description"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  
  if (ogDescription) return ogDescription.content;
  if (metaDescription) return metaDescription.content;
  
  // Fallback to first paragraph
  const firstP = document.querySelector('p');
  return firstP ? firstP.textContent.substring(0, 200) + '...' : '';
}

function getMetaImage() {
  const ogImage = document.querySelector('meta[property="og:image"]');
  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  
  if (ogImage) return ogImage.content;
  if (twitterImage) return twitterImage.content;
  
  // Fallback to first image
  const firstImg = document.querySelector('img');
  return firstImg ? firstImg.src : '';
}

// Add a subtle indicator when the extension is active
function addExtensionIndicator() {
  // Only add if not already present
  if (document.getElementById('activity-magic-indicator')) return;
  
  const indicator = document.createElement('div');
  indicator.id = 'activity-magic-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    border-radius: 50%;
    z-index: 10000;
    opacity: 0.7;
    cursor: pointer;
    transition: opacity 0.3s;
  `;
  
  indicator.title = 'Activity Magic is active - Click the extension icon to add this page';
  
  indicator.addEventListener('mouseenter', () => {
    indicator.style.opacity = '1';
  });
  
  indicator.addEventListener('mouseleave', () => {
    indicator.style.opacity = '0.7';
  });
  
  indicator.addEventListener('click', () => {
    // This would ideally open the popup, but Chrome doesn't allow this
    // Instead, we'll show a notification
    showNotification('Click the Activity Magic extension icon to add this page!');
  });
  
  document.body.appendChild(indicator);
  
  // Remove after 5 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }, 5000);
}

function showNotification(message) {
  // Create a temporary notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 10001;
    pointer-events: none;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addExtensionIndicator);
} else {
  addExtensionIndicator();
}
