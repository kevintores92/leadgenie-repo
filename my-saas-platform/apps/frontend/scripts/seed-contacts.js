const fs = require('fs');
const path = require('path');

const N = 254;
const DATA_FILE = path.resolve(__dirname, '../data/contacts.json');

function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

const first = ['Alice','Bob','Carol','Dan','Eve','Frank','Grace','Heidi','Ivan','Judy','Kevin','Laura','Mallory','Niaj','Olivia','Peggy','Quinn','Rupert','Sybil','Trent'];
const last = ['Smith','Johnson','Nguyen','Lee','Garcia','Brown','Davis','Miller','Wilson','Moore','Taylor','Anderson','Thomas','Jackson'];
const tags = ['this or that','test tag list','vip','lead','follow up'];

const items = [];
for(let i=0;i<N;i++){
  const f = rand(first);
  const l = rand(last);
  const created = new Date(Date.now() - Math.floor(Math.random()*1000*60*60*24*365)).toISOString();
  const lastActivity = new Date(Date.now() - Math.floor(Math.random()*1000*60*60*24*90)).toISOString();
  items.push({
    id: `c_${i+1}`,
    firstName: f,
    lastName: l,
    phone: `(555) ${100 + i}`.padEnd(12,'0'),
    email: `${f.toLowerCase()}.${l.toLowerCase()}@example.com`,
    createdAt: created,
    lastActivity,
    tags: Math.random() > 0.6 ? [rand(tags)] : []
  });
}

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
console.log('Wrote', items.length, 'contacts to', DATA_FILE);
