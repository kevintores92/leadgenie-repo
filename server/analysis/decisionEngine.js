// Pure logic mapping comp scores to decisions

function decide(compScore){
  if(compScore === 'HIGH') return 'CONTINUE'
  if(compScore === 'MEDIUM') return 'FOLLOW_UP'
  return 'END'
}

module.exports = { decide }
