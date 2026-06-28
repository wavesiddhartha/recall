import type { HistoryItem, DailySummary, Insight } from '../types';
import { isExtensionInstalled, sendToExtension, sendStreamToExtension } from './extensionBridge';

const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
export const DEFAULT_API_KEY = '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';

export interface AIServiceResponse {
  content: string;
  reasoning?: string;
}

/**
 * Common fetch utility for the Nvidia OpenAI-compatible API
 */
async function callNvidiaAPI(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  jsonMode: boolean = false
): Promise<AIServiceResponse> {
  const activeKey = apiKey || DEFAULT_API_KEY;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${activeKey}`
  };

  const body: Record<string, any> = {
    model: 'moonshotai/kimi-k2.6',
    messages,
    temperature: jsonMode ? 0.1 : 0.7,
    max_tokens: 4096
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  // Bypassing CORS with Chrome Extension background page if linked
  if (isExtensionInstalled()) {
    try {
      const responseData = await sendToExtension('RECALL_PROXY_FETCH', {
        url: API_URL,
        options: {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        }
      });

      if (responseData.status < 200 || responseData.status >= 300) {
        throw new Error(`API Error (${responseData.status}): ${responseData.body}`);
      }

      const result = JSON.parse(responseData.body);
      const choice = result.choices?.[0];
      const content = choice?.message?.content || '';
      const reasoning = choice?.message?.reasoning_content || choice?.message?.reasoning || undefined;

      return { content, reasoning };
    } catch (err: any) {
      console.warn('Proxy fetch failed, attempting direct fetch:', err);
    }
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
  }

  const result = await response.json();
  const choice = result.choices?.[0];
  const content = choice?.message?.content || '';
  const reasoning = choice?.message?.reasoning_content || choice?.message?.reasoning || undefined;

  return { content, reasoning };
}

/**
 * Parse browser history items for a specific day and return an elegant editorial diary-style summary
 */
export async function generateDailySummary(
  dateStr: string,
  items: HistoryItem[],
  apiKey: string
): Promise<DailySummary> {
  if (items.length === 0) {
    return {
      date: dateStr,
      totalVisits: 0,
      topDomains: [],
      categories: {},
      summary: 'No browsing history was recorded for this day.',
      interestingFinds: []
    };
  }

  // Pre-process items to group and send a structured payload to the LLM
  const domainCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {
    Shopping: 0,
    News: 0,
    Video: 0,
    Music: 0,
    Social: 0,
    Work: 0,
    Other: 0
  };

  items.forEach(item => {
    domainCounts[item.domain] = (domainCounts[item.domain] || 0) + 1;
    if (item.category in categoryCounts) {
      categoryCounts[item.category]++;
    } else {
      categoryCounts.Other++;
    }
  });

  // Get top domains
  const sortedDomains = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Group pages by domain briefly for context (limit titles to avoid token bloat)
  const itemContextList = items
    .slice(0, 80) // Limit to top 80 visits for safety
    .map(item => `- [${item.category}] ${item.title} (${item.domain}) at ${new Date(item.visitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
    .join('\n');

  const systemPrompt = `You are a premium, highly sophisticated digital diary editor. 
Your goal is to synthesize a user's web browsing logs into a high-end, third-person narrative. 
Avoid clunky summaries. Write in an elegant, minimalist, and slightly literary tone (reminiscent of high-fashion editorials or clean design reviews).
Structure your response strictly as a JSON object with two fields:
1. "summary": A cohesive, editorial narrative paragraph (around 4-6 sentences) summarizing the user's primary activities, focus shifts, and general digital workflow/interests for the day. Use "you" or neutral third-person.
2. "interestingFinds": An array of up to 3 objects representing distinct, notable articles, videos, or websites they visited. Each object must have:
   - "title": Title of the site (cleaned).
   - "url": Exact URL.
   - "reason": An elegant, brief description of why this was an interesting find (e.g., "A deep dive into Scandinavian glassmorphism").

JSON structure:
{
  "summary": "Your elegant paragraph...",
  "interestingFinds": [
    { "title": "site title", "url": "url", "reason": "why it is interesting" }
  ]
}`;

  const userPrompt = `Date: ${dateStr}
Total Visits: ${items.length}
Key Domains: ${sortedDomains.map(d => `${d.domain} (${d.count} visits)`).join(', ')}

Browsing list (most recent first):
${itemContextList}`;

  try {
    const { content } = await callNvidiaAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], apiKey, true);

    const data = JSON.parse(content);
    return {
      date: dateStr,
      totalVisits: items.length,
      topDomains: sortedDomains,
      categories: categoryCounts,
      summary: data.summary || 'Summary could not be summarized elegantly.',
      interestingFinds: data.interestingFinds || []
    };
  } catch (error) {
    console.error('Failed to generate daily summary:', error);
    // Return graceful fallback
    return {
      date: dateStr,
      totalVisits: items.length,
      topDomains: sortedDomains,
      categories: categoryCounts,
      summary: `You visited ${items.length} pages across ${sortedDomains.length} domains. Key focus areas were ${sortedDomains[0]?.domain || 'unknown'} and ${sortedDomains[1]?.domain || 'unknown'}.`,
      interestingFinds: []
    };
  }
}

