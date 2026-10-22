import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createMemoryCheckpointStore, runDurableOperation, attachDurableRemoteId, DurableOperationError } from '../dist/durable.js';
import { createFileCheckpointStore } from '../dist/durable-node.js';

const code = expected => error => { assert.ok(error instanceof DurableOperationError); assert.equal(error.code, expected); return true; };
const binding = { key: 'tenantA:job1', operation: 'fixture.create', inputFingerprint: 'sha256-example' };
const opts = store => ({ ...binding, store, submit: async () => ({ remoteId: 'job_123' }), poll: async () => ({ state: 'completed', value: { ok: true } }), pollIntervalMs: 1 });

test('durable stores intent before one submission, persists remote ID and returns committed result on resume', async () => {
  const store = createMemoryCheckpointStore(); let submits = 0; let polls = 0;
  const options = { ...opts(store), submit: async () => { submits++; assert.equal((await store.load(binding.key)).state, 'submitting'); return { remoteId: 'job_123' }; }, poll: async id => { polls++; assert.equal(id, 'job_123'); return { state: 'completed', value: { ok: true } }; } };
  const first = await runDurableOperation(options); assert.equal(first.resumed, false); assert.equal(first.checkpoint.revision, 3);
  first.value.ok = false;
  const second = await runDurableOperation(options); assert.equal(second.resumed, true); assert.equal(second.value.ok, true);
  assert.equal(submits, 1); assert.equal(polls, 1);
});

test('durable poll limit resumes reads by saved ID without resubmitting', async () => {
  const store = createMemoryCheckpointStore(); let submits = 0;
  const options = { ...opts(store), submit: async () => { submits++; return { remoteId: 'job_123' }; }, poll: async () => ({ state: 'pending' }), maxPolls: 1 };
  await assert.rejects(runDurableOperation(options), code('poll_limit'));
  assert.equal((await store.load(binding.key)).state, 'submitted');
  const result = await runDurableOperation({ ...options, poll: async () => ({ state: 'completed', value: 'done' }) });
  assert.equal(result.value, 'done'); assert.equal(result.resumed, true); assert.equal(submits, 1);
});

test('durable ambiguous submit is never automatically retried; explicit reconciliation enables reads only', async () => {
  const store = createMemoryCheckpointStore(); let submits = 0;
  const options = { ...opts(store), submit: async () => { submits++; throw new Error('secret token or provider body'); } };
  await assert.rejects(runDurableOperation(options), error => { code('ambiguous_submission')(error); assert.ok(!String(error).includes('secret')); return true; });
  await assert.rejects(runDurableOperation(options), code('ambiguous_submission')); assert.equal(submits, 1);
  await attachDurableRemoteId({ ...binding, store, remoteId: 'verified_job_123' });
  const result = await runDurableOperation({ ...options, poll: async id => ({ state: 'completed', value: id }) });
  assert.equal(result.value, 'verified_job_123'); assert.equal(submits, 1);
});

test('durable cancellation after dispatch retains ambiguous intent and never resubmits', async () => {
  const store = createMemoryCheckpointStore(); const controller = new AbortController(); let submits = 0;
  const options = { ...opts(store), signal: controller.signal, submit: async () => { submits++; controller.abort('secret'); return new Promise(() => {}); } };
  await assert.rejects(runDurableOperation(options), code('ambiguous_submission'));
  await assert.rejects(runDurableOperation({ ...options, signal: undefined }), code('ambiguous_submission')); assert.equal(submits, 1);
});

