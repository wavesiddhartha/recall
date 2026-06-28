// Search and Categorization Service
import Fuse from 'fuse.js';
import type { HistoryItem, SearchResult } from '../types';
import { getHistoryRange, getAllHistory } from '../db/indexedDB';
import { parseSearchIntent } from './aiService';

/**
 * Injects categories into raw history items based on their URL patterns and titles
 */
export function inferCategory(urlStr: string, titleStr: string): HistoryItem['category'] {
  const url = urlStr.toLowerCase();
  const title = titleStr.toLowerCase();

  // Music Check
  if (
    url.includes('spotify.com') ||
    url.includes('soundcloud.com') ||
    url.includes('bandcamp.com') ||
    url.includes('music.apple.com') ||
    title.includes('song') ||
    title.includes('track') ||
    title.includes('music') ||
    title.includes('playlist') ||
    title.includes('piano')
  ) {
    return 'Music';
  }

  // Video Check
  if (
    url.includes('youtube.com') ||
    url.includes('vimeo.com') ||
    url.includes('netflix.com') ||
    url.includes('twitch.tv') ||
    url.includes('tiktok.com') ||
    url.includes('/video/') ||
    url.includes('/watch') ||
    title.includes('video') ||
    title.includes('youtube') ||
    title.includes('movie') ||
    title.includes('show')
  ) {
    return 'Video';
  }

  // Shopping Check
  if (
    url.includes('amazon.') ||
    url.includes('ebay.com') ||
    url.includes('etsy.com') ||
    url.includes('zara.com') ||
    url.includes('shopify.com') ||
    url.includes('/shop/') ||
    url.includes('/store/') ||
    url.includes('/cart') ||
    url.includes('/checkout') ||
    title.includes('shopping') ||
    title.includes('price') ||
    title.includes('buy')
  ) {
    return 'Shopping';
  }

  // Social Check
  if (
    url.includes('twitter.com') ||
    url.includes('x.com') ||
    url.includes('facebook.com') ||
    url.includes('instagram.com') ||
    url.includes('linkedin.com') ||
    url.includes('reddit.com/r/') ||
    url.includes('discord.com/channels') ||
    title.includes('twitter') ||
    title.includes('facebook') ||
    title.includes('linkedin')
  ) {
    return 'Social';
  }

  // Work & Dev Check
  if (
    url.includes('github.com') ||
    url.includes('stackoverflow.com') ||
    url.includes('docs.') ||
    url.includes('medium.com') ||
    url.includes('notion.so') ||
    url.includes('slack.com') ||
    url.includes('zoom.us') ||
    url.includes('confluence') ||
    url.includes('jira') ||
    url.includes('linear.app') ||
    url.includes('figma.com') ||
    url.includes('localhost') ||
    title.includes('documentation') ||
    title.includes('api') ||
    title.includes('github') ||
    title.includes('stack overflow')
  ) {
    return 'Work';
  }

  // News Check
  if (
    url.includes('nytimes.com') ||
    url.includes('bbc.co.uk') ||
    url.includes('bbc.com') ||
    url.includes('cnn.com') ||
    url.includes('guardian.') ||
    url.includes('news.ycombinator.com') ||
    url.includes('/news/') ||
    title.includes('news') ||
    title.includes('times') ||
    title.includes('article')
  ) {
    return 'News';
  }

  return 'Other';
}

/**
 * Extracts the base domain name from a URL
 */
export function extractDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace('www.', '');
  } catch (e) {
    return 'unknown';
  }
}

/**
 * Performs local keyword matching via Fuse.js on a subset of history items
 */
export function performLocalSearch(
  items: HistoryItem[],
  keywords: string[]
): SearchResult[] {
  if (keywords.length === 0 || keywords[0] === '') {
    return items.map(item => ({ item, score: 1 }));
  }

  const fuse = new Fuse(items, {
    keys: ['title', 'domain', 'url'],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true
  });

  const queryStr = keywords.join(' ');
  const results = fuse.search(queryStr);

  return results.map(res => ({
    item: res.item,
    // Fuse score ranges from 0 (perfect match) to 1 (poor match)
    // Convert it to standard relevance: 0 is worst, 1 is best
    score: res.score !== undefined ? 1 - res.score : 0.5
  }));
}

/**
 * Performs a hybrid NLU-backed query processing workflow
 */
export async function queryHistorySemantic(
  query: string,
  apiKey: string
): Promise<SearchResult[]> {
  // 1. Ask Nvidia AI to dissect user search intent
  const intent = await parseSearchIntent(query, apiKey);
  
  // 2. Fetch history records based on timeline boundaries
  let candidates: HistoryItem[] = [];
  if (intent.startTime) {
    const endTime = intent.endTime || Date.now();
    candidates = await getHistoryRange(intent.startTime, endTime);
  } else {
    candidates = await getAllHistory();
  }

  // 3. Apply exact domain filters if extracted by the AI
  if (intent.domain) {
    const targetDomain = intent.domain.toLowerCase();
    candidates = candidates.filter(item => item.domain.toLowerCase().includes(targetDomain));
  }

  // 4. Apply category filters if extracted by the AI
  if (intent.category) {
    const targetCat = intent.category;
    candidates = candidates.filter(item => item.category === targetCat);
  }

  // 5. Run Fuse.js over matching candidates
  const results = performLocalSearch(candidates, intent.keywords);

  // 6. Enrich with short explanations for top items if keywords are complex
  const topResults = results.slice(0, 8);
  
  return topResults;
}
