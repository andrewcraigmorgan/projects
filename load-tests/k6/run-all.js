import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js'
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js'
import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'
import { API_URL, getHeaders, getAuthHeaders, DEFAULT_THRESHOLDS, getStages } from './config.js'

// Comprehensive metrics
const metrics = {
  auth: {
    duration: new Trend('auth_duration'),
    success: new Rate('auth_success'),
  },
  tasks: {
    listDuration: new Trend('tasks_list_duration'),
    createDuration: new Trend('tasks_create_duration'),
    updateDuration: new Trend('tasks_update_duration'),
    success: new Rate('tasks_success'),
    created: new Counter('tasks_created_total'),
  },
  comments: {
    createDuration: new Trend('comments_create_duration'),
    success: new Rate('comments_success'),
    created: new Counter('comments_created_total'),
  },
  projects: {
    listDuration: new Trend('projects_list_duration'),
    success: new Rate('projects_success'),
  },
}

export const options = {
  stages: getStages(),
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    auth_success: ['rate>0.99'],
    auth_duration: ['p(95)<300'],
    tasks_success: ['rate>0.95'],
    tasks_list_duration: ['p(95)<500'],
    tasks_create_duration: ['p(95)<400'],
    projects_success: ['rate>0.99'],
  },
}

function authenticate(userNum) {
  const email = `loadtest-user-${userNum}@example.com`

  const start = Date.now()
  const res = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({ email, password: 'loadtest123' }),
    { headers: getHeaders() }
  )
  metrics.auth.duration.add(Date.now() - start)

  if (res.status === 200) {
    metrics.auth.success.add(1)
    const body = JSON.parse(res.body)
    return {
      token: body.data.token,
      organizationId: body.data.user.organizations[0],
    }
  }

  metrics.auth.success.add(0)
  return null
}

export function setup() {
  // Verify the load test data exists
  const auth = authenticate(1)
  if (!auth) {
    console.error('SETUP FAILED: Cannot authenticate. Did you run the load test seeder?')
    console.error('Run: npm run seed:loadtest')
    return { ready: false }
  }

  const projectsRes = http.get(`${API_URL}/projects?organizationId=${auth.organizationId}`, {
    headers: getAuthHeaders(auth.token),
  })

  if (projectsRes.status !== 200) {
    console.error(`SETUP FAILED: Cannot fetch projects (${projectsRes.status})`)
    return { ready: false }
  }

  const body = JSON.parse(projectsRes.body)
  const projects = body.data?.projects || body.projects || []
  if (projects.length === 0) {
    console.error('SETUP FAILED: No projects found. Did you run the load test seeder?')
    return { ready: false }
  }

  console.log(`Setup complete. Found ${projects.length} projects.`)
  return {
    ready: true,
    projectIds: projects.map((p) => p.id || p._id),
    organizationId: auth.organizationId,
  }
}

export default function (data) {
  if (!data.ready) {
    console.error('Test data not ready. Skipping iteration.')
    sleep(5)
    return
  }

  const userNum = (__VU % 100) + 1
  const auth = authenticate(userNum)

  if (!auth) {
    sleep(1)
    return
  }

  const headers = getAuthHeaders(auth.token)
  const organizationId = auth.organizationId

  // Get projects for this user's organization
  const projectsRes = http.get(`${API_URL}/projects?organizationId=${organizationId}`, { headers })
  if (projectsRes.status !== 200) {
    sleep(1)
    return
  }

  const projectsBody = JSON.parse(projectsRes.body)
  const projects = projectsBody.data?.projects || []
  if (projects.length === 0) {
    sleep(1)
    return
  }

  const projectId = projects[Math.floor(Math.random() * projects.length)].id

  // Simulate realistic user journey
  const journey = Math.random()

  if (journey < 0.6) {
    // 60% - Browse tasks
    browseTasksJourney(headers, projectId, organizationId)
  } else if (journey < 0.85) {
    // 25% - Create and update task
    createTaskJourney(headers, projectId)
  } else {
    // 15% - Comment on task
    commentJourney(headers, projectId)
  }
}

