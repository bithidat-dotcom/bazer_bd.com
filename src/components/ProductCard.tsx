import { ShoppingCart, Star, Heart, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { formatPrice } from '../lib/utils';
import { Product } from '../types';
import { getProductLikesState, toggleProductLike, getProductReviews, getSellerInfoByName } from '../lib/db-sync';

export default function ProductCard({ product, onBuy, onAddToCart, onClick }: { product: Product; onBuy: (product: Product) => void, onAddToCart?: (product: Product) => void, onClick?: (product: Product) => void }) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [sellerData, setSellerData] = useState<{ logo?: string; whatsapp?: string } | null>(null);

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
            whatsapp: info.whatsapp || info.seller_whatsapp
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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group glass-card rounded-2xl flex flex-col p-2 sm:p-3 relative overflow-hidden h-full shadow-sm hover:shadow-xl transition-all duration-500"
    >
      <div 
        className="cursor-pointer"
        onClick={() => onClick && onClick(product)}
      >
        <div className="relative w-full aspect-[4/3] rounded-xl bg-slate-50 overflow-hidden mb-3">
          {/* Like/Favorite floating button */}
          <button
            onClick={toggleLike}
            className="absolute top-2.5 right-2.5 z-20 px-2.5 h-9 rounded-full bg-white/90 backdrop-blur border border-slate-100 flex items-center justify-center gap-1.5 text-slate-500 hover:text-red-500 hover:scale-110 active:scale-95 shadow-md transition-all"
            title={isLiked ? "Remove from Favorites" : "Add to Favorites"}
          >
            <Heart size={14} className={`transition-transform duration-300 ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400'}`} />
            {likesCount > 0 && <span className="text-[11px] font-bold text-slate-600 font-mono">{likesCount}</span>}
          </button>

          <img 
            src={product.image} 
            alt={product.name}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
          />
          {hasDiscount && (
            <div className="flex flex-col gap-1 absolute top-2.5 left-2.5 z-10">
              <div className="bg-red-600 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-tight">
                -{product.discount}% OFF
              </div>
              <div className="bg-white/90 backdrop-blur-md border border-slate-150 text-black text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shadow-md">
                <Clock size={10} />
                <span>FLASH</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="px-1 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
              {product.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center gap-1">
              <Star size={12} className="fill-amber-500 text-amber-500" />
              <span className="text-[11px] font-black text-amber-600">
                {avgRating.toFixed(1)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              ({count} Reviews)
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-2 mb-3 h-8 hidden md:block leading-relaxed">
            {product.description}
          </p>
        </div>
      </div>
      <div className="px-1 flex flex-col mt-auto gap-3">
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex flex-col">
            {hasDiscount && (
              <span className="text-[10px] text-slate-400 line-through leading-none mb-0.5">
                {formatPrice(product.price)}
              </span>
            )}
            <span className="text-sm sm:text-base font-black text-slate-900 font-display tracking-tight">
              {formatPrice(discountedPrice)}
            </span>
          </div>
          
          {product.seller && (
             <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                {sellerLogo ? (
                  <img src={sellerLogo} alt="" className="w-3.5 h-3.5 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-3.5 h-3.5 bg-slate-200 rounded-full" />
                )}
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[50px]">{product.seller}</span>
             </div>
          )}
        </div>

        {/* Stock indicator */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Availability</span>
          <div className="font-black">
            {product.stock !== undefined ? (
              product.stock >= 0 ? (
                <span className={`${
                  product.stock <= 5 
                    ? 'text-rose-600' 
                    : 'text-emerald-600'
                }`}>
                  {product.stock} Units Left
                </span>
              ) : (
                <span className="text-rose-600">Out of Stock</span>
              )
            ) : (
              <span className="text-slate-600">In Stock</span>
            )}
          </div>
        </div>
          
          {product.stock !== undefined && product.stock <= 0 ? (
            <button 
              disabled
              className="w-full bg-slate-100 text-slate-400 py-3 rounded-xl text-[11px] font-bold cursor-not-allowed border border-slate-200 text-center uppercase tracking-widest"
            >
              Out of Stock
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-1">
              <button 
                onClick={() => onAddToCart && onAddToCart(product)}
                className="flex items-center justify-center border-2 border-slate-200 text-slate-800 hover:bg-slate-50 px-3 py-2.5 rounded-xl transition-all active:scale-95 text-[10px] font-bold shadow-sm"
              >
                Add to Cart
              </button>
              <button 
                onClick={() => onBuy(product)}
                className="flex items-center justify-center bg-orange-600 text-white hover:bg-orange-700 px-3 py-2.5 rounded-xl transition-all active:scale-95 text-[10px] font-black shadow-lg cursor-pointer uppercase tracking-wider"
              >
                Buy Now
              </button>
            </div>
          )}
        </div>
    </motion.div>
  );
}
