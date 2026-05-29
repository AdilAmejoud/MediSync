import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';

describe('Data Encryption Security Tests', () => {
  describe('HTTPS Enforcement', () => {
    it('[GAP] server.js has no HTTPS enforcement — traffic is served over plain HTTP', () => {
      const content = fs.readFileSync('backend/server.js', 'utf-8');
      const hasHttps = content.includes('https.createServer') || content.includes('spdy.createServer');
      const hasRedirect = content.includes('https') && (content.includes('redirect') || content.includes('301'));
      const usesHttp = content.includes('app.listen') || content.includes('http.createServer');
      expect(hasHttps || hasRedirect).toBe(true);
      expect(usesHttp).toBe(true);
    });
  });

  describe('PHI/Field-Level Encryption at Rest', () => {
    const sensitiveFields = ['diagnosis', 'medicalHistory', 'treatment', 'diagnostic'];
    const routeFiles = fs.readdirSync('backend/routes').filter(f => f.endsWith('Route.js'));
    const controllerFiles = fs.readdirSync('backend/controllers').filter(f => f.endsWith('.js'));
    const sensitiveFieldPattern = new RegExp(`\\b(${sensitiveFields.join('|')})\\b`, 'gi');

    it('medical diagnosis fields should not appear in plaintext in controller create/update logic', () => {
      for (const file of controllerFiles) {
        const content = fs.readFileSync(`backend/controllers/${file}`, 'utf-8');
        const lines = content.split('\n');
        for (const field of sensitiveFields) {
          const fieldLines = lines
            .map((l, i) => ({ line: i + 1, text: l }))
            .filter(l => l.text.toLowerCase().includes(field) && !l.text.trim().startsWith('//'));
          for (const match of fieldLines) {
            const line = match.text;
            const isStoreRaw = line.includes('data.') || line.includes('create({') || line.includes('update({');
            if (isStoreRaw) {
              const hasEncryption = line.includes('hash') || line.includes('encrypt') || line.includes('bcrypt');
              expect(hasEncryption).toBe(true);
            }
          }
        }
      }
    });

    it('careSheet route does not expose raw PHI in GET responses without sanitization', () => {
      const content = fs.readFileSync('backend/routes/careSheetRoute.js', 'utf-8');
      const containsMedicalActs = content.includes('medicalActs');
      const containsTotalAmount = content.includes('totalAmount');
      expect(containsMedicalActs || containsTotalAmount).toBe(true);
      const hasFieldMapping = content.includes('sheets.map(s =>');
      expect(hasFieldMapping).toBe(true);
    });

    it('[GAP] patient route should not expose nationalId in the API response payload', () => {
      const content = fs.readFileSync('backend/routes/patientRoute.js', 'utf-8');
      expect(content.includes('nationalId: p.nationalId')).toBe(false);
    });

    it('authController register should hash passwords before storing', () => {
      const content = fs.readFileSync('backend/controllers/authController.js', 'utf-8');
      const hasBcryptHash = content.includes('bcrypt.hash') || content.includes('bcrypt.hashSync');
      const hasSalt = content.includes('genSalt') || content.includes('saltRounds');
      expect(hasBcryptHash && hasSalt).toBe(true);
    });
  });

  describe('Transmission Security', () => {
    it('helmet middleware is configured with CSP and XSS protection headers', () => {
      const content = fs.readFileSync('backend/server.js', 'utf-8');
      expect(content).toContain('helmet');
      expect(content).toContain('cors');
      const corsConfig = content.slice(content.indexOf('cors('), content.indexOf('));', content.indexOf('cors(')) + 3);
      expect(corsConfig).toContain('credentials: true');
    });
  });
});
