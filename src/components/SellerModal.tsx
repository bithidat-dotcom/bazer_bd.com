import React, { useEffect, useState, useRef } from 'react';
import { X, Phone, Instagram, User2, ShoppingBag, CheckCircle2, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Seller, Product } from '../types';
import { getProductsBySeller } from '../lib/db-sync';
import ProductCard from './ProductCard';

interface SellerModalProps {
  seller: Seller | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onBuyNow: (product: Product, quantity?: number) => void;
  onProductClick: (product: Product) => void;
}

export default function SellerModal({ 
  seller, 
  isOpen, 
  onClose,
  onAddToCart,
  onBuyNow,
  onProductClick
}: SellerModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && seller) {
      const fetchProducts = async () => {
        setLoading(true);
        const data = await getProductsBySeller(seller.name);
        setProducts(data);
        setLoading(false);
      };
      fetchProducts();
      
      // Reset scroll to top when opening
      if (scrollRef.current) {
        scrollRef.current.scrollTo(0, 0);
      }
    } else {
      setSearchTerm('');
    }
  }, [isOpen, seller]);

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!seller) return null;

  const filteredProducts = products.filter(p => {
    return p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.category?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const bestProducts = [...products]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  const bannerImg = "https://lh3.googleusercontent.com/aida/AP1WRLtLQwvZYVo_OImJvdG12DX3vbXg6-oI_fd9kauU3jfchhUS1zE_WPbN-xccgtOpERtG7FKGMkDN7Eorp_pwdxdod3xuIVZ8AJojXGkX-8UXkCiUKDjg3mqNXDvTpfUfp5eIHGmtuvEUCKSkSIfrs7gL5fpbAZH-IyTKl3PXOpf2yIaKUkuFKayHJG7VjbC4_ZUAmdNQYIAOjitgF3HkaD-enMKboOyS3vl3amFwZYSFObiw9HqYmmXefdbY=s1600";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md overflow-hidden">
          <motion.div
            ref={scrollRef}
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white w-full h-full overflow-y-auto relative scroll-smooth pb-24"
          >
            {/* Header / Banner Area */}
            <div className="relative h-48 sm:h-80 shrink-0 overflow-hidden">
              <img 
                src={bannerImg} 
                alt="Seller Banner" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20" />
              
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 z-20 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-xl text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Info Card (The "Box") */}
            <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-16 sm:-mt-24 relative z-10">
              <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col sm:flex-row items-center sm:items-end gap-6">
                <div 
                  onClick={scrollToTop}
                  className="w-28 h-28 sm:w-40 sm:h-40 rounded-[2rem] sm:rounded-3xl bg-white p-2 border-4 border-slate-50 shadow-xl overflow-hidden shrink-0 flex items-center justify-center -mt-20 sm:mt-0 cursor-pointer hover:scale-105 transition-transform"
                >
                   {seller.logo ? (
                     <img src={seller.logo} alt={seller.name} className="w-full h-full object-contain rounded-2xl" referrerPolicy="no-referrer" />
                   ) : (
                     <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                       <User2 size={48} />
                     </div>
                   )}
                </div>
                
                <div className="flex-1 text-center sm:text-left pb-2">
                  <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-4">
                    <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter leading-none">
                      {seller.name}
                    </h2>
                    {seller.is_verified && (
                      <CheckCircle2 size={24} className="text-blue-500 fill-blue-500/10" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                    {/* WhatsApp Contact */}
                    {seller.whatsapp && (
                      <a 
                        href={`https://wa.me/${seller.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-6 py-3 sm:px-5 sm:py-2.5 bg-[#25D366] text-white rounded-2xl sm:rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 text-xs font-black uppercase tracking-tight active:scale-95"
                      >
                        <img 
                          src="https://img.magnific.com/premium-vector/whatsapp-app-round-icon-popular-messenger-social-media-logo_277909-873.jpg?semt=ais_hybrid&w=740&q=80" 
                          className="w-5 h-5 object-contain rounded-full bg-white p-0.5" 
                          alt="WhatsApp"
                        />
                        <span>WhatsApp Me</span>
                      </a>
                    )}
                    
                    <div className="flex gap-3">
                      {seller.facebook && (
                        <a href={seller.facebook} target="_blank" rel="noopener noreferrer" className="w-11 h-11 sm:w-10 sm:h-10 bg-white border border-slate-100 rounded-2xl sm:rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-sm p-2"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm0F2xlq4BO9-4boQ1D9oGwXTiYfW5KcUvew&s" className="w-full h-full object-contain" /></a>
                      )}
                      {seller.instagram && (
                        <a href={seller.instagram} target="_blank" rel="noopener noreferrer" className="w-11 h-11 sm:w-10 sm:h-10 bg-white border border-slate-100 rounded-2xl sm:rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-sm p-2"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/250px-Instagram_logo_2016.svg.png" className="w-full h-full object-contain" /></a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-transparent">
              <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-12">
                
                {/* Search Bar */}
                <div className="bg-white p-4 sm:p-6 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative flex-1 w-full">
                      <ShoppingBag className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text"
                        placeholder={`Search in ${seller.name}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl text-slate-900 font-bold transition-all outline-none"
                      />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {filteredProducts.length} Items Found
                  </div>
                </div>

                {/* Best Products Section - Only if not searching */}
                {!searchTerm && bestProducts.length > 0 && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                        <ShoppingBag size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Best of {seller.name}</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Top rated products from this store</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      {bestProducts.map(product => (
                        <ProductCard 
                          key={`best-${product.id}`}
                          product={product}
                          onAddToCart={(p) => onAddToCart(p)}
                          onBuy={(p) => onBuyNow(p)}
                          onClick={(p) => onProductClick(p)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* All Products Grid */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                      <LayoutGrid size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                        {searchTerm ? 'Search Results' : 'Full Catalog'}
                      </h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                        {searchTerm ? `Showing matches for "${searchTerm}"` : 'Browse all products from this seller'}
                      </p>
                    </div>
                  </div>

                  {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="aspect-[4/5] bg-slate-100 animate-pulse rounded-3xl" />
                      ))}
                    </div>
                  ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {filteredProducts.map(product => (
                        <ProductCard 
                          key={product.id}
                          product={product}
                          onAddToCart={(p) => onAddToCart(p)}
                          onBuy={(p) => onBuyNow(p)}
                          onClick={(p) => onProductClick(p)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShoppingBag size={40} className="text-slate-200" />
                      </div>
                      <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">No products found</h4>
                      <p className="text-sm text-slate-400 font-bold max-w-xs mx-auto mt-2">
                        Try adjusting your search or browse the categories to find what you're looking for.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
