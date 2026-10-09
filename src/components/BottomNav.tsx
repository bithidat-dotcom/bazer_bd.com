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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/85 backdrop-blur-xl border-t border-slate-200/60 py-3 grid grid-cols-5 items-center justify-items-center pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
      {/* Home Button */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onHomeClick}
        className="w-full flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-slate-900 transition-colors duration-250 py-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" className="w-5.5 h-5.5">
          <line x1="10" y1="17" x2="10" y2="13" fill="none" stroke="#1c1f21" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" data-color="color-2"></line>
          <path d="m4.378,6.114l5.082-3.267c.329-.212.752-.212,1.082,0l5.082,3.267c.859.552,1.378,1.503,1.378,2.524v5.362c0,1.657-1.343,3-3,3H6c-1.657,0-3-1.343-3-3v-5.362c0-1.021.519-1.972,1.378-2.524Z" fill="none" stroke="#1c1f21" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
        <span className="text-[9.5px] font-black uppercase tracking-wider">Home</span>
      </motion.button>

      {/* Cart Button */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onCartClick}
        className="w-full flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-slate-900 transition-colors duration-250 relative py-1"
      >
        <motion.div
          key={`cart-icon-bottom-${cartCount}`}
          animate={cartCount > 0 ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
          className="relative flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" className="w-5.5 h-5.5">
            <path d="m14,2H6c-2.206,0-4,1.794-4,4v8c0,2.206,1.794,4,4,4h8c2.206,0,4-1.794,4-4V6c0-2.206-1.794-4-4-4Zm2,11c0,.552-.448,1-1,1h-1.719c-.459,0-.859.312-.97.757l-.121.485c-.111.445-.511.757-.97.757h-2.438c-.459,0-.859-.312-.97-.757l-.121-.485c-.111-.445-.511-.757-.97-.757h-1.719c-.552,0-1-.448-1-1v-7c0-1.105.895-2,2-2h8c1.105,0,2,.895,2,2v7Z" strokeWidth="0" fill="#1c1f21"></path>
          </svg>
          {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-red-600 text-white text-[8px] flex items-center justify-center rounded-full font-black border border-white leading-none shadow-sm">
                  {cartCount}
              </span>
          )}
        </motion.div>
        <span className="text-[9.5px] font-black uppercase tracking-wider">Cart</span>
      </motion.button>

      {/* Support / WhatsApp Button */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onSupportClick}
        className="w-full flex flex-col items-center justify-center gap-1 text-slate-950 hover:text-black transition-colors duration-250 py-1"
      >
        <div className="w-5.5 h-5.5 rounded-full overflow-hidden shadow-sm border border-slate-100 flex items-center justify-center">
          <img 
            src="https://img.magnific.com/premium-vector/whatsapp-app-round-icon-popular-messenger-social-media-logo_277909-873.jpg?semt=ais_hybrid&w=740&q=80" 
            className="w-full h-full object-cover" 
            alt="Support"
          />
        </div>
        <span className="text-[9.5px] font-black uppercase tracking-wider">Support</span>
      </motion.button>

      {/* Orders Button */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onOrdersClick}
        className="w-full flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-slate-900 transition-colors duration-250 py-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" className="w-5.5 h-5.5">
          <rect x="3" y="4" width="14" height="2" rx=".5" ry=".5" fill="#1c1f21" stroke="#1c1f21" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" data-color="color-2"></rect>
          <path d="m3,9v4c0,2.206,1.794,4,4,4h6c2.206,0,4-1.794,4-4v-4H3Zm9,4h-4c-.553,0-1-.448-1-1s.447-1,1-1h4c.553,0,1,.448,1,1s-.447,1-1,1Z" strokeWidth="0" fill="#1c1f21"></path>
        </svg>
        <span className="text-[9.5px] font-black uppercase tracking-wider">Orders</span>
      </motion.button>

      {/* Profile Button */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onProfileClick}
        className="w-full flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-slate-900 transition-colors duration-250 py-1"
      >
        {user?.profile_image_url || user?.profileImage ? (
          <div className="w-5.5 h-5.5 rounded-full overflow-hidden border border-slate-200">
            <img src={user.profile_image_url || user.profileImage} alt="Profile" className="w-full h-full object-cover" />
          </div>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" className="w-5.5 h-5.5">
            <circle cx="10" cy="5.5" r="2.5" fill="#1c1f21" stroke="#1c1f21" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" data-color="color-2"></circle>
            <path d="m14.664,16.455c.947-.221,1.469-1.303.991-2.15-1.114-1.973-3.227-3.305-5.655-3.305s-4.541,1.332-5.655,3.305c-.478.847.044,1.929.991,2.15,3.11.727,6.219.727,9.329,0Z" stroke="#1c1f21" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" fill="#1c1f21"></path>
          </svg>
        )}
        <span className="text-[9.5px] font-black uppercase tracking-wider">Profile</span>
      </motion.button>
    </div>
  );
}
