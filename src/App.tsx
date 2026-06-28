import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import { DashboardTab } from './components/DashboardTab';
import { SearchTab } from './components/SearchTab';
import { InsightsTab } from './components/InsightsTab';
import { SettingsTab } from './components/SettingsTab';
import type { HistoryItem, DailySummary, Insight } from './types';
import {
  saveHistoryItems,
  getAllHistory,
  getSummary,
  saveSummary,
  getInsights,
  deleteHistoryItem
} from './db/indexedDB';
import { fetchHistoryFromExtension, isExtensionInstalled } from './services/extensionBridge';
import { generateDailySummary, DEFAULT_API_KEY } from './services/aiService';
import { getDemoHistoryItems } from './db/demoData';
import { extractDomain, inferCategory } from './services/searchService';

function App() {
  const [activeTab, setActiveTab] = useState<'today' | 'yesterday' | 'search' | 'insights' | 'settings'>('today');
  const [apiKey, setApiKey] = useState<string>(() => {
    const saved = localStorage.getItem('recall_api_key');
    const oldDefault = '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';
    if (saved === oldDefault || !saved) {
      localStorage.removeItem('recall_api_key');
      return DEFAULT_API_KEY;
    }
    return saved;
  });

  // Data States
  const [allHistory, setAllHistory] = useState<HistoryItem[]>([]);
  const [todayItems, setTodayItems] = useState<HistoryItem[]>([]);
  const [yesterdayItems, setYesterdayItems] = useState<HistoryItem[]>([]);
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [yesterdaySummary, setYesterdaySummary] = useState<DailySummary | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);

  // Loading & Sync States
  const [isGeneratingSummaryToday, setIsGeneratingSummaryToday] = useState(false);
  const [isGeneratingSummaryYesterday, setIsGeneratingSummaryYesterday] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'error'>('idle');
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const [totalToSync, setTotalToSync] = useState<number>(0);
  const [excludedDomains, setExcludedDomains] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('recall_excluded_domains') || '[]');
    } catch (e) {
      return [];
    }
  });

  // Group history items into Today and Yesterday segments
  const filterDayItems = useCallback((items: HistoryItem[], targetMode: 'today' | 'yesterday') => {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    return items.filter((item) => {
      if (targetMode === 'today') {
        return item.visitTime >= startOfToday;
      } else {
        return item.visitTime >= startOfYesterday && item.visitTime < startOfToday;
      }
    });
  }, []);

  // Fetch from DB and sync local React state
  const loadDataFromDB = useCallback(async () => {
    try {
      const history = await getAllHistory();
      const loadedInsights = await getInsights();

      // Formulate date strings
      const todayDateStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDateStr = yesterday.toISOString().split('T')[0];

      // Fetch Summaries
      const sumToday = await getSummary(todayDateStr);
      const sumYesterday = await getSummary(yesterdayDateStr);

      setAllHistory(history);
      setTodayItems(filterDayItems(history, 'today'));
      setYesterdayItems(filterDayItems(history, 'yesterday'));
      setTodaySummary(sumToday);
      setYesterdaySummary(sumYesterday);
      setInsights(loadedInsights);
    } catch (error) {
      console.error('Error loading local data:', error);
    }
  }, [filterDayItems]);

  // Synchronize history from extension background worker
  // Synchronize history from extension background worker (fetching last 30 days)
  const handleSyncFromExtension = useCallback(async () => {
    if (syncStatus === 'syncing' || !isExtensionInstalled()) return;
    setSyncStatus('syncing');
    setSyncedCount(0);
    setTotalToSync(0);

    try {
      const startOfEpoch = 0;
      const rawItems = await fetchHistoryFromExtension(startOfEpoch, undefined, 999999);

      if (rawItems && rawItems.length > 0) {
        const formatted: HistoryItem[] = rawItems
          .map((item) => ({
            id: item.id,
            url: item.url,
            title: item.title,
            visitTime: item.visitTime,
            visitCount: item.visitCount,
            typedCount: item.typedCount,
            domain: extractDomain(item.url),
            category: inferCategory(item.url, item.title)
          }))
          .filter((item) => !excludedDomains.some((d) => item.domain.toLowerCase().includes(d.toLowerCase())));

        setTotalToSync(formatted.length);

        // Process in chunks of 200 items to give visual rolling updates in header
        const chunkSize = 200;
        for (let i = 0; i < formatted.length; i += chunkSize) {
          const chunk = formatted.slice(i, i + chunkSize);
          await saveHistoryItems(chunk);
          setSyncedCount((prev) => Math.min(prev + chunk.length, formatted.length));
          await new Promise((resolve) => setTimeout(resolve, 60)); // 60ms delay for visual rolling
        }

        setSyncStatus('completed');
        await loadDataFromDB();
      } else {
        setSyncStatus('completed');
      }
    } catch (err) {
      console.error('Extension synchronization failed:', err);
      setSyncStatus('error');
    }
  }, [loadDataFromDB, excludedDomains]);

  // Initialize and check extension bridge
  useEffect(() => {
    loadDataFromDB();

    // Trigger initial sync if extension ready
    if (isExtensionInstalled()) {
      handleSyncFromExtension();
    }

    const handleReady = () => {
      handleSyncFromExtension();
    };

    window.addEventListener('RECALL_EXTENSION_READY', handleReady);
    return () => {
      window.removeEventListener('RECALL_EXTENSION_READY', handleReady);
    };
  }, [loadDataFromDB, handleSyncFromExtension]);

  const handleGenerateSummary = async (targetMode: 'today' | 'yesterday') => {
    const isToday = targetMode === 'today';
    const items = isToday ? todayItems : yesterdayItems;
    
    if (items.length === 0) return;

    if (isToday) setIsGeneratingSummaryToday(true);
    else setIsGeneratingSummaryYesterday(true);

    try {
      const d = new Date();
      if (!isToday) d.setDate(d.getDate() - 1);
      const dateStr = d.toISOString().split('T')[0];

      const summaryObj = await generateDailySummary(dateStr, items, apiKey);
      await saveSummary(summaryObj);

      if (isToday) setTodaySummary(summaryObj);
      else setYesterdaySummary(summaryObj);
    } catch (error) {
      console.error('Summary synthesis failed:', error);
    } finally {
      if (isToday) setIsGeneratingSummaryToday(false);
      else setIsGeneratingSummaryYesterday(false);
    }
  };

  const handleDeleteVisit = async (id: string) => {
    try {
      await deleteHistoryItem(id);
      // Remove element immutably from list
      const updatedHistory = allHistory.filter((item) => item.id !== id);
      setAllHistory(updatedHistory);
      setTodayItems(filterDayItems(updatedHistory, 'today'));
      setYesterdayItems(filterDayItems(updatedHistory, 'yesterday'));
    } catch (error) {
      console.error('Delete operation failed:', error);
    }
  };

  const handleLoadDemoData = async () => {
    try {
      const demoItems = getDemoHistoryItems();
      await saveHistoryItems(demoItems);
      await loadDataFromDB();
    } catch (error) {
      console.error('Failed to inject demo data:', error);
    }
  };

  const handleClearData = () => {
    setAllHistory([]);
    setTodayItems([]);
    setYesterdayItems([]);
    setTodaySummary(null);
    setYesterdaySummary(null);
    setInsights([]);
  };

  // Compile daily summaries as a text block for LLM chat context
  const getAggregatedSummariesContext = () => {
    const contextParts: string[] = [];
    if (yesterdaySummary) {
      contextParts.push(`Yesterday (${yesterdaySummary.date}): ${yesterdaySummary.summary}`);
    } else if (yesterdayItems.length > 0) {
      contextParts.push(`Yesterday log count: ${yesterdayItems.length} visits.`);
    }
    if (todaySummary) {
      contextParts.push(`Today (${todaySummary.date}): ${todaySummary.summary}`);
    } else if (todayItems.length > 0) {
      contextParts.push(`Today log count: ${todayItems.length} visits.`);
    }
    return contextParts.join('\n\n');
  };

  return (
    <div className="min-h-screen bg-zara-white text-zara-black flex flex-col antialiased selection:bg-neutral-200">
      {/* Top fixed navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        syncStatus={syncStatus}
        syncedCount={syncedCount}
        totalToSync={totalToSync}
      />

      {/* Main viewport */}
      <main className="flex-1 pt-32 pb-24 px-8 md:px-16 max-w-7xl w-full mx-auto">
        {activeTab === 'today' && (
          <DashboardTab
            mode="today"
            items={todayItems}
            summary={todaySummary}
            onGenerateSummary={() => handleGenerateSummary('today')}
            isGeneratingSummary={isGeneratingSummaryToday}
            onDeleteItem={handleDeleteVisit}
          />
        )}

        {activeTab === 'yesterday' && (
          <DashboardTab
            mode="yesterday"
            items={yesterdayItems}
            summary={yesterdaySummary}
            onGenerateSummary={() => handleGenerateSummary('yesterday')}
            isGeneratingSummary={isGeneratingSummaryYesterday}
            onDeleteItem={handleDeleteVisit}
          />
        )}

        {activeTab === 'search' && (
          <SearchTab
            apiKey={apiKey}
            allHistorySummaries={getAggregatedSummariesContext()}
            onDeleteItem={handleDeleteVisit}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsTab
            items={allHistory}
            insights={insights}
            apiKey={apiKey}
            onRefreshInsights={(newInsights) => setInsights(newInsights)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            apiKey={apiKey}
            setApiKey={setApiKey}
            onClearData={handleClearData}
            onLoadDemoData={handleLoadDemoData}
            excludedDomains={excludedDomains}
            setExcludedDomains={setExcludedDomains}
          />
        )}
      </main>
    </div>
  );
}

export default App;
