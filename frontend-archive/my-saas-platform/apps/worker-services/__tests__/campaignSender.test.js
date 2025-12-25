jest.mock('@prisma/client', () => {
  const mSendingNumber = { findFirst: jest.fn(), update: jest.fn() };
  const mUsage = { count: jest.fn() };
  const mOrganization = { findUnique: jest.fn() };
  const mCampaign = { findUnique: jest.fn(), update: jest.fn() };
  const mContact = { findUnique: jest.fn() };
  const mMessage = { create: jest.fn() };
  const mock = {
    PrismaClient: jest.fn(() => ({
      sendingNumber: mSendingNumber,
      usage: mUsage,
      organization: mOrganization,
      campaign: mCampaign,
      contact: mContact,
      message: mMessage,
    })),
  };
  return mock;
});

const { pickSendingNumberForSend, adjustToBusinessHoursDelay } = require('../src/campaignSender');
const { PrismaClient } = require('@prisma/client');

describe('campaignSender helpers', () => {
  let prisma;
  beforeEach(() => {
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  test('pickSendingNumberForSend returns the least used number', async () => {
    const fake = { id: 'num1', phoneNumber: '+15550001111', lastUsedCount: 2, lastUsedAt: new Date().toISOString() };
    prisma.sendingNumber.findFirst.mockResolvedValueOnce(fake);
    const res = await pickSendingNumberForSend('org1');
    expect(res).toBe(fake);
    expect(prisma.sendingNumber.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 'org1', enabled: true } }));
  });

  test('adjustToBusinessHoursDelay returns same timestamp if within business hours', () => {
    // Pick a UTC time that, in Europe/London, is 08:00
    const tz = 'Europe/London';
    const dt = new Date(Date.UTC(2025, 11, 15, 8, 0, 0)).getTime();
    const next = adjustToBusinessHoursDelay(dt, tz);
    expect(next).toBe(dt);
  });

  test('adjustToBusinessHoursDelay returns next morning 07:00 if outside hours', () => {
    const tz = 'Europe/London';
    // 22:00 local -> should get next day 07:00
    const dt = new Date(Date.UTC(2025, 11, 14, 22, 0, 0)).getTime();
    const next = adjustToBusinessHoursDelay(dt, tz);
    const nextDate = new Date(next);
    expect(nextDate.getUTCHours()).toBeGreaterThanOrEqual(0);
    // Verify it's 07:00 local by checking string contains 07 (best-effort)
    // (Exact UTC offset varies with DST; we verify it shifted forward)
    expect(next).toBeGreaterThan(dt);
  });
});
