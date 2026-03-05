import { Home, Map, User, Users, Heart } from 'lucide-react';

interface NavigationProps {
  currentTab: 'home' | 'journey' | 'trails' | 'profile' | 'community';
  onTabChange: (tab: 'home' | 'journey' | 'trails' | 'profile' | 'community') => void;
}

export default function Navigation({ currentTab, onTabChange }: NavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 pb-safe z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-1">
        {[
          { id: 'home',      label: 'Início',    icon: Home,  color: 'text-rose-700',    activeBg: 'bg-rose-50' },
          { id: 'journey',   label: 'Jornada',   icon: Map,   color: 'text-rose-700',    activeBg: 'bg-rose-50' },
          { id: 'trails',    label: 'Trilhas',   icon: Heart, color: 'text-rose-700',    activeBg: 'bg-rose-50' },
          { id: 'community', label: 'Comunidade',icon: Users, color: 'text-indigo-600',  activeBg: 'bg-indigo-50' },
          { id: 'profile',   label: 'Perfil',    icon: User,  color: 'text-rose-700',    activeBg: 'bg-rose-50' },
        ].map(({ id, label, icon: Icon, color, activeBg }) => {
          const isActive = currentTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id as any)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 ${
                isActive ? color : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <div className={`relative flex items-center justify-center w-10 h-7 rounded-2xl transition-all ${
                isActive ? activeBg : ''
              }`}>
                <Icon size={20} className={isActive ? 'fill-current opacity-90' : ''} />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current" />
                )}
              </div>
              <span className={`text-[10px] font-semibold mt-0.5 leading-none ${isActive ? '' : 'text-stone-400'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
