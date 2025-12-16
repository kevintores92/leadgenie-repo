// Legacy middleware — limits removed from schema. Provide utility to get usage counts only.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getUsageCounts(orgId) {
  const today = startOfToday();
  const month = startOfMonth();
  const [todayCount, monthCount] = await Promise.all([
    prisma.usage.count({ where: { organizationId: orgId, createdAt: { gte: today } } }),
    prisma.usage.count({ where: { organizationId: orgId, createdAt: { gte: month } } }),
  ]);
  return { todayCount, monthCount };
}

module.exports = { getUsageCounts };
