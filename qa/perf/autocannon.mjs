import autocannon from 'autocannon';
import fs from 'fs';

async function runScenario(name, url, connections = 20, duration = 15) {
  console.log(`\n🚀 Perf smoke: ${name} → ${url}`);
  const result = await autocannon({
    url,
    connections,
    duration,
    pipelining: 1,
    headers: { 'x-correlation-id': `perf-${Date.now()}` },
  });

  const p95 = result.latency.p95;
  console.log(`P95 latency: ${p95} ms`);
  return { name, url, p95, result: {
    latency: result.latency,
    requests: result.requests,
    throughput: result.throughput,
  } };
}

async function main() {
  // Base URLs (default to mock server for smoke)
  const base = process.env.API_BASE || 'http://127.0.0.1:5000';
  const noteId = process.env.PERF_NOTE_ID || 'note-1';

  const scenarios = [];
  scenarios.push(await runScenario('GET /notes', `${base}/notes`));
  scenarios.push(await runScenario('GET /notes/:id', `${base}/notes/${noteId}`));

  const output = {
    timestamp: new Date().toISOString(),
    base,
    scenarios,
  };
  fs.mkdirSync('qa/artifacts', { recursive: true });
  fs.writeFileSync('qa/artifacts/perf-smoke.json', JSON.stringify(output, null, 2));
  console.log('\n✅ Perf smoke complete. Report → qa/artifacts/perf-smoke.json');
}

main().catch(err => {
  console.error('❌ Perf smoke failed', err);
  process.exit(1);
});