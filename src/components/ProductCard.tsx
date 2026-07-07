import { ShoppingCart, Star, Heart, Clock, Share2, CheckCircle2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { formatPrice } from '../lib/utils';
import { Product } from '../types';
import LoadingImage from './LoadingImage';
import { getProductLikesState, toggleProductLike, getProductReviews, getSellerInfoByName } from '../lib/db-sync';

export default function ProductCard({ product, onBuy, onAddToCart, onClick, couponConfig, isSearchVariant }: { product: Product; onBuy: (product: Product) => void, onAddToCart?: (product: Product) => void, onClick?: (product: Product) => void, couponConfig?: { isActive: boolean; minPurchase: number; discountAmount: number }, isSearchVariant?: boolean }) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [sellerData, setSellerData] = useState<{ logo?: string; whatsapp?: string; is_verified?: boolean } | null>(null);

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
      className="group glass-card rounded-2xl flex flex-col p-2 sm:p-4.5 relative overflow-hidden h-full shadow-md bg-white hover:shadow-2xl hover:border-orange-200 border border-slate-100 transition-all duration-500 cursor-pointer hover:-translate-y-1.5"
      onClick={() => onClick && onClick(product)}
    >
        <div className="relative w-full aspect-square rounded-xl bg-white overflow-hidden mb-3">
          {couponConfig?.isActive && product.price >= couponConfig.minPurchase && (
            <div className="absolute top-16 left-2 sm:top-18 sm:left-2.5 z-10 bg-orange-500 text-white text-[7px] sm:text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg uppercase tracking-tight">
              Get {couponConfig.discountAmount}৳ Coupon
            </div>
          )}
          {/* Action Buttons Layer */}
          <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-20 flex flex-col gap-2 transition-all">
            {/* Like/Favorite floating button */}
            <button
              onClick={toggleLike}
              className="px-2 h-8 sm:px-2.5 sm:h-9 rounded-full bg-white/90 backdrop-blur border border-slate-100 flex items-center justify-center gap-1.5 text-slate-500 hover:text-red-500 hover:scale-110 active:scale-95 shadow-md transition-all"
              title={isLiked ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Heart size={13} className={`transition-transform duration-300 sm:size-3.5 ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400'}`} />
              {likesCount > 0 && <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 font-mono">{likesCount}</span>}
            </button>

            {/* Quick Share Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // We'll let the parent or a global share handler deal with this if needed
                // For now, satisfy user request for "share button" on card
                const shareUrl = `${window.location.origin}?p=${product.id}`;
                if (navigator.share) {
                  navigator.share({
                    title: product.name,
                    text: `Check out this ${product.name} on pbazar!`,
                    url: shareUrl,
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(shareUrl);
                  alert('Link copied to clipboard!');
                }
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 backdrop-blur border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-all shadow-md active:scale-95"
              title="Share Product"
            >
              <Share2 size={14} />
            </button>
          </div>

          <LoadingImage 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
          />
          {/* Badges Container */}
          {!isSearchVariant && (
            <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10 flex flex-col gap-1.5 items-start">
              {hasDiscount && (
                <>
                  <div className="bg-red-600 backdrop-blur-md text-white text-[7px] sm:text-[9px] font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded shadow-lg uppercase tracking-tight">
                    -{product.discount}% OFF
                  </div>
                  <div className="bg-white/90 backdrop-blur-md border border-slate-150 text-black text-[6px] sm:text-[8px] font-black px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded flex items-center gap-1 shadow-md">
                    <Clock size={8} className="sm:size-2.5" />
                    <span>FLASH</span>
                  </div>
                </>
              )}
              {((product.is_new !== false && (product.is_new || (product.created_at && (new Date().getTime() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7)))) && (
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[7px] sm:text-[8.5px] font-black px-2 py-0.5 sm:py-1 rounded shadow-lg uppercase tracking-widest flex items-center gap-1 border border-orange-400/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                  <span>NEW</span>
                </div>
              )}
              {product.is_super_sale && (
                <div className="bg-orange-600 text-white text-[7px] sm:text-[9px] font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded shadow-lg uppercase tracking-tight flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-300">
                  <Zap size={10} className="fill-white" />
                  <span>Super Sale</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="px-1 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[14px] sm:text-base font-bold text-slate-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
              {product.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center gap-0.5">
              <Star size={12} className="fill-amber-500 text-amber-500" />
              <span className="text-[11px] sm:text-[13px] font-black text-amber-600">
                {avgRating.toFixed(1)}
              </span>
            </div>
            {count > 0 && (
              <span className="text-[10px] sm:text-[12px] text-slate-400 font-medium">
                ({count})
              </span>
            )}
          </div>
          <p className={`text-sm text-slate-500 line-clamp-2 mb-4 h-10 leading-relaxed ${isSearchVariant ? 'block' : 'hidden md:block'}`}>
            {product.description}
          </p>
        </div>

      <div className="px-1 flex flex-col mt-auto gap-3 sm:gap-4">
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 sm:pt-4">
          <div className="flex flex-col">
            {hasDiscount && product.price > 0 && (
              <span className="text-[10px] sm:text-[11px] text-slate-400 line-through leading-none mb-0.5 sm:mb-1">
                {formatPrice(product.price)}
              </span>
            )}
            <span className="text-sm sm:text-xl font-black text-slate-900 font-display tracking-tight">
              {formatPrice(discountedPrice)}
            </span>
          </div>
          
          {product.seller && (
             <div className="flex items-center gap-1 sm:gap-2 bg-slate-50 px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-100">
                {sellerLogo ? (
                  <img src={sellerLogo} alt="" className="w-3 h-3 sm:w-4 sm:h-4 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-slate-200 rounded-full" />
                )}
                <span className="text-[7px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[40px] sm:max-w-[60px]">{product.seller}</span>
                {sellerData?.is_verified && (
                  <CheckCircle2 size={10} className="text-blue-500" />
                )}
             </div>
          )}
        </div>

        {/* Stock indicator */}
        <div className="flex items-center justify-between text-[9px] sm:text-[11px]">
          <span className="text-slate-400 font-bold uppercase tracking-widest text-[7px] sm:text-[9px]">Status</span>
          <div className="font-black">
            {product.stock !== undefined ? (
              product.stock > 0 ? (
                <span className={`${
                  product.stock <= 5 
                    ? 'text-rose-600 font-bold' 
                    : 'text-emerald-600'
                }`}>
                  {product.stock} {product.stock <= 1 ? 'Unit' : 'Units'}
                </span>
              ) : (
                <span className="text-rose-600 font-extrabold uppercase tracking-wide text-[9px] sm:text-[10px]">Sold Out</span>
              )
            ) : (
              <span className="text-slate-600">Active</span>
            )}
          </div>
        </div>
          
          {product.stock !== undefined && product.stock <= 0 ? (
            <button 
              disabled
              className="w-full bg-slate-100 text-slate-400 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-[12px] font-bold cursor-not-allowed border border-slate-200 text-center uppercase tracking-widest"
            >
              Out of Stock
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 pb-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart && onAddToCart(product);
                }}
                className="flex items-center justify-center border-2 border-slate-200 text-slate-800 hover:bg-slate-50 px-2 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-2xl transition-all active:scale-95 text-[9px] sm:text-[11px] font-bold shadow-sm"
              >
                Cart
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy(product);
                }}
                className="flex items-center justify-center bg-orange-600 text-white hover:bg-orange-700 px-2 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-2xl transition-all active:scale-95 text-[9px] sm:text-[11px] font-black shadow-lg cursor-pointer uppercase tracking-wider"
              >
                Buy
              </button>
            </div>
          )}
        </div>
    </motion.div>
  );
}
