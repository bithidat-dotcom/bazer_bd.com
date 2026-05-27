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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-between pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onHomeClick}
        className="flex flex-col items-center gap-1 text-slate-400 focus:text-orange-500 transition-colors"
      >
        <Home className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
      </motion.button>

      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onCartClick}
        className="flex flex-col items-center gap-1 text-slate-400 focus:text-orange-500 transition-colors relative"
      >
        <ShoppingBag className="w-6 h-6" />
        {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] flex items-center justify-center rounded-full font-bold border-2 border-white">
                {cartCount}
            </span>
        )}
        <span className="text-[10px] font-bold uppercase tracking-wider">Cart</span>
      </motion.button>

      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onSupportClick}
        className="flex flex-col items-center gap-1 text-[#25D366] transition-colors"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Support</span>
      </motion.button>

      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onOrdersClick}
        className="flex flex-col items-center gap-1 text-slate-400 focus:text-orange-500 transition-colors"
      >
        <Package className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
      </motion.button>

      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onProfileClick}
        className="flex flex-col items-center gap-1 text-slate-400 focus:text-orange-500 transition-colors"
      >
        {user?.profileImage ? (
          <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200">
            <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
          </div>
        ) : (
          <User className="w-6 h-6" />
        )}
        <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
      </motion.button>
    </div>
  );
}
