// apps/backend-api/routes/ai.ts
router.get('/messages/:id/ai', async (req, res) => {
  const msg = await prisma.message.findUnique({ where: { id: req.params.id } });
  if (!msg) return res.status(404).json({ error: 'Not found' });
  res.json({
    classification: msg.aiClassification,
    replyDraft: msg.aiReplyDraft,
    flags: msg.aiFlags,
    model: msg.aiModel,
  });
});

router.post('/messages/:id/approve-reply', async (req, res) => {
  // Create an OUTBOUND message to be sent using your existing queue
  // Optionally update statuses, audit logs, etc.
  res.json({ ok: true });
});