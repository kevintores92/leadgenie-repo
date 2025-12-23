// --- File: campaign-orchestrator.js ---
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';

const prisma = new PrismaClient({
  errorFormat: 'pretty',
});

// Helper function to simulate applying rotation logic
function selectNextTemplate(campaignTemplates) {
    // TODO: Implement A/B/n testing or Round Robin logic here.
    // For now, just pick the first template.
    return campaignTemplates[0]; 
}

function selectNextPhoneNumber(campaignNumbers) {
    // TODO: Implement rotation logic (e.g., round-robin or least-used).
    // For now, just pick the last number.
    return campaignNumbers.slice(-1)[0]; 
}


// 1. Define the core orchestration logic
async function processCampaign(campaign) {
    console.log(`Processing Campaign ID: ${campaign.campaign_id} - ${campaign.campaign_name}`);
    
    // NOTE: We need new tables: 'campaigns', 'campaign_contacts', 'phone_numbers', 'message_templates'
    
    // --- STEP 1: Fetch all rotating assets for this campaign ---
    // Fetch all phone numbers and templates linked to this specific campaign/org.
    const campaignAssets = {
        templates: [{ template_id: 1, content: "Template A" }], // Placeholder data
        phoneNumbers: [{ number_id: 101, number: "+19995551212" }], // Placeholder data
    };

    // --- STEP 2: Find contacts ready for the next step of the campaign ---
    // Find contacts with `status = Pending` and that are eligible now (nextEligibleAt is null or in the past)
    const contactsToMessage = await prisma.contact.findMany({
        where: {
            status: 'Pending',
            AND: [
                {
                    OR: [
                        { nextEligibleAt: null },
                        { nextEligibleAt: { lte: new Date() } }
                    ]
                }
            ]
        },
        take: 50 // Process in manageable batches
    });

    if (contactsToMessage.length === 0) {
        console.log(`No pending contacts for campaign ${campaign.campaign_id}.`);
        return;
    }

    console.log(`Dispatching messages for ${contactsToMessage.length} contacts...`);

    for (const contact of contactsToMessage) {
        // --- STEP 3: Apply Rotation Logic ---
        const selectedTemplate = selectNextTemplate(campaignAssets.templates);
        const selectedNumber = selectNextPhoneNumber(campaignAssets.phoneNumbers);

        // --- DUPLICATE CHECK: If we've sent (or queued) to this phone in the last 24 hours, defer it ---
        try {
            const { readSettings } = require('./lib/fileSettings');
            const fsSettings = readSettings();
            const orgSettings = fsSettings[campaign.org_id] || {};
            const windowHours = Number(orgSettings.duplicateWindowHours || 24);
            const reenqueueEnabled = orgSettings.reenqueueDeferred === undefined ? true : !!orgSettings.reenqueueDeferred;

            const lastMessage = await prisma.message.findFirst({
                where: { toNumber: contact.phone },
                orderBy: { createdAt: 'desc' }
            });

            if (lastMessage) {
                const lastTime = lastMessage.sentAt || lastMessage.createdAt;
                const windowMs = windowHours * 60 * 60 * 1000;
                if (lastTime && (new Date() - new Date(lastTime)) < windowMs) {
                    // Defer: compute next eligible time only if auto reenqueue enabled
                    const nextSend = new Date(new Date(lastTime).getTime() + windowMs);
                    if (reenqueueEnabled) {
                        await prisma.contact.update({ where: { id: contact.id }, data: { nextEligibleAt: nextSend } });
                        // Log an Activity so we can track deferred items
                        await prisma.activity.create({ data: {
                            organizationId: campaign.org_id ? String(campaign.org_id) : null,
                            type: 'DEFERRED_DUPLICATE',
                            message: `Deferred contact ${contact.id} until ${nextSend.toISOString()} due to recent send/queue`,
                            meta: { contactId: contact.id, lastMessageId: lastMessage.id, nextEligibleAt: nextSend }
                        }});
                        console.log(`Deferred contact ${contact.id}; will retry at ${nextSend.toISOString()}`);
                    } else {
                        // Mark deferred for manual review
                        await prisma.contact.update({ where: { id: contact.id }, data: { status: 'Deferred' } });
                        await prisma.activity.create({ data: {
                            organizationId: campaign.org_id ? String(campaign.org_id) : null,
                            type: 'DEFERRED_MANUAL',
                            message: `Contact ${contact.id} deferred for manual retry (last send ${lastTime})`,
                            meta: { contactId: contact.id, lastMessageId: lastMessage.id }
                        }});
                        console.log(`Contact ${contact.id} deferred for manual review`);
                    }
                    // Skip actual sending for this contact (it has been deferred)
                    continue;
                }
            }
        } catch (e) {
            console.error('Error checking last message for duplicates', e);
        }

        // --- STEP 4: Dispatch ---
        try {
            // If this campaign is a cold-calling voice campaign, enqueue to the voice worker
            const isCold = campaign.callingMode === 'COLD_CALLING' || campaign.campaign_type === 'COLD_CALLING';

            if (isCold) {
                // Use Redis connection to push to voice-calls queue
                const redisUrl = process.env.REDIS_URL || null;
                const redisOpts = redisUrl ? new URL(redisUrl) : null;
                const redisConn = redisUrl ? { host: redisOpts.hostname, port: Number(redisOpts.port) || 6379, password: redisOpts.password || undefined } : { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT) || 6379 };
                const connection = new IORedis(redisConn);
                const voiceQueue = new Queue('voice-calls', { connection });

                // Respect a conservative default interval between calls during testing
                const intervalSeconds = Number(process.env.COLD_CALL_INTERVAL_SECONDS || 120); // default 120s (2 minutes)
                const delay = (batchIndex * intervalSeconds) * 1000;

                await voiceQueue.add('make-call', { contactId: contact.id, organizationId: campaign.org_id ? String(campaign.org_id) : null, callType: 'cold' }, { delay });
                // close ioredis connection to avoid leaks
                connection.disconnect();
            } else {
                const { sendNow } = require('./campaignSender');
                await sendNow(campaign.org_id ? String(campaign.org_id) : null, campaign.campaign_id || campaign.campaign_id, contact.id);
            }
        } catch (e) {
            console.error('Error dispatching contact for campaign', e);
        }
    }

    console.log(`Campaign ${campaign.campaign_id} batch complete.`);
}


// --- 2. Main Worker Loop (Runs periodically) ---
async function main() {
    console.log('Campaign Orchestrator Worker running...');
    
    while (true) {
        try {
            // NOTE: In a production app, this worker would wake up every minute or two.
            
            // Placeholder: Find all active campaigns
            // Requires a 'campaigns' table with an 'is_active' flag
            const activeCampaigns = [{ 
                campaign_id: 100, 
                campaign_name: 'Q4 Cold Outreach', 
                org_id: 1 
            }]; 

            for (const campaign of activeCampaigns) {
                // Process each active campaign sequentially
                await processCampaign(campaign);
            }

            // Wait 60 seconds before checking for new campaigns/tasks again
            await new Promise(resolve => setTimeout(resolve, 60000)); 

        } catch (error) {
            console.error('Main orchestrator loop error:', error);
            // Wait longer on error
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }
}
export { processCampaign };

if (process.env.NODE_ENV !== 'test') {
    main().catch(e => {
        console.error(e);
        process.exit(1);
    }).finally(async () => {
        await prisma.$disconnect();
    });
}