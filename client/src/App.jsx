import React, {useEffect, useState} from 'react'
import CallButton from './CallButton'

export default function App(){
  const [state, setState] = useState('IDLE')
  const [transcript, setTranscript] = useState([])
  const [compScore, setCompScore] = useState(null)

  useEffect(()=>{
    const ws = new WebSocket(`ws://${window.location.host}/ws/updates`)
    ws.onopen = () => console.log('updates ws open')
    ws.onmessage = (m) => {
      try{
        const obj = JSON.parse(m.data)
        if(obj.type === 'state') setState(obj.state)
        if(obj.type === 'transcript') setTranscript(t => [...t, obj.text])
        if(obj.type === 'comp') setCompScore(obj.score)
      }catch(e){ }
    }
    return ()=> ws.close()
  },[])

  return (
    <div style={{padding:20,fontFamily:'sans-serif'}}>
      <h3>AI Cold Call Orchestrator (MVP)</h3>
      <CallButton onState={s=>setState(s)} setTranscript={setTranscript} setComp={setCompScore} />
      <div style={{marginTop:20}}>
        <strong>Current State:</strong> {state}
      </div>
      <div style={{marginTop:10}}>
        <strong>Live Transcript:</strong>
        <ul>
          {transcript.map((t,i)=>(<li key={i}>{t}</li>))}
        </ul>
      </div>
      <div>
        <strong>Comp Score:</strong> {compScore}
      </div>
    </div>
  )
}
