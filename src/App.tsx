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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { summarizeArticle, generateDigest, hasApiKey } from './services/geminiService';

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

export default function App() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [digest, setDigest] = useState<{ type: 'daily' | 'weekly', content: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeed, setNewFeed] = useState({ name: '', url: '', type: 'rss' as 'rss' | 'x', category: 'General' });
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);

  const showToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const categories = useMemo(() => {
    const cats = new Set(feeds.map(f => f.category || 'General'));
    return Array.from(cats).sort();
  }, [feeds]);

  useEffect(() => {
    fetchFeeds();
  }, []);

  useEffect(() => {
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
    } catch (error) {
      console.error("Error fetching feeds:", error);
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
        setNewFeed({ name: '', url: '', type: 'rss', category: 'General' });
      }
    } catch (error) {
      console.error("Error adding feed:", error);
    }
  };

  const handleDeleteFeed = async (id: number) => {
    if (!confirm("Remove this feed?")) return;
    try {
      await fetch(`/api/feeds/${id}`, { method: 'DELETE' });
      await fetchFeeds();
      if (selectedFeed === feeds.find(f => f.id === id)?.xmlUrl) {
        setSelectedFeed(null);
      }
    } catch (error) {
      console.error("Error deleting feed:", error);
    }
  };

  const fetchFeed = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rss?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
      }
      const data: FeedData = await response.json();
      const feedType = feeds.find(f => f.xmlUrl === url)?.type || 'rss';
      const itemsWithSource = data.items.map(item => ({
        ...item,
        source: data.title,
        feedType
      }));
      setArticles(itemsWithSource);
    } catch (error: any) {
      console.error("Error fetching feed:", error);
      setError(error.message);
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
      // Fetch top 10 feeds for the "All" view to provide better variety
      const topFeeds = feeds.slice(0, 10);
      const allArticles: Article[] = [];

      const feedPromises = topFeeds.map(async (feed) => {
        try {
          const response = await fetch(`/api/rss?url=${encodeURIComponent(feed.xmlUrl)}`);
          if (!response.ok) return [];
          const data: FeedData = await response.json();
          return data.items.map(item => ({
            ...item,
            source: data.title,
            feedType: feed.type
          }));
        } catch (e) {
          console.error(`Failed to fetch ${feed.name}`, e);
          return [];
        }
      });

      const results = await Promise.all(feedPromises);
      results.forEach(items => allArticles.push(...items));

      setArticles(allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()));
      if (allArticles.length === 0) {
        setError("No articles found across your subscriptions.");
      }
    } catch (error: any) {
      console.error("Error fetching all feeds:", error);
      setError("Failed to aggregate feeds. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const handleSummarize = async (article: Article) => {
    if (!hasApiKey) {
      showToast('Gemini API key not set. Add GEMINI_API_KEY to your .env file to use AI features.');
      return;
    }
    setSummarizing(article.link);
    try {
      const summary = await summarizeArticle(article.title, article.content || article.contentSnippet);
      setArticles(prev => prev.map(a => a.link === article.link ? { ...a, summary: stripHtml(summary) } : a));
    } catch {
      showToast('Failed to generate summary. Please try again.');
    } finally {
      setSummarizing(null);
    }
  };

  const handleGenerateDigest = async (type: 'daily' | 'weekly') => {
    if (articles.length === 0) return;
    if (!hasApiKey) {
      showToast('Gemini API key not set. Add GEMINI_API_KEY to your .env file to use AI features.');
      return;
    }
    setLoading(true);
    try {
      const contextName = selectedFeed ? feeds.find(f => f.xmlUrl === selectedFeed)?.name : 'All Feeds';
      const digestArticles = articles.slice(0, 20).map(a => ({ title: a.title, source: a.source }));
      const content = await generateDigest(type, digestArticles);
      setDigest({ type, content: `### ${contextName} - ${type.toUpperCase()} DIGEST\n\n${content}` });
    } catch {
      showToast('Failed to generate digest. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (articles.length === 0) return;

    const digestArticles = articles.slice(0, 20);
    const headers = ['Title', 'Source', 'Date', 'Link', 'Summary Snippet'];
    const rows = digestArticles.map(a => [
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.source.replace(/"/g, '""')}"`,
      `"${new Date(a.pubDate).toLocaleDateString()}"`,
      `"${a.link}"`,
      `"${(a.summary || a.contentSnippet || "").replace(/"/g, '""').replace(/\n/g, ' ').substring(0, 300)}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ai_reader_digest_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredFeeds = feeds.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rssFeeds = filteredFeeds.filter(f => f.type === 'rss');
  const xFeeds = filteredFeeds.filter(f => f.type === 'x');

  return (
    <div className="flex h-screen bg-[#fafafa] text-[#171717] font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 300 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-white border-r border-[#e5e5e5] flex flex-col overflow-hidden shadow-sm z-20"
      >
        <div className="p-6 border-b border-[#e5e5e5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#171717] rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
              <Rss className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold tracking-tight text-xl">AI READER</span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 hover:bg-[#f5f5f5] rounded-lg transition-colors text-[#171717]"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a3a3a3]" />
            <input
              type="text"
              placeholder="Search feeds..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#f5f5f5] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#171717]/5 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-6">
          <div className="space-y-1">
            <button
              onClick={() => setSelectedFeed(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${!selectedFeed ? 'bg-[#171717] text-white shadow-md shadow-black/10' : 'text-[#737373] hover:bg-[#fafafa]'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              All Articles
            </button>
          </div>

          {categories.map(category => {
            const categoryFeeds = rssFeeds.filter(f => (f.category || 'General') === category);
            if (categoryFeeds.length === 0) return null;

            return (
              <div key={category} className="space-y-2">
                <div className="px-4 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-[0.2em]">{category}</div>
                <div className="space-y-1">
                  {categoryFeeds.map(feed => (
                    <div key={feed.id} className="group flex items-center gap-1">
                      <button
                        onClick={() => setSelectedFeed(feed.xmlUrl)}
                        className={`flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${selectedFeed === feed.xmlUrl ? 'bg-[#f5f5f5] text-[#171717]' : 'text-[#737373] hover:bg-[#fafafa]'}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${selectedFeed === feed.xmlUrl ? 'bg-indigo-500' : 'bg-[#d4d4d4]'}`} />
                        <span className="truncate">{feed.name}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteFeed(feed.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-[#a3a3a3] hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {xFeeds.length > 0 && (
            <div className="space-y-2">
              <div className="px-4 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-[0.2em]">X Feeds</div>
              <div className="space-y-1">
                {xFeeds.map(feed => (
                  <div key={feed.id} className="group flex items-center gap-1">
                    <button
                      onClick={() => setSelectedFeed(feed.xmlUrl)}
                      className={`flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${selectedFeed === feed.xmlUrl ? 'bg-[#f5f5f5] text-[#171717]' : 'text-[#737373] hover:bg-[#fafafa]'}`}
                    >
                      <Twitter className={`w-4 h-4 ${selectedFeed === feed.xmlUrl ? 'text-sky-500' : 'text-[#a3a3a3]'}`} />
                      <span className="truncate">{feed.name}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteFeed(feed.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-[#a3a3a3] hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-20 border-b border-[#e5e5e5] bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-[#f5f5f5] rounded-xl transition-colors">
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h2 className="font-bold text-xl tracking-tight">
                {selectedFeed ? feeds.find(f => f.xmlUrl === selectedFeed)?.name : 'Latest Updates'}
              </h2>
              <p className="text-xs text-[#a3a3a3] font-medium uppercase tracking-wider mt-0.5">
                {selectedFeed ? 'Source Feed' : 'Curated from all subscriptions'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => selectedFeed ? fetchFeed(selectedFeed) : fetchAllFeeds()}
              className="p-2.5 hover:bg-[#f5f5f5] rounded-xl transition-colors text-[#a3a3a3] hover:text-[#171717]"
              title="Refresh Feed"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportCSV}
              className="p-2.5 hover:bg-[#f5f5f5] rounded-xl transition-colors text-[#a3a3a3] hover:text-[#171717]"
              title="Export to CSV"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleGenerateDigest('daily')}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#171717] text-white hover:bg-[#404040] rounded-xl text-xs font-bold transition-all shadow-lg shadow-black/10"
            >
              <Sparkles className="w-4 h-4" />
              Generate Daily Digest
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#fafafa]">
          <div className="max-w-5xl mx-auto p-8 md:p-12">
            {error && !loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-6 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4 text-red-900"
              >
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-bold">Feed Loading Issue</p>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
                <button
                  onClick={() => selectedFeed ? fetchFeed(selectedFeed) : fetchAllFeeds()}
                  className="ml-auto px-4 py-2 bg-white hover:bg-red-100 rounded-xl text-xs font-bold transition-all border border-red-100"
                >
                  Retry
                </button>
              </motion.div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-6">
                <div className="relative">
                  <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                  <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[#171717] font-bold text-lg">Curating your news...</p>
                  <p className="text-[#a3a3a3] text-sm">Fetching the latest stories from your feeds</p>
                </div>
              </div>
            ) : digest ? (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[48px] border border-[#e5e5e5] shadow-2xl shadow-black/5 overflow-hidden"
              >
                {/* Digest Header - Refined Editorial */}
                <div className="relative h-[500px] bg-[#050505] flex flex-col justify-center items-center text-center p-12 overflow-hidden">
                  <div className="absolute inset-0 opacity-40">
                    <img
                      src="https://picsum.photos/seed/editorial/1920/1080?blur=10"
                      className="w-full h-full object-cover"
                      alt="Digest Background"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505]" />
                  </div>

                  <div className="relative z-20 max-w-3xl space-y-8">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="px-4 py-1.5 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] rounded-full">
                        Intelligence Report
                      </div>
                      <span className="text-white/40 text-xs font-bold uppercase tracking-[0.4em]">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </span>
                    </motion.div>

                    <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter leading-[0.8] uppercase italic">
                      The<br/>Digest
                    </h1>

                    <p className="text-white/60 text-lg font-medium tracking-wide max-w-xl mx-auto leading-relaxed">
                      A synthesized overview of the most critical developments across your selected information streams.
                    </p>
                  </div>

                  <button
                    onClick={() => setDigest(null)}
                    className="absolute top-12 right-12 w-14 h-14 bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white transition-all border border-white/10 group"
                  >
                    <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </button>
                </div>

                <div className="p-12 md:p-24 bg-white">
                  <div className="max-w-4xl mx-auto">
                    <div className="prose prose-neutral prose-xl max-w-none
                      prose-headings:font-black prose-headings:tracking-tight prose-headings:uppercase prose-headings:italic
                      prose-p:text-[#262626] prose-p:leading-[1.8] prose-p:font-serif
                      prose-strong:text-indigo-600 prose-strong:font-black
                      prose-li:text-[#404040] prose-li:leading-relaxed
                      prose-hr:border-[#e5e5e5]
                    ">
                      <Markdown>{digest.content}</Markdown>
                    </div>

                    <div className="mt-24 pt-12 border-t border-[#e5e5e5] flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase tracking-widest text-[#171717]">Synthesized by Gemini</p>
                          <p className="text-xs text-[#737373] font-medium">Based on {articles.length} recent articles</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button className="px-8 py-4 bg-[#f5f5f5] hover:bg-[#e5e5e5] rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                          Share Report
                        </button>
                        <button
                          onClick={handleExportCSV}
                          className="px-8 py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20"
                        >
                          Export Data
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-12">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                    {selectedFeed === 'https://simonwillison.net/atom/everything/' ? 'Engineering Logs' : 'Recent Stories'}
                  </h3>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-[#d4d4d4]">{articles.length} Articles</span>
                  </div>
                </div>

                <div className={selectedFeed === 'https://simonwillison.net/atom/everything/' ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "grid gap-8"}>
                  <AnimatePresence mode="popLayout">
                    {articles.map((article, idx) => {
                      const isX = article.feedType === 'x';
                      const isSimon = selectedFeed === 'https://simonwillison.net/atom/everything/';

                      return (
                        <motion.article
                          key={`${article.link}-${article.pubDate}-${idx}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`group relative p-8 rounded-[32px] border transition-all duration-500 ${
                            isSimon
                              ? 'bg-white border-[#e5e5e5] hover:border-indigo-500 hover:shadow-lg'
                              : isX
                                ? 'bg-white border-sky-100 hover:border-sky-400 hover:shadow-xl hover:shadow-sky-500/5'
                                : 'bg-white border-[#e5e5e5] hover:border-[#171717] hover:shadow-2xl hover:shadow-black/5'
                          }`}
                        >
                          <div className={isSimon ? "flex flex-col gap-4" : "flex flex-col md:flex-row gap-8"}>
                            <div className="flex-1 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-colors ${
                                    isX
                                      ? 'bg-sky-50 text-sky-600'
                                      : 'bg-[#f5f5f5] text-[#737373] group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                  }`}>
                                    {isX ? <Twitter className="w-3 h-3 inline mr-1" /> : null}
                                    {article.source}
                                  </span>
                                  <span className="text-[10px] font-bold text-[#d4d4d4] uppercase tracking-wider">
                                    {new Date(article.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {isX && (
                                  <div className="text-sky-400">
                                    <Twitter className="w-5 h-5 fill-current" />
                                  </div>
                                )}
                              </div>

                              {isX ? (
                                <div className="text-lg md:text-xl font-medium leading-relaxed text-[#171717] whitespace-pre-wrap">
                                  {article.title}
                                </div>
                              ) : (
                                <h3 className={`${isSimon ? 'text-xl' : 'text-2xl'} font-bold leading-tight tracking-tight group-hover:text-indigo-600 transition-colors`}>
                                  {article.title}
                                </h3>
                              )}

                              {!isX && (
                                <p className={`text-[#737373] text-sm leading-relaxed ${isSimon ? 'line-clamp-2' : 'line-clamp-3'}`}>
                                  {stripHtml(article.contentSnippet || article.content || "").substring(0, 200) || "No description available."}
                                </p>
                              )}
                            </div>

                            <div className={`flex items-center gap-4 ${isSimon ? 'pt-2' : 'pt-4'}`}>
                                <button
                                  onClick={() => handleSummarize(article)}
                                  disabled={summarizing === article.link}
                                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                                    isX
                                      ? 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                  }`}
                                >
                                  {summarizing === article.link ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                  {article.summary ? 'Regenerate' : 'AI Summary'}
                                </button>
                                <a
                                  href={article.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 px-5 py-2.5 bg-[#f5f5f5] text-[#171717] hover:bg-[#e5e5e5] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                  {isX ? 'View Post' : 'Read Full'} <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>

                            {article.summary && !isSimon && (
                              <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`md:w-80 p-6 rounded-3xl border flex flex-col justify-center ${
                                  isX
                                    ? 'bg-sky-50/30 border-sky-100/50'
                                    : 'bg-indigo-50/30 border-indigo-100/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <Sparkles className={`w-3 h-3 ${isX ? 'text-sky-500' : 'text-indigo-500'}`} />
                                  <span className={`text-[9px] font-black uppercase tracking-widest ${isX ? 'text-sky-500' : 'text-indigo-500'}`}>
                                    {isX ? 'Post Insight' : 'Key Takeaway'}
                                  </span>
                                </div>
                                <p className={`text-sm leading-relaxed italic font-medium ${isX ? 'text-sky-900' : 'text-indigo-900'}`}>
                                  "{stripHtml(article.summary)}"
                                </p>
                              </motion.div>
                            )}
                          </div>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Feed Modal */}
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black uppercase tracking-tight">Add New Feed</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddFeed} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex p-1 bg-[#f5f5f5] rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setNewFeed(prev => ({ ...prev, type: 'rss' }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${newFeed.type === 'rss' ? 'bg-white text-[#171717] shadow-sm' : 'text-[#a3a3a3]'}`}
                      >
                        RSS Feed
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewFeed(prev => ({ ...prev, type: 'x' }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${newFeed.type === 'x' ? 'bg-white text-sky-500 shadow-sm' : 'text-[#a3a3a3]'}`}
                      >
                        X (Twitter)
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3] ml-1">Category</label>
                      <select
                        className="w-full px-5 py-3.5 bg-[#f5f5f5] rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#171717]/5 transition-all appearance-none"
                        value={newFeed.category}
                        onChange={(e) => setNewFeed(prev => ({ ...prev, category: e.target.value }))}
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

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3] ml-1">Feed Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. My Favorite Blog"
                        className="w-full px-5 py-3.5 bg-[#f5f5f5] rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#171717]/5 transition-all"
                        value={newFeed.name}
                        onChange={(e) => setNewFeed(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3] ml-1">
                        {newFeed.type === 'rss' ? 'RSS URL' : 'X Profile URL'}
                      </label>
                      <input
                        type="url"
                        required
                        placeholder={newFeed.type === 'rss' ? 'https://example.com/feed.xml' : 'https://x.com/username'}
                        className="w-full px-5 py-3.5 bg-[#f5f5f5] rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#171717]/5 transition-all"
                        value={newFeed.url}
                        onChange={(e) => setNewFeed(prev => ({ ...prev, url: e.target.value }))}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-[#171717] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#404040] transition-all shadow-xl shadow-black/10"
                  >
                    Add to Subscriptions
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="flex items-center gap-3 px-5 py-3.5 bg-[#171717] text-white rounded-2xl shadow-2xl shadow-black/20 text-sm font-medium max-w-sm pointer-events-auto"
            >
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
