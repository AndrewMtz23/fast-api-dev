# Pipeline de pruebas de carga con K6, GitHub Actions y Grafana

## 1. Objetivo

Implementar un pipeline automatizado de pruebas de carga para el proyecto `fast-api-dev` usando K6 para la ejecucion, GitHub Actions para la automatizacion y Grafana Cloud k6 para la visualizacion de resultados.

## 2. Script de pruebas K6

Archivo: `k6/api-load-test.js`

Este script simula la interaccion con dos vistas o areas clave del sistema:

- La vista principal `/` junto con el endpoint de salud `/health`.
- Los endpoints de datos `/items`, `/users` y `/metrics`.

Caracteristicas principales del script:

- Define dos escenarios concurrentes con `ramping-vus`.
- Valida codigos HTTP 200.
- Verifica contenido esperado en la landing.
- Valida estructura de respuestas JSON.
- Aplica thresholds para porcentaje de error y tiempo de respuesta.

### Codigo fuente completo

```javascript
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
```

## 3. Configuracion de integracion entre GitHub y Grafana

### Proceso realizado

1. Crear una cuenta o usar una cuenta existente en Grafana Cloud.
2. Entrar al modulo de `Performance testing` y crear un proyecto para almacenar las pruebas de K6.
3. Copiar el `Project ID` del proyecto creado.
4. Generar un token de acceso para Grafana Cloud k6.
5. En GitHub, abrir el repositorio y entrar a `Settings > Secrets and variables > Actions`.
6. Crear los secretos:
   - `K6_CLOUD_TOKEN`
   - `K6_CLOUD_PROJECT_ID`
7. Subir el workflow `k6-load-test.yml` al repositorio.
8. Ejecutar el workflow desde `Actions` o al hacer `push`/`pull request`.
9. Verificar que el pipeline corra la app, ejecute K6 y, si los secretos existen, envie los resultados a Grafana Cloud k6.
10. Abrir Grafana Cloud y revisar el dashboard o la vista del proyecto para ver las metricas de la ejecucion.

### Evidencia requerida

Insertar capturas en esta seccion:

- Captura 1: configuracion de secretos en GitHub.
- Captura 2: proyecto o dashboard de Grafana donde aparezcan las metricas.

## 4. Workflow de GitHub Actions

Archivo: `.github/workflows/k6-load-test.yml`

### Codigo completo del workflow

```yaml
name: K6 Load Tests

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]
  workflow_dispatch:

jobs:
  k6-load-test:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: "npm"

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Setup k6
        uses: grafana/setup-k6-action@v1

      - name: Start application
        run: |
          npm start > app.log 2>&1 &
          echo $! > app.pid

      - name: Wait for API readiness
        run: |
          for i in {1..30}; do
            if curl -fsS http://127.0.0.1:3000/health > /dev/null; then
              echo "Application is ready"
              exit 0
            fi
            sleep 2
          done
          echo "Application did not become ready in time"
          cat app.log || true
          exit 1

      - name: Run local k6 load test and export summary
        run: |
          mkdir -p artifacts
          k6 run \
            --env BASE_URL=http://127.0.0.1:3000 \
            --summary-export artifacts/k6-summary.json \
            k6/api-load-test.js | tee artifacts/k6-console.txt

      - name: Stream results to Grafana Cloud k6
        if: ${{ secrets.K6_CLOUD_TOKEN != '' && secrets.K6_CLOUD_PROJECT_ID != '' }}
        uses: grafana/run-k6-action@v1
        env:
          BASE_URL: http://127.0.0.1:3000
          K6_CLOUD_TOKEN: ${{ secrets.K6_CLOUD_TOKEN }}
          K6_CLOUD_PROJECT_ID: ${{ secrets.K6_CLOUD_PROJECT_ID }}
        with:
          path: |
            ./k6/api-load-test.js
          cloud-run-locally: true
          debug: true

      - name: Upload load test artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-load-test-artifacts
          path: |
            artifacts/
            app.log

      - name: Stop application
        if: always()
        run: |
          if [ -f app.pid ]; then
            kill "$(cat app.pid)" || true
          fi
```

## 5. Evidencia de ejecucion y visualizacion

### Capturas requeridas

- Captura 3: ejecucion exitosa del pipeline en la pestana `Actions` de GitHub.
- Captura 4: dashboard de Grafana con metricas de la prueba.

### Donde obtenerlas

- GitHub Actions:
  - Abrir el workflow `K6 Load Tests`.
  - Tomar captura donde se vea el job en verde y los pasos ejecutados.
- Grafana:
  - Abrir `Performance testing` en Grafana Cloud k6.
  - Entrar al proyecto configurado.
  - Tomar captura del panel con duracion, throughput, errores y percentiles.

## 6. Notas finales

- El proyecto usa datos estaticos, por lo que las pruebas se enfocan en disponibilidad, latencia y consistencia de respuestas.
- El workflow funciona aunque no exista Grafana configurado; en ese caso ejecuta K6 localmente y sube artefactos a GitHub.
- Cuando los secretos `K6_CLOUD_TOKEN` y `K6_CLOUD_PROJECT_ID` estan configurados, el mismo pipeline envia los resultados a Grafana Cloud k6.

## 7. Referencias oficiales

- Grafana: Integrate Grafana Cloud k6 into your CI/CD pipeline with new k6 GitHub Actions  
  https://grafana.com/whats-new/integrate-grafana-cloud-k6-into-your-cicd-pipeline-with-new-k6-github-actions/
- Grafana: Performance testing with Grafana k6 and GitHub Actions  
  https://grafana.com/blog/performance-testing-with-grafana-k6-and-github-actions/
- Grafana Cloud k6 documentation  
  https://grafana.com/docs/grafana-cloud/testing/k6/get-started/
