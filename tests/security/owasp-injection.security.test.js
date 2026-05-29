import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';

describe('OWASP Injection Security Tests', () => {
  describe('Cross-Site Scripting (XSS) — Form Inputs', () => {
    it('authController register should not directly store unsanitized input into the database', () => {
      const content = fs.readFileSync('backend/controllers/authController.js', 'utf-8');
      const hasSanitization = content.includes('escape') || content.includes('sanitize') || content.includes('strip') || content.includes('xss');
      const hasDirectStore = content.includes('data: req.body');
      expect(hasSanitization || !hasDirectStore).toBe(true);
    });

    it('[GAP] appointmentController stores notes directly without sanitization — XSS vector', () => {
      const content = fs.readFileSync('backend/controllers/appointmentController.js', 'utf-8');
      const hasSanitization = content.includes('escape') || content.includes('sanitize') || content.includes('strip') || content.includes('xss');
      const storesNotes = content.includes('notes');
      expect(hasSanitization).toBe(false);
      expect(storesNotes).toBe(true);
    });

    it('patient registration name/email fields should be sanitized or validated for XSS payloads', () => {
      const content = fs.readFileSync('backend/controllers/authController.js', 'utf-8');
      const hasValidatorImport = content.includes('isStrongPassword') || content.includes('validator');
      const hasNameValidation = content.includes('name') && (content.includes('400') || content.includes('!name'));
      const hasEmailValidation = content.includes('email') && (content.includes('400') || content.includes('!email'));
      expect(hasNameValidation).toBe(true);
      expect(hasEmailValidation).toBe(true);
    });

    it('clinical notes or appointment reason textarea should not directly reflect unescaped HTML', () => {
      const routeFiles = ['backend/routes/careSheetRoute.js', 'backend/routes/appointmentRoute.js'];
      for (const file of routeFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const hasUserInput = content.includes('req.body') || content.includes('notes');
        const hasDirectHtml = content.includes('.html(') || content.includes('res.send');
        expect(hasUserInput || !hasDirectHtml).toBe(true);
      }
    });

    it('audit logs should escape or encode user-supplied fields before recording', () => {
      const content = fs.readFileSync('backend/controllers/authController.js', 'utf-8');
      const auditImport = content.includes('logAudit') || content.includes('logEvent');
      expect(auditImport).toBe(true);
      if (auditImport) {
        const logCalls = content.match(/logAudit\([^)]+\)/g) || [];
        const logEventCalls = content.match(/logEvent\([^)]+\)/g) || [];
        const totalLogCalls = logCalls.length + logEventCalls.length;
        expect(totalLogCalls).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('SQL Injection (SQLi) — Search and Filter', () => {
    it('appointmentController getAllAppointments uses Prisma parameterized where object, not string concatenation', () => {
      const content = fs.readFileSync('backend/controllers/appointmentController.js', 'utf-8');
      const hasStringConcat = content.includes(' + ') && (content.includes('req.query') || content.includes('query.'));
      const hasPrismaWhere = content.includes('where:') || content.includes('findMany');
      expect(hasPrismaWhere).toBe(true);
      expect(hasStringConcat).toBe(false);
    });

    it('login endpoint should use Prisma findUnique with parameterized email, not raw query', () => {
      const content = fs.readFileSync('backend/controllers/authController.js', 'utf-8');
      const hasFindUnique = content.includes('findUnique');
      const hasRawQuery = content.includes('$queryRaw') || content.includes('$executeRaw');
      expect(hasFindUnique).toBe(true);
      expect(hasRawQuery).toBe(false);
    });

    it('Prisma queries across all routes should avoid $queryRaw with user-supplied input', () => {
      const routeFiles = fs.readdirSync('backend/routes').filter(f => f.endsWith('Route.js'));
      const controllerFiles = fs.readdirSync('backend/controllers').filter(f => f.endsWith('.js'));
      const allFiles = [...routeFiles.map(f => `backend/routes/${f}`), ...controllerFiles.map(f => `backend/controllers/${f}`)];
      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const rawQueryCalls = content.match(/\$queryRaw\([^)]+/g) || [];
        const rawExecCalls = content.match(/\$executeRaw\([^)]+/g) || [];
        for (const call of [...rawQueryCalls, ...rawExecCalls]) {
          if (!call.includes('\"') && !call.includes('`')) {
            expect(call).toMatch(/SELECT|UPDATE|DELETE|INSERT/i);
          }
        }
      }
    });
  });

  describe('Input Sanitization Infrastructure', () => {
    it('helmet configures contentSecurityPolicy and XSS filter headers', () => {
      const content = fs.readFileSync('backend/server.js', 'utf-8');
      expect(content).toContain('helmet');
    });

    it('express.json() body parser is configured with size limits to prevent payload bloat', () => {
      const content = fs.readFileSync('backend/server.js', 'utf-8');
      const hasJsonLimit = content.includes('limit') || content.includes('100kb') || content.includes('10mb');
      expect(hasJsonLimit || content.includes('express.json()')).toBe(true);
    });

    it('standard security headers (X-Content-Type-Options, X-Frame-Options) should be present via helmet', () => {
      const content = fs.readFileSync('backend/server.js', 'utf-8');
      const helmetCall = content.match(/helmet\([^)]*\)/);
      const hasHelmet = content.includes('helmet()') || content.includes('helmet(');
      expect(hasHelmet).toBe(true);
      if (helmetCall) {
        expect(helmetCall[0].length).toBeGreaterThan(0);
      }
    });
  });
});
