import { jest } from '@jest/globals';

const createMockPrisma = () => {
  const mockModel = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    createMany: jest.fn(),
    updateMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  });

  return {
    user: mockModel(),
    doctor: mockModel(),
    patient: mockModel(),
    secretary: mockModel(),
    appointment: mockModel(),
    prescription: mockModel(),
    invoice: mockModel(),
    medicalDocument: mockModel(),
    careSheet: mockModel(),
    notification: mockModel(),
    auditLog: mockModel(),
    clinicConfig: mockModel(),
    authToken: mockModel(),
    service: mockModel(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((fn) => fn()),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };
};

const resetMockPrisma = (prisma) => {
  for (const key of Object.keys(prisma)) {
    if (typeof prisma[key] === 'object' && prisma[key] !== null) {
      for (const method of Object.keys(prisma[key])) {
        if (jest.isMockFunction(prisma[key][method])) {
          prisma[key][method].mockReset();
        }
      }
    }
  }
};

export { createMockPrisma, resetMockPrisma };
