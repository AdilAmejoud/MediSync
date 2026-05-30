# MediSync — Technical Documentation

**Version:** 1.0.0
**Last Updated:** May 2026
**Repository:** [github.com/AdilAmejoud/MediSync](https://github.com/AdilAmejoud/MediSync)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [API Reference](#5-api-reference)
6. [Security](#6-security)
7. [Features by Role](#7-features-by-role)
8. [Microservices Architecture (Planned)](#8-microservices-architecture-planned)
9. [Running Tests](#9-running-tests)

---

## 1. Project Overview

MediSync is a full-stack web application that digitises the operations of a multi-practitioner medical clinic. It provides four distinct role-based portals — Patient, Doctor, Secretary, and Admin — each with its own dashboard, navigation, and access controls.

### System Actors

| Role | Description | Route prefix |
|---|---|---|
| **Patient** | Registered individual booking appointments and managing their health record | `/patient/*` |
| **Doctor** | Practitioner managing their schedule and patient consultations | `/medecin/*` |
| **Secretary** | Reception staff handling admissions, billing, and appointment management | `/secretaire/*` |
| **Admin** | Clinic administrator with full system access and mandatory 2FA | `/admin/*` |

---

## 2. System Architecture

### Current Architecture — Monolith + Gateway

```
┌──────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                         │
│              Angular 17 (Standalone Components)              │
│              Port: 4200 (dev) · Port: 80 (Docker)            │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTP · JWT Bearer Token
┌─────────────────────────▼────────────────────────────────────┐
│                     API GATEWAY                               │
│              Express.js (express-http-proxy)                  │
│              Port: 3000                                       │
│  Routes JWT tokens → enriches x-user-id, x-user-role headers │
└─────────┬───────────────────────────────────┬────────────────┘
          │                                   │
┌─────────▼─────────┐             ┌───────────▼───────────────┐
│   Auth Service     │             │      Main Backend          │
│   (port 3001)      │             │      Node.js / Express     │
│   JWT, 2FA, OTP    │             │      Port: 3004            │
│   Password reset   │             │  All business logic routes │
└───────────────────┘             └───────────┬───────────────┘
                                              │ Prisma ORM
                                  ┌───────────▼───────────────┐
                                  │      PostgreSQL 15          │
                                  │      Port: 5432             │
                                  └───────────────────────────┘
                                              │
                          ┌───────────────────┴───────────────┐
                          │                                   │
               ┌──────────▼──────────┐          ┌────────────▼────────────┐
               │     Cloudinary       │          │       Resend API         │
               │  Medical documents   │          │  Transactional emails    │
               │  Patient images      │          │  Automated reminders     │
               └─────────────────────┘          └─────────────────────────┘
```

### Folder Structure

```
MediSync/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── prisma.js          # Prisma client with pg adapter
│   │   │   └── cloudinary.js      # Cloudinary connection
│   │   ├── controllers/
│   │   │   ├── authController.js  # Register, login, 2FA, OTP, password reset
│   │   │   ├── adminController.js # Admin dashboard, doctor management
│   │   │   ├── doctorController.js# Doctor profile, schedule, availability
│   │   │   ├── userController.js  # Patient profile, appointments
│   │   │   ├── secretaireController.js
│   │   │   ├── statsController.js # Analytics for all roles
│   │   │   ├── appointmentController.js
│   │   │   └── configController.js# Clinic settings
│   │   ├── middlewares/
│   │   │   ├── authUser.js        # JWT guard for patients
│   │   │   ├── authDoctor.js      # JWT guard for doctors
│   │   │   ├── authAdmin.js       # JWT guard for admins
│   │   │   └── multer.js          # File upload handling
│   │   ├── routes/                # One file per resource
│   │   ├── services/
│   │   │   ├── emailService.js    # Resend API wrappers
│   │   │   ├── auth-service/      # Microservice (planned)
│   │   │   ├── doctor-service/    # Microservice (planned)
│   │   │   ├── booking-service/   # Microservice (planned)
│   │   │   ├── notification-service/ # Microservice (planned)
│   │   │   └── gateway/           # API Gateway
│   │   └── utils/
│   │       ├── auditLogger.js     # Writes to AuditLog table
│   │       └── passwordValidator.js
│   ├── server.js                  # Express app bootstrap
│   ├── socket.js                  # Socket.IO server
│   ├── seed.js                    # Development data seeder
│   └── prisma.config.ts           # Prisma CLI configuration
├── frontend/
│   └── src/app/
│       ├── core/
│       │   ├── guards/            # Route protection (auth, role)
│       │   ├── interceptors/      # HTTP interceptor (JWT injection)
│       │   ├── models/            # TypeScript interfaces
│       │   └── services/          # API service layer
│       ├── features/
│       │   ├── auth/              # Login, register, forgot-password, OTP, reset
│       │   ├── admin/             # Admin portal (dashboard, doctors, staff, billing)
│       │   ├── medecin/           # Doctor portal (schedule, patients, prescriptions)
│       │   ├── patient/           # Patient portal (appointments, records, billing)
│       │   └── secretaire/        # Secretary portal
│       └── shared/                # Reusable components, pipes, directives
├── database/
│   ├── schema.prisma              # All data models — single source of truth
│   └── migrations/                # Prisma migration history
├── docs/
│   ├── README.md                  # This document
│   └── INSTALL.md                 # Installation guide
└── tests/
    ├── unit/                      # Unit tests
    ├── integration/               # Integration tests
    ├── security/                  # OWASP security tests
    ├── ux/                        # UX completeness tests
    └── e2e/                       # End-to-end tests
```

---

## 3. Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Angular | 17.3 | Framework — standalone component architecture |
| TypeScript | 5.x | Static typing |
| SCSS | — | Styling with custom variables and mixins |
| RxJS | 7.x | Reactive programming (HTTP, state) |
| Socket.IO Client | 4.x | Real-time notifications |
| ng-apexcharts | latest | Charts and analytics graphs |
| jsPDF | latest | Client-side PDF generation |
| @ng-icons/heroicons | latest | Icon system |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20 | JavaScript runtime |
| Express.js | 4.x | HTTP server framework |
| Prisma | 7.x | ORM — type-safe database access |
| `@prisma/adapter-pg` | 7.x | Native PostgreSQL adapter for Prisma |
| bcrypt | 5.x | Password hashing (10 rounds) |
| jsonwebtoken | 9.x | JWT creation and verification |
| otplib | 13.x | TOTP 2FA (RFC 6238 — Google Authenticator) |
| qrcode | 1.x | QR code generation for 2FA setup |
| node-cron | 4.x | Scheduled tasks (appointment reminders) |
| multer | 1.x | Multipart file uploads |
| resend | 6.x | Transactional email API |
| socket.io | 4.x | WebSocket server (real-time events) |
| helmet | 8.x | HTTP security headers |
| express-rate-limit | 8.x | Request rate limiting |
| express-http-proxy | — | API Gateway proxying |

### Infrastructure

| Technology | Purpose |
|---|---|
| PostgreSQL 15 | Primary relational database |
| Docker Compose | Multi-container orchestration |
| Cloudinary | Cloud storage for medical documents and images |
| Nginx | Reverse proxy serving the Angular app in production |
| RabbitMQ | Message broker (used by microservices, planned) |
| Redis | Caching layer (planned) |

---

## 4. Database Schema

### Entity Relationship Overview

```
User (id, name, email, password[hashed], role, phone, address,
      dateOfBirth, image, twoFactorSecret, twoFactorEnabled, isActive)
 ├── Patient  (bloodType, allergies, chronicConditions, vitals[JSON])
 ├── Doctor   (specialty, room, consultationFee, isActive, availability[JSON])
 └── Secretary (employeeId, department)

Appointment (patientId → Patient, doctorId → Doctor,
             date, type, mode, status, fee,
             reminderSent24h, reminderSent1h, notes)

Prescription (patientId, doctorId,
              medications[JSON], instructions, isActive, expiresAt)

Invoice (patientId, doctorId,
         amount, services[JSON], status, dueDate, paidAt)

MedicalDocument (patientId, filename, filepath,
                  fileType, fileSize, uploadedAt)

CareSheet (patientId, doctorId,
           medicalActs[JSON], insuranceProvider, totalAmount, status)

Notification (userId, title, message, type, isRead, createdAt)

AuditLog (userId, action, resource, details, ipAddress, status, createdAt)

AuthToken (userId, token_or_code, type, expires_at, is_used, attempts)

Service (name, description, price, duration, isActive)

ClinicConfig (key, value, updatedAt)
```

### Enumerations

```
Role:              admin | medecin | patient | secretaire
AppointmentStatus: PENDING | CONFIRMED | COMPLETED | CANCELLED | RESCHEDULED
AppointmentType:   CONSULTATION | FOLLOW_UP | EMERGENCY | CHECKUP
AppointmentMode:   IN_PERSON | TELECONSULTATION
InvoiceStatus:     PAID | PENDING | OVERDUE
TokenType:         EMAIL_OTP | PASSWORD_RESET
```

### Key Relations

- One `User` can be a `Patient`, `Doctor`, or `Secretary` — but only one (1:1 each)
- A `Patient` can have many `Appointment`, `Prescription`, `Invoice`, `MedicalDocument`, `CareSheet`, `Notification`
- A `Doctor` can have many `Appointment`, `Prescription`
- Every `Appointment` links exactly one `Patient` to one `Doctor`
- `AuditLog` tracks all sensitive user actions (login, data access, modifications)
- `AuthToken` manages OTP codes and password reset tokens (cleaned hourly by cron)

---

## 5. API Reference

All API endpoints are prefixed with `/api`. Protected routes require a valid JWT in the `Authorization: Bearer <token>` header.

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/login` | None | Login — returns JWT or triggers 2FA challenge |
| `POST` | `/register` | None | Register a new patient account |
| `POST` | `/doctor-login` | None | Doctor login |
| `POST` | `/admin-login` | None | Admin login |
| `GET` | `/get-profile` | JWT | Get the authenticated user's profile |
| `POST` | `/update-profile` | JWT | Update name, phone, address, DOB |
| `POST` | `/forgot-password` | None | Send password reset email |
| `POST` | `/reset-password` | None | Reset password using token from email |
| `POST` | `/verify-otp` | None | Verify OTP code after login |
| `POST` | `/setup-2fa` | JWT | Generate TOTP secret and QR code |
| `POST` | `/enable-2fa` | JWT | Confirm and activate 2FA |
| `POST` | `/verify-2fa` | None | Verify TOTP code during login |
| `POST` | `/2fa/disable` | JWT | Disable 2FA for the account |

### Appointments — `/api/appointments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | JWT | List appointments (filtered by role) |
| `POST` | `/` | JWT | Create a new appointment |
| `PATCH` | `/:id/status` | JWT | Update appointment status |
| `PATCH` | `/:id/cancel` | JWT | Cancel an appointment |
| `GET` | `/doctor/:id/slots` | JWT | Get available time slots for a doctor |

### Doctors — `/api/doctor`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/list` | JWT | List all active doctors |
| `GET` | `/:id` | JWT | Get a doctor's public profile |
| `GET` | `/dashboard` | Doctor JWT | Doctor dashboard stats |
| `PUT` | `/availability` | Doctor JWT | Update availability schedule |
| `POST` | `/block-time` | Doctor JWT | Block a time slot |
| `GET` | `/blocked-slots` | JWT | Get blocked time slots |

### Patients — `/api/patients`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Admin/Secretary JWT | List all patients |
| `GET` | `/:id` | JWT | Get patient record |
| `POST` | `/` | Admin/Secretary JWT | Create a new patient |
| `PUT` | `/:id` | JWT | Update patient information |
| `PUT` | `/:id/vitals` | Doctor/Patient JWT | Update vital signs |

### Prescriptions — `/api/prescriptions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | JWT | List prescriptions |
| `POST` | `/` | Doctor JWT | Create prescription |
| `GET` | `/:id` | JWT | Get prescription details |
| `GET` | `/:id/pdf` | JWT | Download prescription as PDF |

### Invoices — `/api/invoices`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | JWT | List invoices |
| `POST` | `/` | Secretary/Admin JWT | Create invoice |
| `PUT` | `/:id` | JWT | Update invoice |
| `GET` | `/:id/pdf` | JWT | Download invoice as PDF |

### Care Sheets — `/api/care-sheets`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | JWT | List care sheets |
| `POST` | `/` | Secretary JWT | Create care sheet |
| `PUT` | `/:id/submit` | Secretary JWT | Submit to insurance |

### Medical Documents — `/api/documents`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | JWT | List patient documents |
| `POST` | `/` | JWT | Upload a document (PDF/JPG/PNG/DICOM, max 20MB) |
| `DELETE` | `/:id` | JWT | Delete a document |

### Statistics — `/api/stats`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/admin` | Admin JWT | Clinic-wide KPIs and charts |
| `GET` | `/doctor` | Doctor JWT | Doctor-specific performance stats |
| `GET` | `/patient` | Patient JWT | Patient appointment and billing summary |
| `GET` | `/secretary` | JWT | Secretary workload stats |

### Notifications — `/api/notifications`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | JWT | Get user notifications |
| `PATCH` | `/:id/read` | JWT | Mark notification as read |
| `PATCH` | `/read-all` | JWT | Mark all notifications as read |

### Audit Logs — `/api/audit-logs`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Admin JWT | Paginated audit trail |

### Admin — `/api/admin`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/dashboard` | Admin JWT | Admin dashboard overview |
| `GET` | `/all-doctors` | Admin JWT | List all doctors |
| `POST` | `/add-doctor` | Admin JWT | Add a new doctor |
| `GET` | `/appointments` | Admin JWT | All clinic appointments |

### Clinic Config — `/api/clinic-config`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | JWT | Get clinic configuration |
| `PUT` | `/` | Admin JWT | Update clinic settings |

---

## 6. Security

### Authentication Flow

```
1. POST /api/auth/login  →  validate credentials
2a. 2FA disabled          →  return JWT immediately
2b. 2FA enabled           →  return { requires2FA: true, userId }
3b. POST /verify-2fa      →  validate TOTP code  →  return JWT
4.  Angular stores JWT    →  HTTP interceptor adds Authorization header
5.  Every protected API   →  middleware verifies JWT signature + role
```

### JWT Structure

```json
{
  "id": "<user-uuid>",
  "iat": 1716000000,
  "exp": 1716604800
}
```

- Algorithm: `HS256`
- Expiry: 7 days
- Secret: `JWT_SECRET` environment variable (min 32 chars recommended)

### TOTP 2FA

- Library: `otplib` (RFC 6238 compliant)
- Compatible with: Google Authenticator, Authy, 1Password
- Setup flow: generate secret → display QR code → user scans → verify with 6-digit code → enable
- Mandatory for **Admin** role, optional for all others

### Rate Limiting

| Scope | Limit | Window |
|---|---|---|
| All `/api/*` routes | 1000 requests | 15 minutes |
| `/api/auth/login` | 5 requests | 5 minutes |
| `/api/auth/register` | 5 requests | 5 minutes |
| `/api/auth/forgot-password` | 5 requests | 5 minutes |
| `/api/auth/verify-otp` | 5 requests | 5 minutes |

### RBAC (Role-Based Access Control)

Angular route guards (`authGuard` + `roleGuard`) protect all feature routes client-side. Express middlewares (`authUser`, `authDoctor`, `authAdmin`) independently enforce the same rules server-side — frontend protection is UX-only.

### Audit Trail

Every sensitive operation is written to the `AuditLog` table:

| Action | Logged |
|---|---|
| User login / logout | ✅ |
| OTP verification (success/failure) | ✅ |
| Password reset | ✅ |
| 2FA enable / disable | ✅ |
| Patient record access | ✅ |
| Data modification | ✅ |

Fields: `userId`, `action`, `resource`, `details`, `ipAddress`, `status`, `createdAt`

### Security Headers

`helmet.js` applies the following on all responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy`
- `X-XSS-Protection`

### File Upload Security

- Allowed types: PDF, JPG, PNG, GIF, DICOM
- Max file size: **20 MB**
- Filename sanitisation (removes special characters)
- MIME type + extension double-check

---

## 7. Features by Role

### Patient

| Feature | Description |
|---|---|
| Online appointment booking | 3-step form: choose doctor → pick slot → confirm |
| Medical folder | Full history of appointments, diagnoses, documents |
| Prescriptions | View and download as PDF |
| Document uploads | Upload and organise medical files (PDF, images, DICOM) |
| Vital signs tracking | Weight, height, BMI, pulse, SpO2, temperature |
| Email reminders | Automated reminders at 24h and 1h before appointment |
| Real-time notifications | Socket.IO push events |
| Account management | Profile, password, 2FA settings |

### Doctor

| Feature | Description |
|---|---|
| Daily/weekly schedule | Calendar view with colour-coded appointment status |
| Patient records | Complete medical history during consultation |
| Electronic prescriptions | Create, manage, and export as PDF |
| Availability management | Configure working hours per day of week |
| Time blocking | Block specific slots for personal time or breaks |
| Personal statistics | Appointment completion rate, patient count, revenue |
| Medical reports | Structured consultation reports |

### Secretary

| Feature | Description |
|---|---|
| Appointment management | Create, reschedule, cancel appointments |
| Patient registration | Multi-step intake form |
| Walk-in patient | Add patient directly to the queue |
| Emergency admission | Priority queue with visual indicator |
| Invoicing | Generate and send invoices, export as PDF |
| Care sheets | Create and submit to insurance providers |
| Queue dashboard | Real-time waiting room status |

### Admin

| Feature | Description |
|---|---|
| Mandatory 2FA | TOTP required on every login |
| Analytics dashboard | Revenue, appointments, KPIs, trend charts |
| Doctor management | Add, edit, activate/deactivate doctors |
| Staff management | Secretary accounts and roles |
| Patient directory | Full patient list with filters |
| Audit logs | Paginated, searchable action trail |
| Financial reports | Revenue, outstanding invoices, statistics |
| Clinic configuration | Name, address, services, pricing |

---

## 8. Microservices Architecture (Planned)

The current system runs as a **monolith with a gateway**. The gateway is already in place and routes certain paths to the auth-service. The planned full microservices migration is targeted for v2.0:

| Service | Port | Responsibility |
|---|---|---|
| `gateway` | 3000 | Single entry point, JWT enrichment, routing |
| `auth-service` | 3001 | Authentication, 2FA, password reset |
| `doctor-service` | 3002 | Doctor profiles, availability, scheduling |
| `booking-service` | 3003 | Appointment creation and management |
| `notification-service` | — | Email and push notifications (RabbitMQ consumer) |
| `main-backend` | 3004 | All remaining routes (invoices, records, stats, etc.) |

Services communicate via:
- **RabbitMQ** — async events (e.g. `PASSWORD_RESET`, `APPOINTMENT_BOOKED`)
- **Redis** — shared caching for doctor slots and availability

---

## 9. Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run security tests (OWASP)
npm run test:security

# Run UX completeness tests
npm run test:ux

# Run with coverage report
npm run test:coverage

# Generate HTML report
npm run test:report
```

### Test Coverage

| Suite | Location | Focus |
|---|---|---|
| Unit | `tests/unit/` | Controller logic, validators, utilities |
| Integration | `tests/integration/` | API endpoint contracts, database operations |
| Security | `tests/security/` | OWASP Top 10, BOLA/IDOR, injection, rate limits |
| UX | `tests/ux/` | Feature completeness, route coverage |
| E2E | `tests/e2e/` | Full user flows |

---

*MediSync Technical Documentation · v1.0.0 · 2026*
