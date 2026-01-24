import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'
import { API_URL, getHeaders, getAuthHeaders, DEFAULT_THRESHOLDS, getStages } from '../config.js'

// Custom metrics
const operationDuration = new Trend('operation_duration')
const operationSuccess = new Rate('operation_success')
const commentCreated = new Counter('comments_created')

export const options = {
  stages: getStages(),
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    operation_success: ['rate>0.95'],
    operation_duration: ['p(95)<800'],
  },
  // Scenarios for different user behaviors
  scenarios: {
    // Heavy readers - users who mostly browse
    readers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: getStages(),
      exec: 'readerBehavior',
    },
    // Active users - create and update tasks
    activeUsers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: getStages().map((s) => ({ ...s, target: Math.floor(s.target * 0.3) })),
      exec: 'activeUserBehavior',
    },
    // Commenters - focus on task details and comments
    commenters: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: getStages().map((s) => ({ ...s, target: Math.floor(s.target * 0.2) })),
      exec: 'commenterBehavior',
    },
  },
}

function authenticate(userNum) {
  const email = `loadtest-user-${userNum}@example.com`
  const res = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({ email, password: 'loadtest123' }),
    { headers: getHeaders() }
  )

  if (res.status !== 200) return null
  return JSON.parse(res.body).token
}

function getRandomProject(token) {
  const res = http.get(`${API_URL}/projects?limit=10`, {
    headers: getAuthHeaders(token),
  })

  if (res.status !== 200) return null
  const projects = JSON.parse(res.body).projects || []
  return projects.length > 0 ? projects[Math.floor(Math.random() * projects.length)] : null
}

function getRandomTask(token, projectId) {
  const res = http.get(`${API_URL}/tasks?projectId=${projectId}&limit=50`, {
    headers: getAuthHeaders(token),
  })

  if (res.status !== 200) return null
  const tasks = JSON.parse(res.body).tasks || []
  return tasks.length > 0 ? tasks[Math.floor(Math.random() * tasks.length)] : null
}

// Reader behavior: mostly GET requests
export function readerBehavior() {
  const userNum = (__VU % 100) + 1
  const token = authenticate(userNum)
  if (!token) {
    sleep(1)
    return
  }

  const headers = getAuthHeaders(token)

  group('Reader - Browse Projects', function () {
    const start = Date.now()
    const res = http.get(`${API_URL}/projects`, { headers })
    operationDuration.add(Date.now() - start)
    operationSuccess.add(check(res, { 'projects 200': (r) => r.status === 200 }) ? 1 : 0)
  })

  sleep(0.5)

  const project = getRandomProject(token)
  if (!project) {
    sleep(1)
    return
  }

  group('Reader - List Tasks', function () {
    // List tasks multiple times with different filters
    for (let i = 0; i < 3; i++) {
      const filters = [
        '',
        '&status=todo',
        '&status=open&priority=high',
        '&rootOnly=true',
      ]
      const filter = filters[Math.floor(Math.random() * filters.length)]

      const start = Date.now()
      const res = http.get(`${API_URL}/tasks?projectId=${project._id}${filter}&limit=50`, { headers })
      operationDuration.add(Date.now() - start)
      operationSuccess.add(check(res, { 'tasks 200': (r) => r.status === 200 }) ? 1 : 0)

      sleep(0.3)
    }
  })

  group('Reader - View Task Details', function () {
    const task = getRandomTask(token, project._id)
    if (task) {
      const start = Date.now()
      const res = http.get(`${API_URL}/tasks/${task._id}`, { headers })
      operationDuration.add(Date.now() - start)
      operationSuccess.add(check(res, { 'task detail 200': (r) => r.status === 200 }) ? 1 : 0)
    }
  })

  sleep(2)
}

// Active user behavior: create and update tasks
export function activeUserBehavior() {
  const userNum = (__VU % 100) + 1
  const token = authenticate(userNum)
  if (!token) {
    sleep(1)
    return
  }

  const headers = getAuthHeaders(token)
  const project = getRandomProject(token)

  if (!project) {
    sleep(1)
    return
  }

  group('Active - Create Task', function () {
    const taskData = {
      projectId: project._id,
      title: `Active User Task ${Date.now()}-${__VU}`,
      description: 'Task created by active user during load test',
      status: 'todo',
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    }

    const start = Date.now()
    const res = http.post(`${API_URL}/tasks`, JSON.stringify(taskData), { headers })
    operationDuration.add(Date.now() - start)
    operationSuccess.add(check(res, { 'create 201': (r) => r.status === 201 }) ? 1 : 0)

    if (res.status === 201) {
      const task = JSON.parse(res.body)
      sleep(0.5)

      // Update the task
      group('Active - Update Task', function () {
        const updateData = {
          status: 'open',
          priority: 'high',
        }

        const start = Date.now()
        const res = http.patch(`${API_URL}/tasks/${task._id}`, JSON.stringify(updateData), { headers })
        operationDuration.add(Date.now() - start)
        operationSuccess.add(check(res, { 'update 200': (r) => r.status === 200 }) ? 1 : 0)
      })
    }
  })

  sleep(3)
}

// Commenter behavior: view tasks and add comments
export function commenterBehavior() {
  const userNum = (__VU % 100) + 1
  const token = authenticate(userNum)
  if (!token) {
    sleep(1)
    return
  }

  const headers = getAuthHeaders(token)
  const project = getRandomProject(token)

  if (!project) {
    sleep(1)
    return
  }

  const task = getRandomTask(token, project._id)
  if (!task) {
    sleep(1)
    return
  }

  group('Commenter - View Task', function () {
    const start = Date.now()
    const res = http.get(`${API_URL}/tasks/${task._id}`, { headers })
    operationDuration.add(Date.now() - start)
    operationSuccess.add(check(res, { 'task 200': (r) => r.status === 200 }) ? 1 : 0)
  })

  sleep(0.5)

  group('Commenter - List Comments', function () {
    const start = Date.now()
    const res = http.get(`${API_URL}/tasks/${task._id}/comments`, { headers })
    operationDuration.add(Date.now() - start)
    operationSuccess.add(check(res, { 'comments 200': (r) => r.status === 200 }) ? 1 : 0)
  })

  sleep(0.5)

  group('Commenter - Add Comment', function () {
    const commentData = {
      content: `Load test comment at ${new Date().toISOString()} by VU ${__VU}`,
    }

    const start = Date.now()
    const res = http.post(`${API_URL}/tasks/${task._id}/comments`, JSON.stringify(commentData), { headers })
    operationDuration.add(Date.now() - start)

    if (check(res, { 'comment 201': (r) => r.status === 201 })) {
      commentCreated.add(1)
      operationSuccess.add(1)
    } else {
      operationSuccess.add(0)
    }
  })

  sleep(2)
}

export default function () {
  // Default behavior is reader
  readerBehavior()
}
