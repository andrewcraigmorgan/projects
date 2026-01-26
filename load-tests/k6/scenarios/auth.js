import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { API_URL, getHeaders, getAuthHeaders, TEST_USERS, DEFAULT_THRESHOLDS, getStages } from '../config.js'

// Custom metrics
const loginSuccess = new Rate('login_success')
const loginDuration = new Trend('login_duration')
const meEndpointDuration = new Trend('me_endpoint_duration')

export const options = {
  stages: getStages(),
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    login_success: ['rate>0.99'],
    login_duration: ['p(95)<300'],
    me_endpoint_duration: ['p(95)<200'],
  },
}

// Shared state for tokens
const tokens = {}

export function setup() {
  // Login as admin to get a token for setup operations
  const res = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify(TEST_USERS.admin),
    { headers: getHeaders() }
  )

  if (res.status === 200) {
    const body = JSON.parse(res.body)
    return { adminToken: body.data.token }
  }

  console.error('Setup failed: Could not login as admin')
  return { adminToken: null }
}

export default function (data) {
  const userNum = (__VU % 100) + 1 // Use VU number to pick different users
  const userEmail = `loadtest-user-${userNum}@example.com`
  const userPassword = 'loadtest123'

  // Scenario 1: Login
  const loginStart = Date.now()
  const loginRes = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({ email: userEmail, password: userPassword }),
    { headers: getHeaders() }
  )
  loginDuration.add(Date.now() - loginStart)

  const loginOk = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.data?.token !== undefined
      } catch {
        return false
      }
    },
  })
  loginSuccess.add(loginOk ? 1 : 0)

  if (!loginOk) {
    console.error(`Login failed for ${userEmail}: ${loginRes.status} ${loginRes.body}`)
    sleep(1)
    return
  }

  const token = JSON.parse(loginRes.body).data.token
  sleep(0.5)

  // Scenario 2: Get current user (/me)
  const meStart = Date.now()
  const meRes = http.get(`${API_URL}/auth/me`, {
    headers: getAuthHeaders(token),
  })
  meEndpointDuration.add(Date.now() - meStart)

  check(meRes, {
    'me status is 200': (r) => r.status === 200,
    'me returns user data': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.data?.user?.email === userEmail
      } catch {
        return false
      }
    },
  })

  sleep(1)
}

export function teardown(data) {
  console.log('Auth load test completed')
}
