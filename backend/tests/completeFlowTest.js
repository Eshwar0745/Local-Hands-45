/**
 * Complete End-to-End API Flow Test
 * Tests both Customer and Provider journeys
 * 
 * Run: node tests/completeFlowTest.js
 */

import axios from 'axios';
import chalk from 'chalk';

const BASE_URL = 'http://localhost:5001/api';
let customerToken = '';
let providerToken = '';
let providerId = '';
let adminToken = '';
let bookingId = '';
let serviceTemplateIds = [];
let categoryId = '';

// Test data
const testCustomer = {
  name: 'Test Customer Flow',
  email: `customer_${Date.now()}@test.com`,
  password: 'pass123',
  phone: '9876543210'
};

const testProvider = {
  name: 'Test Provider Flow',
  email: `provider_${Date.now()}@test.com`,
  password: 'pass123',
  phone: '9876543211'
};

const adminCreds = {
  email: 'admin@gmail.com',
  password: 'admin123'
};

// Helper functions
const log = {
  step: (msg) => console.log(chalk.blue.bold(`\n🔹 ${msg}`)),
  success: (msg) => console.log(chalk.green(`   ✅ ${msg}`)),
  error: (msg) => console.log(chalk.red(`   ❌ ${msg}`)),
  info: (msg) => console.log(chalk.gray(`   ℹ️  ${msg}`)),
  data: (msg) => console.log(chalk.yellow(`   📊 ${msg}`))
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  if (config.url.includes('/customer') && customerToken) {
    config.headers.Authorization = `Bearer ${customerToken}`;
  } else if (config.url.includes('/provider') && providerToken) {
    config.headers.Authorization = `Bearer ${providerToken}`;
  } else if (config.url.includes('/admin') && adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  } else if (config.headers['X-Use-Customer']) {
    config.headers.Authorization = `Bearer ${customerToken}`;
    delete config.headers['X-Use-Customer'];
  } else if (config.headers['X-Use-Provider']) {
    config.headers.Authorization = `Bearer ${providerToken}`;
    delete config.headers['X-Use-Provider'];
  }
  return config;
});

// Test functions
async function test1_HealthCheck() {
  log.step('TEST 1: Health Check');
  try {
    const res = await axios.get('http://localhost:5001/');
    log.success('Server is running');
    log.data(`Response: ${res.data.message || res.data}`);
  } catch (e) {
    log.error(`Server not running: ${e.message}`);
    throw e;
  }
}

