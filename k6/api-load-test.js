import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000'

export const options = {
  scenarios: {
    smoke_home_and_health: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '20s', target: 5 },
        { duration: '10s', target: 0 }
      ],
      exec: 'browseLanding'
    },
    api_catalog: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 8 },
        { duration: '20s', target: 8 },
        { duration: '10s', target: 0 }
      ],
      exec: 'browseApi'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    checks: ['rate>0.99']
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)']
}

export function browseLanding() {
  const landing = http.get(`${BASE_URL}/`)
  const health = http.get(`${BASE_URL}/health`)

  check(landing, {
    'landing status 200': (res) => res.status === 200,
    'landing contains Fast API Dev': (res) => res.body.includes('Fast API Dev')
  })

  check(health, {
    'health status 200': (res) => res.status === 200,
    'health response has OK': (res) => res.json('status') === 'OK'
  })

  sleep(1)
}

export function browseApi() {
  const items = http.get(`${BASE_URL}/items`)
  const users = http.get(`${BASE_URL}/users`)
  const metrics = http.get(`${BASE_URL}/metrics`)

  check(items, {
    'items status 200': (res) => res.status === 200,
    'items returns array': (res) => Array.isArray(res.json()),
    'items has at least one product': (res) => res.json().length > 0
  })

  check(users, {
    'users status 200': (res) => res.status === 200,
    'users returns array': (res) => Array.isArray(res.json())
  })

  check(metrics, {
    'metrics status 200': (res) => res.status === 200,
    'metrics environment demo': (res) => res.json('environment') === 'demo'
  })

  sleep(1)
}
