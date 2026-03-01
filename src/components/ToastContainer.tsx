import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Toast, ToastType } from '../types';

const TOAST_ICON: Record<ToastType, React.FC<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_COLOR: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-indigo-400',
};

interface Props {
  toasts: Toast[];
}

export default function ToastContainer({ toasts }: Props) {
  return (
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
              <Icon className={`w-4 h-4 shrink-0 ${TOAST_COLOR[toast.type]}`} />
              <span className={isInfo ? 'text-white/90' : ''}>{toast.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
