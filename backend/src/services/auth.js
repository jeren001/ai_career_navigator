import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 14;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_BYTES = 64;

function authError(message, status = 401) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function tokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw authError('Authentication is not configured', 503);
  }
  return secret;
}

export function assertAuthConfigured() {
  tokenSecret();
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signature(input) {
  return createHmac('sha256', tokenSecret()).update(input).digest('base64url');
}

export function createAccessToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = encode({
    sub: user.id,
    guest: user.is_guest,
    iat: now,
    exp: now + TOKEN_LIFETIME_SECONDS,
  });
  const input = `v1.${payload}`;
  return `${input}.${signature(input)}`;
}

export function verifyAccessToken(token) {
  if (typeof token !== 'string' || token.length > 2048) throw authError('Invalid bearer token');
  const [version, payload, suppliedSignature, extra] = token.split('.');
  if (version !== 'v1' || !payload || !suppliedSignature || extra) throw authError('Invalid bearer token');

  const input = `${version}.${payload}`;
  const expected = Buffer.from(signature(input));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw authError('Invalid bearer token');
  }

  let claims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw authError('Invalid bearer token');
  }

  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(claims.sub) || claims.sub < 1 || !Number.isInteger(claims.exp) || claims.exp <= now) {
    throw authError('Expired or invalid bearer token');
  }
  if (typeof claims.guest !== 'boolean') throw authError('Invalid bearer token');
  return { userId: claims.sub, isGuest: claims.guest };
}

export async function hashPassword(password) {
  const salt = randomBytes(PASSWORD_SALT_BYTES);
  const derived = await scrypt(password, salt, PASSWORD_KEY_BYTES, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  if (typeof encoded !== 'string') return false;
  const [algorithm, n, r, p, saltText, keyText, extra] = encoded.split('$');
  if (algorithm !== 'scrypt' || n !== '16384' || r !== '8' || p !== '1' || !saltText || !keyText || extra) return false;
  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(keyText, 'base64url');
    if (salt.length !== PASSWORD_SALT_BYTES || expected.length !== PASSWORD_KEY_BYTES) return false;
    const actual = await scrypt(password, salt, PASSWORD_KEY_BYTES, { N: 16384, r: 8, p: 1 });
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function optionalAuthentication(database) {
  return async (request, response, next) => {
    const header = request.get('authorization');
    if (!header) return next();
    const match = /^Bearer ([^\s]+)$/i.exec(header);
    if (!match) return next(authError('Authorization must use a bearer token'));

    try {
      const claims = verifyAccessToken(match[1]);
      const result = await database.query('SELECT id, is_guest FROM users WHERE id = $1', [claims.userId]);
      const user = result.rows[0];
      if (!user || user.is_guest !== claims.isGuest) throw authError('Invalid bearer token');
      request.auth = { userId: user.id, isGuest: user.is_guest };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export function requireAuthentication(request, response, next) {
  if (!request.auth || request.auth.isGuest) return next(authError('Authentication required', 401));
  return next();
}

export function requireAnyIdentity(request, response, next) {
  if (!request.auth) return next(authError('Authentication required', 401));
  return next();
}
