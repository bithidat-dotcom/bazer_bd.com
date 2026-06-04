import React, { useEffect, useState } from 'react';
import { X, Phone, Instagram, User2, ShoppingBag, CheckCircle2 } from 'lucide-react';
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

  useEffect(() => {
    if (isOpen && seller) {
      const fetchProducts = async () => {
        setLoading(true);
        const data = await getProductsBySeller(seller.name);
        setProducts(data);
        setLoading(false);
      };
      fetchProducts();
    }
  }, [isOpen, seller]);

  if (!seller) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-6 bg-slate-950/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="relative h-48 sm:h-56 shrink-0 bg-slate-900 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600/40 via-transparent to-black/60 z-0" />
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 z-20 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-xl text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg"
              >
                <X size={24} />
              </button>

              <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8 flex items-end gap-5 sm:gap-8 z-10 bg-gradient-to-t from-slate-950/80 to-transparent">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-white p-2 border-2 border-white/20 shadow-2xl overflow-hidden shrink-0 flex items-center justify-center">
                   {seller.logo ? (
                     <img src={seller.logo} alt={seller.name} className="w-full h-full object-contain rounded-[1.25rem]" referrerPolicy="no-referrer" />
                   ) : (
                     <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                       <User2 size={48} />
                     </div>
                   )}
                </div>
                <div className="pb-2 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter leading-none drop-shadow-md">
                      {seller.name}
                    </h2>
                    {seller.is_verified && (
                      <CheckCircle2 size={24} className="text-blue-400 fill-blue-400/10 drop-shadow-lg" />
                    )}
                  </div>
                    <div className="flex flex-wrap gap-2.5">
                      {/* WhatsApp */}
                      {seller.whatsapp && seller.whatsapp.trim() !== '' && (
                        <a 
                          href={`https://wa.me/${seller.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 text-xs font-black uppercase tracking-tight"
                        >
                          <Phone size={14} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      
                      {/* Facebook - Now before TikTok as requested by logical order fix */}
                      {seller.facebook && seller.facebook.trim() !== '' && (seller.facebook.toLowerCase().includes('facebook.com') || seller.facebook.toLowerCase().includes('fb.com') || seller.facebook.toLowerCase().includes('fb.me')) && (
                        <a 
                          href={seller.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-blue-600/20 overflow-hidden border border-slate-100 p-1"
                          title="Facebook"
                        >
                          <img 
                            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm0F2xlq4BO9-4boQ1D9oGwXTiYfW5KcUvew&s" 
                            alt="Facebook" 
                            className="w-full h-full object-contain"
                          />
                        </a>
                      )}

                      {/* TikTok */}
                      {seller.tiktok && seller.tiktok.trim() !== '' && seller.tiktok.toLowerCase().includes('tiktok.com') && (
                         <a 
                           href={seller.tiktok}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-xl overflow-hidden flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-black/20 p-1"
                           title="TikTok"
                         >
                           <img 
                             src="https://sf-static.tiktokcdn.com/obj/eden-sg/uhtyvueh7nulogpoguhm/tiktok-icon2.png" 
                             alt="TikTok" 
                             className="w-full h-full object-contain"
                           />
                         </a>
                      )}
                      
                      {/* Instagram */}
                      {seller.instagram && seller.instagram.trim() !== '' && seller.instagram.toLowerCase().includes('instagram.com') && (
                        <a 
                          href={seller.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-pink-500/20 overflow-hidden border border-slate-100 p-1"
                          title="Instagram"
                        >
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/250px-Instagram_logo_2016.svg.png" 
                            alt="Instagram" 
                            className="w-full h-full object-contain"
                          />
                        </a>
                      )}
                    </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                 <div className="flex items-center gap-2">
                   <ShoppingBag className="text-orange-500" size={20} />
                   <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Products Catalog</h3>
                 </div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{products.length} Products</span>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-square bg-slate-100 animate-pulse rounded-3xl" />
                  ))}
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {products.map(product => (
                    <div key={product.id}>
                      <ProductCard 
                        product={product}
                        onAddToCart={(p) => onAddToCart(p)}
                        onBuy={(p) => onBuyNow(p)}
                        onClick={(p) => onProductClick(p)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <User2 className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No products listed by this seller</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
