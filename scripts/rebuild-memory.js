const fs = require('fs');
const glob = require('glob');
const { createClient } = require('@supabase/supabase-js');

async function rebuild() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('Skipping Postgres rebuild: SUPABASE_URL or SUPABASE_KEY is not set.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Truncate and rebuild from JSONL (Assuming the SQL RPC 'truncate_memory' is created by the user)
  const { error: truncateError } = await supabase.rpc('truncate_memory');
  if (truncateError) {
    console.error('Warning truncating memory_event table (RPC might not exist):', truncateError.message);
  }
  
  const journalPaths = glob.sync('public/citizens/*/journal.jsonl');
  let totalEvents = 0;

  for (const journalPath of journalPaths) {
    const parts = journalPath.split('/');
    const agentId = parts[parts.length - 2];
    
    const lines = fs.readFileSync(journalPath, 'utf8').trim().split('\n');
    if (!lines || lines[0] === '') continue;

    const events = lines.map(line => {
      try {
        const entry = JSON.parse(line);
        return {
          agent_id: agentId,
          seq: entry.seq,
          epoch: entry.epoch,
          type: entry.type,
          event: entry.event || null,
          target: entry.target || null,
          confidence: entry.confidence || null,
          outcome: entry.outcome || null,
          playbook_id: entry.playbook_id || null,
          score: entry.score || null,
          tokens_earned: entry.tokens_earned || 0,
          signature: entry.signature,
          raw_json: entry
        };
      } catch (e) {
        return null;
      }
    }).filter(e => e !== null);
    
    if (events.length > 0) {
      const { error } = await supabase.from('memory_event').insert(events);
      if (error) {
        console.error(`Failed to insert events for ${agentId}:`, error.message);
      } else {
        totalEvents += events.length;
      }
    }
  }
  
  console.log(`Rebuilt ${totalEvents} events from JSONL into Postgres hot cache.`);
}

rebuild().catch(console.error);
