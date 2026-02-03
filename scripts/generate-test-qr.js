#!/usr/bin/env node
/**
 * Generates a test QR code image
 * Usage: node scripts/generate-test-qr.js "text to encode" output.png
 */

const QRCode = require('qrcode');
const fs = require('fs');

const text = process.argv[2] || 'https://github.com/cloudwalk/opencell';
const output = process.argv[3] || 'qr-code.png';

QRCode.toBuffer(text, {
  errorCorrectionLevel: 'H',
  type: 'png',
  width: 512,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
})
.then(buffer => {
  fs.writeFileSync(output, buffer);
  console.log(`✓ QR Code saved to: ${output}`);
  console.log(`  Text: ${text}`);
})
.catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
