const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seed: Starting database seeding...');

  // 1. Clean up existing data to prevent duplicate key errors during seed re-run
  console.log('Seed: Cleaning up database tables...');
  await prisma.chatLog.deleteMany({});
  await prisma.history.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.userSetting.deleteMany({});
  await prisma.place.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Hash password for test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 3. Create test user
  console.log('Seed: Creating test users...');
  const user = await prisma.user.create({
    data: {
      email: 'test@kawankampus.com',
      password: hashedPassword,
      name: 'Mahasiswa KawanKampus',
      university: 'Universitas Gadjah Mada',
      faculty: 'Teknik',
      prodi: 'Teknologi Informasi',
      cohortYear: '2022',
      gender: 'Laki-laki',
      bio: 'Semangat belajar dan berkolaborasi di KawanKampus!',
    },
  });
  console.log(`Seed: Created user with email: ${user.email} (ID: ${user.id})`);

  // 4. Create user settings
  console.log('Seed: Creating user settings...');
  const setting = await prisma.userSetting.create({
    data: {
      userId: user.id,
      theme: 'dark',
      language: 'id',
      distanceUnit: 'meter',
      timezone: 'WIB',
    },
  });
  console.log(`Seed: Created user settings for ${user.name}`);

  // 5. Create some default places
  console.log('Seed: Creating mock places near UGM...');
  const placesData = [
    {
      googleId: 'place-ugm-photocopy-1',
      name: 'Fotokopi & Print Cepat UGM',
      category: 'PHOTOCOPY',
      rawCategory: 'Fotokopi',
      address: 'Jl. Kaliurang No.12, Senolowo, Sinduadi, Mlati, Sleman, Yogyakarta',
      lat: -7.773120,
      lng: 110.389450,
    },
    {
      googleId: 'place-ugm-food-1',
      name: 'Warteg Bahari Kampus UGM',
      category: 'FOOD',
      rawCategory: 'Makanan',
      address: 'Jl. Lembah UGM, Karang Gayam, Caturtunggal, Depok, Sleman, Yogyakarta',
      lat: -7.774500,
      lng: 110.388800,
    },
    {
      googleId: 'place-ugm-atk-1',
      name: 'Toko Buku & Alat Tulis Murni UGM',
      category: 'ATK',
      rawCategory: 'ATK',
      address: 'Jl. Pancasila No.3, Bulaksumur, Caturtunggal, Depok, Sleman, Yogyakarta',
      lat: -7.771950,
      lng: 110.387900,
    },
  ];

  const createdPlaces = [];
  for (const p of placesData) {
    const place = await prisma.place.create({ data: p });
    createdPlaces.push(place);
    console.log(`Seed: Created place: ${place.name} (${place.category})`);
  }

  // 6. Create some favorites
  console.log('Seed: Creating favorites...');
  await prisma.favorite.create({
    data: {
      userId: user.id,
      placeId: createdPlaces[0].id,
    },
  });
  console.log(`Seed: Added ${createdPlaces[0].name} to favorites`);

  // 7. Create some tasks (Kanban)
  console.log('Seed: Creating tasks...');
  const tasksData = [
    {
      title: 'Registrasi Akun KawanKampus',
      description: 'Menyelesaikan setup database dan membuat akun testing pertama.',
      status: 'DONE',
      category: 'Akademik',
      priority: 'High',
      userId: user.id,
    },
    {
      title: 'Mencari Rekomendasi Tempat',
      description: 'Mencoba fitur pencarian tempat fotokopi terdekat dari UGM.',
      status: 'IN_PROGRESS',
      category: 'Lainnya',
      priority: 'Medium',
      userId: user.id,
    },
    {
      title: 'Mempersiapkan Presentasi Proyek',
      description: 'Menyusun materi presentasi untuk review modul asisten AI Chatbot.',
      status: 'TODO',
      category: 'Proyek',
      priority: 'High',
      userId: user.id,
    },
  ];

  for (const t of tasksData) {
    const task = await prisma.task.create({ data: t });
    console.log(`Seed: Created task: "${task.title}" (Status: ${task.status})`);
  }

  // 8. Create some chat logs
  console.log('Seed: Creating chat logs...');
  await prisma.chatLog.create({
    data: {
      userId: user.id,
      message: 'Apakah ada rekomendasi tempat makan murah di dekat UGM?',
      response: 'Tentu! Ada Warteg Bahari Kampus UGM yang berjarak sekitar 200 meter dari pusat kampus dengan harga terjangkau.',
    },
  });

  // 9. Create some history entries
  console.log('Seed: Creating histories...');
  await prisma.history.create({
    data: {
      userId: user.id,
      action: 'SEARCHED_PLACE',
      metadata: {
        campus: 'Universitas Gadjah Mada',
        category: 'Makanan',
        resultCount: 1,
        source: 'places_recommendation',
      },
    },
  });

  console.log('Seed: Database seeding completed successfully! 🎉');
}

main()
  .catch((e) => {
    console.error('Seed: Error during seeding process:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
