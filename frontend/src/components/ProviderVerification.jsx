import React, { useState, useEffect } from 'react';
import { FiUpload, FiCheck, FiX, FiAlertCircle, FiImage } from 'react-icons/fi';
import API from '../services/api';
import VerificationStatusBadge from './VerificationStatusBadge';

export default function ProviderVerification({ user, onStatusChange }) {
  const [status, setStatus] = useState(user?.onboardingStatus || 'not_submitted');
  const [licenseType, setLicenseType] = useState('aadhar');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseImage, setLicenseImage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationData, setVerificationData] = useState(null);

  // ✅ New work proof states
  const [workBeforeImage, setWorkBeforeImage] = useState('');
  const [workBeforeFile, setWorkBeforeFile] = useState(null);
  const [workBeforePreview, setWorkBeforePreview] = useState(null);
  const [workAfterImage, setWorkAfterImage] = useState('');
  const [workAfterFile, setWorkAfterFile] = useState(null);
  const [workAfterPreview, setWorkAfterPreview] = useState(null);

  // Fetch current verification status
  const fetchStatus = async () => {
    try {
      const { data } = await API.get('/providers/verification-status');
      setVerificationData(data);
      const newStatus = data.onboardingStatus || 'not_submitted';
      
      // ✅ If status changed, notify parent to refresh AuthContext
      if (newStatus !== status && onStatusChange) {
        onStatusChange(newStatus);
      }
      
      setStatus(newStatus);
      if (data.licenseImage) {
        setLicenseImage(data.licenseImage);
        setImagePreview(data.licenseImage);
      }
      if (data.licenseType) setLicenseType(data.licenseType);
      if (data.licenseNumber) setLicenseNumber(data.licenseNumber);
      if (data.workBeforeImage) {
        setWorkBeforeImage(data.workBeforeImage);
        setWorkBeforePreview(data.workBeforeImage);
      }
      if (data.workAfterImage) {
        setWorkAfterImage(data.workAfterImage);
        setWorkAfterPreview(data.workAfterImage);
      }
    } catch (err) {
      console.error('Failed to fetch verification status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Handle file selection for license
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setImageFile(file);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // ✅ Handle file selection for work images
  const handleWorkFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setError('');
    const reader = new FileReader();

    if (type === 'before') {
      setWorkBeforeFile(file);
      reader.onloadend = () => {
        setWorkBeforePreview(reader.result);
      };
    } else {
      setWorkAfterFile(file);
      reader.onloadend = () => {
        setWorkAfterPreview(reader.result);
      };
    }
    reader.readAsDataURL(file);
  };

  // Upload to backend (which uploads to Cloudinary)
  const uploadImage = async () => {
    if (!imageFile) {
      setError('Please select an image first');
      return null;
    }

    setUploading(true);
    setError('');

    try {
      // Upload via backend (secure and recommended)
      const formData = new FormData();
      formData.append('license', imageFile);
      
      const { data } = await API.post('/upload/license', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return data.url;

    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Upload failed';
      setError('Failed to upload image: ' + errorMsg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // ✅ Upload work image to backend (which uploads to Cloudinary)
  const uploadWorkImage = async (file) => {
    if (!file) {
      setError('Please select an image first');
      return null;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('work_image', file);
      
      const { data } = await API.post('/upload/work-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return data.url;

    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Upload failed';
      setError('Failed to upload work image: ' + errorMsg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Submit verification
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate
    if (!licenseType) {
      setError('Please select license type');
      return;
    }

    if (!licenseImage && !imageFile) {
      setError('Please upload your license image');
      return;
    }

    // Validate work proofs are provided
    if (!workBeforeImage && !workBeforeFile) {
      setError('Please upload your past work "Before" image');
      return;
    }

    if (!workAfterImage && !workAfterFile) {
      setError('Please upload your past work "After" image');
      return;
    }

    setSubmitting(true);

    try {
      // Upload image if new file selected
      let imageUrl = licenseImage;
      if (imageFile) {
        imageUrl = await uploadImage();
        if (!imageUrl) {
          setSubmitting(false);
          return;
        }
      }

      // Upload before work image if new file selected
      let beforeUrl = workBeforeImage;
      if (workBeforeFile) {
        beforeUrl = await uploadWorkImage(workBeforeFile);
        if (!beforeUrl) {
          setSubmitting(false);
          return;
        }
      }

      // Upload after work image if new file selected
      let afterUrl = workAfterImage;
      if (workAfterFile) {
        afterUrl = await uploadWorkImage(workAfterFile);
        if (!afterUrl) {
          setSubmitting(false);
          return;
        }
      }

      // Submit verification
      const { data } = await API.post('/providers/submit-verification', {
        licenseImage: imageUrl,
        licenseType,
        licenseNumber: licenseNumber.trim() || undefined,
        workBeforeImage: beforeUrl,
        workAfterImage: afterUrl,
      });

      setSuccess('License and work proofs submitted successfully! Waiting for admin approval.');
      setStatus('pending');
      setVerificationData(data.user);
      setImageFile(null);
      setWorkBeforeFile(null);
      setWorkAfterFile(null);
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange('pending');
      }

      // Refresh status after 2 seconds
      setTimeout(fetchStatus, 2000);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  // Render different views based on status
  const renderContent = () => {
    switch (status) {
      case 'approved':
        return (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <FiCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Verification Approved!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your license and work proofs have been verified. You can now go live and start accepting bookings.
            </p>
            <div className="mb-6 flex justify-center">
              <VerificationStatusBadge status="approved" size="lg" />
            </div>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {verificationData?.licenseImage && (
                <div className="flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Government ID</p>
                  <img
                    src={verificationData.licenseImage}
                    alt="Verified License"
                    className="h-40 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(verificationData.licenseImage, '_blank')}
                  />
                </div>
              )}
              {verificationData?.workBeforeImage && (
                <div className="flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Work Proof: Before</p>
                  <img
                    src={verificationData.workBeforeImage}
                    alt="Work Before"
                    className="h-40 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(verificationData.workBeforeImage, '_blank')}
                  />
                </div>
              )}
              {verificationData?.workAfterImage && (
                <div className="flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Work Proof: After</p>
                  <img
                    src={verificationData.workAfterImage}
                    alt="Work After"
                    className="h-40 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(verificationData.workAfterImage, '_blank')}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'pending':
        return (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-4">
              <FiAlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Verification Pending
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your license and work proofs are under review. Admin will approve them shortly.
            </p>
            <div className="mb-4 flex justify-center">
              <VerificationStatusBadge status="pending" size="lg" />
            </div>
            
            {/* Refresh Status Button */}
            <button
              onClick={fetchStatus}
              disabled={uploading}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {uploading ? 'Checking...' : 'Check Status'}
            </button>
            
            {verificationData?.verificationSubmittedAt && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Submitted on {new Date(verificationData.verificationSubmittedAt).toLocaleString()}
              </p>
            )}

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {verificationData?.licenseImage && (
                <div className="flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Submitted ID</p>
                  <img
                    src={verificationData.licenseImage}
                    alt="Submitted License"
                    className="h-40 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(verificationData.licenseImage, '_blank')}
                  />
                </div>
              )}
              {verificationData?.workBeforeImage && (
                <div className="flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Submitted Proof: Before</p>
                  <img
                    src={verificationData.workBeforeImage}
                    alt="Submitted Before"
                    className="h-40 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(verificationData.workBeforeImage, '_blank')}
                  />
                </div>
              )}
              {verificationData?.workAfterImage && (
                <div className="flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Submitted Proof: After</p>
                  <img
                    src={verificationData.workAfterImage}
                    alt="Submitted After"
                    className="h-40 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(verificationData.workAfterImage, '_blank')}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'rejected':
        return (
          <div>
            <div className="text-center py-8 mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <FiX className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Verification Rejected
              </h3>
              {verificationData?.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md mx-auto mb-4">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Reason: {verificationData.rejectionReason}
                  </p>
                </div>
              )}
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Please upload a valid license and correct work proof images and try again.
              </p>
            </div>
            
            {/* Show form to resubmit */}
            {renderForm()}
          </div>
        );

      default:
        return renderForm();
    }
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          License Type *
        </label>
        <select
          value={licenseType}
          onChange={(e) => setLicenseType(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="aadhar">Aadhar Card</option>
          <option value="pan">PAN Card</option>
          <option value="driving_license">Driving License</option>
          <option value="other">Other Government ID</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          License Number (Optional)
        </label>
        <input
          type="text"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          placeholder="e.g., 1234-5678-9012"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Government ID Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload License Image *
          </label>
          <div className="mt-2">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="License preview"
                    className="max-h-40 rounded-lg"
                  />
                ) : (
                  <>
                    <FiImage className="w-12 h-12 mb-3 text-gray-400" />
                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400 text-center px-2">
                      <span className="font-semibold">Click to upload ID</span>
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      PNG, JPG, JPEG (MAX. 5MB)
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>

        {/* Work Before Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Work Image (Before) *
          </label>
          <div className="mt-2">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {workBeforePreview ? (
                  <img
                    src={workBeforePreview}
                    alt="Work Before preview"
                    className="max-h-40 rounded-lg"
                  />
                ) : (
                  <>
                    <FiImage className="w-12 h-12 mb-3 text-gray-400" />
                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400 text-center px-2">
                      <span className="font-semibold">Upload "Before" Work Image</span>
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      PNG, JPG, JPEG (MAX. 5MB)
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleWorkFileChange(e, 'before')}
              />
            </label>
          </div>
        </div>

        {/* Work After Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Work Image (After) *
          </label>
          <div className="mt-2">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {workAfterPreview ? (
                  <img
                    src={workAfterPreview}
                    alt="Work After preview"
                    className="max-h-40 rounded-lg"
                  />
                ) : (
                  <>
                    <FiImage className="w-12 h-12 mb-3 text-gray-400" />
                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400 text-center px-2">
                      <span className="font-semibold">Upload "After" Work Image</span>
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      PNG, JPG, JPEG (MAX. 5MB)
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleWorkFileChange(e, 'after')}
              />
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg flex items-start gap-2">
          <FiX className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 px-4 py-3 rounded-lg flex items-start gap-2">
          <FiCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || uploading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {(submitting || uploading) ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {uploading ? 'Uploading...' : 'Submitting...'}
          </>
        ) : (
          <>
            <FiUpload className="w-5 h-5" />
            {status === 'rejected' ? 'Resubmit Verification' : 'Submit for Verification'}
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Your verification details will be reviewed by admin. You'll be notified once approved.
      </p>
    </form>
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Provider Verification
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Submit your government ID and before/after past work images for verification to start accepting bookings
        </p>
      </div>

      {renderContent()}
    </div>
  );
}
