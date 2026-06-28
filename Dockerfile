FROM php:8.4-apache

RUN docker-php-ext-install pdo pdo_mysql mysqli

COPY . /var/www/html/

RUN a2enmod rewrite

EXPOSE 80
