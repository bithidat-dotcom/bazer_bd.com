import { X, Send, User, ShieldCheck, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, limit, doc, setDoc } from 'firebase/firestore';
import { UserProfile } from './AuthModal';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

interface Message {
  id: string;
  text: string;
  sender: 'customer' | 'admin';
  created_at: string;
}

export default function ChatModal({ isOpen, onClose, user }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatId = user?.username || 'anonymous_' + (localStorage.getItem('chat_session_id') || Math.random().toString(36).slice(2));

  useEffect(() => {
    if (!localStorage.getItem('chat_session_id')) {
      localStorage.setItem('chat_session_id', Math.random().toString(36).slice(2));
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('created_at', 'asc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Message[];
      setMessages(msgs);
      scrollToBottom();
    }, (err) => {
      console.error('Chat snapshot error:', err);
    });

    return () => unsub();
  }, [isOpen, chatId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const text = input.trim();
    setInput('');
    setLoading(true);

    try {
      const now = new Date().toISOString();
      
      // Update chat session
      await setDoc(doc(db, 'chats', chatId), {
        id: chatId,
        customer_username: user?.username || 'Guest',
        customer_image: user?.profileImage || null,
        last_message: text,
        updated_at: now,
        unread_count: 0 // Admin will handle this
      }, { merge: true });

      // Add message
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text,
        sender: 'customer',
        created_at: now
      });
      
      scrollToBottom();
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm md:block hidden"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative bg-slate-50 w-full h-full md:rounded-3xl md:max-w-md md:max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 pt-12 md:pt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <ShieldCheck className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Admin Support</h3>
              <p className="text-[10px] text-slate-400 font-medium">Always online for you</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-container">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <MessageSquare className="text-slate-400" />
              </div>
              <p className="text-slate-900 font-bold tracking-tight">How can we help you today?</p>
              <p className="text-slate-500 text-xs mt-1 font-medium px-8 text-center italic">Type your message below to start a chat with our admin.</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex w-full mb-2 ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'customer' ? (
                <div className="flex flex-col items-end max-w-[85%]">
                  <div className="flex items-center gap-1.5">
                    <div className="bg-slate-900 text-white p-3 rounded-2xl rounded-tr-none text-sm font-medium shadow-sm">
                      ({msg.text})
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 font-mono">user&lt;</span>
                  </div>
                  <div className="text-[9px] mt-1 opacity-50 text-right pr-2">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start max-w-[85%]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-orange-600 font-mono">&gt;studio</span>
                    <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none text-sm font-medium text-slate-800 shadow-sm">
                      ({msg.text})
                    </div>
                  </div>
                  <div className="text-[9px] mt-1 opacity-50 text-left pl-2">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-slate-100 border-none rounded-full px-4 text-sm font-medium focus:ring-2 focus:ring-black transition-all"
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-black transition-all disabled:opacity-50 active:scale-95 shrink-0"
          >
            <Send size={18} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
