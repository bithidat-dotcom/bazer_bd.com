import { ShoppingCart, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { formatPrice } from '../lib/utils';
import { Product } from '../types';
import LoadingImage from './LoadingImage';
import { getProductLikesState, toggleProductLike, getSellerInfoByName } from '../lib/db-sync';

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
  isWholesale,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [sellerData, setSellerData] = useState<{ logo?: string; whatsapp?: string; is_verified?: boolean } | null>(null);
  const [quantity, setQuantity] = useState(isWholesale ? 5 : 1);

  const { ref, inView } = useInView({
    triggerOnce: false,
    rootMargin: '600px 0px',
  });

  useEffect(() => {
    if (!inView) return;
    let active = true;
    const fetchLikes = async () => {
      const state = await getProductLikesState(product.id);
      if (active) {
        setIsLiked(state.userLiked);
      }
    };
    fetchLikes();

    window.addEventListener('favorites-updated', fetchLikes);
    return () => {
      active = false;
      window.removeEventListener('favorites-updated', fetchLikes);
    };
  }, [product.id, inView]);

  // Fallback seller info logic
  useEffect(() => {
    if (!inView) return;
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
  }, [product.seller, product.seller_whatsapp, inView]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsLiked(!isLiked);
    const nextState = await toggleProductLike(product.id);
    setIsLiked(nextState.userLiked);
  };

  const hasDiscount = product.discount && product.discount > 0;
  const discountedPrice = hasDiscount 
    ? product.price * (1 - (product.discount || 0) / 100) 
    : product.price;

  const sellerLogo = product.seller_logo || sellerData?.logo;

  return (
    <div ref={ref} className="h-full">
      {inView ? (
        <motion.article 
          layout
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          data-purpose="product-card"
          className="bg-white rounded-[32px] p-3.5 shadow-card transition-all duration-300 hover:shadow-2xl border border-black/[0.04] flex flex-col h-full cursor-pointer relative group"
          onClick={() => onClick && onClick(product)}
        >
          {/* BEGIN: MediaSection */}
          <div 
            className="relative w-full aspect-square rounded-[24px] overflow-hidden select-none bg-neutral-100" 
            data-purpose="product-image-container"
          >
            {/* Sneaker/Product Main Image */}
            <div onContextMenu={(e) => e.preventDefault()} className="w-full h-full select-none">
              <LoadingImage 
                src={product.image} 
                alt={product.name}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
            </div>

            {/* Top-Left: Status Badge */}
            <div className="absolute top-3 left-3 z-10" data-purpose="badge-best-seller">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium text-white tracking-tight backdrop-blur-md bg-black/40 border border-white/25 shadow-sm">
                {product.is_super_sale ? 'Super Sale' : hasDiscount ? `${product.discount}% OFF` : product.is_new ? 'New Arrival' : 'Best Seller'}
              </span>
            </div>

            {/* Top-Right: Brand Logo / Seller / Heart Badge */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5" data-purpose="brand-logo-badge">
              {sellerLogo ? (
                <div 
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md p-1 transition-transform hover:scale-105 overflow-hidden" 
                  title={product.seller || 'Seller'}
                >
                  <img src={sellerLogo} alt={product.seller || 'Seller'} className="w-full h-full object-cover rounded-full" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md p-1.5 transition-transform hover:scale-105 overflow-hidden">
                  <img src="https://i.postimg.cc/KvqR53hq/download-(1).png" alt="Pbazar" className="w-full h-full object-contain rounded-full" />
                </div>
              )}
              <button
                onClick={toggleLike}
                type="button"
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md p-1.5 transition-transform hover:scale-110 active:scale-95 text-neutral-600 hover:text-red-500"
                title={isLiked ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Heart size={14} className={isLiked ? 'fill-red-500 text-red-500' : 'text-neutral-500'} />
              </button>
            </div>

            {/* Bottom-Center: Carousel Indicator Dots */}
            <nav aria-label="Image slide pagination" className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 z-10 pointer-events-none" data-purpose="carousel-dots">
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm ring-1 ring-black/10"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 backdrop-blur-[2px]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 backdrop-blur-[2px]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 backdrop-blur-[2px]"></span>
            </nav>
          </div>
          {/* END: MediaSection */}

          {/* BEGIN: ContentSection */}
          <div className="px-2 pt-3.5 pb-1 flex flex-col flex-1" data-purpose="product-details">
            {/* Title & Subtitle Stack */}
            <header className="space-y-0.5">
              <h1 className="text-[16px] sm:text-[18px] leading-snug font-bold text-neutral-900 tracking-tight line-clamp-1 group-hover:text-neutral-700 transition-colors">
                {product.name}
              </h1>
              <p className="text-[12px] font-medium text-neutral-400 capitalize">
                {product.category || (product.seller ? `By ${product.seller}` : 'Pbazar Verified')}
              </p>
            </header>

            {/* Wholesale counter if applicable */}
            {isWholesale && (
              <div className="mt-2.5 bg-neutral-100 rounded-xl p-2 flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">Min 5 Bundle</span>
                <div className="flex items-center gap-2 bg-white px-2 py-0.5 rounded-lg border border-neutral-200">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuantity(prev => Math.max(5, prev - 1));
                    }}
                    className="w-5 h-5 rounded bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold text-xs active:scale-90"
                    type="button"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold text-neutral-900 min-w-[16px] text-center font-mono">{quantity}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuantity(prev => Math.min(100, prev + 1));
                    }}
                    className="w-5 h-5 rounded bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold text-xs active:scale-90"
                    type="button"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* BEGIN: ActionFooter */}
            <footer className="mt-auto pt-4 flex items-center justify-between gap-2" data-purpose="pricing-and-cta">
              {/* Price Tag Indicator */}
              <div 
                className="bg-neutral-100/90 text-neutral-900 text-sm font-bold px-3.5 py-1.5 sm:py-2 rounded-full inline-flex items-center justify-center tracking-tight min-w-[70px] select-none" 
                data-purpose="price-badge"
              >
                <span>{formatPrice(discountedPrice * (isWholesale ? quantity : 1))}</span>
                {hasDiscount && (
                  <span className="ml-1 text-[10px] text-neutral-400 line-through">
                    {formatPrice(product.price * (isWholesale ? quantity : 1))}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {product.stock !== undefined && product.stock < (isWholesale ? quantity : 1) ? (
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-3 py-1.5 bg-neutral-100 rounded-full select-none">
                    Out of Stock
                  </span>
                ) : (
                  <>
                    {onAddToCart && !isWholesale && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isInCart) {
                            onRemoveFromCart && onRemoveFromCart(product.id);
                          } else {
                            onAddToCart(product);
                          }
                        }}
                        className={`p-2 rounded-full border transition-all active:scale-95 ${
                          isInCart 
                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                            : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                        }`}
                        title={isInCart ? 'Remove from Cart' : 'Add to Cart'}
                        type="button"
                      >
                        <ShoppingCart size={15} />
                      </button>
                    )}

                    {/* Checkout / Purchase Button with Directional Arrow */}
                    <button 
                      className="group inline-flex items-center justify-center gap-2 bg-neutral-950 hover:bg-black text-white text-[12px] sm:text-[13px] font-semibold pl-3.5 sm:pl-4 pr-1.5 py-1.5 rounded-full shadow-sm hover:shadow active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 shrink-0 cursor-pointer" 
                      data-purpose="buy-now-button" 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBuy(product, isWholesale ? quantity : 1);
                      }}
                    >
                      <span>{isWholesale ? 'Bundle Buy' : 'Buy Now'}</span>
                      <span aria-hidden="true" className="w-6 h-6 rounded-full bg-white text-neutral-950 flex items-center justify-center transition-transform duration-200 group-hover:rotate-45">
                        <svg className="w-3.5 h-3.5 stroke-[0.5]" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path clipRule="evenodd" d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z" fillRule="evenodd"></path>
                        </svg>
                      </span>
                    </button>
                  </>
                )}
              </div>
            </footer>
            {/* END: ActionFooter */}
          </div>
          {/* END: ContentSection */}
        </motion.article>
      ) : (
        <div className="bg-white rounded-[32px] p-3.5 shadow-card border border-neutral-100 w-full h-[360px] animate-pulse"></div>
      )}
    </div>
  );
};

export default ProductCard;
