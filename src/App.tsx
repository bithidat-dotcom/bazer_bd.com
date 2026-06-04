/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Storefront from './Storefront';
import AdminDashboard from './components/AdminDashboard';
import SellerDashboard from './components/SellerDashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/seller" element={<SellerDashboard />} />
      </Routes>
    </Router>
  );
}
