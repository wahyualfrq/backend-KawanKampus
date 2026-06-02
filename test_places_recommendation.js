const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Ensure development env logs are active
process.env.NODE_ENV = 'development';
require('dotenv').config({ path: path.join(__dirname, '.env') });

const config = require('./src/common/config/env');
const placeService = require('./src/modules/place/place.service');

const TEST_CASES = [
  { campus: 'Universitas Gadjah Mada', category: 'Fotokopi' },
  { campus: 'Universitas Gadjah Mada', category: 'Makanan' },
  { campus: 'Universitas Gadjah Mada', category: 'Semua' },
  { campus: 'STMIK IKMI CIREBON', category: 'Fotokopi' },
  { campus: 'UNIVERSITAS MULTI DATA PALEMBANG', category: 'Semua' }
];

async function testDirectService() {
  console.log('==================================================');
  console.log('1. TESTING DIRECT BACKEND PLACE.SERVICE.JS LOGIC');
  console.log('==================================================\n');

  for (let i = 0; i < TEST_CASES.length; i++) {
    const { campus, category } = TEST_CASES[i];
    console.log(`--------------------------------------------------`);
    console.log(`[Service] Case ${i + 1}: ${campus} + ${category}`);
    console.log(`--------------------------------------------------`);

    try {
      const result = await placeService.getRecommendations('test-user-id', {
        selected_uni: campus,
        selected_cat: category,
        lat: 0,
        lon: 0
      });

      console.log(`\n[SUCCESS] completed successfully.`);
      console.log(`Recommendations: ${result.recommendations.length}`);
      console.log(`returnedCount: ${result.returnedCount}, limit: ${result.limit}, totalBeforeLimit: ${result.totalBeforeLimit}`);
      if (result.recommendations.length > 0) {
        console.log('Sample item name:', result.recommendations[0].name);
      }
    } catch (error) {
      console.error(`\n[FAILED] error:`, error.message);
    }
    console.log('\n');
  }
}

async function testLocalBackendEndpoint() {
  console.log('==================================================');
  console.log('2. TESTING LOCAL BACKEND HTTP ENDPOINT via axios');
  console.log('POST http://localhost:3000/api/v1/places/recommend');
  console.log('==================================================\n');

  // Sign a JWT token for the local API call using the backend secret
  const token = jwt.sign({ userId: 'test-user-id' }, config.jwtSecret || 'secret');

  for (let i = 0; i < TEST_CASES.length; i++) {
    const { campus, category } = TEST_CASES[i];
    console.log(`--------------------------------------------------`);
    console.log(`[API] Case ${i + 1}: ${campus} + ${category}`);
    console.log(`--------------------------------------------------`);

    try {
      const response = await axios.post('http://localhost:3000/api/v1/places/recommend', {
        selected_uni: campus,
        selected_cat: category,
        lat: 0,
        lon: 0
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 15000
      });

      const body = response.data;
      console.log(`\n[SUCCESS] Response status: ${response.status}`);
      console.log('Response metadata keys:', Object.keys(body.data || {}));
      console.log(`returnedCount: ${body.data?.returnedCount}, limit: ${body.data?.limit}, totalBeforeLimit: ${body.data?.totalBeforeLimit}`);
      console.log(`Recommendations length: ${body.data?.recommendations?.length}`);
      if (body.data?.recommendations?.length > 0) {
        console.log('First recommendation:', JSON.stringify(body.data.recommendations[0], null, 2));
      }
    } catch (error) {
      console.error(`\n[FAILED] error:`, error.message);
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      }
    }
    console.log('\n');
  }
}

async function run() {
  await testDirectService();
  await testLocalBackendEndpoint();
}

run();
