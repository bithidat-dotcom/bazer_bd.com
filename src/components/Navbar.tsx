import { Search, ShoppingBag, Filter as FilterIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar({ 
  onSearch, 
  cartCount = 0, 
  onCartClick,
  categories = [],
  categoryFilter = null,
  onCategoryFilter = () => {},
  discountFilter = null,
  onDiscountFilter = () => {}
}: { 
  onSearch: (query: string) => void, 
  cartCount?: number, 
  onCartClick?: () => void,
  categories?: string[],
  categoryFilter?: string | null,
  onCategoryFilter?: (cat: string | null) => void,
  discountFilter?: number | null,
  onDiscountFilter?: (pct: number | null) => void
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Category</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onCategoryFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                categoryFilter === null ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  categoryFilter === cat ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

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
    <nav className="sticky top-0 z-50 glass px-4 py-3 sm:px-8 shadow-sm relative" style={{ fontSize: '40px' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 relative">
        <Link to="/" className="text-xl sm:text-2xl font-bold font-display tracking-tight flex items-center gap-2">
          <img src="https://i.pinimg.com/1200x/2e/d3/45/2ed34552d98817c21168d0fbeb67bcc0.jpg" alt="Bazar_bds.com Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain rounded-full border border-slate-200 bg-white" />
          <span className="text-slate-900">Bazar<span className="text-orange-500">_bds.com</span></span>
        </Link>
        
        <div className="hidden md:flex flex-1 max-w-lg relative gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass bg-white/20 rounded-full border border-slate-200 focus:ring-2 focus:ring-orange-400 focus:outline-none transition-all text-sm"
              style={{ fontSize: '20px', lineHeight: '49px', textAlign: 'left', paddingLeft: '40px', paddingRight: '19px', marginLeft: '-5px' }}
            />
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)} 
              className={`h-full px-4 flex items-center gap-2 rounded-full border transition-colors text-sm font-medium ${
                isFilterOpen || categoryFilter || discountFilter 
                  ? 'bg-orange-50 border-orange-200 text-orange-600' 
                  : 'glass bg-white/20 border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              style={{ lineHeight: '10px', fontSize: '19px' }}
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
        
        <div className="flex items-center gap-3 sm:gap-6">
          <button onClick={onCartClick} className="p-2 hover:bg-orange-50 rounded-full transition-colors relative group">
            <ShoppingBag className="w-5 h-5 text-slate-700 group-hover:text-orange-600" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">{cartCount}</span>
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile Search & Filter */}
      <div className="md:hidden mt-3 relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search products..." 
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100/50 rounded-full border-none focus:ring-2 focus:ring-black/5 transition-all text-sm"
          />
        </div>
        <div className="relative">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`h-full px-4 flex items-center justify-center rounded-full transition-colors ${
              isFilterOpen || categoryFilter || discountFilter 
                ? 'bg-orange-100 text-orange-600' 
                : 'bg-gray-100/50 text-slate-700'
            }`}
          >
            <FilterIcon className="w-4 h-4 relative z-10" />
            {(categoryFilter || discountFilter) && (
              <span className="absolute top-1 right-1 lg:top-0 lg:right-0 w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_0_2px_white] z-20"></span>
            )}
          </button>
          {isFilterOpen && (
            <div className="fixed inset-x-4 top-[140px] bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 p-5 z-50 md:hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Filters</h3>
                <button onClick={() => setIsFilterOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors relative z-50 cursor-pointer">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onCategoryFilter(null)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        categoryFilter === null ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => onCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          categoryFilter === cat ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

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
          )}
        </div>
      </div>
    </nav>
  );
}
