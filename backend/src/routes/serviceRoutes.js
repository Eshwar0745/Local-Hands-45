import { Router } from "express";
import Service from "../models/Service.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = Router();

// List services (basic filters: category, provider)
// Public list of active services (excludes ones whose template is inactive)
router.get("/", async (req, res) => {
  try {
    const { category, provider } = req.query;
    const q = {};
    if (category) q.category = category;
    if (provider) q.provider = provider;
    const servicesRaw = await Service.find(q)
      .limit(200)
      .sort("name")
      .populate('provider','name rating ratingCount')
      .populate('template','active');
    // Filter out services whose template exists but is inactive
    const services = servicesRaw.filter(s => !s.template || s.template.active !== false);
    res.json({ services });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// List only current provider's services
router.get("/mine", requireAuth, requireRole("provider"), async (req, res) => {
  try {
    const servicesRaw = await Service.find({ provider: req.userId }).populate('template','active').sort("name");
    const services = servicesRaw.filter(s=>!s.template || s.template.active !== false); // hide inactive template services
    const hidden = servicesRaw.length - services.length;
    res.json({ services, hidden });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Create service (provider only) - disabled after introduction of admin templates
router.post("/", requireAuth, requireRole("provider"), (req, res) => {
  return res.status(410).json({ message: "Direct service creation disabled. Use /providers/select-services with templateIds." });
});

// Update service (owner provider) - restrict template derived services
router.patch("/:id", requireAuth, requireRole("provider"), async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findOne({ _id: id, provider: req.userId });
    if (!service) return res.status(404).json({ message: "Not found" });
    if (service.template) {
      // only allow duration (optional) for templated services
      const { duration } = req.body;
      if (duration !== undefined) service.duration = duration;
      await service.save();
      return res.json({ service });
    }
    // legacy (non-template) services: allow limited edits but lock price if lockedPrice
    const fields = ["name","category","price","duration"]; 
    fields.forEach(f=>{
      if (req.body[f] !== undefined) {
        if (f === 'price' && service.lockedPrice) return; // ignore price update
        service[f] = req.body[f];
      }
    });
    await service.save();
    res.json({ service });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Delete service (owner provider) - allow deletion of templated selection (they can re-add), block if service is in active bookings (future enhancement)
router.delete("/:id", requireAuth, requireRole("provider"), async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findOne({ _id: id, provider: req.userId });
    if (!service) return res.status(404).json({ message: "Not found" });
    await service.deleteOne();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
