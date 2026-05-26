import { Filter, LayoutGrid, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import HeroBanner from './components/Banner';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import CheckoutModal from './components/CheckoutModal';
import WhatsappSupport from './components/WhatsappSupport';
import { supabase } from './lib/supabase';
import { Banner, Product, CartItem } from './types';

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [discountFilter, setDiscountFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const categories = ["Electronic", "Fashion", "Bazer", "Cloth", "Festive", "Laptop", "Mobile", "Gadget", "Robotic"];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    const filtered = products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchDiscount = discountFilter ? p.discount === discountFilter : true;
      const matchCategory = categoryFilter ? (
        p.name.toLowerCase().includes(categoryFilter.toLowerCase()) || 
        (p.description && p.description.toLowerCase().includes(categoryFilter.toLowerCase()))
      ) : true;
      return matchSearch && matchDiscount && matchCategory;
    });
    setFilteredProducts(filtered);
  }, [searchQuery, products, discountFilter, categoryFilter]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data: bannerData, error: bannerError } = await supabase
        .from('banners')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (prodError) throw prodError;
      if (bannerError) throw bannerError;

      if (prodData) setProducts(prodData);
      if (bannerData) setBanners(bannerData);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to load store data');
    } finally {
      setLoading(false);
    }
  };

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

    console.log("Submitting Order Data:", {
      product_id: combinedProductIds,
      product_name: combinedProductNames,
      price: totalPrice,
      customer_name,
      whatsapp,
      location,
      status: 'pending'
    });
    
    try {
      const { data, error } = await supabase.from("orders").insert([
        {
          product_id: combinedProductIds,
          product_name: combinedProductNames,
          price: totalPrice,
          customer_name,
          whatsapp,
          location,
          status: 'pending'
        }
      ]).select();

      if (error) {
        console.error("SUPABASE ERROR:", error);
        window.alert(`❌ Error: ${error.message}`);
        throw error;
      } else {
        console.log("Order Successful:", data);
        setSuccessMessage("Order Placed Successfully!");
        setCart([]); // Clear cart after successful order
        fetchData();
      }
    } catch (err: any) {
      console.error("INSERT FAILED:", err);
      if (!err.message?.includes('alert')) {
        window.alert(`❌ Submission Failed: ${err.message || 'Unknown error'}`);
      }
      throw err;
    }
  }

  const handleAddToCart = (product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const handleBuyNow = (product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (cart.length === 0 && isModalOpen) {
      setIsModalOpen(false);
    }
  }, [cart.length, isModalOpen]);

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
    if (cart.length > 0) {
      setIsModalOpen(true);
    } else {
      window.alert("Your cart is empty!");
    }
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar 
        onSearch={setSearchQuery} 
        cartCount={cartItemCount} 
        onCartClick={handleOpenCart} 
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryFilter={setCategoryFilter}
        discountFilter={discountFilter}
        onDiscountFilter={setDiscountFilter}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-8 space-y-12 pb-24">
        <HeroBanner banners={banners} />
        
        <section>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
              {[...Array(16)].map((_, i) => (
                <div key={i} className="aspect-[3/4] glass animate-pulse rounded-lg" />
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
              {filteredProducts.map((product) => (
                <div key={product.id}>
                  <ProductCard 
                    product={product} 
                    onBuy={handleBuyNow} 
                    onAddToCart={handleAddToCart}
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

      <footer className="glass border-t border-slate-200 mt-12 mb-0 relative z-40 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-6">
          <div className="flex flex-wrap items-center justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-6 gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-slate-800 text-xs text-opacity-100">© 2024 Bazar_bds.com — Trusted Online Shop in Bangladesh</span>
              <span className="text-slate-400 normal-case tracking-normal">Company Info: Premium Quality Goods & Fast Delivery.</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-8 items-center justify-between border-t border-slate-200 pt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full shadow-lg shadow-green-500/50 blink"></div> 
              Orders Live (32 New)
            </span>
            <div className="flex gap-6 items-center">
              <a href="#" className="hover:text-orange-500 transition-colors">Instagram: @quats.co</a>
              <a href="#" className="hover:text-orange-500 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-orange-500 transition-colors">Terms & Conditions</a>
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
      
      <CheckoutModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        cartItems={cart}
        onSubmit={submitOrder}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
      />

      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-2xl shadow-green-500/20 border border-green-100"
          >
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{successMessage}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">We will contact you via WhatsApp shortly.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <WhatsappSupport />
    </div>
  );
}
