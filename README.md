# KawanKampus Backend API

KawanKampus adalah platform backend modular yang dirancang untuk mendukung kebutuhan mahasiswa, mencakup manajemen tugas (Kanban), rekomendasi tempat di sekitar kampus, asisten AI Chatbot, dan riwayat aktivitas pengguna.

Backend ini dikembangkan menggunakan **Node.js** dan **Express.js**, dioptimalkan untuk berjalan pada arsitektur **Vercel Serverless**, serta menggunakan database **PostgreSQL** yang diinjeksi via **Prisma ORM**.

---

## 📌 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Tech Stack](#-tech-stack)
3. [Arsitektur & Struktur Proyek](#-arsitektur--struktur-proyek)
4. [Skema Database (Prisma PostgreSQL)](#-skema-database-prisma-postgresql)
5. [Variabel Lingkungan (Environment Variables)](#-variabel-lingkungan-environment-variables)
6. [Panduan Instalasi & Pengembangan Lokal](#-panduan-instalasi--pengembangan-lokal)
7. [Dokumentasi API Endpoints (v1)](#-dokumentasi-api-endpoints-v1)
8. [Detail Keamanan & Optimasi Produksi](#-detail-keamanan--optimasi-produksi)
9. [Deployment ke Vercel Serverless](#-deployment-ke-vercel-serverless)

---

## 🚀 Fitur Utama
- **Autentikasi Pengguna**: Registrasi, Login, dan manajemen session aman menggunakan JWT (JSON Web Token) dan enkripsi kata sandi menggunakan `bcrypt`.
- **Manajemen Tugas Kanban**: CRUD tugas modular dengan kategori (*Akademik*, *Proyek*, *Organisasi*, dll.), prioritas (*Low*, *Medium*, *High*), tenggat waktu, dan status (*TODO*, *IN_PROGRESS*, *DONE*).
- **Rekomendasi Tempat Terdekat**: Fitur pencarian tempat penting (Fotokopi, Makanan, Cafe, dll.) dengan fallback koordinat kampus lokal dan integrasi Google Maps API.
- **Asisten AI Chatbot**: Chatbot interaktif untuk membantu tugas kuliah (*task-mode*) dan asisten pencarian rekomendasi tempat di sekitar kampus.
- **Favorit Tempat**: Menyimpan lokasi-lokasi penting ke dalam daftar favorit masing-masing pengguna.
- **Pencatatan Riwayat Aktivitas**: Menyimpan riwayat pencarian tempat, pembuatan tugas, penyelesaian tugas, dan obrolan dengan chatbot secara otomatis (*best-effort*).
- **Pengaturan Profil & Preferensi**: Kustomisasi tema (light/dark/system), bahasa, zona waktu (WIB/WITA/WIT), pembersihan riwayat obrolan/pencarian, serta penghapusan akun secara permanen.
- **Validasi Data Handal**: Validasi skema input request secara ketat di tingkat middleware menggunakan library `Zod`.

---

## 🛠️ Tech Stack
- **Runtime**: [Node.js](https://nodejs.org/) (Express.js Framework)
- **Database**: PostgreSQL (Hosted on [Supabase](https://supabase.com/))
- **ORM**: [Prisma Client v5](https://www.prisma.io/)
- **Validasi**: [Zod](https://zod.dev/)
- **Keamanan**: `helmet` untuk header keamanan HTTP, `bcrypt` untuk enkripsi password, `express-rate-limit` untuk pencegahan brute-force.
- **Kinerja**: `compression` untuk kompresi payload GZIP.
- **Penyedia AI**: Integrasi API eksternal (Flask AI Service).

---

## 📁 Arsitektur & Struktur Proyek

Backend KawanKampus mengadopsi pola arsitektur **Repository-Service-Controller** (Lapis Tiga) untuk memisahkan logika bisnis, akses database, dan penanganan HTTP request.

```text
api/
└── index.js             # Vercel Serverless Entrypoint (Zero-Config)
prisma/
└── schema.prisma        # Skema Database & Binary Target Setup
src/
├── app.js               # Inisialisasi Express, Middleware Global, & Error Handlers
├── server.js            # Runner Server Lokal (Menggunakan Prisma $connect)
├── config/
│   └── database.js      # Pg Pool global singleton (untuk pooling langsung)
├── common/              # Modul Global Reusable
│   ├── config/
│   │   ├── env.js       # Manajemen environment variables terpusat
│   │   └── prisma.js    # Singleton Prisma Client instance
│   ├── middleware/
│   │   ├── auth.middleware.js      # Middleware validasi JWT
│   │   ├── error.middleware.js     # Global handler exception HTTP
│   │   └── validate.middleware.js  # Middleware validasi schema Zod
│   └── validators/      # Skema Zod global untuk validasi input
└── modules/             # Domain Bisnis Modular (Setiap folder berisi route, controller, service, dll)
    ├── auth/            # Registrasi, Login, Profile me
    ├── chatbot/         # AI Task Help Chat & AI Place Recommendation
    ├── favorite/        # Manajemen Simpan Tempat Favorit
    ├── history/         # Pencatatan & Pembersihan Riwayat Aktivitas
    ├── place/           # Layanan Maps & Rekomendasi Tempat Sekitar Kampus
    ├── settings/        # Manajemen Profil, Preferensi Tema/Bahasa, Keamanan Password
    └── task/            # Sistem CRUD Kanban Task Management
```

---

## 🗄️ Skema Database (Prisma PostgreSQL)

Berikut adalah ringkasan tabel database yang didefinisikan dalam [prisma/schema.prisma](file:///d:/PROJECT/backEnd-KawanKampus/prisma/schema.prisma):

### 1. `users` (Model `User`)
Menyimpan kredensial dan detail profil pengguna.
- `id` (String, UUID, PK)
- `email` (String, Unique)
- `password` (String, Terenkripsi)
- `name` (String)
- `phone` (String, Optional)
- `university` (String, Optional)
- `faculty` (String, Optional)
- `prodi` (String, Optional)
- `cohortYear` (String, Optional)
- `gender` (String, Optional)
- `bio` (String, Optional)
- `avatarUrl` (String, Optional)
- `role` (String, Default: "Mahasiswa")

### 2. `tasks` (Model `Task`)
Menyimpan daftar tugas Kanban pengguna.
- `id` (String, UUID, PK)
- `title` (String)
- `description` (String, Optional)
- `status` (Enum `TaskStatus`: `TODO`, `IN_PROGRESS`, `DONE`)
- `category` (String, Default: "Akademik")
- `priority` (String, Default: "Medium")
- `dueDate` (DateTime, Optional)
- `userId` (String, FK ke `users.id`, Delete Cascade)

### 3. `places` (Model `Place`)
Menyimpan cache data lokasi tempat penting.
- `id` (String, UUID, PK)
- `googleId` (String, Unique) - ID unik dari Google Maps Link / ID custom.
- `name` (String)
- `category` (Enum `Category`: `PHOTOCOPY`, `FOOD`, `ATK`)
- `rawCategory` (String, Optional) - Kategori spesifik dari AI/API.
- `address` (String)
- `lat` (Float)
- `lng` (Float)

### 4. `favorites` (Model `Favorite`)
Relasi many-to-many unik yang menandai tempat favorit pengguna.
- `id` (String, UUID, PK)
- `userId` (String, FK ke `users.id`, Delete Cascade)
- `placeId` (String, FK ke `places.id`, Delete Cascade)
- Indeks unik gabungan `[userId, placeId]`

### 5. `histories` (Model `History`)
Aktivitas pencatatan log tindakan pengguna (*Audit Log*).
- `id` (String, UUID, PK)
- `userId` (String, FK ke `users.id`, Delete Cascade)
- `action` (String) - Contoh: `SEARCHED_PLACE`, `CREATED_TASK`, `COMPLETED_TASK`.
- `metadata` (Json, Optional) - Detail data transaksi yang disimpan.

### 6. `chat_logs` (Model `ChatLog`)
Riwayat pesan chat pengguna dengan AI Chatbot.
- `id` (String, UUID, PK)
- `userId` (String, FK ke `users.id`, Delete Cascade)
- `message` (String) - Input pesan dari pengguna.
- `response` (String) - Jawaban dari chatbot AI.
- `context` (Json, Optional) - Parameter sesi chatbot.

### 7. `user_settings` (Model `UserSetting`)
Preferensi UI/UX dan notifikasi pengguna.
- `id` (String, UUID, PK)
- `userId` (String, Unique, FK ke `users.id`, Delete Cascade)
- `theme` (String, Default: "light")
- `language` (String, Default: "id")
- `distanceUnit` (String, Default: "meter")
- `timezone` (String, Default: "WIB")
- `emailNotifications` (Boolean, Default: true)
- `pushNotifications` (Boolean, Default: true)
- `chatbotHistoryEnabled` (Boolean, Default: true)
- `locationAccessEnabled` (Boolean, Default: true)
- `privacyMode` (Boolean, Default: false)

---

## ⚙️ Variabel Lingkungan (Environment Variables)

Salin berkas `.env.example` menjadi `.env` di direktori utama, lalu konfigurasikan variabel berikut:

| Nama Variabel | Wajib/Opsional | Nilai Default | Deskripsi |
| :--- | :--- | :--- | :--- |
| `PORT` | Opsional | `3000` | Port server lokal berjalan |
| `NODE_ENV` | Opsional | `development` | Mode eksekusi (`development` / `production`) |
| `DATABASE_URL` | **Wajib** | - | URI Koneksi PostgreSQL (Format direct port `5432` untuk migrasi / pooler port `6543` untuk runtime) |
| `JWT_SECRET` | **Wajib** | `secret` | Kunci rahasia untuk menandatangani token akses JWT |
| `JWT_EXPIRES_IN` | Opsional | `7d` | Masa berlaku token akses JWT |
| `ALLOWED_ORIGINS` | Opsional | `*` | Daftar URL frontend (dipisah koma) untuk izin CORS |
| `GOOGLE_MAPS_API_KEY` | Opsional | - | Kunci API Google Maps untuk pencarian tempat terdekat |
| `AI_API_URL` | Opsional | - | Base URL API Layanan AI Chatbot eksternal |
| `RECOMMENDATION_API_URL` | Opsional | - | Base URL API Layanan Rekomendasi Tempat eksternal |

---

## 💻 Panduan Instalasi & Pengembangan Lokal

### Prerequisites
Pastikan Anda memiliki runtime [Node.js](https://nodejs.org/) (versi 18+) dan database PostgreSQL.

### Langkah-langkah
1. **Clone repository**:
   ```bash
   git clone https://github.com/wahyualfrq/backend-KawanKampus.git
   cd backend-KawanKampus
   ```

2. **Pasang Dependensi**:
   ```bash
   npm install
   ```

3. **Inisialisasi Variabel Lingkungan**:
   Buat file `.env` di root folder dan isi sesuai spesifikasi di atas.

4. **Pembuatan Skema Database & Client ORM**:
   Jalankan generator Prisma dan sinkronisasi skema ke database PostgreSQL:
   ```bash
   # Menghasilkan Prisma Client lokal
   npm run prisma:generate

   # Push skema database ke database PostgreSQL
   npm run prisma:push
   ```

5. **Menjalankan Server**:
   Jalankan server pengembangan dengan deteksi perubahan otomatis (*hot-reload*):
   ```bash
   npm run dev
   ```
   Server akan berjalan secara default di `http://localhost:3000`.

6. **Melihat Database via Prisma Studio**:
   Prisma menyediakan antarmuka web GUI untuk mengelola record database secara interaktif:
   ```bash
   npm run prisma:studio
   ```

---

## 📡 Dokumentasi API Endpoints (v1)

### 🟢 Public Endpoints (Tanpa Autentikasi)

#### 1. Server Welcome
- **URL**: `GET /`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Welcome to KawanKampus API Production Serverless",
    "timestamp": "2026-06-03T04:25:37.000Z"
  }
  ```

#### 2. Health Check
- **URL**: `GET /health`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Server is healthy"
  }
  ```

#### 3. Registrasi Pengguna
- **URL**: `POST /api/v1/auth/register`
- **Request Body**:
  ```json
  {
    "email": "user@univ.ac.id",
    "password": "strongpassword123",
    "name": "Nama Lengkap Mahasiswa"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid-string",
        "email": "user@univ.ac.id",
        "name": "Nama Lengkap Mahasiswa"
      },
      "token": "jwt-token-string"
    },
    "message": "User registered successfully"
  }
  ```

#### 4. Login Pengguna
- **URL**: `POST /api/v1/auth/login`
- **Request Body**:
  ```json
  {
    "email": "user@univ.ac.id",
    "password": "strongpassword123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid-string",
        "email": "user@univ.ac.id",
        "name": "Nama Lengkap Mahasiswa"
      },
      "token": "jwt-token-string"
    },
    "message": "Login successful"
  }
  ```

#### 5. Meminta Konfigurasi Kampus & Kategori Fallback
- **URL**: `GET /api/v1/places/config`
- **Response (200 OK)**: Menyediakan daftar universitas yang didukung beserta fallback kategori tempat penting.

---

### 🔒 Protected Endpoints (Memerlukan header `Authorization: Bearer <JWT_TOKEN>`)

#### 👤 Autentikasi & Profil (`/api/v1/auth`, `/api/v1/settings`)

- **GET `/api/v1/auth/me`**: Mendapatkan detail informasi token JWT pengguna saat ini.
- **GET `/api/v1/settings/profile`**: Mengambil detail lengkap profil pengguna (seperti universitas, prodi, fakultas, tahun angkatan, jenis kelamin, bio).
- **PUT `/api/v1/settings/profile`**: Mengubah data profil pengguna. Format avatar mendukung upload berbasis URL/Base64.
- **GET `/api/v1/settings/preferences`**: Mengambil preferensi pengguna (tema, bahasa, unit jarak, zona waktu).
- **PUT `/api/v1/settings/preferences`**: Mengubah preferensi pengguna.
- **PUT `/api/v1/settings/security/password`**: Mengubah kata sandi lama pengguna dengan kata sandi baru.
- **DELETE `/api/v1/settings/account`**: Menghapus akun pengguna beserta seluruh relasi data (tugas, favorit, riwayat) secara permanen (*Cascade Delete*).
- **POST `/api/v1/settings/privacy/clear-history`**: Menghapus seluruh log pencarian tempat dan obrolan AI yang berkaitan dengan pengguna.

#### 📋 Manajemen Tugas Kanban (`/api/v1/tasks`)

- **GET `/api/v1/tasks`**
  - **Query Params**: `status` (TODO/IN_PROGRESS/DONE), `category`, `priority`, `page`, `limit`, `sortBy` (desc/asc).
- **POST `/api/v1/tasks`**
  - **Request Body**:
    ```json
    {
      "title": "Belajar Docker",
      "description": "Menyelesaikan modul deployment",
      "status": "TODO",
      "category": "Proyek",
      "priority": "High",
      "dueDate": "2026-06-10T12:00:00.000Z"
    }
    ```
- **PATCH `/api/v1/tasks/:id`**: Memperbarui status tugas, prioritas, atau deskripsi. Otomatis mencatat riwayat aktivitas `COMPLETED_TASK` apabila status diubah menjadi `DONE`.
- **DELETE `/api/v1/tasks/:id`**: Menghapus tugas pengguna.

#### 🤖 Chatbot AI (`/api/v1/chatbot`)

- **POST `/api/v1/chatbot`**
  - Mengirim pesan percakapan ke asisten AI (*Task-Help*).
  - **Request Body**: `{ "message": "Bagaimana cara membuat diagram UML?", "session_id": "optional-session-id" }`
- **POST `/api/v1/chatbot/place-recommendation`**
  - Mengambil rekomendasi tempat penting menggunakan asisten chatbot AI.
  - **Request Body**:
    ```json
    {
      "selected_uni": "Universitas Gadjah Mada",
      "selected_cat": "Makanan",
      "lat": -7.7733153,
      "lon": 110.3892489,
      "session_id": "optional-id"
    }
    ```

#### 📍 Tempat & Favorit (`/api/v1/places`, `/api/v1/favorites`)

- **GET `/api/v1/places/nearby`**
  - Mengambil lokasi terdekat menggunakan Google Maps API.
  - **Query Params**: `lat`, `lng`, `category`.
- **POST `/api/v1/places/recommend`**
  - Mendapatkan rekomendasi tempat terstruktur berdasarkan koordinat pusat kampus dan kategori yang dipilih.
  - **Request Body**: `{ "selected_uni": "Universitas Gadjah Mada", "selected_cat": "ATK", "lat": -7.77, "lon": 110.38 }`
- **GET `/api/v1/favorites`**: Mendapatkan semua daftar lokasi tempat yang difavoritkan oleh pengguna.
- **POST `/api/v1/favorites`**
  - Memfavoritkan tempat baru. Otomatis mencatat data tempat tersebut ke tabel `places` jika belum ada sebelum menghubungkannya ke daftar favorit pengguna.
- **DELETE `/api/v1/favorites/:placeId`**: Menghapus tempat dari daftar favorit pengguna.

---

## 🔒 Detail Keamanan & Optimasi Produksi

Untuk memastikan backend aman, responsif, dan siap untuk skenario beban produksi tinggi, modul keamanan berikut telah diintegrasikan di tingkat middleware global:
1. **Helmet HTTP Headers**: Mengamankan aplikasi dari berbagai celah web umum (seperti XSS, clickjacking, dll.) dengan menyetel header respons HTTP yang sesuai.
2. **Dynamic CORS Rules**: Membatasi domain yang diizinkan untuk menghubungi API ini berdasarkan konfigurasi variabel lingkungan `ALLOWED_ORIGINS`.
3. **Global Rate Limiting**: Membatasi konsumsi API maksimal 150 request per 15 menit untuk setiap alamat IP, mencegah serangan Denial-of-Service (DoS) dan spamming.
4. **GZIP Compression**: Mengompres ukuran data JSON yang dikirimkan kembali ke klien sehingga mempercepat pemuatan halaman di sisi aplikasi frontend.
5. **Robust Error Handling**: Semua error yang dilempar dari logika internal ditangkap oleh `error.middleware.js` global dan dikembalikan dalam bentuk respons JSON terstruktur, menyembunyikan detail stack trace yang sensitif di lingkungan produksi.

---

## ☁️ Deployment ke Vercel Serverless

Backend ini siap dideploy ke **Vercel** sebagai fungsi serverless zero-config menggunakan konfigurasi pada file `vercel.json`:

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index.js"
    }
  ]
}
```

### Konfigurasi Penting Serverless (Prisma Binary Targets)
Karena fungsi serverless Vercel berjalan pada lingkungan sistem operasi berbasis Amazon Linux (RHEL), pastikan skema generator Prisma Anda berisi baris berikut untuk menghindari galat dependensi binary target:
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```
Setiap kali Anda mengubah skema database, selalu jalankan perintah `npx prisma generate` agar file engine untuk client serverless diperbarui sebelum melakukan deployment ke Vercel.
