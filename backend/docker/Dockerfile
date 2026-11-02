FROM php:8.3-fpm-alpine

# Install Composer first
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install Xdebug with build dependencies
RUN apk add --no-cache --virtual .xdebug-deps $PHPIZE_DEPS linux-headers \
    && pecl install xdebug \
    && docker-php-ext-enable xdebug \
    && apk del .xdebug-deps

# Install system dependencies including PostgreSQL
RUN apk add --no-cache \
    git \
    unzip \
    postgresql-dev \
    postgresql-libs \
    libpng \
    libjpeg-turbo \
    freetype-dev \
    oniguruma-dev \
    icu-dev \
    libxml2-dev \
    && docker-php-ext-install pdo_pgsql pgsql opcache intl bcmath mbstring

# Install the exact locked dependency versions (vendor/ is excluded by .dockerignore)
COPY composer.json composer.lock ./
RUN composer install --optimize-autoloader --no-scripts

COPY . .

COPY docker/xdebug.ini /usr/local/etc/php/conf.d/zz-xdebug.ini

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
