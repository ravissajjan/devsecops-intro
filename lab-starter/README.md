# containers-lab — Unit 4 starter files

```
lab-starter/
├── app/
│   ├── app.js              the lab app. /health, and /break to make it fail
│   ├── index.html          shows the container ID and health status
│   ├── package.json        ⚠️ deliberately old, vulnerable dependencies
│   ├── Dockerfile          ⚠️ deliberately insecure - four marked PROBLEMs
│   └── Dockerfile.hardened the fixed version, for comparison
├── secrets-demo/
│   ├── config.js           ⚠️ deliberately hardcoded secrets (all fake)
│   └── pre-commit          a git hook that refuses to commit a credential
├── .github/workflows/
│   └── security.yml        SCA + container scan + SAST, with the gate
├── .gitignore              keeps node_modules and .env out of git
├── k8s/
│   ├── deployment.yaml         no health checks
│   ├── deployment-probes.yaml  liveness, readiness, limits, securityContext
│   └── service.yaml            one stable address in front of the pods
└── monitoring/             📖 reference only - not part of the timed session
    ├── metrics.js              a /metrics endpoint written longhand, zero dependencies
    ├── prometheus.yml          how Prometheus finds and scrapes your pods
    ├── alert-rules.yml         an alert per golden signal, plus TargetDown
    ├── grafana-dashboard.json  importable dashboard, one row per golden signal
    └── README.md               instrument → expose → scrape → query → act
```

## ⚠️ The insecure files are insecure on purpose

You cannot practise finding vulnerabilities in code that has none. Three files here are
deliberately wrong, each clearly marked, and each with its fix shown beside it.

**Every credential in these files is fake.** Do not copy these patterns into real work.

## Quick commands

```bash
# build and scan
docker build -t myapp:v1 ./app
trivy image --severity HIGH,CRITICAL myapp:v1

# build and scan the FIXED version, then compare the counts
docker build -f app/Dockerfile.hardened -t myapp:hardened ./app
trivy image --severity HIGH,CRITICAL myapp:hardened

# dependency scan
cd app && npm install && npm audit

# kubernetes
kubectl apply -f k8s/deployment.yaml          # no probes
kubectl apply -f k8s/deployment-probes.yaml  # with probes
kubectl apply -f k8s/service.yaml
kubectl port-forward service/web 8080:80     # load-balanced across pods

# break ONE pod and watch Kubernetes react.
# Forward to the pod, not the Service - otherwise /break and /health hit different pods.
kubectl get pods
kubectl port-forward pod/<pod-name> 8080:3000
curl localhost:8080/break
kubectl get pods -w                          # watch the RESTARTS column (~15s)
kubectl logs <pod-name> --previous           # why it was killed
```

## Three things to notice

1. **`app/Dockerfile` vs `app/Dockerfile.hardened`** — four differences, and one of them
   (the `FROM` line) removes most of the vulnerabilities on its own.
2. **`security.yml` runs the same scan twice.** The first reports everything so the log is
   useful; the second has `exit-code: '1'` and is the actual gate.
3. **`deployment.yaml` has no probes.** Kubernetes will happily keep a broken app "Running"
   forever. `deployment-probes.yaml` is what fixes that.

## Where dashboards actually come from

`monitoring/` is **not** run during the session — the Prometheus and Grafana stack is too heavy
to sit beside minikube in a Codespace. It is there so you can see the half that a finished
dashboard hides: the code that counts things, the text page it publishes, and the config that
fetches it. Start at [monitoring/README.md](monitoring/README.md).
