// Recall Extension Content Script

// Signal to the webpage that the extension is installed
document.documentElement.dataset.recallExtensionInstalled = 'true';

// Distribute a custom event to notify the React app that the extension is ready
window.dispatchEvent(new CustomEvent('RECALL_EXTENSION_READY'));

// Listen for messages from the React web app page
window.addEventListener('message', (event) => {
  // Only accept messages from ourselves/our page
  if (event.source !== window || !event.data || event.data.source !== 'RECALL_WEB_APP') {
    return;
  }

  const { type, payload, requestId } = event.data;

  // Relay the message to the extension background script
  chrome.runtime.sendMessage({ type, payload, requestId }, (response) => {
    // Send response back to the React web app page
    window.postMessage({
      source: 'RECALL_EXTENSION',
      requestId,
      type: `${type}_RESPONSE`,
      payload: response
    }, '*');
  });
});

// Listen for messages from the extension background script (for streaming support)
chrome.runtime.onMessage.addListener((message) => {
  if (message && (message.type === 'RECALL_STREAM_CHUNK' || message.type === 'RECALL_STREAM_END')) {
    window.postMessage({
      source: 'RECALL_EXTENSION',
      requestId: message.requestId,
      type: message.type,
      payload: message.payload
    }, '*');
  }
});
