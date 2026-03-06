import { Home, Map, User, Users, Heart } from 'lucide-react';
import { motion } from 'motion/react';

interface NavigationProps {
  currentTab: 'home' | 'journey' | 'trails' | 'profile' | 'community';
  onTabChange: (tab: 'home' | 'journey' | 'trails' | 'profile' | 'community') => void;
  unreadNotifications?: number;
}

const TABS = [
  { id: 'home',      label: 'Início',     icon: Home,  activeColor: 'text-amber-600',   activeBg: 'bg-amber-50',   activeRing: 'ring-amber-200' },
  { id: 'journey',   label: 'Jornada',    icon: Map,   activeColor: 'text-emerald-600', activeBg: 'bg-emerald-50', activeRing: 'ring-emerald-200' },
  { id: 'trails',    label: 'Trilhas',    icon: Heart, activeColor: 'text-rose-600',    activeBg: 'bg-rose-50',    activeRing: 'ring-rose-200' },
  { id: 'community', label: 'Comunidade', icon: Users, activeColor: 'text-indigo-600',  activeBg: 'bg-indigo-50',  activeRing: 'ring-indigo-200' },
  { id: 'profile',   label: 'Perfil',     icon: User,  activeColor: 'text-violet-600',  activeBg: 'bg-violet-50',  activeRing: 'ring-violet-200' },
] as const;

export default function Navigation({ currentTab, onTabChange, unreadNotifications = 0 }: NavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/98 backdrop-blur-xl border-t border-stone-100 pb-safe z-50"
      style={{ boxShadow: '0 -1px 0 rgba(0,0,0,0.06), 0 -8px 32px rgba(0,0,0,0.07)' }}>
      <div className="max-w-lg mx-auto flex justify-around items-center h-[62px] px-1">
        {TABS.map(({ id, label, icon: Icon, activeColor, activeBg }) => {
          const isActive = currentTab === id;
          const showBadge = id === 'community' && unreadNotifications > 0;
          return (
            <motion.button
              key={id}
              onClick={() => onTabChange(id as any)}
              whileTap={{ scale: 0.82 }}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors duration-150 ${
                isActive ? activeColor : 'text-stone-400'
              }`}
            >
              <div className={`relative flex items-center justify-center w-12 h-8 rounded-2xl transition-all duration-200 ${isActive ? activeBg : ''}`}>
                <motion.div
                  animate={isActive ? { y: [-2, 0], scale: [0.9, 1] } : {}}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                  <Icon
                    size={21}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-all duration-150 ${isActive ? 'fill-current opacity-90' : 'opacity-55'}`}
                  />
                </motion.div>
                {showBadge && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 rounded-full flex items-center justify-center px-1"
                  >
                    <span className="text-white text-[9px] font-bold leading-none">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  </motion.span>
                )}
              </div>
              <span className={`text-[10px] font-bold leading-none tracking-tight transition-all duration-150 ${isActive ? 'opacity-100' : 'opacity-45'}`}>
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
