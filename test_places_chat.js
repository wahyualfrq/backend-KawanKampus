/**
 * test_places_chat.js
 * Manual test — calls AI_API_URL /chat directly and via backend.
 * Run: node test_places_chat.js
 */
require('dotenv').config();
const axios = require('axios');

const AI_API_URL = process.env.AI_API_URL || 'https://kawankampus-chatbot-373249330407.asia-southeast2.run.app';

const TESTS = [
  { uni: 'Universitas Gadjah Mada',     cat: 'Fotokopi', lat: -7.7733153,  lon: 110.3892489  },
  { uni: 'Universitas Gadjah Mada',     cat: 'Makanan',  lat: -7.7733153,  lon: 110.3892489  },
  { uni: 'Universitas Gadjah Mada',     cat: 'Cafe',     lat: -7.7733153,  lon: 110.3892489  },
  { uni: 'STMIK IKMI CIREBON',          cat: 'Fotokopi', lat: -6.7357684,  lon: 108.53979385 },
];

async function runTest({ uni, cat, lat, lon }) {
  const payload = {
    user_id:        'test-user',
    session_id:     `test_places_${Date.now()}`,
    message:        '',
    special_action: 'recommendation_proximity',
    selected_uni:   uni,
    selected_cat:   cat,
    lat,
    lon,
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${uni} + ${cat}`);
  console.log(`URL:  POST ${AI_API_URL}/chat`);
  console.log(`PAYLOAD:`, JSON.stringify(payload, null, 2));

  try {
    const res = await axios.post(`${AI_API_URL}/chat`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
    });

    console.log(`STATUS: ${res.status}`);
    console.log(`RAW RESPONSE:`, JSON.stringify(res.data, null, 2));

    const recs = res.data?.recommendations || res.data?.results || [];
    console.log(`\n✅  recommendations count: ${recs.length}`);
    recs.forEach((r, i) => console.log(`   [${i+1}] ${r.name} | ${r.distance || '-'} | ${r.map_link ? 'has map_link' : 'no map_link'}`));

  } catch (err) {
    console.log(`STATUS: ${err.response?.status || 'NO_RESPONSE'}`);
    console.log(`❌  ERROR:`, err.response?.data || err.message);
  }
}

(async () => {
  console.log(`\nAI_API_URL = ${AI_API_URL}\n`);
  for (const t of TESTS) {
    await runTest(t);
  }
  console.log(`\n${'='.repeat(60)}`);
  console.log('Tests complete.');
  process.exit(0);
})();
