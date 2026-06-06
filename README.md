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


# 1. Add the Kyverno Helm repository
helm repo add kyverno https://kyverno.github.io/kyverno/

# 2. Update your local helm registry
helm repo update

# 3. Install Kyverno into its own namespace
helm install kyverno kyverno/kyverno -n kyverno --create-namespace


Step 1: Install Argo CD
Argo CD runs in its own dedicated namespace and acts as the GitOps synchronization engine.

Bash
# 1. Create the namespace
kubectl create namespace argocd

# 2. Apply the official manifest cluster-wide
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
Access the Argo CD UI:
Wait for the pods to become healthy (kubectl get pods -n argocd), then retrieve your automatically generated admin password:

Bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
Port-forward the UI server to your local machine:

Bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
Now you can log into https://localhost:8080 using the username admin and the password you just printed out.

Step 2: Install Argo Rollouts
Argo Rollouts replaces the standard Kubernetes deployment controller to orchestrate the progressive Canary delivery. It requires two things: the cluster controller components and the kubectl plugin on your local workstation so you can manage releases.

1. Install the Cluster Controller:
Bash
# Create the namespace
kubectl create namespace argo-rollouts

# Apply the controller manifest
kubectl apply -n argo-rollouts -f https://raw.githubusercontent.com/argoproj/argo-rollouts/stable/manifests/install.yaml
2. Install the kubectl argo rollouts CLI Plugin:
To monitor your canary steps from your terminal, download and install the binary locally.

For Linux (AMD64):

Bash
# Download the binary
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64

# Make it executable
chmod +x ./kubectl-argo-rollouts-linux-amd64

# Move it into your PATH execution layer
sudo mv ./kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts
3. Verify the Installations:
Run this command to check if your local plugin is communicating with the cluster successfully:

Bash
kubectl argo rollouts version
Verification Checklist
Before moving forward, check that your cluster pods are clean:

kubectl get pods -n argocd ──> All pods should be Running.

kubectl get pods -n argo-rollouts ──> The controller pod should be Running.

Once both systems are active, your cluster infrastructure is ready to accept the Application manifests we just wrote! Let me know when they're all green.