import User from "../models/User.js";
import Review from "../models/Review.js";
import jwt from "jsonwebtoken";

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, alternatePhone, languages } = req.body;
    const update = {};
    
    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (address !== undefined) update.address = address;
    
    // ✅ NEW: Alternate phone for calling functionality
    if (alternatePhone !== undefined) update.alternatePhone = alternatePhone;
    
    // ✅ NEW: Languages for provider matching
    if (languages !== undefined) {
      if (Array.isArray(languages)) {
        update.languages = languages.filter(lang => lang && lang.trim());
      } else {
        return res.status(400).json({ message: 'Languages must be an array' });
      }
    }
    
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select("-password");
    res.json({ user });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    res.json({ user });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

export const getCustomerPublic = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("name phone address rating ratingCount role");
    if (!user) return res.status(404).json({ message: "Not found" });
    const reviews = await Review.find({ customer: id, direction: 'provider_to_customer', isPublic: true })
      .sort('-createdAt')
      .limit(10)
      .select('rating comment optionalMessage workImages createdAt direction provider customer');
    const completedJobs = await Review.countDocuments({ customer: id, direction: 'provider_to_customer' });
    res.json({ user, stats: { completedJobs }, reviews });
  } catch (e) { res.status(500).json({ message: e.message }); }
};
