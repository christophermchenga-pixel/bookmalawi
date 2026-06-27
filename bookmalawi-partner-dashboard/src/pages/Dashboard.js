import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiTrendingUp, FiBookOpen, FiLogOut } from 'react-icons/fi';

const PartnerDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartnerData();
  }, []);

  const fetchPartnerData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const bookingsRes = await axios.get('http://localhost:5000/api/partner/bookings?limit=10', config);
      const revenueRes = await axios.get('http://localhost:5000/api/partner/revenue', config);

      setBookings(bookingsRes.data.data);
      setRevenue(revenueRes.data.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Partner Dashboard</h1>
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
            <div className="flex items-center">
              <FiTrendingUp className="text-2xl text-green-600 mr-4" />
              <div>
                <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
                <p className="text-2xl font-bold text-gray-900">MWK {revenue?.total_revenue || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <FiBookOpen className="text-2xl text-blue-600 mr-4" />
              <div>
                <h3 className="text-gray-500 text-sm font-medium">Total Bookings</h3>
                <p className="text-2xl font-bold text-gray-900">{revenue?.total_transactions || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Avg Transaction</h3>
            <p className="text-2xl font-bold text-gray-900">MWK {revenue?.avg_transaction || 0}</p>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Recent Bookings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Booking #</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Check-in</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Check-out</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Guests</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{booking.booking_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{booking.check_in_date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{booking.check_out_date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{booking.num_guests}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status}
                      </span>
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

export default PartnerDashboard;
