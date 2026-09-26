/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Storefront from './Storefront';
import AdminDashboard from './components/AdminDashboard';
import SellerDashboard from './components/SellerDashboard';
import FlashDeals from './components/FlashDeals';
import DrinkCafe from './components/DrinkCafe';
import FoodPage from './components/FoodPage';
import ProfilePage from './components/ProfilePage';
import CheckoutPage from './components/CheckoutPage';

function MainAppLayout() {
  const location = useLocation();
  const isFlashDeals = location.pathname === '/flash-deals';
  const isDrinkCafe = location.pathname === '/drink-cafe';
  const isFoodPage = location.pathname === '/food';
  const isProfile = location.pathname === '/profile';
  const isCheckout = location.pathname === '/checkout';

  return (
    <>
      <div style={{ display: (isFlashDeals || isDrinkCafe || isFoodPage || isProfile || isCheckout) ? 'none' : 'block' }}>
        <Storefront />
      </div>
      <div style={{ display: isFlashDeals ? 'block' : 'none' }}>
        <FlashDeals />
      </div>
      <div style={{ display: isDrinkCafe ? 'block' : 'none' }}>
        <DrinkCafe />
      </div>
      <div style={{ display: isFoodPage ? 'block' : 'none' }}>
        <FoodPage />
      </div>
      <div style={{ display: isProfile ? 'block' : 'none' }}>
        <ProfilePage />
      </div>
      <div style={{ display: isCheckout ? 'block' : 'none' }}>
        <CheckoutPage />
      </div>
    </>
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
