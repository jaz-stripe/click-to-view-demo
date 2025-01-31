const devcert = require('devcert');
const fs = require('fs');

async function generateCert() {
  try {
    const ssl = await devcert.certificateFor('localhost');
    fs.writeFileSync('localhost-key.pem', ssl.key);
    fs.writeFileSync('localhost.pem', ssl.cert);
    console.log('SSL certificates generated successfully.');
  } catch (err) {
    console.error('Error generating SSL certificates:', err);
  }
}

generateCert();

