import { X, UserPlus, Image as ImageIcon, Mail, Lock, User, MessageCircle, MapPin, Eye, EyeOff, Settings, History, Calendar, CheckCircle2, Truck, Box, ShoppingBag, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, setDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { formatWhatsappNumber } from '../lib/utils';

export interface UserProfile {
  uid: string;
  username: string;
  profileImage: string;
  whatsapp?: string;
  location?: string;
  email?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserProfile) => void;
  initialUser?: UserProfile | null;
}

export default function AuthModal({ isOpen, onClose, onLogin, initialUser }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(true); // Default to Create Account for new users
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for Order History tracking inside the User Profile view
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);
  const [confirmCancelOrderId, setConfirmCancelOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialUser) {
        setUsername(initialUser.username || '');
        setEmail(initialUser.email || '');
        setProfileImage(initialUser.profileImage || '');
        setWhatsapp(initialUser.whatsapp || '');
        setLocation(initialUser.location || '');
        setIsSignUp(false); // Edit mode or already registered -> focus on profile update or login
        setActiveTab('profile'); // Default to profile tab on open
      } else {
        setUsername('');
        setEmail('');
        setPassword('');
        setProfileImage('');
        setWhatsapp('');
        setLocation('');
        setIsSignUp(true); // Default to sign up for new users
        setActiveTab('profile');
      }
      setError('');
    }
  }, [isOpen, initialUser]);

  // Real-time subscription to orders matching logged-in user username
  useEffect(() => {
    if (isOpen && initialUser && initialUser.username) {
      setOrdersLoading(true);
      const q = query(
        collection(db, 'orders'),
        where('customer_username', '==', initialUser.username.trim().toLowerCase())
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedOrders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort with newest order entries printed at the top
        fetchedOrders.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setOrders(fetchedOrders);
        setOrdersLoading(false);
      }, (err) => {
        console.error("Error subscribing to matching customer orders:", err);
        setOrdersLoading(false);
      });

      return () => unsubscribe();
    } else {
      setOrders([]);
    }
  }, [isOpen, initialUser]);

  const handleCancelOrder = async (orderId: string) => {
    setCancelingOrderId(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled'
      });
      setConfirmCancelOrderId(null);
    } catch (err: any) {
      console.error("Unified order cancel fail", err);
      setError("Failed to cancel this order. Please try again.");
    } finally {
      setCancelingOrderId(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (isSignUp && !username.trim()) {
      setError('Username is required for new accounts');
      return;
    }
    
    setLoading(true);
    
    try {
      const formattedUsername = username.trim().toLowerCase();
      const formattedWhatsapp = formatWhatsappNumber(whatsapp);
      const cleanEmail = email.trim().toLowerCase();

      const endpoint = isSignUp ? '/api/auth/user/signup' : '/api/auth/user/signin';
      const payload = isSignUp ? {
        email: cleanEmail,
        password,
        username: formattedUsername,
        whatsapp: formattedWhatsapp,
        location: location.trim(),
        profileImage
      } : {
        email: cleanEmail,
        password
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Success
      const userProfile: UserProfile = data.user;
      
      // Sync user records with app
      localStorage.setItem('user', JSON.stringify(userProfile));
      localStorage.setItem('user_token', data.token);
      onLogin(userProfile);
      onClose();
    } catch (err: any) {
      console.error('Unified Auth error:', err);
      setError(err.message || 'Something went wrong. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm md:block hidden"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className={`relative bg-white w-full h-full md:h-auto md:max-h-[90vh] md:rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 flex flex-col pt-12 md:pt-8 transition-all duration-300 ${initialUser ? 'md:max-w-xl' : 'md:max-w-md'}`}
      >
        <button 
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 z-10 cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="flex-1 overflow-y-auto no-scrollbar pr-1 scroll-smooth">
          <div className="text-center mb-6 mt-2">
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <UserPlus size={28} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {initialUser ? 'Your Profile' : (isSignUp ? 'Create Safe Profile' : 'Access Profile')}
            </h2>
            <p className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 mt-1">
              {initialUser ? 'Manage info or track orders' : (isSignUp ? 'Sign up & lock records securely' : 'Sign in to access order state')}
            </p>
          </div>

          {/* User Profile View Tabs Switcher */}
          {initialUser && (
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'profile' 
                    ? 'bg-white text-slate-900 shadow-sm font-black' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Settings size={14} />
                Profile Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'orders' 
                    ? 'bg-white text-slate-900 shadow-sm font-black' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <History size={14} />
                Order History
                {orders.length > 0 && (
                  <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse-subtle">
                    {orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'cancelled_admin').length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Mode Switcher Buttons */}
          {!initialUser && (
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-5 border border-slate-150">
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setError(''); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setError(''); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${!isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Sign In
              </button>
            </div>
          )}

          {/* Profile form section */}
          {(!initialUser || activeTab === 'profile') && (
            <form onSubmit={handleAuth} className="space-y-4 text-left">
              {error && (
                <div className="bg-rose-50 text-rose-650 p-3 rounded-xl text-xs font-bold text-center border border-rose-100 leading-tight">
                  {error}
                </div>
              )}
              
              {/* Email Field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Email for Safety & Recovery
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. name@email.com"
                    value={email}
                    disabled={!!initialUser}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all text-xs font-bold text-slate-800 disabled:opacity-60"
                  />
                </div>
                <p className="text-[8px] text-slate-400 mt-1 font-bold">Use a real email to recover your account if you sign in on another phone.</p>
              </div>

              {/* Password Field */}
              {!initialUser && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    {isSignUp ? 'Create Account Password' : 'Enter Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all text-xs font-bold text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {isSignUp && (
                    <p className="text-[8px] text-slate-400 mt-1 font-bold">Remember this password to log in on other devices.</p>
                  )}
                </div>
              )}

              {/* Fields visible ONLY during Sign Up (Register) or Edit Profile */}
              {(isSignUp || !!initialUser) && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        required
                        placeholder="e.g. john_doe"
                        value={username}
                        disabled={!!initialUser}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all text-xs font-bold text-slate-800 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      WhatsApp Number
                    </label>
                    <div className="relative">
                      <MessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="tel"
                        placeholder="e.g. 01712345678"
                        value={whatsapp}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWhatsapp(val);
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all text-xs font-bold text-slate-800"
                      />
                    </div>
                    <p className="text-[9px] text-slate-455 mt-1 font-medium px-1">Will be formatted into global standard +88017... format automatically</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Delivery Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 text-slate-400" size={16} />
                      <textarea
                        placeholder="Full delivery destination in Bangladesh"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all text-xs font-bold text-slate-800 resize-none h-16"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Profile Photo
                    </label>
                    <div className="flex items-center gap-3 bg-slate-50 p-2 border border-slate-150 rounded-xl">
                      <div 
                        className="w-12 h-12 rounded-xl bg-white border border-dashed border-slate-350 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {profileImage ? (
                          <img src={profileImage} alt="Profile" className="w-full h-full object-cover animate-fade-in" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-750 border border-slate-200 font-extrabold rounded-lg text-[10px] uppercase transition-colors w-full cursor-pointer"
                        >
                          Upload Photo
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleImageChange} 
                          accept="image/*" 
                          className="hidden" 
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-900 text-white text-xs uppercase tracking-widest font-black rounded-xl hover:bg-black transition-all disabled:opacity-50 mt-4 active:scale-95 cursor-pointer shadow-md shadow-slate-900/10 flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : (initialUser ? 'Update Settings' : (isSignUp ? 'Register & secure' : 'Secure Login'))}
              </button>
            </form>
          )}

          {/* Real-time Order History Section */}
          {initialUser && activeTab === 'orders' && (
            <div className="space-y-4 text-left animate-in fade-in slide-in-from-bottom-2 duration-200">
              {ordersLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Loading purchase history...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                  <ShoppingBag className="w-10 h-10 text-slate-350 mx-auto mb-3" />
                  <p className="text-slate-700 font-extrabold text-sm">No orders recorded</p>
                  <p className="text-slate-400 text-[11px] mt-1 font-medium max-w-xs mx-auto leading-normal">
                    Any orders placed using your username will appear here automatically with real-time delivery tracking steps!
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 no-scrollbar pb-6">
                  {orders.map((order) => {
                    const itemsList = (() => {
                      if (order.items && order.items.length > 0) {
                        return order.items;
                      }
                      const rawIds = (order.product_id || '').split(',').map((s: any) => s.trim()).filter(Boolean);
                      const rawNames = (order.product_name || '').split('\n').map((s: any) => s.trim()).filter(Boolean);

                      if (rawIds.length === 0) {
                        return [{
                          product_id: 'legacy',
                          name: order.product_name || 'Pbazar Item',
                          image: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?auto=format&fit=crop&w=300&q=80',
                          price: order.price,
                          quantity: 1
                        }];
                      }

                      return rawIds.map((pId: string, idx: number) => {
                        const nameString = rawNames[idx] || rawNames[0] || order.product_name;
                        let quantity = 1;
                        let cleanedName = nameString;
                        const qtyMatch = nameString.match(/^(\d+)x\s*(.*)/i);
                        if (qtyMatch) {
                          quantity = parseInt(qtyMatch[1]);
                          cleanedName = qtyMatch[2];
                        }
                        return {
                          product_id: pId,
                          name: cleanedName,
                          image: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?auto=format&fit=crop&w=300&q=80',
                          price: order.price / rawIds.length,
                          quantity: quantity
                        };
                      });
                    })();

                    const deliveryFee = order.price >= 3000 ? 0 : ((order.location || '').toLowerCase().includes('dhaka') ? 60 : 120);

                    return (
                      <div key={order.id} className="bg-slate-50 border border-slate-150 rounded-2xl p-4 shadow-sm text-xs relative overflow-hidden">
                        
                        {/* Top Meta info */}
                        <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-3">
                          <div>
                            <span className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest block font-sans">
                              Order #{order.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400 block mt-0.5">
                              {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Status</span>
                            {(() => {
                              let statusText = 'Pending';
                              let statusColor = 'text-yellow-650 bg-yellow-50 border-yellow-250';
                              if (order.status === 'packing') { statusText = 'Packing'; statusColor = 'text-blue-600 bg-blue-50 border-blue-200'; }
                              else if (order.status === 'shipping') { statusText = 'Shipping'; statusColor = 'text-purple-600 bg-purple-50 border-purple-200'; }
                              else if (order.status === 'delivery') { statusText = 'Out for Delivery'; statusColor = 'text-orange-650 bg-orange-50 border-orange-200'; }
                              else if (order.status === 'completed') { statusText = 'Completed'; statusColor = 'text-emerald-605 bg-emerald-50 border-emerald-200 font-bold'; }
                              else if (order.status === 'cancelled' || order.status === 'cancelled_admin') { statusText = order.status === 'cancelled_admin' ? 'Expired' : 'Cancelled'; statusColor = 'text-rose-600 bg-rose-50 border-rose-250 font-black'; }

                              return (
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColor} mt-0.5`}>
                                  {statusText}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Order Recipient Address */}
                        {order.location && (
                          <div className="mb-3.5 bg-white p-2.5 rounded-xl border border-slate-100/70 flex gap-2 items-start text-left">
                            <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Deliver To</span>
                              <p className="text-[10.5px] font-bold text-slate-700 leading-normal truncate">{order.customer_name} ({order.location})</p>
                            </div>
                          </div>
                        )}

                        {/* Order Products List with Counter Qty */}
                        <div className="space-y-2 mb-3.5 text-left">
                          {itemsList.map((itm: any, idx: number) => (
                            <div key={idx} className="flex gap-2.5 items-center bg-white p-2 border border-slate-100 rounded-xl">
                              <div className="w-10 h-10 rounded-lg bg-slate-50 overflow-hidden shrink-0 border border-slate-150 p-0.5">
                                <img src={itm.image} alt="" className="w-full h-full object-cover rounded-md" referrerPolicy="no-referrer" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[10.5px] font-extrabold text-slate-800 block truncate">{itm.name}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[8.5px] font-black text-orange-650 bg-orange-50 border border-orange-100 px-1 py-0.25 rounded shrink-0">
                                    {itm.quantity}x
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                                    {itm.price.toLocaleString()}৳
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pricing Breakout with Delivery Display */}
                        <div className="bg-white p-3 rounded-xl border border-slate-100 font-sans space-y-1.5 text-left mb-4">
                          <div className="flex justify-between text-[10.5px]">
                            <span className="text-slate-400 font-bold">Subtotal:</span>
                            <span className="font-extrabold text-slate-700 font-mono">{order.price.toLocaleString()}৳</span>
                          </div>
                          <div className="flex justify-between text-[10.5px]">
                            <span className="text-slate-400 font-bold">Delivery Fee:</span>
                            <span className="font-extrabold text-slate-700 font-mono">
                              {deliveryFee === 0 ? 'FREE' : `${deliveryFee}৳`}
                            </span>
                          </div>
                          <div className="border-t border-slate-100 pt-1.5 mt-1.5 flex justify-between items-center text-[11px]">
                            <span className="font-black text-slate-800 uppercase tracking-wide">Cash on Delivery Total:</span>
                            <span className="font-black text-orange-650 font-mono text-xs">{(order.price + deliveryFee).toLocaleString()}৳</span>
                          </div>
                        </div>

                        {/* Visual Pipeline Steps */}
                        {order.status !== 'cancelled' && order.status !== 'cancelled_admin' && (
                          <div className="relative py-2 my-2.5 px-1 bg-white p-3 rounded-xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mb-3 px-1 text-left">Tracking Status Timeline</p>
                            
                            <div className="relative flex justify-between items-center">
                              {/* Connector line */}
                              <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-slate-100 -z-0" />
                              <div 
                                className={`absolute top-3.5 left-4 h-0.5 rounded-full -z-0 transition-all duration-500 ${order.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-900'}`}
                                style={{ 
                                  width: 
                                    order.status === 'completed' ? '100%' :
                                    order.status === 'delivery' ? '75%' :
                                    order.status === 'shipping' ? '50%' :
                                    order.status === 'packing' ? '25%' : '0%' 
                                }}
                              />

                              {/* Timeline Node helper */}
                              {['pending', 'packing', 'shipping', 'delivery', 'completed'].map((st, idx) => {
                                const stepLabels: Record<string, string> = {
                                  pending: 'Pending',
                                  packing: 'Pack',
                                  shipping: 'Ship',
                                  delivery: 'Deliver',
                                  completed: 'Done'
                                };
                                
                                const statusesInArray = ['pending', 'packing', 'shipping', 'delivery', 'completed'];
                                const oIdx = statusesInArray.indexOf(order.status || 'pending');
                                const isPassedOrCurrent = oIdx >= idx;
                                const isCurrent = order.status === st;

                                return (
                                  <div key={st} className="flex flex-col items-center relative z-10 flex-1">
                                    <div 
                                      className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                                        st === 'completed' && order.status === 'completed'
                                          ? 'border-emerald-500 bg-emerald-500 text-white'
                                          : isPassedOrCurrent 
                                            ? 'border-slate-900 bg-slate-900 text-white' 
                                            : 'border-slate-200 bg-white text-slate-300'
                                      } ${isCurrent ? 'ring-2 ring-orange-500 ring-offset-1 scale-110' : ''}`}
                                    >
                                      {st === 'completed' ? (
                                        <CheckCircle2 size={12} />
                                      ) : st === 'shipping' || st === 'delivery' ? (
                                        <Truck size={12} />
                                      ) : st === 'packing' ? (
                                        <Box size={12} />
                                      ) : (
                                        <Clock size={12} />
                                      )}
                                    </div>
                                    <span className={`text-[8px] font-bold mt-1.5 uppercase ${
                                      isPassedOrCurrent ? 'text-slate-800' : 'text-slate-400'
                                    }`}>
                                      {stepLabels[st]}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Expired warning */}
                        {order.status === 'cancelled_admin' && (
                          <div className="mt-2 text-[10px] bg-rose-50 text-rose-750 border border-rose-100 p-2.5 rounded-xl font-bold leading-relaxed text-left">
                            your order is expyered so we cant verifyed
                          </div>
                        )}

                        {/* User ordered Cancellation warning */}
                        {order.status === 'cancelled' && (
                          <div className="mt-2 text-[10px] bg-red-50 text-red-700 border border-red-150 p-2.5 rounded-xl font-bold text-left">
                            This order was successfully cancelled at your request.
                          </div>
                        )}

                        {/* Cancel order action */}
                        {order.status === 'pending' && (
                          <div className="mt-3 flex justify-end">
                            {confirmCancelOrderId === order.id ? (
                              <div className="w-full bg-red-50/70 p-3 rounded-xl border border-red-150 flex flex-col gap-2.5 text-left animate-in fade-in duration-150">
                                <p className="text-[10px] font-extrabold text-red-800 uppercase tracking-wider">Are you sure you want to cancel?</p>
                                <div className="flex gap-2 justify-end text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmCancelOrderId(null)}
                                    className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-705 rounded-lg font-bold transition-all hover:bg-slate-50 cursor-pointer"
                                  >
                                    Keep Order
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmCancelOrderId(null);
                                      handleCancelOrder(order.id);
                                    }}
                                    disabled={cancelingOrderId === order.id}
                                    className="px-2.5 py-1.5 bg-rose-600 text-white rounded-lg font-black transition-all hover:bg-rose-750 disabled:opacity-50 cursor-pointer"
                                  >
                                    {cancelingOrderId === order.id ? 'Canceling...' : 'Confirm Cancel'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmCancelOrderId(order.id)}
                                className="px-3 py-1.5 text-rose-650 bg-rose-50 border border-rose-150 hover:bg-rose-100 transition-colors rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                              >
                                Cancel Order
                              </button>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}

