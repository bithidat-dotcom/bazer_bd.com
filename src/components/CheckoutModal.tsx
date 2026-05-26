import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { Product, CartItem } from '../types';
import { X, MessageCircle, MapPin, User, Send } from 'lucide-react';

interface CheckoutModalProps {
  cartItems: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customerName: string, whatsapp: string, location: string) => Promise<void>;
}

export default function CheckoutModal({ cartItems, isOpen, onClose, onSubmit }: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  if (cartItems.length === 0) return null;

  const totalPrice = cartItems.reduce((sum, item) => {
    const hasDiscount = item.product.discount && item.product.discount > 0;
    const price = hasDiscount 
      ? item.product.price * (1 - (item.product.discount || 0) / 100) 
      : item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || !whatsapp || !location) {
      alert("Please fill all fields");
      return;
    }

    setIsConfirming(true);
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    try {
      console.log('Starting order submission...');
      await onSubmit(customerName, whatsapp, location);
      onClose();
      setIsConfirming(false);
      setCustomerName('');
      setWhatsapp('');
      setLocation('');
    } catch (error) {
      console.error('Final confirm error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md overflow-hidden bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-slate-900 p-6 relative shrink-0">
              <button 
                onClick={onClose}
                className="absolute p-2 transition-colors rounded-full top-4 right-4 bg-white/10 hover:bg-white/20 text-white"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Checkout ({cartItems.length} items)</h2>
              <p className="text-orange-400 font-bold mt-1">Total: {totalPrice.toFixed(0)} BDT</p>
            </div>

            {/* Content Swapper */}
            <div className="overflow-y-auto overflow-x-hidden flex-1 no-scrollbar">
              <AnimatePresence mode="wait">
                {!isConfirming ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleSubmit}
                    className="p-6 space-y-4"
                  >
                    <div className="space-y-3 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100 max-h-40 overflow-y-auto no-scrollbar">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cart Summary</p>
                      {cartItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-slate-700">
                            <span className="font-bold">{item.quantity}x</span> {item.product.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Your Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="text"
                            required
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Enter your full name"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">WhatsApp Number</label>
                        <div className="relative">
                          <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="tel"
                            required
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            placeholder="e.g. 01700000000"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Delivery Address</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                          <textarea
                            required
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Enter your full address"
                            rows={3}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors group mt-4!"
                    >
                      <span>Proceed to Order</span>
                      <Send size={18} className="translate-y-0 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-medium">
                      Payment on delivery available.
                    </p>
                  </motion.form>
                ) : (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-8 text-center space-y-6"
                  >
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900">Confirm Order?</h3>
                      <p className="text-sm text-slate-500">Are you sure you want to place this order?</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl text-left space-y-2 text-sm border border-slate-100">
                      <div className="space-y-1 mb-2">
                        <span className="text-slate-400 text-xs font-bold uppercase">Products:</span>
                        {cartItems.map((item, idx) => (
                           <div key={idx} className="flex justify-between pl-2">
                             <span className="text-slate-700 text-xs"><span className="font-bold">{item.quantity}x</span> {item.product.name}</span>
                           </div>
                        ))}
                      </div>
                      <div className="flex justify-between"><span className="text-slate-400">Total:</span> <span className="font-bold text-orange-600">{totalPrice.toFixed(0)} BDT</span></div>
                      <hr className="border-slate-200 border-dashed my-2" />
                      <div className="flex justify-between"><span className="text-slate-400">Deliver to:</span> <span className="font-bold text-slate-900 truncate ml-2">{customerName}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">WhatsApp:</span> <span className="font-bold text-slate-900">{whatsapp}</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setIsConfirming(false)}
                        className="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleFinalConfirm}
                        disabled={isSubmitting}
                        className="py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                        ) : (
                          "Yes, Place Order"
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
