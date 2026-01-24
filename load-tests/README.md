# Load Testing Suite

This directory contains tools and configurations for load testing the application at scale.

## Quick Start

### 1. Seed Load Test Data

```bash
# Create 100 users, 50 projects, 10,000+ tasks
npm run seed:loadtest

# Or with custom configuration
USERS=200 PROJECTS_PER_ORG=10 TASKS_PER_PROJECT=500 npm run seed:loadtest
```

### 2. Run Load Tests

**Option A: Using k6 directly (for development)**

```bash
# Install k6 first: https://k6.io/docs/getting-started/installation/

# Smoke test (quick validation)
TEST_TYPE=smoke k6 run load-tests/k6/run-all.js

# Load test (normal traffic)
TEST_TYPE=load k6 run load-tests/k6/run-all.js

# Stress test (find breaking points)
TEST_TYPE=stress k6 run load-tests/k6/run-all.js
```

**Option B: Using Docker Compose (full stack with monitoring)**

```bash
# Start the full stack (app replicas, nginx, prometheus, grafana)
docker compose -f docker-compose.yml -f load-tests/docker-compose.scale.yml up -d

# Run load tests
docker compose -f docker-compose.yml -f load-tests/docker-compose.scale.yml --profile test run k6 run /scripts/run-all.js

# View metrics in Grafana
open http://localhost:3001  # admin/loadtest
```

### 3. Clean Up

```bash
# Remove load test data
npm run clean:loadtest
```

## Test Types

| Type | Purpose | Duration | Max VUs |
|------|---------|----------|---------|
| `smoke` | Verify system works | ~3 min | 5 |
| `load` | Normal expected load | ~16 min | 100 |
| `stress` | Find breaking points | ~26 min | 300 |
| `spike` | Sudden traffic bursts | ~7 min | 500 |
| `soak` | Sustained load | ~4 hours | 100 |

## Test Scenarios

### Individual Scenarios

```bash
# Authentication only
k6 run load-tests/k6/scenarios/auth.js

# Task operations (CRUD)
k6 run load-tests/k6/scenarios/tasks.js

# Mixed workload (realistic user behavior)
k6 run load-tests/k6/scenarios/mixed-workload.js
```

### Mixed Workload Breakdown

The mixed workload simulates realistic user behavior:

- **60% Readers** - Browse projects and tasks
- **25% Active Users** - Create and update tasks
- **15% Commenters** - View task details and add comments

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    k6       │────▶│   nginx     │────▶│  app (x3)   │
│  (load gen) │     │  (LB)       │     │  replicas   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
┌─────────────┐     ┌─────────────┐            │
│  Grafana    │◀────│ Prometheus  │◀───────────┘
│  (viz)      │     │ (metrics)   │
└─────────────┘     └─────────────┘
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Application URL |
| `TEST_TYPE` | `smoke` | Test type to run |
| `USERS` | `100` | Number of test users to create |
| `ORGANIZATIONS` | `10` | Number of organizations |
| `PROJECTS_PER_ORG` | `5` | Projects per organization |
| `TASKS_PER_PROJECT` | `200` | Tasks per project |

### Thresholds

Default pass/fail criteria:

- 95th percentile response time < 500ms
- 99th percentile response time < 1000ms
- Error rate < 1%
- Throughput > 100 req/s

## Results

Test results are saved to `load-tests/results/`:

- `{test-type}-{timestamp}.html` - Visual HTML report
- `{test-type}-{timestamp}.json` - Raw metrics data

## Monitoring

### Grafana Dashboards

Access Grafana at http://localhost:3001 (admin/loadtest)

Pre-configured dashboards:
- k6 Test Results
- Application Metrics
- MongoDB Performance

### Prometheus Metrics

Access Prometheus at http://localhost:9090

Key metrics:
- `http_req_duration` - Request latency
- `http_reqs` - Request rate
- `http_req_failed` - Error rate

## Troubleshooting

### "Cannot authenticate" error

Make sure you've run the load test seeder:

```bash
npm run seed:loadtest
```

### Slow test performance

1. Check MongoDB indexes are created (see server/models/*.ts)
2. Increase MongoDB cache size in docker-compose.scale.yml
3. Add more app replicas

### Out of memory

Reduce the number of VUs or increase container memory limits.

## Database Indexes

For optimal load test performance, ensure these indexes exist:

```javascript
// Task collection
db.tasks.createIndex({ project: 1, status: 1, priority: 1 })
db.tasks.createIndex({ project: 1, dueDate: 1 })
db.tasks.createIndex({ project: 1, assignee: 1, status: 1 })
db.tasks.createIndex({ path: 1 })
db.tasks.createIndex({ project: 1, parentTask: 1, order: 1 })

// Comment collection
db.comments.createIndex({ task: 1, createdAt: -1 })

// User collection
db.users.createIndex({ email: 1 }, { unique: true })
```

These indexes are defined in the Mongoose schemas and should be created automatically.