function browseTasksJourney(headers, projectId, organizationId) {
  group('Journey: Browse Tasks', function () {
    // List projects
    const projectsStart = Date.now()
    const projectsRes = http.get(`${API_URL}/projects?organizationId=${organizationId}`, { headers })
    metrics.projects.listDuration.add(Date.now() - projectsStart)
    metrics.projects.success.add(projectsRes.status === 200 ? 1 : 0)

    sleep(0.3)

    // List tasks - multiple pages/filters
    for (let i = 0; i < 2; i++) {
      const page = i + 1
      const start = Date.now()
      const res = http.get(`${API_URL}/tasks?projectId=${projectId}&page=${page}&limit=25`, { headers })
      metrics.tasks.listDuration.add(Date.now() - start)
      metrics.tasks.success.add(res.status === 200 ? 1 : 0)
      sleep(0.2)
    }

    // Filtered query
    const filterStart = Date.now()
    const filterRes = http.get(
      `${API_URL}/tasks?projectId=${projectId}&status=open&priority=high&limit=25`,
      { headers }
    )
    metrics.tasks.listDuration.add(Date.now() - filterStart)
    metrics.tasks.success.add(filterRes.status === 200 ? 1 : 0)
  })

  sleep(1)
}

function createTaskJourney(headers, projectId) {
  group('Journey: Create Task', function () {
    const taskData = {
      projectId,
      title: `Load Test ${Date.now()}-${__VU}-${Math.random().toString(36).substr(2, 5)}`,
      description: 'Created during load testing',
      status: 'todo',
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    }

    const createStart = Date.now()
    const createRes = http.post(`${API_URL}/tasks`, JSON.stringify(taskData), { headers })
    metrics.tasks.createDuration.add(Date.now() - createStart)

    if (createRes.status === 201) {
      metrics.tasks.success.add(1)
      metrics.tasks.created.add(1)

      const createBody = JSON.parse(createRes.body)
      const task = createBody.data?.task || createBody
      sleep(0.5)

      // Update the task
      const updateData = { status: 'open' }
      const updateStart = Date.now()
      const taskId = task.id || task._id
      const updateRes = http.patch(`${API_URL}/tasks/${taskId}`, JSON.stringify(updateData), { headers })
      metrics.tasks.updateDuration.add(Date.now() - updateStart)
      metrics.tasks.success.add(updateRes.status === 200 ? 1 : 0)
    } else {
      metrics.tasks.success.add(0)
    }
  })

  sleep(1.5)
}

function commentJourney(headers, projectId) {
  group('Journey: Comment on Task', function () {
    // Get a task to comment on
    const listRes = http.get(`${API_URL}/tasks?projectId=${projectId}&limit=10`, { headers })

    if (listRes.status !== 200) {
      metrics.comments.success.add(0)
      return
    }

    const tasksBody = JSON.parse(listRes.body)
    const tasks = tasksBody.data?.tasks || tasksBody.tasks || []
    if (tasks.length === 0) {
      metrics.comments.success.add(0)
      return
    }

    const task = tasks[Math.floor(Math.random() * tasks.length)]
    const taskId = task.id || task._id

    // Add comment
    const commentData = {
      content: `Load test comment ${Date.now()}`,
    }

    const start = Date.now()
    const res = http.post(`${API_URL}/tasks/${taskId}/comments`, JSON.stringify(commentData), { headers })
    metrics.comments.createDuration.add(Date.now() - start)

    if (res.status === 201) {
      metrics.comments.success.add(1)
      metrics.comments.created.add(1)
    } else {
      metrics.comments.success.add(0)
    }
  })

  sleep(1)
}

export function handleSummary(data) {
  const testType = __ENV.TEST_TYPE || 'smoke'
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    [`./load-tests/results/${testType}-${timestamp}.html`]: htmlReport(data),
    [`./load-tests/results/${testType}-${timestamp}.json`]: JSON.stringify(data, null, 2),
  }
}
