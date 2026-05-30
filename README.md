<div align="center">

# MediSync

**A full-stack medical clinic management platform**

Angular 17 · Node.js · PostgreSQL · Docker · Prisma · Socket.IO

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Angular](https://img.shields.io/badge/Angular-17-DD0031?logo=angular&logoColor=white)](https://angular.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://prisma.io)
[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

</div>

---

## What is MediSync?

MediSync is a comprehensive, role-based clinic management system built for multi-practitioner medical facilities. It digitalises the entire patient journey — from online appointment booking and real-time scheduling to electronic prescriptions, medical records, invoicing, and secure audit trails.

---

## Key Features

| Role | Features |
|---|---|
| 🧑‍⚕️ **Patient** | Online booking, medical folder, prescriptions PDF, document uploads, email reminders, vitals tracking |
| 👨‍⚕️ **Doctor** | Daily/weekly schedule, patient files, electronic prescriptions, availability management, personal stats |
| 🗂️ **Secretary** | Appointment management, patient registration, invoicing, care sheets, walk-in / emergency queue |
| 🔐 **Admin** | Analytics dashboard, staff management, audit logs, clinic configuration, mandatory 2FA |

---

## Tech Stack

```
Frontend  →  Angular 17 (Standalone) · SCSS · Socket.IO client
Backend   →  Node.js 20 · Express.js · Prisma ORM · Socket.IO
Database  →  PostgreSQL 15 (via Docker)
Auth      →  JWT · TOTP 2FA (otplib) · bcrypt
Email     →  Resend API · node-cron (automated reminders)
Storage   →  Cloudinary (medical documents & images)
Infra     →  Docker Compose · Nginx (production)
```

---

## Project Structure

```
MediSync/
├── backend/
│   ├── src/
│   │   ├── config/          # Prisma client, Cloudinary
│   │   ├── controllers/     # Business logic per domain
│   │   ├── middlewares/     # JWT auth guards, Multer upload
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Email service + microservices (planned)
│   │   └── utils/           # Audit logger, password validator
│   ├── server.js            # Express app entry point
│   ├── socket.js            # Socket.IO server
│   └── seed.js              # Development seed data
├── frontend/
│   └── src/app/
│       ├── core/            # Guards, interceptors, services, models
│       ├── features/        # Modules per role (admin/medecin/patient/secretaire)
│       └── shared/          # Reusable components, directives, pipes
├── database/
│   ├── schema.prisma        # Single source of truth for all models
│   └── migrations/          # Prisma migration history
├── docs/                    # Full technical documentation
└── tests/                   # Unit, integration, security, UX tests
```

---

## Quick Start (Docker — Recommended)

> **Prerequisites:** Docker Desktop · Git

```bash
# 1. Clone the repository
git clone https://github.com/AdilAmejoud/MediSync.git
cd MediSync

# 2. Configure environment
cp .env.example .env
# Edit .env if needed (defaults work for local development)

# 3. Launch all services
docker compose up --build
```

The following services start automatically in the correct order:

| Service | URL | Description |
|---|---|---|
| Frontend | http://localhost:4200 | Angular app |
| API Gateway | http://localhost:3000 | Single entry point |
| Main Backend | http://localhost:3004 | Core REST API |
| PostgreSQL | localhost:5432 | Database |
| RabbitMQ UI | http://localhost:15672 | Message broker dashboard |
| Prisma Studio | http://localhost:5555 | Database GUI |

---

## Test Accounts

After startup, the seed script automatically creates these accounts:

| Role | Email | Password |
|---|---|---|
| Admin | admin@medisync.com | Admin@123 |
| Doctor | mick@medisync.com | Doctor@123 |
| Patient | john@medisync.com | Patient@123 |
| Secretary | secretary@medisync.com | Secretary@123 |

> **Note:** The Admin account requires TOTP 2FA (Google Authenticator) on first login.

---

## Manual Setup (without Docker)

See [docs/INSTALL.md](./docs/INSTALL.md) for the full step-by-step manual setup guide.

---

## Documentation

| Document | Description |
|---|---|
| [docs/README.md](./docs/README.md) | Full technical reference (architecture, API, security, database schema) |
| [docs/INSTALL.md](./docs/INSTALL.md) | Detailed installation guide with troubleshooting |

---

## Security Highlights

- **JWT** authentication with role-based access control (4 roles)
- **TOTP 2FA** (RFC 6238) — mandatory for Admin, optional for others
- **bcrypt** password hashing (10 rounds)
- **Rate limiting** — global (1000 req/15 min) and strict auth (5 req/5 min)
- **Audit logs** — every sensitive action is recorded with IP and user
- **Helmet.js** security headers
- **Comprehensive test suite** — unit, integration, security (OWASP), UX tests

---

## Architecture

```
                    ┌─────────────────────┐
                    │   Angular Frontend   │
                    │   (port 4200 / 80)  │
                    └──────────┬──────────┘
                               │ HTTPS / JWT
                    ┌──────────▼──────────┐
                    │    API Gateway       │
                    │    (port 3000)       │
                    └──────┬──────┬───────┘
                           │      │
              ┌────────────▼──┐ ┌─▼──────────────┐
              │ Auth Service  │ │  Main Backend   │
              │  (port 3001)  │ │  (port 3004)    │
              └───────────────┘ └────────┬────────┘
                                         │ Prisma ORM
                               ┌─────────▼─────────┐
                               │   PostgreSQL 15    │
                               │   (port 5432)      │
                               └────────────────────┘
```

---

<div align="center">

Built with ❤️ · MediSync v1.0.0 · 2026

</div>
