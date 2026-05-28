import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, updateDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trash2, Edit, CheckCircle, XCircle, Users, ShoppingBag, TrendingUp, Utensils, Shirt, Cpu, Bot, Laptop, Dumbbell, ShoppingCart, Scissors, LayoutGrid, Plus, Search, Tag } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedAdminCategory, setSelectedAdminCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'products' | 'analytics'>('orders');

  // Product Creation & Edit state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productSearch, setProductSearch] = useState('');
  
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    discount: '0',
    category: 'PC',
    image: '',
    description: '',
    imagesInput: '',
  });

  const categories = [
    { name: 'All', icon: LayoutGrid },
    { name: 'Food', icon: Utensils },
    { name: 'Fashion', icon: Shirt },
    { name: 'Gadget', icon: Cpu },
    { name: 'Robotic', icon: Bot },
    { name: 'PC', icon: Laptop },
    { name: 'Cloth', icon: Scissors },
    { name: 'Sports', icon: Dumbbell },
    { name: 'Grocery', icon: ShoppingCart },
  ];

  const [salesData, setSalesData] = useState<any[]>([]);
  const [renderChart, setRenderChart] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(0);

  useEffect(() => {
    if (!renderChart) return;
    
    const container = chartContainerRef.current;
    if (!container) return;

    if (container.offsetWidth > 0) {
      setChartWidth(container.offsetWidth);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!Array.isArray(entries) || !entries.length) return;
      const width = entries[0].contentRect.width;
      if (width > 0) {
        setChartWidth(width);
      }
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, [renderChart]);

  useEffect(() => {
    // Listener for orders
    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const ordersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(ordersData);

      // Recalculate analytics data whenever orders change
      const dailySales: { [key: string]: number } = {};
      ordersData.forEach((order: any) => {
        if (order.created_at) {
          const date = new Date(order.created_at).toLocaleDateString();
          dailySales[date] = (dailySales[date] || 0) + (Number(order.price) || 0);
        }
      });
      const chartData = Object.entries(dailySales).map(([name, total]) => ({ name, total }));
      setSalesData(chartData.slice(-7)); // Last 7 days
      setLoading(false);
    });

    // Listener for users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(usersData);
      setLoading(false);
    });

    // Listener for products
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData = snapshot.docs.map(d => {
        const data = d.data() || {};
        return {
          id: d.id,
          name: data.name || '',
          price: Number(data.price || 0),
          description: data.description || '',
          image: data.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
          images: data.images || [],
          discount: Number(data.discount || 0),
          rating: Number(data.rating || 4.5),
          category: data.category || 'PC',
          created_at: data.created_at || new Date().toISOString()
        };
      });
      setProducts(productsData);
      setLoading(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeUsers();
      unsubscribeProducts();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      const timer = setTimeout(() => {
        setRenderChart(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setRenderChart(false);
    }
  }, [activeTab]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
      } catch (error) {
        console.error("Error deleting order:", error);
      }
    }
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      price: '',
      discount: '0',
      category: selectedAdminCategory || 'PC', // Preselect category based on active filter button!
      image: '',
      description: '',
      imagesInput: '',
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: any) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name || '',
      price: String(prod.price || 0),
      discount: String(prod.discount || 0),
      category: prod.category || 'PC',
      image: prod.image || '',
      description: prod.description || '',
      imagesInput: Array.isArray(prod.images) ? prod.images.join(', ') : '',
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) {
      alert("Product Name and Price are required.");
      return;
    }

    const payload = {
      name: productForm.name,
      price: Number(productForm.price),
      discount: Number(productForm.discount) || 0,
      category: productForm.category,
      image: productForm.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
      description: productForm.description,
      images: productForm.imagesInput ? productForm.imagesInput.split(',').map((sName: string) => sName.trim()).filter(Boolean) : [],
      rating: editingProduct?.rating || 4.5,
      created_at: editingProduct?.created_at || new Date().toISOString()
    };

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), payload);
      } else {
        await addDoc(collection(db, 'products'), payload);
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      console.error("Error saving product: ", err);
      alert("Failed to save product.");
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the product "${name}"?`)) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (err) {
        console.error("Error deleting product: ", err);
        alert("Failed to delete product.");
      }
    }
  };

  if (loading) return (
    <div className="p-8 text-center bg-slate-50 min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Manage your business operations</p>
        </div>

        {/* Scroll Banner */}
        <div className="w-full bg-slate-900 text-white py-2 rounded-2xl overflow-hidden my-4">
          <div className="animate-marquee whitespace-nowrap font-bold text-sm">
            Welcome to pbazar Admin Dashboard - Streamlining your eCommerce business operations efficiently.
          </div>
        </div>

        {/* Category Buttons - Side Scrollable 1 Line */}
        <div className="w-full flex gap-2 overflow-x-auto pb-3 scrollbar-hidden">
          {categories.map((cat) => {
            const isActive = selectedAdminCategory === cat.name || (selectedAdminCategory === null && cat.name === 'All');
            return (
              <button
                key={cat.name}
                onClick={() => {
                  const targetCat = cat.name === 'All' ? null : cat.name;
                  setSelectedAdminCategory(targetCat);
                  setActiveTab('products');
                }}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 shadow-sm transition-all text-slate-800 min-w-[70px] cursor-pointer shrink-0 ${
                  isActive 
                    ? 'border-orange-500 bg-orange-50 text-orange-600' 
                    : 'bg-white border-slate-200 hover:border-orange-300'
                }`}
              >
                <cat.icon size={24} className={isActive ? 'text-orange-600' : 'text-orange-500'} />
                <span className="text-[10px] font-bold whitespace-nowrap">{cat.name}</span>
              </button>
            );
          })}
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 w-fit flex-wrap gap-1">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'orders' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag size={18} />
            Orders
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'products' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Tag size={18} />
            Products Catalog
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'users' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Users size={18} />
            Users
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'analytics' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <TrendingUp size={18} />
            Analytics
          </button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Recent Orders ({orders.length})</h2>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] tracking-widest uppercase text-slate-400 font-bold">
                  <th className="p-5">Customer</th>
                  <th className="p-5">Items</th>
                  <th className="p-5">Total</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Courier Info</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0">
                          {order.customer_image ? (
                            <img src={order.customer_image} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold truncate">
                              {order.customer_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{order.customer_name}</p>
                          {order.customer_username && <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">@{order.customer_username}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="text-sm font-medium text-slate-700 whitespace-pre-line line-clamp-2 w-48" title={order.product_name}>
                        {order.product_name}
                      </p>
                    </td>
                    <td className="p-5 font-bold text-slate-900">{order.price?.toLocaleString()} ৳</td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        order.status === 'cancelled' || order.status === 'cancelled_admin' ? 'bg-red-50 text-red-600' :
                        order.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-5 text-xs">
                      <p className="font-bold text-slate-600">WA: <span className="text-slate-900">{order.whatsapp}</span></p>
                      <p className="truncate w-32 mt-0.5 text-slate-500" title={order.location}>{order.location}</p>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select 
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="bg-slate-100 border-none rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-black transition-all cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="packing">Packing</option>
                          <option value="shipping">Shipping</option>
                          <option value="delivery">Delivery</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled (User)</option>
                          <option value="cancelled_admin">Cancelled (Admin)</option>
                        </select>
                        <button 
                          onClick={() => deleteOrder(order.id)} 
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">No orders in queue</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold tracking-tight mb-4">Users Directory ({users.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map(user => (
              <div key={user.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex-shrink-0 overflow-hidden border border-slate-100">
                    {user.profileImage ? (
                      <img src={user.profileImage} alt={user.username || 'user'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl bg-slate-50">
                        {(user.username || 'User').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate text-lg">@{user.username || 'Anonymous'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Joined {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-400">WA</span>
                    </div>
                    <span className="font-medium text-slate-700 truncate">{user.whatsapp || 'Not linked'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-slate-400">LOC</span>
                    </div>
                    <span className="text-slate-500 text-xs line-clamp-2 leading-relaxed">{user.location || 'No address set'}</span>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="col-span-full py-20 bg-white border border-dashed border-slate-200 rounded-3xl text-center">
                <p className="text-slate-400 font-bold">Authenticated users will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold tracking-tight mb-6">Business Insights</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
              <h3 className="text-3xl font-bold text-slate-900">{orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0).toLocaleString()} ৳</h3>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Customers</p>
              <h3 className="text-3xl font-bold text-slate-900">{users.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
              <h3 className="text-3xl font-bold text-slate-900">{orders.length}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm" id="sales-trend-card">
            <h3 className="font-bold text-slate-800 mb-6" id="sales-trend-title">Sales Trend (Recent)</h3>
            <div className="relative w-full h-[300px] min-w-0 min-h-0 block" id="sales-trend-chart-container" ref={chartContainerRef}>
              {renderChart && salesData.length > 0 && chartWidth > 0 ? (
                <AreaChart width={chartWidth} height={300} data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                    tickFormatter={(val) => `${Number(val) >= 1000 ? (Number(val)/1000).toFixed(1) + 'k' : val} ৳`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#0f172a" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-xs" id="sales-trend-fallback">No recent sales data recorded yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Products Inventory {selectedAdminCategory ? `(${selectedAdminCategory})` : '(All)'}
              </h2>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-0.5">
                Managing {selectedAdminCategory ? products.filter(p => p.category?.toLowerCase() === selectedAdminCategory.toLowerCase()).length : products.length} catalog items
              </p>
            </div>
            
            <button 
              onClick={openAddProductModal}
              className="px-5 py-3 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-2xl text-sm font-bold flex items-center gap-2 shadow-md shadow-orange-500/10 transition-all cursor-pointer w-fit"
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3">
            <Search className="text-slate-400 shrink-0" size={18} />
            <input 
              type="text"
              placeholder="Search product inventory by name or description..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full bg-transparent border-none focus:outline-none text-slate-800 text-sm font-medium"
            />
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] tracking-widest uppercase text-slate-400 font-bold">
                  <th className="p-5">Product</th>
                  <th className="p-5">Category</th>
                  <th className="p-5">Base Price</th>
                  <th className="p-5">Discount %</th>
                  <th className="p-5">Created At</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products
                  .filter(p => {
                    const matchCat = selectedAdminCategory ? p.category?.toLowerCase() === selectedAdminCategory.toLowerCase() : true;
                    const matchSrc = productSearch ? p.name?.toLowerCase().includes(productSearch.toLowerCase()) || p.description?.toLowerCase().includes(productSearch.toLowerCase()) : true;
                    return matchCat && matchSrc;
                  })
                  .map(prod => (
                    <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <img 
                            src={prod.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff'} 
                            alt={prod.name} 
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-50"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-[200px]">{prod.name}</p>
                            <p className="text-slate-400 text-xs truncate max-w-[200px]">{prod.description || 'No description'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 uppercase tracking-wider">
                          {prod.category || 'PC'}
                        </span>
                      </td>
                      <td className="p-5 font-bold text-slate-900">{prod.price?.toLocaleString()} ৳</td>
                      <td className="p-5">
                        {prod.discount ? (
                          <span className="text-red-500 font-bold text-xs">-{prod.discount}% ({(prod.price * (1 - prod.discount/100)).toFixed(0)} ৳)</span>
                        ) : (
                          <span className="text-slate-400 text-xs">0%</span>
                        )}
                      </td>
                      <td className="p-5 text-slate-500 text-xs font-medium">
                        {prod.created_at ? new Date(prod.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => openEditProductModal(prod)}
                            className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                            title="Edit Product"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {products.filter(p => {
                  const matchCat = selectedAdminCategory ? p.category?.toLowerCase() === selectedAdminCategory.toLowerCase() : true;
                  const matchSrc = productSearch ? p.name?.toLowerCase().includes(productSearch.toLowerCase()) || p.description?.toLowerCase().includes(productSearch.toLowerCase()) : true;
                  return matchCat && matchSrc;
                }).length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">No products in this category yet. Click Add Product to seed!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Creator/Editor Form Dialog Popup */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[999] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in scale-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-[10]">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingProduct ? 'Edit Product Catalog Item' : 'Add New Product'}
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Fill out product context & category specs</p>
              </div>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 transition-all cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Product Title *</label>
                <input 
                  type="text" 
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  placeholder="e.g. Mechanical Keyboard RGB"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-sm transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Price (৳) *</label>
                  <input 
                    type="number" 
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                    placeholder="e.g. 1200"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Discount %</label>
                  <input 
                    type="number" 
                    value={productForm.discount}
                    onChange={(e) => setProductForm({...productForm, discount: e.target.value})}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Assigned Category *</label>
                <select 
                  value={productForm.category}
                  onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-sm transition-all"
                  required
                >
                  {categories.filter(c => c.name !== 'All').map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Selected category maps to search indices and filter buttons in user storefront</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Main Image URL</label>
                <input 
                  type="url" 
                  value={productForm.image}
                  onChange={(e) => setProductForm({...productForm, image: e.target.value})}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Additional Gallery Images (Comma separated)</label>
                <input 
                  type="text" 
                  value={productForm.imagesInput}
                  onChange={(e) => setProductForm({...productForm, imagesInput: e.target.value})}
                  placeholder="URL 1, URL 2, URL 3"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Description</label>
                <textarea 
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  placeholder="What makes this product special..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-sm transition-all"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 justify-end">
                <button 
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 cursor-pointer"
                >
                  {editingProduct ? 'Update Item' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
