import { ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { formatPrice } from '../lib/utils';
import { Product } from '../types';

export default function ProductCard({ product, onBuy, onAddToCart }: { product: Product; onBuy: (product: Product) => void, onAddToCart?: (product: Product) => void }) {
  const hasDiscount = product.discount && product.discount > 0;
  const discountedPrice = hasDiscount 
    ? product.price * (1 - (product.discount || 0) / 100) 
    : product.price;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group glass-card rounded-xl flex flex-col p-2 relative overflow-hidden h-full"
    >
      <div className="relative h-32 sm:h-40 rounded-lg bg-slate-50 overflow-hidden mb-2 p-2">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
        />
        {hasDiscount && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm z-10">
            {product.discount}% OFF
          </div>
        )}
      </div>
      
      <div className="px-1 flex flex-col flex-1">
        <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 line-clamp-1 mb-0.5">
          {product.name}
        </h3>
        <p className="text-[10px] text-slate-500 line-clamp-1 mb-2 h-4">
          {product.description}
        </p>
        
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              {hasDiscount && (
                <span className="text-[8px] text-slate-400 line-through leading-none">
                  {formatPrice(product.price)}
                </span>
              )}
              <span className="text-xs sm:text-sm font-bold text-orange-600 font-display">
                {formatPrice(discountedPrice)}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5">
            <button 
              onClick={() => onAddToCart && onAddToCart(product)}
              className="flex items-center justify-center border border-slate-200 text-slate-700 hover:bg-slate-50 px-2 py-1.5 rounded-md transition-all active:scale-95 text-[10px] font-bold shadow-sm"
            >
              Add to Cart
            </button>
            <button 
              onClick={() => onBuy(product)}
              className="flex items-center justify-center bg-slate-900 text-white hover:bg-orange-600 px-2 py-1.5 rounded-md transition-all active:scale-95 text-[10px] font-bold shadow-sm"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
