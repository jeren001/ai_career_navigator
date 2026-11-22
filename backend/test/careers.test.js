import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

const careers = [
  { id: 1, name: 'Data Analyst', category: 'Tech & Data' },
  { id: 2, name: 'Product Designer', category: 'Design & Creative' },
];

let shouldFail = false;
let lastQuery;
let server;
let baseUrl;

const database = {
  async query(query, values) {
    lastQuery = { query, values };

    if (shouldFail) {
      throw new Error('Database connection details should not be returned');
    }

    if (query.includes('WHERE id =')) {
      return { rows: careers.filter((career) => career.id === values[0]) };
    }

    if (query.includes('WHERE category =')) {
      return { rows: careers.filter((career) => career.category === values[0]) };
    }

    return { rows: careers };
  },
};

before(async () => {
  server = createApp(database).listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('GET /api/careers returns all careers', async () => {
  const response = await fetch(`${baseUrl}/api/careers`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), careers);
  assert.equal(lastQuery.query, 'SELECT * FROM career_roles');
  assert.deepEqual(lastQuery.values, []);
});

test('GET /api/careers filters by category', async () => {
  const response = await fetch(`${baseUrl}/api/careers?category=Tech%20%26%20Data`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [careers[0]]);
  assert.equal(lastQuery.query, 'SELECT * FROM career_roles WHERE category = $1');
  assert.deepEqual(lastQuery.values, ['Tech & Data']);
});

test('GET /api/careers rejects an empty category', async () => {
  const response = await fetch(`${baseUrl}/api/careers?category=`);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Category must be a non-empty string' });
});

test('GET /api/careers/:id returns one career', async () => {
  const response = await fetch(`${baseUrl}/api/careers/1`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), careers[0]);
  assert.equal(lastQuery.query, 'SELECT * FROM career_roles WHERE id = $1');
  assert.deepEqual(lastQuery.values, [1]);
});

test('GET /api/careers/:id rejects an invalid ID', async () => {
  const response = await fetch(`${baseUrl}/api/careers/invalid`);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Career id must be a positive integer' });
});

test('GET /api/careers/:id returns 404 when the career is missing', async () => {
  const response = await fetch(`${baseUrl}/api/careers/3`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Career not found' });
});

test('database errors return a generic 500 response', async () => {
  shouldFail = true;

  try {
    const response = await fetch(`${baseUrl}/api/careers`);

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Internal server error' });
  } finally {
    shouldFail = false;
  }
});