test('durable concurrent starts use compare-and-set and cannot double-submit', async () => {
  const store = createMemoryCheckpointStore(); let submits = 0;
  const options = { ...opts(store), submit: async () => { submits++; return { remoteId: 'job_123' }; } };
  const results = await Promise.allSettled([runDurableOperation(options), runDurableOperation(options)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(submits, 1);
});

test('durable rejects changed input/account binding before poll and submission', async () => {
  const store = createMemoryCheckpointStore(); await runDurableOperation(opts(store)); let called = false;
  await assert.rejects(runDurableOperation({ ...opts(store), inputFingerprint: 'different-account-or-input', submit: async () => { called = true; return { remoteId: 'oops' }; }, poll: async () => { called = true; return { state: 'pending' }; } }), code('checkpoint_conflict'));
  assert.equal(called, false);
});

test('durable result is a snapshot of the completed checkpoint even when provider object mutates during CAS', async () => {
  const backing = createMemoryCheckpointStore(); const value = { version: 1 };
  const store = { load: key => backing.load(key), async compareAndSet(key, revision, next) { if (next.state === 'completed') value.version = 2; return backing.compareAndSet(key, revision, next); } };
  const result = await runDurableOperation({ ...opts(store), poll: async () => ({ state: 'completed', value }) });
  assert.equal(result.value.version, 1); assert.equal(result.checkpoint.result.version, 1);
});

test('durable status failure leaves resumable identifier; explicit remote failure is terminal', async () => {
  const store = createMemoryCheckpointStore();
  await assert.rejects(runDurableOperation({ ...opts(store), poll: async () => { throw new Error('secret'); } }), code('poll_failed'));
  assert.equal((await store.load(binding.key)).state, 'submitted');
  await assert.rejects(runDurableOperation({ ...opts(store), poll: async () => ({ state: 'failed' }) }), code('remote_failed'));
  assert.equal((await store.load(binding.key)).state, 'failed');
  await assert.rejects(runDurableOperation(opts(store)), code('remote_failed'));
});

test('durable checkpoint persistence failure after submission exposes only saved remote ID for reconciliation', async () => {
  const backing = createMemoryCheckpointStore();
  const store = { load: key => backing.load(key), compareAndSet: (key, revision, next) => { if (next.state === 'submitted') throw new Error('disk path secret'); return backing.compareAndSet(key, revision, next); } };
  await assert.rejects(runDurableOperation(opts(store)), error => { code('storage_failure')(error); assert.equal(error.remoteId, 'job_123'); assert.ok(!JSON.stringify(error).includes('disk path')); return true; });
  assert.equal((await backing.load(binding.key)).state, 'submitting');
});

test('durable memory store is snapshot isolated, revision checked and bounded', async () => {
  const store = createMemoryCheckpointStore({ maxEntries: 1 });
  await runDurableOperation(opts(store)); const one = await store.load(binding.key); one.result.ok = false;
  assert.equal((await store.load(binding.key)).result.ok, true);
  await assert.rejects(runDurableOperation({ ...opts(store), key: 'second' }), code('storage_failure'));
});

async function withDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), 'searchsdk-durable-'));
  try { await run(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('durable file store survives factory re-creation, uses private hashed files and rejects corrupt storage', async () => withDirectory(async directory => {
  const first = await createFileCheckpointStore({ directory }); await runDurableOperation(opts(first));
  const files = await readdir(directory); assert.equal(files.length, 1); assert.match(files[0], /^[a-f0-9]{64}\.json$/);
  const second = await createFileCheckpointStore({ directory }); const result = await runDurableOperation(opts(second)); assert.equal(result.resumed, true);
  await writeFile(join(directory, files[0]), '{bad json', { mode: 0o600 });
  await assert.rejects(second.load(binding.key), code('storage_failure'));
}));

test('durable file store never steals a crashed lock or dispatches when storage is blocked', async () => withDirectory(async directory => {
  const store = await createFileCheckpointStore({ directory }); await runDurableOperation(opts(store));
  const [file] = await readdir(directory); const lock = join(directory, file.replace('.json', '.lock'));
  await writeFile(lock, 'simulated crashed writer', { mode: 0o600 });
  const checkpoint = await store.load(binding.key);
  await assert.rejects(store.compareAndSet(binding.key, checkpoint.revision, { ...checkpoint, revision: checkpoint.revision + 1 }), code('checkpoint_conflict'));
  assert.equal(await readFile(lock, 'utf8'), 'simulated crashed writer');
}));

test('durable file store validates private pre-existing directory and checkpoint caps', async () => withDirectory(async directory => {
  await assert.rejects(createFileCheckpointStore({ directory: join(directory, 'missing') }), code('storage_failure'));
  await chmod(directory, 0o755); await assert.rejects(createFileCheckpointStore({ directory }), code('configuration')); await chmod(directory, 0o700);
  const store = await createFileCheckpointStore({ directory, maxBytes: 10 }); let submitted = false;
  await assert.rejects(runDurableOperation({ ...opts(store), submit: async () => { submitted = true; return { remoteId: 'job_123' }; } }), code('storage_failure')); assert.equal(submitted, false);
}));

test('durable file store resumes submitted checkpoint in a separate Node process without resubmission', async () => withDirectory(async directory => {
  const store = await createFileCheckpointStore({ directory });
  await assert.rejects(runDurableOperation({ ...opts(store), poll: async () => ({ state: 'pending' }), maxPolls: 1 }), code('poll_limit'));
  const durableUrl = new URL('../dist/durable.js', import.meta.url).href;
  const nodeUrl = new URL('../dist/durable-node.js', import.meta.url).href;
  const script = `import {runDurableOperation} from ${JSON.stringify(durableUrl)}; import {createFileCheckpointStore} from ${JSON.stringify(nodeUrl)}; const store=await createFileCheckpointStore({directory:process.env.CHECKPOINT_DIRECTORY}); const r=await runDurableOperation({...${JSON.stringify(binding)},store,submit:async()=>{throw new Error('must not submit')},poll:async(id)=>({state:'completed',value:{id}})}); process.stdout.write(JSON.stringify({resumed:r.resumed,value:r.value}));`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, CHECKPOINT_DIRECTORY: directory }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; let errors = ''; child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { errors += chunk; });
  const exit = await new Promise(resolve => child.on('exit', resolve)); assert.equal(exit, 0, errors);
  assert.deepEqual(JSON.parse(output), { resumed: true, value: { id: 'job_123' } });
}));

