import User from "../models/User.js";
import Notification from "../models/Notification.js";

// ✅ Get all pending provider verifications
export const getPendingVerifications = async (req, res) => {
  try {
    const pendingProviders = await User.find({
      role: 'provider',
      onboardingStatus: 'pending'
    })
      .select('name email phone licenseImage licenseType licenseNumber onboardingStatus verificationSubmittedAt createdAt workBeforeImage workAfterImage')
      .sort('-verificationSubmittedAt');
    
    res.json({
      count: pendingProviders.length,
      providers: pendingProviders
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ✅ Get all approved providers
export const getApprovedProviders = async (req, res) => {
  try {
    const approvedProviders = await User.find({
      role: 'provider',
      onboardingStatus: 'approved'
    })
      .select('name email phone licenseImage licenseType licenseNumber onboardingStatus rating ratingCount completedJobs isAvailable createdAt verificationReviewedAt verificationSubmittedAt workBeforeImage workAfterImage')
      .sort('-verificationReviewedAt');
    
    res.json({
      count: approvedProviders.length,
      providers: approvedProviders
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ✅ Get all rejected providers
export const getRejectedProviders = async (req, res) => {
  try {
    const rejectedProviders = await User.find({
      role: 'provider',
      onboardingStatus: 'rejected'
    })
      .select('name email phone licenseImage licenseType licenseNumber onboardingStatus rejectionReason verificationReviewedAt workBeforeImage workAfterImage')
      .sort('-verificationReviewedAt');
    
    res.json({
      count: rejectedProviders.length,
      providers: rejectedProviders
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ✅ Get provider verification details
export const getProviderVerificationDetails = async (req, res) => {
  try {
    const { providerId } = req.params;
    
    const provider = await User.findById(providerId)
      .select('-password -passwordResetOtp')
      .populate('verificationReviewedBy', 'name email');
    
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    res.json({ provider });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ✅ Approve provider verification
export const approveProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    
    const provider = await User.findById(providerId);
    
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    if (provider.role !== 'provider') {
      return res.status(400).json({ message: 'User is not a provider' });
    }
    
    if (provider.onboardingStatus === 'approved') {
      return res.status(400).json({ message: 'Provider already approved' });
    }
    
    provider.onboardingStatus = 'approved';
    provider.verificationReviewedAt = new Date();
    provider.verificationReviewedBy = req.userId;
    provider.rejectionReason = undefined; // Clear rejection reason if any
    
    await provider.save();
    
    // Create notification for provider
    await Notification.create({
      user: provider._id,
      fromUser: req.userId,
      type: 'verification_approved',
      message: 'Congratulations! Your license has been approved. You can now go live and accept bookings.'
    });
    
    res.json({
      message: 'Provider approved successfully',
      provider: {
        id: provider._id,
        name: provider.name,
        email: provider.email,
        onboardingStatus: provider.onboardingStatus
      }
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ✅ Reject provider verification
export const rejectProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    const provider = await User.findById(providerId);
    
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    if (provider.role !== 'provider') {
      return res.status(400).json({ message: 'User is not a provider' });
    }
    
    provider.onboardingStatus = 'rejected';
    provider.verificationReviewedAt = new Date();
    provider.verificationReviewedBy = req.userId;
    provider.rejectionReason = rejectionReason;
    provider.isAvailable = false; // Force offline if they were somehow live
    
    await provider.save();
    
    // Create notification for provider
    await Notification.create({
      user: provider._id,
      fromUser: req.userId,
      type: 'verification_rejected',
      message: `Your license verification was rejected. Reason: ${rejectionReason}. Please resubmit with correct documents.`
    });
    
    res.json({
      message: 'Provider rejected',
      provider: {
        id: provider._id,
        name: provider.name,
        email: provider.email,
        onboardingStatus: provider.onboardingStatus,
        rejectionReason: provider.rejectionReason
      }
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ✅ Get verification statistics
export const getVerificationStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      { $match: { role: 'provider' } },
      {
        $group: {
          _id: '$onboardingStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const formattedStats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };
    
    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
    });
    
    res.json({ stats: formattedStats });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
