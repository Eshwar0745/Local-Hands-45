import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import crypto from 'crypto';
import { sendMail, buildOtpEmail } from '../utils/mailer.js';
import { generateOTP, sendWhatsAppOTP, sendWelcomeMessage } from '../services/twilioService.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

// 🔹 Register with email/password
export const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already in use" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, phone });

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        phone: user.phone || "",
        address: user.address || "",
        isAvailable: user.isAvailable || false,
        rating: user.rating || 0,
        completedJobs: user.completedJobs || 0
      },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// 🔹 Login with email/password
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.password)
      return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        phone: user.phone || "",
        address: user.address || "",
        isAvailable: user.isAvailable || false,
        rating: user.rating || 0,
        completedJobs: user.completedJobs || 0
      },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// 🔹 Login/Register with Google ID token
export const googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "Missing idToken" });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      // First-time Google user → no role yet
      user = await User.create({
        name,
        email,
        googleId,
        role: null,
      });
    } else if (!user.googleId) {
      // Existing user, link Google
      user.googleId = googleId;
      await user.save();
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        phone: user.phone || "",
        address: user.address || "",
        isAvailable: user.isAvailable || false,
        rating: user.rating || 0,
        completedJobs: user.completedJobs || 0
      },
    });
  } catch (e) {
    res.status(401).json({ message: "Google auth failed", error: e.message });
  }
};

