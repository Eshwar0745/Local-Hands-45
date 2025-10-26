import { Router } from 'express';
import ServiceCatalog from '../models/ServiceCatalog.js';

const router = Router();

// Get all active service catalogs
router.get('/', async (req, res) => {
  try {
    const services = await ServiceCatalog.find({ isActive: true });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching services', error: error.message });
  }
});

// Get service catalog details with questions
router.get('/:id', async (req, res) => {
  try {
    const service = await ServiceCatalog.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching service', error: error.message });
  }
});

export default router;
