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
  
  if (location.pathname === '/flash-deals') return <FlashDeals />;
  if (location.pathname === '/food') return <FoodPage />;
  if (location.pathname === '/profile') return <ProfilePage />;
  if (location.pathname === '/checkout') return <CheckoutPage />;
  
  return <Storefront />;
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
