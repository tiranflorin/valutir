FROM php:8.3-fpm-alpine

# Install Composer first
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install Xdebug with build dependencies
RUN apk add --no-cache --virtual .xdebug-deps $PHPIZE_DEPS linux-headers \
    && pecl install xdebug \
    && docker-php-ext-enable xdebug \
    && apk del .xdebug-deps

# Install PDO and PostgreSQL support separately (keeps postgresql-dev)
RUN apk add --no-cache postgresql-dev \
    && docker-php-ext-install pdo pdo_pgsql opcache \
    && apk del postgresql-dev

# Copy application files
COPY composer.json ./
RUN composer install --optimize-autoloader --no-scripts

COPY . .

COPY docker/xdebug.ini /usr/local/etc/php/conf.d/zz-xdebug.ini

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
