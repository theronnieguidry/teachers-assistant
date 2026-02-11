#!/usr/bin/env node

/**
 * Dev Watcher - Automatically manages and restarts dev servers
 *
 * Features:
 * - Starts Vite dev server and Generation API
 * - Monitors for crashes and auto-restarts
 * - Health checks for unresponsive servers
 * - Clears ports on startup if occupied
 * - Graceful shutdown on Ctrl+C
 *
 * Usage: npm run dev:watch
 */

const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");
const net = require("net");

// Configuration
const CONFIG = {
  vite: {
    name: "Vite Dev Server",
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "dev"],
    cwd: process.cwd(),
    port: 1420,
    healthPath: "/",
    color: "\x1b[36m", // Cyan
    startupDelay: 5000, // Wait before health checks
  },
  api: {
    name: "Generation API",
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "dev"],
    cwd: path.join(process.cwd(), "generation-api"),
    port: 3001,
    healthPath: "/health",
    color: "\x1b[33m", // Yellow
    startupDelay: 3000,
  },
};

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

// State
const processes = {};
const serviceStartTimes = {};
let isShuttingDown = false;
let healthCheckInterval = null;

// Utility functions
function log(service, message, isError = false) {
  const color = CONFIG[service]?.color || "";
  const prefix = CONFIG[service]?.name || service;
  const timestamp = new Date().toLocaleTimeString();
  const errorColor = isError ? RED : "";
  console.log(`${color}[${timestamp}] [${prefix}]${RESET} ${errorColor}${message}${RESET}`);
}

