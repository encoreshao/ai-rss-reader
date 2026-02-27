export type AIProvider = 'gemini' | 'claude' | 'openai';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

const STORAGE_KEY = 'ai_reader_ai_config';

export function getAIConfig(): AIConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { provider: 'gemini', apiKey: '' };
}

export function saveAIConfig(config: AIConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

async function callBackend(endpoint: string, body: object): Promise<string> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `Request failed: ${res.status}`);
  }
  const data = await res.json();
  return (data as any).text || '';
}

export async function summarizeArticle(
  config: AIConfig,
  title: string,
  content: string,
): Promise<string> {
  return callBackend('/api/ai/summarize', {
    provider: config.provider,
    apiKey: config.apiKey,
    title,
    content,
  });
}

export async function generateDigest(
  config: AIConfig,
  type: 'daily' | 'weekly',
  articles: { title: string; source: string }[],
): Promise<string> {
  return callBackend('/api/ai/digest', {
    provider: config.provider,
    apiKey: config.apiKey,
    type,
    articles,
  });
}
