import twilio from 'twilio';

// Lazy initialization - client will be created when first needed
let client = null;

/**
 * Get or create Twilio client
 */
const getTwilioClient = () => {
  if (client) return client;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // Debug: Check if credentials are loaded
  console.log('[Twilio] Credentials check:', {
    accountSid: accountSid ? `${accountSid.substring(0, 10)}...` : 'MISSING',
    authToken: authToken ? `${authToken.substring(0, 10)}...` : 'MISSING',
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'MISSING'
  });

  // Validate credentials
  if (!accountSid || !authToken) {
    console.error('❌ Twilio credentials missing! Check .env file.');
    console.error('Expected format in .env:');
    console.error('TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    console.error('TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    throw new Error('Twilio credentials not configured. Please check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env file');
  }

  client = twilio(accountSid, authToken);
  console.log('✅ Twilio client initialized successfully');
  return client;
};

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via WhatsApp
 * @param {string} phoneNumber - User's phone number (format: +919876543210)
 * @param {string} otp - 6-digit OTP code
 */
export const sendWhatsAppOTP = async (phoneNumber, otp) => {
  try {
    // Get Twilio client (lazy initialization)
    const twilioClient = getTwilioClient();
    const envFrom = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!envFrom) {
      throw new Error('TWILIO_WHATSAPP_NUMBER not configured in .env file');
    }

    // Normalize FROM to ensure it has the required whatsapp: prefix
    const fromWhatsapp = envFrom.startsWith('whatsapp:') ? envFrom : `whatsapp:${envFrom}`;

    // Ensure phone number has + prefix
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    const message = await twilioClient.messages.create({
      from: fromWhatsapp,
      to: `whatsapp:${formattedPhone}`,
      body: `🔐 Your LocalHands verification code is: *${otp}*\n\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone.`
    });

    console.log(`WhatsApp OTP sent to ${formattedPhone}:`, message.sid);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error('Error sending WhatsApp OTP:', error);
    throw new Error(`Failed to send WhatsApp OTP: ${error.message}`);
  }
};

/**
 * Send welcome message via WhatsApp
 * @param {string} phoneNumber - User's phone number
 * @param {string} name - User's name
 */
export const sendWelcomeMessage = async (phoneNumber, name) => {
  try {
    const twilioClient = getTwilioClient();
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    const message = await twilioClient.messages.create({
      from: whatsappNumber,
      to: `whatsapp:${formattedPhone}`,
      body: `👋 Welcome to LocalHands, ${name}!\n\nYour account has been successfully created. You can now start booking services or providing services in your area.\n\nThank you for joining us! 🎉`
    });

    console.log(`Welcome message sent to ${formattedPhone}:`, message.sid);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error('Error sending welcome message:', error);
    // Don't throw error - welcome message is not critical
    return { success: false, error: error.message };
  }
};

export default {
  generateOTP,
  sendWhatsAppOTP,
  sendWelcomeMessage
};
