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


## istio ! 

istioctl install --set profile=demo -y 

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
## installing argo rollout dashboard
For Linux:
Bash
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x ./kubectl-argo-rollouts-linux-amd64
sudo mv ./kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts

kubectl argo rollouts dashboard


# 1. Add the Kasten Helm repository
helm repo add kasten https://charts.kasten.io/

# 2. Create the kasten-io namespace
kubectl create namespace kasten-io

# Phase 2: Setup the CSI Core Engine first 🏗️
The reason Kasten failed initially is that Minikube's default standard storage class cannot take snapshots. We must install the official Kubernetes VolumeSnapshot APIs and enable Minikube's CSI Hostpath Driver before installing Kasten.

1. Install Upstream VolumeSnapshot CRDs
This teaches your cluster's API server what a VolumeSnapshotClass actually is:

Bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
2. Enable Minikube CSI Addons
Now activate the physical controllers that interact with those APIs:

Bash
minikube addons enable volumesnapshots
minikube addons enable csi-hostpath-driver
3. Authorize the Snapshot Engine
Give Kasten explicit clearance to use Minikube's CSI engine for local actions by applying this annotation tag:

Bash
kubectl annotate volumesnapshotclass csi-hostpath-snapclass \
  k10.kasten.io/is-snapshot-class=true --overwrite

Phase 3: Fresh Kasten K10 Installation 📥
Now that the storage backbone is solid, let's deploy Kasten.

Bash
# 1. Add the official repository
helm repo add kasten https://charts.kasten.io/
helm repo update

# 2. Create the clean namespace
kubectl create namespace kasten-io

# 3. Install Kasten K10 
helm install k10 kasten/k10 --namespace=kasten-io

Bash
//

kubectl create token k10-k10 -n kasten-io --duration=24h


kubectl get secret --namespace kasten-io \
  $(kubectl get serviceaccount k10-k10 -n kasten-io -o jsonpath="{.secrets[0].name}") \
  -o jsonpath="{.data.token}" | base64 --decode; echo
(If your Kubernetes version is 1.24+, tokens aren't auto-generated in secrets. Use this instead: kubectl create token k10-k10 -n kasten-io)

Step 3: Log In
Open your browser and navigate to:
http://localhost:8080/k10/#/

Paste the extracted token string into the authentication prompt to access the dashboard interface.


kubectl create clusterrolebinding k10-default-admin-binding \
  --clusterrole=cluster-admin \
  --serviceaccount=kasten-io:default


  kubectl annotate volumesnapshotclass csi-hostpath-snapclass \
  k10.kasten.io/is-snapshot-class=true --overwrite

kubectl apply -f - <<EOF
apiVersion: config.kio.kasten.io/v1alpha1
kind: Profile
metadata:
  name: kanister-profile
  namespace: kasten-io
spec:
  type: Location
  locationSpec:
    type: ObjectStore
    objectStore:
      name: mock-local-vault
      objectStoreType: S3
      endpoint: http://127.0.0.1:9000
      region: us-east-1
      path: k10/cleanup-vault
      pathType: Directory
    credential:
      secretType: AwsAccessKey
      secret:
        apiVersion: v1
        kind: Secret
        name: non-existent-secret
        namespace: kasten-io
EOF