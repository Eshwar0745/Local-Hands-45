import fs from 'fs';
import path from 'path';

const baseDir = process.cwd();
const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const buffer = Buffer.from(dummyPngBase64, 'base64');

// Create a few dummy images
fs.writeFileSync(path.join(baseDir, 'dummy_license.png'), buffer);
fs.writeFileSync(path.join(baseDir, 'dummy_work_before.png'), buffer);
fs.writeFileSync(path.join(baseDir, 'dummy_work_after.png'), buffer);

console.log('✅ Dummy images created successfully!');
