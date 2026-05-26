import { MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function WhatsappSupport() {
  const whatsappNumber = '+8801716807465';
  const whatsappUrl = `https://wa.me/${whatsappNumber.replace('+', '')}`;

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-2xl shadow-[#25D366]/40 hover:bg-[#128C7E] transition-colors group cursor-pointer"
      title="Chat with Support"
    >
      <MessageCircle size={32} fill="white" className="group-hover:rotate-12 transition-transform" />
      <span className="absolute right-full mr-3 px-3 py-1 bg-white text-slate-900 text-xs font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-100">
        Chat with Support
      </span>
      <span className="absolute -top-1 -right-1 flex h-4 w-4">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-4 w-4 bg-[#25D366] border-2 border-white"></span>
      </span>
    </motion.a>
  );
}
