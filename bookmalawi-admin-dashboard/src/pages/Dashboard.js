import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiUsers, FiSettings, FiLogOut } from 'react-icons/fi';

const AdminDashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const customersRes = await axios.get('http://localhost:5000/api/admin/customers?limit=5', config);
      const partnersRes = await axios.get('http://localhost:5000/api/admin/partners?limit=5', config);

      setCustomers(customersRes.data.data);
      setPartners(partnersRes.data.data);
      setStats({
        totalCustomers: customersRes.data.total,
        totalPartners: partnersRes.data.total
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const suspendCustomer = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.post(`http://localhost:5000/api/admin/suspend-customer/${userId}`, 
        { reason: 'Admin action', notes: 'Suspended by admin' }, 
        config
      );

      alert('Customer suspended successfully');
      fetchDashboardData();
    } catch (error) {
      alert('Failed to suspend customer');
    }
  };

  const deleteCustomer = async (userId) => {
    if (window.confirm('Are you sure? This action cannot be undone.')) {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        await axios.post(`http://localhost:5000/api/admin/delete-customer/${userId}`, 
          { reason: 'Admin action', notes: 'Deleted by admin' }, 
          config
        );

        alert('Customer deleted successfully');
        fetchDashboardData();
      } catch (error) {
        alert('Failed to delete customer');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">BookMalawi Admin Dashboard</h1>
            <button className="flex items-center space-x-2 text-red-600 hover:text-red-800">
              <FiLogOut /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Customers</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCustomers || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Partners</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPartners || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Revenue (This Month)</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">MWK 125,000</p>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Recent Customers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{customer.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        customer.account_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {customer.account_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button onClick={() => suspendCustomer(customer.id)} className="text-yellow-600 hover:text-yellow-800">Suspend</button>
                      <button onClick={() => deleteCustomer(customer.id)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
