const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../frontend/.env.local') });
let PrismaClient;
let prisma;
try {
  PrismaClient = require('@prisma/client').PrismaClient;
  prisma = new PrismaClient();
} catch (e) {
  console.warn('Prisma client not available or not generated; will skip DB inserts and write JSON fallback.', e.message);
  prisma = null;
}

async function run() {
  console.log('Starting seeder...');

  const contactsData = [
    {
      property_address: '123 Main St', city: 'Somewhere', state: 'CA', zip: '90001',
      mailing_address: 'PO Box 123', mailing_city: 'Somewhere', mailing_state: 'CA', mailing_zip: '90001',
      first_name: 'Alice', last_name: 'Smith', email1: 'alice@example.com', email2: 'alice+alt@example.com',
      phone1: '555-0100', phone2: '555-0101', phone3: '555-0102'
    },
    {
      property_address: '456 Oak Ave', city: 'Elsewhere', state: 'TX', zip: '75001',
      mailing_address: 'PO Box 456', mailing_city: 'Elsewhere', mailing_state: 'TX', mailing_zip: '75001',
      first_name: 'Bob', last_name: 'Johnson', email1: 'bob@example.com', email2: 'bob+alt@example.com',
      phone1: '555-0200', phone2: '555-0201', phone3: '555-0202'
    },
    {
      property_address: '789 Pine Rd', city: 'Anywhere', state: 'FL', zip: '33001',
      mailing_address: 'PO Box 789', mailing_city: 'Anywhere', mailing_state: 'FL', mailing_zip: '33001',
      first_name: 'Carol', last_name: 'Nguyen', email1: 'carol@example.com', email2: 'carol+alt@example.com',
      phone1: '555-0300', phone2: '555-0301', phone3: '555-0302'
    },
    {
      property_address: '101 Maple St', city: 'Smalltown', state: 'WA', zip: '98001',
      mailing_address: 'PO Box 101', mailing_city: 'Smalltown', mailing_state: 'WA', mailing_zip: '98001',
      first_name: 'Dan', last_name: 'Lee', email1: 'dan@example.com', email2: 'dan+alt@example.com',
      phone1: '555-0400', phone2: '555-0401', phone3: '555-0402'
    },
    {
      property_address: '202 Birch Ln', city: 'Bigcity', state: 'NY', zip: '10001',
      mailing_address: 'PO Box 202', mailing_city: 'Bigcity', mailing_state: 'NY', mailing_zip: '10001',
      first_name: 'Eve', last_name: 'Garcia', email1: 'eve@example.com', email2: 'eve+alt@example.com',
      phone1: '555-0500', phone2: '555-0501', phone3: '555-0502'
    }
  ];

  const created = [];
  if (prisma) {
    for (const c of contactsData) {
      try {
        const rec = await prisma.contact.create({ data: c });
        created.push(rec);
        console.log('Created contact:', rec.contact_id || rec.id || rec.first_name);
      } catch (err) {
        console.warn('Contact insert failed with full payload, retrying minimal payload:', err.message);
        // Retry with minimal fields
        try {
          const minimal = {
            first_name: c.first_name,
            last_name: c.last_name,
            email1: c.email1
          };
          const rec = await prisma.contact.create({ data: minimal });
          created.push(rec);
          console.log('Created contact (minimal):', rec.contact_id || rec.id || rec.first_name);
        } catch (e2) {
          console.error('Failed to create contact even with minimal payload:', e2.message);
        }
      }
    }
    // Create a subscriber organization: Veracity Home Buyers
    try {
      const org = await prisma.organization.create({
        data: {
          name: 'Veracity Home Buyers',
          createdAt: new Date(),
          walletBalance: 5.0,
          legalName: 'Veracity Home Buyers',
          contactName: 'Kevin',
          contactEmail: 'kevin@veracityhomes.com'
        }
      });

      const wallet = await prisma.organizationWallet.create({
        data: {
          organizationId: org.id,
          balanceCents: 500
        }
      });

      // Log top-up transaction for the $5 wallet credit
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          organizationId: org.id,
          type: 'PAYMENT_TOPUP',
          amountCents: 500,
          referenceId: 'initial_topup_veracity'
        }
      });

      // Create active subscription and log first month paid (49.99)
      await prisma.organizationSubscription.create({
        data: {
          organizationId: org.id,
          provider: 'PAYPAL',
          providerSubId: `veracity-paypal-${Date.now()}`,
          planId: 'monthly_49_99',
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      console.log('Created organization Veracity Home Buyers with active subscription and $5 wallet credit');
    } catch (err) {
      console.warn('Failed to create Veracity organization/subscription/wallet:', err.message);
    }
  } else {
    // Prisma not available: use in-memory created objects with generated ids
    for (let i = 0; i < contactsData.length; i++) {
      const c = contactsData[i];
      created.push({ id: `seed-${i + 1}`, contact_id: `seed-${i + 1}`, ...c });
    }
    console.log('Created in-memory contacts for JSON fallback.');
  }

  // Insert 3 conversations linked to first two contacts if possible
  const conversations = [];
  if (created.length >= 2) {
    const convData = [
      { subject: 'Welcome', contactId: created[0].contact_id || created[0].id },
      { subject: 'Follow Up', contactId: created[1].contact_id || created[1].id },
      { subject: 'Checking In', contactId: created[0].contact_id || created[0].id }
    ];

    if (prisma) {
      for (const cd of convData) {
        try {
          const rec = await prisma.conversation.create({ data: cd });
          conversations.push(rec);
          console.log('Created conversation:', rec.id || rec.subject);
        } catch (err) {
          console.warn('Conversation insert failed (schema may not exist):', err.message);
        }
      }
    } else {
      // Create in-memory conversations
      for (let i = 0; i < convData.length; i++) {
        conversations.push({ id: `conv-${i + 1}`, subject: convData[i].subject, contactId: convData[i].contactId });
      }
      console.log('Created in-memory conversations for JSON fallback.');
    }
  }

  // Always write a JSON dump for the frontend to consume (public folder)
  const out = {
    contacts: created.map(c => ({
      id: c.contact_id || c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      email1: c.email1,
      phone1: c.phone1
    })),
    conversations: conversations.map(cv => ({ id: cv.id || cv.conversation_id, subject: cv.subject, contactId: cv.contactId || cv.contact_id }))
  };

  const publicDir = path.resolve(__dirname, '../../frontend/public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'messenger-seed.json'), JSON.stringify(out, null, 2));
  console.log('Wrote messenger-seed.json to frontend public folder.');

  if (prisma) await prisma.$disconnect();
  console.log('Seeder complete.');
}

run().catch(async (e) => {
  console.error('Seeder error:', e);
  try { await prisma.$disconnect(); } catch (_) {}
  process.exit(1);
});
