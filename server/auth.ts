import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(process.cwd() + '_expense_tracker_key').digest('hex');

export const SESSION_COOKIE_NAME = 'expense_session';

export interface AuthUser {
  User_ID: number;
  Name: string;
  Email: string;
  Currency: string;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

interface TokenPayload {
  uid: number;
  exp: number;
}

export function createSessionToken(userId: number): string {
  const payload: TokenPayload = {
    uid: userId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.uid || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }
  return null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = extractTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
  }

  const user = db
    .prepare('SELECT User_ID, Name, Email, Currency FROM USER WHERE User_ID = ?')
    .get(payload.uid) as AuthUser | undefined;

  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }

  req.user = user;
  next();
}
