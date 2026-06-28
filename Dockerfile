FROM php:8.3-apache

RUN echo "TEST BUILD"
RUN docker-php-ext-install mysqli pdo pdo_mysql

COPY . /var/www/html

CMD ["apache2-foreground"]
