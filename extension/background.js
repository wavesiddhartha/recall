// Recall Extension Background Worker (Manifest V3)

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'RECALL_PING') {
    sendResponse({ success: true, version: '1.2.0' });
    return true;
  }

  if (message.type === 'RECALL_GET_HISTORY') {
    const { startTime, endTime, maxResults } = message.payload || {};
    
    // Set up search options
    const queryOptions = {
      text: '', // Empty matches all
      maxResults: maxResults || 5000,
      startTime: startTime || 0
    };

    if (endTime) {
      queryOptions.endTime = endTime;
    }

    chrome.history.search(queryOptions, (historyItems) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        // Map history items into our clean model
        const formattedItems = historyItems.map(item => ({
          id: item.id,
          url: item.url,
          title: item.title || item.url,
          visitTime: item.lastVisitTime,
          visitCount: item.visitCount || 1,
          typedCount: item.typedCount || 0
        }));
        
        sendResponse({ success: true, data: formattedItems });
      }
    });
    
    return true; // Keep message channel open for async response
  }

  if (message.type === 'RECALL_PROXY_FETCH') {
    const { url, options } = message.payload || {};
    
    fetch(url, options)
      .then(async (response) => {
        const text = await response.text();
        sendResponse({
          success: true,
          data: {
            status: response.status,
            statusText: response.statusText,
            body: text
          }
        });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep channel open for async response
  }

  if (message.type === 'RECALL_PROXY_STREAM') {
    const { url, options, requestId } = message.payload || {};
    const tabId = sender.tab.id;

    fetch(url, options)
      .then(async (response) => {
        if (!response.ok) {
          const errText = await response.text();
          chrome.tabs.sendMessage(tabId, {
            type: 'RECALL_STREAM_END',
            requestId,
            payload: { success: false, error: `API error (${response.status}): ${errText}` }
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || !cleanLine.startsWith('data:')) continue;
            if (cleanLine === 'data: [DONE]') continue;

            try {
              const jsonStr = cleanLine.substring(5).trim();
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta;
              if (delta) {
                const reasoning = delta.reasoning_content || delta.reasoning || undefined;
                const content = delta.content || '';
                
                if (content || reasoning) {
                  // Send chunk back to content script
                  chrome.tabs.sendMessage(tabId, {
                    type: 'RECALL_STREAM_CHUNK',
                    requestId,
                    payload: { success: true, content, reasoning }
                  });
                }
              }
            } catch (e) {
              // Ignore line parse failures
            }
          }
        }

        // Notify stream complete
        chrome.tabs.sendMessage(tabId, {
          type: 'RECALL_STREAM_END',
          requestId,
          payload: { success: true }
        });
      })
      .catch((error) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'RECALL_STREAM_END',
          requestId,
          payload: { success: false, error: error.message }
        });
      });

    sendResponse({ success: true, status: 'started' });
    return true; // async handler
  }
});
