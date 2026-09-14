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

function MainAppLayout() {
  const location = useLocation();
  const isFlashDeals = location.pathname === '/flash-deals';
  const isDrinkCafe = location.pathname === '/drink-cafe';

  return (
    <>
      <div style={{ display: (isFlashDeals || isDrinkCafe) ? 'none' : 'block' }}>
        <Storefront />
      </div>
      <div style={{ display: isFlashDeals ? 'block' : 'none' }}>
        <FlashDeals />
      </div>
      <div style={{ display: isDrinkCafe ? 'block' : 'none' }}>
        <DrinkCafe />
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
