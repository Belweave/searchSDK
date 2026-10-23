import success from './search-success.json';

globalThis.__searchSDKSmoke = { status: 'pending', assertions: [], requests: 0 };
globalThis.fetch = async (input, init) => {
  if (String(input) !== 'https://gateway.example.test/search') throw new Error('External fetch disabled in Expo consumer verification.');
  const report = globalThis.__searchSDKSmoke;
  report.requests++;
  if (init.method !== 'POST' || init.redirect !== 'error' || init.credentials !== 'omit') throw new Error('Gateway transport flags lost.');
  if (new Headers(init.headers).get('authorization') !== 'Bearer synthetic-app-token') throw new Error('Application bearer token missing.');
  const { query } = JSON.parse(init.body);
  if (query === 'cancel') return new Promise(() => {});
  const value = query === 'auth' ? { error: { code: 'auth', attempts: [] } } : success;
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const stream = new ReadableStream({ start(controller) {
    for (let offset = 0; offset < bytes.length; offset += 13) controller.enqueue(bytes.slice(offset, offset + 13));
    controller.close();
  } });
  return new Response(stream, { status: query === 'auth' ? 401 : 200, headers: { 'Content-Type': 'application/json', 'X-SearchSDK-Protocol': '1' } });
};
