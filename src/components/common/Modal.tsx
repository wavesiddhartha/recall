import { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  // Prevent scrolling behind the drawer
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-[2px] transition-opacity duration-500 ease-out"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-[0_0_60px_rgba(0,0,0,0.05)] animate-fade-in border-l border-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 p-8">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-black font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-black hover:text-neutral-400 transition-colors focus:outline-none cursor-pointer"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  );
}
