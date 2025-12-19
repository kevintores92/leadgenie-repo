require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  errorFormat: 'pretty',
});

// Warmup schedule mapping (day => max msgs/min)
const schedule = [
  { day: 1, level: 1 },
  { day: 2, level: 3 },
  { day: 3, level: 5 },
  { day: 5, level: 10 },
  { day: 7, level: 15 },
  { day: 14, level: 30 },
];

function targetLevelForAgeDays(days) {
  // find greatest schedule.day <= days
  let res = 1;
  for (const s of schedule) {
    if (days >= s.day) res = s.level;
  }
  return res;
}

async function runWarmupOnce() {
  // Find phone numbers in WARMING state
  const now = new Date();
  const warming = await prisma.phoneNumber.findMany({ where: { status: 'WARMING' } });
  for (const p of warming) {
    const created = p.createdAt || now;
    const days = Math.floor((now.getTime() - new Date(created).getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const target = targetLevelForAgeDays(days);
    if (p.warmupLevel < target) {
      try {
        await prisma.phoneNumber.update({ where: { id: p.id }, data: { warmupLevel: target } });
      } catch (e) {
        console.warn('warmup update failed', e && e.message);
      }
    }
    if (target >= 30) {
      // promote to ACTIVE
      try {
        await prisma.phoneNumber.update({ where: { id: p.id }, data: { status: 'ACTIVE' } });
      } catch (e) { console.warn('warmup promote failed', e && e.message); }
    }
  }
}

module.exports = { runWarmupOnce };