/**
 * Use AI to translate a natural language query into specific structured search parameters
 */
export async function parseSearchIntent(
  query: string,
  apiKey: string
): Promise<{
  keywords: string[];
  startTime?: number;
  endTime?: number;
  category?: string;
  domain?: string;
}> {
  const currentTimestamp = Date.now();
  const currentDateStr = new Date(currentTimestamp).toDateString();

  const systemPrompt = `You are a search intent parser for personal browsing history.
Analyze the user's natural language query and extract search parameters.
Return a JSON object with these optional fields:
- "keywords": string[] (crucial search keywords, e.g. "minimal design")
- "relativeTime": "today" | "yesterday" | "last_week" | "last_month" | "all_time" (inferred time boundary)
- "category": "Shopping" | "News" | "Video" | "Music" | "Social" | "Work" | "Other" (if clearly implied)
- "domain": string (e.g. "youtube.com" if they query "on youtube" or "youtube video")

Today's current date and time is: ${currentDateStr}.
JSON structure:
{
  "keywords": ["key1", "key2"],
  "relativeTime": "yesterday",
  "category": "Video",
  "domain": "youtube.com"
}`;

  try {
    const { content } = await callNvidiaAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Query: "${query}"` }
    ], apiKey, true);

    const parsed = JSON.parse(content);
    
    // Convert relativeTime into millisecond timestamps
    let startTime: number | undefined;
    let endTime: number | undefined;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const startOfToday = new Date().setHours(0, 0, 0, 0);

    if (parsed.relativeTime === 'today') {
      startTime = startOfToday;
    } else if (parsed.relativeTime === 'yesterday') {
      startTime = startOfToday - oneDayMs;
      endTime = startOfToday;
    } else if (parsed.relativeTime === 'last_week') {
      startTime = startOfToday - 7 * oneDayMs;
    } else if (parsed.relativeTime === 'last_month') {
      startTime = startOfToday - 30 * oneDayMs;
    }

    return {
      keywords: parsed.keywords || [query],
      startTime,
      endTime,
      category: parsed.category,
      domain: parsed.domain
    };
  } catch (error) {
    console.error('Failed to parse search intent:', error);
    return { keywords: [query] };
  }
}

/**
 * AI-generated insights based on browsing patterns
 */
export async function generateActivityInsights(
  historyItems: HistoryItem[],
  apiKey: string
): Promise<Insight[]> {
  if (historyItems.length < 5) {
    return [
      {
        id: 'welcome-insight',
        title: 'Gathering context',
        description: 'Once you synchronize more browsing history, Recall will generate tailored personal digital intelligence insights.',
        category: 'SYSTEM',
        timestamp: Date.now()
      }
    ];
  }

  // Pre-process items for summary statistics
  const domains = historyItems.map(i => i.domain);
  const domainCounts = domains.reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const categories = historyItems.map(i => i.category);
  const categoryCounts = categories.reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const systemPrompt = `You are a digital habit analyst. 
Analyze the user's aggregated browsing metrics and generate exactly 3 premium, highly specific personal behavioral insights.
Each insight should read like a premium, architectural critique or high-level analysis. 
Identify patterns like: high frequency of social media visits in the morning, research deep dives, digital shopping habits, etc.
Avoid clichés. Focus on focus-shifting, time sink, or efficiency.
Return a JSON object containing an array of 3 insights:
{
  "insights": [
    {
      "title": "Short uppercase title (e.g. COGNITIVE CLUTTER or ARCHITECTURAL DEPTH)",
      "description": "2-3 sentences analyzing the behavior and suggesting minor changes or highlighting a trend.",
      "category": "Focus" | "Habit" | "Discovery"
    }
  ]
}`;

  const userPrompt = `Browsing Stats:
Total items logged: ${historyItems.length}
Top Domains: ${sortedDomains.map(d => `${d[0]} (${d[1]} visits)`).join(', ')}
Categories: ${Object.entries(categoryCounts).map(([cat, count]) => `${cat}: ${count}`).join(', ')}`;

  try {
    const { content } = await callNvidiaAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], apiKey, true);

    const parsed = JSON.parse(content);
    const insights: Insight[] = (parsed.insights || []).map((ins: any, index: number) => ({
      id: `insight-${Date.now()}-${index}`,
      title: ins.title || 'DIGITAL PATTERN',
      description: ins.description || 'Browsing habit patterns detected.',
      category: ins.category || 'Focus',
      timestamp: Date.now()
    }));

    return insights;
  } catch (error) {
    console.error('Failed to generate insights:', error);
    return [
      {
        id: 'fallback-1',
        title: 'PRODUCTIVITY DYNAMICS',
        description: 'You show a high density of activities centered around technical domains. Balancing technical documentation with design assets helps prevent exhaustion.',
        category: 'Focus',
        timestamp: Date.now()
      },
      {
        id: 'fallback-2',
        title: 'DISCOVERY CHANNELS',
        description: 'A moderate percentage of your evening sessions are spent discovering video content. Consider curating bookmarks to minimize infinite scroll fatigue.',
        category: 'Habit',
        timestamp: Date.now()
      }
    ];
  }
}

/**
 * Streamed AI chat to find items or ask questions about history
 */
export async function chatAboutHistory(
  query: string,
  historySummaryContext: string,
  apiKey: string,
  onChunk: (text: string, reasoning?: string) => void
): Promise<void> {
  const activeKey = apiKey || DEFAULT_API_KEY;

  // Bypassing CORS with extension proxy fetch if linked
  if (isExtensionInstalled()) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are Recall, a personal digital history assistant. Your tone is clean, concise, polite, and architectural. Answer the user's questions about their browsing history using the provided daily summaries context. Do not invent facts. If the information is not in the context, politely explain what you know and what is missing. Use bullet points for list items.`
        },
        {
          role: 'user',
          content: `Here is the context of my recent browsing summaries:\n---\n${historySummaryContext}\n---\nQuestion: "${query}"`
        }
      ];

      await sendStreamToExtension(
        API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeKey}`
          },
          body: JSON.stringify({
            model: 'moonshotai/kimi-k2.6',
            messages,
            temperature: 0.7,
            max_tokens: 2048,
            stream: true
          })
        },
        onChunk
      );
      return;
    } catch (err) {
      console.warn('Proxy chat fallback failed, attempting direct stream fetch:', err);
    }
  }

  const messages = [
    {
      role: 'system',
      content: `You are Recall, a personal digital history assistant. 
