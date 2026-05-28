import { X, Search, Package, CheckCircle2, Truck, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from './AuthModal';
import { formatWhatsappNumber } from '../lib/utils';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
}

interface Order {
  id: string;
  product_name: string;
  price: number;
  status: string;
  created_at?: string;
  product_id: string;
}

export default function TrackingModal({ isOpen, onClose, user }: TrackingModalProps) {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (user) {
        fetchOrdersByUser();
      } else {
        setWhatsappNumber('');
        setOrders([]);
        setHasSearched(false);
      }
    }
  }, [isOpen, user]);

  const fetchOrdersByUser = async () => {
    if (!user) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('customer_username', '==', user.username)
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

  const handleCancelOrder = async (order: any) => {
    setCancelingId(order.id);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'cancelled'
      });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));
      
      // Notify admin via WhatsApp
      const adminWhatsapp = '8801716807465';
      const message = `Hello, I would like to confirm the cancellation of my order.\n\nOrder ID: #${order.id.slice(-6).toUpperCase()}\nProduct: ${order.product_name}\nCustomer: ${order.customer_name || 'N/A'}\nWhatsApp: ${order.whatsapp || 'N/A'}`;
      const whatsappUrl = `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      console.error("Error canceling order:", err);
      alert("Failed to cancel the order. Please try again.");
    } finally {
      setCancelingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm md:block hidden"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative bg-white w-full h-full md:rounded-3xl md:max-w-2xl md:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 relative pt-12 md:pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 text-slate-900 rounded-full flex items-center justify-center">
              <Package size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Track My Products</h2>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 md:static p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          {!user && (
            <form onSubmit={fetchOrders} className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Enter your WhatsApp Number to verify
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="e.g. 017..."
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-black transition-all font-medium text-slate-700"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading || !whatsappNumber.trim()}
                  className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? 'Searching...' : 'Find'}
                </button>
              </div>
            </form>
          )}

          {user && (
             <div className="mb-6 flex items-center gap-3">
               <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Box size={20} />
                    </div>
                  )}
               </div>
               <div>
                  <h3 className="font-bold text-slate-800 capitalize text-lg tracking-tight">Your Orders</h3>
                  <p className="text-xs font-medium text-slate-500">@{user.username}</p>
               </div>
             </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-medium tracking-tight">Looking up your orders...</p>
            </div>
          ) : hasSearched && orders.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-bold">No orders found.</p>
              <p className="text-slate-500 text-sm mt-1">Please make sure the number matches the one from your order.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="bg-white border text-left border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Order #{order.id.slice(-6).toUpperCase()}
                      </p>
                      <h3 className="font-bold text-slate-800 whitespace-pre-line">{order.product_name}</h3>
                      <p className="text-sm font-semibold text-slate-500 mt-1">Total: {order.price.toLocaleString()} ৳</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-500">Ordered on</p>
                      <p className="text-sm font-bold text-slate-700">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Tracking Timeline */}
                  {(order.status !== 'cancelled' && order.status !== 'cancelled_admin') && (
                    <div className="relative pt-2">
                      <div className="absolute top-5 left-6 right-6 h-1 bg-slate-100 rounded-full z-0" />
                      
                      {/* Status mapping for completion percentages */}
                      <div 
                        className={`absolute top-5 left-6 h-1 rounded-full z-0 transition-all bg-slate-900`}
                        style={{ 
                          width: 
                            order.status === 'completed' || order.status === 'delivery' ? '100%' :
                            order.status === 'shipping' ? '66%' :
                            order.status === 'packing' ? '33%' : '0%' 
                        }}
                      />

                      <div className="relative z-10 flex justify-between">
                        {/* Pending Step */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white ${order.status === 'pending' || order.status === 'packing' || order.status === 'shipping' || order.status === 'delivery' || order.status === 'completed' ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-300'}`}>
                            <div className={`w-3 h-3 rounded-full ${order.status === 'pending' || order.status === 'packing' || order.status === 'shipping' || order.status === 'delivery' || order.status === 'completed' ? 'bg-slate-900' : 'bg-transparent'}`} />
                          </div>
                          <p className={`text-[10px] sm:text-xs font-bold mt-2 uppercase tracking-tight text-center ${order.status === 'pending' || order.status === 'packing' || order.status === 'shipping' || order.status === 'delivery' || order.status === 'completed' ? 'text-slate-800' : 'text-slate-400'}`}>Pending</p>
                        </div>

                        {/* Packing Step */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white ${order.status === 'packing' || order.status === 'shipping' || order.status === 'delivery' || order.status === 'completed' ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-300'}`}>
                            <Box size={14} className={order.status === 'packing' || order.status === 'shipping' || order.status === 'delivery' || order.status === 'completed' ? 'text-slate-900' : 'text-slate-300'} />
                          </div>
                          <p className={`text-[10px] sm:text-xs font-bold mt-2 uppercase tracking-tight text-center ${order.status === 'packing' || order.status === 'shipping' || order.status === 'delivery' || order.status === 'completed' ? 'text-slate-800' : 'text-slate-400'}`}>Packing</p>
                        </div>

                        {/* Shipping Step */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white ${order.status === 'shipping' || order.status === 'delivery' || order.status === 'completed' ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-300'}`}>
                            <Truck size={14} className={order.status === 'shipping' || order.status === 'delivery' || order.status === 'completed' ? 'text-slate-900' : 'text-slate-300'} />
                          </div>
                          <p className={`text-[10px] sm:text-xs font-bold mt-2 uppercase tracking-tight text-center ${order.status === 'shipping' || order.status === 'delivery' || order.status === 'completed' ? 'text-slate-800' : 'text-slate-400'}`}>Shipping</p>
                        </div>

                        {/* Delivered / Completed Step */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white ${order.status === 'completed' || order.status === 'delivery' ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-300'}`}>
                            <CheckCircle2 size={14} className={order.status === 'completed' || order.status === 'delivery' ? 'text-slate-900' : 'text-slate-300'} />
                          </div>
                          <p className={`text-[10px] sm:text-xs font-bold mt-2 uppercase tracking-tight text-center ${order.status === 'completed' || order.status === 'delivery' ? 'text-slate-800' : 'text-slate-400'}`}>Completed</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {order.status === 'cancelled' && (
                    <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold text-center border border-red-100">
                      This order has been cancelled.
                    </div>
                  )}

                  {order.status === 'cancelled_admin' && (
                    <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold text-center border border-red-100">
                      your order is expyered so we cant verifyed
                    </div>
                  )}

                  {order.status === 'pending' && (
                    <div className="mt-6 flex flex-col items-stretch sm:items-end">
                      {confirmCancelId === order.id ? (
                        <div className="w-full bg-red-50/70 p-4 rounded-xl border border-red-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left animate-slide-up">
                          <div>
                            <p className="text-xs font-bold text-red-800">Are you sure you want to cancel this order?</p>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">This will send a cancel notification to support on WhatsApp.</p>
                          </div>
                          <div className="flex gap-2 justify-end sm:justify-start shrink-0">
                            <button
                              type="button"
                              onClick={() => setConfirmCancelId(null)}
                              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all"
                            >
                              No, Keep Order
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmCancelId(null);
                                handleCancelOrder(order);
                              }}
                              disabled={cancelingId === order.id}
                              className="px-3 py-1.5 bg-red-650 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-red-100 bg-red-600"
                            >
                              {cancelingId === order.id ? 'Canceling...' : 'Yes, Cancel'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmCancelId(order.id)}
                          disabled={cancelingId === order.id}
                          className="px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg text-sm font-bold transition-all"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
