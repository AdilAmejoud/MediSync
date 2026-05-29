import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const REPORT_DIR = resolve(__dirname);
const TEMP_JSON = resolve(REPORT_DIR, 'raw.json');
const REPORT_HTML = resolve(REPORT_DIR, 'index.html');

// ── Test Information Catalog ───────────────────────────────────────────
// For every test: what it does, its role/benefit, and the risk if it fails.

const TEST_INFO = {
  // ── Auth Controller Unit Tests ──
  'login should reject missing email': {
    explanation: 'Calls login() with an empty body and expects a 400 status, confirming email is required.',
    role: 'Enforces that email is mandatory for authentication, preventing incomplete login attempts.',
    risk: 'Users could attempt login without an email, potentially bypassing normal authentication logic.',
  },
  'login should reject missing password': {
    explanation: 'Calls login() with an empty body and expects a 400 status, confirming password is required.',
    role: 'Enforces password as a mandatory credential field for secure authentication.',
    risk: 'Password-less login could succeed, creating a critical authentication bypass vulnerability.',
  },
  'login should reject missing role': {
    explanation: 'Calls login() with an empty body and expects a 400 status, confirming role is required.',
    role: 'Ensures users specify their role (patient/doctor/admin) for proper authorization context.',
    risk: 'Users could log in without a role, causing authorization confusion and potential privilege escalation.',
  },
  'register should reject missing name': {
    explanation: 'Calls register() with an empty body and expects a 400 status, confirming name is required.',
    role: 'Ensures every new account has a display name for identification.',
    risk: 'Accounts without names could be created, polluting the system with anonymous or placeholder users.',
  },
  'register should reject missing email': {
    explanation: 'Calls register() with an empty body and expects a 400 status, confirming email is required.',
    role: 'Ensures every new account has an email for login, recovery, and communication.',
    risk: 'Accounts without emails make password resets and notifications impossible, creating dead accounts.',
  },
  'register should reject missing password': {
    explanation: 'Calls register() with an empty body and expects a 400 status, confirming password is required.',
    role: 'Ensures every new account is created with a password for basic security.',
    risk: 'Password-less accounts could be registered, allowing anyone to access them without credentials.',
  },

  // ── Admin Controller Unit Tests ──
  'addDoctor should reject missing name via json response': {
    explanation: 'Calls addDoctor() with an empty body and expects a JSON response indicating failure.',
    role: 'Prevents creating doctor records without a name, maintaining data quality.',
    risk: 'Doctors without names could be created, breaking profile pages and directory listings.',
  },
  'addDoctor should reject missing email via json response': {
    explanation: 'Calls addDoctor() with an empty body and expects a JSON response indicating failure.',
    role: 'Ensures every doctor account has an email for login and communication.',
    risk: 'Doctors without emails cannot log in or receive system notifications, making their accounts unusable.',
  },

  // ── Doctor Controller Unit Tests ──
  'appointmentComplete should reject missing appointmentId': {
    explanation: 'Calls appointmentComplete() with an empty body and expects a JSON response.',
    role: 'Ensures appointments cannot be marked complete without a valid ID, preventing state corruption.',
    risk: 'Appointments could be completed without an ID, causing database inconsistencies or undefined behavior.',
  },

  // ── User Controller Unit Tests ──
  'bookAppointment should reject missing booking details via json': {
    explanation: 'Calls bookAppointment() with an empty body and expects a JSON response.',
    role: 'Ensures booking requires a valid payload before creating appointments.',
    risk: 'Empty or incomplete booking requests could create malformed appointments in the database.',
  },
  'cancelAppointment should reject missing appointmentId via json': {
    explanation: 'Calls cancelAppointment() with an empty body and expects a JSON response.',
    role: 'Ensures cancellations require a valid appointment ID to prevent accidental cancellations.',
    risk: 'Cancel requests without an ID could cause server errors or cancel unintended appointments.',
  },

  // ── Auth Middleware Unit Tests ──
  'authAdmin should reject with json response if no auth header': {
    explanation: 'Calls authAdmin with no Authorization header and expects a JSON response (not next()).',
    role: 'Ensures admin routes are protected and cannot be accessed without a token.',
    risk: 'Unauthenticated requests could reach admin endpoints, risking full system compromise.',
  },
  'authUser should reject with json response if no auth header': {
    explanation: 'Calls authUser with no Authorization header and expects a JSON response (not next()).',
    role: 'Ensures user routes are protected and cannot be accessed without a token.',
    risk: 'Unauthenticated users could access protected patient data and perform actions without authorization.',
  },
  'authDoctor should reject with json response if no auth header': {
    explanation: 'Calls authDoctor with no Authorization header and expects a JSON response (not next()).',
    role: 'Ensures doctor routes are protected and cannot be accessed without a token.',
    risk: 'Unauthenticated users could access doctor appointment data and perform doctor-level actions.',
  },

  // ── Integration: Auth ──
  'POST /api/auth/login should return 400 when email is missing': {
    explanation: 'Dynamically imports login() from authController and calls it with an empty body.',
    role: 'End-to-end validation that the login endpoint enforces required fields.',
    risk: 'Login without email could proceed, breaking the authentication workflow.',
  },
  'POST /api/auth/login should return 400 when password is missing': {
    explanation: 'Dynamically imports login() from authController and calls it with an empty body.',
    role: 'Ensures password is mandatory for secure authentication.',
    risk: 'Password-less login could be possible, creating a critical security vulnerability.',
  },
  'GET /api/auth/profile should exist as an exported route': {
    explanation: 'Imports authRoute.js and verifies it exports a router.',
    role: 'Confirms the profile endpoint is part of the route structure.',
    risk: 'Profile and all auth routes would be unavailable, breaking user sessions.',
  },

  // ── Integration: Admin ──
  'admin route file exports a router': {
    explanation: 'Imports adminRoute.js and verifies it exports a default router.',
    role: 'Confirms admin routing module is properly wired into the application.',
    risk: 'All admin API endpoints become inaccessible.',
  },
  'admin controller has required exports': {
    explanation: 'Verifies adminController exports addDoctor, allDoctors, appointmentAdmin, appointmentCancel, adminDashboard.',
    role: 'Ensures admins can manage doctors, oversee appointments, and access the dashboard.',
    risk: 'Administrators lose core management capabilities, crippling clinic oversight.',
  },
  'admin routes use authAdmin middleware': {
    explanation: 'Scans adminRoute.js file content for authAdmin references.',
    role: 'Ensures admin-only endpoints are protected by admin-level authentication.',
    risk: 'Non-admin users could access administrator functions, leading to privilege escalation.',
  },

  // ── Integration: Doctor ──
  'doctor route file exports a router': {
    explanation: 'Imports doctorRoute.js and verifies it exports a default router.',
    role: 'Confirms doctor routing module is properly integrated.',
    risk: 'All doctor-facing API endpoints become inaccessible.',
  },
  'doctor controller has required exports': {
    explanation: 'Verifies doctorController exports doctorList, appointmentsDoctor, appointmentComplete.',
    role: 'Ensures doctors can list themselves, view appointments, and mark them complete.',
    risk: 'Doctors cannot manage their core workflow, rendering the doctor interface non-functional.',
  },
  'public GET /doctor/list is in the routes': {
    explanation: 'Scans doctorRoute.js for doctorList references.',
    role: 'Ensures patients can discover available doctors without logging in.',
    risk: 'Patients cannot find doctors to book appointments with.',
  },

  // ── Integration: User ──
  'user route file exports a router': {
    explanation: 'Imports userRoute.js and verifies it exports a default router.',
    role: 'Confirms user routing module is properly wired.',
    risk: 'All user-facing API endpoints (booking, listing, cancellation) become unavailable.',
  },
  'user controller has booking and cancellation exports': {
    explanation: 'Verifies userController exports bookAppointment, listAppointment, cancelAppointment.',
    role: 'Ensures the user controller fulfills its contract for managing patient appointments.',
    risk: 'Core patient features are missing, breaking frontend integrations.',
  },
  'register endpoint is publicly accessible': {
    explanation: 'Scans userRoute.js for registerUser references.',
    role: 'Ensures new patients can self-register without pre-existing authentication.',
    risk: 'The public registration endpoint may be missing, preventing new user sign-ups.',
  },

  // ── Integration: Appointments ──
  'appointment route file exports a router': {
    explanation: 'Imports appointmentRoute.js and verifies it exports a default router.',
    role: 'Confirms appointment routing module is present.',
    risk: 'All appointment CRUD operations become unavailable, paralyzing clinic scheduling.',
  },
  'appointment controller has required exports': {
    explanation: 'Verifies the appointment controller exports getAllAppointments, createAppointment, updateAppointmentStatus, cancelAppointment.',
    role: 'Ensures full appointment lifecycle management is implemented.',
    risk: 'Key appointment management features are missing, breaking core clinic operations.',
  },
  'appointment routes use authUser middleware': {
    explanation: 'Scans appointmentRoute.js for authUser references.',
    role: 'Ensures appointment endpoints are protected by authentication.',
    risk: 'Appointment endpoints may be publicly accessible, allowing anyone to create/modify/cancel appointments.',
  },

  // ── Security: Token Tests ──
  'authUser rejects requests without authorization header': {
    explanation: 'Calls authUser middleware with no Authorization header.',
    role: 'Ensures user routes are protected against unauthenticated access.',
    risk: 'Unauthenticated requests could reach protected controllers, allowing unauthorized data access.',
  },
  'authAdmin rejects requests without authorization header': {
    explanation: 'Calls authAdmin middleware with no Authorization header.',
    role: 'Ensures admin routes require authentication before granting access.',
    risk: 'Unauthenticated requests could reach admin endpoints, risking full system compromise.',
  },
  'authDoctor rejects requests without authorization header': {
    explanation: 'Calls authDoctor middleware with no Authorization header.',
    role: 'Ensures doctor routes require authentication.',
    risk: 'Unauthenticated users could access doctor appointment data and perform doctor-level actions.',
  },
  'authUser rejects requests with malformed token': {
    explanation: 'Calls authUser middleware with an invalid JWT token string.',
    role: 'Ensures forged or corrupted tokens are rejected, not silently accepted.',
    risk: 'Any arbitrary string could be used as a valid token, completely undermining authentication.',
  },
  'authUser rejects token without Bearer prefix': {
    explanation: 'Calls authUser middleware with a token missing the Bearer scheme.',
    role: 'Ensures Authorization header follows the standard Bearer format.',
    risk: 'Non-standard authorization formats could bypass token validation.',
  },

  // ── Security: Authorization ──
  'patient token should not pass admin middleware': {
    explanation: 'Calls authAdmin middleware with a patient-level token.',
    role: 'Prevents privilege escalation from patient to admin.',
    risk: 'Any patient could perform admin actions, leading to complete system compromise.',
  },
  'patient token should not pass doctor middleware': {
    explanation: 'Calls authDoctor middleware with a patient-level token.',
    role: 'Prevents patients from accessing doctor-only features.',
    risk: 'Patients could access doctor-level data and modify other patients\' appointments.',
  },
  'should detect that no authSecretary middleware exists': {
    explanation: 'Scans the middleware directory for any secretary-related file.',
    role: 'Documents the known gap that secretary role lacks dedicated auth middleware.',
    risk: 'Secretary actions are not properly role-protected; any authenticated user could perform secretary functions.',
  },

  // ── Security: Rate Limiting ──
  'auth limiter is configured in server.js with max 5 attempts': {
    explanation: 'Scans server.js for rate limiter configuration with max 5.',
    role: 'Prevents brute-force attacks by limiting rapid auth requests.',
    risk: 'Attackers can make unlimited login attempts, enabling password guessing and account compromise.',
  },
  'auth limiter covers login, register, forgot-password, reset-password, verify-otp': {
    explanation: 'Scans server.js to verify all critical auth endpoints are behind the rate limiter.',
    role: 'Ensures comprehensive brute-force protection across the entire auth attack surface.',
    risk: 'Some auth endpoints (password reset, OTP) could be brute-forced individually.',
  },
  'global limiter is configured with 1000 requests per 15 minutes': {
    explanation: 'Scans server.js for global rate limiter (1000/15min).',
    role: 'Prevents general API abuse and denial-of-service attacks.',
    risk: 'API lacks global rate protection, making it vulnerable to volumetric DoS attacks.',
  },
  'global limiter applies to /api prefix': {
    explanation: 'Scans server.js for the /api mount point of the global limiter.',
    role: 'Ensures all API routes are throttled, not just auth.',
    risk: 'Non-auth API routes are unthrottled, allowing targeted abuse.',
  },
  'standard rate limit headers are enabled': {
    explanation: 'Scans server.js for standardHeaders: true in rate limiter config.',
    role: 'Provides clients with Retry-After and X-RateLimit-* headers.',
    risk: 'Clients will not receive rate-limit headers, leading to unexpected blocking without feedback.',
  },

  // ── Security: Auth Security ──
  'rate limiting is configured on auth endpoints': {
    explanation: 'Scans server.js for authLimiter configuration.',
    role: 'Ensures brute-force protection is active on authentication routes.',
    risk: 'Attackers can make unlimited login attempts to guess passwords.',
  },
  'isStrongPassword utility validates password strength': {
    explanation: 'Tests isStrongPassword with weak and strong passwords.',
    role: 'Enforces minimum password complexity to prevent easily guessable passwords.',
    risk: 'Weak passwords like "Weak1" would be accepted, making accounts vulnerable to brute-force.',
  },
  '2FA endpoints exist in auth route': {
    explanation: 'Scans auth route file for 2FA-related endpoint references.',
    role: 'Ensures two-factor authentication infrastructure is in place.',
    risk: 'Accounts are protected only by single-factor passwords, insufficient for healthcare data.',
  },

  // ── Security: Data Encryption ──
  '[GAP] server.js has no HTTPS enforcement': {
    explanation: 'Scans server.js for HTTPS server creation or HTTP-to-HTTPS redirect logic — expects none (gap detection).',
    role: 'Documents that the application currently serves traffic over plain HTTP without TLS encryption.',
    risk: 'Without HTTPS enforcement, all patient data (credentials, medical records, PHI) is transmitted in plaintext over the network, violating HIPAA Security Rule §164.312(e)(1).',
  },
  'medical diagnosis fields should not appear in plaintext in controller create/update logic': {
    explanation: 'Scans all controller files for sensitive field names (diagnosis, medicalHistory, treatment) and verifies they are hashed/encrypted before being stored via Prisma.',
    role: 'Ensures PHI fields like diagnosis and medical history are never stored as plaintext in the database, meeting HIPAA encryption standards.',
    risk: 'If PHI fields are stored in plaintext, a database breach directly exposes patients\' most sensitive medical information, violating HIPAA Privacy Rule §164.502(d).',
  },
  'careSheet route does not expose raw PHI in GET responses without sanitization': {
    explanation: 'Scans careSheetRoute.js for field mapping logic that transforms raw data before returning it in API responses.',
    role: 'Ensures care sheet responses do not inadvertently leak raw medical acts or financial data without proper field selection.',
    risk: 'Raw PHI exposed in API responses could be intercepted by unauthorized clients or logged in plaintext by intermediary services.',
  },
  '[GAP] patient route exposes nationalId and full dateOfBirth in plaintext': {
    explanation: 'Scans patientRoute.js to verify that nationalId and dateOfBirth are returned as plaintext from p.nationalId and p.user.dateOfBirth — a PII overexposure gap.',
    role: 'Flags that highly sensitive national identity numbers and birth dates are exposed in every patient list API response.',
    risk: 'Exposing nationalId numbers in every patient list response creates a mass PII exfiltration risk if any endpoint is compromised, violating HIPAA minimum necessary standard.',
  },
  'authController register should hash passwords before storing': {
    explanation: 'Scans authController.js for bcrypt.hash usage to confirm passwords are one-way hashed before being passed to Prisma create.',
    role: 'Ensures user credentials are never stored as plaintext; passwords are salted and hashed per industry standard.',
    risk: 'Plaintext password storage means any database compromise exposes all user credentials, enabling account takeover across the platform.',
  },
  'helmet middleware is configured with CSP and XSS protection headers': {
    explanation: 'Scans server.js for helmet() and cors() configuration to verify transmission security headers are enabled.',
    role: 'Ensures Content-Security-Policy, X-Content-Type-Options, and other security headers protect data during transmission.',
    risk: 'Missing security headers leave the application vulnerable to content injection, MIME-type sniffing, and clickjacking attacks.',
  },
  // ── Security: BOLA / IDOR Advanced ──
  '[GAP] Patient A can query Patient B appointments via query parameter': {
    explanation: 'Invokes getAllAppointments with a patientId query targeting a different patient while authenticated as Patient A — flags the lack of user-scoped filtering.',
    role: 'Documents that the appointment listing endpoint accepts any patientId in query parameters without verifying it belongs to the authenticated user.',
    risk: 'Patients can view, modify, or cancel other patients\' appointments by simply changing the patientId query parameter.',
  },
  'Patient A should not access Patient B care sheets': {
    explanation: 'Scans careSheetRoute.js for user-scoped filtering logic, verifying cross-patient care sheet access is not possible.',
    role: 'Prevents patients from viewing or modifying other patients\' care sheets through ID manipulation.',
    risk: 'Without patient-scoped filters, any authenticated user can enumerate and access all care sheets in the system, exposing treatment records across patients.',
  },
  'Patient A should not access Patient B document metadata': {
    explanation: 'Scans documentRoute.js for patientId or userId filtering to verify document access is user-scoped.',
    role: 'Ensures medical document metadata is isolated per patient and not visible to other users.',
    risk: 'Cross-patient document access exposes sensitive file metadata (filenames, upload dates, file types) that can reveal treatment patterns.',
  },
  'Patient A should not access Patient B appointments via query parameter tampering': {
    explanation: 'Invokes getAllAppointments with a patientId query targeting a different patient while authenticated as Patient A.',
    role: 'Verifies the appointments endpoint enforces user context when filtering by patientId, preventing IDOR via query parameter manipulation.',
    risk: 'Patients can view, modify, or cancel other patients\' appointments by simply changing the patientId query parameter.',
  },
  'notification route uses req.body.userId instead of req.user.id': {
    explanation: 'Counts req.body.userId vs req.user.id occurrences in notificationRoute.js to detect IDOR vulnerability.',
    role: 'Flags a critical IDOR vulnerability where the userId is taken from the untrusted request body instead of the verified JWT token.',
    risk: 'Any authenticated user can read, mark-read, or delete ANY other user\'s notifications by simply sending their userId in the request body.',
  },
  'secretaire should not access doctor-only clinical fields': {
    explanation: 'Scans careSheetRoute.js for authDoctor middleware usage, verifying that clinical data endpoints are role-restricted.',
    role: 'Ensures the secretaire role cannot access doctor-only fields like diagnoses, treatments, or prescriptions.',
    risk: 'Without role-based guards, secretaries (or any authenticated user) can read and modify clinical data they should not have access to.',
  },
  'secretaire should not be able to modify care sheets without patient/doctor scope restriction': {
    explanation: 'Scans careSheetRoute.js for role-check logic (authDoctor, authAdmin, role check) on write operations.',
    role: 'Ensures care sheet creation/modification is restricted to authorized roles.',
    risk: 'Any authenticated user (patient, secretaire) can create care sheets for any patient-doctor pair, enabling data fabrication.',
  },
  'prescription route uses only authUser': {
    explanation: 'Scans prescriptionRoute.js to verify doctor-specific auth middleware is absent, documenting a role-escalation gap.',
    role: 'Flags that prescription management lacks doctor-specific authorization, allowing any authenticated user to create prescriptions.',
    risk: 'Patients or secretaries could forge prescriptions by bypassing doctor-only authorization on prescription creation.',
  },
  'careSheet POST handler uses destructured assignment (whitelist), not spread of req.body': {
    explanation: 'Scans careSheetRoute.js POST handler for destructured field assignment vs req.body spread operator.',
    role: 'Prevents mass assignment attacks where extra fields in the request body could be injected into the database.',
    risk: 'Without field whitelisting, attackers can set arbitrary Prisma fields (e.g., admin flags, pricing overrides) by adding extra properties to the POST body.',
  },
  'patient PUT handler uses destructured assignment (whitelist), not spread of req.body': {
    explanation: 'Scans patientRoute.js PUT handler for destructured field assignment vs req.body spread operator.',
    role: 'Prevents mass assignment on patient profile updates, protecting internal fields from client-side manipulation.',
    risk: 'Without whitelisting, patients could modify restricted fields like nationalId, status, or insurance policy numbers beyond their authorization scope.',
  },
  'auth-helper generates distinct tokens for each role with correct claims': {
    explanation: 'Calls generateToken for each role and verifies they are valid JWT strings with distinct signatures.',
    role: 'Ensures the token generation utility produces cryptographically distinct tokens per role for authorization testing.',
    risk: 'If tokens are not distinct, role escalation tests would be invalid and authorization logic would be untestable.',
  },
  // ── Security: OWASP Injection ──
  '[GAP] appointmentController stores notes directly without sanitization': {
    explanation: 'Scans appointmentController.js for input sanitization (escape, sanitize, xss) — expects none (gap detection). The notes field is stored as-is from req.body.',
    role: 'Documents that appointment notes have no XSS sanitization before database storage, creating a stored XSS vector.',
    risk: 'Attackers can inject <script> payloads into appointment notes that execute when doctors or admins view appointment details, enabling session theft.',
  },
  'authController register should not directly store unsanitized input into the database': {
    explanation: 'Scans authController.js for input sanitization (escape, sanitize, xss) before database storage.',
    role: 'Prevents stored XSS where malicious scripts in registration fields (name, email) would execute in other users\' browsers.',
    risk: 'Without sanitization, attackers can register with <script> payloads that execute when admins view patient lists, leading to session theft or data exfiltration.',
  },
  'appointmentController createAppointment should sanitize notes field before storage': {
    explanation: 'Scans appointmentController.js to verify the notes field is sanitized or validated before being stored in the database.',
    role: 'Prevents stored XSS via appointment notes that would execute when doctors or admins view appointment details.',
    risk: 'Unsanitized notes allow attackers to inject JavaScript that steals session cookies or performs actions on behalf of a doctor viewing the appointment.',
  },
  'patient registration name/email fields should be sanitized or validated for XSS payloads': {
    explanation: 'Verifies authController.js contains validation checks for name and email fields (required field checks).',
    role: 'Ensures basic input validation exists before registration data is processed, preventing malformed XSS payloads from entering the system.',
    risk: 'Registration fields without validation can accept script payloads, enabling persistent XSS in the patient directory.',
  },
  'clinical notes or appointment reason textarea should not directly reflect unescaped HTML': {
    explanation: 'Scans route files for patterns where user-supplied input could be returned as raw HTML in responses.',
    role: 'Prevents reflected XSS where user input in clinical notes is echoed back without escaping.',
    risk: 'Reflected XSS in clinical note endpoints allows attackers to craft links that execute scripts in a medical professional\'s browser.',
  },
  'audit logs should escape or encode user-supplied fields before recording': {
    explanation: 'Scans authController.js for logAudit/logEvent calls that record user-supplied data.',
    role: 'Ensures audit logs do not become an XSS vector when logs are viewed in administrative interfaces.',
    risk: 'If audit logs contain unescaped user input, viewing logs in a web-based admin panel would execute stored XSS.',
  },
  'appointmentController getAllAppointments uses Prisma parameterized where object, not string concatenation': {
    explanation: 'Scans appointmentController.js for Prisma where-object queries vs string-concatenated query building.',
    role: 'Prevents SQL injection through query parameter manipulation by ensuring Prisma parameterized queries are used exclusively.',
    risk: 'String concatenation in Prisma queries allows SQL injection through query parameters, potentially exposing the entire database.',
  },
  'login endpoint should use Prisma findUnique with parameterized email, not raw query': {
    explanation: 'Scans authController.js for Prisma findUnique usage vs $queryRaw/$executeRaw calls.',
    role: 'Ensures credential lookup uses Prisma\'s built-in parameterized queries to prevent SQL injection at the login endpoint.',
    risk: 'A SQL injection in the login endpoint would bypass authentication entirely, allowing attackers to log in as any user without knowing their password.',
  },
  'Prisma queries across all routes should avoid $queryRaw with user-supplied input': {
    explanation: 'Scans all route and controller files for raw query execution ($queryRaw, $executeRaw) with user-controlled parameters.',
    role: 'Ensures the entire codebase avoids raw SQL execution patterns that could introduce SQL injection vulnerabilities.',
    risk: 'Any use of $queryRaw or $executeRaw with unsanitized user input creates a SQL injection vector in that endpoint.',
  },
  'helmet configures contentSecurityPolicy and XSS filter headers': {
    explanation: 'Scans server.js for helmet middleware configuration that sets CSP and XSS protection HTTP headers.',
    role: 'Provides defense-in-depth against XSS attacks via browser-enforced Content Security Policy headers.',
    risk: 'Without helmet, the application has no CSP headers, making all endpoints more vulnerable to reflected and stored XSS.',
  },
  'express.json() body parser is configured with size limits to prevent payload bloat': {
    explanation: 'Scans server.js for body-parser size limits that prevent excessively large request payloads.',
    role: 'Prevents denial-of-service attacks through oversized request bodies that could exhaust server memory.',
    risk: 'Without size limits, attackers can send multi-gigabyte JSON payloads to crash the server or exhaust resources.',
  },
  'standard security headers (X-Content-Type-Options, X-Frame-Options) should be present via helmet': {
    explanation: 'Scans server.js for helmet() invocation which sets standard security headers by default.',
    role: 'Ensures clickjacking protection, MIME-type sniffing prevention, and other standard browser security headers are active.',
    risk: 'Missing security headers allow clickjacking attacks, MIME-type confusion, and other browser-level exploits.',
  },
  // ── Security: Input Validation ──
  'should reject missing request body gracefully': {
    explanation: 'Calls login() with an undefined body and expects a 400 status.',
    role: 'Ensures server handles malformed requests gracefully without crashing.',
    risk: 'An empty body could crash the server (DoS) or bypass authentication checks.',
  },
  'should handle invalid email format': {
    explanation: 'Calls login() with an invalid email format.',
    role: 'Ensures the login handler validates email format.',
    risk: 'Invalid email formats could bypass validation and cause downstream errors.',
  },
  'controllers should not output unsanitized user input': {
    explanation: 'Scans server.js for helmet middleware.',
    role: 'Prevents XSS attacks by ensuring security headers are applied.',
    risk: 'Application lacks XSS protection headers, making it vulnerable to reflected XSS.',
  },
  'should handle null email gracefully': {
    explanation: 'Calls login() with null as the email value.',
    role: 'Ensures null-type inputs are handled gracefully.',
    risk: 'A null email could crash the server or bypass validation logic.',
  },

  // ── Security: File Upload ──
  'multer middleware file should exist': {
    explanation: 'Checks that backend/middlewares/multer.js exists on disk.',
    role: 'Ensures the file upload infrastructure is physically present.',
    risk: 'File upload mechanism is completely missing, preventing document attachments.',
  },
  'multer uses disk storage': {
    explanation: 'Scans multer.js for diskStorage configuration.',
    role: 'Confirms uploaded files are persisted to disk, not just held in memory.',
    risk: 'Multer configuration may be incorrect, causing upload failures or data loss.',
  },
  'should restrict upload to allowed file types': {
    explanation: 'Verifies dangerous file types (HTML, JS, PHP, SH, SVG) are excluded from the allowlist.',
    role: 'Prevents attackers from uploading executable or XSS-capable files.',
    risk: 'Attackers could upload malicious files (PHP webshells, SVG with JS), leading to RCE or stored XSS.',
  },
  'documentRoute only has GET endpoint (POST missing - GAP)': {
    explanation: 'Scans documentRoute.js and asserts no POST endpoint exists — a known gap.',
    role: 'Documents that document upload is not yet implemented.',
    risk: 'If this test starts passing (POST appears), the upload implementation needs security review.',
  },

  // ── UX: Patient Flow ──
  'step 1: registration validates email and password': {
    explanation: 'Calls registerUser() with an empty body and expects a JSON response.',
    role: 'Ensures the first step of patient journey (registration) validates input.',
    risk: 'Registration flow may accept empty requests, blocking new patient sign-ups.',
  },
  'step 2: login validates credentials': {
    explanation: 'Calls login() with an empty body and expects 400 status.',
    role: 'Ensures patients must provide valid credentials to log in.',
    risk: 'Login may accept empty credentials, allowing authentication bypass.',
  },
  'step 3: doctor listing is publicly accessible': {
    explanation: 'Verifies doctorController exports doctorList.',
    role: 'Ensures patients can browse doctors without logging in.',
    risk: 'Patients cannot view available doctors, blocking the prerequisite step for booking.',
  },
  'step 4: booking requires authentication': {
    explanation: 'Calls bookAppointment() with an empty body and no user context.',
    role: 'Ensures only authenticated users can book appointments.',
    risk: 'Unauthenticated users could book appointments, leading to scheduling abuse.',
  },
  'step 5: viewing appointments requires user context': {
    explanation: 'Calls listAppointment() with a user context object.',
    role: 'Ensures authenticated patients can retrieve their appointments.',
    risk: 'Patients cannot view their booked appointments, creating poor UX.',
  },

  // ── UX: Doctor Flow ──
  'step 1: public doctor list is accessible': {
    explanation: 'Verifies doctorController exports doctorList.',
    role: 'Ensures the public doctor listing endpoint is available.',
    risk: 'Patients cannot discover doctors to book with.',
  },
  'step 2: doctor appointments require doctor role': {
    explanation: 'Scans doctorRoute.js for authDoctor middleware references.',
    role: 'Ensures doctor-specific endpoints are role-protected.',
    risk: 'Non-doctors could access doctor appointment management.',
  },
  'step 3: doctor dashboard exists': {
    explanation: 'Verifies doctorController exports doctorDashboard.',
    role: 'Ensures doctors have a dashboard endpoint for their stats.',
    risk: 'Doctors have no analytics or overview of their practice.',
  },
  'step 4: doctor profile endpoint exists': {
    explanation: 'Verifies doctorController exports doctorProfile.',
    role: 'Ensures doctors can view their own profile.',
    risk: 'Doctors cannot manage their professional information.',
  },

  // ── UX: Admin Flow ──
  'step 1: admin dashboard exists': {
    explanation: 'Verifies adminController exports adminDashboard.',
    role: 'Ensures admins have a dashboard for clinic overview.',
    risk: 'Admins have no centralized view of clinic operations.',
  },
  'step 2: admin routes require authAdmin middleware': {
    explanation: 'Scans adminRoute.js for authAdmin references.',
    role: 'Ensures admin endpoints are role-protected.',
    risk: 'Non-admin users could access administrative functions.',
  },
  'step 3: staff listing is configured': {
    explanation: 'Verifies staff route file exports a router.',
    role: 'Ensures the staff listing feature exists.',
    risk: 'Admins cannot manage clinic staff.',
  },
  'step 4: clinic config routes exist': {
    explanation: 'Verifies configController exports getConfig and putConfig.',
    role: 'Ensures clinic configuration can be viewed and updated.',
    risk: 'Clinic settings cannot be managed through the API.',
  },
  'step 5: reports endpoint exists': {
    explanation: 'Verifies report route file exports a router.',
    role: 'Ensures admin reports feature exists.',
    risk: 'Admins cannot generate or view clinic reports.',
  },

  // ── UX: Secretaire Flow ──
  'step 1: secretary stats endpoint is configured': {
    explanation: 'Verifies statsController exports getSecretaryStats.',
    role: 'Ensures secretaries have access to their dashboard statistics.',
    risk: 'Secretaries have no dashboard or stats for clinic monitoring.',
  },
  'step 2: no authSecretary middleware exists (gap)': {
    explanation: 'Scans middleware directory for any secretary-related file.',
    role: 'Documents the missing secretary-specific authentication guard.',
    risk: 'Secretary role lacks dedicated auth; relies on generic authUser.',
  },
  'step 3: secretary can access appointments through authUser': {
    explanation: 'Scans appointmentRoute.js for authUser middleware.',
    role: 'Verifies appointments are at least protected by basic auth.',
    risk: 'Appointment routes may have no authentication at all.',
  },
  'step 4: no secretary-specific route file exists': {
    explanation: 'Scans routes directory for any secretary route file.',
    role: 'Documents the missing dedicated secretary API endpoints.',
    risk: 'Secretary has no dedicated routes, limiting their functionality.',
  },

  // ── UX: API Coverage ──
  'route file exists and exports a router': {
    explanation: 'Imports each route file and verifies it exports a default router.',
    role: 'Confirms every API module is properly structured and exportable.',
    risk: 'Missing router exports break import chains and mount points in server.js.',
  },
  'is mounted in server.js': {
    explanation: 'Scans server.js for each route mount point.',
    role: 'Ensures every route file is actually connected to the Express app.',
    risk: 'Unmounted routes are dead code — their endpoints are not reachable.',
  },
  'auth controller exports all required functions': {
    explanation: 'Verifies authController exports login, register, getProfile, forgotPassword, resetPassword.',
    role: 'Ensures the full auth lifecycle is implemented.',
    risk: 'Missing auth exports break login, registration, profile, and password management.',
  },
  'admin controller exports CRUD functions': {
    explanation: 'Verifies adminController exports addDoctor, allDoctors, appointmentAdmin, appointmentCancel, adminDashboard.',
    role: 'Ensures the full admin management feature set.',
    risk: 'Admins lose critical management capabilities.',
  },
  'stats controller exports all stat functions': {
    explanation: 'Verifies statsController exports getAdminStats, getDoctorStats, getPatientStats, getSecretaryStats.',
    role: 'Ensures all user roles have access to their statistics.',
    risk: 'Users get empty dashboards or 500 errors on stats pages.',
  },
  'middleware files export default functions': {
    explanation: 'Verifies authUser, authAdmin, authDoctor all export default middleware functions.',
    role: 'Ensures the three authentication guard modules are properly exported.',
    risk: 'Route protection silently fails — all endpoints could become public.',
  },

  // ── UX: Incomplete Services (Gap Detections) ──
  '[GAP] authSecretary middleware does not exist': {
    explanation: 'Scans middleware directory for any authSecretary file — expects none (gap detection).',
    role: 'Flags that secretary role has no dedicated authentication middleware.',
    risk: 'Secretary actions lack proper role-based access control.',
  },
  '[GAP] Documents has no POST endpoint': {
    explanation: 'Scans documentRoute.js for POST routes — expects none (gap detection).',
    role: 'Flags that document file upload is not yet implemented.',
    risk: 'Patients and doctors cannot upload medical documents to the system.',
  },
  '[GAP] Documents has no DELETE endpoint': {
    explanation: 'Scans documentRoute.js for DELETE routes — expects none (gap detection).',
    role: 'Flags that document deletion is not yet implemented.',
    risk: 'Users cannot remove uploaded documents, leading to data clutter.',
  },
  '[GAP] CareSheets has no PUT endpoint': {
    explanation: 'Scans careSheetRoute.js for PUT routes — expects none (gap detection).',
    role: 'Flags that care sheet updates are not yet implemented.',
    risk: 'Care sheets cannot be modified after creation, requiring delete-and-recreate.',
  },
  '[GAP] CareSheets has no DELETE endpoint': {
    explanation: 'Scans careSheetRoute.js for DELETE routes — expects none (gap detection).',
    role: 'Flags that care sheet deletion is not yet implemented.',
    risk: 'Incorrect or duplicate care sheets cannot be removed.',
  },
  '[GAP] Notifications use req.body.userId instead of req.user.id (IDOR)': {
    explanation: 'Counts req.body.userId vs req.user.id occurrences in notificationRoute.js.',
    role: 'Detects an Insecure Direct Object Reference vulnerability in notifications.',
    risk: 'Users can read/modify other users\' notifications by changing the userId parameter — a critical privacy violation.',
  },
  '[GAP] Patient route has no GET /:id': {
    explanation: 'Scans patientRoute.js for parameterized GET routes — expects none (gap detection).',
    role: 'Flags that individual patient lookup is not implemented — only bulk listing exists.',
    risk: 'Cannot fetch details for a single patient; only bulk patient list is available.',
  },
  '[GAP] No secretary route file exists': {
    explanation: 'Scans routes directory for any secretary route file — expects none (gap detection).',
    role: 'Flags that the secretary role has no dedicated API endpoints.',
    risk: 'Secretary functionality is severely limited or uses inappropriate routes.',
  },
  '[GAP] No WebSocket found': {
    explanation: 'Searches the project for WebSocket/Socket.IO dependencies — expects none (gap detection).',
    role: 'Flags that real-time communication is not implemented.',
    risk: 'All data refresh is poll-based, leading to stale UI and higher server load.',
  },
  '[GAP] No chat/messaging page directory found': {
    explanation: 'Searches frontend pages for a chat directory — expects none (gap detection).',
    role: 'Flags that patient-doctor messaging is not implemented.',
    risk: 'Patients and doctors cannot communicate through the platform, relying on external channels.',
  },
};

