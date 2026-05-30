# MediSync — Installation Guide

> **Quick version:** `cp .env.example .env && docker compose up --build` → open http://localhost:4200

---

## Table of Contents

1. [Option A — Docker (Recommended)](#option-a--docker-recommended)
2. [Option B — Manual Setup](#option-b--manual-setup)
3. [Environment Variables Reference](#environment-variables-reference)
4. [Test Accounts](#test-accounts)
5. [Troubleshooting](#troubleshooting)

---

## Option A — Docker (Recommended)

This is the easiest way to run MediSync. Docker Compose starts every service (database, backend, gateway, frontend) in the correct order with a single command.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- Git

### Step 1 — Clone the repository

```bash
git clone https://github.com/AdilAmejoud/MediSync.git
cd MediSync
```

### Step 2 — Configure environment variables

```bash
cp .env.example .env
```

The default values in `.env.example` work for local development. You only **need** to change these for full functionality:

| Variable | Required for | How to get it |
|---|---|---|
| `JWT_SECRET` | Authentication security | Any random string, 32+ characters |
| `RESEND_API_KEY` | Email sending (reminders, OTP) | [resend.com](https://resend.com) — free tier available |
| `CLOUDINARY_CLOUD_NAME` | Document/image uploads | [cloudinary.com](https://cloudinary.com) — free tier available |
| `CLOUDINARY_API_KEY` | Document/image uploads | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Document/image uploads | Cloudinary dashboard |

> **Without Cloudinary:** The app works but image/document uploads will fail silently.
> **Without Resend:** The app works but emails (OTP, reminders) won't be sent.

### Step 3 — Start all services

```bash
docker compose up --build
```

On first run, Docker will:
1. Pull base images (Node 20, PostgreSQL 15, etc.)
2. Build the frontend and backend Docker images
3. Start PostgreSQL and wait for it to be healthy
4. Run `prisma migrate deploy` to apply all migrations
5. Run `seed.js` to populate test data
6. Start the Angular frontend via Nginx

This takes **3–5 minutes** on first build, under 30 seconds on subsequent runs.

### Step 4 — Access the application

| Service | URL |
|---|---|
| **Frontend (Angular app)** | http://localhost:4200 |
| **API Gateway** | http://localhost:3000 |
| **Main Backend API** | http://localhost:3004 |
| **Prisma Studio** (DB GUI) | http://localhost:5555 |
| **RabbitMQ Dashboard** | http://localhost:15672 |
| **PostgreSQL** | `localhost:5432` (user: `user`, password: `password`, db: `medisync`) |

### Stopping the application

```bash
# Stop all containers (preserves data)
docker compose down

# Stop and remove all data (clean slate)
docker compose down -v
```

---

## Option B — Manual Setup

Use this if you prefer running services directly on your machine without Docker.

### Prerequisites

- Node.js 20+ — [nodejs.org](https://nodejs.org)
- PostgreSQL 15+ — [postgresql.org](https://postgresql.org)
- Angular CLI — `npm install -g @angular/cli`
- Git

### Step 1 — Clone and configure

```bash
git clone https://github.com/AdilAmejoud/MediSync.git
cd MediSync
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/medisync?schema=public
JWT_SECRET=your-very-long-random-secret-here
```

### Step 2 — Create the database

```bash
# Connect to PostgreSQL and create the database
psql -U postgres -c "CREATE DATABASE medisync;"
```

### Step 3 — Install root dependencies

```bash
# From the project root
npm install
```

### Step 4 — Install and set up the backend

```bash
cd backend
npm install

# Generate the Prisma client
npx prisma generate --schema=../database/schema.prisma

# Apply all database migrations
npx prisma migrate deploy --schema=../database/schema.prisma

# Seed development data
node seed.js
```

> **What seed.js does:** Creates admin, doctor, patient, and secretary accounts along with sample appointments and invoices. Safe to run multiple times (uses upsert logic).

### Step 5 — Start the backend

```bash
# From inside backend/
node server.js
# → API available at http://localhost:3004
```

Or with auto-reload during development:

```bash
npm start   # uses nodemon
```

### Step 6 — Start the frontend

```bash
# Open a new terminal
cd frontend
npm install
ng serve
# → App available at http://localhost:4200
```

### Step 7 — (Optional) Start both together

```bash
# From the project root
npm start
# Runs backend and frontend concurrently
```

---

## Environment Variables Reference

All variables go in the `.env` file at the project root.

### Required

| Variable | Example | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:password@localhost:5432/medisync?schema=public` | PostgreSQL connection string |
| `JWT_SECRET` | `my-super-secret-32char-string-here` | Secret used to sign all JWT tokens. Use a long random value in production. |

### Authentication & Admin

| Variable | Example | Description |
|---|---|---|
| `ADMIN_EMAIL` | `admin@medisync.com` | Email for the default admin account created on first boot |
| `ADMIN_PASSWORD` | `Admin@123` | Password for the default admin account |

### Email (Resend)

| Variable | Example | Description |
|---|---|---|
| `RESEND_API_KEY` | `re_abc123...` | API key from [resend.com](https://resend.com). Needed for OTP emails and appointment reminders. |

### File Storage (Cloudinary)

| Variable | Example | Description |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | `my-cloud` | Cloud name from your Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | `123456789` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | `abcdef...` | Cloudinary API secret |

### Server

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Set to `production` in production deployments |
| `PORT` | `3004` | Port for the main backend server |

### Microservices (used by Docker Compose)

| Variable | Default | Description |
|---|---|---|
| `AUTH_SERVICE_PORT` | `3001` | Port for the auth microservice |
| `DOCTOR_SERVICE_PORT` | `3002` | Port for the doctor microservice |
| `BOOKING_SERVICE_PORT` | `3003` | Port for the booking microservice |
| `RABBITMQ_URL` | `amqp://localhost` | RabbitMQ connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |

---

## Test Accounts

After running the seed script (or starting with Docker), these accounts are available:

| Role | Email | Password | Notes |
|---|---|---|---|
| **Admin** | admin@medisync.com | Admin@123 | Requires TOTP 2FA on login. Use Google Authenticator — scan the QR code shown after first login. |
| **Doctor** | mick@medisync.com | Doctor@123 | Full doctor portal access |
| **Patient** | john@medisync.com | Patient@123 | Full patient portal access |
| **Secretary** | secretary@medisync.com | Secretary@123 | Full secretary portal access |

### Setting up Admin 2FA

1. Log in with `admin@medisync.com` / `Admin@123`
2. You'll be prompted to set up Google Authenticator
3. Open Google Authenticator (or Authy) on your phone
4. Tap **+** → **Scan QR code**
5. Scan the QR code shown on screen
6. Enter the 6-digit code to confirm setup
7. On subsequent logins, you'll be asked for the code from your authenticator app

---

## Troubleshooting

### Docker Issues

**`Error: Cannot connect to the Docker daemon`**
```bash
# Make sure Docker Desktop is running, then retry
docker compose up --build
```

**`Port 5432 already in use`**
```bash
# Check what's using the port
lsof -i :5432
# Either stop your local PostgreSQL or change the port mapping in docker-compose.yml
```

**`Port 4200 already in use`**
```bash
# Stop the conflicting process, or temporarily change the port in docker-compose.yml:
# ports:
#   - '4201:80'   ← change 4200 to 4201
```

**Backend container keeps restarting**
```bash
# View backend logs to diagnose
docker compose logs main-backend

# Most common cause: missing or incorrect DATABASE_URL in .env
```

**`Prisma migration failed`**
```bash
# Connect to the running PostgreSQL container and reset
docker compose down -v          # removes all data
docker compose up --build       # fresh start
```

---

### Manual Setup Issues

**`Cannot find module '@prisma/client'`**
```bash
cd backend
npx prisma generate --schema=../database/schema.prisma
```

**`Error: P1001 - Can't reach database server`**
```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# Test the connection string
psql "postgresql://user:password@localhost:5432/medisync"
```

**`ng: command not found`**
```bash
npm install -g @angular/cli
```

**`Module not found` errors in Angular**
```bash
cd frontend
rm -rf node_modules .angular
npm install
ng serve
```

**`node_modules` issues in backend**
```bash
cd backend
rm -rf node_modules
npm install
npm rebuild bcrypt   # bcrypt needs native compilation
```

---

### Resetting Everything

```bash
# Docker: full reset (drops all data)
docker compose down -v
docker compose up --build

# Manual: reset database
cd backend
npx prisma migrate reset --schema=../database/schema.prisma
node seed.js
```

---

*MediSync Installation Guide · v1.0.0 · 2026*
