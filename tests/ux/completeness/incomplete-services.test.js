import fs from 'fs';
import path from 'path';

const BACKEND = path.resolve('backend');
const FRONTEND = path.resolve('frontend/src/app');

describe('Incomplete Services & Gaps Audit', () => {
  // ──────────────────────────────────────────────────────────
  // BACKEND GAPS
  // ──────────────────────────────────────────────────────────

  describe('Backend: Missing authSecretary middleware', () => {
    it('[GAP] authSecretary middleware does not exist — secretary routes use generic authUser', () => {
      const files = fs.readdirSync(path.join(BACKEND, 'middlewares'));
      const hasSecretaryGuard = files.some(
        (f) => f.toLowerCase().includes('secretary')
      );
      expect(hasSecretaryGuard).toBe(true);
    });
  });

  describe('Backend: Documents route incomplete (only GET)', () => {
    it('[GAP] Documents has no POST endpoint — file upload not possible', () => {
      const content = fs.readFileSync(
        path.join(BACKEND, 'routes', 'documentRoute.js'),
        'utf-8'
      );
      expect(content).toMatch(/router\.post|app\.post/);
    });

    it('[GAP] Documents has no DELETE endpoint', () => {
      const content = fs.readFileSync(
        path.join(BACKEND, 'routes', 'documentRoute.js'),
        'utf-8'
      );
      expect(content).toMatch(/router\.delete|app\.delete/);
    });
  });

  describe('Backend: CareSheets missing update/delete', () => {
    it('[GAP] CareSheets has no PUT endpoint', () => {
      const content = fs.readFileSync(
        path.join(BACKEND, 'routes', 'careSheetRoute.js'),
        'utf-8'
      );
      expect(content).toMatch(/router\.put|app\.put/);
    });

    it('[GAP] CareSheets has no DELETE endpoint', () => {
      const content = fs.readFileSync(
        path.join(BACKEND, 'routes', 'careSheetRoute.js'),
        'utf-8'
      );
      expect(content).toMatch(/router\.delete|app\.delete/);
    });
  });

  describe('Backend: Notifications IDOR vulnerability', () => {
    it('[GAP] Notifications use req.body.userId instead of req.user.id (IDOR)', () => {
      const content = fs.readFileSync(
        path.join(BACKEND, 'routes', 'notificationRoute.js'),
        'utf-8'
      );
      const usesBodyUserId = (content.match(/req\.body\.userId/g) || []).length;
      const usesReqUserId = (content.match(/req\.user\.id/g) || []).length;
      expect(usesBodyUserId).toBeLessThanOrEqual(usesReqUserId);
    });
  });

  describe('Backend: No individual patient GET endpoint', () => {
    it('[GAP] Patient route has no GET /:id — cannot fetch single patient', () => {
      const content = fs.readFileSync(
        path.join(BACKEND, 'routes', 'patientRoute.js'),
        'utf-8'
      );
      expect(content).toMatch(/router\.get.*\/:id|router\.get.*\/\w+Id/);
    });
  });

  describe('Backend: No secretary-specific routes', () => {
    it('[GAP] No secretary route file exists — no dedicated secretary endpoints', () => {
      const routeFiles = fs.readdirSync(path.join(BACKEND, 'routes'));
      const secretaryRoute = routeFiles.find((f) =>
        f.toLowerCase().includes('secretary')
      );
      expect(secretaryRoute).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────
  // FRONTEND GAPS
  // ──────────────────────────────────────────────────────────

  describe('Frontend: AdminStaffComponent has empty stub', () => {
    it('[GAP] AdminStaffComponent.onActionClick is an empty stub method', () => {
      const componentPath = path.join(
        FRONTEND,
        'pages',
        'admin',
        'staff',
        'admin-staff.component.ts'
      );
      if (fs.existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, 'utf-8');
        expect(content).not.toMatch(/onActionClick\s*\(\)\s*\{\s*\}/);
      }
    });
  });

  describe('Frontend: AdminReportsComponent has no charts/exports', () => {
    it('[GAP] AdminReportsComponent lacks charting or export features', () => {
      const componentPath = path.join(
        FRONTEND,
        'pages',
        'admin',
        'reports',
        'admin-reports.component.ts'
      );
      if (fs.existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, 'utf-8');

        const hasCharting =
          content.includes('chart') ||
          content.includes('Chart') ||
          content.includes('graph') ||
          content.includes('export');

        expect(hasCharting).toBe(true);
      }
    });
  });

  describe('Frontend: PatientMedicalFolder has no file upload', () => {
    it('[GAP] MedicalFolder component lacks upload capability', () => {
      const componentPath = path.join(
        FRONTEND,
        'pages',
        'patient',
        'medical-folder',
        'patient-medical-folder.component.ts'
      );
      if (fs.existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, 'utf-8');
        const hasUpload = content.includes('upload') || content.includes('Upload');
        expect(hasUpload).toBe(true);
      }
    });
  });

  describe('Frontend: MedecinScheduleComponent is minimal', () => {
    it('[GAP] MedecinScheduleComponent has no calendar/grid UI', () => {
      const templatePath = path.join(
        FRONTEND,
        'pages',
        'medecin',
        'schedule',
        'medecin-schedule.component.html'
      );
      if (fs.existsSync(templatePath)) {
        const content = fs.readFileSync(templatePath, 'utf-8');
        const hasCalendar =
          content.includes('calendar') ||
          content.includes('Calendar') ||
          content.includes('fullCalendar');
        expect(hasCalendar).toBe(true);
      }
    });
  });

  describe('Frontend: PatientBillingComponent has no pay flow', () => {
    it('[GAP] PatientBilling lacks payment processing', () => {
      const componentPath = path.join(
        FRONTEND,
        'pages',
        'patient',
        'billing',
        'patient-billing.component.ts'
      );
      if (fs.existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, 'utf-8');
        const hasPayment =
          content.includes('pay') ||
          content.includes('Pay') ||
          content.includes('razorpay') ||
          content.includes('stripe');
        expect(hasPayment).toBe(true);
      }
    });
  });

  describe('Frontend: SecretaireRegistrationComponent duplicate constructor', () => {
    it('[GAP] SecretaireRegistration has a duplicate constructor (compilation error)', () => {
      const componentPath = path.join(
        FRONTEND,
        'pages',
        'secretaire',
        'registration',
        'secretaire-registration.component.ts'
      );
      if (fs.existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, 'utf-8');
        const constructors = content.match(/constructor\s*\(/g);
        expect(constructors ? constructors.length : 0).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Frontend: No WebSocket/real-time connection', () => {
    it('[GAP] No WebSocket found — all data refresh is poll-based', () => {
      const findAngularFiles = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const files = [];
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            files.push(...findAngularFiles(fullPath));
          } else if (entry.name.endsWith('.ts')) {
            files.push(fullPath);
          }
        }
        return files;
      };

      const allFiles = findAngularFiles(
        path.join(FRONTEND, 'core', 'services')
      );
      let websocketFound = false;
      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        if (
          content.includes('WebSocket') ||
          content.includes('webSocket') ||
          content.includes('socket')
        ) {
          websocketFound = true;
          break;
        }
      }
      expect(websocketFound).toBe(true);
    });
  });

  describe('Frontend: No messaging between patients and doctors', () => {
    it('[GAP] No chat/messaging page directory found', () => {
      const allDirs = fs.readdirSync(FRONTEND, { withFileTypes: true });
      const pageDirs = allDirs
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      const hasMessaging = pageDirs.some(
        (dir) =>
          dir.includes('chat') ||
          dir.includes('message') ||
          dir.includes('messaging') ||
          dir.includes('inbox')
      );

      expect(hasMessaging).toBe(true);
    });
  });
});
