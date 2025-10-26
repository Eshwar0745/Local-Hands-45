import ServiceCatalog from '../models/ServiceCatalog.js';

const serviceCatalogs = [
  {
    name: "AC Repair & Installation",
    category: "Technology & Appliances",
    icon: "❄️",
    description: "Professional AC repair, servicing, and installation",
    questions: [
      {
        id: "acType",
        question: "Type of AC?",
        type: "radio",
        options: ["Split AC", "Window AC", "Cassette AC", "Central AC"],
        required: true
      },
      {
        id: "issues",
        question: "What service do you need?",
        type: "checkbox",
        options: [
          "Not cooling properly",
          "Water leakage",
          "Strange noise",
          "Gas refilling needed",
          "General servicing/cleaning",
          "New installation",
          "Repair/Part replacement"
        ],
        required: true
      },
      {
        id: "numberOfUnits",
        question: "Number of AC units?",
        type: "number",
        min: 1,
        max: 10,
        required: true
      },
      {
        id: "additionalInfo",
        question: "Any additional details? (Optional)",
        type: "text",
        required: false,
        placeholder: "E.g., AC is 5 years old, making rattling sound..."
      }
    ],
    pricing: {
      basePrice: 299,
      visitCharge: 99,
      includedTime: 60,
      optionPrices: new Map([
        ["Split AC", 0],
        ["Window AC", -50],
        ["Cassette AC", 100],
        ["Central AC", 300],
        ["Not cooling properly", 200],
        ["Water leakage", 150],
        ["Strange noise", 150],
        ["Gas refilling needed", 800],
        ["General servicing/cleaning", 399],
        ["New installation", 1500],
        ["Repair/Part replacement", 300]
      ]),
      quantityMultiplier: true
    }
  },
  
  {
    name: "Carpentry Services",
    category: "Repair & Maintenance",
    icon: "🔨",
    description: "Furniture repair, installation, and custom carpentry",
    questions: [
      {
        id: "workType",
        question: "What type of work?",
        type: "radio",
        options: [
          "Furniture repair",
          "Door/Window repair",
          "New furniture installation",
          "Custom carpentry",
          "Laminate/Veneer work"
        ],
        required: true
      },
      {
        id: "items",
        question: "What items need work?",
        type: "checkbox",
        options: [
          "Door",
          "Window",
          "Bed",
          "Wardrobe",
          "Kitchen cabinets",
          "Table/Chair",
          "Shelves",
          "Other"
        ],
        required: true
      },
      {
        id: "quantity",
        question: "How many items?",
        type: "number",
        min: 1,
        max: 20,
        required: true
      },
      {
        id: "complexity",
        question: "Complexity of work?",
        type: "radio",
        options: ["Simple fix", "Moderate repair", "Major work"],
        required: true
      },
      {
        id: "description",
        question: "Describe the issue",
        type: "text",
        required: true,
        placeholder: "E.g., Wardrobe door hinge broken, needs replacement..."
      }
    ],
    pricing: {
      basePrice: 199,
      visitCharge: 99,
      includedTime: 45,
      optionPrices: new Map([
        ["Furniture repair", 200],
        ["Door/Window repair", 150],
        ["New furniture installation", 500],
        ["Custom carpentry", 800],
        ["Laminate/Veneer work", 600],
        ["Door", 100],
        ["Window", 100],
        ["Bed", 200],
        ["Wardrobe", 300],
        ["Kitchen cabinets", 400],
        ["Table/Chair", 150],
        ["Shelves", 200]
      ]),
      quantityMultiplier: true,
      complexityMultipliers: new Map([
        ["Simple fix", 1.0],
        ["Moderate repair", 1.4],
        ["Major work", 2.0]
      ])
    }
  },
  
  {
    name: "Electrical Services",
    category: "Repair & Maintenance",
    icon: "⚡",
    description: "Electrical wiring, repairs, and installations",
    questions: [
      {
        id: "issueType",
        question: "What's the electrical issue?",
        type: "checkbox",
        options: [
          "Power outage/No electricity",
          "Switch/Socket not working",
          "Light fixture repair",
          "Fan repair/installation",
          "Wiring issues",
          "Circuit breaker tripping",
          "New electrical installation",
          "Appliance connection"
        ],
        required: true
      },
      {
        id: "urgency",
        question: "How urgent is it?",
        type: "radio",
        options: ["Emergency (same day)", "Urgent (within 24 hours)", "Normal (within 2-3 days)"],
        required: true
      },
      {
        id: "numberOfPoints",
        question: "Number of points/fixtures?",
        type: "number",
        min: 1,
        max: 50,
        required: true
      },
      {
        id: "description",
        question: "Describe the problem",
        type: "text",
        required: true,
        placeholder: "E.g., Bedroom light not working, checked bulb already..."
      }
    ],
    pricing: {
      basePrice: 149,
      visitCharge: 99,
      includedTime: 30,
      optionPrices: new Map([
        ["Power outage/No electricity", 300],
        ["Switch/Socket not working", 150],
        ["Light fixture repair", 100],
        ["Fan repair/installation", 200],
        ["Wiring issues", 400],
        ["Circuit breaker tripping", 250],
        ["New electrical installation", 500],
        ["Appliance connection", 150],
        ["Emergency (same day)", 200],
        ["Urgent (within 24 hours)", 100],
        ["Normal (within 2-3 days)", 0]
      ]),
      quantityMultiplier: true
    }
  },
  
  {
    name: "Plumbing Services",
    category: "Repair & Maintenance",
    icon: "🚰",
    description: "Plumbing repairs, installations, and maintenance",
    questions: [
      {
        id: "issueType",
        question: "What plumbing issue?",
        type: "checkbox",
        options: [
          "Leaking tap/faucet",
          "Blocked drain/sink",
          "Toilet flush problem",
          "Water tank overflow",
          "Pipe leakage",
          "Low water pressure",
          "New fixture installation",
          "Water heater issue"
        ],
        required: true
      },
      {
        id: "severity",
        question: "Severity?",
        type: "radio",
        options: ["Emergency (water flooding)", "Urgent (major leak)", "Normal"],
        required: true
      },
      {
        id: "numberOfFixtures",
        question: "Number of fixtures/points?",
        type: "number",
        min: 1,
        max: 20,
        required: true
      },
      {
        id: "description",
        question: "Additional details",
        type: "text",
        required: false,
        placeholder: "E.g., Kitchen sink completely blocked, water not draining..."
      }
    ],
    pricing: {
      basePrice: 199,
      visitCharge: 99,
      includedTime: 45,
      optionPrices: new Map([
        ["Leaking tap/faucet", 150],
        ["Blocked drain/sink", 200],
        ["Toilet flush problem", 180],
        ["Water tank overflow", 220],
        ["Pipe leakage", 300],
        ["Low water pressure", 150],
        ["New fixture installation", 250],
        ["Water heater issue", 280],
        ["Emergency (water flooding)", 300],
        ["Urgent (major leak)", 150],
        ["Normal", 0]
      ]),
      quantityMultiplier: true
    }
  },
  
  {
    name: "CCTV Installation & Repair",
    category: "Technology & Security",
    icon: "📹",
    description: "CCTV camera installation, repair, and maintenance",
    questions: [
      {
        id: "serviceType",
        question: "What do you need?",
        type: "radio",
        options: [
          "New CCTV installation",
          "Existing system repair",
          "Add more cameras",
          "System upgrade",
          "DVR/NVR setup"
        ],
        required: true
      },
      {
        id: "cameraType",
        question: "Type of cameras?",
        type: "radio",
        options: ["Dome cameras", "Bullet cameras", "PTZ cameras", "IP cameras", "Wireless cameras"],
        required: true
      },
      {
        id: "numberOfCameras",
        question: "Number of cameras?",
        type: "number",
        min: 1,
        max: 32,
        required: true
      },
      {
        id: "features",
        question: "Required features? (Optional)",
        type: "checkbox",
        options: [
          "Night vision",
          "Motion detection",
          "Mobile app access",
          "Cloud storage",
          "Audio recording"
        ],
        required: false
      },
      {
        id: "propertyType",
        question: "Property type?",
        type: "radio",
        options: ["Home", "Office", "Shop", "Warehouse", "Building"],
        required: true
      }
    ],
    pricing: {
      basePrice: 499,
      visitCharge: 99,
      includedTime: 90,
      optionPrices: new Map([
        ["New CCTV installation", 1500],
        ["Existing system repair", 300],
        ["Add more cameras", 800],
        ["System upgrade", 1000],
        ["DVR/NVR setup", 500],
        ["Dome cameras", 1200],
        ["Bullet cameras", 1000],
        ["PTZ cameras", 3000],
        ["IP cameras", 2000],
        ["Wireless cameras", 1800],
        ["Night vision", 200],
        ["Motion detection", 150],
        ["Mobile app access", 300],
        ["Cloud storage", 400],
        ["Audio recording", 250]
      ]),
      quantityMultiplier: true
    }
  },
  
  {
    name: "Painting Services",
    category: "Home Improvement",
    icon: "🎨",
    description: "Interior and exterior painting services",
    questions: [
      {
        id: "paintType",
        question: "Type of painting?",
        type: "radio",
        options: [
          "Interior wall painting",
          "Exterior wall painting",
          "Wood/Furniture painting",
          "Texture/Design work",
          "Touch-up/Repair"
        ],
        required: true
      },
      {
        id: "area",
        question: "Approximate area (sq. ft.)?",
        type: "number",
        min: 50,
        max: 10000,
        required: true
      },
      {
        id: "rooms",
        question: "Number of rooms? (if applicable)",
        type: "number",
        min: 0,
        max: 20,
        required: false
      },
      {
        id: "finish",
        question: "Paint finish preference?",
        type: "radio",
        options: ["Standard/Matt", "Premium/Emulsion", "Luxury/Texture", "Waterproof"],
        required: true
      }
    ],
    pricing: {
      basePrice: 12, // per sq. ft.
      visitCharge: 199,
      includedTime: 240,
      optionPrices: new Map([
        ["Standard/Matt", 0],
        ["Premium/Emulsion", 5],
        ["Luxury/Texture", 15],
        ["Waterproof", 8]
      ])
    }
  },
  
  {
    name: "Electronics Repair",
    category: "Technology & Appliances",
    icon: "🔧",
    description: "Repair of TVs, washing machines, refrigerators, and other electronics",
    questions: [
      {
        id: "deviceType",
        question: "What device needs repair?",
        type: "radio",
        options: [
          "TV (LED/LCD/Smart)",
          "Washing Machine",
          "Refrigerator",
          "Microwave",
          "Water Purifier",
          "Geyser",
          "Other appliance"
        ],
        required: true
      },
      {
        id: "brand",
        question: "Brand?",
        type: "text",
        required: true,
        placeholder: "E.g., Samsung, LG, Whirlpool..."
      },
      {
        id: "issue",
        question: "What's the problem?",
        type: "text",
        required: true,
        placeholder: "E.g., TV screen has lines, washing machine not spinning..."
      },
      {
        id: "warranty",
        question: "Under warranty?",
        type: "radio",
        options: ["Yes", "No", "Not sure"],
        required: true
      }
    ],
    pricing: {
      basePrice: 249,
      visitCharge: 99,
      includedTime: 45,
      optionPrices: new Map([
        ["TV (LED/LCD/Smart)", 300],
        ["Washing Machine", 400],
        ["Refrigerator", 500],
        ["Microwave", 200],
        ["Water Purifier", 300],
        ["Geyser", 250],
        ["Other appliance", 200]
      ])
    }
  }
];

export async function seedServiceCatalogs() {
  try {
    await ServiceCatalog.deleteMany({});
    await ServiceCatalog.insertMany(serviceCatalogs);
    console.log('✅ Service catalogs seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding service catalogs:', error);
    throw error;
  }
}

export { serviceCatalogs };
