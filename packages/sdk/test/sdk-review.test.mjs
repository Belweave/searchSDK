import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryCheckpointStore, runDurableOperation, attachDurableRemoteId, DurableOperationError } from '../dist/durable.js';

const binding = { key: 'review:job', operation: 'fixture.job', inputFingerprint: 'fixture-input' };
const code = expected => error => error instanceof DurableOperationError && error.code === expected;
const options = store => ({ ...binding, store, submit: async () => ({ remoteId: 'job_fixture' }),
  poll: async () => ({ state: 'completed', value: 'done' }) });

test('review: durable snapshots retain a class getter signal and never dispatch a pre-aborted invocation', async () => {
  const memory = createMemoryCheckpointStore();
  const controller = new AbortController();
  controller.abort('fixture-private-reason');
  let loads = 0, submissions = 0;
  class Invocation {
    constructor() {
      Object.assign(this, options({ load: async key => { loads++; return memory.load(key); },
        compareAndSet: memory.compareAndSet.bind(memory) }));
      this.submit = async () => { submissions++; return { remoteId: 'unexpected' }; };
    }
    get signal() { return controller.signal; }
  }
  await assert.rejects(runDurableOperation(new Invocation()), code('aborted'));
  assert.equal(loads, 0);
  assert.equal(submissions, 0);
  assert.equal(await memory.load(binding.key), null);
});

test('review: durable snapshots preserve inherited bindings and non-enumerable polling limits', async () => {
  const memory = createMemoryCheckpointStore();
  let polls = 0, submissions = 0;
  const invocation = Object.create(options(memory));
  Object.defineProperty(invocation, 'maxPolls', { value: 1 });
  invocation.timeoutMs = 50;
  invocation.submit = async () => { submissions++; return { remoteId: 'job_fixture' }; };
  invocation.poll = async () => { polls++; return { state: 'pending' }; };
  await assert.rejects(runDurableOperation(invocation), code('poll_limit'));
  assert.equal(polls, 1);
  assert.equal(submissions, 1);
  assert.equal((await memory.load(binding.key)).remoteId, 'job_fixture');
});

test('review: durable snapshots validate non-enumerable timing settings before storage or submission', async () => {
  const memory = createMemoryCheckpointStore();
  for (const field of ['timeoutMs', 'pollIntervalMs', 'maxPolls']) {
    const invocation = options(memory);
    Object.defineProperty(invocation, field, { value: 0 });
    await assert.rejects(runDurableOperation(invocation), code('configuration'));
    assert.equal(await memory.load(binding.key), null);
  }
});

test('review: durable reconciliation snapshots retain inherited binding and remote identifier properties', async () => {
  const memory = createMemoryCheckpointStore();
  await assert.rejects(runDurableOperation({ ...options(memory), submit: async () => { throw new Error('fixture'); } }),
    code('ambiguous_submission'));
  const invocation = Object.create({ ...binding, store: memory, remoteId: 'verified_job' });
  const checkpoint = await attachDurableRemoteId(invocation);
  assert.equal(checkpoint.state, 'submitted');
  assert.equal(checkpoint.remoteId, 'verified_job');
  const result = await runDurableOperation({ ...options(memory), submit: async () => { assert.fail('must never resubmit'); } });
  assert.equal(result.resumed, true);
  assert.equal(result.checkpoint.remoteId, 'verified_job');
});
