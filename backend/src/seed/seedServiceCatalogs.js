import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ServiceCatalog from '../models/ServiceCatalog.js';

dotenv.config();

const catalogs = [
  {
    name: 'AC Repair & Installation',
    category: 'Technology & Appliances',
    description: 'Professional AC repair, servicing, and installation',
    icon: '❄️',
    questions: [
      { id: 'acType', question: 'What type of AC?', type: 'radio', options: ['Split AC','Window AC','Cassette AC','Central AC'], required: true },
      { id: 'issues', question: 'Select issues (if any)', type: 'checkbox', options: ['Not cooling properly','Water leakage','Strange noise','Bad smell','Gas refilling','Complete servicing','Installation / Re-location'], required: false },
      { id: 'numberOfUnits', question: 'How many units?', type: 'number', min: 1, max: 10, required: true },
      { id: 'notes', question: 'Any additional info?', type: 'text', required: false, placeholder: 'E.g., brand/model, floor access, parking' }
    ],
    pricing: {
      basePrice: 299,
      visitCharge: 99,
      includedTime: 60,
      optionPrices: {
        'Split AC': 0,
        'Window AC': -50,
        'Cassette AC': 100,
        'Central AC': 300,
        'Not cooling properly': 200,
        'Water leakage': 150,
        'Strange noise': 150,
        'Bad smell': 100,
        'Gas refilling': 1200,
        'Complete servicing': 499,
        'Installation / Re-location': 1500
      },
      quantityMultiplier: true
    }
  },
  {
    name: 'Carpentry',
    category: 'Home Services',
    description: 'Furniture repair, installation, and custom work',
    icon: '🔨',
    questions: [
      { id: 'workType', question: 'What do you need?', type: 'select', options: ['Furniture repair','Furniture assembly','Door/window fix','Custom work'], required: true },
      { id: 'material', question: 'Material', type: 'radio', options: ['Plywood','Solid wood','MDF/Particle board','Metal'], required: false },
      { id: 'quantity', question: 'How many items?', type: 'number', min: 1, max: 50, required: true },
      { id: 'complexity', question: 'Complexity', type: 'radio', options: ['Basic','Standard','Complex'], required: true },
      { id: 'notes', question: 'Details', type: 'text', required: false }
    ],
    pricing: {
      basePrice: 199,
      visitCharge: 89,
      optionPrices: {
        'Furniture repair': 200,
        'Furniture assembly': 150,
        'Door/window fix': 180,
        'Custom work': 300,
        'Plywood': 0,
        'Solid wood': 120,
        'MDF/Particle board': -20,
        'Metal': 150
      },
      quantityMultiplier: true,
      complexityMultipliers: {
        'Basic': 1.0,
        'Standard': 1.4,
        'Complex': 2.0
      }
    }
  },
  {
    name: 'Electrical',
    category: 'Home Services',
    description: 'Wiring, repairs, installations',
    icon: '⚡',
    questions: [
      { id: 'jobType', question: 'Type of job', type: 'select', options: ['New point','Repair','Appliance install'], required: true },
      { id: 'numberOfPoints', question: 'How many points?', type: 'number', min: 1, max: 50, required: true },
      { id: 'urgency', question: 'Urgency', type: 'radio', options: ['Normal','Emergency'], required: true },
      { id: 'notes', question: 'Details', type: 'text', required: false }
    ],
    pricing: {
      basePrice: 149,
      visitCharge: 69,
      optionPrices: {
        'New point': 120,
        'Repair': 80,
        'Appliance install': 150,
        'Emergency': 200,
        'Normal': 0
      },
      quantityMultiplier: true
    }
  },
  {
    name: 'Plumbing',
    category: 'Home Services',
    description: 'Leaks, clogs, installations',
    icon: '🚰',
    questions: [
      { id: 'issue', question: 'Issue type', type: 'select', options: ['Leak','Clog','Fitting install','Other'], required: true },
      { id: 'severity', question: 'Severity', type: 'radio', options: ['Low','Medium','High'], required: true },
      { id: 'numberOfFixtures', question: 'Affected fixtures', type: 'number', min: 1, max: 20, required: true },
      { id: 'notes', question: 'Details', type: 'text', required: false }
    ],
    pricing: {
      basePrice: 129,
      visitCharge: 79,
      optionPrices: {
        'Leak': 120,
        'Clog': 150,
        'Fitting install': 200,
        'Low': 0,
        'Medium': 100,
        'High': 250
      },
      quantityMultiplier: true
    }
  },
  {
    name: 'House Cleaning',
    category: 'Home Services',
    description: 'Basic to deep cleaning of your home',
    icon: '🧹',
    questions: [
      { id: 'cleanType', question: 'Cleaning type', type: 'radio', options: ['Basic','Deep','Move-in/out'], required: true },
      { id: 'bhk', question: 'BHK size', type: 'select', options: ['1 BHK','2 BHK','3 BHK','4+ BHK'], required: true },
      { id: 'addOns', question: 'Add-ons', type: 'checkbox', options: ['Fridge','Oven','Balcony','Windows'], required: false }
    ],
    pricing: {
      basePrice: 79,
      visitCharge: 49,
      optionPrices: {
        'Basic': 0,
        'Deep': 300,
        'Move-in/out': 500,
        '1 BHK': 200,
        '2 BHK': 400,
        '3 BHK': 600,
        '4+ BHK': 900,
        'Fridge': 99,
        'Oven': 99,
        'Balcony': 69,
        'Windows': 99
      }
    }
  },
  {
    name: 'Painting',
    category: 'Home Services',
    description: 'Interior/exterior painting',
    icon: '🎨',
    questions: [
      { id: 'area', question: 'Approx area (sq.ft.)', type: 'number', min: 50, max: 5000, required: true },
      { id: 'finish', question: 'Finish', type: 'radio', options: ['Basic','Premium','Luxury'], required: true }
    ],
    pricing: {
      basePrice: 8, // per sq.ft base
      visitCharge: 99,
      optionPrices: {
        'Basic': 0,
        'Premium': 5,
        'Luxury': 12
      }
    }
  },
  {
    name: 'Catering',
    category: 'Events & Catering',
    description: 'Veg/non-veg catering for events',
    icon: '🍽️',
    questions: [
      { id: 'cuisine', question: 'Cuisine type', type: 'select', options: ['Veg','Non-veg','Mixed'], required: true },
      { id: 'guests', question: 'Number of guests', type: 'number', min: 10, max: 2000, required: true },
      { id: 'service', question: 'Service type', type: 'radio', options: ['Buffet','Plated','Live counters'], required: true }
    ],
    pricing: {
      basePrice: 200, // per guest base
      visitCharge: 0,
      optionPrices: {
        'Veg': 0,
        'Non-veg': 120,
        'Mixed': 60,
        'Buffet': 50,
        'Plated': 100,
        'Live counters': 150
      },
      quantityMultiplier: true // multiply by guests
    }
  },
  {
    name: 'Photography',
    category: 'Events & Catering',
    description: 'Event and portrait photography',
    icon: '📷',
    questions: [
      { id: 'shootType', question: 'Shoot type', type: 'select', options: ['Event','Pre-wedding','Portrait','Product'], required: true },
      { id: 'hours', question: 'Hours required', type: 'number', min: 1, max: 24, required: true },
      { id: 'album', question: 'Need printed album?', type: 'radio', options: ['No','Yes'], required: true }
    ],
    pricing: {
      basePrice: 150, // per hour
      visitCharge: 0,
      optionPrices: {
        'Event': 100,
        'Pre-wedding': 200,
        'Portrait': 50,
        'Product': 80,
        'Yes': 2000,
        'No': 0
      },
      quantityMultiplier: true // multiply by hours
    }
  }
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Mongo connected');

    for (const c of catalogs) {
      const existing = await ServiceCatalog.findOne({ name: c.name });
      if (existing) {
        await ServiceCatalog.updateOne({ _id: existing._id }, c);
        console.log('Updated catalog', c.name);
      } else {
        await ServiceCatalog.create(c);
        console.log('Created catalog', c.name);
      }
    }

    console.log('ServiceCatalog seed complete');
    process.exit(0);
  } catch (e) {
    console.error('Seed error', e);
    process.exit(1);
  }
}

run();
