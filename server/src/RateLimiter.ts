/**
 * RateLimiter - Security utilities for rate limiting and connection management.
 *
 * Provides per-IP connection limiting and per-socket event rate limiting
 * to protect against DoS attacks and resource exhaustion.
 */
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { Request, Response, NextFunction } from 'express';
import {
    RATE_LIMITS,
    MAX_CONNECTIONS_PER_IP,
    MAX_GAME_STATE_SIZE,
} from '../../shared/constants.js';

// ==================== Rate Limiters ====================

/** Rate limiter for JOIN_ROOM events (per socket) */
const joinRoomLimiter = new RateLimiterMemory({
    points: RATE_LIMITS.JOIN_ROOM.points,
    duration: RATE_LIMITS.JOIN_ROOM.duration,
});

/** Rate limiter for GAME_STATE events (per socket) */
const gameStateLimiter = new RateLimiterMemory({
    points: RATE_LIMITS.GAME_STATE.points,
    duration: RATE_LIMITS.GAME_STATE.duration,
});

/** Rate limiter for SEND_STATE events (per socket) */
const sendStateLimiter = new RateLimiterMemory({
    points: RATE_LIMITS.SEND_STATE.points,
    duration: RATE_LIMITS.SEND_STATE.duration,
});

/** Rate limiter for REQUEST_STATE events (per socket) */
const requestStateLimiter = new RateLimiterMemory({
    points: RATE_LIMITS.REQUEST_STATE.points,
    duration: RATE_LIMITS.REQUEST_STATE.duration,
});

/** Rate limiter for /health endpoint (per IP) */
const healthLimiter = new RateLimiterMemory({
    points: RATE_LIMITS.HEALTH.points,
    duration: RATE_LIMITS.HEALTH.duration,
});

// ==================== Connection Tracking ====================

/** Maps IP addresses to their active connection count */
const connectionCounts = new Map<string, number>();

/**
 * Increments the connection count for an IP address.
 *
 * @param ip - The client IP address
 * @returns true if connection is allowed, false if limit exceeded
 */
export function trackConnection(ip: string): boolean {
    const current = connectionCounts.get(ip) || 0;
    if (current >= MAX_CONNECTIONS_PER_IP) {
        return false;
    }
    connectionCounts.set(ip, current + 1);
    return true;
}

/**
 * Decrements the connection count for an IP address.
 * Call this when a socket disconnects.
 *
 * @param ip - The client IP address
 */
export function releaseConnection(ip: string): void {
    const current = connectionCounts.get(ip) || 0;
    if (current <= 1) {
        connectionCounts.delete(ip);
    } else {
        connectionCounts.set(ip, current - 1);
    }
}

// ==================== Rate Limit Checks ====================

/**
 * Checks if a JOIN_ROOM request is within rate limits.
 *
 * @param socketId - The socket ID to rate limit
 * @returns true if allowed, false if rate limited
 */
export async function checkJoinRoomLimit(socketId: string): Promise<boolean> {
    try {
        await joinRoomLimiter.consume(socketId);
        return true;
    } catch {
        return false;
    }
}

/**
 * Checks if a GAME_STATE request is within rate limits.
 *
 * @param socketId - The socket ID to rate limit
 * @returns true if allowed, false if rate limited
 */
export async function checkGameStateLimit(socketId: string): Promise<boolean> {
    try {
        await gameStateLimiter.consume(socketId);
        return true;
    } catch {
        return false;
    }
}

/**
 * Checks if a SEND_STATE request is within rate limits.
 *
 * @param socketId - The socket ID to rate limit
 * @returns true if allowed, false if rate limited
 */
export async function checkSendStateLimit(socketId: string): Promise<boolean> {
    try {
        await sendStateLimiter.consume(socketId);
        return true;
    } catch {
        return false;
    }
}

/**
 * Checks if a REQUEST_STATE request is within rate limits.
 *
 * @param socketId - The socket ID to rate limit
 * @returns true if allowed, false if rate limited
 */
export async function checkRequestStateLimit(socketId: string): Promise<boolean> {
    try {
        await requestStateLimiter.consume(socketId);
        return true;
    } catch {
        return false;
    }
}

// ==================== Payload Validation ====================

/**
 * Validates that a game state payload is within size limits.
 *
 * @param state - The game state payload to validate
 * @returns true if valid, false if too large
 */
export function validateGameStateSize(state: unknown): boolean {
    try {
        const serialized = JSON.stringify(state);
        return serialized.length <= MAX_GAME_STATE_SIZE;
    } catch {
        // If we can't serialize, reject it
        return false;
    }
}

// ==================== Express Middleware ====================

/**
 * Express middleware for rate limiting the /health endpoint.
 * Returns 429 Too Many Requests if limit exceeded.
 */
export async function healthRateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    try {
        await healthLimiter.consume(ip);
        next();
    } catch {
        res.status(429).send('Too Many Requests');
    }
}
