import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';

const ROUTE_FILES = [
  { file: 'authRoute.js', mount: '/api/auth' },
  { file: 'adminRoute.js', mount: '/api/admin' },
  { file: 'doctorRoute.js', mount: '/api/doctor' },
  { file: 'userRoute.js', mount: '/api/user' },
  { file: 'statsRoute.js', mount: '/api/stats' },
  { file: 'appointmentRoute.js', mount: '/api/appointments' },
  { file: 'auditRoute.js', mount: '/api/audit-logs' },
  { file: 'patientRoute.js', mount: '/api/patients' },
  { file: 'invoiceRoute.js', mount: '/api/invoices' },
  { file: 'prescriptionRoute.js', mount: '/api/prescriptions' },
  { file: 'notificationRoute.js', mount: '/api/notifications' },
  { file: 'documentRoute.js', mount: '/api/documents' },
  { file: 'careSheetRoute.js', mount: '/api/care-sheets' },
  { file: 'staffRoute.js', mount: '/api/staff' },
  { file: 'serviceRoute.js', mount: '/api/services' },
  { file: 'reportRoute.js', mount: '/api/reports' },
  { file: 'configRoute.js', mount: '/api/clinic-config' },
];

describe('API Coverage — All Route Files Exist', () => {
  describe.each(ROUTE_FILES)('$mount ($file)', ({ file, mount }) => {
    it(`route file exists and exports a router`, async () => {
      const { default: router } = await import(
        `../../../backend/routes/${file}`
      );
      expect(router).toBeDefined();
    });

    it(`is mounted in server.js`, () => {
      const content = fs.readFileSync('backend/server.js', 'utf-8');
      expect(content).toContain(mount);
    });
  });
});

describe('API Coverage — Controllers Export Functions', () => {
  it('auth controller exports all required functions', async () => {
    const ctrl = await import('../../../backend/controllers/authController.js');
    expect(ctrl.login).toBeDefined();
    expect(ctrl.register).toBeDefined();
    expect(ctrl.getProfile).toBeDefined();
    expect(ctrl.forgotPassword).toBeDefined();
    expect(ctrl.resetPassword).toBeDefined();
  });

  it('admin controller exports CRUD functions', async () => {
    const ctrl = await import('../../../backend/controllers/adminController.js');
    expect(ctrl.addDoctor).toBeDefined();
    expect(ctrl.allDoctors).toBeDefined();
    expect(ctrl.appointmentAdmin).toBeDefined();
    expect(ctrl.appointmentCancel).toBeDefined();
    expect(ctrl.adminDashboard).toBeDefined();
  });

  it('stats controller exports all stat functions', async () => {
    const ctrl = await import('../../../backend/controllers/statsController.js');
    expect(ctrl.getAdminStats).toBeDefined();
    expect(ctrl.getDoctorStats).toBeDefined();
    expect(ctrl.getPatientStats).toBeDefined();
    expect(ctrl.getSecretaryStats).toBeDefined();
  });

  it('middleware files export default functions', async () => {
    const { default: authUser } = await import(
      '../../../backend/middlewares/authUser.js'
    );
    const { default: authAdmin } = await import(
      '../../../backend/middlewares/authAdmin.js'
    );
    const { default: authDoctor } = await import(
      '../../../backend/middlewares/authDoctor.js'
    );
    expect(authUser).toBeDefined();
    expect(authAdmin).toBeDefined();
    expect(authDoctor).toBeDefined();
  });
});
