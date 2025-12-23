// Navi LLM stub/extractor.
// Per spec: must accept text and return JSON only with keys: motivation, timeline, objection
// Prompt template is followed conceptually. For MVP we implement a deterministic extractor.

async function extractSignals(text){
  // deterministic rules
  const lower = (text||'').toLowerCase()
  let motivation = 'low'
  let timeline = 'unknown'
  let objection = false

  if(lower.includes('interested') || lower.includes('sell') || lower.includes('motivated')) motivation = 'high'
  else if(lower.includes('maybe') || lower.includes('later')) motivation = 'medium'

  if(lower.includes('now') || lower.includes('this week')) timeline = 'now'
  else if(lower.includes('later') || lower.includes('next month')) timeline = 'later'

  if(lower.includes('no') || lower.includes('not interested') || lower.includes('busy')) objection = true

  // Return exactly the JSON object (not string with extra text)
  return { motivation, timeline, objection }
}

module.exports = { extractSignals }
