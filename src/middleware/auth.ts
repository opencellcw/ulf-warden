import { Request, Response, NextFunction } from 'express';
import { supabase } from '../database/supabase';
import { log } from '../logger';

/**
 * Authentication middleware using Supabase
 * 
 * Verifies JWT token and attaches user to request
 */

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

/**
 * Require authentication
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token with Supabase
    const user = await supabase.verifyUser(token);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error: any) {
    log.error('[Auth] Authentication failed', { error: error.message });
    
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication
 * Attaches user if token is valid, but doesn't reject if missing
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await supabase.verifyUser(token);
      
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
        };
      }
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
}

/**
 * Require admin role
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  try {
    // Check if user has admin role
    const client = supabase.getClient();
    if (!client) throw new Error('Supabase not initialized');

    const { data: roles } = await client
      .from('user_roles')
      .select('role')
      .eq('user_id', req.user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required',
      });
      return;
    }

    req.user.role = 'admin';
    next();
  } catch (error: any) {
    log.error('[Auth] Admin check failed', { error: error.message });
    
    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required',
    });
  }
}

/**
 * Rate limiting by user ID (uses Supabase user ID)
 */
export function createUserRateLimiter(
  maxRequests: number,
  windowMs: number
): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();

    let userRequests = requests.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      userRequests = {
        count: 0,
        resetTime: now + windowMs,
      };
      requests.set(userId, userRequests);
    }

    userRequests.count++;

    if (userRequests.count > maxRequests) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000}s`,
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}
