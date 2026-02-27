import React, { useState, useEffect, useMemo } from 'react';
import {
  Rss,
  Search,
  LayoutGrid,
  Sparkles,
  ExternalLink,
  Loader2,
  RefreshCw,
  Menu,
  X,
  Plus,
  Trash2,
  FileText,
  Twitter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Settings,
  KeyRound,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import {
  type AIConfig,
  type AIProvider,
  getAIConfig,
  saveAIConfig,
  summarizeArticle,
  generateDigest,
} from './services/aiService';

interface Feed {
  id: number;
  name: string;
  xmlUrl: string;
  htmlUrl?: string;
  type: 'rss' | 'x';
  category?: string;
}

interface Article {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  source: string;
  summary?: string;
  feedType?: 'rss' | 'x';
}

interface FeedData {
  title: string;
  items: Article[];
}

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const TOAST_ICON: Record<ToastType, React.FC<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_ICON_COLOR: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-indigo-400',
};

function SkeletonCard() {
  return (
    <div className="p-7 rounded-3xl border border-[#e5e5e5] bg-white animate-pulse">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-6 w-24 bg-[#f0f0f0] rounded-lg" />
          <div className="h-4 w-14 bg-[#f0f0f0] rounded" />
        </div>
        <div className="space-y-2.5">
          <div className="h-6 w-3/4 bg-[#f0f0f0] rounded-lg" />
          <div className="h-6 w-1/2 bg-[#f0f0f0] rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-[#f0f0f0] rounded" />
          <div className="h-4 w-5/6 bg-[#f0f0f0] rounded" />
          <div className="h-4 w-4/6 bg-[#f0f0f0] rounded" />
        </div>
        <div className="flex gap-3 pt-1">
          <div className="h-9 w-28 bg-[#f0f0f0] rounded-xl" />
          <div className="h-9 w-28 bg-[#f0f0f0] rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [digest, setDigest] = useState<{ type: 'daily' | 'weekly'; content: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeed, setNewFeed] = useState({ name: '', url: '', type: 'rss' as 'rss' | 'x', category: 'General' });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>({ provider: 'gemini', apiKey: '' });

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  };

  const categories = useMemo(() => {
    const cats = new Set(feeds.map(f => f.category || 'General'));
    return Array.from(cats).sort();
  }, [feeds]);

  useEffect(() => {
    setAiConfig(getAIConfig());
  }, []);

  useEffect(() => {
    fetchFeeds();
  }, []);

  useEffect(() => {
    setSelectedArticle(null);
    if (selectedFeed) {
      fetchFeed(selectedFeed);
    } else {
      fetchAllFeeds();
    }
  }, [selectedFeed, feeds]);

  const fetchFeeds = async () => {
    try {
      const response = await fetch('/api/feeds');
      const data = await response.json();
      setFeeds(data);
    } catch (err) {
      console.error('Error fetching feeds:', err);
    }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeed),
      });
      if (response.ok) {
        await fetchFeeds();
        setShowAddModal(false);
        showToast(`"${newFeed.name}" added to your subscriptions`, 'success');
        setNewFeed({ name: '', url: '', type: 'rss', category: 'General' });
      } else {
        const data = await response.json().catch(() => ({}));
        showToast(data.error || 'Could not add this feed. Check the URL and try again.', 'error');
      }
    } catch (err) {
      console.error('Error adding feed:', err);
      showToast('Something went wrong. Check your connection and try again.', 'error');
    }
  };

  const handleDeleteFeed = async (id: number) => {
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }
    const feed = feeds.find(f => f.id === id);
    try {
      await fetch(`/api/feeds/${id}`, { method: 'DELETE' });
      if (selectedFeed === feed?.xmlUrl) setSelectedFeed(null);
      await fetchFeeds();
      setDeletingId(null);
      showToast(feed?.name ? `"${feed.name}" removed` : 'Feed removed', 'success');
    } catch (err) {
      console.error('Error deleting feed:', err);
      showToast('Could not remove this feed. Please try again.', 'error');
      setDeletingId(null);
    }
  };

  const fetchFeed = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rss?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || `Server error ${response.status}`);
      }
      const data: FeedData = await response.json();
      const feedType = feeds.find(f => f.xmlUrl === url)?.type || 'rss';
      setArticles(data.items.map(item => ({ ...item, source: data.title, feedType })));
    } catch (err: any) {
      console.error('Error fetching feed:', err);
      setError(err.message);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFeeds = async () => {
    if (feeds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const topFeeds = feeds.slice(0, 10);
      const results = await Promise.all(
        topFeeds.map(async feed => {
          try {
            const response = await fetch(`/api/rss?url=${encodeURIComponent(feed.xmlUrl)}`);
            if (!response.ok) return [];
            const data: FeedData = await response.json();
            return data.items.map(item => ({ ...item, source: data.title, feedType: feed.type }));
          } catch {
            return [];
          }
        })
      );
      const all = results.flat().sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
      setArticles(all);
      if (all.length === 0) {
        setError('No articles found across your subscriptions. Try refreshing or check your feeds.');
      }
    } catch (err: any) {
      console.error('Error fetching all feeds:', err);
      setError("Couldn't load your feeds right now. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const sanitizeHtml = (html: string) =>
    html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, 'void:');

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
      const contextName = selectedFeed ? feeds.find(f => f.xmlUrl === selectedFeed)?.name : 'All Feeds';
      const digestArticles = articles.slice(0, 20).map(a => ({ title: a.title, source: a.source }));
      const content = await generateDigest(aiConfig, type, digestArticles);
      setDigest({ type, content: `### ${contextName} — ${type === 'daily' ? 'Daily' : 'Weekly'} Digest\n\n${content}` });
    } catch {
      showToast("Couldn't generate the digest right now. Please try again.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = () => {
    saveAIConfig(aiConfig);
    setShowSettings(false);
    showToast(`${aiConfig.provider.charAt(0).toUpperCase() + aiConfig.provider.slice(1)} configured.`, 'success');
  };

  const handleOpenSettings = () => {
    setAiConfig(getAIConfig());
    setShowSettings(true);
  };

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

  const filteredFeeds = feeds.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const rssFeeds = filteredFeeds.filter(f => f.type === 'rss');
  const xFeeds = filteredFeeds.filter(f => f.type === 'x');
  const selectedFeedName = selectedFeed ? feeds.find(f => f.xmlUrl === selectedFeed)?.name : null;

  const FeedRow = ({ feed, isX = false }: { feed: Feed; isX?: boolean }) => (
    <div className="group flex items-center gap-1">
      <button
        onClick={() => { setSelectedFeed(feed.xmlUrl); setDeletingId(null); }}
        className={`flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
          selectedFeed === feed.xmlUrl
            ? 'bg-[#f5f5f5] text-[#171717]'
            : 'text-[#737373] hover:bg-[#fafafa] hover:text-[#404040]'
        }`}
      >
        {isX
          ? <Twitter className={`w-3.5 h-3.5 flex-shrink-0 ${selectedFeed === feed.xmlUrl ? 'text-sky-500' : 'text-[#b0b0b0]'}`} />
          : <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${selectedFeed === feed.xmlUrl ? 'bg-indigo-500' : 'bg-[#d4d4d4] group-hover:bg-[#a3a3a3]'}`} />
        }
        <span className="truncate">{feed.name}</span>
      </button>

      {deletingId === feed.id ? (
        <div className="flex items-center gap-1 pr-1 shrink-0">
          <button
            onClick={() => handleDeleteFeed(feed.id)}
            className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
          >
            Remove
          </button>
          <button
            onClick={() => setDeletingId(null)}
            className="px-2.5 py-1.5 text-[11px] font-semibold text-[#737373] hover:bg-[#f5f5f5] rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => handleDeleteFeed(feed.id)}
          className="opacity-0 group-hover:opacity-100 p-2 text-[#c0c0c0] hover:text-red-500 hover:bg-red-50 transition-all rounded-lg cursor-pointer"
          title="Remove feed"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-[#fafafa] text-[#171717] font-sans overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────── */}
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
            onClick={() => setShowAddModal(true)}
            title="Add a new feed"
            className="w-8 h-8 flex items-center justify-center hover:bg-[#f5f5f5] rounded-lg transition-colors text-[#737373] hover:text-[#171717] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#b0b0b0]" />
            <input
              type="text"
              placeholder="Search feeds…"
              className="w-full pl-8 pr-3 py-2 bg-[#f5f5f5] rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all placeholder:text-[#b0b0b0]"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
          {/* All Articles */}
          <div>
            <button
              onClick={() => { setSelectedFeed(null); setDeletingId(null); }}
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
          </div>

          {/* RSS Categories */}
          {categories.map(category => {
            const catFeeds = rssFeeds.filter(f => (f.category || 'General') === category);
            if (catFeeds.length === 0) return null;
            return (
              <div key={category} className="space-y-0.5">
                <div className="px-4 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#b0b0b0] uppercase tracking-[0.2em]">{category}</span>
                  <span className="text-[10px] font-medium text-[#d4d4d4]">{catFeeds.length}</span>
                </div>
                {catFeeds.map(feed => <FeedRow key={feed.id} feed={feed} />)}
              </div>
            );
          })}

          {/* X Feeds */}
          {xFeeds.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-4 py-1 flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#b0b0b0] uppercase tracking-[0.2em]">X / Twitter</span>
                <span className="text-[10px] font-medium text-[#d4d4d4]">{xFeeds.length}</span>
              </div>
              {xFeeds.map(feed => <FeedRow key={feed.id} feed={feed} isX />)}
            </div>
          )}
        </nav>
      </motion.aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative">

        {/* Header */}
        <header className="h-[68px] border-b border-[#e5e5e5] bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
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
              onClick={() => selectedFeed ? fetchFeed(selectedFeed) : fetchAllFeeds()}
              className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors text-[#b0b0b0] hover:text-[#171717] cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportCSV}
              disabled={articles.length === 0}
              className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors text-[#b0b0b0] hover:text-[#171717] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Export to CSV"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={handleOpenSettings}
              className={`p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors cursor-pointer ${aiConfig.apiKey.trim() ? 'text-indigo-500 hover:text-indigo-700' : 'text-[#b0b0b0] hover:text-[#171717]'}`}
              title="AI Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-[#e5e5e5] mx-1" />
            <button
              onClick={() => handleGenerateDigest('daily')}
              disabled={loading || articles.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#171717] text-white hover:bg-[#333] rounded-xl text-sm font-semibold transition-all shadow-md shadow-black/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Daily Digest
            </button>
          </div>
        </header>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto bg-[#fafafa] transition-[padding] duration-300 ${selectedArticle ? 'pr-[46%]' : ''}`}>
          <div className="max-w-3xl mx-auto px-6 py-8 md:px-10 md:py-10">

            {/* Error Banner */}
            {error && !loading && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
              >
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-900">Couldn't load this feed</p>
                  <p className="text-xs text-red-700/60 mt-0.5 break-words">{error}</p>
                </div>
                <button
                  onClick={() => selectedFeed ? fetchFeed(selectedFeed) : fetchAllFeeds()}
                  className="shrink-0 px-3 py-1.5 bg-white hover:bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-700 transition-colors cursor-pointer"
                >
                  Try again
                </button>
              </motion.div>
            )}

            {/* ── Loading: Skeleton ── */}
            {loading ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-24 bg-[#e8e8e8] rounded animate-pulse" />
                  <div className="h-3.5 w-16 bg-[#e8e8e8] rounded animate-pulse" />
                </div>
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>

            ) : digest ? (
              /* ── Digest View ── */
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[40px] border border-[#e5e5e5] shadow-2xl shadow-black/5 overflow-hidden"
              >
                {/* Hero */}
                <div className="relative h-[440px] bg-[#050505] flex flex-col justify-center items-center text-center p-12 overflow-hidden">
                  <div className="absolute inset-0 opacity-35">
                    <img
                      src="https://picsum.photos/seed/editorial/1920/1080?blur=10"
                      className="w-full h-full object-cover"
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505]" />
                  </div>
                  <div className="relative z-20 max-w-2xl space-y-6">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3">
                      <span className="px-3 py-1 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.25em] rounded-full">
                        AI Intelligence Report
                      </span>
                      <span className="text-white/40 text-xs font-medium uppercase tracking-[0.35em]">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </span>
                    </motion.div>
                    <h1 className="font-heading text-[80px] md:text-[100px] font-bold text-white tracking-tighter leading-[0.85] uppercase italic">
                      The<br />Digest
                    </h1>
                    <p className="text-white/55 text-base font-medium max-w-sm mx-auto leading-relaxed">
                      A synthesized overview of the most important developments across your subscriptions.
                    </p>
                  </div>
                  <button
                    onClick={() => setDigest(null)}
                    className="absolute top-10 right-10 w-11 h-11 bg-white/8 hover:bg-white/15 backdrop-blur-xl rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all border border-white/10 cursor-pointer"
                    title="Close digest"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-10 py-14 md:px-20 md:py-20 bg-white">
                  <div className="max-w-3xl mx-auto">
                    <div className="prose prose-neutral prose-lg max-w-none
                      prose-headings:font-heading prose-headings:font-bold prose-headings:tracking-tight
                      prose-p:text-[#404040] prose-p:leading-[1.8]
                      prose-strong:text-indigo-600 prose-strong:font-bold
                      prose-li:text-[#525252] prose-li:leading-relaxed
                      prose-hr:border-[#e5e5e5]"
                    >
                      <Markdown>{digest.content}</Markdown>
                    </div>

                    <div className="mt-16 pt-10 border-t border-[#e5e5e5] flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#171717]">Generated by {aiConfig.provider.charAt(0).toUpperCase() + aiConfig.provider.slice(1)} AI</p>
                          <p className="text-xs text-[#a3a3a3] mt-0.5">Based on {articles.length} recent articles</p>
                        </div>
                      </div>
                      <button
                        onClick={handleExportCSV}
                        className="px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
                      >
                        Export data
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

            ) : articles.length === 0 ? (
              /* ── Empty State ── */
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
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#171717] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors cursor-pointer shadow-md shadow-black/10"
                  >
                    <Plus className="w-4 h-4" />
                    Add your first feed
                  </button>
                )}
              </div>

            ) : (
              /* ── Article List ── */
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#b0b0b0]">
                    Latest stories
                  </h3>
                  <span className="text-xs text-[#d4d4d4]">
                    {articles.length} {articles.length === 1 ? 'article' : 'articles'}
                  </span>
                </div>

                <AnimatePresence mode="popLayout">
                  {articles.map((article, idx) => {
                    const isX = article.feedType === 'x';
                    const isSelected = selectedArticle?.link === article.link;
                    return (
                      <motion.article
                        key={`${article.link}-${idx}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.025, 0.3), ease: 'easeOut' }}
                        onClick={() => setSelectedArticle(article)}
                        className={`group p-6 rounded-3xl border transition-all duration-250 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/40 border-indigo-300 shadow-md shadow-indigo-500/5'
                            : isX
                              ? 'bg-white border-sky-100 hover:border-sky-300 hover:shadow-md hover:shadow-sky-500/5'
                              : 'bg-white border-[#e8e8e8] hover:border-[#c8c8c8] hover:shadow-md hover:shadow-black/5'
                        }`}
                      >
                        {/* Source + Date */}
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                              isX
                                ? 'bg-sky-50 text-sky-600'
                                : 'bg-[#f5f5f5] text-[#525252] group-hover:bg-indigo-50 group-hover:text-indigo-600'
                            }`}>
                              {isX && <Twitter className="w-3 h-3" />}
                              <span className="truncate max-w-[180px]">{article.source}</span>
                            </span>
                            <span className="text-xs text-[#d4d4d4] tabular-nums whitespace-nowrap">
                              {new Date(article.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {isX && <Twitter className="w-4 h-4 text-sky-400 fill-current shrink-0" />}
                        </div>

                        {/* Title */}
                        {isX ? (
                          <p className="text-base leading-relaxed text-[#171717] whitespace-pre-wrap mb-4">
                            {article.title}
                          </p>
                        ) : (
                          <h3 className="font-heading text-xl font-semibold leading-snug tracking-tight group-hover:text-indigo-600 transition-colors mb-3">
                            {article.title}
                          </h3>
                        )}

                        {/* Snippet */}
                        {!isX && (
                          <p className="text-sm text-[#737373] leading-relaxed line-clamp-2 mb-4">
                            {stripHtml(article.contentSnippet || article.content || '').substring(0, 220) || 'No description available.'}
                          </p>
                        )}

                        {/* AI Summary */}
                        {article.summary && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded-2xl border mb-4 ${
                              isX ? 'bg-sky-50/50 border-sky-100' : 'bg-indigo-50/50 border-indigo-100/80'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className={`w-3 h-3 ${isX ? 'text-sky-500' : 'text-indigo-500'}`} />
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${isX ? 'text-sky-500' : 'text-indigo-500'}`}>
                                AI Summary
                              </span>
                            </div>
                            <p className={`text-sm leading-relaxed ${isX ? 'text-sky-900' : 'text-indigo-900'}`}>
                              {stripHtml(article.summary)}
                            </p>
                          </motion.div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); handleSummarize(article); }}
                            disabled={summarizing === article.link}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                              isX
                                ? 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                            }`}
                          >
                            {summarizing === article.link
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Sparkles className="w-3.5 h-3.5" />
                            }
                            {article.summary ? 'Regenerate' : 'Summarize'}
                          </button>
                          <a
                            href={article.link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#f5f5f5] text-[#525252] hover:bg-[#ebebeb] rounded-xl text-sm font-medium transition-colors cursor-pointer"
                          >
                            {isX ? 'View post' : 'Read article'}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ── Article Panel ──────────────────────────────────── */}
        <AnimatePresence>
          {selectedArticle && (
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute right-0 top-[68px] w-[46%] h-[calc(100%-68px)] border-l border-[#e5e5e5] bg-white flex flex-col shadow-2xl shadow-black/8 z-10"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#e5e5e5] bg-white/90 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 truncate">{selectedArticle.source}</span>
                  <span className="text-[10px] text-[#d4d4d4]">·</span>
                  <span className="text-[10px] text-[#a3a3a3] tabular-nums whitespace-nowrap">
                    {new Date(selectedArticle.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => handleSummarize(selectedArticle)}
                    disabled={summarizing === selectedArticle.link}
                    title="AI Summary"
                    className="p-2 hover:bg-indigo-50 text-[#b0b0b0] hover:text-indigo-600 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {summarizing === selectedArticle.link
                      ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      : <Sparkles className="w-4 h-4" />
                    }
                  </button>
                  <a
                    href={selectedArticle.link}
                    target="_blank"
                    rel="noreferrer"
                    title="Open in browser"
                    className="p-2 hover:bg-[#f5f5f5] text-[#b0b0b0] hover:text-[#171717] rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="p-2 hover:bg-[#f5f5f5] text-[#b0b0b0] hover:text-[#171717] rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* AI Summary banner */}
              <AnimatePresence>
                {selectedArticle.summary && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-b border-indigo-100 bg-indigo-50/60 px-5 py-3.5 shrink-0"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-500">AI Summary</span>
                    </div>
                    <p className="text-sm leading-relaxed text-indigo-900 italic">{selectedArticle.summary}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <h1 className="font-heading text-lg font-semibold leading-snug tracking-tight text-[#171717] mb-5">
                  {selectedArticle.title}
                </h1>

                {selectedArticle.content && selectedArticle.content.trim().length > 80 ? (
                  <div
                    className="prose prose-sm prose-neutral max-w-none prose-img:rounded-xl prose-img:max-w-full prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline prose-headings:font-semibold prose-headings:tracking-tight"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedArticle.content) }}
                  />
                ) : selectedArticle.contentSnippet ? (
                  <p className="text-sm text-[#404040] leading-relaxed">{selectedArticle.contentSnippet}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-[#a3a3a3]">No content in RSS feed — loading from source:</p>
                    <iframe
                      src={selectedArticle.link}
                      title={selectedArticle.title}
                      className="w-full border border-[#e5e5e5] rounded-2xl"
                      style={{ height: '70vh' }}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* ── Add Feed Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ ease: 'easeOut', duration: 0.18 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/15 overflow-hidden"
            >
              <div className="p-7 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-xl font-semibold tracking-tight">Subscribe to a feed</h3>
                    <p className="text-sm text-[#a3a3a3] mt-1">Add an RSS feed or X profile to follow</p>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors cursor-pointer text-[#737373] hover:text-[#171717] mt-0.5"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <form onSubmit={handleAddFeed} className="space-y-4">
                  {/* Type toggle */}
                  <div className="flex p-1 bg-[#f5f5f5] rounded-2xl gap-1">
                    <button
                      type="button"
                      onClick={() => setNewFeed(prev => ({ ...prev, type: 'rss' }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${newFeed.type === 'rss' ? 'bg-white text-[#171717] shadow-sm' : 'text-[#a3a3a3] hover:text-[#737373]'}`}
                    >
                      RSS Feed
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewFeed(prev => ({ ...prev, type: 'x' }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${newFeed.type === 'x' ? 'bg-white text-sky-500 shadow-sm' : 'text-[#a3a3a3] hover:text-[#737373]'}`}
                    >
                      X / Twitter
                    </button>
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#525252]">Category</label>
                    <select
                      className="w-full px-4 py-3 bg-[#f5f5f5] rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer"
                      value={newFeed.category}
                      onChange={e => setNewFeed(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="General">General</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Tech">Tech</option>
                      <option value="Security">Security</option>
                      <option value="Culture">Culture</option>
                      <option value="Science">Science</option>
                      <option value="Personal">Personal</option>
                      <option value="AI">AI</option>
                      <option value="Hardware">Hardware</option>
                    </select>
                  </div>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#525252]">
                      {newFeed.type === 'rss' ? 'Feed name' : 'Display name'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={newFeed.type === 'rss' ? "e.g. Simon Willison's Blog" : 'e.g. Paul Graham'}
                      className="w-full px-4 py-3 bg-[#f5f5f5] rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-[#c0c0c0]"
                      value={newFeed.name}
                      onChange={e => setNewFeed(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  {/* URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#525252]">
                      {newFeed.type === 'rss' ? 'Feed URL' : 'Profile URL'}
                    </label>
                    <input
                      type="url"
                      required
                      placeholder={newFeed.type === 'rss' ? 'https://example.com/feed.xml' : 'https://x.com/username'}
                      className="w-full px-4 py-3 bg-[#f5f5f5] rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-[#c0c0c0]"
                      value={newFeed.url}
                      onChange={e => setNewFeed(prev => ({ ...prev, url: e.target.value }))}
                    />
                    {newFeed.type === 'x' && (
                      <p className="text-xs text-[#a3a3a3] px-1 mt-1">
                        We'll automatically convert this to an RSS feed via Nitter.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#171717] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors shadow-md shadow-black/10 cursor-pointer mt-2"
                  >
                    Subscribe
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── AI Settings Modal ────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setAiConfig(getAIConfig()); setShowSettings(false); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ ease: 'easeOut', duration: 0.18 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl shadow-black/15 overflow-hidden"
            >
              <div className="p-7 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-xl font-semibold tracking-tight">AI Settings</h3>
                    <p className="text-sm text-[#a3a3a3] mt-1">Choose your AI provider</p>
                  </div>
                  <button
                    onClick={() => { setAiConfig(getAIConfig()); setShowSettings(false); }}
                    className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors cursor-pointer text-[#737373] hover:text-[#171717] mt-0.5"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Provider selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#525252]">Provider</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'gemini', label: 'Gemini', model: 'gemini-2.0-flash' },
                      { id: 'claude', label: 'Claude', model: 'claude-opus-4-5' },
                      { id: 'openai', label: 'OpenAI', model: 'gpt-4o' },
                    ] as { id: AIProvider; label: string; model: string }[]).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAiConfig(prev => ({ ...prev, provider: p.id }))}
                        className={`flex flex-col items-center gap-1 p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                          aiConfig.provider === p.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-[#e5e5e5] hover:border-[#c8c8c8]'
                        }`}
                      >
                        <span className={`text-sm font-semibold ${aiConfig.provider === p.id ? 'text-indigo-700' : 'text-[#171717]'}`}>
                          {p.label}
                        </span>
                        <span className="text-[9px] text-[#a3a3a3] font-medium">{p.model}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* API Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#525252] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    {aiConfig.provider === 'gemini' ? 'Gemini API Key' : aiConfig.provider === 'claude' ? 'Anthropic API Key' : 'OpenAI API Key'}
                  </label>
                  <input
                    type="password"
                    placeholder="Paste your API key…"
                    value={aiConfig.apiKey}
                    onChange={e => setAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#f5f5f5] rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-[#c0c0c0] placeholder:font-sans"
                  />
                  <p className="text-[10px] text-[#b0b0b0] px-0.5">
                    Keys are stored locally in your browser only.
                  </p>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={!aiConfig.apiKey.trim()}
                  className="w-full py-3.5 bg-[#171717] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors shadow-md shadow-black/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Toast Notifications ──────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => {
            const Icon = TOAST_ICON[toast.type];
            const isInfo = toast.type === 'info';
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
                className={`flex items-center gap-3 pl-4 pr-5 py-3 rounded-2xl shadow-xl text-sm font-medium max-w-xs pointer-events-auto border ${
                  isInfo
                    ? 'bg-[#171717] text-white border-white/5'
                    : 'bg-white text-[#404040] border-[#e5e5e5] shadow-black/8'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${TOAST_ICON_COLOR[toast.type]}`} />
                <span className={isInfo ? 'text-white/90' : ''}>{toast.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
