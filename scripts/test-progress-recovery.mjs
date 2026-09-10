import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/script.js', import.meta.url), 'utf8');
const poems = [1, 2].map(order => ({ order, title: `Fixture ${order}`, author: 'Fixture', category: 'wenyanwen' }));
const stored = (synced = false) => Object.fromEntries(poems.map(p => [`poem-${p.order}`, { ...p, synced, updatedAt: '2026-09-01T00:00:00.000Z' }]));
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
const acknowledge = body => response(200, { ok: true, item: { siteKey: body.siteKey, itemKey: body.itemKey } });

function browser({ saved = stored(), session = async () => ({ authenticated: true }), request, storage } = {}) {
    const values = storage || new Map([['mf-achievements-v2', JSON.stringify(saved)]]);
    const requests = [];
    const context = vm.createContext({
        console: { log() {}, debug() {}, info() {}, warn() {} },
        window: { innerWidth: 1000, BdfzIdentity: session ? { getSession: session } : undefined, addEventListener() {} },
        document: { getElementById: () => null, querySelectorAll: () => [], body: {}, addEventListener() {} },
        localStorage: { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v) },
        fetch: async (url, options = {}) => {
            const row = { url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null };
            requests.push(row);
            return request ? request(row) : row.method === 'GET' ? response(200, { items: [] }) : acknowledge(row.body);
        },
    });
    vm.runInContext(source, context);
    context.fixturePoems = poems;
    vm.runInContext('poemsData = fixturePoems; wenyanwenData = fixturePoems; readStoredAchievements();', context);
    return {
        context, requests, storage: values,
        run: script => vm.runInContext(script, context),
        records: () => JSON.parse(values.get('mf-achievements-v2')),
    };
}

test('anonymous initial load preserves local records without protected progress requests', async () => {
    const b = browser({ session: async () => ({ authenticated: false }) });
    await b.run('hydrateRemoteAchievements()');
    assert.equal(b.requests.length, 0);
    assert.deepEqual(b.records(), stored());
});

test('unavailable identity or session transport leaves local records untouched', async () => {
    for (const session of [null, async () => { throw new Error('private session transport'); }]) {
        const b = browser({ session });
        await b.run('hydrateRemoteAchievements()');
        assert.equal(b.requests.length, 0);
        assert.deepEqual(b.records(), stored());
    }
});

test('returning after login retries pending records and preserves their original timestamps', async () => {
    let authenticated = false;
    const b = browser({ session: async () => ({ authenticated }) });
    await b.run('hydrateRemoteAchievements()');
    authenticated = true;
    await b.run('hydrateRemoteAchievements()');
    assert.equal(b.requests.filter(x => x.method === 'PUT').length, 2);
    assert.deepEqual(b.records(), stored(true));
});

test('401 during a batch stops writes and never marks the current or remaining records synced', async () => {
    const b = browser({ request: r => r.method === 'GET' ? response(200, { items: [] }) : response(401, { error: 'Not authenticated' }) });
    await b.run('hydrateRemoteAchievements()');
    assert.equal(b.requests.filter(x => x.method === 'PUT').length, 1);
    assert.deepEqual(b.records(), stored());
    const restored = browser({ storage: b.storage });
    await restored.run('hydrateRemoteAchievements()');
    assert.equal(restored.requests.filter(x => x.method === 'PUT').length, 2);
    assert.deepEqual(restored.records(), stored(true));
});

test('network and 503 write failures keep the entire remaining batch retryable', async () => {
    for (const fail of [() => response(503, {}), () => { throw new Error('private transport'); }]) {
        const b = browser({ request: r => r.method === 'GET' ? response(200, { items: [] }) : fail() });
        await b.run('hydrateRemoteAchievements()');
        assert.equal(b.requests.filter(x => x.method === 'PUT').length, 1);
        assert.deepEqual(b.records(), stored());
        assert.match(b.run('getSummarySyncText()'), /部分阅读记录/);
    }
});

test('HTTP 200 without a matching positive central receipt is not synchronization', async () => {
    for (const body of [{}, { ok: false }, { ok: true, item: null }, { ok: true, item: { siteKey: 'mf', itemKey: 'wrong' } }, { ok: true, item: { siteKey: 'gk', itemKey: 'poem-1' } }]) {
        const b = browser({ request: r => r.method === 'GET' ? response(200, { items: [] }) : response(200, body) });
        await b.run('hydrateRemoteAchievements()');
        assert.deepEqual(b.records(), stored());
    }
});

test('concurrent hydrations share one read and one write per pending item', async () => {
    const b = browser();
    await Promise.all([b.run('hydrateRemoteAchievements()'), b.run('hydrateRemoteAchievements()')]);
    assert.equal(b.requests.filter(x => x.method === 'GET').length, 1);
    assert.equal(b.requests.filter(x => x.method === 'PUT').length, 2);
});

test('first normal read is acknowledged once even when hydration flushes it', async () => {
    const b = browser({ saved: {} });
    await b.run('markPoemAsRead(poemsData[0])');
    assert.equal(b.requests.filter(x => x.method === 'PUT').length, 1);
    assert.equal(b.records()['poem-1'].synced, true);
    const before = b.records();
    await b.run('markPoemAsRead(poemsData[0])');
    assert.equal(b.requests.filter(x => x.method === 'PUT').length, 1);
    assert.deepEqual(b.records(), before);
});

test('clicking a previously pending item retries without creating a new record', async () => {
    let fail = true;
    const b = browser({ saved: { 'poem-1': stored()['poem-1'] }, request: r => r.method === 'GET' ? response(200, { items: [] }) : fail ? response(503, {}) : acknowledge(r.body) });
    await b.run('hydrateRemoteAchievements()');
    fail = false;
    await b.run('markPoemAsRead(poemsData[0])');
    assert.deepEqual(b.records(), { 'poem-1': stored(true)['poem-1'] });
    assert.equal(b.requests.filter(x => x.method === 'PUT').length, 2);
});

test('malformed remote snapshots cannot erase or acknowledge local pending records', async () => {
    const b = browser({ request: () => response(200, {}) });
    await b.run('hydrateRemoteAchievements()');
    assert.deepEqual(b.records(), stored());
    assert.equal(b.requests.length, 1);
});

test('remote acknowledged records are merged without re-submission', async () => {
    const b = browser({ request: r => r.method === 'GET' ? response(200, { items: poems.map(p => ({ itemKey: `poem-${p.order}`, itemTitle: p.title, itemGroup: p.category, updatedAt: '2026-09-01T00:00:00.000Z' })) }) : assert.fail('unexpected duplicate write') });
    await b.run('hydrateRemoteAchievements()');
    assert.deepEqual(b.records(), stored(true));
    assert.equal(b.requests.length, 1);
});


test('a failed first read remains pending without an immediate second write attempt', async () => {
    const b = browser({ saved: {}, request: r => r.method === 'GET' ? response(200, { items: [] }) : response(503, {}) });
    await b.run('markPoemAsRead(poemsData[0])');
    assert.equal(b.requests.filter(x => x.method === 'PUT').length, 1);
    assert.equal(b.records()['poem-1'].synced, false);
});
