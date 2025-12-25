const { processCampaign } = require('../src/campaign-orchestrator');
const prisma = require('@prisma/client');

jest.mock('@prisma/client', () => {
  const m = {
    contact: { findMany: jest.fn(), update: jest.fn() },
    message: { findFirst: jest.fn(), create: jest.fn() },
    activity: { create: jest.fn() }
  };
  return { PrismaClient: jest.fn(() => m) };
});

describe('campaign-orchestrator duplicates', () => {
  let client;
  beforeEach(() => {
    const { PrismaClient } = require('@prisma/client');
    client = new PrismaClient();
    // replace module's prisma instance
    jest.resetModules();
  });

  test('defers contact when last message sent within 24 hours', async () => {
    const now = new Date();
    const lastMsg = { id: 'm1', sentAt: now.toISOString(), createdAt: now.toISOString() };
    client.contact.findMany.mockResolvedValue([{ id: 'c1', phone: '+15551234', brandId: 'b1', status: 'Pending' }]);
    client.message.findFirst.mockResolvedValue(lastMsg);
    client.contact.update.mockResolvedValue({ id: 'c1', nextEligibleAt: new Date(Date.now() + 24*60*60*1000) });
    client.activity.create.mockResolvedValue({});

    await processCampaign({ campaign_id: 1, campaign_name: 'test', org_id: 'org1' });

    expect(client.contact.update).toHaveBeenCalled();
    expect(client.activity.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'DEFERRED_DUPLICATE' }) }));
  });
});