test('durable rejects result accessors without executing them and retains the submitted identifier', async () => {
  const store = createMemoryCheckpointStore(); let reads = 0;
  const value = { get amount() { reads++; throw new Error('must not execute'); } };
  await assert.rejects(runDurableOperation({ ...opts(store), poll: async () => ({ state: 'completed', value }) }), code('poll_failed'));
  assert.equal(reads, 0); assert.equal((await store.load(binding.key)).state, 'submitted');
});

test('durable rejects hidden serialization hooks and hidden data rather than silently omitting them', async () => {
  for (const hidden of ['toJSON', 'amount']) {
    const store = createMemoryCheckpointStore(); let calls = 0; const value = { visible: 5 };
    Object.defineProperty(value, hidden, { value: hidden === 'toJSON' ? () => { calls++; return null; } : 6 });
    await assert.rejects(runDurableOperation({ ...opts(store), poll: async () => ({ state: 'completed', value }) }), code('poll_failed'));
    assert.equal(calls, 0); assert.equal((await store.load(binding.key)).state, 'submitted');
  }
});

test('durable rejects sparse arrays, extra array properties and cycles while preserving supported JSON data', async () => {
  const extra = [5]; extra.extra = 'silently omitted by stringify';
  const cycle = {}; cycle.self = cycle;
  for (const value of [Array(1), extra, cycle, { invalid: NaN }, { invalid: undefined }, new Date()]) {
    const store = createMemoryCheckpointStore();
    await assert.rejects(runDurableOperation({ ...opts(store), poll: async () => ({ state: 'completed', value }) }), code('poll_failed'));
    assert.equal((await store.load(binding.key)).state, 'submitted');
  }
  const store = createMemoryCheckpointStore(); const value = JSON.parse('{"__proto__":{"safe":true},"nested":[null,true,5,"text",{"amount":6}]}');
  const completed = await runDurableOperation({ ...opts(store), poll: async () => ({ state: 'completed', value }) });
  assert.deepEqual(completed.value, value); assert.equal(Object.getPrototypeOf(completed.value), Object.prototype);
  value.nested[4].amount = 9;
  assert.equal((await runDurableOperation(opts(store))).value.nested[4].amount, 6);
});