Your tone is clean, concise, polite, and architectural.
Answer the user's questions about their browsing history using the provided daily summaries context.
Do not invent facts. If the information is not in the context, politely explain what you know and what is missing.
Explain details clearly in a minimal layout. Use bullet points for list items.`
    },
    {
      role: 'user',
      content: `Here is the context of my recent browsing summaries:
---
${historySummaryContext}
---

Question: "${query}"`
    }
  ];

  const body = {
    model: 'moonshotai/kimi-k2.6',
    messages,
    temperature: 0.7,
    max_tokens: 2048,
    stream: true
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${activeKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Chat API error (${response.status}): ${errText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder('utf-8');
  if (!reader) {
    throw new Error('ReadableStream not supported.');
  }

  let buffer = '';
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n');
      // Save the last incomplete line back to buffer
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
              onChunk(content, reasoning);
            }
          }
        } catch (e) {
          // JSON parse failed, skip line
        }
      }
    }
  }
}

/**
 * Generates a deep cognitive and attention audit report from browsing history
 */
export async function generateCognitiveDiagnosticReport(
  items: HistoryItem[],
  apiKey: string
): Promise<{ content: string; reasoning?: string }> {
  if (items.length === 0) {
    return { content: 'Insufficient browsing history to compile a cognitive audit.' };
  }

  // Count domain frequencies and categories
  const domainMap: Record<string, number> = {};
  const categoryMap: Record<string, number> = {};
  items.forEach(item => {
    domainMap[item.domain] = (domainMap[item.domain] || 0) + 1;
    categoryMap[item.category] = (categoryMap[item.category] || 0) + 1;
  });

  const topDomains = Object.entries(domainMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([domain, count]) => `${domain}: ${count} visits`)
    .join(', ');

  const categoriesText = Object.entries(categoryMap)
    .map(([cat, count]) => `${cat}: ${count} visits`)
    .join(', ');

  // Get a sample of recent titles to capture topic details
  const sampleTitles = items
    .slice(0, 60)
    .map(item => `[${item.category}] ${item.title} (${item.domain})`)
    .join('\n');

  const systemPrompt = `You are a clinical attention specialist, cognitive psychologist, and senior digital workflow auditor.
