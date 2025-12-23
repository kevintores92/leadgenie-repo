// Simple comp analysis scoring logic per spec

function score({equity, motivation, timeline}){
  let s = 0
  if(equity && equity > 40) s += 3
  if(motivation === 'high') s += 3
  if(timeline === 'now') s += 2

  if(s >= 6) return 'HIGH'
  if(s >= 3) return 'MEDIUM'
  return 'LOW'
}

module.exports = { score }
