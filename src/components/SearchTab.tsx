// Search & AI Chat Component
import { useState, useRef, useEffect } from 'react';
import type { SearchResult, HistoryItem } from '../types';
import { queryHistorySemantic } from '../services/searchService';
import { chatAboutHistory } from '../services/aiService';
import { Button } from './common/Button';
import { Drawer } from './common/Modal';
import { SkeletonText } from './common/Skeleton';
import { Search, ChevronDown, ChevronUp, ExternalLink, ArrowRight } from 'lucide-react';

interface SearchTabProps {
  apiKey: string;
  allHistorySummaries: string; // aggregated daily summaries for chat context
  onDeleteItem: (id: string) => void;
}

export function SearchTab({ apiKey, allHistorySummaries, onDeleteItem }: SearchTabProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // Chat States
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; reasoning?: string }>>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [currentStreamingReasoning, setCurrentStreamingReasoning] = useState('');
  const [showReasoningIndex, setShowReasoningIndex] = useState<number | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentStreamingText]);

  // Execute NLU/Semantic search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const results = await queryHistorySemantic(query.trim(), apiKey);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Execute AI chat query
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsChatting(true);
    setCurrentStreamingText('');
    setCurrentStreamingReasoning('');

    try {
      await chatAboutHistory(
        userText,
        allHistorySummaries || 'No history context exists.',
        apiKey,
        (contentChunk, reasoningChunk) => {
          if (reasoningChunk) {
            setCurrentStreamingReasoning((prev) => prev + reasoningChunk);
          }
          if (contentChunk) {
            setCurrentStreamingText((prev) => prev + contentChunk);
          }
        }
      );

      // Append completed message to logs
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: currentStreamingText,
          reasoning: currentStreamingReasoning
        }
      ]);
      setCurrentStreamingText('');
      setCurrentStreamingReasoning('');
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Deepest apologies. An error occurred connecting to the intelligence server. Verify your Nvidia API Key.'
        }
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 animate-fade-in text-black font-light">
      {/* LEFT SECTION: Search Box & Detailed Results (7 Cols) */}
      <div className="lg:col-span-7 space-y-16">
        <div className="space-y-4">
          <span className="font-mono text-[9px] uppercase tracking-[6px] text-neutral-400 block">
            Memory Query
          </span>
          <h2 className="font-sans text-5xl font-extralight tracking-tight uppercase text-black">
            Semantic Search
          </h2>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative border-b border-black flex items-center py-4">
            <input
              type="text"
              placeholder="TYPE YOUR INQUIRY..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent font-sans text-3xl font-extralight text-black uppercase tracking-wide focus:outline-none placeholder-neutral-200"
            />
            <button type="submit" className="text-black focus:outline-none cursor-pointer">
              <Search size={22} strokeWidth={1} />
            </button>
          </div>
          <p className="font-mono text-[8px] text-neutral-400 tracking-[2px] uppercase">
            Try: "piano track spotify" • "github documentation yesterday" • "minimal fashion article"
          </p>
        </form>

        {/* Results Pane */}
        <div className="space-y-8">
          {isSearching ? (
            <div className="space-y-8">
              <div className="border-b border-neutral-100 pb-8 space-y-3">
                <SkeletonText className="w-1/3" />
                <SkeletonText className="w-full" />
                <SkeletonText className="w-3/4" />
              </div>
              <div className="border-b border-neutral-100 pb-8 space-y-3">
                <SkeletonText className="w-1/4" />
                <SkeletonText className="w-full" />
                <SkeletonText className="w-2/3" />
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                <span className="font-mono text-[9px] uppercase tracking-[2px] text-neutral-400">
                  Search results ({searchResults.length})
                </span>
              </div>
              <div className="divide-y divide-neutral-100">
                {searchResults.map(({ item, score }, idx) => {
                  const visitDateStr = new Date(item.visitTime).toLocaleString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="group py-6 flex gap-6 items-start hover:bg-neutral-50/40 transition-colors cursor-pointer px-2"
                    >
                      {/* Index */}
                      <span className="font-mono text-[9px] text-neutral-300 pt-1">0{idx + 1}</span>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[8px] uppercase tracking-[2px] text-neutral-400">
                            {item.category}
                          </span>
                          <span className="font-mono text-[8px] text-neutral-400">
                            {visitDateStr}
                          </span>
                        </div>

                        <h4 className="text-[12px] font-sans font-light text-black group-hover:text-neutral-500 transition-colors leading-relaxed uppercase tracking-wide truncate">
                          {item.title}
                        </h4>

                        <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400 pt-1">
                          <span className="truncate max-w-[280px] uppercase tracking-wider">{item.domain}</span>
                          <div className="flex gap-4 items-center">
                            {score !== undefined && (
                              <span className="text-emerald-700 uppercase tracking-widest text-[8px] font-semibold">
                                {Math.round(score * 100)}% Match
                              </span>
                            )}
                            <span className="text-black uppercase tracking-widest text-[8px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                              Inspect →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : query && !isSearching ? (
            <div className="py-24 text-center border border-dashed border-neutral-200/60 p-8">
              <p className="text-[11px] text-neutral-400 font-light uppercase tracking-[2px]">
                No matching memory logs. Check category and keywords.
              </p>
            </div>
          ) : (
            <div className="py-24 text-center border-t border-neutral-100">
              <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-[3px]">
                System standing by. Enter search parameters above.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: AI History Assistant (5 Cols) */}
      <div className="lg:col-span-5 border-l border-neutral-100 pl-8 lg:pl-16 flex flex-col h-[75vh]">
        <div className="mb-8 space-y-3">
          <span className="font-mono text-[9px] uppercase tracking-[6px] text-neutral-400 block">
            AI Assistant
          </span>
          <h3 className="font-mono text-[10px] uppercase tracking-[3px] text-black font-semibold">
            Recall Chat Assistant
          </h3>
          <p className="text-[10px] text-neutral-400 font-light leading-relaxed">
            Query your aggregated digital memory history in conversation. Supported by Nvidia thinking.
          </p>
        </div>

        {/* Chat History Messages */}
        <div className="flex-1 overflow-y-auto space-y-8 pr-4 border-b border-neutral-100 pb-8 scrollbar-thin">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 opacity-40">
              <p className="text-[9px] font-mono uppercase tracking-[2px] text-neutral-400">
                "What did I do regarding design systems yesterday?"
              </p>
            </div>
          ) : (
            chatMessages.map((msg, index) => (
              <div key={index} className="space-y-3 animate-fade-in">
                <div
                  className={`font-mono text-[8px] uppercase tracking-[3px] ${
                    msg.role === 'user' ? 'text-black text-right font-semibold' : 'text-neutral-400'
                  }`}
                >
                  {msg.role === 'user' ? 'You' : 'Recall Intelligence'}
                </div>

                <div
                  className={`text-[12px] p-6 leading-[2] font-light ${
                    msg.role === 'user'
                      ? 'bg-neutral-50 text-black text-right tracking-wide'
                      : 'border border-neutral-100 bg-white text-neutral-800'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Reasoning Box for AI Responses */}
                {msg.role === 'assistant' && msg.reasoning && (
                  <div className="border-l border-neutral-100 pl-4 py-1">
                    <button
                      onClick={() => setShowReasoningIndex(showReasoningIndex === index ? null : index)}
                      className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[2px] text-neutral-400 hover:text-black cursor-pointer"
                    >
                      {showReasoningIndex === index ? <ChevronUp size={10} strokeWidth={1} /> : <ChevronDown size={10} strokeWidth={1} />}
                      Reasoning Trace
                    </button>
                    {showReasoningIndex === index && (
                      <pre className="mt-3 font-mono text-[9px] text-neutral-400 whitespace-pre-wrap leading-relaxed border-t border-neutral-50 pt-3 italic">
                        {msg.reasoning}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Streaming display */}
          {(currentStreamingText || currentStreamingReasoning) && (
            <div className="space-y-3 animate-fade-in">
              <div className="font-mono text-[8px] uppercase tracking-[3px] text-neutral-400">
                Recall Intelligence (Streaming...)
              </div>
              
              {currentStreamingText && (
                <div className="text-[12px] p-6 leading-[2] font-light border border-neutral-100 bg-white text-neutral-800">
                  {currentStreamingText}
                </div>
              )}

              {currentStreamingReasoning && (
                <div className="border-l border-neutral-100 pl-4 py-1">
                  <span className="font-mono text-[8px] uppercase tracking-[2px] text-neutral-400 block mb-2">
                    AI Chain of Thought
                  </span>
                  <pre className="font-mono text-[9px] text-neutral-400 whitespace-pre-wrap leading-normal italic max-h-36 overflow-y-auto">
                    {currentStreamingReasoning}
                  </pre>
                </div>
              )}
            </div>
          )}

          {isChatting && !currentStreamingText && !currentStreamingReasoning && (
            <div className="space-y-3 py-4">
              <SkeletonText className="w-1/3 h-2" />
              <SkeletonText className="w-11/12 h-2" />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input box */}
        <form onSubmit={handleChatSubmit} className="pt-8 flex gap-2">
          <input
            type="text"
            placeholder="ASK RECALL ANYTHING..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isChatting}
            className="flex-1 bg-transparent border border-neutral-100 px-5 py-4 font-mono text-[10px] text-black uppercase tracking-[2px] focus:outline-none focus:border-black disabled:opacity-50 placeholder-neutral-200"
          />
          <button
            type="submit"
            disabled={isChatting || !chatInput.trim()}
            className="bg-black text-white hover:bg-neutral-800 p-4 flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer"
          >
            <ArrowRight size={16} strokeWidth={1.5} />
          </button>
        </form>
      </div>

      {/* Item Detail Inspector Sheet */}
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
                  Total Visits
                </span>
                <span className="text-[11px] font-mono text-black">
                  {selectedItem.visitCount} times
                </span>
              </div>
            </div>

            <hr className="border-neutral-100" />

            <Button
              variant="outline"
              className="w-full mt-8"
              onClick={() => {
                onDeleteItem(selectedItem.id);
                setSelectedItem(null);
                setSearchResults((prev) => prev.filter((r) => r.item.id !== selectedItem.id));
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
export default SearchTab;
