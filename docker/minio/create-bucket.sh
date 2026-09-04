#!/bin/sh
set -eu

until mc alias set local http://minio:9000 minioadmin minioadmin; do
  sleep 1
done

mc mb --ignore-existing "local/${S3_BUCKET:-webnote}"
mc anonymous set none "local/${S3_BUCKET:-webnote}"
