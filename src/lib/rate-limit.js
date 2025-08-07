// RATE LIMITING SYSTEM
// Protects against abuse and bot attacks

class RateLimiter {
  constructor(windowMs = 60000, max = 10, keyGenerator = null) {
    this.windowMs = windowMs; // Time window in milliseconds
    this.max = max; // Max requests per window
    this.requests = new Map(); // Store request counts
    this.keyGenerator = keyGenerator || this.defaultKeyGenerator;
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  defaultKeyGenerator(request) {
    // Use IP address as key
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 
               request.headers.get('x-real-ip') || 
               'unknown';
    return ip;
  }

  async check(request) {
    const key = this.keyGenerator(request);
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this key
    let userRequests = this.requests.get(key) || [];
    
    // Filter out requests outside current window
    userRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (userRequests.length >= this.max) {
      const resetTime = userRequests[0] + this.windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      
      throw new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
    }

    // Add current request
    userRequests.push(now);
    this.requests.set(key, userRequests);

    return {
      allowed: true,
      remaining: this.max - userRequests.length,
      resetTime: now + this.windowMs
    };
  }

  cleanup() {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > cutoff);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  reset(key = null) {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

// Rate limiters for different endpoints
export const caseOpeningLimiter = new RateLimiter(
  3000, // 3 second window
  3,    // Max 3 case openings per 3 seconds (allows short bursts, ~1/sec average)
  (request) => {
    // Use wallet address + IP for more specific limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    return `case_opening_${ip}`;
  }
);

export const creditPurchaseLimiter = new RateLimiter(
  300000, // 5 minute window
  5,      // Max 5 credit purchases per 5 minutes
  (request) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    return `credit_purchase_${ip}`;
  }
);

export const userCreationLimiter = new RateLimiter(
  3600000, // 1 hour window
  3,       // Max 3 user creations per hour
  (request) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    return `user_creation_${ip}`;
  }
);

// Advanced rate limiting with user-specific rules
export class UserRateLimiter {
  constructor() {
    this.userRequests = new Map();
    this.suspiciousActivity = new Map();
  }

  async checkUser(userId, action = 'general') {
    const now = Date.now();
    const userKey = `${userId}_${action}`;
    
    if (!this.userRequests.has(userKey)) {
      this.userRequests.set(userKey, []);
    }

    const requests = this.userRequests.get(userKey);
    const windowStart = now - 60000; // 1 minute window
    
    // Clean old requests
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    this.userRequests.set(userKey, recentRequests);

    // Define limits per action
    const limits = {
      case_opening: 15,  // Max 15 case openings per minute
      credit_purchase: 3, // Max 3 credit purchases per minute
      withdrawal: 2,      // Max 2 withdrawals per minute
      general: 30         // General API calls
    };

    const limit = limits[action] || limits.general;

    if (recentRequests.length >= limit) {
      // Log suspicious activity
      this.logSuspiciousActivity(userId, action, recentRequests.length);
      throw new Error(`Action rate limit exceeded for ${action}`);
    }

    // Add current request
    recentRequests.push(now);
    
    return {
      allowed: true,
      remaining: limit - recentRequests.length,
      action
    };
  }

  logSuspiciousActivity(userId, action, requestCount) {
    const key = `${userId}_${action}`;
    const count = this.suspiciousActivity.get(key) || 0;
    this.suspiciousActivity.set(key, count + 1);

    // Log to console (in production, send to monitoring service)
    console.warn(`⚠️ Suspicious activity detected:`, {
      userId,
      action,
      requestCount,
      totalViolations: count + 1,
      timestamp: new Date().toISOString()
    });

    // Auto-suspend after 5 violations
    if (count >= 4) {
      console.error(`🚨 User ${userId} auto-suspended for rate limit violations`);
      // In production: mark user as suspended in database
    }
  }

  reset(userId = null, action = null) {
    if (userId && action) {
      this.userRequests.delete(`${userId}_${action}`);
      this.suspiciousActivity.delete(`${userId}_${action}`);
    } else if (userId) {
      // Clear all actions for user
      for (const key of this.userRequests.keys()) {
        if (key.startsWith(userId)) {
          this.userRequests.delete(key);
          this.suspiciousActivity.delete(key);
        }
      }
    } else {
      this.userRequests.clear();
      this.suspiciousActivity.clear();
    }
  }
}

export const userRateLimiter = new UserRateLimiter();

// Middleware wrapper for easier use in API routes
export function withRateLimit(limiter, handler) {
  return async (request, ...args) => {
    try {
      await limiter.check(request);
      return handler(request, ...args);
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: error.message,
          type: 'RATE_LIMIT_EXCEEDED'
        }), 
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        }
      );
    }
  };
}

// Suspicious pattern detection
export class PatternDetector {
  constructor() {
    this.patterns = new Map();
  }

  checkPattern(userId, action, metadata = {}) {
    const key = `${userId}_${action}`;
    const now = Date.now();
    
    if (!this.patterns.has(key)) {
      this.patterns.set(key, []);
    }

    const events = this.patterns.get(key);
    events.push({ timestamp: now, metadata });

    // Keep only last 100 events
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }

    // Check for suspicious patterns
    const suspicious = this.detectSuspiciousPatterns(events, action);
    
    if (suspicious.length > 0) {
      console.warn(`🔍 Suspicious patterns detected for user ${userId}:`, suspicious);
      return { suspicious: true, patterns: suspicious };
    }

    return { suspicious: false, patterns: [] };
  }

  detectSuspiciousPatterns(events, action) {
    const suspicious = [];
    const now = Date.now();

    // Pattern 1: Too many identical actions in short time
    const recent = events.filter(e => now - e.timestamp < 30000); // Last 30 seconds
    if (recent.length > 20) {
      suspicious.push({
        type: 'HIGH_FREQUENCY',
        description: `${recent.length} ${action} actions in 30 seconds`,
        severity: 'HIGH'
      });
    }

    // Pattern 2: Exact timing patterns (bot-like behavior)
    if (events.length >= 5) {
      const intervals = [];
      for (let i = 1; i < events.length; i++) {
        intervals.push(events[i].timestamp - events[i-1].timestamp);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => 
        sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      
      // Very low variance suggests automated behavior
      if (variance < 100 && avgInterval < 5000) {
        suspicious.push({
          type: 'ROBOTIC_TIMING',
          description: `Suspiciously consistent timing (variance: ${variance.toFixed(2)})`,
          severity: 'MEDIUM'
        });
      }
    }

    // Pattern 3: Always profitable case openings (impossible odds)
    if (action === 'case_opening' && events.length >= 10) {
      const profits = events
        .filter(e => e.metadata && typeof e.metadata.profit === 'boolean')
        .map(e => e.metadata.profit);
      
      if (profits.length >= 10) {
        const profitRate = profits.filter(p => p).length / profits.length;
        if (profitRate > 0.8) { // More than 80% profitable (statistically impossible)
          suspicious.push({
            type: 'IMPOSSIBLE_LUCK',
            description: `${(profitRate * 100).toFixed(1)}% profit rate over ${profits.length} cases`,
            severity: 'CRITICAL'
          });
        }
      }
    }

    return suspicious;
  }
}

export const patternDetector = new PatternDetector();

export default {
  caseOpeningLimiter,
  creditPurchaseLimiter,
  userCreationLimiter,
  userRateLimiter,
  patternDetector,
  withRateLimit
}; 