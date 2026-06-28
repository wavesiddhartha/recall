// Settings & Database Control Panel
import { useState, useEffect } from 'react';
import { isExtensionInstalled, pingExtension } from '../services/extensionBridge';
import { clearDatabase, saveHistoryItems, getAllHistory, getInsights } from '../db/indexedDB';
import { Button } from './common/Button';
import { RefreshCw } from 'lucide-react';

interface SettingsTabProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  onClearData: () => void;
  onLoadDemoData: () => void;
  excludedDomains: string[];
  setExcludedDomains: (domains: string[]) => void;
}

export function SettingsTab({
  apiKey,
  setApiKey,
  onClearData,
  onLoadDemoData,
  excludedDomains,
  setExcludedDomains
}: SettingsTabProps) {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [extVersion, setExtVersion] = useState<string>('');
  const [isCheckingExt, setIsCheckingExt] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const extInstalled = isExtensionInstalled();
  const isOutdated = extInstalled && extVersion && extVersion < '1.2.0';

  useEffect(() => {
    handleCheckExtension();
  }, []);

  const handleSaveKey = () => {
    setApiKey(keyInput);
    localStorage.setItem('recall_api_key', keyInput);
    setStatusMessage('API Key updated successfully.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleAddDomain = () => {
    if (!newDomain.trim()) return;
    const cleanDomain = newDomain.trim().toLowerCase();
    if (!excludedDomains.includes(cleanDomain)) {
      const updated = [...excludedDomains, cleanDomain];
      setExcludedDomains(updated);
      localStorage.setItem('recall_excluded_domains', JSON.stringify(updated));
    }
    setNewDomain('');
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    const updated = excludedDomains.filter((d) => d !== domainToRemove);
    setExcludedDomains(updated);
    localStorage.setItem('recall_excluded_domains', JSON.stringify(updated));
  };

  const handleCheckExtension = async () => {
    setIsCheckingExt(true);
    const res = await pingExtension();
    if (res.success) {
      setExtVersion(res.version);
    } else {
      setExtVersion('');
    }
    setIsCheckingExt(false);
  };

  const handleExport = async () => {
    try {
      const history = await getAllHistory();
      const insights = await getInsights();
      
      const exportPayload = {
        history,
        insights,
        exportedAt: new Date().toISOString()
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `recall_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error(e);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImportError('');
    setImportSuccess(false);

    fileReader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || !Array.isArray(parsed.history)) {
          setImportError('Invalid backup file formatting: Missing history array.');
          return;
        }

        // Save imported items
        await saveHistoryItems(parsed.history);
        setImportSuccess(true);
        onLoadDemoData(); // Trigger reload in parent state
      } catch (err) {
        setImportError('File parse error. Verify JSON integrity.');
      }
    };
    fileReader.readAsText(files[0]);
  };

  const handleClear = async () => {
    if (window.confirm('PURGE SYSTEM ARCHIVES?\nThis action wipes all history items, daily diaries, and habit logs from IndexedDB permanently.')) {
      await clearDatabase();
      onClearData();
      setStatusMessage('Local database purges completed.');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 animate-fade-in font-light text-black">
      {/* LEFT SECTION: Configuration & Management (7 Cols) */}
      <div className="lg:col-span-7 space-y-16">
        <div className="space-y-4">
          <span className="font-mono text-[9px] uppercase tracking-[6px] text-neutral-400 block">
            Recall Setup
          </span>
          <h2 className="font-sans text-5xl font-extralight tracking-tight uppercase text-black">
            System Settings
          </h2>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="bg-black text-white px-6 py-4 font-mono text-[9px] uppercase tracking-[2px]">
            {statusMessage}
          </div>
        )}

        {/* AI Key Configuration */}
        <div className="border-b border-neutral-100 pb-16 space-y-6">
          <h3 className="font-mono text-[9px] uppercase tracking-[3px] text-black font-bold">
            Nvidia API Credentials
          </h3>
          <p className="text-[11px] text-neutral-500 leading-relaxed font-light">
            Recall queries history data locally, but queries the Nvidia API for high-end summaries and chat logic. We pre-configured a functional key, but you can override it below.
          </p>
          <div className="flex items-center gap-6 pt-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="ENTER API KEY..."
              className="flex-1 bg-transparent border-b border-neutral-100 py-3 font-mono text-[10px] text-black focus:outline-none focus:border-black uppercase tracking-[2px] placeholder-neutral-200"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 hover:text-black cursor-pointer"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
            <Button variant="primary" size="sm" onClick={handleSaveKey}>
              Apply
            </Button>
          </div>
        </div>

        {/* Database backup & Purge */}
        <div className="border-b border-neutral-100 pb-16 space-y-8">
          <h3 className="font-mono text-[9px] uppercase tracking-[3px] text-black font-bold">
            Local Data Controls
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Export */}
            <div className="space-y-3">
              <h4 className="font-mono text-[9px] uppercase tracking-[2px] text-black font-semibold">
                Export Vault
              </h4>
              <p className="text-[10px] text-neutral-400 font-light leading-relaxed">
                Save an unencrypted JSON snapshot of your logged history.
              </p>
              <Button variant="outline" size="sm" className="w-full" onClick={handleExport}>
                Download JSON
              </Button>
            </div>

            {/* Import */}
            <div className="space-y-3">
              <h4 className="font-mono text-[9px] uppercase tracking-[2px] text-black font-semibold">
                Import Vault
              </h4>
              <p className="text-[10px] text-neutral-400 font-light leading-relaxed">
                Import history from a previously saved JSON snapshot.
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  id="import-file"
                />
                <label
                  htmlFor="import-file"
                  className="w-full text-center border border-black bg-transparent text-black font-mono text-[9px] uppercase tracking-[2px] py-3 px-4 inline-block cursor-pointer hover:bg-black hover:text-white transition-colors"
                >
                  Upload File
                </label>
              </div>
              {importSuccess && (
                <span className="text-[8px] font-mono text-emerald-600 block mt-2">Imported successfully.</span>
              )}
              {importError && (
                <span className="text-[8px] font-mono text-red-500 block mt-2">{importError}</span>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-100 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="space-y-1">
              <h4 className="font-mono text-[9px] uppercase tracking-[2px] text-red-600 font-semibold">
                System Wipe
              </h4>
              <p className="text-[10px] text-neutral-400 font-light">
                Erase local database files immediately.
              </p>
            </div>
            <button
              onClick={handleClear}
              className="text-[9px] font-mono uppercase tracking-[2px] text-red-600 hover:underline cursor-pointer"
            >
              Purge Database
            </button>
          </div>
        </div>

        {/* Demo Data Injection */}
        <div className="space-y-4">
          <h3 className="font-mono text-[9px] uppercase tracking-[3px] text-black font-bold">
            Evaluation Sandbox
          </h3>
          <p className="text-[11px] text-neutral-400 leading-relaxed font-light">
            If you want to review Recall features immediately without loading the unpacking Chrome Extension, you can click below to load 2 days of rich pre-compiled sample browser logs into IndexedDB.
          </p>
          <Button variant="outline" className="w-full" onClick={onLoadDemoData}>
            Load Sample Browsing Data
          </Button>
        </div>
      </div>

      {/* RIGHT SECTION: Extension Guide & Privacy (5 Cols) */}
      <div className="lg:col-span-5 border-l border-neutral-100 pl-8 lg:pl-16 space-y-12">
        {/* Extension Bridge Guide */}
        <div className="space-y-8">
          <div className="space-y-2">
            <span className="font-mono text-[9px] uppercase tracking-[6px] text-neutral-400 block">
              Plugin
            </span>
            <h2 className="font-mono text-[10px] uppercase tracking-[3px] text-black font-semibold">
              Extension Bridge
            </h2>
          </div>

          <div className="border border-neutral-100 p-6 bg-white space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[9px] uppercase text-black">Status</span>
              <span className={`font-mono text-[8px] uppercase tracking-[2px] px-2 py-0.5 border ${
                !extInstalled
                  ? 'border-neutral-200 bg-neutral-50 text-neutral-400'
                  : isOutdated
                  ? 'border-red-600 bg-red-50 text-red-600 font-bold'
                  : 'border-black bg-neutral-50 text-black'
              }`}>
                {!extInstalled ? 'Not Found' : isOutdated ? 'Update Required' : 'Linked'}
              </span>
            </div>

            {extInstalled && extVersion && (
              <div className="font-mono text-[8px] space-y-1">
                <div className="text-neutral-400">Bridge Build version: {extVersion}</div>
                {isOutdated && (
                  <div className="text-red-600 font-semibold tracking-wider uppercase mt-1">
                    ⚠️ Please reload the extension in chrome://extensions to update the crawler and support streaming CORS bypass.
                  </div>
                )}
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleCheckExtension}
              disabled={isCheckingExt}
            >
              {isCheckingExt && <RefreshCw size={10} className="animate-spin" />}
              Verify Link
            </Button>
          </div>

          {/* Installation Instructions */}
          <div className="space-y-4">
            <h3 className="font-mono text-[9px] uppercase tracking-[3px] text-black font-bold">
              Extension Installation Guide
            </h3>
            <ol className="text-[11px] text-neutral-500 space-y-3 list-decimal pl-4 leading-relaxed font-light">
              <li>
                Open the Chrome extension page at: <code className="bg-neutral-100 px-1 py-0.5 text-[9px] font-mono font-semibold">chrome://extensions</code>
              </li>
              <li>
                Enable <strong>Developer mode</strong> in the upper right.
              </li>
              <li>
                Click <strong>Load unpacked</strong> in the upper left.
              </li>
              <li>
                Select the folder: <code className="bg-neutral-100 px-1 py-0.5 text-[9px] font-mono font-semibold">cool-goodall/extension</code>.
              </li>
              <li>
                Reload this page to establish the local sync bridge!
              </li>
            </ol>
          </div>
        </div>

        <hr className="border-neutral-100" />

        {/* Ingestion Filters */}
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="font-mono text-[9px] uppercase tracking-[6px] text-neutral-400 block">
              Filter
            </span>
            <h2 className="font-mono text-[10px] uppercase tracking-[3px] text-black font-semibold">
              Domain Ingestion Filter
            </h2>
            <p className="text-[10px] text-neutral-400 font-light leading-relaxed">
              Define domain patterns you wish to block from local database indexing (e.g. <code>paypal.com</code>, <code>chase.com</code>, <code>localhost</code>).
            </p>
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="ENTER DOMAIN..."
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="flex-1 bg-transparent border-b border-neutral-100 py-2 font-mono text-[10px] text-black focus:outline-none focus:border-black uppercase tracking-[2px] placeholder-neutral-200"
            />
            <Button variant="outline" size="sm" onClick={handleAddDomain}>
              Add
            </Button>
          </div>

          {excludedDomains.length > 0 && (
            <div className="space-y-2 max-h-36 overflow-y-auto pr-2 scrollbar-thin">
              {excludedDomains.map((domain) => (
                <div key={domain} className="flex justify-between items-center py-2 border-b border-neutral-50 font-mono text-[10px]">
                  <span className="text-black">{domain}</span>
                  <button
                    onClick={() => handleRemoveDomain(domain)}
                    className="text-red-500 hover:underline uppercase text-[8px] tracking-widest font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-neutral-100" />

        {/* Privacy Policy */}
        <div className="space-y-6">
          <h3 className="font-mono text-[9px] uppercase tracking-[3px] text-black font-bold">
            Privacy Guarantees
          </h3>
          <ul className="text-[10px] text-neutral-500 space-y-4 leading-relaxed font-light">
            <li>
              <strong>100% Sandbox Execution</strong>: Your browsing logs remain entirely on your local machine. Database operations execute inside IndexedDB browser storage.
            </li>
            <li>
              <strong>Exclusion of Sensitive Logs</strong>: The categorization service operates locally to label pages. No financial credentials or password data are processed.
            </li>
            <li>
              <strong>External Requests</strong>: Nvidia APIs only receive text snippets/page metadata in isolation for summarizing or search-filtering, and never link details to identity.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
export default SettingsTab;
