#!/bin/bash
# Load Test Runner Script
# Usage: ./load-tests/run.sh [smoke|load|stress|spike|soak]

set -e

TEST_TYPE="${1:-smoke}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Load Test Runner ==="
echo "Test type: $TEST_TYPE"
echo ""

# Check if k6 is installed locally
if command -v k6 &> /dev/null; then
    echo "Running with local k6..."
    cd "$PROJECT_DIR"
    TEST_TYPE="$TEST_TYPE" k6 run load-tests/k6/run-all.js
else
    echo "k6 not found locally. Running with Docker..."

    # Check if the scale stack is running
    if ! docker compose -f "$PROJECT_DIR/docker-compose.yml" -f "$PROJECT_DIR/load-tests/docker-compose.scale.yml" ps --status running | grep -q "app"; then
        echo "Starting scale test infrastructure..."
        docker compose -f "$PROJECT_DIR/docker-compose.yml" -f "$PROJECT_DIR/load-tests/docker-compose.scale.yml" up -d

        echo "Waiting for services to be ready..."
        sleep 10
    fi

    # Run k6 in Docker
    docker compose -f "$PROJECT_DIR/docker-compose.yml" -f "$PROJECT_DIR/load-tests/docker-compose.scale.yml" \
        --profile test run --rm \
        -e TEST_TYPE="$TEST_TYPE" \
        k6 run /scripts/run-all.js
fi

echo ""
echo "=== Test Complete ==="
echo "Results saved to: load-tests/results/"
