// k6 Load Test Configuration
// Shared configuration and utilities for all test scenarios

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
export const API_URL = `${BASE_URL}/api`

// Test user credentials (created by load test seeder)
export const TEST_USERS = {
  admin: { email: 'loadtest-admin@example.com', password: 'loadtest123' },
  // Additional users will be loadtest-user-{n}@example.com
}

// Thresholds for pass/fail criteria
export const DEFAULT_THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
  http_req_failed: ['rate<0.01'], // Less than 1% failure rate
  http_reqs: ['rate>100'], // At least 100 requests per second
}

// Common headers
export function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export function getHeaders() {
  return {
    'Content-Type': 'application/json',
  }
}

// Load test stages for ramping
export const STAGES = {
  // Smoke test - minimal load to verify system works
  smoke: [
    { duration: '1m', target: 5 },
    { duration: '1m', target: 5 },
    { duration: '1m', target: 0 },
  ],

  // Load test - normal expected load
  load: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],

  // Stress test - beyond normal capacity
  stress: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '5m', target: 300 },
    { duration: '5m', target: 0 },
  ],

  // Spike test - sudden traffic bursts
  spike: [
    { duration: '1m', target: 10 },
    { duration: '30s', target: 500 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 10 },
    { duration: '2m', target: 10 },
    { duration: '30s', target: 500 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 0 },
  ],

  // Soak test - sustained load over time
  soak: [
    { duration: '5m', target: 100 },
    { duration: '4h', target: 100 },
    { duration: '5m', target: 0 },
  ],
}

// Get stages based on test type environment variable
export function getStages() {
  const testType = __ENV.TEST_TYPE || 'smoke'
  return STAGES[testType] || STAGES.smoke
}
