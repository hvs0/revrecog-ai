import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Contracts from './pages/Contracts';
import Invoices from './pages/Invoices';
import Leakage from './pages/Leakage';
import Revenue from './pages/Revenue';
import Admin from './pages/Admin';
import DataPortal from './pages/DataPortal';

const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/data" element={<DataPortal />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/leakage" element={<Leakage />} />
        <Route path="/revenue" element={<Revenue />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Layout>
  );
};

export default App;
