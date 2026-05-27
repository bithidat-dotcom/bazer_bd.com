import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, setDoc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MessageSquare, Send, User, ChevronRight, Search } from 'lucide-react';

interface Chat {
  id: string;
  customer_username: string;
  customer_image: string | null;
  last_message: string;
  updated_at: string;
  unread_count: number;
}

interface Message {
  id: string;
  text: string;
  sender: 'customer' | 'admin';
  created_at: string;
}

export default function ChatManager() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      orderBy('updated_at', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Chat[];
      setChats(chatData);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedChat) return;

    const q = query(
      collection(db, 'chats', selectedChat.id, 'messages'),
      orderBy('created_at', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Message[];
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsub();
  }, [selectedChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedChat || loading) return;

    const text = input.trim();
    setInput('');
    setLoading(true);

    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), {
        text,
        sender: 'admin',
        created_at: now
      });

      await setDoc(doc(db, 'chats', selectedChat.id), {
        last_message: text,
        updated_at: now
      }, { merge: true });

      scrollToBottom();
    } catch (err) {
      console.error('Admin send error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 h-[600px] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <MessageSquare className="text-slate-400" />
          <h3 className="font-bold text-slate-800">Support Chats</h3>
        </div>
        <div className="flex-1 overflow-y-auto scroll-container">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 ${
                selectedChat?.id === chat.id ? 'bg-slate-50' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                {chat.customer_image ? (
                  <img src={chat.customer_image} alt={chat.customer_username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800 truncate text-sm">{chat.customer_username}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(chat.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="text-xs text-slate-500 truncate">{chat.last_message}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          ))}
          {chats.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm">No chats found</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat View */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {selectedChat ? (
          <>
            <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                {selectedChat.customer_image ? (
                  <img src={selectedChat.customer_image} alt={selectedChat.customer_username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User size={16} />
                  </div>
                )}
              </div>
              <h3 className="font-bold text-slate-800 tracking-tight">{selectedChat.customer_username}</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-container bg-slate-50">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex w-full mb-2 ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'admin' ? (
                    <div className="flex flex-col items-end max-w-[85%]">
                      <div className="flex items-center gap-1.5 font-sans">
                        <div className="bg-slate-900 text-white p-3 rounded-2xl rounded-tr-none text-sm font-medium shadow-sm">
                          ({msg.text})
                        </div>
                        <span className="text-[11px] font-bold text-orange-600 font-mono">studio&lt;</span>
                      </div>
                      <div className="text-[9px] mt-1 opacity-50 text-right pr-2">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start max-w-[85%]">
                      <div className="flex items-center gap-1.5 font-sans">
                        <span className="text-[11px] font-bold text-slate-500 font-mono">&gt;user</span>
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

            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type reply..."
                className="flex-1 bg-slate-100 border-none rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-black transition-all"
              />
              <button 
                type="submit"
                disabled={!input.trim() || loading}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all disabled:opacity-50"
              >
                <Send size={16} />
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="font-bold text-slate-500">Select a chat to respond</p>
          </div>
        )}
      </div>
    </div>
  );
}
