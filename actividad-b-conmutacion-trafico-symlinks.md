# Actividad B: Conmutacion de Trafico mediante Enlaces Simbolicos

## Objetivo

Implementar una estrategia Blue-Green con Nginx usando enlaces simbolicos para alternar entre dos archivos de configuracion estaticos y preconfigurados.

La diferencia principal con la actividad anterior es que aqui no se usa `envsubst`. En esta actividad existen dos archivos reales:

- `nginx_blue.conf`
- `nginx_green.conf`

Nginx lee un archivo maestro:

```text
/etc/nginx/conf.d/default.conf
```

Ese archivo maestro no debe ser un archivo real, sino un enlace simbolico que apunta al archivo del ambiente activo.

## Archivos preparados en el proyecto

- `nginx/environments/nginx_blue.conf`
- `nginx/environments/nginx_green.conf`
- `scripts/switch-symlink.sh`

## Configuracion Blue

Archivo:

```text
/etc/nginx/environments/nginx_blue.conf
```

Configuracion:

```nginx
upstream backend_servers {
    server 127.0.0.1:8080;
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
        add_header X-Deployment-Color Blue always;
    }
}
```

## Configuracion Green

Archivo:

```text
/etc/nginx/environments/nginx_green.conf
```

Configuracion:

```nginx
upstream backend_servers {
    server 127.0.0.1:8081;
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
        add_header X-Deployment-Color Green always;
    }
}
```

Nota: en el enunciado se piden puertos `8080` y `8081`. En esta VM los endpoints estan apuntando a `127.0.0.1` porque Nginx y los contenedores corren en el mismo servidor.

## Script The Link Switcher

El script recibe un parametro obligatorio:

- `blue`
- `green`

Ejemplo:

```bash
sudo ./switch-symlink.sh blue
sudo ./switch-symlink.sh green
```

La logica central es:

```bash
ln -sf /etc/nginx/environments/nginx_blue.conf /etc/nginx/conf.d/default.conf
ln -sf /etc/nginx/environments/nginx_green.conf /etc/nginx/conf.d/default.conf
```

Despues valida con:

```bash
nginx -t
```

Y solo si la configuracion es correcta recarga Nginx:

```bash
systemctl reload nginx
```

## Comandos para instalar en la VM

```bash
sudo mkdir -p /etc/nginx/environments
sudo cp nginx/environments/nginx_blue.conf /etc/nginx/environments/nginx_blue.conf
sudo cp nginx/environments/nginx_green.conf /etc/nginx/environments/nginx_green.conf
sudo cp scripts/switch-symlink.sh /usr/local/bin/switch-symlink.sh
sudo chmod +x /usr/local/bin/switch-symlink.sh
```

En esta VM, para evitar conflicto con la configuracion anterior en `/etc/nginx/sites-enabled/default`, se debe respaldar antes de usar el symlink en `conf.d`:

```bash
sudo mkdir -p /etc/nginx/backups
sudo mv /etc/nginx/sites-enabled/default /etc/nginx/backups/default.before-symlink
```

## Ejecucion

Cambiar a Blue:

```bash
sudo switch-symlink.sh blue
curl -I --max-time 5 http://34.44.124.101
```

Resultado esperado:

```text
X-Deployment-Color: Blue
```

Cambiar a Green:

```bash
sudo switch-symlink.sh green
curl -I --max-time 5 http://34.44.124.101
```

Resultado esperado:

```text
X-Deployment-Color: Green
```

## Comparacion: envsubst vs symlinks

`envsubst` genera un archivo final a partir de una plantilla. Es util cuando cambian valores como IP, puerto o color sin duplicar bloques completos de Nginx.

`symlinks` alterna entre archivos fisicos ya preparados. Es mas simple para Blue-Green cuando las configuraciones son estables y solo se necesita cambiar el apuntador activo.

`envsubst` es mas flexible, pero depende de variables de ambiente y de generar correctamente el archivo final.

`symlinks` es mas directo y auditable, porque cada ambiente tiene su propio archivo completo, pero requiere mantener sincronizados los dos archivos si cambia una regla comun.

## Evidencia recomendada

- Captura de `ls -la /etc/nginx/environments`.
- Captura de `ls -la /etc/nginx/conf.d/default.conf` mostrando el enlace simbolico.
- Captura de `sudo switch-symlink.sh blue`.
- Captura de `curl -I --max-time 5 http://34.44.124.101` mostrando `X-Deployment-Color: Blue`.
- Captura de `sudo switch-symlink.sh green`.
- Captura de `curl -I --max-time 5 http://34.44.124.101` mostrando `X-Deployment-Color: Green`.

## Evidencia obtenida en la VM

Archivos de ambientes creados:

```text
/etc/nginx/environments/nginx_blue.conf
/etc/nginx/environments/nginx_green.conf
```

Validacion del directorio:

```text
total 16
drwxr-xr-x  2 root root 4096 Apr 11 02:00 .
drwxr-xr-x 10 root root 4096 Apr 11 01:59 ..
-rw-r--r--  1 root root  519 Apr 11 01:59 nginx_blue.conf
-rw-r--r--  1 root root  522 Apr 11 02:00 nginx_green.conf
```

Cambio a Blue:

```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
Nginx switched to blue: /etc/nginx/environments/nginx_blue.conf -> /etc/nginx/conf.d/default.conf
```

Symlink y header Blue:

```text
/etc/nginx/conf.d/default.conf -> /etc/nginx/environments/nginx_blue.conf
HTTP/1.1 200 OK
X-Deployment-Color: Blue
```

Cambio a Green:

```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
Nginx switched to green: /etc/nginx/environments/nginx_green.conf -> /etc/nginx/conf.d/default.conf
```

Symlink y header Green:

```text
/etc/nginx/conf.d/default.conf -> /etc/nginx/environments/nginx_green.conf
HTTP/1.1 200 OK
X-Deployment-Color: Green
```

Validacion final:

```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## Estado final

La actividad B quedo funcionando en la VM `nginx-public`:

- El archivo maestro `/etc/nginx/conf.d/default.conf` quedo como enlace simbolico.
- El enlace simbolico quedo apuntando al ambiente Green.
- Nginx respondio con `X-Deployment-Color: Blue` al cambiar a Blue.
- Nginx respondio con `X-Deployment-Color: Green` al cambiar a Green.
- La validacion final con `nginx -t` fue exitosa.
