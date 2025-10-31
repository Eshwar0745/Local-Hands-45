import Category from '../models/Category.js';
import ServiceTemplate from '../models/ServiceTemplate.js';
import ServiceCatalog from '../models/ServiceCatalog.js';

// Helper to fetch category name for a template
async function getCategoryName(catId) {
  const cat = await Category.findById(catId).lean();
  return cat?.name?.replace(/^[^\w\s]\s*/, '') || 'General'; // strip emoji for consistency in catalogs
}

// Provide sensible default questionnaires and pricing per template name
function defaultsForTemplate(name, categoryName) {
  const n = name.toLowerCase();
  const inCat = (s) => categoryName.toLowerCase().includes(s);

  // Technology & Appliances
  if (n.includes('ac')) {
    return {
      icon: '❄️',
      description: 'Professional AC repair, servicing, and installation',
      questions: [
        { id: 'acType', question: 'Type of AC?', type: 'radio', options: ['Split AC','Window AC','Cassette AC','Central AC'], required: true },
        { id: 'issues', question: 'Select issues (if any)', type: 'checkbox', options: ['Not cooling properly','Water leakage','Strange noise','Bad smell','Gas refilling','Complete servicing','Installation / Re-location'], required: false },
        { id: 'numberOfUnits', question: 'How many units?', type: 'number', min: 1, max: 10, required: true },
        { id: 'notes', question: 'Any additional info?', type: 'text', required: false, placeholder: 'E.g., brand/model, floor access, parking' }
      ],
      pricing: {
        basePrice: 299, visitCharge: 99, includedTime: 60,
        optionPrices: new Map(Object.entries({
          'Split AC': 0,'Window AC': -50,'Cassette AC': 100,'Central AC': 300,
          'Not cooling properly': 200,'Water leakage': 150,'Strange noise': 150,'Bad smell': 100,
          'Gas refilling': 1200,'Complete servicing': 499,'Installation / Re-location': 1500
        })),
        quantityMultiplier: true
      }
    };
  }

  if (n.includes('cctv') || n.includes('camera')) {
    return {
      icon: '📹',
      description: 'CCTV camera installation, repair, and maintenance',
      questions: [
        { id: 'serviceType', question: 'What do you need?', type: 'radio', options: ['New installation','Repair existing','Add more cameras','System upgrade','DVR/NVR setup'], required: true },
        { id: 'cameraType', question: 'Type of cameras?', type: 'radio', options: ['Dome','Bullet','PTZ','IP','Wireless'], required: true },
        { id: 'numberOfCameras', question: 'Number of cameras?', type: 'number', min: 1, max: 32, required: true },
        { id: 'features', question: 'Required features (optional)', type: 'checkbox', options: ['Night vision','Motion detection','Mobile app','Cloud storage','Audio recording'], required: false }
      ],
      pricing: {
        basePrice: 499, visitCharge: 99, includedTime: 90,
        optionPrices: new Map(Object.entries({
          'New installation': 1500,'Repair existing': 300,'Add more cameras': 800,'System upgrade': 1000,'DVR/NVR setup': 500,
          'Dome': 1200,'Bullet': 1000,'PTZ': 3000,'IP': 2000,'Wireless': 1800,
          'Night vision': 200,'Motion detection': 150,'Mobile app': 300,'Cloud storage': 400,'Audio recording': 250
        })),
        quantityMultiplier: true
      }
    };
  }

  if (n.includes('refrigerator') || n.includes('washing') || n.includes('appliance') || n.includes('electronics')) {
    return {
      icon: '🔧',
      description: 'Repair of TVs, washing machines, refrigerators, and other appliances',
      questions: [
        { id: 'deviceType', question: 'Device', type: 'radio', options: ['TV','Washing Machine','Refrigerator','Microwave','Water Purifier','Geyser','Other'], required: true },
        { id: 'brand', question: 'Brand', type: 'text', required: true, placeholder: 'E.g., Samsung, LG, Whirlpool' },
        { id: 'issue', question: 'Issue description', type: 'text', required: true },
        { id: 'warranty', question: 'Under warranty?', type: 'radio', options: ['Yes','No','Not sure'], required: true }
      ],
      pricing: {
        basePrice: 249, visitCharge: 99, includedTime: 45,
        optionPrices: new Map(Object.entries({
          'TV': 300,'Washing Machine': 400,'Refrigerator': 500,'Microwave': 200,'Water Purifier': 300,'Geyser': 250,'Other': 200
        }))
      }
    };
  }

  if (n.includes('mobile repair') || n.includes('laptop') || n.includes('desktop')) {
    return {
      icon: '📱',
      description: 'Mobile/Laptop diagnostics and repair',
      questions: [
        { id: 'deviceType', question: 'Device', type: 'radio', options: ['Android phone','iPhone','Laptop','Desktop'], required: true },
        { id: 'brand', question: 'Brand/Model', type: 'text', required: false },
        { id: 'problem', question: 'Primary problem', type: 'select', options: ['Screen','Battery','Charging','Water damage','OS/Software','Other'], required: true }
      ],
      pricing: { basePrice: 199, visitCharge: 49, optionPrices: new Map(Object.entries({ Screen: 500, Battery: 400, Charging: 300, 'Water damage': 700, 'OS/Software': 200, Other: 150 })) }
    };
  }

  // Home services
  if (n.includes('plumb')) {
    return {
      icon: '🚰',
      description: 'Plumbing repairs, installations, and maintenance',
      questions: [
        { id: 'issueType', question: 'Issue', type: 'checkbox', options: ['Leak','Blocked drain','Toilet flush','Tank overflow','Pipe leakage','Low pressure','New fixture install','Geyser issue'], required: true },
        { id: 'severity', question: 'Severity', type: 'radio', options: ['Emergency','Urgent','Normal'], required: true },
        { id: 'numberOfFixtures', question: 'Fixtures/points', type: 'number', min: 1, max: 20, required: true }
      ],
      pricing: {
        basePrice: 199, visitCharge: 99, includedTime: 45,
        optionPrices: new Map(Object.entries({
          'Leak': 150,'Blocked drain': 200,'Toilet flush': 180,'Tank overflow': 220,'Pipe leakage': 300,'Low pressure': 150,'New fixture install': 250,'Geyser issue': 280,
          'Emergency': 300,'Urgent': 150,'Normal': 0
        })),
        quantityMultiplier: true
      }
    };
  }

  if (n.includes('electrical')) {
    return {
      icon: '⚡',
      description: 'Electrical wiring, repairs, and installations',
      questions: [
        { id: 'jobType', question: 'Type of job', type: 'select', options: ['New point','Repair','Appliance install'], required: true },
        { id: 'numberOfPoints', question: 'How many points?', type: 'number', min: 1, max: 50, required: true },
        { id: 'urgency', question: 'Urgency', type: 'radio', options: ['Normal','Emergency'], required: true }
      ],
      pricing: {
        basePrice: 149, visitCharge: 69,
        optionPrices: new Map(Object.entries({ 'New point': 120, 'Repair': 80, 'Appliance install': 150, 'Emergency': 200, 'Normal': 0 })),
        quantityMultiplier: true
      }
    };
  }

  if (n.includes('carpentry') || n.includes('carpenter')) {
    return {
      icon: '🔨',
      description: 'Furniture repair, installation, and custom carpentry',
      questions: [
        { id: 'workType', question: 'Work type', type: 'radio', options: ['Repair','Assembly','Door/Window fix','Custom work'], required: true },
        { id: 'items', question: 'Items', type: 'checkbox', options: ['Door','Window','Bed','Wardrobe','Kitchen cabinets','Table/Chair','Shelves'], required: true },
        { id: 'quantity', question: 'How many items?', type: 'number', min: 1, max: 20, required: true },
        { id: 'complexity', question: 'Complexity', type: 'radio', options: ['Simple fix','Moderate repair','Major work'], required: true }
      ],
      pricing: {
        basePrice: 199, visitCharge: 99,
        optionPrices: new Map(Object.entries({
          Repair: 200, Assembly: 150, 'Door/Window fix': 180, 'Custom work': 300,
          Door: 100, Window: 100, Bed: 200, Wardrobe: 300, 'Kitchen cabinets': 400, 'Table/Chair': 150, Shelves: 200
        })),
        quantityMultiplier: true,
        complexityMultipliers: new Map(Object.entries({ 'Simple fix': 1.0, 'Moderate repair': 1.4, 'Major work': 2.0 }))
      }
    };
  }

  if (n.includes('painting') || n.includes('painter')) {
    return {
      icon: '🎨',
      description: 'Interior and exterior painting services',
      questions: [
        { id: 'paintType', question: 'Type of painting', type: 'radio', options: ['Interior','Exterior','Wood/Furniture','Texture design','Touch-up'], required: true },
        { id: 'area', question: 'Approximate area (sq. ft.)', type: 'number', min: 50, max: 10000, required: true },
        { id: 'finish', question: 'Paint finish', type: 'radio', options: ['Standard/Matt','Premium/Emulsion','Luxury/Texture','Waterproof'], required: true }
      ],
      pricing: { basePrice: 12, visitCharge: 199, includedTime: 240, optionPrices: new Map(Object.entries({ 'Standard/Matt': 0, 'Premium/Emulsion': 5, 'Luxury/Texture': 15, 'Waterproof': 8 })) }
    };
  }

  if (n.includes('house cleaning') || n.includes('cleaning')) {
    return {
      icon: '🧹',
      description: 'Basic to deep cleaning service',
      questions: [
        { id: 'cleanType', question: 'Cleaning type', type: 'radio', options: ['Basic','Deep','Move-in/out'], required: true },
        { id: 'bhk', question: 'BHK size', type: 'select', options: ['1 BHK','2 BHK','3 BHK','4+ BHK'], required: true },
        { id: 'addOns', question: 'Add-ons', type: 'checkbox', options: ['Fridge','Oven','Balcony','Windows'], required: false }
      ],
      pricing: { basePrice: 79, visitCharge: 49, optionPrices: new Map(Object.entries({ 'Basic': 0, 'Deep': 300, 'Move-in/out': 500, '1 BHK': 200, '2 BHK': 400, '3 BHK': 600, '4+ BHK': 900, 'Fridge': 99, 'Oven': 99, 'Balcony': 69, 'Windows': 99 })) }
    };
  }

  // Personal services
  if (n.includes('salon')) {
    return {
      icon: '💇',
      description: 'At-home salon services',
      questions: [
        { id: 'service', question: 'Service', type: 'select', options: ['Haircut','Beard grooming','Facial','Cleanup','Waxing','Pedicure/Manicure'], required: true },
        { id: 'for', question: 'For', type: 'radio', options: ['Men','Women'], required: true }
      ],
      pricing: { basePrice: 199, visitCharge: 0, optionPrices: new Map(Object.entries({ Haircut: 199, 'Beard grooming': 149, Facial: 499, Cleanup: 349, Waxing: 399, 'Pedicure/Manicure': 599, Men: 0, Women: 0 })) }
    };
  }

  if (n.includes('spa')) {
    return {
      icon: '💆',
      description: 'Relaxing at-home spa services',
      questions: [
        { id: 'service', question: 'Service', type: 'select', options: ['Head massage','Body massage','Foot massage'], required: true },
        { id: 'duration', question: 'Duration (mins)', type: 'number', min: 30, max: 120, required: true }
      ],
      pricing: { basePrice: 5, visitCharge: 0 } // per minute base; final computed on FE
    };
  }

  // Automotive
  if (n.includes('towing')) {
    return {
      icon: '🚗',
      description: 'Vehicle towing service',
      questions: [
        { id: 'vehicleType', question: 'Vehicle type', type: 'radio', options: ['Car','Bike','SUV'], required: true },
        { id: 'distanceKm', question: 'Approx distance (km)', type: 'number', min: 1, max: 200, required: true },
        { id: 'urgency', question: 'Urgency', type: 'radio', options: ['Normal','Emergency'], required: true }
      ],
      pricing: { basePrice: 50, visitCharge: 0, optionPrices: new Map(Object.entries({ Car: 0, Bike: -10, SUV: 20, Emergency: 200, Normal: 0 })) }
    };
  }

  if (n.includes('car repair') || n.includes('bike repair')) {
    return {
      icon: '🔧',
      description: 'Vehicle repair and servicing',
      questions: [
        { id: 'vehicleType', question: 'Vehicle type', type: 'radio', options: ['Car','Bike'], required: true },
        { id: 'serviceType', question: 'Service', type: 'select', options: ['General service','Brake issue','Engine issue','Electrical','Clutch/Transmission','Other'], required: true }
      ],
      pricing: { basePrice: 299, visitCharge: 0, optionPrices: new Map(Object.entries({ 'General service': 0, 'Brake issue': 200, 'Engine issue': 500, Electrical: 250, 'Clutch/Transmission': 600, Other: 150 })) }
    };
  }

  // Events & Catering
  if (n.includes('catering')) {
    return {
      icon: '🍽️',
      description: 'Veg/non-veg catering for events',
      questions: [
        { id: 'cuisine', question: 'Cuisine', type: 'select', options: ['Veg','Non-veg','Mixed'], required: true },
        { id: 'guests', question: 'Number of guests', type: 'number', min: 10, max: 2000, required: true },
        { id: 'service', question: 'Service type', type: 'radio', options: ['Buffet','Plated','Live counters'], required: true }
      ],
      pricing: { basePrice: 200, visitCharge: 0, optionPrices: new Map(Object.entries({ Veg: 0, 'Non-veg': 120, Mixed: 60, Buffet: 50, Plated: 100, 'Live counters': 150 })), quantityMultiplier: true }
    };
  }

  if (n.includes('photography') || n.includes('music') || n.includes('decoration') || inCat('events')) {
    if (n.includes('photography')) {
      return {
        icon: '📷',
        description: 'Event and portrait photography',
        questions: [
          { id: 'shootType', question: 'Shoot type', type: 'select', options: ['Event','Pre-wedding','Portrait','Product'], required: true },
          { id: 'hours', question: 'Hours', type: 'number', min: 1, max: 24, required: true },
          { id: 'album', question: 'Printed album?', type: 'radio', options: ['No','Yes'], required: true }
        ],
        pricing: { basePrice: 150, visitCharge: 0, optionPrices: new Map(Object.entries({ Event: 100, 'Pre-wedding': 200, Portrait: 50, Product: 80, Yes: 2000, No: 0 })), quantityMultiplier: true }
      };
    }
    if (n.includes('music')) {
      return {
        icon: '🎵',
        description: 'Live music/band/DJ for events',
        questions: [
          { id: 'act', question: 'Act type', type: 'select', options: ['DJ','Live band','Singer'], required: true },
          { id: 'hours', question: 'Hours', type: 'number', min: 1, max: 12, required: true },
          { id: 'sound', question: 'Need sound system?', type: 'radio', options: ['No','Yes'], required: true }
        ],
        pricing: { basePrice: 1000, visitCharge: 0, optionPrices: new Map(Object.entries({ DJ: 0, 'Live band': 4000, Singer: 2000, Yes: 3000, No: 0 })), quantityMultiplier: true }
      };
    }
    if (n.includes('decoration')) {
      return {
        icon: '🎈',
        description: 'Home/venue decoration for events',
        questions: [
          { id: 'eventType', question: 'Event type', type: 'select', options: ['Birthday','Wedding','Housewarming','Corporate','Other'], required: true },
          { id: 'theme', question: 'Theme (optional)', type: 'text', required: false }
        ],
        pricing: { basePrice: 2000, visitCharge: 0 }
      };
    }
  }

  // Fallback generic template
  return {
    icon: '🧰',
    description: `${name} service`,
    questions: [
      { id: 'description', question: 'Describe your requirement', type: 'text', required: true }
    ],
    pricing: { basePrice: 99, visitCharge: 49 }
  };
}

export async function ensureServiceCatalogsFromTemplates() {
  try {
    const templates = await ServiceTemplate.find({ active: true }).populate('category','name');
    for (const t of templates) {
      const existing = await ServiceCatalog.findOne({ name: { $regex: new RegExp(`^${t.name}$`, 'i') } });
      if (existing) continue;
      const categoryName = t.category?.name || 'General';
      const defs = defaultsForTemplate(t.name, categoryName);
      await ServiceCatalog.create({
        name: t.name,
        category: categoryName.replace(/^[^\w\s]\s*/, ''),
        icon: defs.icon,
        description: defs.description,
        questions: defs.questions,
        pricing: defs.pricing,
        isActive: true
      });
      console.log('🧩 Created ServiceCatalog for template:', t.name);
    }
    console.log('✅ ensureServiceCatalogsFromTemplates complete');
  } catch (err) {
    console.error('ensureServiceCatalogsFromTemplates error:', err.message);
  }
}

export default ensureServiceCatalogsFromTemplates;
