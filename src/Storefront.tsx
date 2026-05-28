import { Filter, LayoutGrid, AlertCircle, CheckCircle2, X, Utensils, Shirt, Cpu, Bot, Laptop, Dumbbell, ShoppingCart, Scissors, User2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import HeroBanner from './components/Banner';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import CheckoutModal from './components/CheckoutModal';
import TrackingModal from './components/TrackingModal';
import WhatsappSupport from './components/WhatsappSupport';
import BottomNav from './components/BottomNav';
import CategoryScroller from './components/CategoryScroller';
import SellerModal from './components/SellerModal';
import AuthModal, { UserProfile } from './components/AuthModal';
import { db } from './lib/firebase';
import { collection, onSnapshot, query, addDoc, where, doc, updateDoc, increment } from 'firebase/firestore';
import { Banner, Product, CartItem, Seller } from './types';
import { getSellers } from './lib/db-sync';
import { formatWhatsappNumber } from './lib/utils';

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [discountFilter, setDiscountFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const categories = [
    { name: 'All', icon: LayoutGrid },
    { name: 'Food', icon: Utensils },
    { name: 'Fashion', icon: Shirt },
    { name: 'Gadget', icon: Cpu },
    { name: 'Robotic', icon: Bot },
    { name: 'PC', icon: Laptop },
    { name: 'Cloth', icon: Scissors },
    { name: 'Sports', icon: Dumbbell },
    { name: 'Grocery', icon: ShoppingCart },
  ];

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    let unsubProd = () => {};
    let unsubBanner = () => {};

    try {
      unsubProd = onSnapshot(query(collection(db, 'products')), (snapshot) => {
        const prodData = snapshot.docs.map(doc => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            name: data.name || '',
            description: data.description || '',
            price: Number(data.price || 0),
            image: data.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
            rating: Number(data.rating || 4.5),
            discount: Number(data.discount || 0),
            category: data.category || '',
            stock: data.stock !== undefined ? Number(data.stock) : 20,
            total_stock: data.total_stock !== undefined ? Number(data.total_stock) : 30,
            created_at: data.created_at || new Date().toISOString(),
            images: data.images || [],
            flashSaleEnd: data.flashSaleEnd || null,
            seller: data.seller || '',
            seller_whatsapp: data.seller_whatsapp || '',
            seller_logo: data.seller_logo || ''
          } as Product;
        });
        prodData.sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setProducts(prodData);
        setLoading(false);
      }, (error) => {
        console.error('Firebase product error', error);
        setError(error.message);
        setLoading(false);
      });

      unsubBanner = onSnapshot(query(collection(db, 'banners')), (snapshot) => {
        const bannerData = snapshot.docs.map(doc => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            title: data.title || '',
            image: data.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
            created_at: data.created_at || new Date().toISOString()
          } as Banner;
        });
        bannerData.sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setBanners(bannerData);
      }, (error) => {
        console.error('Firebase banner error', error);
      });

      // Fetch sellers
      const fetchSellers = async () => {
        const data = await getSellers();
        setSellers(data);
      };
      fetchSellers();
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to load store data');
      setLoading(false);
    }

    return () => {
      unsubProd();
      unsubBanner();
    };
  }, []);

  const fetchData = async () => {
    setError(null);
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  // Real-time mobile push notifications for status updates
  useEffect(() => {
    const savedWhatsapp = localStorage.getItem('customer_whatsapp') || (user && user.whatsapp ? formatWhatsappNumber(user.whatsapp) : null);
    const usernameKey = user ? user.username : null;

    if (!savedWhatsapp && !usernameKey) return;

    const lastStatuses: Record<string, string> = {};

    const triggerNotification = (title: string, body: string) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        console.log('Mobile Alert details locked or ungranted:', title);
        return;
      }
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
        audio.play().catch(e => console.log('Audio playback delayed:', e));
      } catch (e) {}

      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: 'https://i.postimg.cc/KvqR53hq/download-(1).png',
            badge: 'https://i.postimg.cc/KvqR53hq/download-(1).png',
            vibrate: [200, 100, 200]
          } as any);
        });
      } else {
        new Notification(title, {
          body,
          icon: 'https://i.postimg.cc/KvqR53hq/download-(1).png'
        });
      }
    };

    const processSnapshot = (docs: any[]) => {
      docs.forEach(doc => {
        const orderId = doc.id;
        const data = doc.data();
        const status = data.status;
        const name = data.product_name || 'Your order';

        if (lastStatuses[orderId] !== undefined) {
          if (lastStatuses[orderId] !== status) {
            // State transitioned! Broadcast Notification
            if (status === 'confirmed') {
              triggerNotification(
                'Order Confirmed! 🎉',
                `Thank you! Your order for ${name.split('\n')[0]} has been confirmed.`
              );
            } else if (status === 'packing') {
              triggerNotification(
                'Order Packing! 📦',
                `Great news! We are currently packing your products for ${name.split('\n')[0]}.`
              );
            } else if (status === 'shipping') {
              triggerNotification(
                'Out for Delivery! 🚚',
                `Your package has been shipped and is out for delivery!`
              );
            } else if (status === 'completed') {
              triggerNotification(
                'Order Completed! ✅',
                `We hope you loved your items! Thank you for buying from pbazar.`
              );
            }
          }
        }
        // Save state status
        lastStatuses[orderId] = status;
      });
    };

    let unsubWhatsapp = () => {};
    let unsubUsername = () => {};

    if (savedWhatsapp) {
      const qW = query(collection(db, 'orders'), where('whatsapp', '==', savedWhatsapp));
      unsubWhatsapp = onSnapshot(qW, (snapshot) => {
        processSnapshot(snapshot.docs);
      });
    }

    if (usernameKey) {
      const qU = query(collection(db, 'orders'), where('customer_username', '==', usernameKey));
      unsubUsername = onSnapshot(qU, (snapshot) => {
        processSnapshot(snapshot.docs);
      });
    }

    return () => {
      unsubWhatsapp();
      unsubUsername();
    };
  }, [user]);

  useEffect(() => {
    const filtered = products.filter(p => {
      const pName = p.name || '';
      const pDesc = p.description || '';
      const matchSearch = pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pDesc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDiscount = discountFilter ? p.discount === discountFilter : true;
      const matchCategory = categoryFilter ? (
        String(p.category || '').toLowerCase() === categoryFilter.toLowerCase()
      ) : true;
      return matchSearch && matchDiscount && matchCategory;
    });
    setFilteredProducts(filtered);
  }, [searchQuery, products, discountFilter, categoryFilter]);



  async function submitOrder(customer_name: string, whatsapp: string, location: string): Promise<void> {
    if (cart.length === 0) return;

    const combinedProductNames = cart
      .map(item => `${item.quantity}x ${item.product.name}`)
      .join('\n');
      
    const combinedProductIds = cart.map(item => item.product.id).join(', ');
    
    const totalPrice = cart.reduce((sum, item) => {
      const hasDiscount = item.product.discount && item.product.discount > 0;
      const price = hasDiscount 
        ? item.product.price * (1 - (item.product.discount || 0) / 100) 
        : item.product.price;
      return sum + price * item.quantity;
    }, 0);

    const formattedWhatsapp = formatWhatsappNumber(whatsapp);

    console.log("Submitting Order Data:", {
      product_id: combinedProductIds,
      product_name: combinedProductNames,
      price: totalPrice,
      customer_name,
      whatsapp: formattedWhatsapp,
      location,
      status: 'pending'
    });
    
    try {
      const docRef = await addDoc(collection(db, "orders"), {
        product_id: combinedProductIds,
        product_name: combinedProductNames,
        price: totalPrice,
        customer_name,
        customer_username: user?.username || null,
        customer_uid: user?.uid || null,
        customer_image: user?.profileImage || null,
        whatsapp: formattedWhatsapp,
        location,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      // Track coordinates for immediate client status notifications
      localStorage.setItem('customer_whatsapp', formattedWhatsapp);
      const savedIds = JSON.parse(localStorage.getItem('tracked_order_ids') || '[]');
      if (!savedIds.includes(docRef.id)) {
        savedIds.push(docRef.id);
        localStorage.setItem('tracked_order_ids', JSON.stringify(savedIds));
      }

      // Decrement real stock by ordered quantity inside Firestore for inventory tracking
      for (const item of cart) {
        if (item.product.id) {
          try {
            const productRef = doc(db, "products", item.product.id);
            await updateDoc(productRef, {
              stock: increment(-item.quantity)
            });
            console.log(`Decremented stock for ${item.product.name} by ${item.quantity}`);
          } catch (stockErr) {
            console.error("Failed to update product stock", stockErr);
          }
        }
      }

      console.log("Order Successful");
      setSuccessMessage("Order Placed Successfully!");
      setCart([]); // Clear cart after successful order
      
      // Auto-hide success message
      setTimeout(() => setSuccessMessage(""), 6000);
    } catch (err: any) {
      console.error("INSERT FAILED:", err);
      if (!err.message?.includes('alert')) {
        window.alert(`❌ Submission Failed: ${err.message || 'Unknown error'}`);
      }
      throw err;
    }
  }

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { product, quantity }];
    });
  };

  const handleBuyNow = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { product, quantity }];
    });
    
    if (!user) {
      setAlertMessage("Please create a profile or log in with email and password first!");
      setIsAuthOpen(true);
      return;
    }
    setIsModalOpen(true);
  };



  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const handleOpenCart = () => {
    if (!user) {
      setAlertMessage("Please create a profile or log in with email and password first!");
      setIsAuthOpen(true);
      return;
    }
    setIsModalOpen(true);
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar 
        onSearch={setSearchQuery} 
        cartCount={cartItemCount} 
        onCartClick={handleOpenCart} 
        onTrackOrderClick={() => setIsTrackingOpen(true)}
        onLoginClick={() => setIsAuthOpen(true)}
        onLogoutClick={async () => {
          try {
            const { getAuth, signOut } = await import('firebase/auth');
            const auth = getAuth();
            await signOut(auth);
          } catch (e) {
            console.warn('Firebase sign out error:', e);
          }
          localStorage.removeItem('user');
          localStorage.removeItem('customer_whatsapp');
          setUser(null);
        }}
        onEditProfileClick={() => setIsAuthOpen(true)}
        user={user}
        categories={categories.map(c => c.name)}
        categoryFilter={categoryFilter}
        onCategoryFilter={setCategoryFilter}
        discountFilter={discountFilter}
        onDiscountFilter={setDiscountFilter}
        products={products}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-8 space-y-12 pb-24 scroll-smooth">
        <HeroBanner banners={banners} />
        
        {/* AI Finder */}
        <div className="mb-6 hidden">
          <div className="relative">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🤖 AI Finder: What are you looking for today? (e.g., 'fresh food', 'fashion')"
              className="w-full pl-4 pr-4 py-4 rounded-full border-2 border-orange-200 focus:border-orange-500 outline-none text-sm font-medium shadow-sm transition-all"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 font-bold text-xs bg-orange-100 px-3 py-1 rounded-full">AI Active</div>
          </div>
        </div>

        {/* Category Buttons */}
        <div className="-mx-4 px-4 sm:-mx-8 sm:px-8 flex gap-2 mb-8 overflow-x-auto pb-4 scrollbar-hidden">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setCategoryFilter(cat.name === 'All' ? null : cat.name)}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 shadow-sm transition-all text-slate-800 min-w-[70px] ${categoryFilter === cat.name || (categoryFilter === null && cat.name === 'All') ? 'border-orange-500 bg-orange-50' : 'bg-white border-slate-200 hover:border-orange-300'}`}
            >
              <cat.icon size={24} className={categoryFilter === cat.name || (categoryFilter === null && cat.name === 'All') ? 'text-orange-600' : 'text-orange-500'} />
              <span className="text-[10px] font-bold whitespace-nowrap">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Top Sellers Section */}
        {sellers.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-5">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
                    <User2 className="text-orange-600" size={18} />
                 </div>
                 <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Top Sellers</h2>
               </div>
            </div>
             <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hidden -mx-4 px-4 sm:-mx-8 sm:px-8">
               {sellers.filter(s => s.is_top !== false).map(seller => (
                 <button
                   key={seller.id}
                   onClick={() => setSelectedSeller(seller)}
                   className="flex flex-col items-center gap-2 group shrink-0 relative"
                 >
                   <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] bg-white border border-slate-200 shadow-sm overflow-hidden p-2 group-hover:border-orange-500 group-hover:shadow-lg group-hover:shadow-orange-500/10 transition-all active:scale-95 relative flex items-center justify-center">
                      {seller.logo ? (
                        <img src={seller.logo} alt={seller.name} className="w-full h-full object-contain rounded-[1.75rem]" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                           <User2 size={36} />
                        </div>
                      )}
                      
                      {/* Floating Indicator Icons for Social Presence */}
                      <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
                        {seller.tiktok && seller.tiktok.trim() !== '' && seller.tiktok.toLowerCase().includes('tiktok.com') && (
                          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-md p-0.5" title="TikTok Present">
                             <img 
                               src="https://sf-static.tiktokcdn.com/obj/eden-sg/uhtyvueh7nulogpoguhm/tiktok-icon2.png" 
                               alt="" 
                               className="w-full h-full object-contain rounded-full"
                             />
                          </div>
                        )}
                        {seller.facebook && seller.facebook.trim() !== '' && (seller.facebook.toLowerCase().includes('facebook.com') || seller.facebook.toLowerCase().includes('fb.com') || seller.facebook.toLowerCase().includes('fb.me')) && (
                          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-md p-0.5" title="Facebook Present">
                             <img 
                               src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm0F2xlq4BO9-4boQ1D9oGwXTiYfW5KcUvew&s" 
                               alt="" 
                               className="w-full h-full object-contain rounded-full"
                             />
                          </div>
                        )}
                        {seller.instagram && seller.instagram.trim() !== '' && seller.instagram.toLowerCase().includes('instagram.com') && (
                          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-md p-0.5" title="Instagram Present">
                             <img 
                               src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/250px-Instagram_logo_2016.svg.png" 
                               alt="" 
                               className="w-full h-full object-contain rounded-full"
                             />
                          </div>
                        )}
                      </div>
                   </div>
                   <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest max-w-[80px] truncate">{seller.name}</span>
                 </button>
               ))}
            </div>
          </section>
        )}
        
        <section>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-[3/4] glass animate-pulse rounded-[2rem]" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20 glass rounded-2xl border border-dashed border-red-200">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-500 text-sm font-bold">{error}</p>
              <button 
                onClick={fetchData}
                className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Retry
              </button>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-8">
              {filteredProducts.map((product) => (
                <div key={product.id}>
                  <ProductCard 
                    product={product} 
                    onBuy={handleBuyNow} 
                    onAddToCart={handleAddToCart}
                    onClick={setSelectedProduct}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-32 glass rounded-[2.5rem] border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold tracking-tight">No products found matching your search.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="hidden md:block glass border-t border-slate-200 mt-12 mb-0 relative z-40 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-6">
          <div className="flex flex-wrap items-center justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-6 gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-slate-800 text-xs text-opacity-100">© 2026 pbazar — Trusted Online Shop in Bangladesh</span>
              <span className="text-slate-400 normal-case tracking-normal">Company Info: Premium Quality Goods & Fast Delivery.</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-8 items-center justify-between border-t border-slate-200 pt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-900 rounded-full shadow-lg shadow-black/50 blink"></div> 
              Orders Live ({products.reduce((acc, p) => acc + (p.stock || 0), 0) > 0 ? products.length * 2 + 5 : products.length} Active)
            </span>
            <div className="flex gap-6 items-center">
              <a href="#" className="hover:text-black transition-colors">Instagram: @quats.co</a>
              <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-black transition-colors">Terms & Conditions</a>
            </div>
          </div>
        </div>
      </footer>
      
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .blink { animation: blink 2s infinite; }
      `}</style>
      
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={setUser}
        initialUser={user}
      />

      <TrackingModal 
        isOpen={isTrackingOpen} 
        onClose={() => setIsTrackingOpen(false)} 
        user={user}
      />

      <CheckoutModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        cartItems={cart}
        onSubmit={submitOrder}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        user={user}
      />

      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        allProducts={products}
        onProductSelect={setSelectedProduct}
        sellers={sellers}
        onSellerSelect={setSelectedSeller}
      />

      <SellerModal
        seller={selectedSeller}
        isOpen={!!selectedSeller}
        onClose={() => setSelectedSeller(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onProductClick={setSelectedProduct}
      />

      <WhatsappSupport />

      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%', scale: 0.8 }}
            className="fixed top-0 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm text-left font-sans animate-in fade-in"
          >
            <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-800 flex items-center gap-4 overflow-hidden relative">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
              >
                <AlertCircle className="w-6 h-6 text-orange-400" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold tracking-tight">{alertMessage}</p>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5 leading-tight">Explore our products and find great deals!</p>
              </div>
              <button 
                onClick={() => setAlertMessage(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors self-start cursor-pointer"
              >
                <X size={16} className="text-slate-500" />
              </button>

              {/* Progress bar */}
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 4, ease: "linear" }}
                className="absolute bottom-0 left-0 h-1 bg-orange-400"
              />
            </div>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%', scale: 0.8 }}
            className="fixed top-0 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm"
          >
            <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-800 flex items-center gap-4 overflow-hidden relative text-left">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.4)]"
              >
                <CheckCircle2 className="w-6 h-6" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold tracking-tight">Order Placed Successfully!</p>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5 leading-tight">We will contact you via WhatsApp shortly.</p>
              </div>
              <button 
                onClick={() => setSuccessMessage("")}
                className="p-2 hover:bg-white/10 rounded-full transition-colors self-start"
              >
                <X size={16} className="text-slate-500" />
              </button>

              {/* Progress bar for auto-hide */}
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 6, ease: "linear" }}
                className="absolute bottom-0 left-0 h-1 bg-white/30"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <BottomNav 
        onHomeClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onProfileClick={() => setIsAuthOpen(true)}
        onOrdersClick={() => setIsTrackingOpen(true)}
        onCartClick={handleOpenCart}
        onSupportClick={() => window.open('https://wa.me/8801716807465', '_blank', 'noopener,noreferrer')}
        cartCount={cartItemCount}
        user={user}
      />
    </div>
  );
}
