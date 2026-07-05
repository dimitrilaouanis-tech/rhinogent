const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

async function derivePlaybooks() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('Skipping playbook derivation: Supabase credentials not set.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: successes, error } = await supabase
    .from('memory_event')
    .select('event, playbook_id, score')
    .eq('type', 'episodic')
    .gte('score', 0.85);

  if (error) {
    console.error('Error fetching successes:', error.message);
    return;
  }

  if (!successes || successes.length === 0) {
    console.log('No successful patterns found to promote to playbooks.');
    return;
  }

  // Group by event type
  const grouped = {};
  for (const s of successes) {
    const key = s.event;
    if (!grouped[key]) grouped[key] = { event: s.event, count: 0, totalScore: 0 };
    grouped[key].count += 1;
    grouped[key].totalScore += parseFloat(s.score);
  }

  for (const key in grouped) {
    const pattern = grouped[key];
    const avgScore = pattern.totalScore / pattern.count;

    if (avgScore > 0.9 && pattern.count > 5) {
      const playbookId = `p-${crypto.createHash('sha256').update(key).digest('hex').slice(0, 10)}`;
      
      const playbookData = {
        playbook_id: playbookId,
        problem: pattern.event,
        avg_score: avgScore,
        adoption_count: pattern.count,
        signature: signWithBridgeKey(key)
      };

      console.log(`Promoting new playbook: ${playbookId} for problem '${pattern.event}'`);
    }
  }
}

function signWithBridgeKey(dataStr) {
  const key = process.env.BRIDGE_KEY || 'test-key';
  return crypto.createHmac('sha256', key).update(dataStr).digest('hex');
}

derivePlaybooks().catch(console.error);
