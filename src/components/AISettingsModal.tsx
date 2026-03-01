import { X, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type AIConfig, type AIProvider, getAIConfig } from '../services/aiService';

interface Props {
  open: boolean;
  aiConfig: AIConfig;
  onChange: (config: AIConfig) => void;
  onSave: () => void;
  onClose: () => void;
}

const PROVIDERS: { id: AIProvider; label: string; model: string }[] = [
  { id: 'gemini', label: 'Gemini', model: 'gemini-2.0-flash' },
  { id: 'claude', label: 'Claude', model: 'claude-opus-4-5' },
  { id: 'openai', label: 'OpenAI', model: 'gpt-4o' },
];

const API_KEY_LABEL: Record<AIProvider, string> = {
  gemini: 'Gemini API Key',
  claude: 'Anthropic API Key',
  openai: 'OpenAI API Key',
};

export default function AISettingsModal({ open, aiConfig, onChange, onSave, onClose }: Props) {
  const handleClose = () => {
    onChange(getAIConfig());
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
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
                  onClick={handleClose}
                  className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors cursor-pointer text-[#737373] hover:text-[#171717] mt-0.5"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Provider selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#525252]">Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onChange({ ...aiConfig, provider: p.id })}
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
                  {API_KEY_LABEL[aiConfig.provider]}
                </label>
                <input
                  type="password"
                  placeholder="Paste your API key…"
                  value={aiConfig.apiKey}
                  onChange={e => onChange({ ...aiConfig, apiKey: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f5f5] rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-[#c0c0c0] placeholder:font-sans"
                />
                <p className="text-[10px] text-[#b0b0b0] px-0.5">
                  Keys are stored locally in your browser only.
                </p>
              </div>

              <button
                onClick={onSave}
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
  );
}
