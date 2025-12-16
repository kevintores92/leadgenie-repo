document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('clientForm');
  const resp = document.getElementById('responseArea');

  // UI elements added dynamically
  const connectBtn = document.createElement('button');
  connectBtn.type = 'button';
  connectBtn.textContent = 'Get Token & Connect';
  form.appendChild(connectBtn);

  const makeCallLabel = document.createElement('label');
  makeCallLabel.style.display = 'block';
  makeCallLabel.style.marginTop = '8px';
  makeCallLabel.textContent = 'Call target (client or phone): ';
  const makeCallInput = document.createElement('input');
  makeCallInput.id = 'callTarget';
  makeCallInput.style.marginLeft = '6px';
  makeCallLabel.appendChild(makeCallInput);
  const callBtn = document.createElement('button');
  callBtn.type = 'button';
  callBtn.textContent = 'Call';
  form.appendChild(makeCallLabel);
  form.appendChild(callBtn);

  let device = null;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const client = document.getElementById('clientName').value.trim();
    resp.textContent = 'Requesting TwiML...';

    try {
      const r = await fetch('/twiml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client })
      });
      const text = await r.text();
      resp.textContent = text;
    } catch (err) {
      resp.textContent = 'Error: ' + err.message;
    }
  });

  connectBtn.addEventListener('click', async () => {
    const client = document.getElementById('clientName').value.trim();
    resp.textContent = 'Requesting token...';
    try {
      const r = await fetch('/token?client=' + encodeURIComponent(client));
      const j = await r.json();
      resp.textContent = JSON.stringify(j, null, 2);

      if (j && j.token && window.Twilio && typeof Twilio.Device === 'function' && j.token !== 'STUB-TOKEN') {
        if (device) {
          try { device.destroy(); } catch (e) { /* ignore */ }
          device = null;
        }
        device = new Twilio.Device(j.token, { debug: true });
        device.on('ready', () => { resp.textContent = 'Device ready — identity: ' + j.identity; });
        device.on('error', (err) => { resp.textContent = 'Device error: ' + (err && err.message); });
        device.on('connect', (conn) => { resp.textContent = 'Connected to ' + (conn && conn.parameters && JSON.stringify(conn.parameters)); });
        device.on('disconnect', () => { resp.textContent = 'Disconnected'; });
      } else if (j && j.token === 'STUB-TOKEN') {
        resp.textContent = 'Received stub token — set up Twilio credentials on server for real tokens.';
      } else {
        resp.textContent = JSON.stringify(j, null, 2);
      }
    } catch (err) {
      resp.textContent = 'Error fetching token: ' + err.message;
    }
  });

  callBtn.addEventListener('click', () => {
    const target = document.getElementById('callTarget').value.trim();
    if (!device) return resp.textContent = 'Device not initialized. Get token first.';
    if (!target) return resp.textContent = 'Enter a call target first.';
    resp.textContent = 'Calling ' + target + '...';
    try {
      device.connect({ To: target });
    } catch (err) {
      resp.textContent = 'Call error: ' + err.message;
    }
  });
});
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('clientForm');
  const resp = document.getElementById('responseArea');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const client = document.getElementById('clientName').value.trim();
    resp.textContent = 'Loading...';

    try {
      const r = await fetch('/twiml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client })
      });
      const text = await r.text();
      resp.textContent = text;
    } catch (err) {
      resp.textContent = 'Error: ' + err.message;
    }
  });
});
