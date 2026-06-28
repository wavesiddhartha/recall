// Service to communicate with the Recall Chrome Extension content script bridge

interface ExtensionMessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export function isExtensionInstalled(): boolean {
  return document.documentElement.dataset.recallExtensionInstalled === 'true';
}

/**
 * Sends a message to the content script and awaits the response asynchronously.
 */
export function sendToExtension(type: string, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!isExtensionInstalled()) {
      return reject(new Error('RECALL_EXTENSION_NOT_INSTALLED'));
    }

    const requestId = Math.random().toString(36).substring(2, 11);
    const timeoutDuration = 8000; // 8 seconds timeout

    const handleMessage = (event: MessageEvent) => {
      // Check message origin/identity
      if (
        event.source !== window ||
        !event.data ||
        event.data.source !== 'RECALL_EXTENSION' ||
        event.data.requestId !== requestId
      ) {
        return;
      }

      // Cleanup listener and timeout
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutId);

      const response: ExtensionMessageResponse = event.data.payload;
      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || 'Unknown extension error'));
      }
    };

    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error('Extension request timed out'));
    }, timeoutDuration);

    window.addEventListener('message', handleMessage);

    // Send the postMessage request
    window.postMessage(
      {
        source: 'RECALL_WEB_APP',
        type,
        payload,
        requestId
      },
      '*'
    );
  });
}

export async function pingExtension(): Promise<{ success: boolean; version: string }> {
  try {
    const res = await sendToExtension('RECALL_PING');
    return { success: true, version: res?.version || '1.0.0' };
  } catch (err) {
    return { success: false, version: '' };
  }
}

export async function fetchHistoryFromExtension(
  startTime: number,
  endTime?: number,
  maxResults?: number
): Promise<any[]> {
  return sendToExtension('RECALL_GET_HISTORY', { startTime, endTime, maxResults });
}

interface StreamChunkPayload {
  success: boolean;
  content?: string;
  reasoning?: string;
  error?: string;
}

export function sendStreamToExtension(
  url: string,
  options: any,
  onChunk: (content: string, reasoning?: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isExtensionInstalled()) {
      return reject(new Error('Extension not installed'));
    }

    const requestId = Math.random().toString(36).substring(2, 11);

    const handleMessage = (event: MessageEvent) => {
      if (
        event.source !== window ||
        !event.data ||
        event.data.source !== 'RECALL_EXTENSION' ||
        event.data.requestId !== requestId
      ) {
        return;
      }

      const { type, payload } = event.data;
      const data: StreamChunkPayload = payload;

      if (type === 'RECALL_STREAM_CHUNK') {
        if (data.success && (data.content || data.reasoning)) {
          onChunk(data.content || '', data.reasoning);
        }
      } else if (type === 'RECALL_STREAM_END') {
        window.removeEventListener('message', handleMessage);
        if (data.success) {
          resolve();
        } else {
          reject(new Error(data.error || 'Stream error'));
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Send initialization event
    window.postMessage(
      {
        source: 'RECALL_WEB_APP',
        type: 'RECALL_PROXY_STREAM',
        requestId,
        payload: { url, options, requestId }
      },
      '*'
    );
  });
}
