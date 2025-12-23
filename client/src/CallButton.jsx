import React from 'react'

export default function CallButton({onState, setTranscript, setComp}){
  async function startCall(){
    onState && onState('CONNECTING')
    // minimal demo POST to server
    const resp = await fetch('/startCall', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({phone:process.env.REACT_APP_TEST_PHONE||'+15555550100', equity:50, address:'123 Main'})})
    const json = await resp.json()
    if(json.ok){
      onState && onState('CONNECTING')
      // open a simple event source to receive logs (not implemented fully)
      // For demo we just poll status via /health
      setTimeout(()=> onState && onState('ESTABLISHED'), 3000)
      // later states will be reflected by logs in server console
    }
  }

  return (
    <button onClick={startCall} style={{padding:10}}>Start AI Call</button>
  )
}
