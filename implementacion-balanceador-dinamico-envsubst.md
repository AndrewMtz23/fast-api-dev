# Implementacion del Balanceador Dinamico con envsubst

## Objetivo

Configurar un servidor Nginx como punto de entrada dinamico para alternar trafico entre ambientes sin editar manualmente archivos de produccion.

La practica solicita usar una plantilla `nginx.conf.template`, procesarla con `envsubst`, generar la configuracion final de Nginx y validar el cambio antes de recargar el servicio.

## Archivos creados

En el proyecto se prepararon estos archivos:

- `nginx.conf.template`
- `scripts/switch-green.sh`
- `docs/balanceador-dinamico-envsubst.md`

Para la ejecucion en la VM `nginx-public`, tambien se copiaron manualmente al home del usuario:

- `~/nginx.conf.template`
- `~/switch-green.sh`

## Plantilla de Nginx

La plantilla define un bloque `upstream` dinamico usando variables de ambiente:

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

La cabecera `X-Deployment-Color` permite identificar visualmente que entorno esta respondiendo.

## Script The Switch

El script `switch-green.sh` configura por defecto el ambiente verde pedido por la practica:

```bash
export APP_TARGET_IP="${APP_TARGET_IP:-192.168.1.20}"
export APP_TARGET_PORT="${APP_TARGET_PORT:-8080}"
export DEPLOYMENT_COLOR="${DEPLOYMENT_COLOR:-Green}"
```

Despues ejecuta `envsubst` para procesar la plantilla, genera la configuracion final de Nginx, valida con `nginx -t` y solo si la validacion es correcta recarga Nginx con `systemctl reload nginx`.

Tambien se agrego un respaldo de la configuracion anterior en `/etc/nginx/backups/` para evitar dejar archivos duplicados dentro de `/etc/nginx/sites-enabled/`.

## Ajuste para esta VM

La practica indicaba generar:

```text
/etc/nginx/conf.d/default.conf
```

Pero en la VM `nginx-public` la configuracion activa de Nginx estaba en:

```text
/etc/nginx/sites-enabled/default
```

Por eso el script se dejo apuntando a `/etc/nginx/sites-enabled/default` por defecto. Esto evito conflictos de `duplicate upstream` y permitio mantener funcionando la app actual.

## Comandos ejecutados en la VM

Se creo la plantilla:

```bash
nano ~/nginx.conf.template
```

Se creo el script:

```bash
nano ~/switch-green.sh
chmod +x ~/switch-green.sh
```

Se valido que `envsubst` estuviera instalado:

```bash
which envsubst
```

Se valido Nginx antes de aplicar cambios:

```bash
sudo nginx -t
```

Se ejecuto el switch de forma segura apuntando a la app real de esta VM:

```bash
cd ~
sudo APP_TARGET_IP="127.0.0.1" APP_TARGET_PORT="3000" DEPLOYMENT_COLOR="Green" ./switch-green.sh
```

Nota: se uso `127.0.0.1:3000` para la validacion porque la app real del proyecto corre en Docker en ese puerto dentro de la VM. El script conserva como valores por defecto los solicitados por la practica: `192.168.1.20:8080`.

## Evidencia de validacion

La validacion de sintaxis de Nginx fue correcta:

```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

El script confirmo el cambio:

```text
Nginx switched to Green: 127.0.0.1:3000
```

La respuesta publica de Nginx mostro el header solicitado:

```bash
curl -I --max-time 5 http://34.44.124.101
```

Resultado esperado:

```text
HTTP/1.1 200 OK
Server: nginx/1.24.0 (Ubuntu)
X-Deployment-Color: Green
```

## Estado final

La practica quedo funcionando en la VM `nginx-public`:

- Nginx responde correctamente por `http://34.44.124.101`.
- El header `X-Deployment-Color: Green` aparece en la respuesta.
- La configuracion fue validada con `nginx -t` antes de recargar.
- La app real siguio respondiendo mediante Nginx apuntando a `127.0.0.1:3000`.
