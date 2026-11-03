# syntax=docker/dockerfile:1
#
# The backend image: FrankenPHP (Caddy with PHP built in) serving the Symfony API on :8080.
#
#   dev   local development (docker-compose.yml): Xdebug, dev dependencies, code bind-mounted
#   prod  production: no dev dependencies or Xdebug, OPcache, cache warmed at build, non-root,
#         no secrets inside; every setting comes from real environment variables at run time.
#
# Build the production image locally:  docker build -f docker/Dockerfile --target prod -t valutir-api:prod .
# Bump FRANKENPHP_VERSION (an exact tag) deliberately; check the release notes first.
ARG FRANKENPHP_VERSION=1.13.1-php8.3-alpine

FROM dunglas/frankenphp:${FRANKENPHP_VERSION} AS base

WORKDIR /var/www/html

# PHP extensions ValuTir needs (install-php-extensions ships with the FrankenPHP image).
RUN install-php-extensions pdo_pgsql intl opcache bcmath zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY docker/Caddyfile /etc/frankenphp/Caddyfile
COPY docker/php.ini $PHP_INI_DIR/conf.d/zz-app.ini

EXPOSE 8080
CMD ["frankenphp", "run", "--config", "/etc/frankenphp/Caddyfile"]


FROM base AS dev

RUN apk add --no-cache git unzip \
    && install-php-extensions xdebug \
    && cp "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"
COPY docker/xdebug.ini $PHP_INI_DIR/conf.d/zz-xdebug.ini

# docker-compose.yml bind-mounts the project over /var/www/html; installing here makes the image
# usable on its own too.
COPY composer.json composer.lock symfony.lock ./
RUN composer install --no-interaction --no-scripts
COPY . .


FROM base AS prod

ENV APP_ENV=prod \
    APP_DEBUG=0

RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/php-prod.ini $PHP_INI_DIR/conf.d/zz-prod.ini

# Dependencies first, so code-only changes reuse this layer.
COPY composer.json composer.lock symfony.lock ./
RUN composer install --no-dev --no-interaction --no-scripts --no-autoloader --prefer-dist

COPY . .

# No .env file is ever copied in (.dockerignore). Symfony needs one to boot, so the image carries a
# compiled stand-in with no secrets; real environment variables always take precedence over it.
# The build-only DATABASE_URL lets cache:warmup compile the container; nothing connects to it.
RUN printf "<?php\n\nreturn ['APP_ENV' => 'prod', 'APP_DEBUG' => '0'];\n" > .env.local.php \
    && composer dump-autoload --no-dev --classmap-authoritative --no-interaction \
    && APP_SECRET=build-only \
       DATABASE_URL='postgresql://build:build@127.0.0.1:5432/build?serverVersion=16&charset=utf8' \
       MAILER_DSN='null://null' DEFAULT_URI='http://localhost' \
       JWT_SECRET_KEY=/dev/null JWT_PUBLIC_KEY=/dev/null JWT_PASSPHRASE=build-only \
       php bin/console cache:warmup --no-interaction \
    && rm -f /usr/bin/composer

# Run as an unprivileged user: it owns only what it must write (Symfony's var/, Caddy's state).
RUN adduser -D -H -u 10001 app \
    && chown -R app:app var /data/caddy /config/caddy
USER app

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8080/health || exit 1
