import { ShoppingCart, Star, Heart, Clock, Share2, CheckCircle2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { formatPrice } from '../lib/utils';
import { Product } from '../types';
import LoadingImage from './LoadingImage';
import { getProductLikesState, toggleProductLike, getProductReviews, getSellerInfoByName } from '../lib/db-sync';

interface ProductCardProps {
  product: Product; 
  onBuy: (product: Product, quantity?: number) => void; 
  onAddToCart?: (product: Product) => void; 
  onRemoveFromCart?: (productId: string) => void;
  isInCart?: boolean;
  onClick?: (product: Product) => void; 
  couponConfig?: { isActive: boolean; minPurchase: number; discountAmount: number }; 
  isSearchVariant?: boolean;
  isWholesale?: boolean;
  theme?: 'default' | 'warm';
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onBuy, 
  onAddToCart, 
  onRemoveFromCart,
  isInCart,
  onClick, 
  couponConfig, 
  isSearchVariant,
  isWholesale,
  theme = 'default'
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [sellerData, setSellerData] = useState<{ logo?: string; whatsapp?: string; is_verified?: boolean } | null>(null);
  const [quantity, setQuantity] = useState(isWholesale ? 5 : 1);

  useEffect(() => {
    let active = true;
    const fetchLikes = async () => {
      const state = await getProductLikesState(product.id);
      if (active) {
        setIsLiked(state.userLiked);
        setLikesCount(state.totalLikes);
      }
    };
    fetchLikes();

    window.addEventListener('favorites-updated', fetchLikes);
    return () => {
      active = false;
      window.removeEventListener('favorites-updated', fetchLikes);
    };
  }, [product.id]);

  // Fallback seller info logic
  useEffect(() => {
    let active = true;
    const fetchSellerFallback = async () => {
      if (!product.seller_whatsapp && product.seller) {
        const info = await getSellerInfoByName(product.seller);
        if (active && info) {
          setSellerData({
            logo: info.logo || info.seller_logo,
            whatsapp: info.whatsapp || info.seller_whatsapp,
            is_verified: info.is_verified || false
          });
        }
      }
    };
    fetchSellerFallback();
    return () => { active = false; };
  }, [product.seller, product.seller_whatsapp]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Optimistic UI updates
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);

    const nextState = await toggleProductLike(product.id);
    setIsLiked(nextState.userLiked);
    setLikesCount(nextState.totalLikes);
  };

  const hasDiscount = product.discount && product.discount > 0;
  const discountedPrice = hasDiscount 
    ? product.price * (1 - (product.discount || 0) / 100) 
    : product.price;

  // Let's get real rating dynamically calculated from server-side database reviews
  const [avgRating, setAvgRating] = useState(product.rating || 4.8);
  const [count, setCount] = useState(product.reviewCount || 12);

  useEffect(() => {
    let active = true;
    const handleReviewsUpdate = async () => {
      const { isFirestoreQuotaExceeded } = await import('../lib/db-sync');
      if (isFirestoreQuotaExceeded()) {
          if (active) {
            setAvgRating(product.rating || 4.8);
            setCount(product.reviewCount || 12);
          }
          return;
      }

      const reviews = await getProductReviews(product.id);
      if (!active) return;
      if (reviews.length > 0) {
        const sum = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
        setAvgRating(sum / reviews.length);
        setCount((product.reviewCount || 12) + reviews.filter((r: any) => !r.id.startsWith('mock-')).length);
      } else {
        setAvgRating(product.rating || 4.8);
        setCount(product.reviewCount || 12);
      }
    };
    handleReviewsUpdate();

    const eventName = `reviews-updated-${product.id}`;
    window.addEventListener(eventName, handleReviewsUpdate);
    return () => {
      active = false;
      window.removeEventListener(eventName, handleReviewsUpdate);
    };
  }, [product.id, product.rating, product.reviewCount]);

  const sellerLogo = product.seller_logo || sellerData?.logo;

  return (
      <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`group glass-card rounded-2xl flex flex-col relative overflow-hidden h-full shadow-sm ${theme === 'warm' ? 'bg-white hover:shadow-xl border-white/50 shadow-orange-500/5' : 'bg-white shadow-md hover:shadow-2xl hover:border-orange-200 border-slate-100'} border transition-all duration-500 cursor-pointer hover:-translate-y-1.5 ${isWholesale ? 'p-1 sm:p-2.5' : 'p-2 sm:p-4.5'}`}
      onClick={() => onClick && onClick(product)}
    >
        <div className={`relative w-full aspect-square rounded-xl ${theme === 'warm' ? 'bg-[#fff1eb]' : 'bg-white'} overflow-hidden ${isWholesale ? 'mb-1.5' : 'mb-3'}`}>
          {product.is_super_sale && (
            <div className="absolute top-2 left-2 z-30">
              <div className="bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg shadow-orange-600/30 animate-pulse">
                <Zap size={10} className="fill-current" />
                <span>SUPER SALE</span>
              </div>
            </div>
          )}
          {couponConfig?.isActive && product.price >= couponConfig.minPurchase && (
            <div className={`absolute z-10 bg-orange-500 text-white font-black px-1.5 py-0.5 rounded shadow-lg uppercase tracking-tight ${isWholesale ? 'top-12 left-1.5 text-[6px]' : 'top-16 left-2 sm:top-18 sm:left-2.5 text-[7px] sm:text-[9px]'}`}>
              Get {couponConfig.discountAmount}৳ Coupon
            </div>
          )}
          {/* Action Buttons Layer */}
          <div className={`absolute z-20 flex flex-col gap-2 transition-all ${isWholesale ? 'top-1.5 right-1.5' : 'top-2 right-2 sm:top-2.5 sm:right-2.5'}`}>
            {/* Like/Favorite floating button */}
            <button
              onClick={toggleLike}
              className={`${isWholesale ? 'px-1.5 h-6' : 'px-2 h-8 sm:px-2.5 sm:h-9'} rounded-full bg-white/90 backdrop-blur border border-slate-100 flex items-center justify-center gap-1.5 text-slate-500 hover:text-red-500 hover:scale-110 active:scale-95 shadow-md transition-all`}
              title={isLiked ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Heart size={isWholesale ? 11 : 13} className={`transition-transform duration-300 ${!isWholesale && 'sm:size-3.5'} ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400'}`} />
              {likesCount > 0 && <span className={`${isWholesale ? 'text-[8px]' : 'text-[10px] sm:text-[11px]'} font-bold text-slate-600 font-mono`}>{likesCount}</span>}
            </button>
          </div>

          <div onContextMenu={(e) => e.preventDefault()} className="select-none h-full">
            <LoadingImage 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
            />
          </div>
          {/* Badges Container Removed */}
        </div>
        
        <div className="px-1 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
            <h3 className={`font-bold line-clamp-1 ${theme === 'warm' ? 'text-[#251913] group-hover:text-pink-500' : 'text-slate-900 group-hover:text-orange-600'} transition-colors ${isWholesale ? 'text-[12px] sm:text-[14px]' : 'text-[14px] sm:text-base'}`}>
              {product.name}
            </h3>
          </div>
          <div className={`flex items-center gap-1.5 ${isWholesale ? 'mb-1' : 'mb-2'}`}>
            <div className="flex items-center gap-0.5">
              <Star size={isWholesale ? 10 : 12} className="fill-amber-500 text-amber-500" />
              <span className={`font-black text-amber-600 ${isWholesale ? 'text-[10px] sm:text-[12px]' : 'text-[11px] sm:text-[13px]'}`}>
                {avgRating.toFixed(1)}
              </span>
            </div>
            {count > 0 && (
              <span className={`font-medium ${theme === 'warm' ? 'text-[#584237]/60' : 'text-slate-400'} ${isWholesale ? 'text-[9px] sm:text-[11px]' : 'text-[10px] sm:text-[12px]'}`}>
                ({count})
              </span>
            )}
          </div>

          {isWholesale && (
            <div className="mb-2 bg-orange-50 border border-orange-100 rounded-lg p-1.5 flex items-center justify-between">
               <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest">Min 5</span>
               <div className="flex items-center gap-2 bg-white px-1.5 py-0.5 rounded-md border border-orange-200">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuantity(prev => Math.max(5, prev - 1));
                    }}
                    className="w-4 h-4 rounded-sm bg-orange-100 text-orange-600 flex items-center justify-center font-black active:scale-90 text-[10px]"
                  >
                    -
                  </button>
                  <span className="text-[10px] font-black text-slate-900 min-w-[14px] text-center">{quantity}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuantity(prev => Math.min(100, prev + 1));
                    }}
                    className="w-4 h-4 rounded-sm bg-orange-100 text-orange-600 flex items-center justify-center font-black active:scale-90 text-[10px]"
                  >
                    +
                  </button>
               </div>
            </div>
          )}

          <p className={`line-clamp-2 mb-2 sm:mb-4 h-8 sm:h-10 leading-relaxed ${theme === 'warm' ? 'text-[#584237]' : 'text-slate-500'} ${isWholesale ? 'text-[10px] sm:text-xs' : 'text-sm'} ${isSearchVariant ? 'block' : 'hidden md:block'}`}>
            {product.description}
          </p>
        </div>

      <div className={`px-1 flex flex-col mt-auto ${isWholesale ? 'gap-2' : 'gap-3 sm:gap-4'}`}>
        <div className={`flex items-center justify-between border-t ${theme === 'warm' ? 'border-orange-500/10' : 'border-slate-100'} ${isWholesale ? 'pt-2' : 'pt-3 sm:pt-4'}`}>
          <div className="flex flex-col">
            {hasDiscount && product.price > 0 && (
              <span className={`line-through leading-none mb-0.5 ${theme === 'warm' ? 'text-[#584237]/60' : 'text-slate-400'} ${isWholesale ? 'text-[8px] sm:text-[10px]' : 'text-[10px] sm:text-[11px]'}`}>
                {formatPrice(product.price * (isWholesale ? quantity : 1))}
              </span>
            )}
            <span className={`font-black font-display tracking-tight ${theme === 'warm' ? 'text-[#251913]' : 'text-slate-900'} ${isWholesale ? 'text-xs sm:text-lg' : 'text-sm sm:text-xl'}`}>
              {formatPrice(discountedPrice * (isWholesale ? quantity : 1))}
            </span>
            {isWholesale && <span className={`text-[7px] sm:text-[9px] font-bold uppercase tracking-widest mt-0.5 ${theme === 'warm' ? 'text-[#584237]/60' : 'text-slate-400'}`}>Total for {quantity}</span>}
          </div>
          
          {product.seller && (
             <div className={`flex items-center gap-1 rounded-lg border ${theme === 'warm' ? 'bg-white border-orange-500/10' : 'bg-slate-50 border-slate-100'} ${isWholesale ? 'px-1 py-0.5' : 'px-1.5 py-1 sm:px-3 sm:py-1.5 sm:rounded-xl'}`}>
                {sellerLogo ? (
                  <img onContextMenu={(e) => e.preventDefault()} src={sellerLogo} alt="" className={`${isWholesale ? 'w-2.5 h-2.5' : 'w-3 h-3 sm:w-4 h-4'} rounded-full object-cover select-none`} referrerPolicy="no-referrer" />
                ) : (
                  <div className={`${isWholesale ? 'w-2.5 h-2.5' : 'w-3 h-3 sm:w-4 h-4'} ${theme === 'warm' ? 'bg-[#fff1eb]' : 'bg-slate-200'} rounded-full`} />
                )}
                <span className={`font-black uppercase tracking-widest truncate ${theme === 'warm' ? 'text-[#584237]' : 'text-slate-500'} ${isWholesale ? 'text-[6px] max-w-[30px]' : 'text-[7px] sm:text-[9px] max-w-[40px] sm:max-w-[60px]'}`}>{product.seller}</span>
             </div>
          )}
        </div>

        {/* Stock indicator */}
        <div className="flex items-center justify-between text-[9px] sm:text-[11px]">
          <span className="text-slate-400 font-bold uppercase tracking-widest text-[7px] sm:text-[9px]">Status</span>
          <div className="font-black">
            {product.stock !== undefined ? (
              product.stock >= (isWholesale ? quantity : 1) ? (
                <span className={`${
                  product.stock <= (isWholesale ? 10 : 5) 
                    ? 'text-rose-600 font-bold' 
                    : 'text-emerald-600'
                }`}>
                  {product.stock} {product.stock <= 1 ? 'Unit' : 'Units'}
                </span>
              ) : (
                <span className="text-rose-600 font-extrabold uppercase tracking-wide text-[9px] sm:text-[10px]">Insufficient Stock</span>
              )
            ) : (
              <span className="text-slate-600">Active</span>
            )}
          </div>
        </div>
          
          {product.stock !== undefined && product.stock < (isWholesale ? quantity : 1) ? (
            <button 
              disabled
              className="w-full bg-slate-100 text-slate-400 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-[12px] font-bold cursor-not-allowed border border-slate-200 text-center uppercase tracking-widest"
            >
              Out of Stock
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 pb-1">
              {isInCart && !isWholesale ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromCart && onRemoveFromCart(product.id);
                  }}
                  className="flex items-center justify-center border-2 border-red-100 text-red-600 bg-red-50 hover:bg-red-100 px-2 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-2xl transition-all active:scale-95 text-[9px] sm:text-[11px] font-bold shadow-sm"
                >
                  Remove
                </button>
              ) : (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isWholesale) {
                      // Wholesale items go directly to buy or a special bundle cart
                      onBuy(product, quantity);
                    } else {
                      onAddToCart && onAddToCart(product);
                    }
                  }}
                  className="flex items-center justify-center border-2 border-slate-200 text-slate-800 hover:bg-slate-50 px-2 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-2xl transition-all active:scale-95 text-[9px] sm:text-[11px] font-bold shadow-sm"
                >
                  {isWholesale ? 'Bundle' : 'Cart'}
                </button>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy(product, isWholesale ? quantity : 1);
                }}
                className="flex items-center justify-center bg-orange-600 text-white hover:bg-orange-700 px-2 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-2xl transition-all active:scale-95 text-[9px] sm:text-[11px] font-black shadow-lg cursor-pointer uppercase tracking-wider"
              >
                Buy Now
              </button>
            </div>
          )}
        </div>
    </motion.div>
  );
};

export default ProductCard;
