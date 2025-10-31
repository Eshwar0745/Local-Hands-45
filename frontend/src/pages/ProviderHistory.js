import React, { useEffect, useState } from "react";
import API from "../services/api";
import { FiUser, FiCalendar, FiCheck, FiX, FiStar, FiFileText } from "react-icons/fi";
import ReviewCard from "../components/ReviewCard";
// Switched to EnhancedRatingModal (hidden review + optional message). Providers do not upload images.
import EnhancedRatingModal from "../components/EnhancedRatingModal";
import { RatingsAPI } from "../services/api.extras";
import ProviderEarningsDashboard from "../components/ProviderEarningsDashboard";
import BillGenerationModal from "../components/BillGenerationModal";

export default function ProviderHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rateFor, setRateFor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get("/bookings/mine", { params: { history: true } });
        setBookings(data.bookings || []);
      } catch {
        console.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const canRate = (b) => b.status === "completed" && !b.providerRating;
  
  const canGenerateBill = (b) => b.status === "completed" && b.paymentStatus === "pending";

  const handleGenerateBill = (booking) => {
    setSelectedBooking(booking);
    setShowBillModal(true);
  };

  const handleBillSuccess = (updatedBooking) => {
    // Refresh bookings list
    setBookings(bookings.map(b => b._id === updatedBooking._id ? updatedBooking : b));
    setShowBillModal(false);
    setSelectedBooking(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a] transition-all duration-300">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-brand-gray-900 dark:text-white">
            My Service History
          </h1>
          <button
            onClick={() => setShowEarnings(!showEarnings)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <FiFileText />
            {showEarnings ? 'Hide Earnings' : 'View Earnings'}
          </button>
        </div>

        {/* Earnings Dashboard */}
        {showEarnings && (
          <div className="mb-8">
            <ProviderEarningsDashboard />
          </div>
        )}

        {loading ? (
          <div className="p-6 text-gray-500 dark:text-gray-400 animate-pulse">
            Loading your completed jobs...
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-6 text-gray-500 dark:text-gray-400">
            No past jobs yet.
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div
                key={b._id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow hover:shadow-lg transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-2">
                  <h2 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {b.service?.name || "Service"}
                  </h2>
                  <div className="flex items-center gap-2 text-sm">
                    {b.status === "completed" && (
                      <span className="text-green-600 dark:text-green-400 flex items-center">
                        <FiCheck className="mr-1" /> Completed
                      </span>
                    )}
                    {b.status === "rejected" && (
                      <span className="text-red-500 flex items-center">
                        <FiX className="mr-1" /> Rejected
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <FiCalendar className="w-4 h-4" />
                  {b.completedAt
                    ? new Date(b.completedAt).toLocaleString()
                    : "—"}
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm">
                  <FiUser className="text-gray-400" />
                  <span>
                    Customer: {b.customer?.name || "Unknown"}
                    {b.customer?._id && (
                      <button
                        onClick={async () => {
                          setLoadingProfile(true);
                          try {
                            const { data } = await API.get(`/users/customer/${b.customer._id}`);
                            setCustomerProfile(data);
                          } catch {
                            alert('Failed to load customer profile');
                          } finally { setLoadingProfile(false); }
                        }}
                        className="ml-2 text-xs text-blue-600 dark:text-blue-400 underline hover:text-blue-700"
                      >View</button>
                    )}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <div className="text-blue-500 font-semibold">
                      ₹{(b.billDetails?.total != null
                        ? b.billDetails.total
                        : (b.serviceDetails?.estimate?.total != null
                            ? b.serviceDetails.estimate.total
                            : (b.service?.price || 0)
                          )
                        ).toFixed(0)}
                    </div>
                    {b.paymentStatus && (
                      <div className={`text-xs mt-1 ${
                        b.paymentStatus === 'paid' ? 'text-green-600' : 
                        b.paymentStatus === 'billed' ? 'text-yellow-600' : 
                        'text-gray-500'
                      }`}>
                        {b.paymentStatus === 'paid' ? '✓ Paid' : 
                         b.paymentStatus === 'billed' ? '📄 Bill Generated' : 
                         'Pending'}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {canGenerateBill(b) && (
                      <button
                        onClick={() => handleGenerateBill(b)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                      >
                        Generate Bill
                      </button>
                    )}
                    {canRate(b) ? (
                      <button
                        onClick={() => setRateFor(b)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                      >
                        Rate Customer
                      </button>
                    ) : b.providerRating ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <FiStar className="text-yellow-400" />{" "}
                        {b.providerRating}/5
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bill Generation Modal */}
        {showBillModal && selectedBooking && (
          <BillGenerationModal
            booking={selectedBooking}
            onClose={() => {
              setShowBillModal(false);
              setSelectedBooking(null);
            }}
            onSuccess={handleBillSuccess}
          />
        )}

        <EnhancedRatingModal
          open={!!rateFor}
          title="Rate your customer"
            userRole="provider"
            otherPartyName={rateFor?.customer?.name || 'Customer'}
            otherPartyRating={rateFor?.customerAvgRating || rateFor?.customer?.rating || null}
            otherPartyReviews={[]}
          onClose={() => setRateFor(null)}
          submitting={submitting}
          showImageUpload={false}
          onSubmit={async ({ rating, comment, optionalMessage }) => {
            if (!rateFor) return;
            try {
              setSubmitting(true);
              await RatingsAPI.rateCustomer({
                bookingId: rateFor._id,
                rating,
                comment,
                optionalMessage,
              });
              setRateFor(null);
              window.location.reload();
            } catch {
              alert("Failed to rate customer.");
            } finally {
              setSubmitting(false);
            }
          }}
        />
        {customerProfile && (
          <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4' onClick={()=>setCustomerProfile(null)}>
            <div className='bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-xl dark:shadow-dark-glow border border-gray-700' onClick={e=>e.stopPropagation()}>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>{customerProfile.user.name}</h3>
                <button onClick={()=>setCustomerProfile(null)} className='text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'>Close</button>
              </div>
              <div className='flex items-center gap-4 mb-4'>
                <div className='px-3 py-2 bg-yellow-500/10 rounded-lg text-sm'>⭐ {customerProfile.user.rating?.toFixed?.(1) || 0} ({customerProfile.user.ratingCount || 0})</div>
                <div className='text-sm text-gray-600 dark:text-gray-400'>Provider-reviewed jobs: {customerProfile.stats.completedJobs}</div>
              </div>
              <h4 className='font-medium text-gray-900 dark:text-white mb-2'>Recent Feedback</h4>
              <div className='space-y-3 max-h-72 overflow-auto pr-2'>
                {customerProfile.reviews.length === 0 && <p className='text-xs text-gray-500'>No reviews yet.</p>}
                {customerProfile.reviews.map((r,i)=>(
                  <ReviewCard key={i} review={{...r, provider: { name: 'You' }, customer: customerProfile.user }} currentUserId={customerProfile.user._id} viewMode="profile" />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
