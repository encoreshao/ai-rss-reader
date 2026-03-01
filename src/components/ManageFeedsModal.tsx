import React from 'react';
import { X, Plus, Search, Twitter, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Feed } from '../types';

const CATEGORIES = ['General', 'Engineering', 'Tech', 'Security', 'Culture', 'Science', 'Personal', 'AI', 'Hardware'];

interface NewFeedState {
  name: string;
  url: string;
  type: 'rss' | 'x';
  category: string;
}

interface Props {
  open: boolean;
  feeds: Feed[];
  manageTabs: string[];
  managedFeeds: Feed[];
  pinnedCount: number;
  sidebarFeedIds: Set<number> | null;
  newFeed: NewFeedState;
  deletingId: number | null;
  showAddInManage: boolean;
  manageTab: string;
  manageSearch: string;
  isPinned: (id: number) => boolean;
  onClose: () => void;
  onTogglePin: (id: number) => void;
  onDelete: (id: number) => void;
  onAddFeed: (e: React.FormEvent) => void;
  onShowAll: () => void;
  onBulkToggle: (ids: number[], select: boolean) => void;
  setNewFeed: React.Dispatch<React.SetStateAction<NewFeedState>>;
  setShowAddInManage: React.Dispatch<React.SetStateAction<boolean>>;
  setManageTab: (tab: string) => void;
  setManageSearch: (q: string) => void;
  setDeletingId: (id: number | null) => void;
}

