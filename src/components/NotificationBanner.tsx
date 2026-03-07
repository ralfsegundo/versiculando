import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';
import { requestPermission, getPermissionStatus, notificationsSupported } from '../services/notifications';

// Banner sutil que aparece após a primeira atividade do usuário
// pedindo permissão para notificações de streak.
// Só aparece uma vez — se negado ou aceito, não volta mais.

const ASKED_KEY = 'notif_banner_dismissed';

export default function NotificationBanner({ streak }: { streak: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!notificationsSupported()) return;
    if (localStorage.getItem(ASKED_KEY)) return;
    if (getPermissionStatus() !== 'default') return;

    // Só aparece se o usuário já tem pelo menos 1 dia de streak
    // e após 30s de uso — não na primeira abertura
    if (streak < 1) return;

    const timer = setTimeout(() => setVisible(true), 30_000);
    return () => clearTimeout(timer);
  }, [streak]);

  const handleAccept = async () => {
    const permission = await requestPermission();
    localStorage.setItem(ASKED_KEY, 'true');
    setVisible(false);
    if (permission === 'granted') {
      // Feedback sutil de confirmação
      console.log('[notif] Permissão concedida');
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(ASKED_KEY, 'true');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', damping: 20 }}
          className="fixed bottom-24 left-4 right-4 z-50"
        >
          <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <Bell size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-snug">
                Não deixe sua chama apagar 🔥
              </p>
              <p className="text-stone-400 text-xs mt-0.5 leading-snug">
                Avise quando sua sequência de {streak} dia{streak > 1 ? 's' : ''} estiver em risco?
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAccept}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm py-2 rounded-xl transition-colors active:scale-95"
                >
                  Sim, me avisa!
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-400 text-sm rounded-xl transition-colors active:scale-95"
                >
                  Não
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-stone-500 hover:text-stone-300 transition-colors mt-0.5"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
