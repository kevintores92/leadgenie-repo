// apps/backend-api/routes/webhooks.ts (inbound route snippet)
await prisma.message.create({
  data: {
    organizationId,
    contactId: contact.id,
    direction: 'INBOUND',
    status: 'DELIVERED',
    channel: 'SMS',
    fromNumber: From,
    toNumber: To,
    body: Body,
  },
});

// Enqueue LLM processing (autoReply flag from org settings)
await inboundQueue.add('classify-and-reply', {
  messageId: created.id,
  organizationId,
  autoReply: true, // or read from org settings/feature flag
});