const fs = require('fs');
const glob = require('glob');
const crypto = require('crypto');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function computeMemoryMerkle() {
  const journals = glob.sync('public/citizens/*/journal.jsonl');
  
  if (journals.length === 0) {
    console.log('No journals found. Skipping Merkle compute.');
    return;
  }

  let totalEvents = 0;
  const leaves = journals.map(path => {
    const content = fs.readFileSync(path, 'utf8');
    const hash = sha256(content);
    
    // We assume the signature file is named journal.sig
    const sigPath = path.replace('.jsonl', '.sig');
    let sig = '';
    if (fs.existsSync(sigPath)) {
      sig = fs.readFileSync(sigPath, 'utf8').trim();
    }
    
    totalEvents += content.trim().split('\n').filter(line => line.length > 0).length;
    
    return sha256(hash + sig); 
  });
  
  const root = sha256(leaves.join(''));
  const epoch = Math.floor(Date.now() / 1800000);
  
  const manifest = {
    epoch: epoch,
    root: root,
    journal_count: journals.length,
    total_events: totalEvents,
    computed_at: new Date().toISOString()
  };

  if (!fs.existsSync('public/learning')) {
    fs.mkdirSync('public/learning', { recursive: true });
  }

  fs.writeFileSync('public/learning/merkle_memory.json', JSON.stringify(manifest, null, 2));
  console.log(`✅ Merkle root computed for ${journals.length} journals. Root: ${root.slice(0,16)}...`);
}

computeMemoryMerkle();
