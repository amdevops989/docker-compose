# docker-compose
# 1. Purge the crashed release
helm uninstall loki -n monitoring 2>/dev/null || true

# 2. Run the deployment with s3 mapped as the object_store engine type
helm install loki grafana/loki \
  --namespace monitoring \
  --set deploymentMode=SingleBinary \
  --set loki.auth_enabled=false \
  --set minio.enabled=true \
  --set singleBinary.persistence.size=5Gi \
  --set "loki.schemaConfig.configs[0].from=2024-01-01" \
  --set "loki.schemaConfig.configs[0].store=tsdb" \
  --set "loki.schemaConfig.configs[0].object_store=s3" \
  --set "loki.schemaConfig.configs[0].schema=v13" \
  --set "loki.schemaConfig.configs[0].index.prefix=index_" \
  --set "loki.schemaConfig.configs[0].index.period=24h"


## isntalling before loki prometheus 
helm install prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace