// ============================================================
//  OfflineBanner.tsx — Banner de aviso quando sem internet
// ============================================================

import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useOffline } from '../hooks/useOffline';
import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const isOffline = useOffline();
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [prevOffline, setPrevOffline] = useState(false);

  // Quando voltar online, mostra toast por 3s
  useEffect(() => {
    if (prevOffline && !isOffline) {
      setShowOnlineToast(true);
      const t = setTimeout(() => setShowOnlineToast(false), 3000);
      return () => clearTimeout(t);
    }
    setPrevOffline(isOffline);
  }, [isOffline, prevOffline]);

  return (
    <>
      {/* Banner de offline — fixo no topo */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-stone-900 text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-lg"
          >
            <WifiOff size={14} className="text-amber-400 shrink-0" />
            <p className="text-xs font-bold">
              Você está offline — exibindo conteúdo salvo
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast de "voltou online" */}
      <AnimatePresence>
        {showOnlineToast && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-lg"
          >
            <Wifi size={14} className="shrink-0" />
            <p className="text-xs font-bold">Conexão restaurada!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
