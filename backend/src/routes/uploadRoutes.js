import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer to use memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Upload license image for providers
router.post(
  '/license',
  requireAuth,
  requireRole('provider'),
  upload.single('license'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Upload to Cloudinary using upload_stream
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'localhands/licenses',
            resource_type: 'image',
            public_id: `license_${req.user.id}_${Date.now()}`,
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' }, // Limit max size
              { quality: 'auto:good' }, // Auto quality optimization
              { fetch_format: 'auto' }, // Auto format (WebP if supported)
            ],
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        // Convert buffer to stream and pipe to Cloudinary
        uploadStream.end(req.file.buffer);
      });

      res.json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        message: 'Image uploaded successfully',
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        message: 'Upload failed', 
        error: error.message 
      });
    }
  }
);

// Upload work image for providers (before/after proof)
router.post(
  '/work-image',
  requireAuth,
  requireRole('provider'),
  upload.single('work_image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Upload to Cloudinary using upload_stream
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'localhands/work_images',
            resource_type: 'image',
            public_id: `work_${req.user.id}_${Date.now()}`,
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' }, // Limit max size
              { quality: 'auto:good' }, // Auto quality optimization
              { fetch_format: 'auto' }, // Auto format (WebP if supported)
            ],
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        // Convert buffer to stream and pipe to Cloudinary
        uploadStream.end(req.file.buffer);
      });

      res.json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        message: 'Work image uploaded successfully',
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        message: 'Upload failed', 
        error: error.message 
      });
    }
  }
);

// Delete license image (optional - for cleanup)
router.delete(
  '/license/:publicId',
  requireAuth,
  requireRole('provider'),
  async (req, res) => {
    try {
      const { publicId } = req.params;
      
      // Only allow deletion of own images
      if (!publicId.includes(req.user.id)) {
        return res.status(403).json({ message: 'Unauthorized to delete this image' });
      }

      await cloudinary.uploader.destroy(publicId);
      
      res.json({ 
        success: true, 
        message: 'Image deleted successfully' 
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ 
        message: 'Delete failed', 
        error: error.message 
      });
    }
  }
);

export default router;
