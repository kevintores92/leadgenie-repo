jest.mock('@prisma/client', () => {
  const mSendingNumber = { findMany: jest.fn(), create: jest.fn() };
  const mOrganization = { findUnique: jest.fn(), update: jest.fn() };
  const mock = { PrismaClient: jest.fn(() => ({ sendingNumber: mSendingNumber, organization: mOrganization })) };
  return mock;
});

const marketplace = require('../src/routes/marketplace');
const { PrismaClient } = require('@prisma/client');

describe('marketplace routes (unit)', () => {
  let prisma;
  beforeEach(() => {
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  test('adds fake numbers when FAKE_TWILIO=1', async () => {
    process.env.FAKE_TWILIO = '1';
    const fakeReq = { header: () => 'org1', body: { marketplace: 'mp1', count: 2 } };
    const created = [];
    prisma.organization.findUnique.mockResolvedValueOnce({ id: 'org1', plan: 'STARTER' });
    prisma.sendingNumber.create.mockImplementation(async ({ data }) => { created.push(data); return data; });
    const res = { json: jest.fn() };

    // call handler directly
    await marketplace.stack.find(r => r.route && r.route.path === '/add').route.stack[0].handle(fakeReq, res);
    expect(created.length).toBe(2);
    expect(res.json).toHaveBeenCalled();
  });
});
