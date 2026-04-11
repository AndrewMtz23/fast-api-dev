# Orquestacion del Pipeline Blue-Green

## Objetivo

Integrar la logica de conmutacion Blue-Green en un flujo CI/CD automatizado para que el pipeline decida a que ambiente desplegar.

## Implementacion

Se agrego un mecanismo de estado persistente en el servidor:

```text
/etc/nginx/current_deploy.env
```

Ese archivo guarda cual color esta productivo:

```text
CURRENT_COLOR=blue
APP_TARGET_IP=127.0.0.1
APP_TARGET_PORT=8080
DEPLOYMENT_COLOR=blue
IMAGE=ghcr.io/andrewmtz23/fast-api-dev:main
UPDATED_AT=...
```

En cada despliegue, el script lee `CURRENT_COLOR` y elige el color contrario:

- Si el activo es `blue`, despliega a `green`.
- Si el activo es `green`, despliega a `blue`.

## Archivos del proyecto

- `nginx/pipeline-blue-green.conf.template`
- `scripts/blue-green-deploy.sh`
- `.github/workflows/node-ci.yml`

## Puertos por ambiente

- Blue: `127.0.0.1:8080`
- Green: `127.0.0.1:8081`

Cada contenedor publica internamente la app Node.js en el puerto `3000`, pero Nginx apunta al puerto externo del color activo.

## Sustitucion automatica con envsubst

El pipeline envia variables al servidor y el script remoto usa `envsubst` para generar la configuracion final de Nginx:

```bash
envsubst '${APP_TARGET_IP} ${APP_TARGET_PORT} ${DEPLOYMENT_COLOR}' < "$TEMPLATE_PATH" > "$TEMP_CONFIG"
```

La plantilla usada por el pipeline es:

```nginx
upstream backend_servers {
    server ${APP_TARGET_IP}:${APP_TARGET_PORT};
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://backend_servers;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header X-Deployment-Color ${DEPLOYMENT_COLOR} always;
    }
}
```

## Flujo automatizado

1. El pipeline ejecuta pruebas.
2. Ejecuta analisis SonarQube.
3. Ejecuta pruebas de carga con K6.
4. Construye y publica la imagen Docker en GHCR.
5. Entra por SSH a la VM.
6. Copia o actualiza los scripts y templates de Blue-Green.
7. Lee `/etc/nginx/current_deploy.env`.
8. Calcula el color objetivo.
9. Despliega el contenedor objetivo.
10. Valida `/health` en el puerto objetivo.
11. Genera la config de Nginx con `envsubst`.
12. Valida con `nginx -t`.
13. Recarga con `systemctl reload nginx`.
14. Actualiza `/etc/nginx/current_deploy.env`.

## Validaciones para evidencia

Estado actual:

```bash
sudo cat /etc/nginx/current_deploy.env
```

Configuracion generada:

```bash
sudo cat /etc/nginx/conf.d/default.conf
```

Validacion de Nginx:

```bash
sudo nginx -t
```

Header publico:

```bash
curl -I --max-time 5 http://34.44.124.101
```

Resultado esperado:

```text
HTTP/1.1 200 OK
X-Deployment-Color: blue
```

o:

```text
HTTP/1.1 200 OK
X-Deployment-Color: green
```

## Comparacion con actividades anteriores

Actividad A uso `envsubst` manualmente para generar una configuracion dinamica de Nginx desde una plantilla.

Actividad B uso enlaces simbolicos para alternar entre dos configuraciones fisicas ya existentes.

Actividad C orquesta el proceso completo desde CI/CD: lee estado, invierte el color, despliega el contenedor objetivo, genera Nginx con `envsubst`, valida, recarga y persiste el nuevo estado.
