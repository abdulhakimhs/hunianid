#!/bin/sh
set -e

chown -R www-data:www-data storage bootstrap/cache

exec "$@"
