import { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { FiClock, FiZap, FiCheck, FiX, FiBriefcase, FiShield, FiFileText } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import ServiceSelectionModal from '../components/ServiceSelectionModal';
import BillModal from '../components/BillModal';

export default function ProviderDashboard() {
  const [offers, setOffers] = useState([]); // pending offers
  const [activeBookings, setActiveBookings] = useState([]); // accepted/in_progress/completed bookings
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pollRef = useRef(null);
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [billModal, setBillModal] = useState(null); // For bill modal
  const navigate = useNavigate();

  const fetchOffers = async () => {
    try {
      setLoadingOffers(true);
      const { data } = await API.get('/bookings/offers/mine');
      setOffers(data.offers || []);
      setNow(Date.parse(data.now) || Date.now());
    } catch { /* ignore */ } finally { setLoadingOffers(false); }
  };
  
  const fetchActiveBookings = async () => {
    try {
      const { data } = await API.get('/bookings/mine');
      const bookings = data.bookings || [];
      // Filter for active bookings (accepted, in_progress, completed - not cancelled/rejected)
      const active = bookings.filter(b => 
        ['accepted', 'in_progress', 'completed'].includes(b.status) && 
        b.status !== 'cancelled'
      );
      setActiveBookings(active);
    } catch (e) {
      console.error('Failed to fetch active bookings:', e);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchActiveBookings();
    pollRef.current = setInterval(() => {
      fetchOffers();
      fetchActiveBookings();
    }, 15000); // 15s polling
    const tick = setInterval(()=> setNow(Date.now()), 1000); // countdown second resolution
    return () => { clearInterval(pollRef.current); clearInterval(tick); };
  }, []);

  const secondsLeft = (timeoutAt) => {
    if(!timeoutAt) return null; const diff = Math.max(0, (new Date(timeoutAt).getTime() - now)/1000); return Math.floor(diff);
  };

  const respond = async (id, action) => {
    try {
      const url = `/bookings/${id}/offer/${action}`;
      await API.patch(url, {});
      fetchOffers();
      fetchActiveBookings(); // Refresh active bookings after accepting
    } catch(e){
      const data = e?.response?.data;
      alert(`Failed: ${data?.message || e.message}\n${data?.error ? 'Detail: '+data.error : ''}`);
      console.warn('[offer action error]', data); 
    }
  };
  
  const markInProgress = async (id) => {
    try {
      await API.patch(`/bookings/${id}/in-progress`);
      fetchActiveBookings();
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to mark in progress');
    }
  };
  
  const markComplete = async (id) => {
    if (!window.confirm('Mark this booking as completed? A bill will be automatically generated.')) return;
    try {
      const response = await API.patch(`/bookings/${id}/complete`);
      fetchActiveBookings();
      if (response.data.billGenerated) {
        alert('✅ Booking completed and bill generated! You can now send the bill to customer.');
      } else {
        alert('✅ Booking marked as completed!');
      }
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to mark as completed');
    }
  };
  
  const viewBill = (booking) => {
    setBillModal(booking);
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-6 py-10 space-y-10 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-2">Provider Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage live requests and performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowServiceModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/40 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/60 transition-colors"
          >
            <FiBriefcase className="w-4 h-4" />
            Manage Services
          </button>
          <button
            onClick={()=> setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? '🌞 Light' : '🌙 Dark'}
          </button>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl shadow-card bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Active Offers</div>
          <div className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">{offers.length}</div>
          <div className="text-gray-600 dark:text-gray-300">Awaiting response</div>
        </div>
        <div className="p-6 rounded-2xl shadow-card bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Polling Every</div>
          <div className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">15s</div>
          <div className="text-gray-600 dark:text-gray-300">Auto refresh</div>
        </div>
        <div className="p-6 rounded-2xl shadow-card bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Assignment Mode</div>
          <div className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">Queue</div>
          <div className="text-gray-600 dark:text-gray-300">Best-first offers</div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Pending Offers</h2>
          <button onClick={fetchOffers} className="text-sm px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/60 border border-blue-100 dark:border-blue-800 transition-colors">Refresh</button>
        </div>
        {loadingOffers && <div className="text-sm text-gray-500 dark:text-gray-400">Loading offers...</div>}
        {!loadingOffers && offers.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">No pending offers. Stay live to receive new jobs.</div>
        )}
        <div className="space-y-4">
          {offers.map(o => {
            const secs = secondsLeft(o.timeoutAt);
            const pct = secs && o.timeoutAt ? Math.min(100, Math.max(0, (secs/120)*100)) : 0;
            return (
              <div key={o._id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-800 dark:text-gray-100">Booking {o.bookingId}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <FiClock className="w-4 h-4" />
                    {secs != null ? `${secs}s left` : '—'}
                  </div>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mb-4">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex gap-3">
                  <button onClick={()=>respond(o._id,'accept')} className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 text-sm font-medium rounded-lg bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 text-white transition-colors"><FiCheck />Accept</button>
                  <button onClick={()=>respond(o._id,'decline')} className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-white transition-colors"><FiX />Decline</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Active Bookings Section */}
      {activeBookings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Active Bookings</h2>
            <button onClick={fetchActiveBookings} className="text-sm px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/60 border border-blue-100 dark:border-blue-800 transition-colors">Refresh</button>
          </div>
          <div className="space-y-4">
            {activeBookings.map(booking => (
              <div key={booking._id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Booking #{booking.bookingId}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {booking.service?.name || booking.serviceTemplate?.name || 'Service'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    booking.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                    booking.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {booking.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                
                <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <p>Customer: {booking.customer?.name || 'N/A'}</p>
                  {booking.serviceDetails?.answers && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="font-medium mb-1">Service Details:</p>
                      {Object.entries(booking.serviceDetails.answers).map(([key, value]) => (
                        <p key={key} className="text-xs">
                          <span className="font-medium">{key}:</span> {Array.isArray(value) ? value.join(', ') : value}
                        </p>
                      ))}
                      {booking.serviceDetails.estimate && (
                        <p className="text-xs mt-1 font-medium text-green-600 dark:text-green-400">
                          Estimated: ₹{booking.serviceDetails.estimate.totalCost}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  {booking.status === 'accepted' && (
                    <button
                      onClick={() => markInProgress(booking._id)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Mark In Progress
                    </button>
                  )}
                  
                  {booking.status === 'in_progress' && (
                    <>
                      <button
                        onClick={() => markComplete(booking._id)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Mark Complete
                      </button>
                      <button
                        onClick={() => navigate(`/provider/track/${booking._id}`)}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Track Location
                      </button>
                    </>
                  )}
                  
                  {booking.status === 'completed' && booking.billDetails && (
                    <>
                      <button
                        onClick={() => viewBill(booking)}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        <FiFileText />
                        View & Send Bill
                      </button>
                      {booking.paymentStatus === 'paid' && (
                        <span className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium rounded-lg border border-green-200 dark:border-green-700">
                          ✅ Paid
                        </span>
                      )}
                      {booking.paymentStatus === 'billed' && (
                        <span className="px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm font-medium rounded-lg border border-yellow-200 dark:border-yellow-700">
                          ⏳ Awaiting Payment
                        </span>
                      )}
                    </>
                  )}
                  
                  {booking.status === 'completed' && !booking.bill && (
                    <button
                      onClick={() => generateBill(booking)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Generate Bill
                    </button>
                  )}
                  
                  {booking.bill && (
                    <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg">
                      Bill Generated - ₹{booking.bill.totalAmount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Service Selection Modal */}
      <ServiceSelectionModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        onComplete={() => {
          setShowServiceModal(false);
          // Optionally refresh something
        }}
      />
      
      {/* Bill Modal */}
      {billModal && (
        <BillModal
          booking={billModal}
          onClose={() => setBillModal(null)}
          onPaymentSuccess={() => {
            setBillModal(null);
            fetchActiveBookings();
          }}
          userRole="provider"
        />
      )}

      {/* Verification Required Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mx-auto mb-4">
              <FiShield className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
              Verification Required
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              You need to be approved by admin to go live. Please upload your license for verification.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowVerificationModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  navigate('/provider/verification');
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Verify Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
