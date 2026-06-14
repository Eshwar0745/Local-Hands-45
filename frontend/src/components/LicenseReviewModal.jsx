import React, { useState } from 'react';
import { FiX, FiCheck, FiXCircle, FiUser, FiMail, FiPhone, FiCalendar, FiImage } from 'react-icons/fi';
import API from '../services/api';
import VerificationStatusBadge from './VerificationStatusBadge';

export default function LicenseReviewModal({ provider, onClose, onAction }) {
  const [action, setAction] = useState(null); // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!provider) return null;

  const handleApprove = async () => {
    setProcessing(true);
    setError('');

    try {
      await API.post(`/admin/verifications/${provider._id}/approve`);
      onAction?.('approved', provider._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve provider');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      await API.post(`/admin/verifications/${provider._id}/reject`, {
        rejectionReason: rejectionReason.trim(),
      });
      onAction?.('rejected', provider._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject provider');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Review License Verification
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiX className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Provider Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Provider Information
              </h3>
              <VerificationStatusBadge status={provider.onboardingStatus} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <FiUser className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{provider.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FiMail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">{provider.email}</p>
                </div>
              </div>

              {provider.phone && (
                <div className="flex items-center gap-3">
                  <FiPhone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="font-medium text-gray-900 dark:text-white">{provider.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <FiCalendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Submitted</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {provider.verificationSubmittedAt 
                      ? new Date(provider.verificationSubmittedAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* License Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              License Details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">License Type</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {provider.licenseType?.replace('_', ' ') || 'N/A'}
                </p>
              </div>

              {provider.licenseNumber && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">License Number</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {provider.licenseNumber}
                  </p>
                </div>
              )}
            </div>

            {/* License Image */}
            {provider.licenseImage ? (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">License Image</p>
                <div className="relative group">
                  <img
                    src={provider.licenseImage}
                    alt="License"
                    className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => window.open(provider.licenseImage, '_blank')}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-opacity flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white font-medium bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                      Click to enlarge
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <FiImage className="w-5 h-5" />
                <span>No license image uploaded</span>
              </div>
            )}
          </div>

          {/* Past Work Proof (Before & After Images) */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Work Proof (Before / After)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before Image */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Before Image</p>
                {provider.workBeforeImage ? (
                  <div className="relative group">
                    <img
                      src={provider.workBeforeImage}
                      alt="Work Before"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => window.open(provider.workBeforeImage, '_blank')}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-opacity flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black bg-opacity-50 px-3 py-1.5 rounded-lg">
                        Click to enlarge
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 border border-dashed rounded-lg p-4 justify-center bg-gray-50 dark:bg-gray-900">
                    <FiImage className="w-5 h-5" />
                    <span>No "Before" image uploaded</span>
                  </div>
                )}
              </div>

              {/* After Image */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">After Image</p>
                {provider.workAfterImage ? (
                  <div className="relative group">
                    <img
                      src={provider.workAfterImage}
                      alt="Work After"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => window.open(provider.workAfterImage, '_blank')}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-opacity flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black bg-opacity-50 px-3 py-1.5 rounded-lg">
                        Click to enlarge
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 border border-dashed rounded-lg p-4 justify-center bg-gray-50 dark:bg-gray-900">
                    <FiImage className="w-5 h-5" />
                    <span>No "After" image uploaded</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rejection Reason (if applicable) */}
          {provider.onboardingStatus === 'rejected' && provider.rejectionReason && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                Previous Rejection Reason:
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {provider.rejectionReason}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Action Selection */}
          {provider.onboardingStatus === 'pending' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Action
              </h3>

              <div className="flex gap-4">
                <button
                  onClick={() => setAction('approve')}
                  className={`
                    flex-1 py-3 px-6 rounded-lg font-medium transition-all
                    ${action === 'approve'
                      ? 'bg-green-600 text-white shadow-lg scale-105'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                    }
                  `}
                >
                  <FiCheck className="w-5 h-5 inline mr-2" />
                  Approve
                </button>

                <button
                  onClick={() => setAction('reject')}
                  className={`
                    flex-1 py-3 px-6 rounded-lg font-medium transition-all
                    ${action === 'reject'
                      ? 'bg-red-600 text-white shadow-lg scale-105'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                    }
                  `}
                >
                  <FiXCircle className="w-5 h-5 inline mr-2" />
                  Reject
                </button>
              </div>

              {/* Rejection Reason Input */}
              {action === 'reject' && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a clear reason for rejection..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {provider.onboardingStatus === 'pending' && (
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={processing}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            {action === 'approve' && (
              <button
                onClick={handleApprove}
                disabled={processing}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <FiCheck className="w-5 h-5" />
                    Confirm Approval
                  </>
                )}
              </button>
            )}

            {action === 'reject' && (
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <FiXCircle className="w-5 h-5" />
                    Confirm Rejection
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
