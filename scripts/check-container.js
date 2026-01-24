#!/usr/bin/env node
import { existsSync } from 'fs'
import { spawn } from 'child_process'

const isInContainer = existsSync('/.dockerenv')

if (!isInContainer) {
    console.log('\x1b[33m' + '⚠'.padStart(2) + '  Running outside Docker container - forwarding to container...\x1b[0m')
    console.log('')

    // Get the npm script name from npm_lifecycle_event (e.g., "dev", "build")
    const scriptName = process.env.npm_lifecycle_event

    const child = spawn('docker', ['compose', 'exec', 'app', 'npm', 'run', scriptName], {
        stdio: 'inherit',
        shell: false,
    })

    child.on('close', (code) => {
        process.exit(code ?? 0)
    })

    child.on('error', (err) => {
        console.error('\x1b[31mFailed to start Docker command:\x1b[0m', err.message)
        console.error('')
        console.error('   Make sure Docker is running and the container is up:')
        console.error('\x1b[36m   docker compose up -d\x1b[0m')
        console.error('')
        process.exit(1)
    })
}

// If inside container, exit 0 so the && chain continues
