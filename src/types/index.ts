// Recall Application Types

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitTime: number; // millisecond timestamp
  visitCount: number;
  typedCount: number;
  domain: string; // extracted domain name
  category: 'Shopping' | 'News' | 'Video' | 'Music' | 'Social' | 'Work' | 'Other';
  snippet?: string;
  duration?: number; // estimated duration in seconds, if available
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  totalVisits: number;
  topDomains: Array<{ domain: string; count: number }>;
  categories: Record<string, number>;
  summary: string; // AI generated summary text
  interestingFinds: Array<{ title: string; url: string; reason: string }>;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  category: string;
  timestamp: number;
}

export interface SearchResult {
  item: HistoryItem;
  score?: number;
  reason?: string;
}

export interface UserConfig {
  apiKey: string;
  syncInterval: number; // in minutes
  trackingConsent: boolean;
  theme: 'light' | 'dark';
}
