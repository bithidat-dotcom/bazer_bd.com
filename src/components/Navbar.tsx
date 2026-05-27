import { Search, ShoppingBag, Filter as FilterIcon, X, Package, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { UserProfile } from './AuthModal';
import { Product } from '../types';

export default function Navbar({ 
  onSearch, 
  cartCount = 0, 
  onCartClick,
  onTrackOrderClick,
  onLoginClick,
  onLogoutClick,
  onEditProfileClick,
  user,
  categories = [],
  categoryFilter = null,
  onCategoryFilter = () => {},
  discountFilter = null,
  onDiscountFilter = () => {},
  products = []
}: { 
  onSearch: (query: string) => void, 
  cartCount?: number, 
  onCartClick?: () => void,
  onTrackOrderClick?: () => void,
  onLoginClick?: () => void,
  onLogoutClick?: () => void,
  onEditProfileClick?: () => void,
  user?: UserProfile | null,
  categories?: string[],
  categoryFilter?: string | null,
  onCategoryFilter?: (cat: string | null) => void,
  discountFilter?: number | null,
  onDiscountFilter?: (pct: number | null) => void,
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
      </div>
    </div>
  );

  return (
    <nav className="sticky top-0 z-50 glass px-4 py-3 sm:px-8 shadow-sm relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 relative">
        <Link to="/" className="hidden md:flex text-xl sm:text-2xl font-bold font-display tracking-tight items-center gap-2">
          <img src="https://i.pinimg.com/1200x/2e/d3/45/2ed34552d98817c21168d0fbeb67bcc0.jpg" alt="Bazar_bds.com Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain rounded-full border border-slate-200 bg-white" />
          <span className="text-slate-900">Bazar<span className="text-orange-500">_bds.com</span></span>
        </Link>
        
        <div className="flex flex-1 md:max-w-lg relative gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Bazar_bds.com..." 
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
              className="w-full pl-11 pr-4 py-3 bg-slate-100 md:bg-white/20 rounded-2xl md:rounded-full border border-transparent md:border-slate-200 focus:bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none transition-all text-sm font-medium"
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
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-all text-left group w-full cursor-pointer hover:pl-4"
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
          
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)} 
              className={`h-full px-4 flex items-center gap-2 rounded-full border transition-colors text-sm font-medium ${
                isFilterOpen || categoryFilter || discountFilter 
                  ? 'bg-orange-50 border-orange-200 text-orange-600' 
                  : 'glass bg-white/20 border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FilterIcon className="w-4 h-4" />
              Filter
              {(categoryFilter || discountFilter) && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_0_2px_white] -mt-1 -mr-1"></span>
              )}
            </button>
            {isFilterOpen && <FilterDropdown />}
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-1 sm:gap-4 relative z-[100]">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 mr-2 cursor-pointer hover:bg-slate-50 p-1 pr-3 rounded-full transition-colors"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-bold text-slate-700 capitalize w-20 truncate text-left">{user.username}</span>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-2 z-50">
                  <button 
                    onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onEditProfileClick) onEditProfileClick();
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Edit Profile
                  </button>
                  <a 
                    href="/admin"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="block text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors mt-0.5"
                  >
                    Admin Panel
                  </a>
                  <button 
                    onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onLogoutClick) onLogoutClick();
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={onLoginClick} className="px-3 sm:px-4 py-2 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2 group text-slate-700 font-medium text-sm mr-2">
              <User className="w-5 h-5 group-hover:text-slate-900 transition-colors" />
              <span className="hidden sm:inline group-hover:text-slate-900 transition-colors">Login</span>
            </button>
          )}

          <button onClick={onTrackOrderClick} className="px-3 sm:px-4 py-2 hover:bg-orange-50 rounded-full transition-colors flex items-center gap-2 group text-slate-700 font-medium text-sm">
            <Package className="w-5 h-5 group-hover:text-orange-600 transition-colors" />
            <span className="hidden sm:inline group-hover:text-orange-600 transition-colors">My Products</span>
          </button>
          
          <button onClick={onCartClick} className="p-2 hover:bg-orange-50 rounded-full transition-colors relative group">
            <ShoppingBag className="w-5 h-5 text-slate-700 group-hover:text-orange-600" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">{cartCount}</span>
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile Search & Filter Removed as search is now in main header */}
    </nav>
  );
}
