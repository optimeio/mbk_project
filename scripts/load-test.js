/**
 * k6 Load Test Script — MBK Carrierz Portal
 * Tests API endpoints under 60,000+ user load
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 * Run: k6 run scripts/load-test.js
 * Run with env: k6 run --env BASE_URL=https://api.mbktechnologies.info scripts/load-test.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ── Custom Metrics ─────────────────────────────────────────────────────────
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time", true);
const requestCount = new Counter("requests_total");

// ── Test Configuration ─────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:5003";

export const options = {
  stages: [
    // Warm-up
    { duration: "1m",  target: 100   }, // Ramp to 100 VUs
    { duration: "2m",  target: 500   }, // Ramp to 500 VUs
    // Load test
    { duration: "5m",  target: 2000  }, // Sustain 2,000 VUs (~10K concurrent users)
    { duration: "5m",  target: 5000  }, // Peak: 5,000 VUs (~25K concurrent users)
    // Stress test
    { duration: "3m",  target: 10000 }, // Stress: 10K VUs (~50K concurrent users)
    // Recovery
    { duration: "2m",  target: 500   },
    { duration: "1m",  target: 0     },
  ],
  thresholds: {
    http_req_duration: [
      "p(50)<200",   // 50th percentile < 200ms
      "p(95)<500",   // 95th percentile < 500ms
      "p(99)<1000",  // 99th percentile < 1s
    ],
    http_req_failed: ["rate<0.01"],  // Less than 1% error rate
    errors: ["rate<0.05"],           // Less than 5% custom errors
    response_time: ["p(95)<500"],
  },
};

const TOKEN = __ENV.AUTH_TOKEN || "";

const authHeaders = {
  "Content-Type": "application/json",
  "Authorization": TOKEN ? `Bearer ${TOKEN}` : "",
  "Accept": "application/json",
  "Accept-Encoding": "gzip, deflate",
};

// ── Health Check ───────────────────────────────────────────────────────────
export function healthCheck() {
  const res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    "health: status 200": (r) => r.status === 200,
    "health: response < 50ms": (r) => r.timings.duration < 50,
  });
}

// ── Main Test Scenario ─────────────────────────────────────────────────────
export default function () {
  group("Public Endpoints", () => {
    // Health check
    const health = http.get(`${BASE_URL}/api/health`);
    check(health, { "health OK": (r) => r.status === 200 });
    requestCount.add(1);
    responseTime.add(health.timings.duration);
    errorRate.add(health.status !== 200);

    sleep(0.1);
  });

  group("Auth Endpoints", () => {
    // Simulate login attempt (will fail with test creds but tests endpoint)
    const login = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: "test@example.com", password: "wrong" }),
      { headers: authHeaders }
    );
    check(login, {
      "login: responds": (r) => r.status === 200 || r.status === 401 || r.status === 429,
      "login: < 500ms": (r) => r.timings.duration < 500,
    });
    requestCount.add(1);
    responseTime.add(login.timings.duration);
    errorRate.add(login.status >= 500);

    sleep(0.5);
  });

  if (TOKEN) {
    group("Protected Dashboard Endpoints", () => {
      const urls = [
        "/api/dashboard-data/bundle",
        "/api/trainers?page=1&limit=20",
        "/api/salaries?page=1&limit=20",
        "/api/attendance?page=1&limit=20",
        "/api/complaints?page=1&limit=10",
      ];

      for (const url of urls) {
        const res = http.get(`${BASE_URL}${url}`, { headers: authHeaders });
        check(res, {
          [`${url}: status < 400`]: (r) => r.status < 400,
          [`${url}: < 500ms`]: (r) => r.timings.duration < 500,
        });
        requestCount.add(1);
        responseTime.add(res.timings.duration);
        errorRate.add(res.status >= 400);
        sleep(0.2);
      }
    });

    group("Trainer Operations", () => {
      // Trainer dashboard stats
      const stats = http.get(`${BASE_URL}/api/trainers/stats`, { headers: authHeaders });
      check(stats, {
        "trainer stats OK": (r) => r.status === 200 || r.status === 403,
        "trainer stats fast": (r) => r.timings.duration < 300,
      });
      requestCount.add(1);
      responseTime.add(stats.timings.duration);

      // Schedule list
      const schedule = http.get(`${BASE_URL}/api/schedules?page=1&limit=10`, { headers: authHeaders });
      check(schedule, { "schedule OK": (r) => r.status < 400 });
      requestCount.add(1);
      responseTime.add(schedule.timings.duration);

      sleep(0.3);
    });
  }

  // Simulate realistic think time (1-3 seconds between actions)
  sleep(Math.random() * 2 + 1);
}

// ── Setup (runs once before tests) ────────────────────────────────────────
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  const health = http.get(`${BASE_URL}/api/health`);
  if (health.status !== 200) {
    throw new Error(`Server is not healthy: ${health.status}`);
  }
  console.log("Server health check passed. Starting test...");
}

// ── Teardown (runs once after tests) ──────────────────────────────────────
export function teardown(data) {
  console.log("Load test completed.");
}
