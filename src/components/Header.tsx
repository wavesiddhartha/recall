// Zara-like Minimalist Header Component
import { isExtensionInstalled } from '../services/extensionBridge';

interface HeaderProps {
  activeTab: 'today' | 'yesterday' | 'search' | 'insights' | 'settings';
  setActiveTab: (tab: 'today' | 'yesterday' | 'search' | 'insights' | 'settings') => void;
  syncStatus: 'idle' | 'syncing' | 'completed' | 'error';
  syncedCount: number;
  totalToSync: number;
}

export function Header({
  activeTab,
  setActiveTab,
  syncStatus,
  syncedCount,
  totalToSync
}: HeaderProps) {
  const isConnected = isExtensionInstalled();

  const navItems = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'search', label: 'Search' },
    { id: 'insights', label: 'Insights' },
    { id: 'settings', label: 'Settings' }
  ] as const;

  const getStatusText = () => {
    if (!isConnected) return 'Offline';
    if (syncStatus === 'syncing') {
      return `Indexing Vault: ${syncedCount} / ${totalToSync} logs`;
    }
    if (syncStatus === 'completed') {
      return 'Vault Synced';
    }
    return 'Synced';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md px-12 md:px-24 py-8 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-neutral-100">
      {/* Brand Logo & Connection Status */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => setActiveTab('today')}
          className="font-sans text-[15px] font-semibold tracking-[14px] text-black focus:outline-none uppercase mr-[-14px]"
        >
          Recall
        </button>
        <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[2px] text-neutral-400 py-0.5">
          <span className={`h-1.5 w-1.5 rounded-full ${
            !isConnected ? 'bg-neutral-300' : syncStatus === 'syncing' ? 'bg-black animate-pulse' : 'bg-black'
          }`} />
          {getStatusText()}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex items-center gap-12">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`font-mono text-[9px] uppercase tracking-[0.25em] transition-all duration-300 pb-1 focus:outline-none relative ${
              activeTab === item.id
                ? 'text-black font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-black'
                : 'text-neutral-400 hover:text-black'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
export default Header;
