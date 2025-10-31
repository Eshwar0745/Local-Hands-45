import React, { useEffect, useState } from "react";
import API from "../services/api";
import { FiCalendar, FiCheck, FiX, FiStar, FiFileText } from "react-icons/fi";
// Migrated from legacy RatingModal to EnhancedRatingModal with hidden review + optional message + image support
import EnhancedRatingModal from "../components/EnhancedRatingModal";
import { RatingsAPI } from "../services/api.extras";
import ReviewCard from "../components/ReviewCard";
import CustomerPaymentHistory from "../components/CustomerPaymentHistory";
import BillViewModal from "../components/BillViewModal";

export default function CustomerHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rateFor, setRateFor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // For provider profile reviews shown in modal (if desired later)
  const [providerProfile, setProviderProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/bookings/mine", { params: { history: true } });
      setBookings(data.bookings ?? []);
    } catch (e) {
      setError("Failed to load history. Please try again.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const canRate = (b) =>
    b.status === "completed" && !b.customerRating;

  const canViewBill = (b) => b.paymentStatus === "billed" || b.paymentStatus === "paid";

  const handleViewBill = (booking) => {
    setSelectedBookingId(booking._id);
    setShowBillModal(true);
  };

  const handlePaymentSuccess = () => {
    load(); // Refresh bookings
    setShowBillModal(false);
    setSelectedBookingId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-brand-gray-900 dark:text-white bg-clip-text dark:bg-gradient-to-r dark:from-blue-400 dark:to-blue-600 dark:text-transparent">My History</h1>
          <button
            onClick={() => setShowPaymentHistory(!showPaymentHistory)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <FiFileText />
            {showPaymentHistory ? 'Hide Payments' : 'View Payments'}
          </button>
        </div>

        {/* Payment History */}
        {showPaymentHistory && (
          <div className="mb-8">
            <CustomerPaymentHistory />
          </div>
        )}

      {loading ? (
        <div className="text-brand-gray-500 dark:text-gray-400 animate-pulse bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">Loading your bookings...</div>
      ) : error ? (
        <div className="text-error dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-6 rounded-xl border border-red-200 dark:border-red-500/30">{error}</div>
      ) : bookings.length === 0 ? (
        <div className="text-brand-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">No past bookings yet.</div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b._id} className="bg-white dark:bg-gray-800 rounded-xl border border-brand-gray-200 dark:border-gray-700 p-6 shadow-card dark:shadow-dark-card hover:shadow-cardHover dark:hover:shadow-dark-glow transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-brand-gray-900 dark:text-white">#{b.bookingId}</span>
                    {b.status === "completed" && (
                      <span className="inline-flex items-center text-xs bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded border border-green-200 dark:border-green-500/30">
                        <FiCheck className="w-3 h-3 mr-1" /> Completed
                      </span>
                    )}
                    {b.status === "rejected" && (
                      <span className="inline-flex items-center text-xs bg-error/10 dark:bg-red-500/20 text-error dark:text-red-400 px-2 py-0.5 rounded border border-error/20 dark:border-red-500/30">
                        <FiX className="w-3 h-3 mr-1" /> Rejected
                      </span>
                    )}
                  </div>

                  <div className="font-medium text-brand-gray-900 dark:text-white">{b.service?.name}</div>
                  <div className="text-sm text-brand-gray-500 dark:text-gray-400 flex items-center">
                    <FiCalendar className="w-4 h-4 mr-1" />
                    {b.completedAt
                      ? new Date(b.completedAt).toLocaleString()
                      : b.scheduledAt
                      ? new Date(b.scheduledAt).toLocaleString()
                      : "—"}
                  </div>
                  {b.provider?.name && (
                    <div className="text-sm text-brand-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <span className="text-brand-gray-900 dark:text-gray-200">Provider: {b.provider.name}</span>
                      <button
                        onClick={async () => { setLoadingProfile(true); try { const { data } = await API.get(`/providers/${b.provider._id}/profile`); setProviderProfile(data); } catch { alert('Failed to load provider profile'); } finally { setLoadingProfile(false); } }}
                        className='text-brand-primary dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-500 text-xs underline transition-colors duration-300'>View Profile</button>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="font-bold text-brand-primary dark:text-blue-400 text-lg">
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
                      b.paymentStatus === 'paid' ? 'text-green-600 dark:text-green-400' : 
                      b.paymentStatus === 'billed' ? 'text-yellow-600 dark:text-yellow-400' : 
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      {b.paymentStatus === 'paid' ? '✓ Paid' : 
                       b.paymentStatus === 'billed' ? '📄 Awaiting Payment' : 
                       'Pending'}
                    </div>
                  )}
                  {b.providerAvgRating && (
                    <div className="text-xs text-brand-gray-500 dark:text-gray-400 inline-flex items-center gap-1 mt-1">
                      <FiStar className="w-3 h-3 text-warning dark:text-yellow-400 fill-current" />
                      {b.providerAvgRating.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                {canViewBill(b) && (
                  <button
                    onClick={() => handleViewBill(b)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-300 shadow-sm inline-flex items-center gap-2"
                  >
                    <FiFileText /> View Bill
                  </button>
                )}
                {canRate(b) ? (
                  <button
                    onClick={() => setRateFor(b)}
                    className="px-4 py-2 bg-brand-primary dark:bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-600 transition-all duration-300 shadow-sm dark:shadow-glow-blue"
                  >
                    Rate Provider
                  </button>
                ) : b.customerRating ? (
                  <div className="text-sm text-brand-gray-600 dark:text-gray-400 space-y-2">
                    {b.providerRating && (
                      <div className='text-xs text-brand-gray-500 dark:text-gray-400'>Provider rated you: {"⭐".repeat(b.providerRating)} ({b.providerRating}/5)</div>
                    )}
                    {b.reviews && b.reviews.filter(r=>r.direction==='provider_to_customer').map((r,i)=>(
                      r.comment ? <div key={i} className='text-xs text-brand-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-200 dark:border-gray-600'>"{r.comment}"</div> : null
                    ))}
                  </div>
                ) : b.providerRating ? (
                  <div className='text-xs text-brand-gray-500 dark:text-gray-400 space-y-1'>
                    <div>Provider rated you: {"⭐".repeat(b.providerRating)} ({b.providerRating}/5)</div>
                    {b.reviews && b.reviews.filter(r=>r.direction==='provider_to_customer').map((r,i)=>(
                      r.comment ? <div key={i} className='italic bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-200 dark:border-gray-600'>"{r.comment}"</div> : null
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bill View Modal */}
      {showBillModal && selectedBookingId && (
        <BillViewModal
          bookingId={selectedBookingId}
          onClose={() => {
            setShowBillModal(false);
            setSelectedBookingId(null);
          }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      <EnhancedRatingModal
        open={!!rateFor}
        onClose={() => setRateFor(null)}
        title="Rate your provider"
        submitting={submitting}
        userRole="customer"
        otherPartyName={rateFor?.provider?.name || 'Provider'}
        otherPartyRating={rateFor?.providerAvgRating || rateFor?.provider?.rating || null}
        otherPartyReviews={[]}
        showImageUpload={true}
        onSubmit={async ({ rating, comment, optionalMessage, workImages }) => {
          if (!rateFor) return;
            try {
              setSubmitting(true);
              await RatingsAPI.rateProvider({ 
                bookingId: rateFor._id, 
                rating, 
                comment, 
                optionalMessage, 
                workImages 
              });
              setRateFor(null);
              load();
            } catch (e) {
              alert("Failed to submit rating. Please try again.");
            } finally {
              setSubmitting(false);
            }
        }}
      />
      {providerProfile && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={()=>setProviderProfile(null)}>
          <div className='bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl' onClick={e=>e.stopPropagation()}>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-xl font-semibold'>{providerProfile.provider.name}</h3>
              <button onClick={()=>setProviderProfile(null)} className='text-sm text-brand-gray-500 hover:text-brand-gray-800'>Close</button>
            </div>
            <div className='flex items-center gap-4 mb-4'>
              <div className='px-3 py-2 bg-yellow-500/10 rounded-lg text-sm'>⭐ {providerProfile.provider.rating?.toFixed?.(1) || 0} ({providerProfile.provider.ratingCount || 0})</div>
              <div className='text-sm text-brand-gray-600'>Completed jobs: {providerProfile.stats.completedJobs}</div>
            </div>
            <h4 className='font-medium mb-2'>Recent Public Feedback</h4>
            <div className='space-y-4 max-h-72 overflow-auto pr-2'>
              {providerProfile.reviews.length === 0 && <p className='text-xs text-brand-gray-500'>No reviews yet.</p>}
              {providerProfile.reviews.map((r,i)=>(
                <ReviewCard key={i} review={{...r, customer: { name: 'Customer' }, provider: providerProfile.provider }} currentUserId={providerProfile.provider._id} viewMode="profile" />
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
