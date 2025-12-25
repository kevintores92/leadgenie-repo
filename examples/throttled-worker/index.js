class TokenBucket {
  constructor({capacity, refillRatePerSec}){
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRatePerSec = refillRatePerSec;
    setInterval(()=> this._refill(), 1000);
  }
  _refill(){
    this.tokens = Math.min(this.capacity, this.tokens + this.refillRatePerSec);
  }
  tryRemove(n=1){
    if(this.tokens >= n){
      this.tokens -= n;
      return true;
    }
    return false;
  }
}

class TaskQueue {
  constructor({concurrency = 2, tokenBucket}){
    this.queue = [];
    this.running = 0;
    this.concurrency = concurrency;
    this.tokenBucket = tokenBucket;
  }

  enqueue(task){
    this.queue.push(task);
    this._maybeProcess();
  }

  _maybeProcess(){
    if(this.running >= this.concurrency) return;
    if(this.queue.length === 0) return;
    if(!this.tokenBucket.tryRemove(1)) return; // rate-limited

    const task = this.queue.shift();
    this.running++;
    this._runTask(task)
      .then(()=> this._onComplete())
      .catch(()=> this._onComplete());
  }

  async _runTask(task){
    try{
      await task();
    }catch(err){
      // in real system implement retries/backoff
      console.error('task failed', err.message || err);
    }
  }

  _onComplete(){
    this.running--;
    // schedule next attempt; small delay avoids tight loop when tokens are exhausted
    setImmediate(()=> this._maybeProcess());
  }
}

// Simulated external validation call (random duration + random failure)
function simulatedValidationCall(contact){
  return new Promise((resolve, reject)=>{
    const duration = 200 + Math.random()*800;
    setTimeout(()=>{
      const ok = Math.random() > 0.15; // 85% success
      if(ok) resolve({contact, result: 'valid', phoneType: Math.random()>0.4 ? 'mobile' : 'landline'});
      else reject(new Error('external-api-rate-or-timeout'));
    }, duration);
  });
}

// Demo runner
async function main(){
  console.log('Throttled worker demo start');

  // Per-org token buckets (e.g., per-org phone validation rate)
  const orgBuckets = {
    veracity: new TokenBucket({capacity: 5, refillRatePerSec: 2}),
    acme: new TokenBucket({capacity: 3, refillRatePerSec: 1})
  };

  const queues = {
    veracity: new TaskQueue({concurrency: 3, tokenBucket: orgBuckets.veracity}),
    acme: new TaskQueue({concurrency: 2, tokenBucket: orgBuckets.acme})
  };

  // Enqueue simulated contacts
  const contacts = Array.from({length: 30}, (_,i)=> ({id:i+1, phone: `+1555000${100+i}`}));

  for(const c of contacts){
    const org = (c.id % 2 === 0) ? 'veracity' : 'acme';
    queues[org].enqueue(async ()=>{
      console.log(new Date().toISOString(), `[${org}] validating ${c.phone}`);
      const res = await simulatedValidationCall(c);
      console.log(new Date().toISOString(), `[${org}] result ${c.phone} -> ${res.phoneType}`);
      // In real system: write to DB, emit event to next queue
    });
  }

  // Monitor status
  const monitor = setInterval(()=>{
    const qlenV = queues.veracity.queue.length;
    const qlenA = queues.acme.queue.length;
    const tokensV = orgBuckets.veracity.tokens.toFixed(2);
    const tokensA = orgBuckets.acme.tokens.toFixed(2);
    console.log(new Date().toISOString(), `status veracity q=${qlenV} tok=${tokensV} ver-run=${queues.veracity.running} | acme q=${qlenA} tok=${tokensA} acme-run=${queues.acme.running}`);
    if(qlenV===0 && qlenA===0 && queues.veracity.running===0 && queues.acme.running===0){
      console.log('All done.');
      clearInterval(monitor);
    }
  }, 2000);
}

main().catch(err=> console.error(err));
