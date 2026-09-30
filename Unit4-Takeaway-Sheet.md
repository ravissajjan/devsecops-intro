# Unit 4 — Takeaway Sheet
### Kubernetes, DevSecOps & Monitoring on one page. Print it. Revise from it.

---

## 1. Every idea as a picture

| Concept | Picture |
|---|---|
| **Pod** | One **worker** |
| **Deployment** | A **supervisor**: "always keep 3 at the counter" |
| **Service** | The shop's **phone number** — staff change, number doesn't |
| **Desired state** | You say what you want; the system fixes reality to match |
| **Shift left** | Catching it at the **door**, not at the till |
| **SAST** | Reading the **recipe** |
| **DAST** | Tasting the **food** |
| **SCA** | Checking whether the **ingredients were recalled** |
| **Security gate** | A **turnstile** — no valid ticket, no entry. It doesn't argue |
| **Secret in git** | A **letter already posted**. Deleting your copy changes nothing |
| **Metrics / logs** | The **dashboard** vs the **flight recorder** |
| **Liveness probe** | A **pulse check** — no pulse, restart |
| **Readiness probe** | "**Ready for customers?**" — if not, stop sending them |

---

## 2. Kubernetes in four objects

| Object | Job |
|---|---|
| **Pod** | Smallest unit. One running container (usually) |
| **Deployment** | Keeps N pods alive; handles rolling updates |
| **Service** | Stable address in front of pods; load-balances; finds pods by **label** |
| **Node** | A machine in the cluster |

Delete a pod → a replacement appears in seconds. That is **self-healing**.

```bash
kubectl apply -f deployment.yaml     kubectl get pods
kubectl delete pod <name>            kubectl scale deployment web --replicas=5
kubectl logs <pod>                   kubectl logs <pod> --previous   # the KILLED container
kubectl describe pod <name>          kubectl get pods -w
kubectl top pods                     # needs: minikube addons enable metrics-server
kubectl port-forward pod/<name> 8080:3000     # one specific pod
kubectl port-forward service/web 8080:80      # load-balanced
```

---

## 3. The scanning table ⭐

**Learn this one. It is the most-asked DevSecOps interview question.**

| | **SAST** | **DAST** | **SCA** |
|---|---|---|---|
| Looks at | Your **source code** | Your **running app** | Your **dependencies** |
| App running? | No | **Yes** | No |
| Finds | Injection, hardcoded secrets | Broken auth, XSS, bad headers | Known CVEs in libraries |
| Tools | SonarQube, **CodeQL**, Semgrep | OWASP ZAP, Burp | **Trivy**, `npm audit`, Dependency-Check |

**Container scanning** = SCA applied to everything in the image, including the OS packages
in the base image.

---

## 4. Why your image had 40 CVEs

```
your image
 └── node:16-alpine        ← END OF LIFE. Most CVEs live here
      └── OS packages
 └── node_modules          ← old pinned libraries
 └── app.js                ← the only part you wrote
```

| Rule | Why |
|---|---|
| Supported base image | EOL images get **no** patches |
| slim / alpine / distroless | Fewer packages, fewer CVEs |
| Rebuild regularly | An untouched image still rots |
| Never `:latest` | You can't patch what you can't identify |
| `USER node` | Don't run as root |
| `COPY` only what you need | `COPY . .` ships `.git` and `.env` |

> **The cheapest security win in containers is changing one `FROM` line.**

---

## 5. The gate

```
commit → SAST → build → SCA → image scan → 🚪 GATE → registry → deploy
                                             ↑
                        fails here = nothing vulnerable reaches the registry
```

A gate is just an **exit code**:

```yaml
- uses: aquasecurity/trivy-action@master
  with:
    severity: 'HIGH,CRITICAL'
    ignore-unfixed: true     # no patch exists yet, so don't block on it
    exit-code: '1'           # ← this line IS the gate
```

| Severity | Typical policy |
|---|---|
| CRITICAL | Block |
| HIGH | Block, with `ignore-unfixed` |
| MEDIUM / LOW | Report only |

> ⚠️ Gating on everything makes the build permanently red, so people switch it off — and now
> you have the **illusion** of safety. Exceptions must be explicit, dated and commented.
> A silent `|| true` makes a pipeline decorative.

---

## 6. Secrets

**Never in source code.** Not in `config.js`, the Dockerfile, the image or the YAML.

