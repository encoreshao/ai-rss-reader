import { Rss, LayoutGrid, Plus, Twitter, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import type { Feed } from '../types';

interface Props {
  feeds: Feed[];
  selectedFeed: string | null;
  sidebarCategories: string[];
  sidebarRssFeeds: Feed[];
  sidebarXFeeds: Feed[];
  expandedCategories: Set<string>;
  pinnedCount: number;
  isSidebarOpen: boolean;
  onSelectFeed: (url: string | null) => void;
  onToggleCategory: (key: string) => void;
  onOpenManage: (openAdd?: boolean) => void;
}

export default function Sidebar({
  feeds,
  selectedFeed,
  sidebarCategories,
  sidebarRssFeeds,
  sidebarXFeeds,
  expandedCategories,
  pinnedCount,
  isSidebarOpen,
  onSelectFeed,
  onToggleCategory,
  onOpenManage,
}: Props) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarOpen ? 300 : 0, opacity: isSidebarOpen ? 1 : 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="bg-white border-r border-[#e5e5e5] flex flex-col overflow-hidden shadow-sm z-20 shrink-0"
    >
      {/* Brand */}
      <div className="p-6 border-b border-[#e5e5e5] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#171717] rounded-xl flex items-center justify-center shadow-md shadow-black/10">
            <Rss className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading font-bold tracking-tight text-lg text-[#171717]">AI Reader</span>
        </div>
        <button
          onClick={() => onOpenManage(false)}
          title="Manage feeds"
          className="w-8 h-8 flex items-center justify-center hover:bg-[#f5f5f5] rounded-lg transition-colors text-[#737373] hover:text-[#171717] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* All Articles */}
        <button
          onClick={() => onSelectFeed(null)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            !selectedFeed
              ? 'bg-[#171717] text-white shadow-md shadow-black/10'
              : 'text-[#737373] hover:bg-[#fafafa] hover:text-[#404040]'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          All Articles
          {feeds.length > 0 && (
            <span className={`ml-auto text-[11px] font-medium ${!selectedFeed ? 'text-white/50' : 'text-[#d4d4d4]'}`}>
              {feeds.length}
            </span>
          )}
        </button>

        {/* Pinned RSS feeds — accordion by category */}
        {sidebarCategories.map(category => {
          const catFeeds = sidebarRssFeeds.filter(f => (f.category || 'General') === category);
          if (catFeeds.length === 0) return null;
          const isExpanded = expandedCategories.has(category);
          const activeFeed = catFeeds.find(f => f.xmlUrl === selectedFeed);
          return (
            <div key={category}>
              <button
                onClick={() => onToggleCategory(category)}
                className="w-full px-4 py-1.5 flex items-center justify-between hover:bg-[#fafafa] rounded-lg transition-colors cursor-pointer group"
              >
                <span className="text-[10px] font-bold text-[#b0b0b0] uppercase tracking-[0.2em] group-hover:text-[#a3a3a3] transition-colors">
                  {category}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-[#d4d4d4]">{catFeeds.length}</span>
                  <ChevronRight className={`w-3 h-3 text-[#d4d4d4] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {/* Collapsed: active feed preview */}
              {!isExpanded && activeFeed && (
                <button
                  onClick={() => onSelectFeed(activeFeed.xmlUrl)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#f5f5f5] text-[#171717] text-left cursor-pointer"
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-indigo-500" />
                  <span className="truncate">{activeFeed.name}</span>
                </button>
              )}

              {/* Expanded: all feeds */}
              {isExpanded && (
                <div className="space-y-0.5 mt-0.5">
                  {catFeeds.map(feed => (
                    <button
                      key={feed.id}
                      onClick={() => onSelectFeed(feed.xmlUrl)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
                        selectedFeed === feed.xmlUrl
                          ? 'bg-[#f5f5f5] text-[#171717]'
                          : 'text-[#737373] hover:bg-[#fafafa] hover:text-[#404040]'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedFeed === feed.xmlUrl ? 'bg-indigo-500' : 'bg-[#d4d4d4]'}`} />
                      <span className="truncate">{feed.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Pinned X / Twitter — accordion */}
        {sidebarXFeeds.length > 0 && (() => {
          const isExpanded = expandedCategories.has('__x__');
          const activeFeed = sidebarXFeeds.find(f => f.xmlUrl === selectedFeed);
          return (
            <div>
              <button
                onClick={() => onToggleCategory('__x__')}
                className="w-full px-4 py-1.5 flex items-center justify-between hover:bg-[#fafafa] rounded-lg transition-colors cursor-pointer group"
              >
                <span className="text-[10px] font-bold text-[#b0b0b0] uppercase tracking-[0.2em] group-hover:text-[#a3a3a3] transition-colors">
                  X / Twitter
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-[#d4d4d4]">{sidebarXFeeds.length}</span>
                  <ChevronRight className={`w-3 h-3 text-[#d4d4d4] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {!isExpanded && activeFeed && (
                <button
                  onClick={() => onSelectFeed(activeFeed.xmlUrl)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#f5f5f5] text-[#171717] text-left cursor-pointer"
                >
                  <Twitter className="w-3.5 h-3.5 flex-shrink-0 text-sky-500" />
                  <span className="truncate">{activeFeed.name}</span>
                </button>
              )}

              {isExpanded && (
                <div className="space-y-0.5 mt-0.5">
                  {sidebarXFeeds.map(feed => (
                    <button
                      key={feed.id}
                      onClick={() => onSelectFeed(feed.xmlUrl)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
                        selectedFeed === feed.xmlUrl
                          ? 'bg-[#f5f5f5] text-[#171717]'
                          : 'text-[#737373] hover:bg-[#fafafa] hover:text-[#404040]'
                      }`}
                    >
                      <Twitter className={`w-3.5 h-3.5 flex-shrink-0 ${selectedFeed === feed.xmlUrl ? 'text-sky-500' : 'text-[#b0b0b0]'}`} />
                      <span className="truncate">{feed.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Empty sidebar hint */}
        {sidebarRssFeeds.length === 0 && sidebarXFeeds.length === 0 && feeds.length > 0 && (
          <p className="px-4 py-2 text-xs text-[#c0c0c0] leading-relaxed">
            No feeds pinned to sidebar.{' '}
            <button
              onClick={() => onOpenManage(false)}
              className="text-indigo-400 hover:underline cursor-pointer"
            >
              Manage feeds
            </button>
            {' '}to choose what appears here.
          </p>
        )}
      </nav>

      {/* Manage Feeds footer */}
      <div className="px-4 py-3 border-t border-[#e5e5e5]">
        <button
          onClick={() => onOpenManage(false)}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#f5f5f5] hover:bg-[#ebebeb] text-[#525252] hover:text-[#171717] transition-all cursor-pointer group"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#a3a3a3] group-hover:text-[#525252] transition-colors" />
          <span className="text-xs font-semibold flex-1 text-left">Manage Feeds</span>
          <span className="text-[11px] font-medium bg-white border border-[#e5e5e5] text-[#a3a3a3] px-2 py-0.5 rounded-full shadow-sm">
            {pinnedCount}/{feeds.length}
          </span>
        </button>
      </div>
    </motion.aside>
  );
}
