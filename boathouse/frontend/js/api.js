const API_BASE_URL = 'http://localhost:8000';

const API = {
  async items()       { return fetch(`${API_BASE_URL}/items`).then(r=>r.json()); },
  async save(items)   { return fetch(`${API_BASE_URL}/items`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(items)}).then(r=>r.json()); },
  async vote(win,lo)  { return fetch(`${API_BASE_URL}/vote`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({winner:win,loser:lo})}); },
  async apply(opData) { return fetch(`${API_BASE_URL}/operator`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(opData)}); }
};
