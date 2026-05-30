# KawanKampus Backend API

KawanKampus adalah platform backend modular yang dirancang untuk mendukung kebutuhan mahasiswa, mencakup manajemen tugas (Kanban), rekomendasi tempat di sekitar kampus, dan asisten AI Chatbot. 

Kini dioptimalkan untuk **Vercel Serverless** dan terintegrasi dengan **Supabase PostgreSQL**.

---

## 🚀 Fitur Utama
- **Authentication**: Registrasi, Login, dan manajemen session menggunakan JWT.
- **Kanban Task Management**: CRUD tugas dengan status (`TODO`, `IN_PROGRESS`, `DONE`).
- **AI Chatbot Proxy**: Integrasi dengan layanan AI untuk asisten mahasiswa.
- **Nearby Places**: Mencari lokasi penting (kafe, perpustakaan, dll) di sekitar koordinat tertentu.
- **Favorites**: Menyimpan lokasi-lokasi favorit pengguna.
- **Robust Validation**: Validasi data input menggunakan Zod.
- **Clean Architecture**: Pemisahan logic menggunakan pola Repository-Service-Controller.
- **Production Ready**: Dilengkapi dengan Helmet, CORS dinamis, kompresi GZIP, Rate Limiting, dan global exception handling.

## 🛠️ Tech Stack
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [PostgreSQL (Supabase)](https://supabase.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Driver**: [node-postgres (pg)](https://node-postgres.com/) dengan Global Pool Singleton
- **Deployment**: [Vercel Serverless](https://vercel.com/)

---

## ⚙️ Instalasi & Pengembangan Lokal

1. **Clone repository**:
   ```bash
   git clone https://github.com/wahyualfrq/backend-KawanKampus.git
   cd backend-KawanKampus
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Setup Environment Variables**:
   Buat file `.env` di root directory:
   ```env
   PORT=3000
   NODE_ENV=development
   
   # Untuk Migrasi/Push (Port 5432)
   DATABASE_URL="postgresql://postgres.ciieuslelpandfbslelb:PASSWORD@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?connection_limit=10"
   
   # Untuk Runtime/Production (Port 6543 dengan PgBouncer)
   # DATABASE_URL="postgresql://postgres.ciieuslelpandfbslelb:PASSWORD@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"

   JWT_SECRET="kawankampus-super-secret-jwt-key-2024"
   JWT_EXPIRES_IN="7d"
   ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
   ```

4. **Prisma Setup**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Jalankan Server Lokal**:
   ```bash
   # Menggunakan Auto-reload
   npm run dev
   ```

---

## 📡 API Endpoints (v1)

### 🟢 Public Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Selamat datang & Info Serverless Server |
| `GET` | `/health` | Memeriksa kesehatan API |
| `POST` | `/api/v1/auth/register` | Pendaftaran user baru |
| `POST` | `/api/v1/auth/login` | Login user untuk mendapatkan JWT token |
| `GET` | `/api/v1/places/config` | Konfigurasi fallback koordinat lokal |

### 🔒 Protected Endpoints (Memerlukan `Authorization: Bearer <token>`)

#### Auth & Profil
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/auth/me` | Detail user login saat ini |
| `GET` | `/api/v1/settings/profile` | Mengambil data profil lengkap (termasuk `prodi`) |
| `PUT` | `/api/v1/settings/profile` | Memperbarui detail profil user (termasuk `prodi`) |

#### Pengaturan & Keamanan (`/api/v1/settings`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/settings/preferences` | Mengambil preferensi user (tema, bahasa, unit) |
| `PUT` | `/api/v1/settings/preferences` | Memperbarui preferensi user |
| `PUT` | `/api/v1/settings/security/password` | Mengubah password |
| `DELETE` | `/api/v1/settings/account` | Menghapus akun secara permanen |
| `POST` | `/api/v1/settings/privacy/clear-history` | Menghapus riwayat chat AI & aktivitas |

#### Kanban Tasks (`/api/v1/tasks`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/tasks` | List semua tugas Kanban user |
| `POST` | `/api/v1/tasks` | Membuat tugas baru |
| `PATCH` | `/api/v1/tasks/:id` | Update status (`TODO`/`IN_PROGRESS`/`DONE`) atau konten |
| `DELETE` | `/api/v1/tasks/:id` | Menghapus tugas |

#### Chatbot AI (`/api/v1/chatbot`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/chatbot` | Mengobrol dengan AI pembantu tugas (*task-help*) |
| `POST` | `/api/v1/chatbot/place-recommendation` | Rekomendasi tempat berbasis AI chatbot |

#### Tempat & Favorit
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/places/nearby` | Cari tempat penting (ATK/Makanan) sekitar koordinat |
| `POST` | `/api/v1/places/recommend` | Rekomendasi tempat berbasis AI khusus |
| `GET` | `/api/v1/favorites` | List tempat yang difavoritkan |
| `POST` | `/api/v1/favorites` | Menambahkan tempat ke daftar favorit |
| `DELETE` | `/api/v1/favorites/:placeId` | Menghapus tempat dari favorit |

---

## 📁 Struktur Proyek
```text
api/
└── index.js             # Vercel Serverless Entrypoint (Zero-Config)
prisma/
└── schema.prisma        # Skema Prisma & Binary Target Setup
src/
├── app.js               # Core Express & Global Exception handler
├── server.js            # Runner Lokal
├── config/
│   └── database.js      # Pg Pool global singleton
├── common/              # Config, Middleware, & Validators global
└── modules/             # Domain modules (auth, task, chatbot, place, dll)
```
