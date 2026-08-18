// Process-wide "we're going down" flag. The health endpoint reads it so an
// orchestrator (Coolify / a load balancer) sees the instance as unhealthy and
// stops routing new traffic while the HTTP server drains its active requests.
let shuttingDown = false

export function isShuttingDown(): boolean {
  return shuttingDown
}

export function beginShutdown(): void {
  shuttingDown = true
}