// ── Known gaps with fix recommendations ────────────────────────────────
const FIX_RECOMMENDATIONS = {
  'authSecretary middleware does not exist': {
    priority: 'high', type: 'missing',
    fix: 'Create backend/middlewares/authSecretary.js that verifies the user role is "secretaire". Same pattern as authDoctor.js.',
    files: ['backend/middlewares/authSecretary.js'],
  },
  'Documents has no POST endpoint': {
    priority: 'high', type: 'incomplete',
    fix: 'Add a POST endpoint in backend/routes/documentRoute.js with multer upload middleware for file uploads.',
    files: ['backend/routes/documentRoute.js', 'backend/controllers/documentController.js'],
  },
  'Documents has no DELETE endpoint': {
    priority: 'medium', type: 'incomplete',
    fix: 'Add a DELETE /:id endpoint in backend/routes/documentRoute.js to remove documents.',
    files: ['backend/routes/documentRoute.js', 'backend/controllers/documentController.js'],
  },
  'CareSheets has no PUT endpoint': {
    priority: 'medium', type: 'incomplete',
    fix: 'Add a PUT /:id endpoint in backend/routes/careSheetRoute.js for updating care sheets.',
    files: ['backend/routes/careSheetRoute.js', 'backend/controllers/careSheetController.js'],
  },
  'CareSheets has no DELETE endpoint': {
    priority: 'medium', type: 'incomplete',
    fix: 'Add a DELETE /:id endpoint in backend/routes/careSheetRoute.js for deleting care sheets.',
    files: ['backend/routes/careSheetRoute.js', 'backend/controllers/careSheetController.js'],
  },
  'Notifications use req.body.userId instead of req.user.id': {
    priority: 'critical', type: 'security',
    fix: 'In backend/routes/notificationRoute.js, replace every req.body.userId with req.user.id to prevent IDOR attacks.',
    files: ['backend/routes/notificationRoute.js'],
  },
  'Patient route has no GET /:id': {
    priority: 'high', type: 'incomplete',
    fix: 'Add GET /:id endpoint in backend/routes/patientRoute.js for fetching individual patient details.',
    files: ['backend/routes/patientRoute.js', 'backend/controllers/patientController.js'],
  },
  'No secretary route file exists': {
    priority: 'high', type: 'missing',
    fix: 'Create backend/routes/secretaryRoute.js with dashboard, appointments, and patient registration endpoints. Mount at /api/secretary in server.js.',
    files: ['backend/routes/secretaryRoute.js', 'backend/controllers/secretaryController.js', 'backend/server.js'],
  },
  'No WebSocket found': {
    priority: 'low', type: 'enhancement',
    fix: 'Install socket.io, create backend/socket.js, and add real-time notification support.',
    files: ['backend/socket.js', 'backend/server.js', 'frontend/src/app/services/socket.service.ts'],
  },
  'No chat/messaging page directory found': {
    priority: 'low', type: 'enhancement',
    fix: 'Create frontend chat module and backend messaging API with Socket.IO for real-time patient-doctor messaging.',
    files: ['frontend/src/app/pages/chat/', 'backend/controllers/messageController.js', 'backend/routes/messageRoute.js'],
  },
  'notifications should use req.user.id not req.body.userId': {
    priority: 'critical', type: 'security',
    fix: 'In backend/routes/notificationRoute.js, change req.body.userId to req.user.id to fix the IDOR vulnerability.',
    files: ['backend/routes/notificationRoute.js'],
  },
  'Patient A should not access Patient B care sheets': {
    priority: 'critical', type: 'incomplete',
    fix: 'Add patient-scoped filtering to careSheetRoute.js GET handler: `where: { patientId: req.user.id }` or similar based on the authenticated user context. Currently the route returns all care sheets without user isolation.',
    files: ['backend/routes/careSheetRoute.js'],
  },
  'Patient A should not access Patient B document metadata': {
    priority: 'high', type: 'incomplete',
    fix: 'Add patient-scoped filtering to documentRoute.js GET handler. Ensure documents are filtered by the authenticated patient\'s ID from `req.user` to prevent cross-patient document enumeration.',
    files: ['backend/routes/documentRoute.js'],
  },
  'notification route uses req.body.userId instead of req.user.id': {
    priority: 'critical', type: 'security',
    fix: 'In backend/routes/notificationRoute.js, replace all occurrences of `req.body.userId` with `req.user.id`. This closes an IDOR vulnerability where users can read any other user\'s notifications.',
    files: ['backend/routes/notificationRoute.js'],
  },
  'secretaire should not access doctor-only clinical fields': {
    priority: 'high', type: 'incomplete',
    fix: 'Add role-based middleware (`authDoctor`) to careSheetRoute.js GET and POST handlers to restrict clinical data access to doctors only, or add field-level filtering for non-doctor roles.',
    files: ['backend/routes/careSheetRoute.js'],
  },
  'secretaire should not be able to modify care sheets without patient/doctor scope restriction': {
    priority: 'high', type: 'incomplete',
    fix: 'Add role-checking logic (authDoctor or authAdmin) to careSheetRoute.js POST handler. Only doctors should create care sheets; secretaries should require a doctor\'s authorization.',
    files: ['backend/routes/careSheetRoute.js'],
  },
  'prescription route uses only authUser': {
    priority: 'high', type: 'incomplete',
    fix: 'Add `authDoctor` middleware to prescriptionRoute.js POST and DELETE routes. Prescription creation and deletion should require doctor-level authorization.',
    files: ['backend/routes/prescriptionRoute.js'],
  },
};

