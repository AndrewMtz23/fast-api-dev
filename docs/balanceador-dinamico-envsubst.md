# Implementacion del Balanceador Dinamico con envsubst

## Objetivo

Configurar un servidor Nginx como punto de entrada dinamico para alternar trafico entre ambientes sin editar manualmente archivos productivos.

## Archivos del entregable

- `nginx.conf.template`
- `scripts/switch-green.sh`

## Plantilla de Nginx

La plantilla usa variables de ambiente para definir el backend activo:

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

## Script The Switch

El script cambia el trafico al ambiente Verde:

```bash
export APP_TARGET_IP="192.168.1.20"
export APP_TARGET_PORT="8080"
export DEPLOYMENT_COLOR="Green"
```

Despues procesa la plantilla con `envsubst`, genera el archivo final de Nginx, valida con `nginx -t` y solo si la configuracion es correcta recarga Nginx con `systemctl reload nginx`.

Si la validacion falla, el script restaura el archivo anterior y no recarga el servicio.

## Comandos para instalar en la VM Nginx

Desde la carpeta donde estan los archivos:

```bash
sudo apt-get update
sudo apt-get install -y gettext-base
sudo cp nginx.conf.template /etc/nginx/nginx.conf.template
sudo cp scripts/switch-green.sh /usr/local/bin/switch-green.sh
sudo chmod +x /usr/local/bin/switch-green.sh
sudo TEMPLATE_PATH=/etc/nginx/nginx.conf.template /usr/local/bin/switch-green.sh
```

## Validacion

Revisar la configuracion generada:

```bash
sudo nginx -t
sudo cat /etc/nginx/sites-enabled/default
```

Nota: la practica solicita generar `/etc/nginx/conf.d/default.conf`, pero esta VM ya usa `/etc/nginx/sites-enabled/default` como configuracion principal. Para evitar conflicto de bloques `server` y `upstream`, se usa `sites-enabled/default`. En un servidor limpio que use `conf.d`, se puede ejecutar con `TARGET_PATH=/etc/nginx/conf.d/default.conf`.

Validar el header:

```bash
curl -I http://localhost
curl -I http://34.44.124.101
```

La evidencia esperada debe incluir:

```text
X-Deployment-Color: Green
```