Your role is to analyze a user's web history telemetry and generate a comprehensive, multi-section Cognitive & Behavioral Diagnosis Report (like an attention audit or a digital therapy diagnostic).
Maintain an extremely elegant, clinical, third-person editorial tone (intellectual, minimalist, constructive). Avoid generic advice. Analyze the specific data provided.`;

  const userPrompt = `Generate a detailed Cognitive & Attention Diagnosis Report based on the following telemetry:
- Total Logged Page Hits: ${items.length}
- Primary Domains Visited: ${topDomains}
- Category Breakdown: ${categoriesText}

Here is a chronological list of recent pages visited:
${sampleTitles}

Structure the report with the following distinct sections in Markdown:
1. **DIAGNOSTIC STATUS**: A critical summary of the user's current attention state, identifying if they are in "Deep Work Flow", "Hyper-Stimulated Dopamine Loop", "Information Overload", or "Context Fragmentation".
2. **COGNITIVE LOAD & FOCUS INDEX**: Break down how time was allocated between production (Work, Research) vs distraction (Social, Shopping, Video). Provide an estimated percentage ratio.
3. **ATTENTION BLOCK DIAGNOSIS**: Highlight specific attention trap patterns observed in their history (e.g. switching frequently between work docs and retail site, or falling into endless video reels).
4. **PSYCHOLOGICAL TRIGGER ANALYSIS**: Explain the underlying motives for these browsing patterns based on cognitive science (e.g., escaping challenging tasks by opening news sites).
5. **ARCHITECTURAL PRESCRIPTION**: 3 concrete, personalized focus-restoration actions based on their actual telemetry.

Format with beautiful typography using uppercase section headers and generous paragraph spacing.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  return callNvidiaAPI(messages, apiKey, false);
}
