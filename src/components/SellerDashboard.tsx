import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, updateDoc, doc, addDoc, getDocs, query, where, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { syncProductToSupabase } from '../lib/supabase';
import { setFirestoreQuotaExceeded, isFirestoreQuotaExceeded } from '../lib/db-sync';
import { 
  ShoppingBag, Cpu, Bot, Laptop, Shirt, Utensils, Sparkles, Tv, Scissors, Dumbbell, ShoppingCart, LayoutGrid, 
  Plus, Search, Tag, Clock, User2, Phone, Facebook, Instagram, LogOut, Lock, Mail, Info, Star, MessageSquare, 
  Check, ArrowRight, Eye, EyeOff, Globe, AlertCircle, Trash2, Edit, CheckCircle2, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Storage } from '../lib/storage';

interface SellerUser {
  username: string;
  display_name: string;
  email: string;
  whatsapp: string;
  logo: string;
  facebook?: string;
  tiktok?: string;
  instagram?: string;
  is_verified?: boolean;
}

export default function SellerDashboard() {
  const navigate = useNavigate();
  // Session authentication states
  const [seller, setSeller] = useState<SellerUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  // Auth Form Input States
  const [authForm, setAuthForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    whatsapp: '',
    logo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
    facebook: '',
    instagram: '',
    tiktok: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: 'success' });

  // Main Dashboard states
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'reviews' | 'settings'>('orders');
  const [loading, setLoading] = useState(false);

  // Modal / Form states for product creation
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    discount: '0',
    category: 'PC',
    image: '',
    description: '',
    imagesInput: '',
    stock: '20',
    ram: '',
    storage: '',
    screen_hz: '',
    battery: '',
    watt_amp: '',
    discountTimelineHours: '24',
    flashSaleEnd: '',
    is_new: true,
  });

  const categories = [
    { name: 'Food', icon: Utensils },
    { name: 'Fashion', icon: Shirt },
    { name: 'Electronics', icon: Tv },
    { name: 'Beauty', icon: Sparkles },
    { name: 'Gadget', icon: Cpu },
    { name: 'Robotic', icon: Bot },
    { name: 'PC', icon: Laptop },
    { name: 'Cloth', icon: Scissors },
    { name: 'Sports', icon: Dumbbell },
    { name: 'Grocery', icon: ShoppingCart },
  ];

  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // 1. Check for stored login session on mount & verify server connection
  useEffect(() => {
    const storedSeller = Storage.getSmall<SellerUser>('seller_user');
    if (storedSeller) {
      setSeller(storedSeller);
    }
    setAuthLoading(false);

    // Verify server connectivity with retry logic
    const checkConnection = () => {
      fetch('/api/health')
        .then(res => res.json())
        .then(data => {
          if (data.status === 'ok') setServerStatus('connected');
          else setServerStatus('disconnected');
        })
        .catch(() => setServerStatus('disconnected'));
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Show floating status alert helpers
  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: 'success' }), 4005);
  };

  // 2. Auth Actions: Register or login seller via secure server proxy
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    const targetUsername = authForm.username.trim().toLowerCase();
    
    if (!targetUsername) {
      setAuthError('Please enter a username');
      setLoading(false);
      return;
    }

    if (!authForm.email.trim()) {
      setAuthError('Please enter email address');
      setLoading(false);
      return;
    }

    if (!authForm.password || authForm.password.length < 5) {
      setAuthError('Password must be at least 5 characters');
      setLoading(false);
      return;
    }

    try {
      const endpoint = authMode === 'signup' ? '/api/auth/seller/signup' : '/api/auth/seller/signin';
      const payload = authMode === 'signup' ? {
        username: targetUsername,
        email: authForm.email.trim().toLowerCase(),
        password: authForm.password,
        displayName: authForm.displayName.trim(),
        whatsapp: authForm.whatsapp.trim(),
        logo: authForm.logo.trim(),
        facebook: authForm.facebook.trim(),
        instagram: authForm.instagram.trim(),
        tiktok: authForm.tiktok.trim()
      } : {
        username: targetUsername,
        password: authForm.password
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
      const authUser: SellerUser = data.user;
      Storage.setSmall('seller_user', authUser);
      Storage.setSmall('seller_token', data.token);
      setSeller(authUser);
      
      const welcomeMsg = authMode === 'signup' ? 'Registration completed! Welcome to Pbazar Partner Portal' : `Welcome back, ${authUser.display_name}!`;
      showAlert(welcomeMsg, 'success');
      
    } catch (err: any) {
      console.error('Error during seller auth: ', err);
      setAuthError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Storage.removeSmall('seller_user');
    Storage.removeSmall('seller_token');
    setSeller(null);
    showAlert('Successfully logged out.', 'success');
  };

  // 3. Real-time product snapshot listener syncing products belong to logged-in seller
  useEffect(() => {
    if (!seller) return;

    setLoading(true);
    // Listen for products matching current seller's username (e.g. registered under self only)
    const qSelf = query(
      collection(db, 'products'),
      where('seller', '==', seller.display_name)
    );

    const unsubProd = onSnapshot(collection(db, 'products'), (snapshot) => {
      const allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter strictly by the current seller's display_name or username representation to enforce secure segmentation
      const filtered = allProducts.filter((p: any) => 
        (p.seller || '').toLowerCase() === seller.display_name.toLowerCase() ||
        (p.seller_id || '').toLowerCase() === seller.username.toLowerCase()
      );
      setProducts(filtered);
      setLoading(false);
    }, (err: any) => {
      console.error("Products listen error", err);
      if (err.code === 'resource-exhausted' || err.message?.includes('quota')) {
        setFirestoreQuotaExceeded(true);
      }
      setLoading(false);
    });

    // Sub to all reviews so we can aggregate reviews matching current seller's products
    const unsubReviews = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      const parsedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllReviews(parsedReviews);
    }, (err: any) => {
      console.error("Reviews listener failed:", err);
      if (err.code === 'resource-exhausted' || err.message?.includes('quota')) {
        setFirestoreQuotaExceeded(true);
      }
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = allOrders.filter((order: any) => {
        if (order.seller_ids && order.seller_ids.includes(seller.username)) {
          return true;
        }
        if (order.items && Array.isArray(order.items)) {
          return order.items.some((item: any) => 
            (item.seller_id || '').toLowerCase() === seller.username.toLowerCase() ||
            (item.seller || '').toLowerCase() === seller.display_name.toLowerCase()
          );
        }
        return false;
      });
      // Sort newest first
      filtered.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setOrders(filtered);
    }, (err: any) => {
      console.error("Orders listener failed:", err);
      if (err.code === 'resource-exhausted' || err.message?.includes('quota')) {
        setFirestoreQuotaExceeded(true);
      }
    });

    return () => {
      unsubProd();
      unsubReviews();
      unsubOrders();
    };
  }, [seller]);

  // Sync reviews associated with seller products whenever all reviews or seller's products update
  useEffect(() => {
    if (products.length === 0 || allReviews.length === 0) {
      setMyReviews([]);
      return;
    }
    const myProdIds = products.map(p => p.id);
    const matched = allReviews.filter(rev => myProdIds.includes(rev.product_id));
    setMyReviews(matched);
  }, [products, allReviews]);

  // Form setup helpers
  const openAddProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      price: '',
      discount: '0',
      category: 'PC',
      image: '',
      description: '',
      imagesInput: '',
      stock: '25',
      ram: '',
      storage: '',
      screen_hz: '',
      battery: '',
      watt_amp: '',
      discountTimelineHours: '24',
      flashSaleEnd: '',
      is_new: true,
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: any) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name || '',
      price: String(prod.price || ''),
      discount: String(prod.discount || '0'),
      category: prod.category || 'PC',
      image: prod.image || '',
      description: prod.description || '',
      imagesInput: Array.isArray(prod.images) ? prod.images.join(', ') : '',
      stock: String(prod.stock !== undefined ? prod.stock : '20'),
      ram: prod.ram || '',
      storage: prod.storage || '',
      screen_hz: prod.screen_hz || '',
      battery: prod.battery || '',
      watt_amp: prod.watt_amp || '',
      discountTimelineHours: String(prod.discountTimelineHours || '24'),
      flashSaleEnd: prod.flashSaleEnd || '',
      is_new: prod.is_new !== false,
    });
    setIsProductModalOpen(true);
  };

  // Submit Product Form action
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller) return;

    if (!productForm.name.trim() || !productForm.price.trim()) {
      alert("Product title and price amount must be set.");
      return;
    }

    // Auto package payload with logged-in seller credentials securely (A seller upload = registered by A seller metadata)
    const payload = {
      name: productForm.name.trim(),
      price: Number(productForm.price),
      discount: Number(productForm.discount) || 0,
      category: productForm.category,
      image: productForm.image.trim() || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
      description: productForm.description.trim(),
      images: productForm.imagesInput ? productForm.imagesInput.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      rating: editingProduct?.rating || 4.7,
      created_at: editingProduct?.created_at || new Date().toISOString(),
      stock: Number(productForm.stock || 20),
      ram: productForm.ram.trim() || '',
      storage: productForm.storage.trim() || '',
      screen_hz: productForm.screen_hz.trim() || '',
      battery: productForm.battery.trim() || '',
      watt_amp: productForm.watt_amp.trim() || '',
      discountTimelineHours: Number(productForm.discountTimelineHours) || 24,
      flashSaleEnd: productForm.flashSaleEnd || '',
      is_new: productForm.is_new,
      
      // Strict ownership properties so other sellers are locked out and customers contact the correct seller
      seller: seller.display_name,
      seller_id: seller.username,
      seller_whatsapp: seller.whatsapp,
      seller_logo: seller.logo,
    };

    try {
      let savedProductId = '';
      if (editingProduct) {
        // Confirm ownership before edit just in case
        if (editingProduct.seller_id?.toLowerCase() !== seller.username.toLowerCase() && editingProduct.seller?.toLowerCase() !== seller.display_name.toLowerCase()) {
          alert("Error: You only possess authorization to edit products owned by your profile!");
          return;
        }
        await updateDoc(doc(db, 'products', editingProduct.id), payload);
        savedProductId = editingProduct.id;
        showAlert(`"${payload.name}" updated successfully!`, 'success');
      } else {
        const docRef = await addDoc(collection(db, 'products'), payload);
        savedProductId = docRef.id;
        showAlert(`"${payload.name}" submitted & registered to catalog!`, 'success');
      }

      // Sync to Supabase Backup
      try {
        await syncProductToSupabase({ id: savedProductId, ...payload });
      } catch (backupErr) {
        console.warn("Supabase backup sync failed:", backupErr);
      }

      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error("Save product failed:", err);
      alert("Save failed: " + err.message);
    }
  };

  // Sync / update seller settings (Store settings)
  const [settingsForm, setSettingsForm] = useState({
    displayName: '',
    whatsapp: '',
    logo: '',
    facebook: '',
    tiktok: '',
    instagram: ''
  });

  useEffect(() => {
    if (seller) {
      setSettingsForm({
        displayName: seller.display_name || '',
        whatsapp: seller.whatsapp || '',
        logo: seller.logo || '',
        facebook: seller.facebook || '',
        tiktok: seller.tiktok || '',
        instagram: seller.instagram || ''
      });
    }
  }, [seller, activeTab]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller) return;

    if (!settingsForm.displayName.trim() || !settingsForm.whatsapp.trim()) {
      alert("Store Display Name and WhatsApp Contact Number are required!");
      return;
    }

    try {
      const updatedUser: SellerUser = {
        ...seller,
        display_name: settingsForm.displayName.trim(),
        whatsapp: settingsForm.whatsapp.trim(),
        logo: settingsForm.logo.trim() || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
        facebook: settingsForm.facebook.trim(),
        tiktok: settingsForm.tiktok.trim(),
        instagram: settingsForm.instagram.trim()
      };

      // 1. Sync authentication records
      await updateDoc(doc(db, 'sellers_auth', seller.username), {
        display_name: updatedUser.display_name,
        whatsapp: updatedUser.whatsapp,
        logo: updatedUser.logo,
        facebook: updatedUser.facebook,
        tiktok: updatedUser.tiktok,
        instagram: updatedUser.instagram
      });

      // 2. Sync general listing 'sellers' collection
      await setDoc(doc(db, 'sellers', seller.username), {
        name: updatedUser.display_name,
        whatsapp: updatedUser.whatsapp,
        logo: updatedUser.logo,
        facebook: updatedUser.facebook || '',
        tiktok: updatedUser.tiktok || '',
        instagram: updatedUser.instagram || '',
        is_top: true
      }, { merge: true });

      // 3. Update local state and sessions
      Storage.setSmall('seller_user', updatedUser);
      setSeller(updatedUser);
      showAlert("Store details updated on server catalog!", "success");
    } catch (err: any) {
      console.error("Failed storing profile settings:", err);
      alert("Profile update failing: " + err.message);
    }
  };

  const filteredItems = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Return loader for authenticating state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-slate-205 border-t-orange-600 rounded-full animate-spin border-slate-200" />
        <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">Loading Partner Console...</p>
      </div>
    );
  }

  // A. RENDER LOGIN SCREEN IS SELLER IS UNAUTHORIZED
  if (!seller) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center px-4 py-12 select-none md:select-text">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100/10">
          
          {/* Header Banner */}
          <div className="p-8 bg-slate-950 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-650/30 to-slate-950/20 z-0" />
            <div className="relative z-10 space-y-2">
              <span className="inline-block px-3 py-1 bg-orange-600/20 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                PARTNER PORTAL
              </span>
              <h1 className="text-3xl font-black text-white tracking-tighter">pbazar.com</h1>
              <p className="text-xs font-bold text-slate-400">Secure automated seller hub & inventory console</p>
            </div>
          </div>

          {/* Form container code */}
          <div className="p-8 space-y-6">
            
            {/* Form tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button 
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthError(''); }}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${authMode === 'signin' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
              >
                Sign In
              </button>
              <button 
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${authMode === 'signup' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
              >
                Register
              </button>
            </div>

            {authError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-650 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              
              {/* Username Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Seller Username ID</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">@</span>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. fashion_hub"
                    value={authForm.username}
                    onChange={(e) => setAuthForm({...authForm, username: e.target.value})}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Conditional signup details */}
              {authMode === 'signup' && (
                <>
                  {/* Shop Display Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Store Display Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Trendy Collections"
                      value={authForm.displayName}
                      onChange={(e) => setAuthForm({...authForm, displayName: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800"
                    />
                  </div>

                  {/* WhatsApp contact number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">WhatsApp Contact No</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        required
                        placeholder="e.g. 01712345678"
                        value={authForm.whatsapp}
                        onChange={(e) => setAuthForm({...authForm, whatsapp: e.target.value})}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  {/* Seller Store Logo URL */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Store Logo URL</label>
                    <input 
                      type="url"
                      placeholder="e.g. https://images.unsplash.com/..."
                      value={authForm.logo}
                      onChange={(e) => setAuthForm({...authForm, logo: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800"
                    />
                  </div>
                </>
              )}

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="email"
                    required
                    placeholder="partner@example.com"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Access Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Optional Social Handles on Signup */}
              {authMode === 'signup' && (
                <div className="space-y-3 pt-2.5 border-t border-slate-100">
                  <h4 className="text-[9px] font-black text-slate-450 uppercase tracking-widest text-slate-400">Optional Store Social Profiles</h4>
                  <div className="space-y-2">
                    {/* Facebook */}
                    <div className="relative">
                      <Facebook className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      <input 
                        type="url"
                        placeholder="Facebook page link"
                        value={authForm.facebook}
                        onChange={(e) => setAuthForm({...authForm, facebook: e.target.value})}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-lg text-[11px] font-bold focus:outline-none focus:bg-white text-slate-700"
                      />
                    </div>
                    {/* Instagram */}
                    <div className="relative">
                      <Instagram className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      <input 
                        type="url"
                        placeholder="Instagram profile link"
                        value={authForm.instagram}
                        onChange={(e) => setAuthForm({...authForm, instagram: e.target.value})}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-205 focus:border-orange-500 rounded-lg text-[11px] font-bold focus:outline-none focus:bg-white text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer"
              >
                {loading ? 'Authenticating Gateway...' : (authMode === 'signin' ? 'Unlock Partner Dashboard' : 'Complete Partner Onboarding')}
              </button>
            </form>

            <div className="text-center">
              <button 
                onClick={() => navigate('/')}
                className="text-slate-400 hover:text-slate-650 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 mx-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 cursor-pointer"
              >
                Go Back to Storefront
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // B. MAIN PARTNER DASHBOARD RENDER
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Side status messaging toast */}
      <AnimatePresence>
        {statusMessage.text && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className={`fixed right-6 bottom-6 z-50 p-4 rounded-xl border text-xs font-black shadow-lg flex items-center gap-2.5 uppercase tracking-wide text-white ${statusMessage.type === 'success' ? 'bg-emerald-600 border-emerald-500' : 'bg-red-600 border-red-500'}`}
          >
            {statusMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DASHBOARD NAVBAR CONTAINER WITH MODULAR WRAPPING */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header bar detailing profile, stats banner and logs */}
        <header className="bg-white border-b border-slate-100 p-5 px-6 shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 p-1 overflow-hidden shrink-0 border border-slate-150 flex items-center justify-center p-0.5 relative shadow-inner">
              <img src={seller.logo} alt="" className="w-full h-full object-contain rounded-xl" referrerPolicy="referrer" />
              {seller.is_verified && (
                <div className="absolute -bottom-1 -right-1 bg-blue-600 border border-white text-white w-5 h-5 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={10} className="stroke-[3]" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {seller.is_verified ? (
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">Verified Creator Account</span>
                ) : (
                  <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-100 px-2 py-0.5 rounded">Standard Partner Portal</span>
                )}
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1 ${
                  serverStatus === 'connected' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                  serverStatus === 'checking' ? 'bg-slate-50 text-slate-400 border-slate-100' : 
                  'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  <div className={`w-1 h-1 rounded-full ${
                    serverStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 
                    serverStatus === 'checking' ? 'bg-slate-300' : 
                    'bg-rose-500'
                  }`} />
                  Server {serverStatus}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <h1 className="text-xl font-black text-slate-800 tracking-tight capitalize">{seller.display_name}</h1>
                {seller.is_verified && (
                  <CheckCircle2 size={16} className="text-blue-500 fill-blue-50" />
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-bold tracking-tight">Active registration ID: @{seller.username}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 bg-white"
            >
              <Globe size={13} />
              View Storefront
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-rose-100 hover:border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 bg-white"
            >
              <LogOut size={13} />
              Disconnect
            </button>
          </div>
        </header>

        {/* Dashboard statistics showcase panel */}
        <div className="p-6 pb-2 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Registered Catalog Items</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-800">{products.length}</span>
              <span className="text-[11px] font-bold text-slate-400">Products</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1 leading-none">Cataloged to your shop portal list</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Product Feedbacks</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-800">{myReviews.length}</span>
              <span className="text-[11px] font-bold text-slate-400">Verified Reviews</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1 leading-none">Reviews submitted for your items</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Average Rating Grade</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-800">
                {myReviews.length > 0 
                  ? (myReviews.reduce((sum, current) => sum + current.rating, 0) / myReviews.length).toFixed(1)
                  : '4.8'}
              </span>
              <div className="flex items-center text-amber-500">
                <Star size={16} className="fill-current stroke-[2]" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1 leading-none">Quality satisfaction score card</p>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="px-6 py-2 border-b border-slate-150 flex items-center justify-between gap-5 flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4.5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${activeTab === 'orders' ? 'bg-slate-900 border border-slate-900 text-white shadow-md' : 'bg-white border border-slate-150 hover:bg-slate-50 text-slate-450 text-slate-600'}`}
            >
              <Package size={14} />
              My Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4.5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${activeTab === 'products' ? 'bg-slate-900 border border-slate-900 text-white shadow-md' : 'bg-white border border-slate-150 hover:bg-slate-50 text-slate-450 text-slate-600'}`}
            >
              <ShoppingBag size={14} />
              My Products ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-4.5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${activeTab === 'reviews' ? 'bg-slate-900 border border-slate-900 text-white shadow-md' : 'bg-white border border-slate-150 hover:bg-slate-50 text-slate-450 text-slate-600'}`}
            >
              <MessageSquare size={14} />
              Customer Reviews ({myReviews.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4.5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-slate-900 border border-slate-900 text-white shadow-md' : 'bg-white border border-slate-150 hover:bg-slate-50 text-slate-450 text-slate-600'}`}
            >
              <User2 size={14} />
              Shop Settings
            </button>
          </div>

          {activeTab === 'products' && (
            <button
              onClick={openAddProductModal}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/10 active:scale-95 cursor-pointer shrink-0"
            >
              <Plus size={15} />
              Create New Product
            </button>
          )}
        </div>

        {/* Active view window container */}
        <div className="flex-1 p-6 overflow-y-auto">
          
          {/* TAB 0: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-150">
                <h3 className="text-lg font-black tracking-tight text-slate-800 mb-4">Store Orders</h3>
                {orders.length === 0 ? (
                  <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
                    <Package size={36} className="text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-black text-slate-800 mb-1">No Orders Yet</h3>
                    <p className="text-xs font-bold text-slate-500">Your customer orders will appear here when they are placed.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map(order => (
                      <div key={order.id} className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                              Order #{order.id.substring(0, 6)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {new Date(order.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-800">{order.customer_name}</h4>
                            <span className="text-xs text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                              {order.whatsapp}
                            </span>
                          </div>
                          <p className="text-xs text-slate-900 font-bold mt-1">
                            {order.location}
                            {(order.area || order.post_code) && (
                              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                {order.area}{order.post_code ? ` (${order.post_code})` : ''}
                              </span>
                            )}
                          </p>
                          
                          <div className="mt-3 space-y-1.5">
                            {order.items && order.items.map((item: any, idx: number) => {
                              // Only show items that belong to this seller
                              const isMine = (item.seller_id || '').toLowerCase() === seller.username.toLowerCase() || 
                                             (item.seller || '').toLowerCase() === seller.display_name.toLowerCase();
                              if (!isMine) return null;
                              return (
                                <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-150 w-fit">
                                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full shrink-0"></span>
                                  <span>{item.quantity}x {item.name}</span>
                                  <span className="text-slate-400">@ ৳{item.price}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t border-slate-100 md:border-none pt-3 md:pt-0">
                          <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${
                            order.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                            order.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            order.status === 'packing' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            order.status === 'shipping' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                            order.status === 'delivery' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                            order.status === 'completed' ? 'bg-green-50 text-green-600 border-green-200' :
                            'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: SELLER PRODUCTS CATALOG */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              
              {/* Search Bar section */}
              <div className="flex bg-white rounded-xl border border-slate-200 shadow-2xs h-11 items-center px-4 relative max-w-md">
                <Search size={15} className="text-slate-400 absolute left-4" />
                <input 
                  type="text"
                  placeholder="Filter products catalog by code or description..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-7 py-1 focus:outline-none text-xs font-bold text-slate-800"
                />
              </div>

              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-orange-605 animate-spin mx-auto" />
                  <p className="text-xs font-black text-slate-400 mt-3 uppercase tracking-wider">Syncing secure connection...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
                  <ShoppingBag size={45} className="text-slate-200 mx-auto mb-3" />
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">No registered products listed</h3>
                  <p className="text-slate-400 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed font-bold">
                    Add new items to start selling on pbazar portal! Any product you upload goes live instantly.
                  </p>
                  <button
                    onClick={openAddProductModal}
                    className="mt-4 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Add Product Now
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/70 border-b border-slate-150 text-[9px] font-black uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="p-4 px-5">Product Details</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Live Price</th>
                          <th className="p-4">Offer / Discount</th>
                          <th className="p-4">Stock Limit</th>
                          <th className="p-4 text-right px-5">Actions Check</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold">
                        {filteredItems.map((prod) => (
                          <tr key={prod.id} className="hover:bg-slate-50/30 transition-colors">
                            {/* Product Info */}
                            <td className="p-4 px-5 flex items-center gap-3">
                              <div className="w-11 h-11 bg-slate-50 border border-slate-150 rounded-lg p-0.5 overflow-hidden shrink-0">
                                <img src={prod.image} alt="" className="w-full h-full object-cover rounded-md" referrerPolicy="referrer" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-slate-800 text-xs tracking-tight truncate max-w-[200px]">{prod.name}</h4>
                                <div className="flex gap-1.5 items-center mt-1">
                                  {prod.is_new && (
                                    <span className="text-[7.5px] font-black bg-orange-600 text-white px-1 py-0.25 rounded uppercase tracking-wider">NEW</span>
                                  )}
                                  <span className="text-[8px] font-mono uppercase text-slate-400">ID: {prod.id.slice(-6).toUpperCase()}</span>
                                </div>
                              </div>
                            </td>

                            {/* Category Mapping */}
                            <td className="p-4 uppercase tracking-wider font-extrabold">
                              <span className="text-[9px] bg-slate-100 text-slate-705 border border-slate-150 px-2 py-0.75 rounded-md">
                                {prod.category}
                              </span>
                            </td>

                            {/* Real price with discount fallback calculations */}
                            <td className="p-4 font-mono font-black text-slate-800">
                              {prod.price.toLocaleString()}৳
                            </td>

                            {/* Offer details */}
                            <td className="p-4">
                              {prod.discount > 0 ? (
                                <span className="text-[9.5px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.75 rounded-md font-black">
                                  -{prod.discount}% OFF
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">No discount</span>
                              )}
                            </td>

                            {/* Inventory status */}
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${Number(prod.stock || 0) > 5 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <span className="font-mono text-slate-700 font-extrabold">{prod.stock !== undefined ? prod.stock : 20} Pcs available</span>
                              </div>
                            </td>

                            {/* Actions layout with Delete action locked warning */}
                            <td className="p-4 text-right px-5 whitespace-nowrap">
                              <div className="inline-flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditProductModal(prod)}
                                  className="p-1 px-[7px] text-slate-600 hover:text-orange-655 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 hover:border-orange-200 transition-all rounded-lg text-[10.5px] font-black tracking-tight cursor-pointer inline-flex items-center gap-1 bg-white"
                                >
                                  <Edit size={11} />
                                  Edit Specs
                                </button>
                                
                                {/* Lock deletion action for general sellers (Only Admin can delete catalog products) */}
                                <div className="group relative">
                                  <button
                                    type="button"
                                    className="p-1 px-2 text-slate-400 bg-slate-50 border border-slate-205 transition-colors rounded-lg text-[10.5px] font-black cursor-not-allowed inline-flex items-center gap-1"
                                    onClick={() => alert("Deletion Restrict: You cannot delete products. As a partner seller, you can mark items out of stock or edit specs. Only the Admin can delete catalog products permanently.")}
                                  >
                                    <Trash2 size={11} />
                                    Delete
                                  </button>
                                  {/* Hover explain tooltip */}
                                  <div className="absolute right-0 bottom-full mb-1.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-800 text-white text-[8px] font-black tracking-wider uppercase p-2 rounded shadow-xl w-48 z-20 text-center leading-normal">
                                    Only Admin can delete database products. You can mark stock to 0 if needed.
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SELLER INTEGRATED REVIEWS FEED */}
          {activeTab === 'reviews' && (
            <div className="space-y-4 max-w-4xl">
              <div className="bg-white p-5 rounded-2xl border border-slate-150">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Star size={14} className="text-orange-500 fill-orange-500" />
                  Product Reviews For Your Shop
                </h3>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                  Below lies reviews written by buyers for your specific uploaded products. Monitor reviews to maintain optimum service and quality.
                </p>
              </div>

              {myReviews.length === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
                  <MessageSquare size={45} className="text-slate-200 mx-auto mb-3 animate-pulse" />
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">No customer review recorded</h3>
                  <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed font-bold">
                    When buyers submit star ratings and critiques for your uploaded products, they will register here instantly.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myReviews.map((rev) => {
                    const matchedProd = products.find(p => p.id === rev.product_id);
                    return (
                      <div key={rev.id} className="bg-white border border-slate-150 rounded-2xl p-4 shadow-2xs relative flex flex-col justify-between">
                        <div>
                          {/* Stars */}
                          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5 mb-2.5">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={11} 
                                  className={`stroke-[2.5] ${i < (rev.rating || 5) ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} 
                                />
                              ))}
                              <span className="text-[11px] font-black text-slate-850 font-mono ml-1">{rev.rating || 5}.0</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold font-mono">
                              {rev.createdAt || rev.created_at || 'Date N/A'}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-slate-700 leading-relaxed font-sans min-h-[44px]">
                            "{rev.comment || rev.text || 'No comments provided'}"
                          </p>
                        </div>

                        {/* Associated product title inside review */}
                        <div className="mt-3.5 bg-slate-50 border border-slate-150 rounded-xl p-2.5 flex items-center gap-2.5">
                          {matchedProd && (
                            <img src={matchedProd.image} alt="" className="w-8 h-8 rounded-md object-cover border shrink-0 bg-white" />
                          )}
                          <div className="min-w-0">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">REVIEWD PRODUCT</span>
                            <span className="text-[10px] font-extrabold text-slate-800 truncate block">{matchedProd ? matchedProd.name : 'Unknown Product'}</span>
                          </div>
                        </div>

                        <div className="mt-3 text-right">
                          <span className="text-[9.5px] font-black text-slate-450 uppercase block font-sans text-slate-500">
                            — {rev.userName || rev.user_name || 'Verified Buyer'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SELLER SHOP / PROFILE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-white border border-slate-150 rounded-2xl shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Update Public Store Profile</h3>
                <p className="text-[10px] text-slate-400 font-bold leading-normal mt-0.5">
                  Update your contact number, logo and social pages. Any changes made here reflect instantly across existing products!
                </p>
              </div>

              <form onSubmit={handleUpdateSettings} className="p-6 space-y-4">
                
                {/* Display Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Store Display Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Trendy Collections"
                    value={settingsForm.displayName}
                    onChange={(e) => setSettingsForm({...settingsForm, displayName: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-205 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800 bg-slate-50/40"
                  />
                </div>

                {/* WhatsApp */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">WhatsApp Business No</label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      required
                      placeholder="e.g. 01712345678"
                      value={settingsForm.whatsapp}
                      onChange={(e) => setSettingsForm({...settingsForm, whatsapp: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-205 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800 bg-slate-50/40 font-mono"
                    />
                  </div>
                </div>

                {/* Logo URL */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Store Logo URL Address</label>
                  <input 
                    type="url"
                    required
                    placeholder="Logo URL link"
                    value={settingsForm.logo || ''}
                    onChange={(e) => setSettingsForm({...settingsForm, logo: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-205 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800 bg-slate-50/40"
                  />
                </div>

                {/* Social URL coordinates */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h4 className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Connect Social Marketing Profiles (Optional)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Facebook */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Facebook Link</label>
                      <input 
                        type="url"
                        placeholder="e.g. https://facebook.com/myStore"
                        value={settingsForm.facebook || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, facebook: e.target.value})}
                        className="w-full px-3.5 py-2 border border-slate-205 focus:border-orange-500 rounded-lg text-xs font-bold focus:outline-none focus:bg-white text-slate-800 bg-slate-50/40"
                      />
                    </div>

                    {/* Instagram */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Instagram Link</label>
                      <input 
                        type="url"
                        placeholder="e.g. https://instagram.com/myStore"
                        value={settingsForm.instagram || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, instagram: e.target.value})}
                        className="w-full px-3.5 py-2 border border-slate-450 focus:border-orange-500 rounded-lg text-xs font-bold focus:outline-none focus:bg-white text-slate-800 bg-slate-50/40"
                      />
                    </div>

                    {/* TikTok */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TikTok Link</label>
                      <input 
                        type="url"
                        placeholder="e.g. https://tiktok.com/@myStore"
                        value={settingsForm.tiktok || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, tiktok: e.target.value})}
                        className="w-full px-3.5 py-2 border border-slate-205 focus:border-orange-500 rounded-lg text-xs font-bold focus:outline-none focus:bg-white text-slate-800 bg-slate-50/40"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-slate-900 border border-slate-900 text-white rounded-xl hover:bg-black font-black text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* DYNAMIC PRODUCT MODAL WINDOW DETAIL SPECS FOR CREATION/EDITING */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 select-none md:select-text">
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-md" onClick={() => setIsProductModalOpen(false)} />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white w-full h-full md:rounded-[2rem] md:max-w-3xl md:max-h-[88vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200/50 z-10"
            >
              {/* Product Modal Header */}
              <div className="p-6 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    {editingProduct ? 'Edit Product Specifications' : 'Upload New Product Profile'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Registers instantly into customer search indexes</p>
                </div>
                <button 
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-1 px-[9px] text-xs font-black text-slate-405 border hover:bg-slate-50 transition-colors rounded-xl"
                >
                  ✕
                </button>
              </div>

              {/* Form elements scrolling container */}
              <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* Section 1: Core Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Title / Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Premium Gaming Robot"
                      value={productForm.name}
                      onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-slate-205 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800 bg-slate-50/40"
                    />
                  </div>

                  {/* List Price */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price Amount (৳)</label>
                    <input 
                      type="number"
                      required
                      placeholder="e.g. 5200"
                      value={productForm.price}
                      onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-slate-205 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800 bg-slate-50/40 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Discount percentage */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount Percentage (% OFF)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 10 (Set 0 for none)"
                      value={productForm.discount}
                      onChange={(e) => setProductForm({...productForm, discount: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-slate-205 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800 bg-slate-50/40 font-mono"
                    />
                  </div>

                  {/* Category select dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category Mapping</label>
                    <select 
                      value={productForm.category}
                      onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-slate-201 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800 bg-slate-50/40"
                    >
                      {categories.map((cat) => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Main Product Thumbnail Image */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Main Thumbnail Image URL</label>
                  <input 
                    type="url"
                    placeholder="e.g. https://images.unsplash.com/..."
                    value={productForm.image}
                    onChange={(e) => setProductForm({...productForm, image: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-205 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800 bg-slate-50/40"
                  />
                </div>

                {/* Section 2: Detailed Specs */}
                <div className="space-y-3 bg-slate-50 p-4.5 rounded-[1.25rem] border border-slate-150">
                  <h4 className="text-[9.5px] font-black text-slate-450 uppercase tracking-widest text-slate-500">Technical Spec Coordinates (Optional)</h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">RAM Buffer</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 16GB" 
                        value={productForm.ram}
                        onChange={(e) => setProductForm({...productForm, ram: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[11px] font-extrabold focus:outline-none text-slate-850"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Storage</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 1TB SSD" 
                        value={productForm.storage}
                        onChange={(e) => setProductForm({...productForm, storage: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-204 rounded-lg text-[11px] font-extrabold focus:outline-none text-slate-850"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Screen HZ</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 144Hz" 
                        value={productForm.screen_hz}
                        onChange={(e) => setProductForm({...productForm, screen_hz: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[11px] font-extrabold focus:outline-none text-slate-855"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Stock Count</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 20" 
                        value={productForm.stock}
                        onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[11px] font-extrabold focus:outline-none text-slate-850 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Item Description & Features</label>
                  <textarea 
                    rows={4}
                    placeholder="Write details description highlighting specs, warranties, delivery and return policies..."
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-250 focus:border-orange-500 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-800 bg-slate-50/40"
                  />
                </div>

                {/* New Flag & Flash Sale Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* IsNew check */}
                  <div className="flex items-center gap-3 bg-orange-50/45 p-4.5 rounded-[1.25rem] border border-orange-100/50">
                    <input 
                      type="checkbox" 
                      id="seller_is_new"
                      checked={productForm.is_new}
                      onChange={(e) => setProductForm({...productForm, is_new: e.target.checked})}
                      className="w-5 h-5 accent-orange-600 rounded cursor-pointer shrink-0"
                    />
                    <div>
                      <label htmlFor="seller_is_new" className="block text-xs font-black text-slate-850 cursor-pointer uppercase tracking-wider">
                        Highlight As NEW arrival
                      </label>
                      <p className="text-[9.5px] text-slate-450 leading-tight mt-0.5">Adds a dynamic "NEW" flash badge to the store cards</p>
                    </div>
                  </div>

                  {/* Flash Sale end date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Flash Sale End timestamp (Optional)</label>
                    <input 
                      type="datetime-local"
                      value={productForm.flashSaleEnd}
                      onChange={(e) => setProductForm({...productForm, flashSaleEnd: e.target.value})}
                      className="w-full px-3.1 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Submitting buttons action */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Cancel Action
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-orange-650 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-orange-500/10 cursor-pointer"
                  >
                    {editingProduct ? 'Confirm Spec Change' : 'Register Product Live'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
