import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, updateDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trash2, Edit, CheckCircle, XCircle, Users, ShoppingBag, TrendingUp, Utensils, Shirt, Cpu, Bot, Laptop, Dumbbell, ShoppingCart, Scissors, LayoutGrid, Plus, Search, Tag, Clock, User2, Phone, Facebook, Instagram } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [selectedAdminCategory, setSelectedAdminCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'products' | 'analytics' | 'sellers'>('orders');

  // Product Creation & Edit state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editingSeller, setEditingSeller] = useState<any | null>(null);
  const [productSearch, setProductSearch] = useState('');
  
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    discount: '0',
    category: 'PC',
    image: '',
    description: '',
    imagesInput: '',
    stock: '20',
    ram: '',
    storage: '',
    screen_hz: '',
    battery: '',
    watt_amp: '',
    discountTimelineHours: '24',
    flashSaleEnd: '',
    seller: '',
    seller_whatsapp: '',
    seller_logo: '',
  });

  const [sellerForm, setSellerForm] = useState({
    name: '',
    whatsapp: '',
    logo: '',
    facebook: '',
    tiktok: '',
    instagram: '',
    is_top: true
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

    // Listener for users (register_people collection)
    const unsubscribeUsers = onSnapshot(collection(db, 'register_people'), (snapshot) => {
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
          created_at: data.created_at || new Date().toISOString(),
          flashSaleEnd: data.flashSaleEnd || '',
          seller: data.seller || '',
          seller_whatsapp: data.seller_whatsapp || '',
          seller_logo: data.seller_logo || '',
        };
      });
      setProducts(productsData);
      setLoading(false);
    });

    // Listener for sellers
    const unsubscribeSellers = onSnapshot(collection(db, 'sellers'), (snapshot) => {
      const sellersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSellers(sellersData);
      setLoading(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeUsers();
      unsubscribeProducts();
      unsubscribeSellers();
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
      stock: '20',
      ram: '',
      storage: '',
      screen_hz: '',
      battery: '',
      watt_amp: '',
      discountTimelineHours: '24',
      flashSaleEnd: '',
      seller: '',
      seller_whatsapp: '',
      seller_logo: '',
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
      stock: String(prod.stock !== undefined ? prod.stock : 20),
      ram: prod.ram || '',
      storage: prod.storage || '',
      screen_hz: prod.screen_hz || '',
      battery: prod.battery || '',
      watt_amp: prod.watt_amp || '',
      discountTimelineHours: String(prod.discountTimelineHours || 24),
      flashSaleEnd: prod.flashSaleEnd || '',
      seller: prod.seller || '',
      seller_whatsapp: prod.seller_whatsapp || '',
      seller_logo: prod.seller_logo || '',
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
      created_at: editingProduct?.created_at || new Date().toISOString(),
      stock: Number(productForm.stock ?? 20),
      ram: productForm.ram || '',
      storage: productForm.storage || '',
      screen_hz: productForm.screen_hz || '',
      battery: productForm.battery || '',
      watt_amp: productForm.watt_amp || '',
      discountTimelineHours: Number(productForm.discountTimelineHours) || 24,
      flashSaleEnd: productForm.flashSaleEnd || '',
      seller: productForm.seller || '',
      seller_whatsapp: productForm.seller_whatsapp || '',
      seller_logo: productForm.seller_logo || '',
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
  
  const openAddSellerModal = () => {
    setEditingSeller(null);
    setSellerForm({
      name: '',
      whatsapp: '',
      logo: '',
      facebook: '',
      tiktok: '',
      instagram: '',
      is_top: true
    });
    setIsSellerModalOpen(true);
  };

  const openEditSellerModal = (sel: any) => {
    setEditingSeller(sel);
    setSellerForm({
      name: sel.name || '',
      whatsapp: sel.whatsapp || '',
      logo: sel.logo || '',
      facebook: sel.facebook || '',
      tiktok: sel.tiktok || '',
      instagram: sel.instagram || '',
      is_top: sel.is_top !== undefined ? sel.is_top : true
    });
    setIsSellerModalOpen(true);
  };

  const handleSaveSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerForm.name) {
      alert("Seller Name is required.");
      return;
    }

    const trimmedFB = sellerForm.facebook.trim();
    const trimmedTT = sellerForm.tiktok.trim();
    const trimmedIG = sellerForm.instagram.trim();

    if (trimmedFB && !trimmedFB.toLowerCase().includes('facebook.com') && !trimmedFB.toLowerCase().includes('fb.com') && !trimmedFB.toLowerCase().includes('fb.me')) {
      alert("Error: The Facebook URL field must contain a valid Facebook/fb.com link. Leave blank if the seller has no Facebook page.");
      return;
    }

    if (trimmedTT && !trimmedTT.toLowerCase().includes('tiktok.com')) {
      alert("Error: The TikTok URL field must contain a valid tiktok.com link. Leave blank if the seller has no TikTok.");
      return;
    }

    if (trimmedIG && !trimmedIG.toLowerCase().includes('instagram.com')) {
      alert("Error: The Instagram URL field must contain a valid instagram.com link. Leave blank if the seller has no Instagram.");
      return;
    }

    const payload = {
      ...sellerForm,
      facebook: trimmedFB,
      tiktok: trimmedTT,
      instagram: trimmedIG,
      created_at: editingSeller?.created_at || new Date().toISOString(),
    };

    try {
      if (editingSeller) {
        await updateDoc(doc(db, 'sellers', editingSeller.id), payload);
      } else {
        await addDoc(collection(db, 'sellers'), payload);
      }
      setIsSellerModalOpen(false);
      setEditingSeller(null);
    } catch (err) {
      console.error("Error saving seller: ", err);
      alert("Failed to save seller.");
    }
  };

  const handleDeleteSeller = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the seller "${name}"?`)) {
      try {
        await deleteDoc(doc(db, 'sellers', id));
      } catch (err) {
        console.error("Error deleting seller: ", err);
        alert("Failed to delete seller.");
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
          <button 
            onClick={() => setActiveTab('sellers')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'sellers' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <User2 size={18} />
            Sellers
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
                      <div className="text-sm font-medium text-slate-750 whitespace-pre-line w-48">
                        {order.product_name?.split('\n').map((line: string, i: number) => {
                          const productIds = String(order.product_id || '').split(',').map((id: string) => id.trim());
                          const pId = productIds[i] || productIds[0];
                          const matchedProd = products.find(p => String(p.id).trim() === pId);
                          const currentStock = matchedProd?.stock !== undefined ? matchedProd.stock : null;
                          return (
                            <div key={i} className="mb-1.5 last:mb-0">
                              <span className="font-bold text-slate-800 text-xs sm:text-sm">{line}</span>
                              {currentStock !== null && (
                                <div className="mt-0.5">
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border select-none ${
                                    currentStock <= 5 
                                      ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' 
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                  }`}>
                                    Current Stock Rest: {currentStock} Pcs
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-5 font-black text-slate-900">{order.price?.toLocaleString()} ৳</td>
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
                      <div className="flex flex-col gap-1.5">
                        <p className="font-bold text-slate-600 flex items-center gap-1.5">
                          WA: <span className="text-slate-900">{order.whatsapp}</span>
                          <a 
                            href={`https://wa.me/${order.whatsapp?.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          </a>
                        </p>
                        <p className="truncate w-32 mt-0.5 text-slate-500" title={order.location}>{order.location}</p>
                      </div>
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
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-h-[80vh] overflow-y-auto scroll-smooth pr-2">
          <h2 className="text-2xl font-bold tracking-tight mb-4">Users Directory ({users.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(user => {
              const userOrders = orders.filter(o => o.customer_uid === user.uid || o.customer_username === user.username);
              const totalSpent = userOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
              
              return (
                <div key={user.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 transition-all hover:shadow-md flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-3xl flex-shrink-0 overflow-hidden border border-slate-100 shadow-inner">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={user.username || 'user'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-2xl bg-slate-50 uppercase">
                          {(user.username || 'U').charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 truncate text-xl leading-tight">@{user.username || 'Anonymous'}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 bg-slate-50 w-fit px-2 py-0.5 rounded-full">
                        ID: {user.uid?.slice(-6).toUpperCase() || 'EXTERNAL'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                        <span className="font-black text-slate-900 truncate ml-4">{user.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-wider">WhatsApp</span>
                        <span className="font-black text-slate-900">{user.whatsapp || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-wider">Location</span>
                        <span className="font-bold text-slate-600 truncate ml-4 max-w-[150px]" title={user.location}>{user.location || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="bg-orange-50/30 p-4 rounded-2xl border border-orange-100/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Order Statistics</span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-full border border-orange-100">
                          <ShoppingBag size={10} className="text-orange-500" />
                          <span className="text-[10px] font-black text-orange-600">{userOrders.length} Orders</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Total Purchase Value</span>
                        <span className="text-lg font-black text-slate-900">{totalSpent.toLocaleString()} ৳</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Recent Order Activity</span>
                      <div className="max-h-32 overflow-y-auto scrollbar-hidden space-y-1.5 pr-1">
                        {userOrders.length > 0 ? userOrders.slice(0, 5).map(o => (
                          <div key={o.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-slate-900 truncate leading-tight">{o.product_name?.split('\n')[0]}</p>
                              <p className="text-[9px] font-bold text-slate-400">{new Date(o.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                              o.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                              o.status === 'cancelled' ? 'bg-rose-50 text-rose-600' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {o.status}
                            </span>
                          </div>
                        )) : (
                          <p className="text-[10px] font-bold text-slate-400 italic bg-slate-50 p-3 rounded-xl text-center">No purchases recorded yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      Member Since {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                </div>
              );
            })}
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
              <h3 className="text-3xl font-black text-slate-900">{orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0).toLocaleString()} ৳</h3>
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
                  <th className="p-5">Stock</th>
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
                      <td className="p-5 font-black text-slate-900">{prod.price?.toLocaleString()} ৳</td>
                      <td className="p-5">
                        {prod.discount ? (
                          <span className="text-red-500 font-black text-xs">-{prod.discount}% ({(prod.price * (1 - prod.discount/100)).toFixed(0)} ৳)</span>
                        ) : (
                          <span className="text-slate-400 text-xs">0%</span>
                        )}
                      </td>
                      <td className="p-5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold leading-none ${
                          (prod.stock !== undefined ? prod.stock : 20) <= 0
                            ? 'bg-rose-100 text-rose-800'
                            : (prod.stock !== undefined ? prod.stock : 20) <= 5
                            ? 'bg-amber-100 text-amber-850'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {prod.stock !== undefined ? prod.stock : '20'}
                        </span>
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

      {activeTab === 'sellers' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Sellers Directory ({sellers.length})</h2>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-0.5">Manage partner profiles and social links</p>
            </div>
            
            <button 
              onClick={openAddSellerModal}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl text-sm font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer w-fit"
            >
              <Plus size={18} />
              Add Seller
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] tracking-widest uppercase text-slate-400 font-bold">
                  <th className="p-5">Seller</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sellers.map(sel => (
                  <tr key={sel.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                          {sel.logo ? (
                            <img src={sel.logo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                               <User2 size={24} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{sel.name}</p>
                          <div className="flex gap-2 mt-1">
                            {sel.whatsapp && <Phone size={12} className="text-emerald-500" />}
                            {sel.facebook && <Facebook size={12} className="text-blue-600" />}
                            {sel.tiktok && sel.tiktok.trim() !== '' && (
                              <div className="w-3 h-3 shrink-0 flex items-center justify-center">
                                <img 
                                  src="https://sf-static.tiktokcdn.com/obj/eden-sg/uhtyvueh7nulogpoguhm/tiktok-icon2.png" 
                                  className="w-full h-full object-contain"
                                  alt="TikTok" 
                                />
                              </div>
                            )}
                            {sel.instagram && <Instagram size={12} className="text-pink-600" />}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                       {sel.is_top ? (
                         <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600 uppercase tracking-widest">Top Seller</span>
                       ) : (
                         <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 uppercase tracking-widest">Normal</span>
                       )}
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => openEditSellerModal(sel)}
                          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSeller(sel.id, sel.name)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sellers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-slate-400 font-medium">No sellers registered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seller Creator/Editor Form Dialog */}
      {isSellerModalOpen && (
        <div className="fixed inset-0 z-[999] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in scale-in duration-200 text-left">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-[10]">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingSeller ? 'Edit Seller Profile' : 'Add New Seller'}
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Manage partner info & social handles</p>
              </div>
              <button 
                onClick={() => setIsSellerModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 transition-all cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSeller} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Seller Name *</label>
                <input 
                  type="text" 
                  value={sellerForm.name}
                  onChange={(e) => setSellerForm({...sellerForm, name: e.target.value})}
                  placeholder="e.g. Dream Tech BD"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-sm transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">WhatsApp Number</label>
                <input 
                  type="text" 
                  value={sellerForm.whatsapp}
                  onChange={(e) => setSellerForm({...sellerForm, whatsapp: e.target.value})}
                  placeholder="01712345678"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Logo URL</label>
                <input 
                  type="text" 
                  value={sellerForm.logo}
                  onChange={(e) => setSellerForm({...sellerForm, logo: e.target.value})}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-sm transition-all"
                />
              </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">
                      <img 
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm0F2xlq4BO9-4boQ1D9oGwXTiYfW5KcUvew&s" 
                        className="w-3.5 h-3.5 rounded-full object-cover"
                      />
                      Facebook URL
                    </label>
                    <input 
                      type="text" 
                      value={sellerForm.facebook}
                      onChange={(e) => setSellerForm({...sellerForm, facebook: e.target.value})}
                      placeholder="https://facebook.com/..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">
                      <img 
                        src="https://sf-static.tiktokcdn.com/obj/eden-sg/uhtyvueh7nulogpoguhm/tiktok-icon2.png" 
                        className="w-3.5 h-3.5 rounded-full object-cover"
                      />
                      TikTok URL
                    </label>
                    <input 
                      type="text" 
                      value={sellerForm.tiktok}
                      onChange={(e) => setSellerForm({...sellerForm, tiktok: e.target.value})}
                      placeholder="https://tiktok.com/@..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/250px-Instagram_logo_2016.svg.png" 
                        className="w-3.5 h-3.5 rounded-full object-cover"
                      />
                      Instagram URL
                    </label>
                    <input 
                      type="text" 
                      value={sellerForm.instagram}
                      onChange={(e) => setSellerForm({...sellerForm, instagram: e.target.value})}
                      placeholder="https://instagram.com/..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-sm transition-all"
                    />
                  </div>
                </div>

              <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <input 
                  type="checkbox"
                  id="is_top"
                  checked={sellerForm.is_top}
                  onChange={(e) => setSellerForm({...sellerForm, is_top: e.target.checked})}
                  className="w-5 h-5 rounded accent-orange-500 cursor-pointer"
                />
                <label htmlFor="is_top" className="text-sm font-bold text-orange-900 cursor-pointer">Badge as Top Seller</label>
              </div>

              <button 
                type="submit"
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/10"
              >
                {editingSeller ? 'Save Profile Changes' : 'Create Seller Profile'}
              </button>
            </form>
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Price (৳) *</label>
                  <input 
                    type="number" 
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                    placeholder="e.g. 1200"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-xs sm:text-sm transition-all"
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-xs sm:text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1 font-sans">Stock</label>
                  <input 
                    type="number" 
                    value={productForm.stock}
                    onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                    placeholder="20"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-xs sm:text-sm transition-all"
                  />
                  <div className="flex gap-1.5 mt-2">
                    {['20', '30', '100'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setProductForm({...productForm, stock: preset})}
                        className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                          productForm.stock === preset 
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm font-black' 
                            : 'bg-white text-slate-600 border-slate-250 hover:bg-slate-100 hover:border-slate-350'
                        }`}
                      >
                        {preset} Pcs
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Discount Expiry Countdown Configuration */}
              {Number(productForm.discount) > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 text-orange-600 mb-2">
                    <Tag size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Discount Timer Settings</span>
                  </div>
                  
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Set Active Duration (Hours)</label>
                  <div className="flex gap-2 mb-2">
                    {['2', '6', '12', '24'].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => setProductForm({...productForm, discountTimelineHours: hrs})}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          productForm.discountTimelineHours === hrs
                            ? 'bg-orange-500 text-white border-orange-500 font-extrabold shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {hrs} Hrs
                      </button>
                    ))}
                  </div>
                  <div>
                    <input
                      type="number"
                      value={productForm.discountTimelineHours}
                      onChange={(e) => setProductForm({...productForm, discountTimelineHours: e.target.value})}
                      placeholder="Custom hours, e.g. 48"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-orange-500 text-xs transition-all animate-none"
                    />
                    <p className="text-[9px] text-slate-400 mt-1">This sets a dynamic countdown timer for this discount, ending in specified hours.</p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-orange-100">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1.5">
                      <Clock size={12} className="text-orange-500" />
                      Set Exact Flash Sale End Date (Optional)
                    </label>
                    <input
                      type="text"
                      value={productForm.flashSaleEnd}
                      onChange={(e) => setProductForm({...productForm, flashSaleEnd: e.target.value})}
                      placeholder="e.g. 07/01/2026 02:41 PM"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-orange-500 text-xs sm:text-sm transition-all"
                    />
                    <p className="text-[9px] text-slate-500 mt-1 font-bold">Priority: This date/time will override the hours timeline if provided.</p>
                    <p className="text-[8px] text-slate-400">Format: MM/DD/YYYY HH:MM AM/PM</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Seller Name</label>
                  <input 
                    type="text" 
                    value={productForm.seller}
                    onChange={(e) => setProductForm({...productForm, seller: e.target.value})}
                    placeholder="e.g. BD Tech Store"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-xs sm:text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Seller WhatsApp</label>
                  <input 
                    type="text" 
                    value={productForm.seller_whatsapp}
                    onChange={(e) => setProductForm({...productForm, seller_whatsapp: e.target.value})}
                    placeholder="e.g. 01700000000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-xs sm:text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Seller Icon URL</label>
                <input 
                  type="text" 
                  value={productForm.seller_logo}
                  onChange={(e) => setProductForm({...productForm, seller_logo: e.target.value})}
                  placeholder="e.g. https://example.com/logo.png"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none text-xs sm:text-sm transition-all"
                />
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

              {/* Dynamic Specs Form for Gadget/PC/Robotic */}
              {(['gadget', 'pc', 'robotic'].includes(productForm.category?.toLowerCase() || '')) && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-orange-600 mb-1">
                    <Cpu size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Technical Specs (Gadget Mode)</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">RAM</label>
                      <input 
                        type="text" 
                        value={productForm.ram}
                        onChange={(e) => setProductForm({...productForm, ram: e.target.value})}
                        placeholder="e.g. 8GB / 16GB"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-orange-500 text-xs transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Storage</label>
                      <input 
                        type="text" 
                        value={productForm.storage}
                        onChange={(e) => setProductForm({...productForm, storage: e.target.value})}
                        placeholder="e.g. 256GB SSD / 1TB"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-orange-500 text-xs transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Screen Refresh Rate</label>
                      <input 
                        type="text" 
                        value={productForm.screen_hz}
                        onChange={(e) => setProductForm({...productForm, screen_hz: e.target.value})}
                        placeholder="e.g. 90Hz / 120Hz / 144Hz"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-orange-500 text-xs transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Battery Backup</label>
                      <input 
                        type="text" 
                        value={productForm.battery}
                        onChange={(e) => setProductForm({...productForm, battery: e.target.value})}
                        placeholder="e.g. 5000 mAh / 8 hrs"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-orange-500 text-xs transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Watt / Amp Rating</label>
                    <input 
                      type="text" 
                      value={productForm.watt_amp}
                      onChange={(e) => setProductForm({...productForm, watt_amp: e.target.value})}
                      placeholder="e.g. 65W PD / 5V 3A"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-orange-500 text-xs transition-all"
                    />
                  </div>
                </div>
              )}

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
