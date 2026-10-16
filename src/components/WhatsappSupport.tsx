import { useState } from 'react';
import { PhoneCall, MessageCircle, X, HelpCircle, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function WhatsappSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const supportPhone = '01716807465';
  const whatsappNumber = '8801716807465';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hello%20Pbazar%20Support,%20I%20need%20assistance.`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-3 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Phone size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Instant Support</h4>
                  <p className="text-[10px] font-bold text-slate-400">Pbazar Customer Care</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 font-medium mb-3">
              Have questions about products, delivery or account status? Contact our team directly:
            </p>

            <div className="space-y-2">
              {/* One-click Direct Call Button */}
              <a
                href={`tel:${supportPhone}`}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
              >
                <PhoneCall size={14} />
                <span>Direct Call: {supportPhone}</span>
              </a>

              {/* WhatsApp Link for Instant Chat */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                <MessageCircle size={14} />
                <span>WhatsApp Live Chat</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Floating Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-900/30 transition-all group cursor-pointer overflow-hidden border-2 border-white relative"
        title="Direct Call & WhatsApp Support"
      >
        {isOpen ? (
          <X size={24} className="text-white" />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative">
            <img 
              src="https://img.magnific.com/premium-vector/whatsapp-app-round-icon-popular-messenger-social-media-logo_277909-873.jpg?semt=ais_hybrid&w=740&q=80" 
              className="w-full h-full object-cover" 
              alt="Support"
            />
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
              <PhoneCall size={9} />
            </span>
          </div>
        )}
        
        {/* Pulse indicator */}
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
        </span>
      </motion.button>
    </div>
  );
}
