// Insights & Charting Component
import { useState } from 'react';
import type { HistoryItem, Insight } from '../types';
import { generateActivityInsights, generateCognitiveDiagnosticReport } from '../services/aiService';
import { saveInsights } from '../db/indexedDB';
import { Button } from './common/Button';
import { SkeletonCard } from './common/Skeleton';
// No icons used in this file
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

interface InsightsTabProps {
  items: HistoryItem[];
  insights: Insight[];
  apiKey: string;
  onRefreshInsights: (newInsights: Insight[]) => void;
}

export function InsightsTab({ items, insights, apiKey, onRefreshInsights }: InsightsTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [cognitiveReport, setCognitiveReport] = useState<string>(() => {
    return localStorage.getItem('recall_cognitive_report') || '';
  });

  // Process data for periods
  const periodData = [
    { name: 'MORNING (06-12)', visits: 0 },
    { name: 'AFTERNOON (12-18)', visits: 0 },
    { name: 'EVENING (18-24)', visits: 0 },
    { name: 'NIGHT (00-06)', visits: 0 }
  ];

  items.forEach((item) => {
    const hr = new Date(item.visitTime).getHours();
    if (hr >= 6 && hr < 12) periodData[0].visits++;
    else if (hr >= 12 && hr < 18) periodData[1].visits++;
    else if (hr >= 18 && hr < 24) periodData[2].visits++;
    else periodData[3].visits++;
  });

  // Process data for day-of-week
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dailyData = daysOfWeek.map((day) => ({ day, visits: 0 }));

  items.forEach((item) => {
    const dayIndex = new Date(item.visitTime).getDay();
    dailyData[dayIndex].visits += 1;
  });

  const handleGenerateInsights = async () => {
    if (items.length === 0) return;
    setIsGenerating(true);
    try {
      const generated = await generateActivityInsights(items, apiKey);
      await saveInsights(generated);
      onRefreshInsights(generated);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCognitiveReport = async () => {
    if (items.length === 0) return;
    setIsGeneratingReport(true);
    try {
      const res = await generateCognitiveDiagnosticReport(items, apiKey);
      setCognitiveReport(res.content);
      localStorage.setItem('recall_cognitive_report', res.content);
    } catch (error) {
      console.error('Failed to generate cognitive report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleDownloadReport = () => {
    if (!cognitiveReport) return;
    const blob = new Blob([cognitiveReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recall_cognitive_diagnosis_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 animate-fade-in text-black font-light">
      {/* LEFT SECTION: Data Visualizations (7 Cols) */}
      <div className="lg:col-span-7 space-y-16">
        <div className="space-y-4">
          <span className="font-mono text-[9px] uppercase tracking-[6px] text-neutral-400 block">
            Digital Metrics
          </span>
          <h2 className="font-sans text-5xl font-extralight tracking-tight uppercase text-black">
            Activity Graphs
          </h2>
        </div>

        {/* Hour / Period Chart */}
        <div className="border-b border-neutral-100 pb-16 space-y-6">
          <h3 className="font-mono text-[9px] uppercase tracking-[3px] text-black font-semibold">
            Period Intensity Matrix
          </h3>
          <div className="h-[220px] w-full">
            {items.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400 font-light">
                Log items to draw activity graphs.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={periodData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#111111" stopOpacity={0.06} />
                      <stop offset="95%" stopColor="#111111" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    stroke="#aaaaaa"
                    fontSize={8}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
                  />
                  <YAxis
                    stroke="#aaaaaa"
                    fontSize={8}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontFamily: 'monospace' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111111',
                      border: 'none',
                      color: '#ffffff',
                      fontFamily: 'monospace',
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      borderRadius: '0px',
                      padding: '12px'
                    }}
                    itemStyle={{ color: '#ffffff' }}
                    labelStyle={{ color: '#888888', marginBottom: '4px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    stroke="#111111"
                    strokeWidth={1}
                    fillOpacity={1}
                    fill="url(#colorVisits)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="border-b border-neutral-100 pb-16 space-y-6">
          <h3 className="font-mono text-[9px] uppercase tracking-[3px] text-black font-semibold">
            Weekly Routine Breakdown
          </h3>
          <div className="h-[220px] w-full">
            {items.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400 font-light">
                Log items to draw activity graphs.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    stroke="#aaaaaa"
                    fontSize={8}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
                  />
                  <YAxis
                    stroke="#aaaaaa"
                    fontSize={8}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontFamily: 'monospace' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111111',
                      border: 'none',
                      color: '#ffffff',
                      fontFamily: 'monospace',
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      borderRadius: '0px',
                      padding: '12px'
                    }}
                    itemStyle={{ color: '#ffffff' }}
                    labelStyle={{ color: '#888888', marginBottom: '4px' }}
                  />
                  <Bar dataKey="visits" fill="#111111" radius={[0, 0, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: AI Habit Insights (5 Cols) */}
      <div className="lg:col-span-5 border-l border-neutral-100 pl-8 lg:pl-16 space-y-12">
        <div className="space-y-3">
          <span className="font-mono text-[9px] uppercase tracking-[6px] text-neutral-400 block">
            Habit Analysis
          </span>
          <h2 className="font-mono text-[10px] uppercase tracking-[3px] text-black font-semibold">
            AI Habit Insights
          </h2>
          <p className="text-[10px] text-neutral-400 font-light leading-relaxed">
            AI-extracted behavioral anomalies and cognitive focus points from your local browser database.
          </p>
        </div>

        {/* Generate / Refresh button */}
        {items.length > 0 && (
          <Button
            variant="outline"
            className="w-full"
            disabled={isGenerating}
            onClick={handleGenerateInsights}
          >
            {isGenerating ? 'Synthesizing...' : 'Re-calculate AI Insights'}
          </Button>
        )}

        {/* Insights Cards */}
        <div className="space-y-10">
          {isGenerating ? (
            <div className="space-y-6">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : insights.length > 0 ? (
            insights.map((insight) => (
              <div
                key={insight.id}
                className="border-l border-black pl-6 py-2 space-y-2 animate-fade-in group hover:border-l-[2px] transition-all duration-300"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[8px] uppercase tracking-[2px] text-neutral-400">
                    {insight.category}
                  </span>
                  <span className="font-mono text-[8px] text-neutral-400">
                    {new Date(insight.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="font-mono text-[10px] font-semibold text-black uppercase tracking-wider">
                  {insight.title}
                </h4>
                <p className="text-[11px] text-neutral-500 leading-[1.8] font-light">
                  {insight.description}
                </p>
              </div>
            ))
          ) : (
            <div className="py-16 text-center border border-dashed border-neutral-200/60 p-8">
              <p className="text-[11px] text-neutral-400 font-light mb-6">
                No behavioral insights computed yet.
              </p>
              {items.length > 0 ? (
                <Button variant="outline" onClick={handleGenerateInsights}>
                  Compute Habits
                </Button>
              ) : (
                <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">
                  History database empty. Connect extension first.
                </p>
              )}
            </div>
          )}
        </div>

        <hr className="border-neutral-100 my-10" />

        {/* Cognitive Attention Audit Diagnosis Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="font-mono text-[9px] uppercase tracking-[6px] text-neutral-400 block">
              Diagnosis
            </span>
            <h2 className="font-mono text-[10px] uppercase tracking-[3px] text-black font-semibold">
              Cognitive Attention Audit
            </h2>
            <p className="text-[10px] text-neutral-400 font-light leading-relaxed">
              Generate a clinical-grade behavioral assessment and workflow therapy diagnosis based on your historical telemetry patterns.
            </p>
          </div>

          {items.length > 0 ? (
            <Button
              variant="primary"
              className="w-full"
              disabled={isGeneratingReport}
              onClick={handleGenerateCognitiveReport}
            >
              {isGeneratingReport ? 'Analyzing Attention Waves...' : 'Generate Cognitive Diagnosis'}
            </Button>
          ) : (
            <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest text-center py-4">
              Database empty. Ingest browser history to run audit.
            </p>
          )}

          {cognitiveReport && (
            <div className="border border-neutral-100 p-6 bg-white/50 space-y-4 animate-fade-in">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <span className="font-mono text-[8px] uppercase tracking-[2px] text-neutral-400">
                  Audit Result
                </span>
                <button
                  onClick={handleDownloadReport}
                  className="font-mono text-[8px] uppercase tracking-widest text-black hover:underline cursor-pointer"
                >
                  Download Report
                </button>
              </div>
              <div className="prose prose-sm max-w-none text-neutral-600 font-sans text-[11px] leading-[1.8] space-y-4 whitespace-pre-line font-light">
                {cognitiveReport}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default InsightsTab;
