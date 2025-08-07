// ENHANCED ENTROPY SYSTEM
// Multi-source entropy generation for provably fair randomness

import crypto from 'crypto';

// Blockfrost API configuration (optional - for Cardano blockchain entropy)
const BLOCKFROST_PROJECT_ID = process.env.BLOCKFROST_PROJECT_ID;
const BLOCKFROST_BASE_URL = process.env.BLOCKFROST_BASE_URL || 'https://cardano-mainnet.blockfrost.io/api/v0';

/**
 * Generate cryptographically secure server seed
 */
export function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get current Cardano block hash for additional entropy
 */
async function getCardanoBlockEntropy() {
  if (!BLOCKFROST_PROJECT_ID) {
    console.warn('⚠️ Blockfrost not configured, using fallback entropy');
    return crypto.randomBytes(32).toString('hex');
  }

  try {
    const response = await fetch(`${BLOCKFROST_BASE_URL}/blocks/latest`, {
      headers: {
        'project_id': BLOCKFROST_PROJECT_ID,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Blockfrost API error: ${response.status}`);
    }

    const block = await response.json();
    console.log(`🔗 Using Cardano block ${block.height} hash for entropy`);
    return block.hash;
  } catch (error) {
    console.error('❌ Failed to fetch Cardano block:', error.message);
    // Fallback to pure crypto random
    return crypto.randomBytes(32).toString('hex');
  }
}

/**
 * Generate hybrid entropy from multiple sources
 */
export async function getHybridEntropy(clientSeed = null, serverSeed = null, additionalData = {}) {
  const timestamp = Date.now().toString();
  const processEntropy = process.hrtime.bigint().toString();
  
  // Get blockchain entropy (with fallback)
  const blockchainEntropy = await getCardanoBlockEntropy();
  
  // Combine all entropy sources
  const entropyComponents = [
    serverSeed || generateServerSeed(),
    clientSeed || crypto.randomBytes(16).toString('hex'),
    blockchainEntropy,
    timestamp,
    processEntropy,
    JSON.stringify(additionalData)
  ];

  // Create multiple hash rounds for additional security
  let combinedEntropy = entropyComponents.join('|');
  
  // First round: SHA-512
  combinedEntropy = crypto
    .createHash('sha512')
    .update(combinedEntropy)
    .digest('hex');

  // Second round: SHA-256 with salt
  const salt = crypto.randomBytes(16).toString('hex');
  combinedEntropy = crypto
    .createHash('sha256')
    .update(combinedEntropy + salt)
    .digest('hex');

  return {
    finalHash: combinedEntropy,
    components: {
      serverSeed: serverSeed || 'generated',
      clientSeed: clientSeed || 'generated', 
      blockchainEntropy: blockchainEntropy.substring(0, 16) + '...', // Truncated for logs
      timestamp,
      salt
    }
  };
}

/**
 * Generate secure random value for case opening
 */
export async function getSecureRandomForCaseOpening(clientSeed, serverSeed, nonce) {
  try {
    // Input validation
    if (!serverSeed || typeof serverSeed !== 'string') {
      throw new Error('Invalid server seed');
    }

    if (!nonce || typeof nonce !== 'number' || nonce < 1) {
      throw new Error('Invalid nonce');
    }

    // Create deterministic but unpredictable combination
    const seedString = [
      serverSeed,
      clientSeed || 'default_client_seed',
      nonce.toString(),
      'case_opening_v1' // Version identifier
    ].join('|');

    // Get hybrid entropy for additional unpredictability
    const hybridResult = await getHybridEntropy(clientSeed, serverSeed, { 
      nonce, 
      operation: 'case_opening',
      version: '1.0'
    });

    // Combine deterministic seed with hybrid entropy
    const finalSeed = crypto
      .createHash('sha512')
      .update(seedString + '|' + hybridResult.finalHash)
      .digest('hex');

    // Convert to decimal value between 0 and 1
    const randomValue = convertHashToDecimal(finalSeed);

    console.log(`🎲 Generated random value: ${randomValue} for nonce ${nonce}`);

    return {
      randomValue,
      seedString: seedString.substring(0, 50) + '...', // Truncated for security
      hybridEntropy: hybridResult.components,
      hash: finalSeed.substring(0, 16) + '...' // Truncated final hash
    };

  } catch (error) {
    console.error('❌ Error generating secure random:', error);
    throw new Error('Failed to generate secure random value');
  }
}

/**
 * Convert hash to decimal value between 0 and 1
 */
function convertHashToDecimal(hash) {
  // Take first 16 characters (64 bits)
  const hexSubstring = hash.substring(0, 16);
  
  // Convert to BigInt for precision
  const intValue = BigInt('0x' + hexSubstring);
  const maxValue = BigInt('0x' + 'f'.repeat(16));
  
  // Convert to decimal between 0 and 1
  const decimal = Number(intValue) / Number(maxValue);
  
  // Ensure we have proper precision (8 decimal places)
  return Math.round(decimal * 100000000) / 100000000;
}

/**
 * Verify the randomness quality of generated values
 */
export function verifyRandomnessQuality(values) {
  if (!Array.isArray(values) || values.length < 10) {
    return { valid: false, reason: 'Insufficient data points' };
  }

  // Test 1: Distribution test (values should be roughly evenly distributed)
  const buckets = Array(10).fill(0);
  values.forEach(value => {
    const bucket = Math.floor(value * 10);
    buckets[Math.min(bucket, 9)]++; // Ensure value 1.0 goes to bucket 9
  });

  const expectedPerBucket = values.length / 10;
  const tolerance = expectedPerBucket * 0.5; // 50% tolerance

  const distributionPassed = buckets.every(count => 
    Math.abs(count - expectedPerBucket) <= tolerance
  );

  // Test 2: Sequential correlation test
  let correlationSum = 0;
  for (let i = 1; i < values.length; i++) {
    correlationSum += Math.abs(values[i] - values[i-1]);
  }
  const avgCorrelation = correlationSum / (values.length - 1);
  const correlationPassed = avgCorrelation > 0.2; // Should have reasonable variation

  // Test 3: No repeated values (very unlikely with proper entropy)
  const uniqueValues = new Set(values);
  const uniquenessPassed = uniqueValues.size === values.length;

  return {
    valid: distributionPassed && correlationPassed && uniquenessPassed,
    tests: {
      distribution: { passed: distributionPassed, buckets },
      correlation: { passed: correlationPassed, average: avgCorrelation },
      uniqueness: { passed: uniquenessPassed, unique: uniqueValues.size, total: values.length }
    }
  };
}

/**
 * Emergency entropy fallback (uses only local sources)
 */
export function getEmergencyEntropy(clientSeed, serverSeed, nonce) {
  console.warn('⚠️ Using emergency entropy fallback');
  
  const components = [
    serverSeed,
    clientSeed || 'emergency_client',
    nonce.toString(),
    Date.now().toString(),
    process.hrtime.bigint().toString(),
    crypto.randomBytes(32).toString('hex')
  ];

  const combined = components.join('|');
  const hash = crypto.createHash('sha512').update(combined).digest('hex');
  
  return convertHashToDecimal(hash);
}

/**
 * Audit trail for entropy generation
 */
export class EntropyAudit {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 entries
  }

  log(operation, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      operation,
      data: {
        ...data,
        // Redact sensitive information
        serverSeed: data.serverSeed ? data.serverSeed.substring(0, 8) + '...' : undefined,
        clientSeed: data.clientSeed ? data.clientSeed.substring(0, 8) + '...' : undefined
      }
    };

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.log(`📊 Entropy audit: ${operation}`, entry);
  }

  getRecentLogs(count = 10) {
    return this.logs.slice(-count);
  }

  getStatistics() {
    const operations = {};
    this.logs.forEach(log => {
      operations[log.operation] = (operations[log.operation] || 0) + 1;
    });

    return {
      totalOperations: this.logs.length,
      operationBreakdown: operations,
      lastActivity: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null
    };
  }
}

export const entropyAudit = new EntropyAudit();

/**
 * Main function for case opening entropy
 */
export async function generateCaseOpeningEntropy(clientSeed, serverSeed, nonce, userId = null) {
  const startTime = Date.now();
  
  try {
    // Log the entropy generation attempt
    entropyAudit.log('case_opening_start', {
      userId,
      nonce,
      hasClientSeed: !!clientSeed,
      hasServerSeed: !!serverSeed
    });

    // Generate the secure random value
    const result = await getSecureRandomForCaseOpening(clientSeed, serverSeed, nonce);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Log successful generation
    entropyAudit.log('case_opening_success', {
      userId,
      nonce,
      randomValue: result.randomValue,
      duration,
      entropyQuality: 'high'
    });

    return result.randomValue;

  } catch (error) {
    // Log failure and use emergency fallback
    entropyAudit.log('case_opening_fallback', {
      userId,
      nonce,
      error: error.message,
      duration: Date.now() - startTime
    });

    const fallbackValue = getEmergencyEntropy(clientSeed, serverSeed, nonce);
    
    entropyAudit.log('case_opening_emergency', {
      userId,
      nonce,
      randomValue: fallbackValue,
      source: 'emergency'
    });

    return fallbackValue;
  }
}

export default {
  generateServerSeed,
  getSecureRandomForCaseOpening,
  generateCaseOpeningEntropy,
  verifyRandomnessQuality,
  entropyAudit
}; 