// 🔹 Set role after first login
export const setRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["customer", "provider", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { role },
      { new: true }
    ).select("-password");

    const token = signToken(user);
    const needsServiceSelection = role === 'provider';
  res.json({ token, user: { ...user.toObject(), needsServiceSelection, isAvailable: user.isAvailable || false, rating: user.rating || 0, completedJobs: user.completedJobs || 0 } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// 🔹 Get current user profile
export const me = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        phone: user.phone || "",
        address: user.address || "",
        isAvailable: user.isAvailable || false,
        rating: user.rating || 0,
        completedJobs: user.completedJobs || 0
      },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// 🔹 Change Password
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide both old and new passwords" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has a password (not Google-only)
    if (!user.password) {
      return res.status(400).json({ 
        message: "Cannot change password for Google sign-in accounts. Please use Google to manage your password." 
      });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await user.save();

    res.json({ 
      message: "Password updated successfully",
      success: true 
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// 🔹 Request password reset OTP
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if(!email) return res.status(400).json({ message: 'Email required' });
    const user = await User.findOne({ email });
    if(!user) return res.status(200).json({ message: 'If the email exists, an OTP was sent' }); // silent
    const otp = ('' + Math.floor(100000 + Math.random()*900000));
    user.passwordResetOtp = otp;
    user.passwordResetExpires = new Date(Date.now() + 10*60*1000); // 10 mins
    await user.save();
    const { subject, html, text } = buildOtpEmail(otp);
    await sendMail({ to: email, subject, html, text });
    res.json({ message: 'OTP sent if account exists' });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

// 🔹 Verify OTP (optional step if you want a dedicated endpoint)
export const verifyPasswordResetOtp = async (req,res) => {
  try {
    const { email, otp } = req.body;
    if(!email || !otp) return res.status(400).json({ message: 'Email & otp required' });
    const user = await User.findOne({ email, passwordResetOtp: otp });
    if(!user) return res.status(400).json({ message: 'Invalid OTP' });
    if(!user.passwordResetExpires || user.passwordResetExpires < new Date()) return res.status(400).json({ message: 'OTP expired' });
    res.json({ valid: true, message: 'OTP valid' });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

// 🔹 Reset password using OTP
export const resetPasswordWithOtp = async (req,res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if(!email || !otp || !newPassword) return res.status(400).json({ message: 'Email, otp & newPassword required' });
    if(newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 chars' });
    const user = await User.findOne({ email, passwordResetOtp: otp });
    if(!user) return res.status(400).json({ message: 'Invalid OTP' });
    if(!user.passwordResetExpires || user.passwordResetExpires < new Date()) return res.status(400).json({ message: 'OTP expired' });
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetOtp = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

// 🔹 WhatsApp Authentication - Send OTP
export const sendWhatsAppOtp = async (req, res) => {
  try {
    const { phone, name, isLogin } = req.body;
    
    // Validate phone number
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Format phone number (ensure it has + prefix)
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // Check if user exists
    const existingUser = await User.findOne({ phone: formattedPhone });

    if (isLogin) {
      // LOGIN: User must exist
      if (!existingUser) {
        return res.status(404).json({ message: 'No account found with this phone number. Please register first.' });
      }
    } else {
      // REGISTER: User must NOT exist
      if (existingUser) {
        return res.status(400).json({ message: 'Phone number already registered. Please login instead.' });
      }
      
      // Name is required for registration
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: 'Name is required for registration' });
      }
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (isLogin) {
      // Update existing user with OTP
      existingUser.phoneOtp = otp;
      existingUser.phoneOtpExpires = otpExpires;
      await existingUser.save();
    } else {
      // Create new user with pending verification
      await User.create({
        name: name.trim(),
        phone: formattedPhone,
        phoneOtp: otp,
        phoneOtpExpires: otpExpires,
        verified: false,
        otpVerified: false
      });
    }

    // Send OTP via WhatsApp (with graceful fallback for development)
    try {
      await sendWhatsAppOTP(formattedPhone, otp);
      console.log(`✅ WhatsApp OTP sent successfully to ${formattedPhone}`);
    } catch (whatsappError) {
      console.warn('⚠️  WhatsApp OTP failed (continuing anyway):', whatsappError.message);
      console.log(`📱 Development Mode: OTP for ${formattedPhone} is: ${otp}`);
      // Continue execution - don't throw error in development
    }

    res.json({
      success: true,
      message: `OTP sent to ${formattedPhone} via WhatsApp`,
      expiresIn: '10 minutes',
      // Include OTP in development mode ONLY
      ...(process.env.NODE_ENV !== 'production' && { developmentOtp: otp })
    });

  } catch (error) {
    console.error('Error sending WhatsApp OTP:', error);
    res.status(500).json({ 
      message: 'Failed to send OTP', 
      error: error.message 
    });
  }
};

// 🔹 WhatsApp Authentication - Verify OTP
export const verifyWhatsAppOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }

    // Format phone number
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // Find user with matching phone and OTP
    const user = await User.findOne({ 
      phone: formattedPhone,
      phoneOtp: otp 
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check if OTP is expired
    if (!user.phoneOtpExpires || user.phoneOtpExpires < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // OTP is valid - clear it and mark user as verified
    user.phoneOtp = undefined;
    user.phoneOtpExpires = undefined;
    user.verified = true;
    user.otpVerified = true;
    
    // If no role set yet, they need to select role
    const needsRoleSelection = !user.role;
    
    await user.save();

    // Send welcome message for new users
    if (needsRoleSelection) {
      sendWelcomeMessage(formattedPhone, user.name).catch(err => 
        console.error('Failed to send welcome message:', err)
      );
    }

    // Generate JWT token
    const token = signToken(user);

    res.json({
      success: true,
      token,
      needsRoleSelection,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email || '',
        role: user.role,
        verified: user.verified,
        address: user.address || '',
        isAvailable: user.isAvailable || false,
        rating: user.rating || 0,
        completedJobs: user.completedJobs || 0,
        onboardingStatus: user.onboardingStatus,
        licenseImage: user.licenseImage,
        licenseType: user.licenseType,
        licenseNumber: user.licenseNumber
      }
    });

  } catch (error) {
    console.error('Error verifying WhatsApp OTP:', error);
    res.status(500).json({ 
      message: 'Failed to verify OTP', 
      error: error.message 
    });
  }
};

// 🔹 Resend WhatsApp OTP
export const resendWhatsAppOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Format phone number
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // Find user
    const user = await User.findOne({ phone: formattedPhone });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this phone number' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.phoneOtp = otp;
    user.phoneOtpExpires = otpExpires;
    await user.save();

    // Send OTP via WhatsApp (with graceful fallback for development)
    try {
      await sendWhatsAppOTP(formattedPhone, otp);
      console.log(`✅ WhatsApp OTP resent successfully to ${formattedPhone}`);
    } catch (whatsappError) {
      console.warn('⚠️  WhatsApp OTP failed (continuing anyway):', whatsappError.message);
      console.log(`📱 Development Mode: OTP for ${formattedPhone} is: ${otp}`);
      // Continue execution - don't throw error in development
    }

    res.json({
      success: true,
      message: `New OTP sent to ${formattedPhone} via WhatsApp`,
      expiresIn: '10 minutes',
      // Include OTP in development mode ONLY
      ...(process.env.NODE_ENV !== 'production' && { developmentOtp: otp })
    });

  } catch (error) {
    console.error('Error resending WhatsApp OTP:', error);
    res.status(500).json({ 
      message: 'Failed to resend OTP', 
      error: error.message 
    });
  }
};
