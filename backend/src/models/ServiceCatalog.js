import mongoose from 'mongoose';

const serviceCatalogSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true 
  },
  category: { 
    type: String, 
    required: true 
  },
  description: String,
  icon: String,
  
  // Service-specific questionnaire
  questions: [{
    id: { type: String, required: true },
    question: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['radio', 'checkbox', 'number', 'text', 'select'],
      required: true 
    },
    options: [String], // for radio/checkbox/select
    min: Number, // for number type
    max: Number,
    required: { type: Boolean, default: true },
    placeholder: String
  }],
  
  // Pricing configuration
  pricing: {
    basePrice: { type: Number, required: true },
    visitCharge: { type: Number, default: 99 },
    includedTime: { type: Number, default: 60 }, // minutes
    
    // Dynamic pricing based on answers
    optionPrices: {
      type: Map,
      of: Number
    },
    
    quantityMultiplier: { type: Boolean, default: false },
    complexityMultipliers: {
      type: Map,
      of: Number
    }
  },
  
  isActive: { type: Boolean, default: true }
  
}, { timestamps: true });

export default mongoose.model('ServiceCatalog', serviceCatalogSchema);
