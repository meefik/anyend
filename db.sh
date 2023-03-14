#!/bin/sh

docker volume create db
docker run -d --network host --name mongo \
  -v "db:/data/db" \
  -e "MONGO_INITDB_ROOT_USERNAME=admin" \
  -e "MONGO_INITDB_ROOT_PASSWORD=secret" \
  mongo:latest
  