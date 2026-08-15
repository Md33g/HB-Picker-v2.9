import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          id="ios-toast-notification"
          initial={{ opacity: 0, y: 40, scale: 0.95, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: 20, scale: 0.95, x: '-50%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 text-black shadow-2xl backdrop-blur-xl border border-white/40 pointer-events-none select-none max-w-[90vw]"
        >
          {type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          {type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
          <span className="text-xs font-semibold tracking-tight truncate">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
