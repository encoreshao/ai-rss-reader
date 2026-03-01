import { Sparkles, ExternalLink, Loader2, Twitter } from 'lucide-react';
import { motion } from 'motion/react';
import type { Article } from '../types';
import { stripHtml } from '../utils/html';

interface Props {
  article: Article;
  idx: number;
  isSelected: boolean;
  summarizing: string | null;
  onSelect: (article: Article) => void;
  onSummarize: (article: Article) => void;
}

export default function ArticleCard({ article, idx, isSelected, summarizing, onSelect, onSummarize }: Props) {
  const isX = article.feedType === 'x';

  return (
    <motion.article
      key={`${article.link}-${idx}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.025, 0.3), ease: 'easeOut' }}
      onClick={() => onSelect(article)}
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
        <p className="text-base leading-relaxed text-[#171717] whitespace-pre-wrap mb-4">{article.title}</p>
      ) : (
        <h3 className="font-heading text-xl font-semibold leading-snug tracking-tight group-hover:text-indigo-600 transition-colors mb-3">
          {article.title}
        </h3>
      )}

      {/* Snippet — always plain text, let CSS truncate */}
      {!isX && (
        <p className="text-sm text-[#737373] leading-relaxed line-clamp-3 mb-4">
          {stripHtml(article.contentSnippet || article.content || '') || 'No description available.'}
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
          onClick={e => { e.stopPropagation(); onSummarize(article); }}
          disabled={summarizing === article.link}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            isX ? 'bg-sky-50 text-sky-600 hover:bg-sky-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
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
}
