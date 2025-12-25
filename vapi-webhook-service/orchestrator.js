const redis = require('./redisClient');
const campaigns = require('./campaigns.json');

async function handleEvent(evt = {}) {
  try {
    const eventName = evt.event || evt.type || 'unknown';
    const callId = evt.callId || (evt.payload && evt.payload.callId) || 'unknown';
    console.log('[orchestrator] event', eventName, 'call', callId);

    // Basic mapping and logging — extend as needed
    if (eventName === 'call.started' || eventName === 'call.start') {
      // register start time
      await redis.set(`call:${callId}:startedAt`, Date.now());
    }

    if (eventName === 'transcript.final' || eventName === 'transcript') {
      const text = evt.transcript || (evt.payload && evt.payload.text) || '';
      await redis.set(`call:${callId}:lastTranscript`, text);
    }

    if (eventName === 'call.ended' || eventName === 'call.end') {
      await redis.set(`call:${callId}:endedAt`, Date.now());
      // persist a simple summary for later retrieval
      const started = await redis.get(`call:${callId}:startedAt`);
      const summary = { callId, startedAt: started || null, endedAt: Date.now() };
      await redis.set(`call:${callId}:summary`, JSON.stringify(summary));
    }

    // placeholder: use `campaigns` to decide routing/pacing if needed
    return true;
  } catch (err) {
    console.error('[orchestrator] failed', err);
    throw err;
  }
}

module.exports = { handleEvent };