// ── Run Jest and parse results ─────────────────────────────────────────
function runJest() {
  const cmd = `node --experimental-vm-modules ${ROOT}/node_modules/.bin/jest --config ${ROOT}/tests/jest.config.js --json --no-cache > "${TEMP_JSON}" 2>/dev/null`;
  try {
    execSync(cmd, { cwd: ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    // Jest exits non-zero when tests fail — the JSON is already written
  }
  if (!existsSync(TEMP_JSON)) {
    console.error('Jest output file not found');
    process.exit(1);
  }
  const raw = readFileSync(TEMP_JSON, 'utf-8');
  return JSON.parse(raw);
}

function lookupTestInfo(fullName) {
  for (const [key, info] of Object.entries(TEST_INFO)) {
    if (fullName.includes(key)) return info;
  }
  return null;
}

function getRecommendation(testPath, status, details) {
  if (status === 'passed') return null;
  for (const [key, rec] of Object.entries(FIX_RECOMMENDATIONS)) {
    if (testPath.includes(key)) return rec;
  }
  if (details?.includes('Cannot find module')) {
    const missing = details.match(/Cannot find module '([^']+)'/)?.[1] || '';
    return { priority: 'high', type: 'import', fix: `Module "${missing}" could not be resolved.`, files: [] };
  }
  return { priority: 'medium', type: 'investigate', fix: `Investigate this test failure:\n${(details || '').slice(0, 500)}`, files: [] };
}

function categorizeSuites(results) {
  const categories = { unit: [], integration: [], security: [], ux: [], e2e: [], other: [] };
  for (const suite of results) {
    const p = (suite.name || '').replace(/\\/g, '/');
    if (p.includes('/unit/')) categories.unit.push(suite);
    else if (p.includes('/integration/')) categories.integration.push(suite);
    else if (p.includes('/security/')) categories.security.push(suite);
    else if (p.includes('/ux/')) categories.ux.push(suite);
    else if (p.includes('/e2e/')) categories.e2e.push(suite);
    else categories.other.push(suite);
  }
  return categories;
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateHTML(data) {
  const { numTotalTestSuites, numPassedTestSuites, numFailedTestSuites, numTotalTests, numPassedTests, numFailedTests, testResults } = data;
  const categories = categorizeSuites(testResults || []);
  const passRate = numTotalTests > 0 ? ((numPassedTests / numTotalTests) * 100).toFixed(1) : '0.0';

  // Collect all assertions with their info
  const allTests = [];
  const failures = [];
  for (const suite of testResults || []) {
    for (const assertion of suite.assertionResults || []) {
      const info = lookupTestInfo(assertion.fullName);
      allTests.push({
        file: (suite.name || '').replace(ROOT, ''),
        fullName: assertion.fullName,
        status: assertion.status,
        duration: assertion.duration,
        info,
      });
      if (assertion.status === 'failed') {
        const failureDetails = String(suite.failureMessage || suite.message || '');
        const rec = getRecommendation(assertion.fullName, assertion.status, failureDetails);
        failures.push({
          suite: (suite.name || '').replace(/\s{2,}/g, ' ').trim(),
          file: suite.name || '',
          test: assertion.fullName,
          failureMessages: (assertion.failureMessages || []).map(String),
          ...rec,
          info,
        });
      }
    }
  }

  const sortedFailures = [...failures].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, unknown: 4 };
    return (order[a.priority] ?? 5) - (order[b.priority] ?? 5);
  });

  const severityCount = {};
  for (const f of sortedFailures) severityCount[f.priority] = (severityCount[f.priority] || 0) + 1;

  const badge = (label, count) =>
    count ? `<span class="badge badge-${label}">${count} ${label}</span>` : '';

  const statusIcon = (status) => status === 'passed' ? '<span class="pass-icon">&#10003;</span>' : '<span class="fail-icon">&#10007;</span>';

  const categoryTable = (catName, suites) => {
    if (!suites.length) return '';
    const rows = suites.map(s => {
      const total = s.assertionResults?.length || 0;
      const passed = s.assertionResults?.filter(a => a.status === 'passed').length || 0;
      const failed = total - passed;
      const cls = failed > 0 ? 'suite-fail' : 'suite-pass';
      const pct = total > 0 ? ((passed / total) * 100).toFixed(0) : '—';
      const link = (s.name || '').replace(ROOT, '');
      return `<tr class="${cls}">
        <td class="suite-name"><code>${escapeHtml(link)}</code></td>
        <td>${total}</td>
        <td class="pass">${passed}</td>
        <td class="fail">${failed}</td>
        <td><div class="bar"><div class="bar-fill" style="width:${pct}%">${pct}%</div></div></td>
      </tr>`;
    }).join('');
    return `<section><h3>${catName}</h3><table><tr><th>Suite</th><th>Total</th><th>Passed</th><th>Failed</th><th>Rate</th></tr>${rows}</table></section>`;
  };

  // Build test catalog by category
  const testCatalog = {};
  for (const t of allTests) {
    const path = t.file;
    let cat = 'other';
    if (path.includes('/unit/')) cat = 'Unit Tests';
    else if (path.includes('/integration/')) cat = 'Integration Tests';
    else if (path.includes('/security/')) cat = 'Security Tests';
    else if (path.includes('/ux/')) cat = 'UX Tests';
    if (!testCatalog[cat]) testCatalog[cat] = [];
    testCatalog[cat].push(t);
  }

  const catalogHTML = Object.entries(testCatalog).map(([cat, tests]) => `
    <section>
      <h3>${cat} (${tests.length})</h3>
      <div class="test-list">
        ${tests.map(t => {
          const isPass = t.status === 'passed';
          return `<div class="test-entry ${isPass ? 'test-pass' : 'test-fail'}">
            <div class="test-header">
              <span class="test-status">${statusIcon(t.status)}</span>
              <span class="test-name">${escapeHtml(t.fullName)}</span>
              <span class="test-duration">${t.duration ? t.duration + 'ms' : ''}</span>
            </div>
            ${t.info ? `
            <div class="test-details">
              <div class="test-field"><span class="field-label">What it tests:</span> ${escapeHtml(t.info.explanation)}</div>
              <div class="test-field"><span class="field-label">Role / Benefit:</span> ${escapeHtml(t.info.role)}</div>
              <div class="test-field"><span class="field-label">Risk if this test fails:</span> ${escapeHtml(t.info.risk)}</div>
            </div>` : '<div class="test-details" style="color:#64748b;font-size:.78rem;">No documentation available for this test.</div>'}
          </div>`;
        }).join('\n')}
      </div>
    </section>
  `).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MediSync Test Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }
  .container { max-width: 1200px; margin: 0 auto; }
  h1 { font-size: 1.8rem; margin-bottom: .25rem; }
  .subtitle { color: #94a3b8; margin-bottom: 2rem; font-size: .9rem; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .card { background: #1e293b; border-radius: 12px; padding: 1.25rem; text-align: center; border: 1px solid #334155; }
  .card .num { font-size: 2rem; font-weight: 700; }
  .card .label { font-size: .8rem; color: #94a3b8; margin-top: .25rem; }
  .card.total .num { color: #60a5fa; }
  .card.pass .num { color: #4ade80; }
  .card.fail .num { color: #f87171; }
  .card.rate .num { color: #fbbf24; }
  .card.suites .num { color: #c084fc; }
  h2 { font-size: 1.3rem; margin: 1.5rem 0 1rem; padding-bottom: .5rem; border-bottom: 1px solid #334155; }
  h3 { font-size: 1rem; margin: 1rem 0; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: .85rem; }
  th, td { padding: .6rem .75rem; text-align: left; border-bottom: 1px solid #1e293b; }
  th { background: #1e293b; color: #94a3b8; font-weight: 600; position: sticky; top: 0; }
  .suite-pass { border-left: 3px solid #4ade80; }
  .suite-fail { border-left: 3px solid #f87171; }
  .suite-name code { font-size: .78rem; color: #e2e8f0; word-break: break-all; }
  .pass { color: #4ade80; font-weight: 600; }
  .fail { color: #f87171; font-weight: 600; }
  .bar { height: 20px; background: #334155; border-radius: 10px; overflow: hidden; min-width: 80px; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, #4ade80, #22d3ee); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: .7rem; font-weight: 600; color: #0f172a; min-width: fit-content; padding: 0 6px; }
  .badge { display: inline-block; padding: .15rem .5rem; border-radius: 999px; font-size: .7rem; font-weight: 600; margin-right: .25rem; }
  .badge-critical { background: #7f1d1d; color: #fca5a5; }
  .badge-high { background: #7c2d12; color: #fdba74; }
  .badge-medium { background: #713f12; color: #fde68a; }
  .badge-low { background: #1e3a5f; color: #93c5fd; }
  .badge-investigate { background: #334155; color: #cbd5e1; }
  .failure-item { background: #1e293b; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; border-left: 4px solid; }
  .failure-item.critical { border-left-color: #ef4444; }
  .failure-item.high { border-left-color: #f97316; }
  .failure-item.medium { border-left-color: #eab308; }
  .failure-item.low { border-left-color: #3b82f6; }
  .failure-item.investigate { border-left-color: #64748b; }
  .failure-item h4 { font-size: .9rem; margin-bottom: .4rem; }
  .failure-item .meta { font-size: .75rem; color: #94a3b8; margin-bottom: .5rem; }
  .failure-item .error { background: #0f172a; padding: .6rem; border-radius: 6px; font-family: monospace; font-size: .78rem; color: #fca5a5; white-space: pre-wrap; margin-bottom: .6rem; max-height: 120px; overflow: auto; }
  .failure-item .fix { background: #0f172a; padding: .75rem; border-radius: 6px; font-size: .82rem; line-height: 1.5; color: #d1d5db; white-space: pre-wrap; }
  .failure-item .files { font-size: .75rem; color: #60a5fa; margin-top: .4rem; }
  .files-label { color: #94a3b8; }
  .footer { margin-top: 2rem; text-align: center; color: #475569; font-size: .8rem; padding: 1rem; border-top: 1px solid #1e293b; }
  .print-btn { display: inline-block; margin-bottom: 1.5rem; padding: .6rem 1.5rem; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: .85rem; font-weight: 500; }
  .print-btn:hover { background: #2563eb; }
  .print-btn.secondary { background: #475569; margin-left: .5rem; }
  .print-btn.secondary:hover { background: #64748b; }
  .severity-summary { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1rem; }
  details { margin-bottom: .5rem; }
  details summary { cursor: pointer; padding: .5rem; background: #1e293b; border-radius: 6px; font-weight: 600; font-size: .85rem; }
  details[open] summary { border-radius: 6px 6px 0 0; }
  .timestamp { color: #64748b; font-size: .8rem; }

  /* Test Catalog Styles */
  .test-list { display: flex; flex-direction: column; gap: .5rem; margin-bottom: 1.5rem; }
  .test-entry { background: #1e293b; border-radius: 8px; padding: .75rem 1rem; border-left: 3px solid; }
  .test-entry.test-pass { border-left-color: #4ade80; }
  .test-entry.test-fail { border-left-color: #f87171; }
  .test-header { display: flex; align-items: center; gap: .5rem; cursor: pointer; }
  .test-status { font-size: 1rem; flex-shrink: 0; }
  .pass-icon { color: #4ade80; }
  .fail-icon { color: #f87171; }
  .test-name { font-size: .85rem; flex: 1; }
  .test-duration { font-size: .7rem; color: #64748b; white-space: nowrap; }
  .test-details { margin-top: .6rem; padding-top: .6rem; border-top: 1px solid #334155; display: none; }
  .test-entry.open .test-details { display: block; }
  .test-field { font-size: .8rem; margin-bottom: .35rem; line-height: 1.4; color: #cbd5e1; }
  .test-field:last-child { margin-bottom: 0; }
  .field-label { color: #60a5fa; font-weight: 600; }

  /* Nav tabs */
  .nav-tabs { display: flex; gap: .25rem; margin-bottom: 1rem; flex-wrap: wrap; position: sticky; top: 0; background: #0f172a; padding: .5rem 0; z-index: 10; }
  .nav-tab { padding: .5rem 1rem; background: #1e293b; border: none; color: #94a3b8; cursor: pointer; border-radius: 6px; font-size: .85rem; font-weight: 500; }
  .nav-tab:hover { background: #334155; }
  .nav-tab.active { background: #3b82f6; color: #fff; }
  .tab-content { display: none; }
  .tab-content.active { display: block; }

  @media print {
    body { background: #fff !important; color: #000 !important; padding: .3in; }
    .card, .failure-item, .test-entry, .bar { background: #f1f5f9 !important; border-color: #cbd5e1 !important; }
    .print-btn, .nav-tabs { display: none !important; }
    .tab-content { display: block !important; }
    .container { max-width: 100% !important; }
    .summary { grid-template-columns: repeat(5, 1fr) !important; }
  }
</style>
</head>
<body>
<div class="container">
  <h1>MediSync Test Report</h1>
  <p class="subtitle">Generated <span class="timestamp">${new Date().toLocaleString()}</span> &mdash; ${numTotalTests} tests, ${numPassedTests} passed, ${numFailedTests} failed (${passRate}%)</p>

  <div style="margin-bottom:1rem;">
    <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
    <button class="print-btn secondary" onclick="document.querySelectorAll('.test-entry').forEach(e => e.classList.toggle('open'))">Expand / Collapse All Tests</button>
  </div>

  <div class="summary">
    <div class="card total"><div class="num">${numTotalTests}</div><div class="label">Total Tests</div></div>
    <div class="card pass"><div class="num">${numPassedTests}</div><div class="label">Passed</div></div>
    <div class="card fail"><div class="num">${numFailedTests}</div><div class="label">Failed</div></div>
    <div class="card rate"><div class="num">${passRate}%</div><div class="label">Pass Rate</div></div>
    <div class="card suites"><div class="num">${numPassedTestSuites}/${numTotalTestSuites}</div><div class="label">Suites Passing</div></div>
  </div>

  <!-- Navigation Tabs -->
  <div class="nav-tabs">
    <button class="nav-tab active" onclick="switchTab('summary-tab', this)">Summary</button>
    <button class="nav-tab" onclick="switchTab('failures-tab', this)">Failures (${failures.length})</button>
    <button class="nav-tab" onclick="switchTab('catalog-tab', this)">Test Catalog (${allTests.length})</button>
  </div>

  <!-- Tab: Summary -->
  <div id="summary-tab" class="tab-content active">
    ${Object.keys(severityCount).length > 0 ? `
    <h2>Failed Tests by Severity</h2>
    <div class="severity-summary">
      ${badge('critical', severityCount.critical)}
      ${badge('high', severityCount.high)}
      ${badge('medium', severityCount.medium)}
      ${badge('low', severityCount.low)}
      ${badge('investigate', severityCount.investigate)}
    </div>
    ` : '<p style="color:#4ade80;font-size:1.2rem;">All tests pass!</p>'}

    <h2>Test Suites</h2>
    ${categoryTable('Unit', categories.unit)}
    ${categoryTable('Integration', categories.integration)}
    ${categoryTable('Security', categories.security)}
    ${categoryTable('UX', categories.ux)}
    ${categoryTable('E2E', categories.e2e)}
    ${categoryTable('Other', categories.other)}

    <h2>Enhancement Recommendations</h2>
    <table>
      <tr><th>Area</th><th>Suggestion</th><th>Priority</th></tr>
      <tr><td>Notifications</td><td>Replace req.body.userId with req.user.id to close IDOR vulnerability</td><td>${badge('critical', 'critical')}</td></tr>
      <tr><td>Secretary Role</td><td>Create authSecretary middleware, secretaryRoute.js, and secretaryController.js</td><td>${badge('high', 'high')}</td></tr>
      <tr><td>Document Upload</td><td>Add POST and DELETE endpoints for document management</td><td>${badge('high', 'high')}</td></tr>
      <tr><td>Patient API</td><td>Add GET /:id endpoint for individual patient lookup</td><td>${badge('high', 'high')}</td></tr>
      <tr><td>Care Sheets</td><td>Add PUT and DELETE endpoints for care sheet CRUD</td><td>${badge('medium', 'medium')}</td></tr>
      <tr><td>Real-time</td><td>Add WebSocket support (Socket.IO) for live notifications</td><td>${badge('low', 'low')}</td></tr>
      <tr><td>Messaging</td><td>Add patient-doctor chat with Socket.IO</td><td>${badge('low', 'low')}</td></tr>
      <tr><td>Testing</td><td>Add E2E tests with Playwright in tests/e2e/</td><td>${badge('medium', 'medium')}</td></tr>
      <tr><td>CI/CD</td><td>Add GitHub Actions workflow to run tests on PR</td><td>${badge('low', 'low')}</td></tr>
      <tr><td>Coverage</td><td>Aim for >80% coverage by adding DB-dependent integration tests</td><td>${badge('medium', 'medium')}</td></tr>
    </table>
  </div>

  <!-- Tab: Failures -->
  <div id="failures-tab" class="tab-content">
    ${sortedFailures.length > 0 ? `
    <h2>Failed Tests & Fix Recommendations</h2>
    ${sortedFailures.map(f => `
    <div class="failure-item ${f.priority}">
      <h4>${escapeHtml(f.test)}</h4>
      <div class="meta">
        ${badge(f.priority, f.priority)}
        <span class="badge" style="background:#334155;color:#cbd5e1">${f.type}</span>
        <span style="color:#64748b">in</span> <code>${escapeHtml(f.file.replace(ROOT, ''))}</code>
      </div>
      ${f.info ? `
      <div style="margin-bottom:.5rem;font-size:.8rem;color:#cbd5e1;line-height:1.4;">
        <div><span style="color:#60a5fa;font-weight:600;">Risk:</span> ${escapeHtml(f.info.risk)}</div>
      </div>` : ''}
      ${f.failureMessages?.length > 0 ? `
      <details>
        <summary>Error Details</summary>
        <div class="error">${escapeHtml(f.failureMessages.slice(0, 2).join('\n\n'))}</div>
      </details>` : ''}
      <div class="fix">${escapeHtml(f.fix || 'No recommendation available.')}</div>
      ${f.files?.length > 0 ? `<div class="files"><span class="files-label">Files to modify:</span> ${f.files.join(', ')}</div>` : ''}
    </div>`).join('\n')}
    ` : '<p style="color:#4ade80;font-size:1.2rem;">No failed tests.</p>'}
  </div>

  <!-- Tab: Test Catalog -->
  <div id="catalog-tab" class="tab-content">
    <h2>Test Catalog</h2>
    <p style="color:#94a3b8;font-size:.85rem;margin-bottom:1rem;">Click any test to expand and see its description, role, and associated risk.</p>
    ${catalogHTML}
  </div>

  <div class="footer">MediSync Test Report</div>
</div>
<script>
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');
}
document.querySelectorAll('.test-header').forEach(h => {
  h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
});
</script>
</body>
</html>`;

  writeFileSync(REPORT_HTML, html, 'utf-8');
  console.log(`Report generated: ${REPORT_HTML}`);
  try { unlinkSync(TEMP_JSON); } catch {}
}

try {
  const data = runJest();
  generateHTML(data);
} catch (err) {
  console.error('Failed to generate report:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
}
