const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.RECOMMENDATION_API_URL || 'https://recommendation-system-kawan-kampus-373249330407.asia-southeast2.run.app';

console.log('Testing against recommendation service URL:', BASE_URL);

async function testEndpoint(endpoint, payload) {
  const url = `${BASE_URL.replace(/\/$/, '')}${endpoint}`;
  console.log(`\n========================================`);
  console.log(`ENDPOINT: ${url}`);
  console.log(`PAYLOAD:`, JSON.stringify(payload, null, 2));
  console.log(`========================================`);

  try {
    const start = Date.now();
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    const duration = Date.now() - start;

    console.log(`Status: ${response.status} (${response.statusText})`);
    console.log(`Response time: ${duration}ms`);
    
    // Extract list
    let list = [];
    const raw = response.data;
    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.value)) list = raw.value;
      else if (Array.isArray(raw.recommendations)) list = raw.recommendations;
      else if (Array.isArray(raw.results)) list = raw.results;
      else if (Array.isArray(raw.data)) list = raw.data;
      else if (raw.data && Array.isArray(raw.data.recommendations)) list = raw.data.recommendations;
      else if (raw.data && Array.isArray(raw.data.results)) list = raw.data.results;
    }
    
    console.log(`Raw count: ${list.length}`);
    if (list.length > 0) {
      console.log('Sample item:', JSON.stringify(list[0], null, 2));
    } else {
      console.log('Raw response:', JSON.stringify(response.data, null, 2));
    }
    return { success: true, list, data: response.data };
  } catch (error) {
    console.error(`ERROR:`, error.response?.data || error.message);
    return { success: false, error: error.message, details: error.response?.data };
  }
}

async function testLocalService() {
  console.log('\n========================================');
  console.log('TESTING LOCAL INTEGRATED PLACE SERVICE...');
  console.log('========================================');
  
  try {
    const placeService = require('./src/modules/place/place.service');
    
    // Test 1: getRecommendations with "Semua"
    console.log('\n--- Test 1: Kategori "Semua" (UGM) ---');
    const resAll = await placeService.getRecommendations('mock-user-id', {
      selected_uni: 'Universitas Gadjah Mada',
      selected_cat: 'Semua',
      lat: -7.7733153,
      lon: 110.3892489
    });
    console.log(`Endpoint Used: ${resAll.endpointUsed}`);
    console.log(`Returned Count: ${resAll.returnedCount}`);
    if (resAll.recommendations.length > 0) {
      console.log('Sample normalized item:', JSON.stringify(resAll.recommendations[0], null, 2));
    }
    
    // Test 2: getRecommendations with specific category "Fotokopi"
    console.log('\n--- Test 2: Kategori "Fotokopi" (UGM) ---');
    const resCat = await placeService.getRecommendations('mock-user-id', {
      selected_uni: 'Universitas Gadjah Mada',
      selected_cat: 'Fotokopi',
      lat: -7.7733153,
      lon: 110.3892489
    });
    console.log(`Endpoint Used: ${resCat.endpointUsed}`);
    console.log(`Returned Count: ${resCat.returnedCount}`);
    
    // Test 3: getRecommendations with search query "photo"
    console.log('\n--- Test 3: Search "photo" (UGM) ---');
    const resSearch = await placeService.getRecommendations('mock-user-id', {
      selected_uni: 'Universitas Gadjah Mada',
      selected_cat: 'Semua',
      lat: -7.7733153,
      lon: 110.3892489,
      searchQuery: 'photo'
    });
    console.log(`Endpoint Used: ${resSearch.endpointUsed}`);
    console.log(`Returned Count: ${resSearch.returnedCount}`);
    if (resSearch.recommendations.length > 0) {
      console.log('Sample normalized item:', JSON.stringify(resSearch.recommendations[0], null, 2));
    }
    
  } catch (error) {
    console.error('Service Test Failed:', error);
  }
}

async function runTests() {
  // Test 1: /recommend/all
  await testEndpoint('/recommend/all', {
    kampus: 'Universitas Gadjah Mada',
    kategori_jarak: 'Jalan Kaki',
    latitude: -7.7733153,
    longitude: 110.3892489,
    top_n: 100
  });

  // Test 2: /recommend UGM + Cetak
  await testEndpoint('/recommend', {
    kampus: 'Universitas Gadjah Mada',
    kategori: 'Cetak',
    kategori_jarak: 'Jalan Kaki',
    latitude: -7.7733153,
    longitude: 110.3892489,
    top_n: 100
  });

  // Test 3: /recommend UGM + Makanan
  await testEndpoint('/recommend', {
    kampus: 'Universitas Gadjah Mada',
    kategori: 'Makanan',
    kategori_jarak: 'Jalan Kaki',
    latitude: -7.7733153,
    longitude: 110.3892489,
    top_n: 100
  });

  // Test 4: /search UGM + "photo"
  await testEndpoint('/search', {
    kampus: 'Universitas Gadjah Mada',
    query: 'photo',
    latitude: -7.7733153,
    longitude: 110.3892489,
    top_n: 100
  });

  // Test 5: /search UGM + "kopi"
  await testEndpoint('/search', {
    kampus: 'Universitas Gadjah Mada',
    query: 'kopi',
    latitude: -7.7733153,
    longitude: 110.3892489,
    top_n: 100
  });

  await testLocalService();
}

runTests();
