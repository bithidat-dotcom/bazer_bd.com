/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Storefront from './Storefront';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Storefront />} />
      </Routes>
    </Router>
  );
}
