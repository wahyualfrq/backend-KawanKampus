const axios = require('axios');

const url = 'https://recommendation-system-kawan-kampus-373249330407.asia-southeast2.run.app/recommend';

async function testFormatC() {
  console.log('Testing Format C...');
  const payload = {
    kampus: "Universitas Gadjah Mada",
    kategori: "Makanan",
    kategori_jarak: "Jalan Kaki",
    top_n: 20
  };
  try {
    const res = await axios.post(url, payload, { timeout: 5000 });
    console.log('Format C Success!', JSON.stringify(res.data, null, 2).slice(0, 800));
  } catch (err) {
    console.log('Format C Failed:', err.response?.status, JSON.stringify(err.response?.data, null, 2));
  }
}

async function run() {
  await testFormatC();
}

run();
