import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { requestPermission, getPermissionStatus, notificationsSupported, scheduleStreakNotification } from '../services/notifications';

const DISMISSED_KEY = 'notif_prompt_done_v3';

interface NotificationPromptProps {
  streak: number;
  trigger: boolean;
  onDone: () => void;
}

export default function NotificationPrompt({ streak, trigger, onDone }: NotificationPromptProps) {
  const [visible, setVisible]   = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Limpa chaves antigas de versões anteriores
  useEffect(() => {
    localStorage.removeItem('notif_prompt_done');
    localStorage.removeItem('notif_prompt_done_v2');
    localStorage.removeItem('notif_banner_dismissed');
  }, []);

  useEffect(() => {
    if (!trigger) return;
    if (!notificationsSupported()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (getPermissionStatus() !== 'default') return;
    const t = setTimeout(() => setVisible(true), 1_200);
    return () => clearTimeout(t);
  }, [trigger]);

  const handleAccept = useCallback(async () => {
    const permission = await requestPermission();
    localStorage.setItem(DISMISSED_KEY, 'true');
    if (permission === 'granted') {
      setAccepted(true);
      scheduleStreakNotification(streak);
      setTimeout(() => { setVisible(false); onDone(); }, 2000);
    } else {
      setVisible(false);
      onDone();
    }
  }, [streak, onDone]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
    onDone();
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,   scale: 1    }}
          exit={{    opacity: 0, y: -16,  scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="fixed top-4 left-4 right-4 z-[90]"
        >
          {accepted ? (
            <div className="bg-stone-900 border border-stone-700 rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold text-white text-sm">Tudo certo!</p>
                <p className="text-stone-400 text-xs mt-0.5">Vou te avisar antes da sua chama apagar.</p>
              </div>
            </div>
          ) : (
            <div className="bg-stone-900 rounded-2xl shadow-2xl overflow-hidden border border-stone-700">
              <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />
              <div className="px-4 py-4 flex items-start gap-3">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-2xl mt-0.5 shrink-0"
                >
                  🔥
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm leading-snug">
                    {streak >= 7
                      ? `${streak} dias seguidos — não perca agora`
                      : 'Quer proteger seu progresso?'}
                  </p>
                  <p className="text-stone-400 text-xs mt-1 leading-snug">
                    {streak >= 7
                      ? 'Posso te avisar às 21h quando sua sequência estiver em risco.'
                      : 'Te aviso se o dia estiver passando sem você abrir o app.'}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAccept}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm py-2.5 rounded-xl shadow-sm active:scale-95 transition-all"
                    >
                      Sim, me avisa 🔔
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-4 py-2.5 bg-stone-800 text-stone-400 text-sm font-medium rounded-xl active:scale-95 transition-all"
                    >
                      Agora não
                    </button>
                  </div>
                </div>
                <button onClick={handleDismiss} className="text-stone-600 hover:text-stone-400 transition-colors shrink-0 mt-0.5">
                  <X size={15} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