export default function ManageFeedsModal({
  open,
  feeds,
  manageTabs,
  managedFeeds,
  pinnedCount,
  sidebarFeedIds,
  newFeed,
  deletingId,
  showAddInManage,
  manageTab,
  manageSearch,
  isPinned,
  onClose,
  onTogglePin,
  onDelete,
  onAddFeed,
  onShowAll,
  onBulkToggle,
  setNewFeed,
  setShowAddInManage,
  setManageTab,
  setManageSearch,
  setDeletingId,
}: Props) {
  const allPinned = managedFeeds.length > 0 && managedFeeds.every(f => isPinned(f.id));

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ ease: 'easeOut', duration: 0.18 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl shadow-black/15 flex flex-col overflow-hidden"
            style={{ maxHeight: '85vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#e5e5e5] shrink-0">
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-tight">Manage Feeds</h2>
                <p className="text-xs text-[#a3a3a3] mt-0.5">
                  {feeds.length} subscriptions · {pinnedCount} shown in sidebar
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddInManage(v => !v)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    showAddInManage ? 'bg-[#f5f5f5] text-[#737373]' : 'bg-[#171717] text-white hover:bg-[#333]'
                  }`}
                >
                  <Plus className={`w-4 h-4 transition-transform ${showAddInManage ? 'rotate-45' : ''}`} />
                  {showAddInManage ? 'Cancel' : 'Add Feed'}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors cursor-pointer text-[#737373] hover:text-[#171717]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Add Feed form (collapsible) */}
            <AnimatePresence>
              {showAddInManage && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="overflow-hidden border-b border-[#e5e5e5] shrink-0"
                >
                  <form onSubmit={onAddFeed} className="px-6 py-5 space-y-4">
                    <div className="flex p-1 bg-[#f5f5f5] rounded-2xl gap-1">
                      <button type="button" onClick={() => setNewFeed(p => ({ ...p, type: 'rss' }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${newFeed.type === 'rss' ? 'bg-white text-[#171717] shadow-sm' : 'text-[#a3a3a3]'}`}>
                        RSS Feed
                      </button>
                      <button type="button" onClick={() => setNewFeed(p => ({ ...p, type: 'x' }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${newFeed.type === 'x' ? 'bg-white text-sky-500 shadow-sm' : 'text-[#a3a3a3]'}`}>
                        X / Twitter
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#525252]">Category</label>
                        <select
                          className="w-full px-3 py-2.5 bg-[#f5f5f5] rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer"
                          value={newFeed.category}
                          onChange={e => setNewFeed(p => ({ ...p, category: e.target.value }))}
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#525252]">
                          {newFeed.type === 'rss' ? 'Feed name' : 'Display name'}
                        </label>
                        <input type="text" required
                          placeholder={newFeed.type === 'rss' ? 'e.g. Simon Willison' : 'e.g. Paul Graham'}
                          className="w-full px-3 py-2.5 bg-[#f5f5f5] rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-[#c0c0c0]"
                          value={newFeed.name}
                          onChange={e => setNewFeed(p => ({ ...p, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#525252]">
                          {newFeed.type === 'rss' ? 'Feed URL' : 'Profile URL'}
                        </label>
                        <input type="url" required
                          placeholder={newFeed.type === 'rss' ? 'https://example.com/feed.xml' : 'https://x.com/username'}
                          className="w-full px-3 py-2.5 bg-[#f5f5f5] rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-[#c0c0c0]"
                          value={newFeed.url}
                          onChange={e => setNewFeed(p => ({ ...p, url: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-6 py-2.5 bg-[#171717] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors cursor-pointer">
                        Subscribe
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Category tabs */}
            <div className="flex gap-1.5 px-5 pt-4 pb-3 overflow-x-auto shrink-0 border-b border-[#f5f5f5]">
              {manageTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setManageTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    manageTab === tab ? 'bg-[#171717] text-white' : 'text-[#737373] hover:bg-[#f5f5f5] hover:text-[#404040]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search + Bulk toggle */}
            <div className="px-5 py-3 border-b border-[#f5f5f5] shrink-0 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#b0b0b0]" />
                <input
                  type="text"
                  placeholder="Search by name or URL…"
                  className="w-full pl-8 pr-3 py-2 bg-[#f5f5f5] rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all placeholder:text-[#b0b0b0]"
                  value={manageSearch}
                  onChange={e => setManageSearch(e.target.value)}
                />
              </div>
              {managedFeeds.length > 0 && (
                <button
                  onClick={() => onBulkToggle(managedFeeds.map(f => f.id), allPinned)}
                  className="shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap border-[#e5e5e5] text-[#525252] hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50"
                >
                  {allPinned ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            {/* Feed list */}
            <div className="flex-1 overflow-y-auto">
              {managedFeeds.length === 0 ? (
                <div className="py-14 text-center text-sm text-[#b0b0b0]">No feeds match your search.</div>
              ) : (
                managedFeeds.map(feed => (
                  <div
                    key={feed.id}
                    className="flex items-center gap-3 px-5 py-3.5 border-b border-[#f9f9f9] hover:bg-[#fafafa] group transition-colors"
                  >
                    {/* Sidebar pin toggle */}
                    <button
                      onClick={() => onTogglePin(feed.id)}
                      title={isPinned(feed.id) ? 'Remove from sidebar' : 'Show in sidebar'}
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                        isPinned(feed.id)
                          ? 'bg-indigo-500 border-indigo-500'
                          : 'border-[#d4d4d4] hover:border-indigo-400'
                      }`}
                    >
                      {isPinned(feed.id) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </button>

                    {/* Feed info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {feed.type === 'x' && <Twitter className="w-3 h-3 text-sky-400 shrink-0" />}
                        <span className="text-sm font-medium text-[#171717] truncate">{feed.name}</span>
                        <span className="text-[10px] font-medium text-[#a3a3a3] bg-[#f5f5f5] px-2 py-0.5 rounded-full shrink-0 ml-auto">
                          {feed.category || 'General'}
                        </span>
                      </div>
                      <p className="text-xs text-[#c0c0c0] truncate mt-0.5">{feed.xmlUrl}</p>
                    </div>

                    {/* Delete */}
                    {deletingId === feed.id ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onDelete(feed.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#737373] hover:bg-[#f5f5f5] rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(feed.id)}
                        className="p-1.5 text-[#d4d4d4] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-pointer"
                        title="Remove feed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-[#e5e5e5] flex items-center justify-between shrink-0 bg-[#fafafa]">
              <span className="text-xs text-[#a3a3a3]">
                <span className="font-semibold text-[#525252]">{pinnedCount}</span> of {feeds.length} feeds shown in sidebar
              </span>
              {sidebarFeedIds !== null && (
                <button
                  onClick={onShowAll}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-medium cursor-pointer hover:underline"
                >
                  Show all in sidebar
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
