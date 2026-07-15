import { X, Search, Package, CheckCircle2, Truck, Box, MapPin, MessageCircle, ArrowLeft, Calendar, HelpCircle, User, Info, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { formatWhatsappNumber } from '../lib/utils';
import { Product } from '../types';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
  products?: Product[];
}

interface OrderItem {
  product_id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  product_name: string;
  price: number;
  status: string;
  created_at?: string;
  product_id: string;
  customer_name?: string;
  customer_username?: string;
  customer_image?: string;
  whatsapp?: string;
  location?: string;
  items?: OrderItem[];
  coupon_discount?: number;
  original_price?: number;
}

export default function TrackingModal({ isOpen, onClose, user, products = [] }: TrackingModalProps) {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Auto look-up on open / user changes
  useEffect(() => {
    if (isOpen) {
      if (user) {
        fetchOrdersByUser();
      } else {
        setWhatsappNumber('');
        setOrders([]);
        setSelectedOrder(null);
        setHasSearched(false);
      }
    }
  }, [isOpen, user]);

  // Set the first order as active once list updates
  useEffect(() => {
    if (orders.length > 0) {
      // Keep previous selected if it still exists, else select the newest one
      const exists = orders.find(o => o.id === selectedOrder?.id);
      if (exists) {
        setSelectedOrder(exists);
      } else {
        setSelectedOrder(orders[0]);
      }
    } else {
      setSelectedOrder(null);
    }
  }, [orders]);

  const fetchOrdersByUser = async () => {
    if (!user) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const q = query(collection(db, 'orders'), where('customer_username', '==', user.username));
      const snapshot = await getDocs(q);
      const fetchedOrders = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Order[];
      fetchedOrders.sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setOrders(fetchedOrders);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappNumber.trim()) return;
    
    const formattedWhatsapp = formatWhatsappNumber(whatsappNumber);

    setLoading(true);
    setHasSearched(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('whatsapp', '==', formattedWhatsapp)
      );
      const snapshot = await getDocs(q);
      const fetchedOrders = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Order[];
      fetchedOrders.sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setOrders(fetchedOrders);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    setCancelingId(order.id);
    try {
      // Restore stock
      const items = order.items || [];
      for (const item of items) {
        if (item.product_id) {
          await updateDoc(doc(db, 'products', item.product_id), {
            stock: increment(item.quantity || 1)
          });
        }
      }

      await updateDoc(doc(db, 'orders', order.id), {
        status: 'cancelled'
      });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));
    } catch (err) {
      console.error("Error canceling order:", err);
      alert("Failed to cancel the order. Please try again.");
    } finally {
      setCancelingId(null);
    }
  };

  // Helper to extract items with real image, quantity and prices
  const resolveOrderItems = (order: Order): OrderItem[] => {
    if (order.items && order.items.length > 0) {
      return order.items;
    }

    // Fallback parsing for legacy orders
    const rawIds = (order.product_id || '').split(',').map(s => s.trim()).filter(Boolean);
    const rawNames = (order.product_name || '').split('\n').map(s => s.trim()).filter(Boolean);

    if (rawIds.length === 0) {
      return [{
        product_id: 'legacy',
        name: order.product_name || 'Pbazar Item',
        image: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?auto=format&fit=crop&w=300&q=80',
        price: order.price,
        quantity: 1
      }];
    }

    // Try mapping IDs directly
    return rawIds.map((pId, idx) => {
      const matched = products.find(p => p.id === pId);
      
      // Try to match corresponding line name and guess quantity, like "2x Green tea"
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
        name: matched?.name || cleanedName || 'Purchased Product',
        image: matched?.image || 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?auto=format&fit=crop&w=300&q=80',
        price: matched?.price ? (matched.discount ? matched.price * (1 - matched.discount / 100) : matched.price) : (order.price / rawIds.length),
        quantity: quantity
      };
    });
  };

  const getDeliveryDetails = (location: string, itemsPrice: number) => {
    if (itemsPrice >= 3000) {
      return { cost: 0, text: 'Free Home Delivery (Over 3,000৳ Offer)' };
    }
    const isDhaka = (location || '').toLowerCase().includes('dhaka');
    return {
      cost: isDhaka ? 60 : 120,
      text: isDhaka ? 'Dhaka City Home Delivery' : 'Outside Dhaka Courier Delivery'
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 select-none md:select-text">
      {/* Semi-transparent backdrop shadow */}
      <div 
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Main Full-height Responsive tracking dashboard panel */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-slate-50 w-full h-full md:rounded-[2rem] md:max-w-5xl md:h-[88vh] overflow-hidden flex flex-col md:flex-row shadow-2xl border border-slate-200/50 z-10"
      >
        {/* LEFT COLUMN: Customer profile searching, list indexing, metadata info */}
        <div className="w-full md:w-80 shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-100 flex flex-col h-auto md:h-full">
          {/* Header Title */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Package size={18} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">Tracking Center</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">pbazar Real-time System</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors md:hidden"
            >
              <ArrowLeft size={18} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-5">
            {/* Tracking Search Form */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Search size={16} className="text-orange-600" />
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Track by WhatsApp</h4>
              </div>
              <form onSubmit={fetchOrders} className="relative">
                <input
                  type="tel"
                  placeholder="Enter WhatsApp Number"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full pl-4 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={loading || !whatsappNumber.trim()}
                  className="absolute right-1 top-1 bottom-1 px-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={14} />}
                </button>
              </form>
              <p className="text-[9px] text-slate-500 font-bold leading-tight">
                Enter the WhatsApp number used during checkout to trace your parcel progress.
              </p>
            </div>

            {/* Profile View section */}
            {user && !hasSearched && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                  <User size={100} />
                </div>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-orange-500/50 bg-slate-700 shrink-0">
                    {user.profileImage ? (
                      <img src={user.profileImage} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <User size={18} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-xs tracking-tight text-white capitalize truncate">{user.username || 'Subscriber'}</h3>
                    <p className="text-[10px] text-slate-350 tracking-wider">Verified Buyer Account</p>
                    {user.whatsapp && <p className="text-[9px] text-orange-400 font-mono mt-0.5">{user.whatsapp}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Order index list switcher */}
            {orders.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Purchase History ({orders.length})
                  </h4>
                  {loading && <div className="w-3.5 h-3.5 border-2 border-orange-505 border-t-transparent rounded-full animate-spin border-orange-500" />}
                </div>
                
                <div className="space-y-1.5 max-h-[35vh] md:max-h-[45vh] overflow-y-auto no-scrollbar">
                  {orders.map((ord) => {
                    const isSelected = selectedOrder?.id === ord.id;
                    const items = resolveOrderItems(ord);
                    
                    return (
                      <button
                        key={ord.id}
                        onClick={() => setSelectedOrder(ord)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${isSelected ? 'bg-orange-500/5 border-orange-400/30 ring-1 ring-orange-500/10' : 'bg-slate-50 border-slate-105 hover:bg-slate-100'}`}
                      >
                        <div className="min-w-0">
                          <span className={`${isSelected ? 'text-orange-600 font-black' : 'text-slate-400 font-bold'} font-mono text-[9px] uppercase tracking-wider block`}>
                            ORDER #{ord.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="font-extrabold text-slate-805 block truncate mt-0.5 tracking-tight text-slate-700">
                            {items.length === 1 ? items[0].name : `${items.length} Products`}
                          </span>
                          <span className="text-[10px] font-mono font-black text-slate-900 block mt-0.5">
                            {ord.price.toLocaleString()}৳
                          </span>
                        </div>

                        {/* Tiny indicator tag */}
                        {(() => {
                          const status = ord.status;
                          let pillColor = 'bg-yellow-50 text-yellow-600 border-yellow-200';
                          if (status === 'completed') pillColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                          if (status === 'cancelled' || status === 'cancelled_admin') pillColor = 'bg-rose-50 text-rose-500 border-rose-100';
                          
                          return (
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border shrink-0 ${pillColor}`}>
                              {status === 'cancelled_admin' ? 'Expired' : status}
                            </span>
                          );
                        })()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Subtle logo footer */}
          <div className="p-4 border-t border-slate-100 text-center bg-slate-50/50 hidden md:block">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">SECURE CLOUD PLATFORM</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Active tracking detail presentation (Full Page Console) */}
        <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col justify-between">
          <div className="p-5 md:p-8 flex-1">
            {/* Header / Dismiss floating bar */}
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200/55">
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">Shipment Tracking Console</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Automated delivery verification pipeline</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-full transition-colors text-slate-500 shadow-sm"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content states */}
            {loading && orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-orange-650 rounded-full animate-spin mb-4" />
                <p className="text-sm font-black text-slate-800">Synchronizing database servers...</p>
                <p className="text-xs text-slate-400 mt-1">Downloading registered parcels</p>
              </div>
            ) : !selectedOrder ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-200/60 rounded-[1.5rem] p-6 shadow-sm">
                <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4 border border-orange-100 shadow-inner">
                  <Search size={22} className="animate-bounce" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm">No active tracking selected</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-sm leading-normal font-medium">
                  {user 
                    ? "Choose an order from the purchase history sidebar on the left to see the parcel details and progress."
                    : "Only logged-in buyers can track orders. Please close this modal, open the User Menu to sign in and trace your orders easily."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 1. Parcel Meta info layout */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4.5 rounded-[1.25rem] border border-slate-200/50 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-orange-600" />
                  <div>
                    <span className="text-[9px] font-black font-mono text-orange-600 uppercase tracking-widest block">
                      PARCEL UNIQUE IDENTIFIER
                    </span>
                    <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase mt-0.5">
                      Order #{selectedOrder.id.toUpperCase()}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border">
                      <Calendar size={11} />
                      Ordered on {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  
                  {/* Status Badging & WhatsApp Integration */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">CURRENT STEP</span>
                      {(() => {
                        let text = 'Pending';
                        let style = 'bg-yellow-50 text-yellow-600 border-yellow-200';
                        if (selectedOrder.status === 'confirmed') { text = 'Order Confirmed'; style = 'bg-emerald-50 text-emerald-600 border-emerald-150 font-bold'; }
                        else if (selectedOrder.status === 'packing') { text = 'Packing in Progress'; style = 'bg-blue-50 text-blue-600 border-blue-150'; }
                        else if (selectedOrder.status === 'shipping') { text = 'Shipped via Carrier'; style = 'bg-purple-50 text-purple-600 border-purple-150'; }
                        else if (selectedOrder.status === 'delivery') { text = 'Out for Courier Delivery'; style = 'bg-orange-50 text-orange-600 border-orange-200'; }
                        else if (selectedOrder.status === 'completed') { text = 'Delivered & Completed'; style = 'bg-emerald-50 text-emerald-600 border-emerald-150 font-bold'; }
                        else if (selectedOrder.status === 'cancelled' || selectedOrder.status === 'cancelled_admin') { text = selectedOrder.status === 'cancelled_admin' ? 'Expired / Ended' : 'Cancelled'; style = 'bg-rose-50 text-rose-500 border-rose-150 font-black'; }

                        return (
                          <div className={`mt-1.5 inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm ${style}`}>
                            {text}
                          </div>
                        );
                      })()}
                    </div>

                    <a 
                      href={`https://wa.me/8801716807465?text=${encodeURIComponent(`Hello Pbazar Support, I have a question about my order #${selectedOrder.id.toUpperCase()}. Status: ${selectedOrder.status}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-1.5 bg-[#25D366] text-white rounded-lg hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/10 text-[10px] font-black uppercase tracking-tight active:scale-95 whitespace-nowrap"
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp Support</span>
                    </a>
                  </div>
                </div>

                {/* 2. Visual Pipeline Timeline */}
                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'cancelled_admin' && (
                  <div className="bg-white p-5 rounded-[1.25rem] border border-slate-200/50 shadow-sm relative">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 block">
                      Live Delivery Progress
                    </h4>

                    <div className="relative flex justify-between items-center px-2">
                      {/* Grey Base bar */}
                      <div className="absolute top-4 left-6 right-6 h-1 bg-slate-100 rounded-full z-0" />
                      
                      {/* Active green/blue progress line */}
                      <div 
                        className={`absolute top-4 left-6 h-1 rounded-full z-0 transition-all duration-700 ${selectedOrder.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-900'}`}
                        style={{ 
                          width: 
                            selectedOrder.status === 'completed' ? '100%' :
                            selectedOrder.status === 'delivery' ? '80%' :
                            selectedOrder.status === 'shipping' ? '60%' :
                            selectedOrder.status === 'packing' ? '40%' : 
                            selectedOrder.status === 'confirmed' ? '20%' : '0%' 
                        }}
                      />

                      {/* Timestep Nodes */}
                      {['pending', 'confirmed', 'packing', 'shipping', 'delivery', 'completed'].map((st, idx) => {
                        const labels: Record<string, string> = {
                          pending: 'Placed',
                          confirmed: 'Confirmed',
                          packing: 'Packing',
                          shipping: 'In Transit',
                          delivery: 'Out Delivery',
                          completed: 'Delivered'
                        };
                        
                        const seq = ['pending', 'packing', 'shipping', 'delivery', 'completed'];
                        const currIndex = seq.indexOf(selectedOrder.status);
                        const isPassed = currIndex >= idx;
                        const isCurrent = selectedOrder.status === st;

                        // Stepper Node icons
                        const renderIcon = () => {
                          if (st === 'completed') return <CheckCircle2 size={13} />;
                          if (st === 'delivery') return <Truck size={13} />;
                          if (st === 'shipping') return <Truck size={13} className="scale-x-[-1]" />;
                          if (st === 'packing') return <Box size={13} />;
                          return <Package size={13} />;
                        };

                        return (
                          <div key={st} className="flex flex-col items-center relative z-10 flex-1">
                            <div 
                              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                isPassed 
                                  ? (st === 'completed' && selectedOrder.status === 'completed' 
                                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                      : 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20')
                                  : 'border-slate-200 bg-white text-slate-350'
                              } ${isCurrent ? 'ring-4 ring-orange-500/20 scale-110' : ''}`}
                            >
                              {renderIcon()}
                            </div>
                            <span className={`text-[9px] font-black mt-2 uppercase tracking-tight text-center ${
                              isCurrent ? 'text-orange-605 font-black' : isPassed ? 'text-slate-800' : 'text-slate-400 font-bold'
                            }`}>
                              {labels[st]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Customer Profile View inside Tracking console */}
                <div className="bg-white p-5 rounded-[1.25rem] border border-slate-200/50 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1">
                    <User size={12} className="text-slate-400" />
                    Delivery Profile Details
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-450 shrink-0 border border-slate-150">
                        {selectedOrder.customer_image ? (
                          <img src={selectedOrder.customer_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={16} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Recipient Name</span>
                        <p className="text-xs font-black text-slate-800 truncate capitalize">{selectedOrder.customer_name || 'Buyer'}</p>
                        {selectedOrder.customer_username && (
                          <p className="text-[10px] font-bold text-slate-500">@{selectedOrder.customer_username}</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-sm">
                        <img 
                          src="https://img.magnific.com/premium-vector/whatsapp-app-round-icon-popular-messenger-social-media-logo_277909-873.jpg?semt=ais_hybrid&w=740&q=80" 
                          className="w-full h-full object-cover" 
                          alt="WA"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">WhatsApp Phone</span>
                        <p className="text-xs font-black text-slate-800 font-mono">{selectedOrder.whatsapp || 'N/A'}</p>
                        <p className="text-[9px] text-slate-400 font-medium">Auto-confirm updates active</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-105 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200 mt-0.5">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Destination Courier Address</span>
                      <p className="text-xs font-bold text-slate-800 leading-normal mt-0.5">{selectedOrder.location || 'No address registered'}</p>
                    </div>
                  </div>
                </div>

                {/* 4. Products list summary detailing product image, counter qty, prices, & delivery cost */}
                <div className="bg-white p-5 rounded-[1.25rem] border border-slate-200/50 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3.5 block">
                    Product Order Summary
                  </h4>

                  <div className="space-y-3 mb-5 border-b border-slate-100 pb-4">
                    {resolveOrderItems(selectedOrder).map((item, id) => (
                      <div key={id} className="flex gap-4 items-center bg-slate-50/60 p-3 rounded-xl border border-slate-150/50 shadow-2xs">
                        <div className="w-16 h-16 rounded-lg bg-white overflow-hidden shrink-0 border border-slate-200/70 p-0.5 shadow-2xs">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover rounded-md"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-black text-slate-800 truncate tracking-tight">{item.name}</h5>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-black text-orange-650 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">
                              {item.quantity} Qty
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 font-mono">
                              @ {item.price.toLocaleString()}৳
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-slate-905 font-mono text-slate-900">
                            {(item.price * item.quantity).toLocaleString()}৳
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pricing breakout with delivery details */}
                  {(() => {
                    const itemsList = resolveOrderItems(selectedOrder);
                    const parsedSubtotal = Array.isArray(itemsList) ? itemsList.reduce((sum, current) => sum + (current.price * current.quantity), 0) : 0;
                    // Use total order price instead of computed subtotal in case discount overrides are manually input, or fallback
                    const finalSubtotal = selectedOrder.price;
                    const delivery = getDeliveryDetails(selectedOrder.location || '', finalSubtotal);
                    const grandTotal = finalSubtotal + delivery.cost;

                    return (
                      <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-150 text-xs space-y-2.5">
                        {selectedOrder.coupon_discount ? (
                          <>
                            <div className="flex justify-between items-center text-slate-500">
                              <span className="font-bold">Original Item Total:</span>
                              <span className="font-extrabold font-mono line-through">{((selectedOrder.original_price || (finalSubtotal + selectedOrder.coupon_discount))).toLocaleString()}৳</span>
                            </div>
                            <div className="flex justify-between items-center text-orange-600 font-bold">
                              <span>Coupon Discount:</span>
                              <span className="font-mono">-{selectedOrder.coupon_discount.toLocaleString()}৳</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-200/50 pt-2 font-bold text-slate-800">
                              <span>Discounted Subtotal:</span>
                              <span className="font-extrabold font-mono">{finalSubtotal.toLocaleString()}৳</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold">Products Subtotal:</span>
                            <span className="font-extrabold text-slate-800 font-mono">{finalSubtotal.toLocaleString()}৳</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start gap-4">
                          <div className="text-left">
                            <span className="text-slate-500 font-bold block">Delivery Fee:</span>
                            <span className="text-[10px] font-bold text-slate-400 block mt-0.5 bg-white border border-slate-100 px-1.5 py-0.5 rounded-md leading-none">
                              {delivery.text}
                            </span>
                          </div>
                          <span className="font-extrabold text-slate-800 font-mono pt-1">
                            {delivery.cost === 0 ? 'FREE' : `${delivery.cost}৳`}
                          </span>
                        </div>

                        <div className="border-t border-slate-200 border-dashed my-2.5 pt-2.5 flex justify-between items-center">
                          <div>
                            <span className="text-slate-900 font-black uppercase text-[10px] tracking-wide block">Price with Delivery (COD)</span>
                            <p className="text-[9px] text-slate-400 font-medium">Cash on Delivery - Pay upon receiving parcel</p>
                          </div>
                          <span className="text-base font-black text-orange-600 font-mono">
                            {grandTotal.toLocaleString()}৳
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 5. Cancellation alerts / expired state warnings */}
                {selectedOrder.status === 'cancelled' && (
                  <div className="bg-red-50 text-red-700 border border-red-100 p-4 rounded-[1.25rem] text-xs font-black text-center shadow-inner flex items-center justify-center gap-2">
                    <Info size={16} />
                    This order has been cancelled at your request.
                  </div>
                )}

                {selectedOrder.status === 'cancelled_admin' && (
                  <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-[1.25rem] text-xs font-black text-center shadow-inner flex flex-col items-center gap-1">
                    <span className="flex items-center gap-1.5 font-black uppercase tracking-wide">
                      <Info size={16} className="text-red-650" />
                      Order Status: Expired
                    </span>
                    <p className="text-[11px] font-bold text-slate-500 mt-1 leading-relaxed">
                      your order is expyered so we cant verifyed
                    </p>
                  </div>
                )}

                {selectedOrder.status === 'pending' && (
                  <div className="flex flex-col items-stretch md:items-end">
                    {confirmCancelId === selectedOrder.id ? (
                      <div className="w-full bg-red-50/60 p-4 rounded-xl border border-red-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
                        <div>
                          <p className="text-xs font-bold text-red-800">Are you sure you want to cancel this order?</p>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">This will release held inventory stock instantly.</p>
                        </div>
                        <div className="flex gap-2 justify-end sm:justify-start shrink-0">
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(null)}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-705 rounded-lg text-xs font-bold transition-all"
                          >
                            No, Keep Order
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmCancelId(null);
                              handleCancelOrder(selectedOrder);
                            }}
                            disabled={cancelingId === selectedOrder.id}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            {cancelingId === selectedOrder.id ? 'Canceling...' : 'Yes, Cancel'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmCancelId(selectedOrder.id)}
                        disabled={cancelingId === selectedOrder.id}
                        className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl text-xs font-black transition-all uppercase tracking-widest cursor-pointer"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
