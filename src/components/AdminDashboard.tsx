import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trash2, Edit, CheckCircle, XCircle, Users, ShoppingBag, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'analytics'>('orders');

  const [salesData, setSalesData] = useState<any[]>([]);
  const [renderChart, setRenderChart] = useState(false);

  useEffect(() => {
    fetchData();
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const ordersData = ordersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(ordersData);

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(usersData);

      // Simple sales data generation from orders
      const dailySales: { [key: string]: number } = {};
      ordersData.forEach((order: any) => {
        if (order.created_at) {
          const date = new Date(order.created_at).toLocaleDateString();
          dailySales[date] = (dailySales[date] || 0) + (Number(order.price) || 0);
        }
      });
      const chartData = Object.entries(dailySales).map(([name, total]) => ({ name, total }));
      setSalesData(chartData.slice(-7)); // Last 7 days
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      fetchData(); // Refresh
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        fetchData();
      } catch (error) {
        console.error("Error deleting order:", error);
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
        
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 w-fit">
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
                    <td className="p-5 font-bold text-slate-900">৳{order.price?.toLocaleString()}</td>
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
              <h3 className="text-3xl font-bold text-slate-900">৳{orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0).toLocaleString()}</h3>
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

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6">Sales Trend (Recent)</h3>
            <div className="w-full h-[300px] flex items-center justify-center">
              {renderChart ? (
                <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
                  <AreaChart data={salesData}>
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
                      tickFormatter={(val) => `৳${Number(val) >= 1000 ? (Number(val)/1000).toFixed(1) + 'k' : val}`}
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
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 font-mono text-xs animate-pulse">Analyzing sales data...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
