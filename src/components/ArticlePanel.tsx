import { X, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Article } from '../types';
import { sanitizeHtml, hasHtml, stripHtml } from '../utils/html';

/** Renders sanitized HTML with full Tailwind Typography styling + overflow fixes */
function HtmlContent({ html }: { html: string }) {
  return (
    <div
      className={[
        'prose prose-sm prose-neutral max-w-none',
        // Links
        'prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline',
        // Headings
        'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-[#171717]',
        // Body text
        'prose-p:text-[#404040] prose-p:leading-relaxed',
        // Images
        'prose-img:rounded-xl prose-img:max-w-full prose-img:h-auto',
        // Code & pre — prevent horizontal overflow
        'prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-code:text-[0.8em]',
        '[&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[#f5f5f5] [&_pre]:p-4 [&_pre]:text-sm',
        // Tables
        '[&_table]:w-full [&_table]:overflow-x-auto [&_table]:block [&_table]:text-sm',
        // Blockquote
        'prose-blockquote:border-l-indigo-300 prose-blockquote:text-[#525252]',
        // Lists
        'prose-li:text-[#404040]',
      ].join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface Props {
  article: Article | null;
  summarizing: string | null;
  onSummarize: (article: Article) => void;
  onClose: () => void;
}

export default function ArticlePanel({ article, summarizing, onSummarize, onClose }: Props) {
  return (
    <AnimatePresence>
      {article && (
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
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 truncate">
                {article.source}
              </span>
              <span className="text-[10px] text-[#d4d4d4]">·</span>
              <span className="text-[10px] text-[#a3a3a3] tabular-nums whitespace-nowrap">
                {new Date(article.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => onSummarize(article)}
                disabled={summarizing === article.link}
                title="AI Summary"
                className="p-2 hover:bg-indigo-50 text-[#b0b0b0] hover:text-indigo-600 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              >
                {summarizing === article.link
                  ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  : <Sparkles className="w-4 h-4" />
                }
              </button>
              <a
                href={article.link}
                target="_blank"
                rel="noreferrer"
                title="Open in browser"
                className="p-2 hover:bg-[#f5f5f5] text-[#b0b0b0] hover:text-[#171717] rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#f5f5f5] text-[#b0b0b0] hover:text-[#171717] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* AI Summary banner */}
          <AnimatePresence>
            {article.summary && (
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
                <p className="text-sm leading-relaxed text-indigo-900 italic">{article.summary}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <h1 className="font-heading text-lg font-semibold leading-snug tracking-tight text-[#171717] mb-5">
              {article.title}
            </h1>

            {article.content && article.content.trim().length > 80 ? (
              <HtmlContent html={sanitizeHtml(article.content)} />
            ) : article.contentSnippet ? (
              hasHtml(article.contentSnippet) ? (
                <HtmlContent html={sanitizeHtml(article.contentSnippet)} />
              ) : (
                <p className="text-sm text-[#404040] leading-relaxed whitespace-pre-line">
                  {stripHtml(article.contentSnippet)}
                </p>
              )
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-[#a3a3a3]">No content in RSS feed — loading from source:</p>
                <iframe
                  src={article.link}
                  title={article.title}
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
  );
}
