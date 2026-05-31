FROM php:8.3-fpm-alpine AS base
RUN apk add --no-cache postgresql-dev openssl \
    && docker-php-ext-install pdo pdo_pgsql opcache
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts

COPY . .
RUN php bin/console cache:warmup

FROM base AS dev
RUN composer install  # with dev deps for tests

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
