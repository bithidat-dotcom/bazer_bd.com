import { Search, ShoppingBag, Filter as FilterIcon, X, Package, User, Tv, Volume, Volume1, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { Product } from '../types';

export default function Navbar({ 
  onSearch, 
  cartCount = 0, 
  onCartClick,
  onTrackOrderClick,
  onLoginClick,
  onLogoutClick,
  onEditProfileClick,
  onLogoClick,
  user,
  categories = [],
  categoryFilter = null,
  onCategoryFilter = () => {},
  discountFilter = null,
  onDiscountFilter = () => {},
  priceFilter = null,
  onPriceFilter = () => {},
  products = []
}: { 
  onSearch: (query: string) => void, 
  cartCount?: number, 
  onCartClick?: () => void,
  onTrackOrderClick?: () => void,
  onLoginClick?: () => void,
  onLogoutClick?: () => void,
  onEditProfileClick?: () => void,
  onLogoClick?: () => void,
  user?: UserProfile | null,
  categories?: string[],
  categoryFilter?: string | null,
  onCategoryFilter?: (cat: string | null) => void,
  discountFilter?: number | null,
  onDiscountFilter?: (pct: number | null) => void,
  priceFilter?: {min: number, max: number} | null,
  onPriceFilter?: (filter: {min: number, max: number} | null) => void,
  products?: Product[]
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const FilterDropdown = () => (
    <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5 z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900">Filters</h3>
        <button onClick={() => setIsFilterOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors relative z-50 cursor-pointer">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="space-y-4 relative z-40">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Discount</label>
          <div className="flex flex-wrap gap-2">
            {[5, 25, 30, 50, 90].map(pct => (
              <button
                key={pct}
                onClick={() => onDiscountFilter(discountFilter === pct ? null : pct)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  discountFilter === pct ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pct}% OFF
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Price Range Volume Slider */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-orange-500 shrink-0" />
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Price Volume</label>
            </div>
            <span className="text-xs font-black text-orange-600 font-mono">
              {!priceFilter || priceFilter.max >= 10000 
                ? "Show All Products" 
                : `1৳ - ${priceFilter.max}৳`
              }
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            {/* Range Slider acting like a Volume button */}
            <input 
              type="range"
              min="1"
              max="10000"
              step="100"
              value={priceFilter ? priceFilter.max : 10000}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 10000) {
                  onPriceFilter(null);
                } else {
                  onPriceFilter({ min: 1, max: val });
                }
              }}
              className="w-full accent-orange-500 h-2 cursor-pointer appearance-none outline-none focus:ring-1 focus:ring-orange-400 bg-slate-200 rounded-lg"
            />
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5 font-medium leading-tight">
            Drag the volume slider to filter products by price in real time. Pulling it to the right-most (10000৳) shows all products.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <nav className="sticky top-0 z-50 bg-orange-500 px-4 py-3 sm:px-8 shadow-sm relative border-b-2 border-orange-600">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 relative">
        <Link 
          to="/" 
          onClick={(e) => {
            if (onLogoClick) {
              onLogoClick();
            }
            setSearchValue('');
          }}
          className="flex text-sm sm:text-lg md:text-2xl font-bold font-display tracking-tight items-center gap-1 md:gap-2 shrink-0"
        >
          <img src="https://i.postimg.cc/KvqR53hq/download-(1).png" alt="pbazar Logo" className="w-6 h-6 md:w-10 md:h-10 object-contain rounded-full border border-slate-200 bg-white animate-pulse-subtle" />
          <span className="text-white">pbazar</span>
        </Link>
        
        <div className="flex flex-1 md:max-w-lg relative gap-1 md:gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchValue}
              onChange={(e) => {
                const val = e.target.value;
                setSearchValue(val);
                onSearch(val);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay blur so click handler inside suggestion dropdown can register
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              className="w-full pl-9 md:pl-11 pr-3 md:pr-4 py-2 md:py-3 bg-white/10 rounded-xl md:rounded-full border border-white/20 focus:bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none transition-all text-xs md:text-sm font-medium text-white placeholder:text-white/60 focus:text-slate-900"
            />
            {showSuggestions && searchValue.trim().length > 0 && products.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-2 z-[200] max-h-64 overflow-y-auto flex flex-col gap-0.5 text-left">
                {Array.from(new Set(products
                  .map(p => p.name || '')
                  .filter(name => name.toLowerCase().includes(searchValue.toLowerCase()))
                ))
                  .slice(0, 6)
                  .map(name => (
                    <button
                      key={name}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchValue(name);
                        onSearch(name);
                        setShowSuggestions(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 pr-[1px] ml-0 mr-0 hover:bg-slate-50 rounded-xl transition-all text-left group w-full cursor-pointer hover:pl-4"
                    >
                      <Search className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors truncate">
                        {name}
                      </span>
                    </button>
                  ))}
                {products.filter(p => p.name?.toLowerCase().includes(searchValue.toLowerCase())).length === 0 && (
                  <div className="text-center py-4 text-xs font-bold text-slate-400">No suggestions found</div>
                )}
              </div>
            )}
          </div>
          
          <div className="relative shrink-0">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)} 
              className={`h-full px-2 md:px-4 flex items-center gap-1 md:gap-2 rounded-xl md:rounded-full border transition-colors text-xs md:text-sm font-medium ${
                isFilterOpen || categoryFilter || discountFilter || priceFilter
                  ? 'bg-orange-50 border-orange-200 text-orange-600' 
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
            >
              <FilterIcon className="w-4 h-4" />
              <span className="hidden md:inline">Filter</span>
              {(categoryFilter || discountFilter || priceFilter) && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-white shadow-[0_0_0_1px_orange] -mt-0.5 -mr-0.5"></span>
              )}
            </button>
            {isFilterOpen && <FilterDropdown />}
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-1 sm:gap-4 relative z-[100]">
          <button onClick={onTrackOrderClick} className="px-3 sm:px-4 py-2 hover:bg-orange-400/20 rounded-full transition-colors flex items-center gap-2 group text-white font-black text-sm">
            <Package className="w-5 h-5" />
            <span className="hidden sm:inline">My Products</span>
          </button>
          
          <button onClick={onCartClick} className="p-2 hover:bg-orange-400/20 rounded-full transition-colors relative group">
            <motion.div
              key={`cart-icon-${cartCount}`}
              animate={cartCount > 0 ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm bg-white flex items-center justify-center"
            >
              <img src="https://i.postimg.cc/h4LHK7jZ/unnamed-(14).jpg" alt="Bag" className="w-full h-full object-cover" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-orange-600 text-[10px] flex items-center justify-center rounded-full border-2 border-orange-500 font-black z-10">{cartCount}</span>
              )}
            </motion.div>
          </button>

          {user ? (
            <div className="relative">
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-1 pr-3 rounded-full transition-colors ml-2"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/30 bg-white/20 flex items-center justify-center shadow-sm">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-black text-white capitalize max-w-[80px] truncate">{user.username}</span>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-slate-100 p-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-slate-50 mb-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Signed in as</p>
                    <p className="text-xs font-black text-slate-900 mt-1 truncate">{user.email || user.username}</p>
                  </div>
                  <button 
                    onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onEditProfileClick) onEditProfileClick();
                    }}
                    className="w-full text-left px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-2"
                  >
                    <User size={14} className="text-slate-400" />
                    Edit Profile
                  </button>
                  <div className="h-px bg-slate-50 my-1 mx-2" />
                  <button 
                    onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onLogoutClick) onLogoutClick();
                    }}
                    className="w-full text-left px-4 py-3 text-xs font-black text-red-600 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2"
                  >
                    <X size={14} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={onLoginClick} className="px-4 py-2 bg-white text-orange-600 hover:bg-orange-50 rounded-full transition-all flex items-center gap-2 group font-black text-sm ml-2 shadow-sm active:scale-95 leading-none">
              <User className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile Search & Filter Removed as search is now in main header */}
    </nav>
  );
}
