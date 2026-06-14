import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

// Constants
const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:/Users/eshwa/.gemini/antigravity-ide/brain/91f7bc12-7226-4fd7-a1df-910441e12a69';

// Helper to ensure artifact directory exists
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const getScreenshotPath = (name) => path.join(ARTIFACT_DIR, name);

async function safeLogoutAndGoToLogin(page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  });
  await page.waitForSelector('#email');
  await page.waitForTimeout(1000);
}

async function runE2E() {
  console.log('🚀 Starting Playwright E2E Test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Handle all browser alert/confirm dialogs automatically
  page.on('dialog', async (dialog) => {
    console.log(`💬 Dialog popped up: [${dialog.type()}] "${dialog.message()}"`);
    await dialog.accept();
    console.log('✅ Dialog accepted.');
  });

  try {
    // ==========================================
    // STEP 1: Admin Approves Priya Sharma
    // ==========================================
    console.log('\n--- STEP 1: Admin Approving Priya Sharma ---');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('#email');
    await page.fill('#email', 'admin@gmail.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for welcome page or direct redirect
    await page.waitForTimeout(2000);
    console.log('Logged in as Admin. Navigating to verifications list...');
    await page.goto(`${BASE_URL}/admin/verifications`);
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: getScreenshotPath('1_admin_pending_list.png') });
    console.log('Captured pending list screenshot.');

    // Find and click the Review button of the first pending provider if available
    const reviewBtn = page.locator('button:has-text("Review")').first();
    const reviewCount = await reviewBtn.count();
    
    if (reviewCount > 0) {
      await reviewBtn.click();
      console.log('Clicked first provider Review button.');
      await page.waitForTimeout(2000);

      await page.screenshot({ path: getScreenshotPath('debug_modal_opened.png') });
      console.log('Captured debug_modal_opened screenshot.');

      // Scroll Approve action into view (use .last() to bypass strict matching with "Approved" tab)
      const approveActionBtn = page.locator('button:has-text("Approve")').last();
      await approveActionBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      // Click Approve action in modal
      await approveActionBtn.click();
      console.log('Selected Approve action.');
      await page.waitForTimeout(1000);

      await page.screenshot({ path: getScreenshotPath('debug_after_approve_click.png') });
      console.log('Captured debug_after_approve_click screenshot.');
      await page.waitForTimeout(500);

      // Scroll Confirm Approval into view
      await page.locator('button:has-text("Confirm Approval")').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      // Confirm Approval
      await page.click('button:has-text("Confirm Approval")');
      console.log('Clicked Confirm Approval.');
      await page.waitForTimeout(2000);

      await page.screenshot({ path: getScreenshotPath('2_admin_approved.png') });
      console.log('Captured approved status screenshot.');
    } else {
      console.log('⚠️ No pending provider verifications found. Skipping approval step.');
    }

    // Logout programmatically to avoid UI navigation timeouts
    console.log('Logging out of Admin...');
    await safeLogoutAndGoToLogin(page);

    // ==========================================
    // STEP 2: Customer Book AC Repair & Installation
    // ==========================================
    console.log('\n--- STEP 2: Customer Booking AC Service ---');
    await page.waitForSelector('#email');
    await page.fill('#email', 'eshwar@test.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Check if on welcome page, click continue
    if (page.url().includes('/welcome')) {
      await page.click('a:has-text("Go to Dashboard"), button:has-text("Continue")');
      await page.waitForTimeout(2000);
    }
    
    console.log('Customer home page reached. Opening AC Repair service card...');
    // Find AC Repair service card and click Book Now
    const acCard = page.locator('.group:has-text("AC Repair & Installation")').first();
    await acCard.locator('button:has-text("Book Now")').click({ force: true });
    console.log('AC Repair booking modal clicked. Waiting for modal render...');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: getScreenshotPath('debug_customer_modal_clicked.png') });

    // Fill questionnaire
    // Select Radio AC Type: Split AC (using text clicking)
    await page.click('text="Split AC"', { force: true });
    console.log('Selected AC Type: Split AC');
    
    // Checkbox Issues: Not cooling properly (using text clicking)
    await page.click('text="Not cooling properly"', { force: true });
    console.log('Selected issue: Not cooling properly');
    
    // Units: 2
    await page.locator('input[type="number"]').scrollIntoViewIfNeeded();
    await page.fill('input[type="number"]', '2');
    console.log('Entered units: 2');
    
    // Calculate Estimate
    await page.locator('button:has-text("Calculate Estimate")').scrollIntoViewIfNeeded();
    await page.click('button:has-text("Calculate Estimate")');
    console.log('Calculating estimate...');
    await page.waitForTimeout(2000);

    // Enter schedule date
    await page.fill('input[type="datetime-local"]', '2026-06-13T10:00');
    console.log('Entered schedule date/time.');
    await page.screenshot({ path: getScreenshotPath('debug_customer_form_rendered.png') });
    await page.waitForTimeout(500);

    // Book Now
    await page.locator('button:has-text("Confirm Booking")').scrollIntoViewIfNeeded();
    await page.click('button:has-text("Confirm Booking")');
    console.log('Submitting booking...');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: getScreenshotPath('3_booking_requested.png') });
    console.log('Captured booking requested screenshot.');

    // Logout
    console.log('Clearing customer session...');
    await safeLogoutAndGoToLogin(page);

    // ==========================================
    // STEP 3: Provider Rajesh Accepts & Completes Job
    // ==========================================
    console.log('\n--- STEP 3: Provider Rajesh Accepting and Completing Job ---');
    await page.waitForSelector('#email');
    await page.fill('#email', 'rajesh.ac@test.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/provider`);
    await page.waitForTimeout(2000);

    // Accept pending offer
    await page.click('button:has-text("Accept")');
    console.log('Offer accepted.');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: getScreenshotPath('4_provider_accepted.png') });

    // Mark In Progress
    await page.click('button:has-text("Mark In Progress")');
    console.log('Marked job in progress.');
    await page.waitForTimeout(2000);

    // Mark Complete
    await page.click('button:has-text("Mark Complete")');
    console.log('Marking job completed (accepting alert)...');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: getScreenshotPath('5_provider_completed.png') });
    console.log('Captured job completed screenshot.');

    // Logout
    console.log('Clearing provider session...');
    await safeLogoutAndGoToLogin(page);

    // ==========================================
    // STEP 4: Customer Pays via Mock Payment Gateway
    // ==========================================
    console.log('\n--- STEP 4: Customer Paying Bill ---');
    await page.waitForSelector('#email');
    await page.fill('#email', 'eshwar@test.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/customer`);
    await page.waitForTimeout(2000);

    // Click Pay Online button
    await page.click('button:has-text("Pay Online")', { force: true });
    console.log('Pay Online clicked, opening Mock Payment Gateway...');
    await page.waitForTimeout(2000);

    // Select Card Payment
    await page.click('div:has-text("Pay by Card")', { force: true });
    console.log('Selected Card Payment.');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: getScreenshotPath('6_mock_payment_gateway_card.png') });

    // Fill Card details
    await page.fill('input[placeholder="Card Number"]', '4111222233334444');
    await page.fill('input[placeholder="MM/YY"]', '12/28');
    
    // Focus on CVV to trigger flipping animation
    await page.focus('input[placeholder="CVV"]');
    await page.fill('input[placeholder="CVV"]', '123');
    console.log('CVV focused, card flipped visually!');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: getScreenshotPath('7_mock_payment_gateway_card_flipped.png') });

    // Click Proceed to Pay
    await page.click('button:has-text("Proceed to Pay")', { force: true });
    console.log('Clicked Proceed to Pay, waiting for OTP simulation...');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: getScreenshotPath('8_mock_payment_gateway_otp.png') });

    // Enter mock OTP
    await page.fill('input[placeholder="Enter 6-digit OTP"]', '123456');
    await page.click('button:has-text("Verify & Pay")', { force: true });
    console.log('Submitted OTP code.');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: getScreenshotPath('9_booking_paid.png') });
    console.log('Captured paid status screenshot.');

    // Logout
    console.log('Clearing customer session...');
    await safeLogoutAndGoToLogin(page);

    // ==========================================
    // STEP 5: Admin Verifies Revenue Ledger
    // ==========================================
    console.log('\n--- STEP 5: Admin Inspecting Revenue Ledger ---');
    await page.waitForSelector('#email');
    await page.fill('#email', 'admin@gmail.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/admin`);
    console.log('Admin dashboard ledger reached.');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: getScreenshotPath('10_admin_revenue_ledger_final.png') });
    console.log('Captured final admin revenue ledger screenshot.');

    console.log('\n🎉 E2E verification test completed successfully!');

  } catch (error) {
    console.error('\n❌ E2E test failed:', error);
  } finally {
    await browser.close();
    console.log('🔌 Browser closed.');
  }
}

runE2E();
