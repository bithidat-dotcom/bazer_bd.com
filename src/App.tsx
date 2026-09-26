/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Storefront from './Storefront';
import AdminDashboard from './components/AdminDashboard';
import SellerDashboard from './components/SellerDashboard';
import FlashDeals from './components/FlashDeals';
import FoodPage from './components/FoodPage';
import ProfilePage from './components/ProfilePage';
import CheckoutPage from './components/CheckoutPage';

function MainAppLayout() {
  const location = useLocation();
  const path = location.pathname;
  
  return (
    <div className="relative w-full h-full">
      <div className={path === '/' || path === '' ? 'contents' : 'hidden'}>
        <Storefront />
      </div>
      <div className={path === '/flash-deals' ? 'contents' : 'hidden'}>
        <FlashDeals />
      </div>
      <div className={path === '/food' ? 'contents' : 'hidden'}>
        <FoodPage />
      </div>
      <div className={path === '/profile' ? 'contents' : 'hidden'}>
        <ProfilePage />
      </div>
      <div className={path === '/checkout' ? 'contents' : 'hidden'}>
        <CheckoutPage />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/seller" element={<SellerDashboard />} />
        <Route path="/*" element={<MainAppLayout />} />
      </Routes>
    </Router>
  );
}
