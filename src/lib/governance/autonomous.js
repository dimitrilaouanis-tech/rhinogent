const fs = require('fs');
const crypto = require('crypto');

const CONSTITUTION = {
  emission_rate: { min: 0.005, max: 0.05, current: 0.035 },
  burn_rate: { min: 0.005, max: 0.10, current: 0.02 },
  gate_threshold: { min: 0.1, max: 0.9, current: 0.45 }
};

function loadMetrics() {
  try { return JSON.parse(fs.readFileSync('public/metrics.json', 'utf8')); } 
  catch { return { network_trust_score: 0.7, token_velocity: 50, active_agent_ratio: 0.5 }; }
}

function loadParams() {
  try { return JSON.parse(fs.readFileSync('src/lib/governance/params.json', 'utf8')); } 
  catch { return CONSTITUTION; }
}

function run() {
  const metrics = loadMetrics();
  const params = loadParams();
  const epoch = Math.floor(Date.now() / 1800000);
  
  let newParams = { ...params };
  let decisions = [];

  if (metrics.network_trust_score < 0.6) { 
    newParams.emission_rate = Math.min(0.05, newParams.emission_rate + 0.005); 
    decisions.push("NTS low→emit+"); 
  }
  if (metrics.active_agent_ratio < 0.3) { 
    newParams.emission_rate = Math.min(0.05, newParams.emission_rate + 0.003); 
    decisions.push("AAR low→emit+"); 
  }
  if (metrics.token_velocity > 100) { 
    newParams.burn_rate = Math.min(0.10, newParams.burn_rate + 0.01); 
    decisions.push("V high→burn+"); 
  }

  const delta = { epoch, timestamp: Date.now(), previous: params, current: newParams, decisions };
  const signature = crypto.createHmac('sha256', process.env.BRIDGE_KEY || 'test-key').update(JSON.stringify(delta)).digest('hex');
  
  fs.mkdirSync('public/governance', { recursive: true });
  fs.writeFileSync('public/governance/parameter_delta.json', JSON.stringify({ ...delta, signature }, null, 2));
  fs.writeFileSync('src/lib/governance/params.json', JSON.stringify(newParams, null, 2));
  
  console.log(`✅ Epoch ${epoch}: ${decisions.length} changes applied.`);
}
run();
