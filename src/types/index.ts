export interface Feed {
  id: number;
  name: string;
  xmlUrl: string;
  htmlUrl?: string;
  type: 'rss' | 'x';
  category?: string;
}

export interface Article {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  source: string;
  summary?: string;
  feedType?: 'rss' | 'x';
}

export interface FeedData {
  title: string;
  items: Article[];
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}
