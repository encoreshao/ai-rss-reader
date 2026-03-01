import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Rss, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { type AIConfig, getAIConfig, saveAIConfig, summarizeArticle, generateDigest } from './services/aiService';
import type { Feed, Article, FeedData, Toast, ToastType } from './types';
import { stripHtml } from './utils/html';

import Sidebar from './components/Sidebar';
import AppHeader from './components/AppHeader';
import ArticleCard from './components/ArticleCard';
import ArticlePanel from './components/ArticlePanel';
import DigestView from './components/DigestView';
import ManageFeedsModal from './components/ManageFeedsModal';
import AISettingsModal from './components/AISettingsModal';
import SkeletonCard from './components/SkeletonCard';
import ToastContainer from './components/ToastContainer';

export default function App() {
  // ── Core data ──────────────────────────────────────────────────────
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── AI ─────────────────────────────────────────────────────────────
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [digest, setDigest] = useState<{ type: 'daily' | 'weekly'; content: string } | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig>({ provider: 'gemini', apiKey: '' });

  // ── UI ─────────────────────────────────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Manage Feeds modal ─────────────────────────────────────────────
  const [showManageModal, setShowManageModal] = useState(false);
  const [showAddInManage, setShowAddInManage] = useState(false);
  const [manageTab, setManageTab] = useState('All');
  const [manageSearch, setManageSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [newFeed, setNewFeed] = useState({ name: '', url: '', type: 'rss' as 'rss' | 'x', category: 'General' });

  // ── Sidebar pinning — null = all feeds visible (default) ───────────
  const [sidebarFeedIds, setSidebarFeedIds] = useState<Set<number> | null>(() => {
    try {
      const stored = localStorage.getItem('ai_reader_sidebar_feeds');
      if (stored !== null) return new Set(JSON.parse(stored) as number[]);
    } catch {}
    return null;
  });

  // ── Sidebar accordion — '__x__' is the key for the X/Twitter group ─
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // ── AI Settings modal ──────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);

  // ── Derived sidebar state ──────────────────────────────────────────
  const isPinned = (id: number) => sidebarFeedIds === null || sidebarFeedIds.has(id);

  const sidebarFeeds = sidebarFeedIds === null ? feeds : feeds.filter(f => sidebarFeedIds.has(f.id));
  const sidebarRssFeeds = sidebarFeeds.filter(f => f.type === 'rss');
  const sidebarXFeeds = sidebarFeeds.filter(f => f.type === 'x');
  const pinnedCount = sidebarFeedIds === null ? feeds.length : sidebarFeedIds.size;

  const sidebarCategories = useMemo(() => {
    const visible = sidebarFeedIds === null ? feeds : feeds.filter(f => sidebarFeedIds.has(f.id));
    const cats = new Set(visible.filter(f => f.type === 'rss').map(f => f.category || 'General'));
    return Array.from(cats).sort();
  }, [feeds, sidebarFeedIds]);

  // ── Derived manage modal state ─────────────────────────────────────
  const manageTabs = useMemo(() => {
    const cats = [...new Set(feeds.filter(f => f.type === 'rss').map(f => f.category || 'General'))].sort();
    return ['All', ...cats, 'X / Twitter'];
  }, [feeds]);

  const managedFeeds = useMemo(() => feeds.filter(f => {
    const q = manageSearch.toLowerCase();
    const matchesSearch = !q || f.name.toLowerCase().includes(q) || f.xmlUrl.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (manageTab === 'All') return true;
    if (manageTab === 'X / Twitter') return f.type === 'x';
    return f.type === 'rss' && (f.category || 'General') === manageTab;
  }), [feeds, manageTab, manageSearch]);

  const selectedFeedName = selectedFeed ? feeds.find(f => f.xmlUrl === selectedFeed)?.name ?? null : null;

  // ── Initialisation ─────────────────────────────────────────────────
  useEffect(() => { setAiConfig(getAIConfig()); }, []);

  useEffect(() => {
    fetchFeeds();
    fetch('/api/settings/selected_feed')
      .then(r => r.json())
      .then(({ value }) => { if (value) setSelectedFeed(value); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedArticle(null);
    if (selectedFeed) fetchFeed(selectedFeed);
    else fetchAllFeeds();
  }, [selectedFeed, feeds]);

  // Auto-expand the category group when a feed inside it is selected
  useEffect(() => {
    if (!selectedFeed || feeds.length === 0) return;
    const feed = feeds.find(f => f.xmlUrl === selectedFeed);
    if (!feed) return;
    const key = feed.type === 'x' ? '__x__' : (feed.category || 'General');
    setExpandedCategories(prev => prev.has(key) ? prev : new Set([...prev, key]));
  }, [selectedFeed, feeds]);

  // ── Toast ───────────────────────────────────────────────────────────
  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  };

  // ── Feed selection ──────────────────────────────────────────────────
  const handleSelectFeed = (url: string | null) => {
    setSelectedFeed(url);
    fetch('/api/settings/selected_feed', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: url ?? '' }),
    }).catch(() => {});
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── Sidebar pin management ──────────────────────────────────────────
  const handleTogglePin = (id: number) => {
    setSidebarFeedIds(prev => {
      const base = prev === null ? new Set(feeds.map(f => f.id)) : new Set(prev);
      if (base.has(id)) base.delete(id); else base.add(id);
      localStorage.setItem('ai_reader_sidebar_feeds', JSON.stringify(Array.from(base)));
      return new Set(base);
    });
  };

  const handleBulkToggle = (ids: number[], allCurrentlyPinned: boolean) => {
    setSidebarFeedIds(prev => {
      const base = prev === null ? new Set(feeds.map(f => f.id)) : new Set(prev);
      if (allCurrentlyPinned) ids.forEach(id => base.delete(id));
      else ids.forEach(id => base.add(id));
      localStorage.setItem('ai_reader_sidebar_feeds', JSON.stringify(Array.from(base)));
      return new Set(base);
    });
  };

  const handleShowAllInSidebar = () => {
    setSidebarFeedIds(null);
    localStorage.removeItem('ai_reader_sidebar_feeds');
  };

  // ── Feed CRUD ───────────────────────────────────────────────────────
  const fetchFeeds = async () => {
    try {
      const data = await fetch('/api/feeds').then(r => r.json());
      setFeeds(data);
    } catch (err) {
      console.error('Error fetching feeds:', err);
    }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeed),
      });
      if (res.ok) {
        const created = await res.json().catch(() => null);
        await fetchFeeds();
        if (sidebarFeedIds !== null && created?.id) {
          setSidebarFeedIds(prev => {
            const updated = new Set(prev!);
            updated.add(created.id);
            localStorage.setItem('ai_reader_sidebar_feeds', JSON.stringify(Array.from(updated)));
            return new Set(updated);
          });
        }
        setShowAddInManage(false);
        showToast(`"${newFeed.name}" added`, 'success');
        setNewFeed({ name: '', url: '', type: 'rss', category: 'General' });
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Could not add this feed. Check the URL and try again.', 'error');
      }
    } catch {
      showToast('Something went wrong. Check your connection and try again.', 'error');
    }
  };

  const handleDeleteFeed = async (id: number) => {
    if (deletingId !== id) { setDeletingId(id); return; }
    const feed = feeds.find(f => f.id === id);
    try {
      await fetch(`/api/feeds/${id}`, { method: 'DELETE' });
      if (selectedFeed === feed?.xmlUrl) handleSelectFeed(null);
      if (sidebarFeedIds !== null) {
        setSidebarFeedIds(prev => {
          const updated = new Set(prev!);
          updated.delete(id);
          localStorage.setItem('ai_reader_sidebar_feeds', JSON.stringify(Array.from(updated)));
          return new Set(updated);
        });
      }
      await fetchFeeds();
      setDeletingId(null);
      showToast(feed?.name ? `"${feed.name}" removed` : 'Feed removed', 'success');
    } catch {
      showToast('Could not remove this feed. Please try again.', 'error');
      setDeletingId(null);
    }
  };

  // ── Article fetching ────────────────────────────────────────────────
  const fetchFeed = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rss?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || `Server error ${res.status}`);
      }
      const data: FeedData = await res.json();
      const feedType = feeds.find(f => f.xmlUrl === url)?.type || 'rss';
      setArticles(data.items.map(item => ({ ...item, source: data.title, feedType })));
    } catch (err: any) {
      setError(err.message);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFeeds = async () => {
    // Respect sidebar pin state — only load the feeds the user has chosen to see
    const enabledFeeds = (sidebarFeedIds === null ? feeds : feeds.filter(f => sidebarFeedIds.has(f.id))).slice(0, 15);
    if (enabledFeeds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        enabledFeeds.map(async feed => {
          try {
            const res = await fetch(`/api/rss?url=${encodeURIComponent(feed.xmlUrl)}`);
            if (!res.ok) return [];
            const data: FeedData = await res.json();
            return data.items.map(item => ({ ...item, source: data.title, feedType: feed.type }));
          } catch { return []; }
        })
      );
      const all = results.flat().sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setArticles(all);
      if (all.length === 0) setError('No articles found. Try refreshing or check your feeds.');
    } catch {
      setError("Couldn't load your feeds right now. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => selectedFeed ? fetchFeed(selectedFeed) : fetchAllFeeds();

  // ── AI ──────────────────────────────────────────────────────────────
  const handleSummarize = async (article: Article) => {
    if (!aiConfig.apiKey.trim()) {
      showToast('Configure your AI provider in Settings to use AI features.', 'warning');
      setShowSettings(true);
      return;
    }
    setSummarizing(article.link);
    try {
      const summary = await summarizeArticle(aiConfig, article.title, article.content || article.contentSnippet);
      const updated = { ...article, summary: stripHtml(summary) };
      setArticles(prev => prev.map(a => a.link === article.link ? updated : a));
      if (selectedArticle?.link === article.link) setSelectedArticle(updated);
    } catch {
      showToast("Couldn't generate a summary right now. Please try again.", 'error');
    } finally {
      setSummarizing(null);
    }
  };

  const handleGenerateDigest = async (type: 'daily' | 'weekly') => {
    if (articles.length === 0) return;
    if (!aiConfig.apiKey.trim()) {
      showToast('Configure your AI provider in Settings to use AI features.', 'warning');
      setShowSettings(true);
      return;
    }
    setLoading(true);
    setSelectedArticle(null);
    try {
      const contextName = selectedFeedName ?? 'All Feeds';
      const content = await generateDigest(aiConfig, type, articles.slice(0, 20).map(a => ({ title: a.title, source: a.source })));
      setDigest({ type, content: `### ${contextName} — ${type === 'daily' ? 'Daily' : 'Weekly'} Digest\n\n${content}` });
    } catch {
      showToast("Couldn't generate the digest right now. Please try again.", 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── AI Settings ─────────────────────────────────────────────────────
  const handleSaveSettings = () => {
    saveAIConfig(aiConfig);
    setShowSettings(false);
    showToast(`${aiConfig.provider.charAt(0).toUpperCase() + aiConfig.provider.slice(1)} configured.`, 'success');
  };

  // ── CSV Export ──────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (articles.length === 0) return;
    const rows = articles.slice(0, 20).map(a => [
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.source.replace(/"/g, '""')}"`,
      `"${new Date(a.pubDate).toLocaleDateString()}"`,
      `"${a.link}"`,
      `"${(a.summary || a.contentSnippet || '').replace(/"/g, '""').replace(/\n/g, ' ').substring(0, 300)}"`,
    ]);
    const csv = [['Title', 'Source', 'Date', 'Link', 'Summary'].join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ai_reader_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export ready — check your downloads.', 'success');
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#fafafa] text-[#171717] font-sans overflow-hidden">

      <Sidebar
        feeds={feeds}
        selectedFeed={selectedFeed}
        sidebarCategories={sidebarCategories}
        sidebarRssFeeds={sidebarRssFeeds}
        sidebarXFeeds={sidebarXFeeds}
        expandedCategories={expandedCategories}
        pinnedCount={pinnedCount}
        isSidebarOpen={isSidebarOpen}
        onSelectFeed={handleSelectFeed}
        onToggleCategory={toggleCategory}
        onOpenManage={(openAdd = false) => { setShowManageModal(true); setShowAddInManage(openAdd); }}
      />

      {/* ── Main ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative">

        <AppHeader
          isSidebarOpen={isSidebarOpen}
          selectedFeedName={selectedFeedName}
          articles={articles}
          loading={loading}
          aiConfig={aiConfig}
          selectedFeed={selectedFeed}
          onToggleSidebar={() => setIsSidebarOpen(v => !v)}
          onRefresh={handleRefresh}
          onExportCSV={handleExportCSV}
          onOpenSettings={() => { setAiConfig(getAIConfig()); setShowSettings(true); }}
          onGenerateDigest={handleGenerateDigest}
        />

        {/* Content area */}
        <div className={`flex-1 overflow-y-auto bg-[#fafafa] transition-[padding] duration-300 ${selectedArticle ? 'pr-[46%]' : ''}`}>
          <div className="max-w-3xl mx-auto px-6 py-8 md:px-10 md:py-10">

            {/* Error banner */}
            {error && !loading && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
              >
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-900">Couldn't load this feed</p>
                  <p className="text-xs text-red-700/60 mt-0.5 wrap-break-word">{error}</p>
                </div>
                <button
                  onClick={handleRefresh}
                  className="shrink-0 px-3 py-1.5 bg-white hover:bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-700 transition-colors cursor-pointer"
                >
                  Try again
                </button>
              </motion.div>
            )}

            {/* Loading skeletons */}
            {loading ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-24 bg-[#e8e8e8] rounded animate-pulse" />
                  <div className="h-3.5 w-16 bg-[#e8e8e8] rounded animate-pulse" />
                </div>
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>

            ) : digest ? (
              <DigestView
                digest={digest}
                aiConfig={aiConfig}
                articleCount={articles.length}
                onClose={() => setDigest(null)}
                onExportCSV={handleExportCSV}
              />

            ) : articles.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-28 gap-5 text-center">
                <div className="w-16 h-16 bg-[#f5f5f5] rounded-2xl flex items-center justify-center">
                  <Rss className="w-7 h-7 text-[#d4d4d4]" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-[#171717] text-lg">
                    {feeds.length === 0 ? 'No subscriptions yet' : 'No articles to show'}
                  </p>
                  <p className="text-sm text-[#a3a3a3] mt-1.5 max-w-xs leading-relaxed">
                    {feeds.length === 0
                      ? 'Add your first RSS feed or X profile to start reading.'
                      : selectedFeed
                        ? 'This feed appears to be empty or temporarily unavailable.'
                        : 'Select a feed from the sidebar, or try refreshing.'}
                  </p>
                </div>
                {feeds.length === 0 && (
                  <button
                    onClick={() => { setShowManageModal(true); setShowAddInManage(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#171717] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors cursor-pointer shadow-md shadow-black/10"
                  >
                    <Plus className="w-4 h-4" />
                    Add your first feed
                  </button>
                )}
              </div>

            ) : (
              /* Article list */
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#b0b0b0]">Latest stories</h3>
                  <span className="text-xs text-[#d4d4d4]">
                    {articles.length} {articles.length === 1 ? 'article' : 'articles'}
                  </span>
                </div>
                <AnimatePresence mode="popLayout">
                  {articles.map((article, idx) => (
                    <ArticleCard
                      key={`${article.link}-${idx}`}
                      article={article}
                      idx={idx}
                      isSelected={selectedArticle?.link === article.link}
                      summarizing={summarizing}
                      onSelect={setSelectedArticle}
                      onSummarize={handleSummarize}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <ArticlePanel
          article={selectedArticle}
          summarizing={summarizing}
          onSummarize={handleSummarize}
          onClose={() => setSelectedArticle(null)}
        />

      </main>

      <ManageFeedsModal
        open={showManageModal}
        feeds={feeds}
        manageTabs={manageTabs}
        managedFeeds={managedFeeds}
        pinnedCount={pinnedCount}
        sidebarFeedIds={sidebarFeedIds}
        newFeed={newFeed}
        deletingId={deletingId}
        showAddInManage={showAddInManage}
        manageTab={manageTab}
        manageSearch={manageSearch}
        isPinned={isPinned}
        onClose={() => { setShowManageModal(false); setDeletingId(null); }}
        onTogglePin={handleTogglePin}
        onDelete={handleDeleteFeed}
        onAddFeed={handleAddFeed}
        onShowAll={handleShowAllInSidebar}
        onBulkToggle={handleBulkToggle}
        setNewFeed={setNewFeed}
        setShowAddInManage={setShowAddInManage}
        setManageTab={setManageTab}
        setManageSearch={setManageSearch}
        setDeletingId={setDeletingId}
      />

      <AISettingsModal
        open={showSettings}
        aiConfig={aiConfig}
        onChange={setAiConfig}
        onSave={handleSaveSettings}
        onClose={() => setShowSettings(false)}
      />

      <ToastContainer toasts={toasts} />
    </div>
  );
}