```js
// ❌  apiKey: 'sk_live_51H8xQ2...'
// ✅  apiKey: process.env.API_KEY
```

**Committed a secret?** Deleting the line does **not** help — it is in git history forever, and
bots scan public GitHub continuously. **Rotate the secret.** That is the only real fix.

Where they belong: environment variables → GitHub Secrets → Kubernetes Secrets → Vault / AWS
Secrets Manager.

---

## 7. OWASP Top 10 — the ones to name

| | Risk |
|---|---|
| A01 | Broken Access Control |
| A03 | Injection (SQL, command, XSS) |
| A05 | Security Misconfiguration |
| **A06** | **Vulnerable and Outdated Components** ← what your scan found |
| **A09** | **Logging and Monitoring Failures** ← the breach nobody noticed |

---

## 8. Monitoring

**Three pillars:** **metrics** (numbers over time) · **logs** (individual events) ·
**traces** (one request's journey).

**Four golden signals:** **latency** · **traffic** · **errors** · **saturation**.

| Tool | Job |
|---|---|
| **Prometheus** | Collects + stores metrics, evaluates alerts. **Pulls** from `/metrics` |
| **Grafana** | Draws the dashboards |
| **Alertmanager** | Decides who gets woken, prevents alert storms |

> Exam favourite: Prometheus **pulls** (scrapes). Most people guess push.

---

## 9. Probes — monitoring that acts

| Probe | Question | If it fails |
|---|---|---|
| **liveness** | Is it alive? | **Restarts** the container |
| **readiness** | Ready for traffic? | Removed from the **Service**, not restarted |
| **startup** | Finished booting? | Holds the others off meanwhile |

```yaml
livenessProbe:
  httpGet: { path: /health, port: 3000 }
  initialDelaySeconds: 5     # too low = CrashLoopBackOff on slow apps
  periodSeconds: 5
  failureThreshold: 3
```

**Readiness matters during rolling updates:** a new pod is Running before it is *ready*. Without
a readiness probe, users hit a half-started app.

---

## 10. Metrics that matter

**DORA:** deployment frequency · lead time for changes · change failure rate · time to restore.

> Teams that deploy **more often** are **more stable**. Small reversible changes beat rare big ones.

**DevSecOps:** time to remediate · % builds passing the gate · number of suppressions (should
fall) · secrets committed (should be zero).

**Incident response:** detect → triage → **mitigate** → fix → learn.
Restore service first, diagnose afterwards. Run **blameless** postmortems — if people fear blame,
they hide incidents.

---

## 11. Rules that will save you

1. **Scan the image you are shipping, not the one on your laptop.**
2. **A scan without a gate is a suggestion.** Someone will ignore it.
3. **Rotate leaked secrets.** Deleting the commit is housekeeping, not a fix.
4. **Base image first.** One `FROM` line usually removes most of your CVEs.
5. **Set `initialDelaySeconds` longer than your app's real start time.**
6. **Never silence a finding without a dated comment saying why.**

---

## 12. When something breaks

| Message | Meaning |
|---|---|
| `ImagePullBackOff` | Wrong image name, or the repo is private |
| `CrashLoopBackOff` | App dies at startup → `kubectl logs <pod>` |
| Restarts climbing after adding probes | `initialDelaySeconds` too short |
| Trivy finds 0 vulnerabilities | You scanned the hardened image, or the wrong tag |
| `npm audit` finds nothing | Run it in the folder with `package.json`, after `npm install` |
| Workflow never runs | It must be at `.github/workflows/` in the repo **root** |

---

## 13. Six answers worth memorising

1. **What is DevSecOps?** Security automated into the delivery pipeline — continuous, everyone's
   job — instead of a manual review at the end.
2. **SAST vs DAST vs SCA?** Code / running app / dependencies. Only DAST needs the app running.
3. **Where did my image's CVEs come from?** The base image, mostly. Fix by moving to a supported,
   minimal one and rebuilding regularly.
4. **What makes a scan a gate?** A non-zero exit code that fails the build.
5. **Liveness vs readiness?** Liveness failing **restarts** the container; readiness failing takes
   it **out of the Service** without restarting it.
6. **Why did they leak a secret if they deleted it?** Git history. The fix is **rotation**.

---

> **The one sentence:**
> **Automate the security checks, run them early, make them block — and give the system health
> signals it can act on without waking anyone up.**