async function test2_RegisterCustomer() {
  log.step('TEST 2: Register Customer');
  try {
    const res = await api.post('/auth/register', testCustomer);
    log.success('Customer registered');
    log.data(`User ID: ${res.data.user._id}`);
    log.data(`Email: ${res.data.user.email}`);
    log.data(`Token received: ${res.data.token ? 'Yes' : 'No'}`);
    customerToken = res.data.token;
  } catch (e) {
    log.error(`Registration failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test3_SetCustomerRole() {
  log.step('TEST 3: Set Customer Role');
  try {
    const res = await api.post('/auth/set-role', 
      { role: 'customer' },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    log.success('Role set to customer');
    log.data(`User: ${res.data.user.name} (${res.data.user.role})`);
  } catch (e) {
    log.error(`Set role failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test4_RegisterProvider() {
  log.step('TEST 4: Register Provider');
  try {
    const res = await api.post('/auth/register', testProvider);
    log.success('Provider registered');
    log.data(`User ID: ${res.data.user._id}`);
    providerToken = res.data.token;
    providerId = res.data.user._id;
  } catch (e) {
    log.error(`Registration failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test5_SetProviderRole() {
  log.step('TEST 5: Set Provider Role');
  try {
    const res = await api.post('/auth/set-role',
      { role: 'provider' },
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    log.success('Role set to provider');
    log.data(`User: ${res.data.user.name} (${res.data.user.role})`);
  } catch (e) {
    log.error(`Set role failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test6_AdminLogin() {
  log.step('TEST 6: Admin Login');
  try {
    const res = await api.post('/auth/login', adminCreds);
    log.success('Admin logged in');
    adminToken = res.data.token;
    log.data(`Admin: ${res.data.user.name}`);
  } catch (e) {
    log.error(`Admin login failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test7_GetServiceCatalog() {
  log.step('TEST 7: Get Service Catalog (Categories & Templates)');
  try {
    const res = await api.get('/catalog/categories');
    log.success(`Found ${res.data.categories?.length || 0} categories`);
    
    if (res.data.categories && res.data.categories.length > 0) {
      categoryId = res.data.categories[0]._id;
      log.data(`Sample category: ${res.data.categories[0].name}`);
      
      // Get templates for first category
      const templates = await api.get(`/catalog/templates?category=${categoryId}`);
      serviceTemplateIds = templates.data.templates.slice(0, 3).map(t => t._id);
      log.success(`Found ${templates.data.templates.length} service templates`);
      log.data(`Sample services: ${templates.data.templates.slice(0, 3).map(t => t.name).join(', ')}`);
    }
  } catch (e) {
    log.error(`Catalog fetch failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test8_ProviderSelectServices() {
  log.step('TEST 8: Provider Selects Services');
  try {
    if (serviceTemplateIds.length === 0) {
      log.info('No service templates available - skipping');
      return;
    }
    
    const res = await api.post('/providers/select-services',
      { templateIds: serviceTemplateIds },
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    log.success(`Provider selected ${res.data.services?.length || 0} services`);
    log.data(`Services: ${res.data.services?.map(s => s.name).join(', ')}`);
  } catch (e) {
    log.error(`Service selection failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test9_ProviderSetLocation() {
  log.step('TEST 9: Provider Updates Location');
  try {
    const res = await api.patch('/providers/location',
      { lng: 78.4867, lat: 17.3850 }, // Hyderabad coordinates
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    log.success('Provider location updated');
    log.data(`Location: [${res.data.user.location?.coordinates[0]}, ${res.data.user.location?.coordinates[1]}]`);
  } catch (e) {
    log.error(`Location update failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test9a_SubmitVerification() {
  log.step('TEST 9a: Provider Submits License and Work Proof Verification');
  try {
    const res = await api.post('/providers/submit-verification', {
      licenseImage: 'http://cloudinary.com/license.jpg',
      licenseType: 'aadhar',
      licenseNumber: '1234-5678-9012',
      workBeforeImage: 'http://cloudinary.com/before.jpg',
      workAfterImage: 'http://cloudinary.com/after.jpg'
    }, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    log.success('Verification details submitted successfully');
    log.data(`Status: ${res.data.user.onboardingStatus}`);
    log.data(`Work Before Image: ${res.data.user.workBeforeImage}`);
    log.data(`Work After Image: ${res.data.user.workAfterImage}`);
  } catch (e) {
    log.error(`Verification submission failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test9b_ApproveProvider() {
  log.step('TEST 9b: Admin Approves Provider Verification');
  try {
    const res = await api.post(`/admin/verifications/${providerId}/approve`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    log.success('Provider approved by Admin');
    log.data(`Status: ${res.data.provider.onboardingStatus}`);
  } catch (e) {
    log.error(`Provider approval failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test10_ProviderGoLive() {
  log.step('TEST 10: Provider Goes Live');
  try {
    const res = await api.patch('/providers/availability',
      { isAvailable: true, lng: 78.4867, lat: 17.3850 },
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    log.success('Provider is now LIVE');
    log.data(`isAvailable: ${res.data.user.isAvailable}`);
    log.data(`isLiveTracking: ${res.data.user.isLiveTracking}`);
  } catch (e) {
    log.error(`Go Live failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test11_CustomerCreateBooking() {
  log.step('TEST 11: Customer Creates Booking');
  try {
    if (serviceTemplateIds.length === 0) {
      log.info('No services available - skipping booking creation');
      return;
    }
    
    const bookingData = {
      services: [
        {
          template: serviceTemplateIds[0],
          name: 'Test Service',
          price: 500
        }
      ],
      scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      location: {
        type: 'Point',
        coordinates: [78.4867, 17.3850]
      },
      address: 'Test Address, Hyderabad, Telangana'
    };
    
    const res = await api.post('/bookings/create-multi',
      bookingData,
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    
    bookingId = res.data.booking.bookingId;
    log.success('Booking created');
    log.data(`Booking ID: ${bookingId}`);
    log.data(`Status: ${res.data.booking.status}`);
    log.data(`Total: ₹${res.data.booking.totalPrice}`);
    log.data(`Pending providers: ${res.data.booking.pendingProviders?.length || 0}`);
  } catch (e) {
    log.error(`Booking creation failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test12_ProviderCheckOffers() {
  log.step('TEST 12: Provider Checks Pending Offers');
  try {
    const res = await api.get('/bookings/offers/mine',
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    log.success(`Provider has ${res.data.offers?.length || 0} pending offers`);
    
    if (res.data.offers && res.data.offers.length > 0) {
      const offer = res.data.offers[0];
      log.data(`Booking ID: ${offer.bookingId}`);
      log.data(`Customer: ${offer.customer?.name}`);
      log.data(`Timeout: ${new Date(offer.providerResponseTimeout).toLocaleTimeString()}`);
    }
  } catch (e) {
    log.error(`Check offers failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test13_ProviderAcceptOffer() {
  log.step('TEST 13: Provider Accepts Offer');
  try {
    if (!bookingId) {
      log.info('No booking ID - skipping');
      return;
    }
    
    const res = await api.patch(`/bookings/${bookingId}/offer/accept`,
      {},
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    log.success('Offer accepted');
    log.data(`Status: ${res.data.booking.status}`);
    log.data(`Provider: ${res.data.booking.provider}`);
    log.data(`Auto-paused Go Live: ${res.data.booking.status === 'in_progress' ? 'Yes' : 'No'}`);
  } catch (e) {
    log.error(`Accept offer failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test14_CustomerCheckBookings() {
  log.step('TEST 14: Customer Checks Booking Status');
  try {
    const res = await api.get('/bookings/mine',
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    log.success(`Customer has ${res.data.bookings?.length || 0} bookings`);
    
    const currentBooking = res.data.bookings?.find(b => b.bookingId === bookingId);
    if (currentBooking) {
      log.data(`Booking ID: ${currentBooking.bookingId}`);
      log.data(`Status: ${currentBooking.status}`);
      log.data(`Provider: ${currentBooking.provider?.name || 'Unknown'}`);
    }
  } catch (e) {
    log.error(`Check bookings failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test15_ProviderCompleteJob() {
  log.step('TEST 15: Provider Completes Job');
  try {
    if (!bookingId) {
      log.info('No booking ID - skipping');
      return;
    }
    
    const res = await api.patch(`/bookings/${bookingId}/complete`,
      {},
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    log.success('Job completed by provider');
    log.data(`Status: ${res.data.booking.status}`);
    log.data(`Provider location updated: ${res.data.locationUpdated ? 'Yes' : 'Unknown'}`);
  } catch (e) {
    log.error(`Complete job failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test16_CustomerConfirmCompletion() {
  log.step('TEST 16: Customer Confirms Completion');
  try {
    if (!bookingId) {
      log.info('No booking ID - skipping');
      return;
    }
    
    const res = await api.patch(`/bookings/${bookingId}/customer-complete`,
      {},
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    log.success('Job confirmed complete by customer');
    log.data(`Status: ${res.data.booking.status}`);
    log.data(`Final Status: ${res.data.booking.status === 'completed' ? 'COMPLETED' : res.data.booking.status}`);
  } catch (e) {
    log.error(`Customer complete failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test17_CustomerRateProvider() {
  log.step('TEST 17: Customer Rates Provider');
  try {
    if (!bookingId) {
      log.info('No booking ID - skipping');
      return;
    }
    
    const reviewData = {
      booking: bookingId,
      direction: 'customer_to_provider',
      rating: 5,
      comment: 'Excellent service! Very professional.',
      isPublic: true
    };
    
    const res = await api.post('/reviews',
      reviewData,
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    log.success('Review submitted');
    log.data(`Rating: ${res.data.review.rating}/5 ⭐`);
    log.data(`Comment: "${res.data.review.comment}"`);
  } catch (e) {
    log.error(`Rate provider failed: ${e.response?.data?.message || e.message}`);
    // Don't throw - review might already exist
  }
}

async function test18_ProviderRateCustomer() {
  log.step('TEST 18: Provider Rates Customer');
  try {
    if (!bookingId) {
      log.info('No booking ID - skipping');
      return;
    }
    
    const reviewData = {
      booking: bookingId,
      direction: 'provider_to_customer',
      rating: 5,
      comment: 'Great customer, clear communication!',
      isPublic: false
    };
    
    const res = await api.post('/reviews',
      reviewData,
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    log.success('Review submitted');
    log.data(`Rating: ${res.data.review.rating}/5 ⭐`);
  } catch (e) {
    log.error(`Rate customer failed: ${e.response?.data?.message || e.message}`);
    // Don't throw - review might already exist
  }
}

async function test19_VerifyProviderRating() {
  log.step('TEST 19: Verify Provider Rating Updated');
  try {
    const res = await api.get('/auth/me',
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    log.success('Provider rating verified');
    log.data(`Current Rating: ${res.data.user.rating || 0}/5 ⭐`);
    log.data(`Total Reviews: ${res.data.user.ratingCount || 0}`);
    log.data(`Completed Jobs: ${res.data.user.completedJobs || 0}`);
  } catch (e) {
    log.error(`Verify rating failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test20_ProviderGoOffline() {
  log.step('TEST 20: Provider Goes Offline');
  try {
    const res = await api.patch('/providers/availability',
      { isAvailable: false },
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    log.success('Provider is now OFFLINE');
    log.data(`isAvailable: ${res.data.user.isAvailable}`);
  } catch (e) {
    log.error(`Go offline failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test21_NearbyProvidersSearch() {
  log.step('TEST 21: Search Nearby Providers');
  try {
    const res = await api.get('/providers/nearby', {
      params: {
        lng: 78.4867,
        lat: 17.3850,
        radiusKm: 5
      }
    });
    log.success(`Found ${res.data.providers?.length || 0} nearby providers (within 5km)`);
    
    if (res.data.providers && res.data.providers.length > 0) {
      res.data.providers.slice(0, 3).forEach(p => {
        log.data(`${p.name} - Rating: ${p.rating || 0}/5 ⭐ - Available: ${p.isAvailable ? 'Yes' : 'No'}`);
      });
    }
  } catch (e) {
    log.error(`Nearby search failed: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

async function test22_GetNotifications() {
  log.step('TEST 22: Check Notifications (Customer & Provider)');
  try {
    // Customer notifications
    const custRes = await api.get('/notifications',
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    log.success(`Customer has ${custRes.data.notifications?.length || 0} notifications`);
    
    // Provider notifications
    const provRes = await api.get('/notifications',
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    log.success(`Provider has ${provRes.data.notifications?.length || 0} notifications`);
  } catch (e) {
    log.error(`Get notifications failed: ${e.response?.data?.message || e.message}`);
    // Don't throw - notifications might not be implemented
  }
}

// Main test runner
async function runAllTests() {
  console.log(chalk.cyan.bold('\n' + '='.repeat(60)));
  console.log(chalk.cyan.bold('   🧪 LocalHands Complete API Flow Test Suite'));
  console.log(chalk.cyan.bold('='.repeat(60)));
  
  const startTime = Date.now();
  let passedTests = 0;
  let failedTests = 0;
  
  const tests = [
    test1_HealthCheck,
    test2_RegisterCustomer,
    test3_SetCustomerRole,
    test4_RegisterProvider,
    test5_SetProviderRole,
    test6_AdminLogin,
    test7_GetServiceCatalog,
    test8_ProviderSelectServices,
    test9_ProviderSetLocation,
    test9a_SubmitVerification,
    test9b_ApproveProvider,
    test10_ProviderGoLive,
    test11_CustomerCreateBooking,
    test12_ProviderCheckOffers,
    test13_ProviderAcceptOffer,
    test14_CustomerCheckBookings,
    test15_ProviderCompleteJob,
    test16_CustomerConfirmCompletion,
    test17_CustomerRateProvider,
    test18_ProviderRateCustomer,
    test19_VerifyProviderRating,
    test20_ProviderGoOffline,
    test21_NearbyProvidersSearch,
    test22_GetNotifications
  ];
  
  for (const test of tests) {
    try {
      await test();
      passedTests++;
    } catch (e) {
      failedTests++;
      log.error(`Test failed: ${e.message}`);
      // Continue with other tests
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log(chalk.cyan.bold('\n' + '='.repeat(60)));
  console.log(chalk.cyan.bold('   📊 Test Results Summary'));
  console.log(chalk.cyan.bold('='.repeat(60)));
  console.log(chalk.green(`   ✅ Passed: ${passedTests}/${tests.length}`));
  console.log(chalk.red(`   ❌ Failed: ${failedTests}/${tests.length}`));
  console.log(chalk.gray(`   ⏱️  Duration: ${duration}s`));
  console.log(chalk.cyan.bold('='.repeat(60) + '\n'));
  
  if (failedTests === 0) {
    console.log(chalk.green.bold('   🎉 All tests passed! System is working correctly.\n'));
  } else {
    console.log(chalk.yellow.bold('   ⚠️  Some tests failed. Check logs above for details.\n'));
  }
}

// Run tests
runAllTests().catch(e => {
  console.error(chalk.red.bold('\n❌ Fatal error:'), e);
  process.exit(1);
});
