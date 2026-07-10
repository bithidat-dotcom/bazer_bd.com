import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { Product, CartItem } from '../types';
import { X, MessageCircle, MapPin, User, Send, Minus, Plus, Trash2, ShoppingBag, CheckCircle } from 'lucide-react';
import { formatWhatsappNumber } from '../lib/utils';

import { UserProfile } from '../types';

interface CheckoutModalProps {
  cartItems: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customerName: string, whatsapp: string, location: string, area: string, postCode: string) => Promise<string | undefined>;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  user?: UserProfile | null;
  couponConfig?: { isActive: boolean; minPurchase: number; discountAmount: number };
}

export default function CheckoutModal({ cartItems, isOpen, onClose, onSubmit, onUpdateQuantity, onRemoveItem, user, couponConfig }: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState('');
  const [postCode, setPostCode] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [cartSnapshot, setCartSnapshot] = useState<CartItem[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      setShowSuccess(false);
      setOrderId(null);
      if (user) {
        if (!customerName) setCustomerName(user.username || '');
        if (!whatsapp) setWhatsapp(user.whatsapp || '');
        if (!location) setLocation(user.location || '');
      }
    }
  }, [isOpen, user]);

  if (showSuccess) {
     const displayItems = cartSnapshot.length > 0 ? cartSnapshot : cartItems;
     const firstItem = displayItems[0];
     const sellerW = firstItem?.product.seller_whatsapp;
     const productList = displayItems.map(item => `${item.quantity}x ${item.product.name}`).join(', ');
     const messageText = `Hi, I just placed an order (ID: ${orderId || 'New'}). Items: ${productList}. My name is ${customerName}. Please confirm my order.`;
     const waLink = sellerW ? `https://wa.me/${sellerW.replace(/\D/g, '')}?text=${encodeURIComponent(messageText)}` : null;

     return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full h-[70vh] md:h-auto md:max-w-md bg-white rounded-t-[2.5rem] md:rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 text-center relative z-10"
            >
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">Order Confirmed!</h3>
              {orderId && (
                <p className="text-orange-600 font-black text-xs uppercase tracking-widest mb-4 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                  Order ID: {orderId}
                </p>
              )}
              <p className="text-slate-500 text-sm mb-8">Your order has been recorded in our system successfully.</p>
              
              {waLink && (
                <div className="w-full space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Step:</p>
                  <button 
                    onClick={() => window.open(waLink, '_blank')}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                  >
                    <img 
                      src="https://img.magnific.com/premium-vector/whatsapp-app-round-icon-popular-messenger-social-media-logo_277909-873.jpg?semt=ais_hybrid&w=740&q=80" 
                      className="w-6 h-6 object-contain rounded-full shadow-md" 
                      alt="WhatsApp"
                    />
                    Confirm with Seller
                  </button>
                  <p className="text-[9px] text-slate-400 font-bold">Connecting to Admin: {firstItem?.product.seller || 'Verified Seller'}</p>
                </div>
              )}

              <button 
                onClick={onClose}
                className="mt-6 text-slate-400 font-bold text-xs hover:text-slate-600"
              >
                Close and Keep Looking
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
     );
  }

  if (cartItems.length === 0) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full h-full md:h-auto md:max-w-md overflow-hidden bg-white rounded-none md:rounded-3xl shadow-2xl flex flex-col relative z-10 pt-4 md:pt-0"
            >
              {/* Header */}
              <div className="bg-slate-900 p-6 relative shrink-0">
                <button 
                  onClick={onClose}
                  className="absolute p-2 transition-colors rounded-full top-4 right-4 bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
                <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Your Cart</h2>
              </div>

              {/* Empty state content */}
              <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px] space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                  <ShoppingBag size={28} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Your cart is empty!</h3>
                <p className="text-slate-500 text-xs px-6">Explore our catalog and add items to your cart to check out.</p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-black transition-all cursor-pointer mt-2 active:scale-95"
                >
                  Start Shopping
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  const totalPrice = Array.isArray(cartItems) ? cartItems.reduce((sum, item) => {
    const hasDiscount = item.product.discount && item.product.discount > 0;
    const price = hasDiscount 
      ? item.product.price * (1 - (item.product.discount || 0) / 100) 
      : item.product.price;
    return sum + price * item.quantity;
  }, 0) : 0;

  let couponDiscount = 0;
  if (couponConfig?.isActive && Array.isArray(cartItems)) {
    cartItems.forEach(item => {
      const hasDiscount = item.product.discount && item.product.discount > 0;
      const unitPrice = hasDiscount 
        ? item.product.price * (1 - (item.product.discount || 0) / 100) 
        : item.product.price;
        
      if (unitPrice >= couponConfig.minPurchase) {
        couponDiscount += couponConfig.discountAmount * item.quantity;
      }
    });
  }
  const finalPrice = Math.max(0, totalPrice - couponDiscount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || !whatsapp || !location || !area) {
      alert("Please fill all mandatory fields (Name, WhatsApp, Address, Area)");
      return;
    }

    const formattedW = formatWhatsappNumber(whatsapp);
    setWhatsapp(formattedW);
    setIsConfirming(true);
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    setCartSnapshot([...cartItems]);
    try {
      console.log('Starting order submission...');
      const newOrderId = await onSubmit(customerName, whatsapp, location, area, postCode);
      
      if (newOrderId) {
        setOrderId(newOrderId);
      }
      
      // Show success screen which has the WhatsApp redirect
      setShowSuccess(true);
      
      // Attempt auto-redirect
      if (cartItems.length > 0) {
        const firstItem = cartItems[0];
        const sellerW = firstItem.product.seller_whatsapp;
        if (sellerW) {
          const productList = cartItems.map(item => `${item.quantity}x ${item.product.name}`).join(', ');
          const message = encodeURIComponent(`Hi, I just placed an order (ID: ${newOrderId || 'New'}). Items: ${productList}. My name is ${customerName}. Please confirm my order.`);
          window.open(`https://wa.me/${sellerW.replace(/\D/g, '')}?text=${message}`, '_blank');
        }
      }
    } catch (error) {
      console.error('Final confirm error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="w-full h-full md:h-auto md:max-w-md overflow-hidden bg-white rounded-none md:rounded-3xl shadow-2xl flex flex-col relative z-10 pt-4 md:pt-0"
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
              {couponDiscount > 0 ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-white font-black opacity-90">{finalPrice.toFixed(0)} ৳</span>
                  <span className="text-slate-400 font-bold line-through text-xs">{totalPrice.toFixed(0)} ৳</span>
                  <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                    Coupon Applied: -{couponDiscount}৳
                  </span>
                </div>
              ) : (
                <p className="text-white font-black mt-1 opacity-90">Total: {totalPrice.toFixed(0)} ৳</p>
              )}
            </div>

            {/* Content Swapper */}
            <div className="overflow-y-auto overflow-x-hidden flex-1 scroll-container">
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
                    <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 max-h-64 overflow-y-auto no-scrollbar">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cart Summary</p>
                      {cartItems.map((item, idx) => {
                        const hasDiscount = item.product.discount && item.product.discount > 0;
                        const price = hasDiscount 
                          ? item.product.price * (1 - (item.product.discount || 0) / 100) 
                          : item.product.price;
                          
                        return (
                          <div key={idx} className="flex gap-3 items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                            <div className="w-16 h-16 rounded-lg bg-slate-50 overflow-hidden shrink-0">
                                <img 
                                  src={item.product.image} 
                                  alt={item.product.name} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                            </div>
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-sm font-bold text-slate-800 truncate">{item.product.name}</p>
                              <p className="text-xs font-black text-slate-900 mt-0.5">{price.toFixed(0)} ৳</p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
                                <button 
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.product.id, -1)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-slate-600 transition-all"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                <button 
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.product.id, 1)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-slate-600 transition-all"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <button 
                                type="button"
                                onClick={() => onRemoveItem(item.product.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
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
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
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
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
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
                            placeholder="Enter your street address / Village / House"
                            rows={2}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all resize-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Area / City</label>
                          <input
                            type="text"
                            required
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                            placeholder="e.g. Dhaka"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Post Code</label>
                          <input
                            type="text"
                            value={postCode}
                            onChange={(e) => setPostCode(e.target.value)}
                            placeholder="e.g. 1200"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>



                    <button
                      type="submit"
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors group mt-4 active:scale-95"
                    >
                      <span>Proceed to Order</span>
                      <Send size={18} className="translate-y-0 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-medium pb-8 md:pb-0">
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
                      {couponDiscount > 0 ? (
                        <>
                          <div className="flex justify-between text-xs"><span className="text-slate-400">Subtotal:</span> <span className="font-bold text-slate-700">{totalPrice.toFixed(0)} ৳</span></div>
                          <div className="flex justify-between text-xs text-orange-600"><span className="font-bold">Coupon Discount:</span> <span className="font-black">-{couponDiscount.toFixed(0)} ৳</span></div>
                          <hr className="border-slate-200 border-dashed my-2" />
                          <div className="flex justify-between"><span className="text-slate-400">Total Price:</span> <span className="font-black text-slate-900">{finalPrice.toFixed(0)} ৳</span></div>
                        </>
                      ) : (
                        <div className="flex justify-between"><span className="text-slate-400">Total:</span> <span className="font-black text-slate-900">{totalPrice.toFixed(0)} ৳</span></div>
                      )}
                      <hr className="border-slate-200 border-dashed my-2" />
                      <div className="flex justify-between"><span className="text-slate-400">Deliver to:</span> <span className="font-bold text-slate-900 truncate ml-2">{customerName}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Address:</span> <span className="font-bold text-slate-900 truncate ml-2">{location}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Area:</span> <span className="font-bold text-slate-900 ml-2">{area}</span></div>
                      {postCode && <div className="flex justify-between"><span className="text-slate-400">Post Code:</span> <span className="font-bold text-slate-900 ml-2">{postCode}</span></div>}
                      <div className="flex justify-between"><span className="text-slate-400">WhatsApp:</span> <span className="font-bold text-slate-900">{whatsapp}</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-8 md:pb-0">
                      <button
                        onClick={() => setIsConfirming(false)}
                        className="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleFinalConfirm}
                        disabled={isSubmitting}
                        className="py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50"
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
