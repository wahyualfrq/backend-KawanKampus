# KawanKampus Backend API

KawanKampus adalah platform backend modular yang dirancang untuk mendukung kebutuhan mahasiswa, mencakup manajemen tugas (Kanban), rekomendasi tempat di sekitar kampus, dan asisten AI Chatbot.

## 🚀 Fitur Utama
- **Authentication**: Registrasi, Login, dan manajemen session menggunakan JWT.
- **Kanban Task Management**: CRUD tugas dengan status (TODO, IN_PROGRESS, DONE).
- **AI Chatbot Proxy**: Integrasi dengan layanan AI untuk asisten mahasiswa.
- **Nearby Places**: Mencari lokasi penting (kafe, perpustakaan, dll) di sekitar koordinat tertentu.
- **Robust Validation**: Validasi data input menggunakan Zod.
- **Clean Architecture**: Pemisahan logic menggunakan pola Repository-Service-Controller.

## 🛠️ Tech Stack
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Validation**: [Zod](https://zod.dev/)
- **Security**: [Bcrypt](https://github.com/kelektiv/node.bcrypt.js) & [JWT](https://jwt.io/)

---

## 📋 Prasyarat
- Node.js versi 18 atau lebih tinggi.
- PostgreSQL database.
- npm atau yarn.

## ⚙️ Instalasi

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
   Buat file `.env` di root directory dan sesuaikan konfigurasinya:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME?schema=public"
   JWT_SECRET="your_very_secret_key"
   JWT_EXPIRES_IN="1d"
   # AI Chatbot Config (Optional)
   AI_SERVICE_URL="https://api.external-ai.com"
   ```

4. **Prisma Setup**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the server**:
   ```bash
   # Development
   node src/server.js
   ```

---

## 📡 API Endpoints (v1)

### Auth
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Mendaftarkan user baru |
| `POST` | `/api/v1/auth/login` | Login dan mendapatkan token |
| `GET` | `/api/v1/auth/me` | Mendapatkan data profil (Auth required) |

### Tasks (Kanban)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/tasks` | List semua tugas user |
| `POST` | `/api/v1/tasks` | Membuat tugas baru |
| `PATCH` | `/api/v1/tasks/:id` | Update status/konten tugas |
| `DELETE` | `/api/v1/tasks/:id` | Menghapus tugas |

### Other Features
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/chatbot` | Chat dengan AI asisten |
| `GET` | `/api/v1/places/nearby` | Cari tempat sekitar (lat, lng) |

---

## 📁 Struktur Proyek
```text
src/
├── common/          # Middleware, Config, Validators global
├── modules/         # Modul fitur (Auth, Task, Chatbot, Place)
│   ├── [module]/
│   │   ├── [name].controller.js
│   │   ├── [name].service.js
│   │   ├── [name].repository.js
│   │   └── [name].routes.js
├── app.js           # Express App setup
└── server.js        # Entry point
```
