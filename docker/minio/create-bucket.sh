#!/bin/sh
set -eu

until mc alias set local http://minio:9000 minioadmin minioadmin; do
  sleep 1
done

mc mb --ignore-existing "local/${S3_BUCKET:-webnote}"
mc anonymous set none "local/${S3_BUCKET:-webnote}"

cat >/tmp/cors.json <<'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000", "http://127.0.0.1:3000"],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

mc cors set "local/${S3_BUCKET:-webnote}" /tmp/cors.json
