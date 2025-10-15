// Load environment variables BEFORE importing the rest of the app so that
// any module reading process.env during its top-level execution (e.g. mailer)
// sees the populated values.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Explicitly resolve .env relative to backend root to avoid CWD issues
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
// Diagnostic: log whether MAIL_PASS is visible at startup (masked)
(() => {
	const raw = process.env.MAIL_PASS || '';
	console.log(`[startup] MAIL_PASS present=${raw ? 'yes' : 'no'} length=${raw.trim().length}`);
})();
// Diagnostic: Check Twilio credentials
(() => {
	const sid = process.env.TWILIO_ACCOUNT_SID || '';
	const token = process.env.TWILIO_AUTH_TOKEN || '';
	const number = process.env.TWILIO_WHATSAPP_NUMBER || '';
	console.log(`[startup] TWILIO_ACCOUNT_SID present=${sid ? 'yes' : 'no'} length=${sid.length}`);
	console.log(`[startup] TWILIO_AUTH_TOKEN present=${token ? 'yes' : 'no'} length=${token.length}`);
	console.log(`[startup] TWILIO_WHATSAPP_NUMBER present=${number ? 'yes' : 'no'} value=${number}`);
})();
import app from './app.js';
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
