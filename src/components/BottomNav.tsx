import { Home, User, Package, ShoppingBag, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavProps {
  onHomeClick: () => void;
  onProfileClick: () => void;
  onOrdersClick: () => void;
  onCartClick: () => void;
  onSupportClick: () => void;
  cartCount: number;
  user: any;
}

export default function BottomNav({ 
  onHomeClick, 
  onProfileClick, 
  onOrdersClick, 
  onCartClick,
  onSupportClick,
  cartCount,
  user
}: BottomNavProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-slate-100 px-2 py-3 flex items-center justify-around pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onHomeClick}
        className="flex-1 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-900 transition-colors duration-250 py-1"
      >
        <Home className="w-5.5 h-5.5" />
        <span className="text-[9.5px] font-bold uppercase tracking-wider">Home</span>
      </motion.button>

      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onCartClick}
        className="flex-1 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-900 transition-colors duration-250 relative py-1"
      >
        <ShoppingBag className="w-5.5 h-5.5" />
        {cartCount > 0 && (
            <span className="absolute top-0 right-[25%] min-w-4 h-4 px-1 bg-slate-950 text-white text-[8px] flex items-center justify-center rounded-full font-black border border-white leading-none">
                {cartCount}
            </span>
        )}
        <span className="text-[9.5px] font-bold uppercase tracking-wider">Cart</span>
      </motion.button>

      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onSupportClick}
        className="flex-1 flex flex-col items-center justify-center gap-1 text-slate-950 hover:text-black transition-colors duration-250 py-1"
      >
        <MessageCircle className="w-5.5 h-5.5 text-black font-extrabold fill-black/10" />
        <span className="text-[9.5px] font-bold uppercase tracking-wider">Support</span>
      </motion.button>

      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onOrdersClick}
        className="flex-1 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-900 transition-colors duration-250 py-1"
      >
        <Package className="w-5.5 h-5.5" />
        <span className="text-[9.5px] font-bold uppercase tracking-wider">Orders</span>
      </motion.button>

      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onProfileClick}
        className="flex-1 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-900 transition-colors duration-250 py-1"
      >
        {user?.profileImage ? (
          <div className="w-5.5 h-5.5 rounded-full overflow-hidden border border-slate-200">
            <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
          </div>
        ) : (
          <User className="w-5.5 h-5.5" />
        )}
        <span className="text-[9.5px] font-bold uppercase tracking-wider">Profile</span>
      </motion.button>
    </div>
  );
}
