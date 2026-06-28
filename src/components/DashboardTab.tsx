// Dashboard Tab Component
import { useState } from 'react';
import type { HistoryItem, DailySummary } from '../types';
import { Button } from './common/Button';
import { CardDescription } from './common/Card';
import { SkeletonText } from './common/Skeleton';
import { Drawer } from './common/Modal';
import { ExternalLink } from 'lucide-react';

interface DashboardTabProps {
  mode: 'today' | 'yesterday';
  items: HistoryItem[];
  summary: DailySummary | null;
  onGenerateSummary: () => Promise<void>;
  isGeneratingSummary: boolean;
  onDeleteItem: (id: string) => void;
}

export function DashboardTab({
  mode,
  items,
  summary,
  onGenerateSummary,
  isGeneratingSummary,
  onDeleteItem
}: DashboardTabProps) {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // Format mode date header
  const getHeaderDate = () => {
    const d = new Date();
    if (mode === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Group items by category to calculate counts
  const categorySummary = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categorySummary).sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 animate-fade-in">
      {/* LEFT SECTION: Summary & Visual Stats (7 Cols) */}
      <div className="lg:col-span-7 space-y-16">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[6px] text-neutral-400 block mb-3">
            Journal Entry
          </span>
          <h1 className="font-sans text-5xl font-extralight tracking-tight text-black uppercase">
            {getHeaderDate()}
          </h1>
        </div>

        {/* AI Summary Panel */}
        <div className="border-b border-neutral-100 pb-16 space-y-8">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <h2 className="font-mono text-[9px] uppercase tracking-[4px] text-black font-semibold">
              AI Activity Synthesis
            </h2>
            {summary && (
              <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-[2px]">
                {summary.totalVisits} logs analyzed
              </span>
            )}
          </div>

          {isGeneratingSummary ? (
            <div className="space-y-4">
              <SkeletonText className="w-full h-3" />
              <SkeletonText className="w-11/12 h-3" />
              <SkeletonText className="w-4/5 h-3" />
              <SkeletonText className="w-5/6 h-3" />
              <p className="font-mono text-[8px] uppercase tracking-[3px] text-neutral-400 animate-pulse pt-2">
                synthesizing log context with Nvidia Nemotron...
              </p>
            </div>
          ) : summary ? (
            <div className="space-y-8">
              <p className="text-[14px] text-neutral-800 leading-[2.2] font-light tracking-wide first-letter:text-4xl first-letter:font-light first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-black">
                {summary.summary}
              </p>

              {summary.interestingFinds.length > 0 && (
                <div className="pt-8 space-y-6">
                  <h3 className="font-mono text-[9px] uppercase tracking-[3px] text-black font-bold">
                    Notable Discoveries
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {summary.interestingFinds.map((find, idx) => (
                      <div key={idx} className="group space-y-2 border-t border-neutral-100 pt-4">
                        <div className="font-mono text-[9px] text-neutral-300">0{idx + 1}</div>
                        <a
                          href={find.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-sans text-[11px] font-medium tracking-wide hover:underline flex items-center gap-1.5 text-black uppercase"
                        >
                          {find.title}
                        </a>
                        <p className="text-[10px] text-neutral-400 leading-[1.6] font-light">
                          {find.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center space-y-6 bg-neutral-50/50 p-8 border border-neutral-100">
              <p className="text-[11px] text-neutral-400 font-light tracking-wide max-w-md mx-auto leading-relaxed">
                No diary summary has been generated for this day yet. Generate an editorial summary using local history context.
              </p>
              {items.length > 0 ? (
                <Button variant="outline" onClick={onGenerateSummary}>
                  Synthesize Browser Diary
                </Button>
              ) : (
                <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">
                  Cannot synthesize: No history records logged for this day.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-12 border-b border-neutral-100 pb-16">
          <div className="space-y-2">
            <CardDescription className="text-[8px] uppercase tracking-[3px] text-neutral-400">Total Logs</CardDescription>
            <span className="text-4xl font-extralight font-sans text-black">{items.length}</span>
          </div>
          <div className="space-y-2 border-l border-neutral-100 pl-10">
            <CardDescription className="text-[8px] uppercase tracking-[3px] text-neutral-400">Domains</CardDescription>
            <span className="text-4xl font-extralight font-sans text-black">
              {new Set(items.map((i) => i.domain)).size}
            </span>
          </div>
          <div className="space-y-2 border-l border-neutral-100 pl-10">
            <CardDescription className="text-[8px] uppercase tracking-[3px] text-neutral-400">Top Focus</CardDescription>
            <span className="text-[11px] font-mono uppercase tracking-[2px] text-black truncate block pt-2">
              {sortedCategories[0]?.[0] || 'None'}
            </span>
          </div>
        </div>

        {/* Category breakdown (Zara design clean list) */}
        {items.length > 0 && (
          <div className="space-y-6">
            <h3 className="font-mono text-[9px] uppercase tracking-[4px] text-black font-semibold">
              Category Distribution
            </h3>
            <div className="space-y-4">
              {sortedCategories.map(([category, count]) => {
                const percentage = Math.round((count / items.length) * 100);
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between font-mono text-[9px] text-black uppercase tracking-[2px]">
                      <span>{category}</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="h-[1px] w-full bg-neutral-100">
                      <div
                        className="h-full bg-black transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SECTION: Detailed Chronological Timeline (5 Cols) */}
      <div className="lg:col-span-5 border-l border-neutral-100 pl-8 lg:pl-16 space-y-12">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[6px] text-neutral-400 block mb-3">
            Timeline
          </span>
          <h2 className="font-mono text-[10px] uppercase tracking-[3px] text-black font-semibold">
            Chronological logs
          </h2>
        </div>

        {items.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-neutral-200/60 p-8">
            <p className="text-[11px] text-neutral-400 font-light uppercase tracking-[2px]">
              No items logged for this day.
            </p>
          </div>
        ) : (
          <div className="relative border-l border-neutral-100 pl-6 space-y-8 max-h-[75vh] overflow-y-auto pr-4 scrollbar-thin">
            {items.map((item) => {
              const timeStr = new Date(item.visitTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={item.id} className="relative group animate-fade-in">
                  {/* Timeline dot */}
                  <span className="absolute -left-[30px] top-2 h-1.5 w-1.5 rounded-full bg-neutral-200 transition-all duration-300 group-hover:bg-black group-hover:scale-125" />

                  {/* Log Content */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[8px] tracking-wider text-neutral-400">{timeStr}</span>
                      <span className="font-mono text-[8px] uppercase tracking-[2px] text-neutral-400">
                        {item.category}
                      </span>
                    </div>

                    <h4
                      onClick={() => setSelectedItem(item)}
                      className="text-[12px] font-sans font-light text-black tracking-wide leading-relaxed cursor-pointer hover:text-neutral-500 transition-colors truncate pr-16"
                    >
                      {item.title}
                    </h4>

                    <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400">
                      <span className="font-light truncate max-w-[180px] uppercase tracking-wider">{item.domain}</span>
                      <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="text-black hover:underline cursor-pointer uppercase text-[8px] tracking-widest font-semibold"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="text-red-500 hover:underline cursor-pointer uppercase text-[8px] tracking-widest font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Item Detail Sheet (Zara side slider) */}
      <Drawer
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        title="LOG INSPECTION"
      >
        {selectedItem && (
          <div className="space-y-10 font-light text-black">
            <div className="space-y-3">
              <span className="font-mono text-[8px] uppercase tracking-[3px] text-neutral-400 block">
                Source Document
              </span>
              <h3 className="text-xl font-extralight text-black leading-relaxed uppercase tracking-wide">
                {selectedItem.title}
              </h3>
              <a
                href={selectedItem.url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[9px] text-neutral-400 hover:text-black break-all hover:underline flex items-center gap-1.5 uppercase tracking-wider"
              >
                {selectedItem.url}
                <ExternalLink size={10} strokeWidth={1} />
              </a>
            </div>

            <hr className="border-neutral-100" />

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1.5">
                <span className="font-mono text-[8px] uppercase tracking-[3px] text-neutral-400 block">
                  Time of Visit
                </span>
                <span className="text-[11px] font-mono text-black">
                  {new Date(selectedItem.visitTime).toLocaleString()}
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="font-mono text-[8px] uppercase tracking-[3px] text-neutral-400 block">
                  Classification
                </span>
                <span className="text-[11px] font-mono text-black uppercase tracking-wider">
                  {selectedItem.category}
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="font-mono text-[8px] uppercase tracking-[3px] text-neutral-400 block">
                  Domain Server
                </span>
                <span className="text-[11px] font-mono text-black truncate block uppercase tracking-wider">
                  {selectedItem.domain}
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="font-mono text-[8px] uppercase tracking-[3px] text-neutral-400 block">
                  Logged Sessions
                </span>
                <span className="text-[11px] font-mono text-black">
                  {selectedItem.visitCount} times
                </span>
              </div>
            </div>

            <hr className="border-neutral-100" />

            <div className="space-y-4">
              <span className="font-mono text-[8px] uppercase tracking-[3px] text-neutral-400 block">
                Sensitive Domain Alert
              </span>
              <p className="text-[11px] text-neutral-400 leading-relaxed font-light">
                This item is stored securely on your local disk in an IndexedDB sandboxed environment. Recall never uploads raw URLs to the cloud. You can delete this single record or purge all cookies/database indexes in the Settings tab.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full mt-8"
              onClick={() => {
                onDeleteItem(selectedItem.id);
                setSelectedItem(null);
              }}
            >
              Delete Record From Recall
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
export default DashboardTab;
