import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'
import { API_URL, getHeaders, getAuthHeaders, DEFAULT_THRESHOLDS, getStages } from '../config.js'

// Custom metrics
const taskListDuration = new Trend('task_list_duration')
const taskCreateDuration = new Trend('task_create_duration')
const taskUpdateDuration = new Trend('task_update_duration')
const taskGetDuration = new Trend('task_get_duration')
const tasksCreated = new Counter('tasks_created')

export const options = {
  stages: getStages(),
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    task_list_duration: ['p(95)<500', 'p(99)<1000'],
    task_create_duration: ['p(95)<300'],
    task_update_duration: ['p(95)<300'],
    task_get_duration: ['p(95)<200'],
  },
}

// Login and get token + project info
function authenticate(userNum) {
  const email = `loadtest-user-${userNum}@example.com`
  const res = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({ email, password: 'loadtest123' }),
    { headers: getHeaders() }
  )

  if (res.status !== 200) {
    console.error(`Auth failed: ${res.status}`)
    return null
  }

  const body = JSON.parse(res.body)
  return {
    token: body.data.token,
    organizationId: body.data.user.organizations[0],
  }
}

function getProjects(token, organizationId) {
  const res = http.get(`${API_URL}/projects?organizationId=${organizationId}`, {
    headers: getAuthHeaders(token),
  })

  if (res.status !== 200) return []
  const body = JSON.parse(res.body)
  return body.data?.projects || []
}

export function setup() {
  // Login as first user to get project list
  const auth = authenticate(1)
  if (!auth) {
    console.error('Setup failed: Could not authenticate')
    return { projects: [], organizationId: null }
  }

  const projects = getProjects(auth.token, auth.organizationId)
  if (projects.length === 0) {
    console.error('Setup failed: No projects found')
  }

  return { projectIds: projects.map((p) => p.id), organizationId: auth.organizationId }
}

export default function (data) {
  const userNum = (__VU % 100) + 1
  const auth = authenticate(userNum)

  if (!auth || data.projectIds.length === 0) {
    sleep(1)
    return
  }

  // Pick a random project
  const projectId = data.projectIds[Math.floor(Math.random() * data.projectIds.length)]
  const headers = getAuthHeaders(auth.token)

  group('Task Operations', function () {
    // 1. List tasks (most common operation - 60% of requests)
    group('List Tasks', function () {
      const start = Date.now()
      const res = http.get(`${API_URL}/tasks?projectId=${projectId}&limit=50`, { headers })
      taskListDuration.add(Date.now() - start)

      check(res, {
        'list tasks status 200': (r) => r.status === 200,
        'list returns array': (r) => {
          try {
            const body = JSON.parse(r.body)
            return Array.isArray(body.data?.tasks)
          } catch {
            return false
          }
        },
      })
    })

    sleep(0.3)

    // 2. List with filters (20% of requests)
    group('List Tasks with Filters', function () {
      const statuses = ['todo', 'open', 'in_review', 'done']
      const priorities = ['low', 'medium', 'high']
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
      const randomPriority = priorities[Math.floor(Math.random() * priorities.length)]

      const start = Date.now()
      const res = http.get(
        `${API_URL}/tasks?projectId=${projectId}&status=${randomStatus}&priority=${randomPriority}&limit=25`,
        { headers }
      )
      taskListDuration.add(Date.now() - start)

      check(res, {
        'filtered list status 200': (r) => r.status === 200,
      })
    })

    sleep(0.3)

    // 3. Create a task (10% of requests)
    let createdTaskId = null
    if (Math.random() < 0.5) {
      group('Create Task', function () {
        const taskData = {
          projectId,
          title: `Load Test Task ${Date.now()}-${__VU}`,
          description: 'Created during load testing',
          status: 'todo',
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        }

        const start = Date.now()
        const res = http.post(`${API_URL}/tasks`, JSON.stringify(taskData), { headers })
        taskCreateDuration.add(Date.now() - start)

        const created = check(res, {
          'create task status 201': (r) => r.status === 201,
          'create returns task': (r) => {
            try {
              const body = JSON.parse(r.body)
              createdTaskId = body.data?.task?.id
              return createdTaskId !== undefined
            } catch {
              return false
            }
          },
        })

        if (created) {
          tasksCreated.add(1)
        }
      })

      sleep(0.2)
    }

    // 4. Get single task (if we created one)
    if (createdTaskId) {
      group('Get Task', function () {
        const start = Date.now()
        const res = http.get(`${API_URL}/tasks/${createdTaskId}`, { headers })
        taskGetDuration.add(Date.now() - start)

        check(res, {
          'get task status 200': (r) => r.status === 200,
        })
      })

      sleep(0.2)

      // 5. Update task (10% of requests)
      group('Update Task', function () {
        const updateData = {
          status: ['open', 'in_review'][Math.floor(Math.random() * 2)],
        }

        const start = Date.now()
        const res = http.patch(
          `${API_URL}/tasks/${createdTaskId}`,
          JSON.stringify(updateData),
          { headers }
        )
        taskUpdateDuration.add(Date.now() - start)

        check(res, {
          'update task status 200': (r) => r.status === 200,
        })
      })
    }
  })

  sleep(1)
}

export function teardown(data) {
  console.log('Tasks load test completed')
}
