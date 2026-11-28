import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

const careerFields = [
  'Technology & AI',
  'Art & Design',
  'Business & Finance',
  'Medicine & Healthcare',
  'Psychology & Mental Health',
  'Education & Research',
  'Engineering & Architecture',
  'Media & Communication',
  'Environment & Social Impact',
  'Law & Legal',
];
const careers = careerFields.flatMap((careerField, fieldIndex) =>
  Array.from({ length: 8 }, (_, roleIndex) => ({
    id: fieldIndex * 8 + roleIndex + 1,
    slug: `role-${fieldIndex + 1}-${roleIndex + 1}`,
    title: fieldIndex === 0 && roleIndex === 0
      ? 'Data Analyst'
      : fieldIndex === 1 && roleIndex === 0
        ? 'Product Designer'
        : `${careerField} Career ${roleIndex + 1}`,
    cluster: fieldIndex === 0 ? 'Tech & Data' : careerField,
    summary: `Description for ${careerField} career ${roleIndex + 1}.`,
    is_active: true,
    niche_pivot_friendly: roleIndex % 2 === 0,
    market_pulse: { career_field: careerField },
  })),
);
careers.push({
  id: 81,
  slug: 'inactive-analyst',
  title: 'Inactive Analyst',
  cluster: 'Tech & Data',
  summary: 'Inactive role.',
  is_active: false,
  niche_pivot_friendly: false,
  market_pulse: { career_field: careerFields[0] },
});

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

    let rows = careers.filter((career) => career.is_active);
    if (query.includes('id =')) rows = rows.filter((career) => career.id === values[0]);
    if (query.includes("market_pulse->>'career_field'")) rows = rows.filter((career) => career.market_pulse.career_field === values[0]);
    if (query.includes('cluster =')) rows = rows.filter((career) => career.cluster === values[values.length - (query.includes('niche_pivot_friendly =') ? 2 : 1)]);
    if (query.includes('niche_pivot_friendly =')) rows = rows.filter((career) => career.niche_pivot_friendly === values.at(-1));
    return { rows };
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
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result, careers.slice(0, 80));
  assert.equal(lastQuery.query, 'SELECT * FROM career_roles WHERE is_active = TRUE ORDER BY id');
  assert.deepEqual(lastQuery.values, []);
  assert.equal(result.length, 80);
});

test('GET /api/careers filters by career field', async () => {
  const response = await fetch(`${baseUrl}/api/careers?category=Technology%20%26%20AI`);

  assert.equal(response.status, 200);
  assert.equal((await response.json()).length, 8);
  assert.equal(lastQuery.query, "SELECT * FROM career_roles WHERE is_active = TRUE AND market_pulse->>'career_field' = $1 ORDER BY id");
  assert.deepEqual(lastQuery.values, ['Technology & AI']);
});

test('GET /api/careers filters by cluster and niche-pivot flag', async () => {
  const response = await fetch(`${baseUrl}/api/careers?cluster=Tech%20%26%20Data&niche_pivot_friendly=false`);

  assert.equal(response.status, 200);
  assert.equal((await response.json()).length, 4);
  assert.equal(lastQuery.query, 'SELECT * FROM career_roles WHERE is_active = TRUE AND cluster = $1 AND niche_pivot_friendly = $2 ORDER BY id');
  assert.deepEqual(lastQuery.values, ['Tech & Data', false]);
});

test('GET /api/careers rejects an invalid niche-pivot flag', async () => {
  const response = await fetch(`${baseUrl}/api/careers?niche_pivot_friendly=yes`);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'niche_pivot_friendly must be true or false' });
});

test('GET /api/careers rejects an empty category', async () => {
  for (const category of ['', 'Tech%00Data']) {
    const response = await fetch(`${baseUrl}/api/careers?category=${category}`);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'category must be a non-empty string' });
  }
});

test('GET /api/careers rejects conflicting category and cluster filters', async () => {
  const response = await fetch(`${baseUrl}/api/careers?category=Technology%20%26%20AI&cluster=Tech%20%26%20Data`);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Use either category or cluster, not both' });
});

test('GET /api/careers/:id returns one career', async () => {
  const response = await fetch(`${baseUrl}/api/careers/1`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), careers[0]);
  assert.equal(lastQuery.query, 'SELECT * FROM career_roles WHERE is_active = TRUE AND id = $1');
  assert.deepEqual(lastQuery.values, [1]);
});

test('GET /api/careers/:id rejects an invalid ID', async () => {
  for (const id of ['invalid', '2147483648']) {
    const response = await fetch(`${baseUrl}/api/careers/${id}`);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Career id must be a positive integer' });
  }
});

test('GET /api/careers/:id returns 404 when the career is missing', async () => {
  const response = await fetch(`${baseUrl}/api/careers/999`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Career not found' });
});

test('GET /api/careers/:id hides inactive careers', async () => {
  const response = await fetch(`${baseUrl}/api/careers/81`);

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
