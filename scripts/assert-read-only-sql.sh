#!/usr/bin/env bash

set -euo pipefail

sql_file="${1:?Provide the SQL file to verify.}"

if grep -Ein \
  '^[[:space:]]*(insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|copy|call|execute)[[:space:]]' \
  "$sql_file"; then
  echo "Production smoke SQL contains a forbidden write-capable statement."
  exit 1
fi

echo "Production smoke SQL contains no write-capable statements."
