import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from './db';

export type Role = 'STUDENT' | 'INSTRUCTOR';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isAdmin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface TokenPayload {
  sub: string;
}

function secret() {
  return process.env.JWT_SECRET || 'minilearn-dev-secret-change-me';
}

export function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  isAdmin: boolean;
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isAdmin: user.isAdmin,
  };
}

export function signToken(user: AuthUser) {
  return jwt.sign({ sub: user.id }, secret(), { expiresIn: '7d' });
}

async function userFromToken(req: Request) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;

  try {
    const payload = jwt.verify(token, secret()) as TokenPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    return user ? publicUser(user) : null;
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await userFromToken(req);
  if (!user) {
    res.status(401).json({ error: 'You need to sign in to do that.' });
    return;
  }
  req.user = user;
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await userFromToken(req);
  if (user) req.user = user;
  next();
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'You need to sign in to do that.' });
      return;
    }
    if (req.user.role !== role && !req.user.isAdmin) {
      res.status(403).json({ error: `Only ${role.toLowerCase()}s can do that.` });
      return;
    }
    next();
  };
}