function logSystem(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${BOLD}[${timestamp}] [Watcher]${RESET} ${message}`);
}

function getPidsOnPort(port) {
  try {
    if (process.platform === "win32") {
      let result;
      try {
        result = execSync(`netstat -ano | findstr ":${port}"`, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch {
        // No results found
        return [];
      }

      const lines = result.trim().split("\n");
      const pids = new Set();

      for (const line of lines) {
        // Only look at LISTENING connections
        if (!line.includes("LISTENING")) continue;

        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0" && /^\d+$/.test(pid)) {
          pids.add(pid);
        }
      }

      return [...pids];
    } else {
      try {
        const output = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        })
          .trim()
          .split("\n")
          .map((pid) => pid.trim())
          .filter(Boolean);
        return [...new Set(output)];
      } catch {
        return [];
      }
    }
  } catch {
    return [];
  }
}

function isPortInUseByConnection(port, host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

// Kill process on a specific port (Windows/Unix)
function killPort(port) {
  const pids = getPidsOnPort(port);
  if (pids.length === 0) return false;

  for (const pid of pids) {
    try {
      if (process.platform === "win32") {
        // Use /T to kill the process tree
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: "pipe" });
      } else {
        execSync(`kill -9 ${pid}`, { stdio: "pipe" });
      }
      logSystem(`Killed process ${pid} on port ${port}`);
    } catch {
      // Process might have already exited
    }
  }

  return true;
}

// Check if a port is available
async function isPortAvailable(port) {
  if (getPidsOnPort(port).length > 0) {
    return false;
  }

  const checks = await Promise.all([
    isPortInUseByConnection(port, "127.0.0.1"),
    isPortInUseByConnection(port, "::1"),
    isPortInUseByConnection(port, "localhost"),
  ]);

  return !checks.some(Boolean);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Health check for a service
function healthCheck(serviceName) {
  return new Promise((resolve) => {
    const config = CONFIG[serviceName];
    if (!config) {
      resolve(false);
      return;
    }

    const req = http.request(
      {
        hostname: "localhost", // Use localhost to support both IPv4 and IPv6
        port: config.port,
        path: config.healthPath,
        method: "GET",
        timeout: 5000,
      },
      (res) => {
        resolve(res.statusCode < 500);
      }
    );

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Start a service
async function startService(serviceName) {
  const config = CONFIG[serviceName];
  if (!config) {
    logSystem(`Unknown service: ${serviceName}`);
    return;
  }

  if (isShuttingDown) return;

  // Check if already running
  if (processes[serviceName] && !processes[serviceName].killed) {
    log(serviceName, "Already running, skipping start");
    return;
  }

  // Clear port if occupied
  const portAvailable = await isPortAvailable(config.port);
  if (!portAvailable) {
    log(serviceName, `Port ${config.port} is occupied, attempting to clear...`);
    killPort(config.port);
    await wait(1500);
  }

  const portReleased = await isPortAvailable(config.port);
  if (!portReleased) {
    log(
      serviceName,
      `Port ${config.port} is still occupied after cleanup, retrying in 3 seconds...`,
      true
    );
    setTimeout(() => {
      if (!isShuttingDown) {
        startService(serviceName);
      }
    }, 3000);
    return;
  }

  log(serviceName, `Starting on port ${config.port}...`);

  const spawnOptions = {
    cwd: config.cwd,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "1" },
  };

  let proc;

  // Windows needs shell execution for npm
  if (process.platform === "win32") {
    spawnOptions.shell = true;
    spawnOptions.windowsHide = true;
    // Join command and args to avoid deprecation warning
    const fullCommand = [config.command, ...config.args].join(" ");
    proc = spawn(fullCommand, [], spawnOptions);
  } else {
    proc = spawn(config.command, config.args, spawnOptions);
  }

  // Close stdin immediately since we don't need it
  if (proc.stdin) {
    proc.stdin.end();
  }

  processes[serviceName] = proc;
  serviceStartTimes[serviceName] = Date.now();

  proc.stdout.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach((line) => {
      if (line.trim()) {
        log(serviceName, line);
      }
    });
  });

  proc.stderr.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach((line) => {
      if (line.trim()) {
        // Filter out some noisy warnings
        if (line.includes("ExperimentalWarning") || line.includes("DEP0")) {
          log(serviceName, `${DIM}${line}${RESET}`);
        } else {
          log(serviceName, line, true);
        }
      }
    });
  });

  proc.on("exit", (code, signal) => {
    if (isShuttingDown) return;

    processes[serviceName] = null;

    if (code !== 0 && code !== null) {
      log(serviceName, `Exited with code ${code}. Restarting in 3 seconds...`, true);
      setTimeout(() => {
        if (!isShuttingDown) {
          startService(serviceName);
        }
      }, 3000);
    } else if (signal) {
      log(serviceName, `Terminated by signal ${signal}`);
    }
  });

  proc.on("error", (err) => {
    log(serviceName, `Failed to start: ${err.message}`, true);
    processes[serviceName] = null;
  });
}

// Stop a service
function stopService(serviceName) {
  const proc = processes[serviceName];
  if (proc && !proc.killed) {
    log(serviceName, "Stopping...");

    // On Windows, we need to kill the process tree
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: "pipe" });
      } catch {
        try {
          proc.kill("SIGTERM");
        } catch {
          // Process already dead
        }
      }
    } else {
      try {
        process.kill(-proc.pid, "SIGTERM");
      } catch {
        proc.kill("SIGTERM");
      }
    }

    processes[serviceName] = null;
  }
}

// Periodic health checks
async function runHealthChecks() {
  if (isShuttingDown) return;

  for (const serviceName of Object.keys(CONFIG)) {
    const proc = processes[serviceName];
    const config = CONFIG[serviceName];

    // Skip if process doesn't exist or was just started
    if (!proc || proc.killed) continue;

    const startTime = serviceStartTimes[serviceName] || 0;
    const elapsed = Date.now() - startTime;

    // Don't health check if service just started
    if (elapsed < config.startupDelay) continue;

    const isHealthy = await healthCheck(serviceName);

    if (!isHealthy && !isShuttingDown) {
      log(serviceName, "Health check failed, verifying...");

      // Double-check before restarting
      await new Promise((resolve) => setTimeout(resolve, 3000));

      if (isShuttingDown) return;

      const stillUnhealthy = !(await healthCheck(serviceName));

      if (stillUnhealthy && !isShuttingDown) {
        log(serviceName, "Service unresponsive. Restarting...", true);
        stopService(serviceName);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (!isShuttingDown) {
          startService(serviceName);
        }
      } else {
        log(serviceName, `${GREEN}Service recovered${RESET}`);
      }
    }
  }
}

// Graceful shutdown
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logSystem("Shutting down...");

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  for (const serviceName of Object.keys(CONFIG)) {
    stopService(serviceName);
  }

  // Give processes time to exit
  setTimeout(() => {
    logSystem("Shutdown complete");
    process.exit(0);
  }, 2000);
}

// Main
async function main() {
  console.log(`
${BOLD}╔════════════════════════════════════════════════════════════╗
║           Teacher's Assistant - Dev Watcher                 ║
║                                                              ║
║  Monitoring: Vite (:${CONFIG.vite.port}) + Generation API (:${CONFIG.api.port})       ║
║  Press Ctrl+C to stop                                        ║
╚════════════════════════════════════════════════════════════╝${RESET}
`);

  // Handle shutdown signals
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Handle uncaught errors gracefully
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    shutdown();
  });

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
  });

  // Start services
  await startService("vite");

  // Wait a moment before starting API to avoid conflicts
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await startService("api");

  // Start health checks after servers have time to initialize
  setTimeout(() => {
    if (!isShuttingDown) {
      healthCheckInterval = setInterval(runHealthChecks, 30000); // Check every 30 seconds
      logSystem(`${GREEN}Health monitoring active (30s interval)${RESET}`);
    }
  }, 15000);

  logSystem(`${GREEN}All services started. Watching for changes...${RESET}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
