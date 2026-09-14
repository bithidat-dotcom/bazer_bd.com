import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ShoppingBag, 
  Search, 
  Coffee, 
  Utensils, 
  Pizza, 
  IceCream, 
  Menu as MenuIcon,
  Heart,
  Home,
  ClipboardList,
  ArrowRight,
  Plus,
  CheckCircle,
  Clock,
  MapPin,
  Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, CartItem } from '../types';
import ProductModal from './ProductModal';

export default function DrinkCafe() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'like' | 'order'>('home');
  const [orders, setOrders] = useState<any[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Food categories with light pale green styling theme
  const categories = [
    { id: 'All', icon: <MenuIcon size={20} />, label: 'All' },
    { id: 'Drinks', icon: <Coffee size={20} />, label: 'Drinks' },
    { id: 'Food', icon: <Utensils size={20} />, label: 'Food' },
    { id: 'Snacks', icon: <Pizza size={20} />, label: 'Snacks' },
    { id: 'Desserts', icon: <IceCream size={20} />, label: 'Desserts' },
  ];

  // Load products and orders from dedicated cafe collections
  useEffect(() => {
    // 1. Products from cafe_products
    const qProd = query(collection(db, 'cafe_products'), orderBy('created_at', 'desc'));
    const unsubProd = onSnapshot(qProd, (snapshot) => {
      const prodData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      if (prodData.length === 0) {
        // Fallback default items if collection is empty
        setProducts([
          {
            id: 'c1',
            name: 'Iced Matcha Latte',
            price: 350,
            category: 'Drinks',
            image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=800',
            description: 'Premium ceremonial grade matcha with creamy milk and ice.',
            stock: 50,
            created_at: new Date().toISOString()
          },
          {
            id: 'c2',
            name: 'Classic Cold Brew',
            price: 280,
            category: 'Drinks',
            image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=800',
            description: 'Steeped for 24 hours for a smooth, rich coffee experience.',
            stock: 40,
            created_at: new Date().toISOString()
          },
          {
            id: 'c3',
            name: 'Avocado Sourdough Toast',
            price: 450,
            category: 'Food',
            image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=800',
            description: 'Fresh smashed avocado on artisan sourdough with poached egg.',
            stock: 25,
            created_at: new Date().toISOString()
          },
          {
            id: 'c4',
            name: 'Berry Cheesecake Slice',
            price: 390,
            category: 'Desserts',
            image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=800',
            description: 'New York style velvety cheesecake topped with wild berries.',
            stock: 15,
            created_at: new Date().toISOString()
          }
        ]);
      } else {
        setProducts(prodData);
      }
      setLoading(false);
    }, (err) => {
      console.log('cafe_products error:', err);
      setLoading(false);
    });

    // 2. Orders from cafe_orders
    const qOrders = query(collection(db, 'cafe_orders'), orderBy('created_at', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const ordData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordData);
    }, (err) => {
      console.log('cafe_orders error:', err);
    });

    // Load saved info
    const savedCart = localStorage.getItem('cafe_cart');
    if (savedCart) setCart(JSON.parse(savedCart));

    const savedLikes = localStorage.getItem('cafe_likes');
    if (savedLikes) setLikedIds(JSON.parse(savedLikes));

    const savedPhone = localStorage.getItem('customer_phone');
    if (savedPhone) setCustomerPhone(savedPhone);

    const savedName = localStorage.getItem('customer_name');
    if (savedName) setCustomerName(savedName);

    const savedAddress = localStorage.getItem('customer_address');
    if (savedAddress) setCustomerAddress(savedAddress);

    return () => {
      unsubProd();
      unsubOrders();
    };
  }, []);

  useEffect(() => {
    let result = products;
    
    if (activeTab === 'like') {
      result = result.filter(p => likedIds.includes(p.id));
    } else if (activeTab === 'home') {
      if (activeCategory !== 'All') {
        result = result.filter(p => p.category?.toLowerCase().includes(activeCategory.toLowerCase()));
      }
    }

    if (searchQuery) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredProducts(result);
  }, [activeCategory, searchQuery, products, activeTab, likedIds]);

  const toggleLike = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds(prev => {
      const next = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId];
      localStorage.setItem('cafe_likes', JSON.stringify(next));
      return next;
    });
  };

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    let newCart = [...cart];
    const index = newCart.findIndex(item => item.product.id === product.id);
    if (index > -1) {
      newCart[index].quantity += quantity;
    } else {
      newCart.push({ product, quantity });
    }
    setCart(newCart);
    localStorage.setItem('cafe_cart', JSON.stringify(newCart));
  };

  const handleBuyNow = (product: Product, quantity: number = 1) => {
    handleAddToCart(product, quantity);
    setShowCheckout(true);
  };

  const handleRemoveFromCart = (productId: string) => {
    const newCart = cart.filter(item => item.product.id !== productId);
    setCart(newCart);
    localStorage.setItem('cafe_cart', JSON.stringify(newCart));
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerAddress || cart.length === 0) return;

    setIsSubmitting(true);
    localStorage.setItem('customer_name', customerName);
    localStorage.setItem('customer_phone', customerPhone);
    localStorage.setItem('customer_address', customerAddress);

    try {
      const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const newOrder = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        items: cart,
        total: totalAmount,
        status: 'Pending Confirmation',
        created_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'cafe_orders'), newOrder);
      setOrderSuccess(docRef.id);
      setCart([]);
      localStorage.removeItem('cafe_cart');
      setShowCheckout(false);
      setIsSubmitting(false);
      setActiveTab('order');
    } catch (err) {
      console.error('Error placing order:', err);
      setIsSubmitting(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Filter user orders by saved customerPhone so they see their own orders without re-entering
  const myOrders = orders.filter(o => customerPhone && o.customer_phone === customerPhone);

  return (
    <div className="bg-[#f4f9f4] min-h-screen font-sans text-[#1c2e1f] pb-36">
      {/* Light Pale Green Header */}
      <header className="sticky top-0 z-50 bg-[#e8f5e9]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#c8e6c9]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#2e7d32] shadow-sm active:scale-90 transition-transform"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#1b5e20]">Drink & Cafe</h1>
            <p className="text-[10px] font-bold text-[#388e3c] uppercase tracking-widest">Fresh Artisanal Menu</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowCheckout(true)}
          className="w-12 h-12 rounded-2xl bg-[#2e7d32] flex items-center justify-center text-white shadow-lg shadow-[#2e7d32]/30 active:scale-90 transition-transform relative"
        >
          <ShoppingBag size={20} />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#1b5e20] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-white">
              {cartItemCount}
            </span>
          )}
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {/* Navigation Tabs Header */}
        <div className="flex gap-2 mb-6 bg-[#e8f5e9] p-2 rounded-2xl border border-[#c8e6c9]">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === 'home' ? 'bg-[#2e7d32] text-white shadow-md' : 'text-[#2e7d32] hover:bg-[#c8e6c9]/50'}`}
          >
            Menu
          </button>
          <button 
            onClick={() => setActiveTab('like')}
            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === 'like' ? 'bg-[#2e7d32] text-white shadow-md' : 'text-[#2e7d32] hover:bg-[#c8e6c9]/50'}`}
          >
            Favorites ({likedIds.length})
          </button>
          <button 
            onClick={() => setActiveTab('order')}
            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === 'order' ? 'bg-[#2e7d32] text-white shadow-md' : 'text-[#2e7d32] hover:bg-[#c8e6c9]/50'}`}
          >
            My Orders ({myOrders.length})
          </button>
        </div>

        {activeTab === 'order' ? (
          /* Orders & Tracking View */
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#c8e6c9]">
              <h2 className="text-2xl font-black text-[#1b5e20] mb-2">Order Tracking</h2>
              <p className="text-xs font-bold text-slate-500 mb-4">Orders placed with phone: <span className="text-[#2e7d32] font-black">{customerPhone || 'Not set'}</span></p>
              
              {!customerPhone && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Enter your phone number to view orders:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. 017xxxxxxxx"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="flex-1 px-4 py-3 bg-[#f4f9f4] rounded-2xl border border-[#c8e6c9] font-bold text-sm"
                    />
                    <button 
                      onClick={() => localStorage.setItem('customer_phone', customerPhone)}
                      className="px-6 py-3 bg-[#2e7d32] text-white rounded-2xl font-black text-sm"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {myOrders.length > 0 ? (
              <div className="space-y-4">
                {myOrders.map((ord, idx) => (
                  <motion.div 
                    key={ord.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-[#c8e6c9]"
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase bg-[#e8f5e9] text-[#2e7d32] px-3 py-1 rounded-full">
                          Order #{ord.id.slice(0, 6)}
                        </span>
                        <p className="text-xs font-bold text-slate-400 mt-1">
                          {new Date(ord.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-[#1b5e20]">{ord.total} ৳</span>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-600 mt-1">
                          <Clock size={14} />
                          {ord.status}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {ord.items?.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm font-bold">
                          <span className="text-slate-700">{item.product.name} x {item.quantity}</span>
                          <span className="text-slate-900">{item.product.price * item.quantity} ৳</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#f4f9f4] p-4 rounded-2xl text-xs font-bold text-slate-600 flex items-center gap-2">
                      <MapPin size={16} className="text-[#2e7d32] shrink-0" />
                      <span>Delivery to: {ord.customer_address}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-[#c8e6c9]">
                <Clock className="mx-auto text-[#c8e6c9] mb-4" size={48} />
                <h3 className="text-lg font-black text-[#1b5e20]">No orders found</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Your recent cafe orders will appear here automatically.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Big Immersive Hero Banner */}
            <section className="mb-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative h-[26rem] rounded-[3.5rem] overflow-hidden shadow-2xl group"
              >
                <img 
                  src="https://images.unsplash.com/photo-1541167760496-162955ed8a9f?auto=format&fit=crop&q=80&w=1200" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt="Cafe Featured"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-8 sm:p-12">
                  <span className="bg-[#c8e6c9] text-[#1b5e20] text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest w-fit mb-4">
                    ✨ Chef's Special
                  </span>
                  <h2 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-3">
                    Artisanal Brews<br/>& Fresh Pastries
                  </h2>
                  <p className="text-white/80 text-sm font-medium max-w-md mb-6">
                    Crafted daily with organic beans and premium ingredients. Taste the perfection in every sip.
                  </p>
                  <button 
                    onClick={() => {
                      const first = products[0];
                      if (first) handleBuyNow(first);
                    }}
                    className="flex items-center gap-3 bg-[#e8f5e9] text-[#1b5e20] px-8 py-4 rounded-full font-black text-sm transition-all hover:bg-white w-fit active:scale-95 shadow-lg"
                  >
                    Order Special Now
                    <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            </section>

            {/* Search Input */}
            <section className="mb-8">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#2e7d32]" size={20} />
                <input 
                  type="text"
                  placeholder="Search coffee, tea, burgers, desserts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-white rounded-3xl border border-[#c8e6c9] focus:ring-4 focus:ring-[#2e7d32]/10 text-sm font-bold shadow-sm placeholder:text-slate-400"
                />
              </div>
            </section>

            {/* Category Buttons with Light Pale Green Theme */}
            <section className="mb-10">
              <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-3 px-6 py-4 rounded-2xl whitespace-nowrap transition-all duration-300 font-black text-sm ${
                      activeCategory === cat.id 
                      ? 'bg-[#2e7d32] text-white shadow-xl shadow-[#2e7d32]/20 scale-105' 
                      : 'bg-white border border-[#c8e6c9] text-[#2e7d32] hover:bg-[#e8f5e9]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeCategory === cat.id ? 'bg-white/20' : 'bg-[#e8f5e9]'}`}>
                      {cat.icon}
                    </div>
                    {cat.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Products Grid - Bigger & Immersive */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-[#1b5e20]">
                  {activeTab === 'like' ? 'Your Favorite Treats' : (activeCategory === 'All' ? 'Menu Highlights' : `${activeCategory} Menu`)}
                </h3>
                <span className="text-xs font-black text-[#388e3c] bg-[#e8f5e9] px-3 py-1 rounded-full">
                  {filteredProducts.length} Items Available
                </span>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-80 bg-white animate-pulse rounded-[3rem]" />
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {filteredProducts.map((product) => (
                    <motion.div 
                      key={product.id}
                      layoutId={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -6 }}
                      onClick={() => setSelectedProduct(product)}
                      className="bg-white rounded-[3rem] p-5 border border-[#c8e6c9] shadow-sm hover:shadow-2xl transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden mb-5 bg-[#f4f9f4]">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <button 
                          onClick={(e) => toggleLike(product.id, e)}
                          className={`absolute top-4 right-4 w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            likedIds.includes(product.id) 
                            ? 'bg-red-500 text-white shadow-lg' 
                            : 'bg-white/90 backdrop-blur-md text-[#2e7d32] hover:scale-110'
                          }`}
                        >
                          <Heart size={20} fill={likedIds.includes(product.id) ? "currentColor" : "none"} />
                        </button>
                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-[#1b5e20]">
                          {product.category}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-xl font-black text-[#1c2e1f] group-hover:text-[#2e7d32] transition-colors">
                            {product.name}
                          </h4>
                          <span className="text-xl font-black text-[#1b5e20] shrink-0">{product.price} ৳</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 line-clamp-2 mb-6">
                          {product.description || 'Prepared fresh on order with high quality ingredients.'}
                        </p>

                        <div className="flex items-center gap-3">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleBuyNow(product); }}
                            className="flex-1 bg-[#2e7d32] text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-[#1b5e20] transition-colors shadow-md shadow-[#2e7d32]/20"
                          >
                            Order Now
                            <ArrowRight size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                            className="w-14 h-14 bg-[#e8f5e9] rounded-2xl flex items-center justify-center text-[#2e7d32] hover:bg-[#c8e6c9] active:scale-95 transition-all"
                          >
                            <Plus size={24} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 bg-white rounded-[3rem] border border-[#c8e6c9]">
                  <Utensils className="mx-auto text-[#c8e6c9] mb-4" size={48} />
                  <h3 className="text-xl font-black text-[#1b5e20]">No items found</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Try searching for something else</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Cart & Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-2xl font-black text-[#1b5e20]">Your Cafe Order</h3>
                <button 
                  onClick={() => setShowCheckout(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black"
                >
                  ✕
                </button>
              </div>

              {cart.length > 0 ? (
                <div className="space-y-6">
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#f4f9f4] p-4 rounded-2xl">
                        <div>
                          <h5 className="font-black text-sm text-slate-900">{item.product.name}</h5>
                          <p className="text-xs font-bold text-[#2e7d32]">{item.product.price} ৳ × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-900">{item.product.price * item.quantity} ৳</span>
                          <button 
                            onClick={() => handleRemoveFromCart(item.product.id)}
                            className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#e8f5e9] p-4 rounded-2xl flex items-center justify-between font-black text-lg text-[#1b5e20]">
                    <span>Total Amount:</span>
                    <span>{cartTotal} ৳</span>
                  </div>

                  <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-500 mb-1">Your Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Rahim Ahmed"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-4 py-3 bg-[#f4f9f4] rounded-2xl border border-[#c8e6c9] font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-500 mb-1">Phone Number (For Tracking)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 017xxxxxxxx"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-4 py-3 bg-[#f4f9f4] rounded-2xl border border-[#c8e6c9] font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-500 mb-1">Delivery Address</label>
                      <textarea 
                        required
                        rows={2}
                        placeholder="House, Road, Area..."
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="w-full px-4 py-3 bg-[#f4f9f4] rounded-2xl border border-[#c8e6c9] font-bold text-sm resize-none"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#2e7d32] text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-[#2e7d32]/30 active:scale-95 transition-all"
                    >
                      {isSubmitting ? 'Placing Order...' : `Confirm Order (${cartTotal} ৳)`}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingBag className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="font-black text-slate-600">Your cart is empty.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductModal 
            product={selectedProduct} 
            isOpen={true} 
            onClose={() => setSelectedProduct(null)} 
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            allProducts={products}
            onProductSelect={(p) => setSelectedProduct(p)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
