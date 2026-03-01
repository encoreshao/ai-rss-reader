import { Menu, X, RefreshCw, FileText, Settings, Sparkles } from 'lucide-react';
import type { AIConfig } from '../services/aiService';
import type { Article } from '../types';

interface Props {
  isSidebarOpen: boolean;
  selectedFeedName: string | null;
  articles: Article[];
  loading: boolean;
  aiConfig: AIConfig;
  selectedFeed: string | null;
  onToggleSidebar: () => void;
  onRefresh: () => void;
  onExportCSV: () => void;
  onOpenSettings: () => void;
  onGenerateDigest: (type: 'daily' | 'weekly') => void;
}

export default function AppHeader({
  isSidebarOpen,
  selectedFeedName,
  articles,
  loading,
  aiConfig,
  onToggleSidebar,
  onRefresh,
  onExportCSV,
  onOpenSettings,
  onGenerateDigest,
}: Props) {
  return (
    <header className="h-[68px] border-b border-[#e5e5e5] bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors cursor-pointer text-[#737373] hover:text-[#171717]"
          title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          {isSidebarOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
        </button>
        <div>
          <h2 className="font-heading font-semibold text-[15px] tracking-tight leading-tight">
            {selectedFeedName ?? 'Latest Updates'}
          </h2>
          <p className="text-[11px] text-[#b0b0b0] mt-0.5">
            {selectedFeedName
              ? articles.length > 0 ? `${articles.length} articles` : 'Loading…'
              : 'Your personalized feed'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors text-[#b0b0b0] hover:text-[#171717] cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={onExportCSV}
          disabled={articles.length === 0}
          className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors text-[#b0b0b0] hover:text-[#171717] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="Export to CSV"
        >
          <FileText className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenSettings}
          className={`p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors cursor-pointer ${
            aiConfig.apiKey.trim() ? 'text-indigo-500 hover:text-indigo-700' : 'text-[#b0b0b0] hover:text-[#171717]'
          }`}
          title="AI Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-[#e5e5e5] mx-1" />
        <button
          onClick={() => onGenerateDigest('daily')}
          disabled={loading || articles.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#171717] text-white hover:bg-[#333] rounded-xl text-sm font-semibold transition-all shadow-md shadow-black/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Daily Digest
        </button>
      </div>
    </header>
  );
}
