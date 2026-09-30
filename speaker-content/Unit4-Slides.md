---
marp: true
theme: default
paginate: true
size: 16:9
header: 'Unit 4 — Kubernetes, DevSecOps & Monitoring'
footer: 'CI/CD Course · Unit 4'
style: |
  section { font-size: 26px; }
  section.lead { text-align: center; }
  section.lead h1 { font-size: 54px; }
  h1 { color: #1f4e79; }
  h2 { color: #1f4e79; }
  table { font-size: 22px; }
  code { font-size: 0.9em; }
  section.dense { font-size: 22px; }
  section.dense table { font-size: 17px; }
  pre { font-size: 0.8em; }
  .big { font-size: 40px; font-weight: 700; color: #b30000; text-align: center; }
  .quote { font-size: 32px; font-style: italic; color: #444; text-align: center; }
---

<!-- _class: lead -->
<!-- _header: '' -->
<!-- _paginate: false -->

# Unit 4
## Kubernetes, DevSecOps and Monitoring

**Is what we are shipping safe?**
**And how would we know if it stopped working?**

One 4-hour session · 5 labs · everything in the browser

<!--
Note: minikube takes about two minutes to start, so begin Lab 0 before anything else and let it
run in the background.
-->

---

## Where we are

```
Unit 2   pipeline        build → test → deploy, automatically
Unit 3   containers      package it so it runs anywhere
Unit 4   security        is it safe?        ← you are here
         monitoring      is it healthy?
```

Unit 2 built the pipeline.
Unit 3 built the box your code travels in.
**Nobody has yet asked whether what is inside the box is safe.**

---

## The shape of today

One artifact — **your own container image** — seen through four lenses:

```
your image → deploy it (K8s) → scan it (DevSecOps) → gate it (CI/CD) → watch it (Monitoring)
```

| Lab | You will | Time |
|---|---|---|
| **0** | Log in, start Kubernetes, check tools | 15 min |
| **A** | Deploy, delete a pod, scale, load-balance | 25 min |
| **B** | Scan your image, find real CVEs, fix them, find a secret | 30 min |
| **C** | Build a gate that **fails the build**, then pass it honestly | 35 min |
| **D** | Add probes, break the app, watch Kubernetes repair it | 25 min |

---

<!-- _class: dense -->

## Seven words, before we start

**Security**

| Word | Meaning |
|---|---|
| **DevSecOps** | Security built *into* the pipeline, automatically — not a review at the end |
| **Shift left** | Check early. Minutes at commit time, days in production |
| **CVE** | A public ID for one known vulnerability, e.g. `CVE-2023-44487` |
| **Security gate** | A step that **fails the build**. Not a warning. A stop |

**Monitoring**

| Word | Meaning |
|---|---|
| **Metrics** | Numbers over time — CPU, requests/sec, error rate |
| **Logs** | Individual events — "health check failed at 14:02" |
| **Probe** | A health check **Kubernetes acts on**, without asking anybody |

---

<!-- _class: lead -->

# LAB 0
## Set up — do this now

---

## Lab 0 — run these first

```bash
docker login          # FIRST, before anything pulls an image
minikube start        # ~2 min — let it run while we talk
minikube addons enable metrics-server
```

Then check your tools:

```bash
cd lab-starter
trivy --version
kubectl version --client
trivy image alpine    # warms the vulnerability DB (~40 MB)
```

✅ **CHECKPOINT 0** — one **Ready** node, both tools print a version

<!--
Note: `docker login` comes first for a reason. Docker Hub rate-limits anonymous pulls per IP
address, so a shared network reaches the limit quickly. Trivy pulls images too, which doubles
the exposure.
-->

---

<!-- _class: lead -->

# PART A
## Kubernetes, finished

---

## Where Unit 3 left off

You built an image, pushed it to a registry, and any machine on earth could run it.

But you were still starting containers **one at a time, by hand** — and nothing was watching them.

> **Kubernetes** = a system that runs containers across many machines and keeps them in the state you asked for.

**Desired state**: you declare *what* you want. Kubernetes continuously compares that to reality and repairs the difference.

**You never write the *how*.**

---

## Desired state, in a picture

```
              You: "I want 2 copies"
                        |
                        v
              +---------------------+
              |    Control plane    |
              +----------+----------+
                         |  watches and repairs
                         v
              +---------------------+
              |        Node         |
              |  +-----+   +-----+  |
              |  | Pod |   | Pod |  |
              |  +-----+   +-----+  |
              +---------------------+
```

---

## The four objects

| Object | Job | Everyday equivalent |
|---|---|---|
| **Pod** | One running copy of your container | One worker |
| **Deployment** | Keeps N pods alive, handles updates | A supervisor |
| **Service** | Stable address + load balancing | The shop's phone number |
| **Node** | A machine in the cluster | A branch office |

---

## Services find pods by *label*

```yaml
# The Deployment labels its pods...
template:
  metadata:
    labels:
      app: web

# ...and the Service looks for that label.
spec:
  selector:
    app: web
```

Not by name. Not by IP.

**That is why pods can be destroyed and replaced freely** without anything else needing to know.

---

## Self-healing

Delete a pod that belongs to a Deployment → a replacement appears within seconds.

The Deployment's only job is to keep the declared number of pods running.

<div class="quote">The system repairs itself because you described the goal, not the steps.</div>

This is the single most important idea in the unit.

---

## 🎯 Predict first

I am about to delete a running pod.

<div class="big">What happens?</div>

Write your answer down **before** you run the command.

<!--
Note: the common expectation is that the count drops to one. It does not. The Deployment
notices the gap and creates a replacement within seconds.
-->

---

## LAB A — do it now (25 min)

```bash
docker build -t YOURNAME/devsecops-lab:v1 ./app
docker push YOURNAME/devsecops-lab:v1        # repo must be PUBLIC
```

```bash
kubectl apply -f k8s/deployment.yaml
kubectl get pods                             # 2 Running
kubectl delete pod <one-pod-name>            # ← the moment
kubectl get pods
```

```bash
kubectl apply -f k8s/service.yaml
kubectl port-forward service/web 8080:80
kubectl scale deployment web --replicas=5
```

✅ **CHECKPOINT A**

---

<!-- _class: lead -->

# PART B
## DevSecOps

---

## Why security moved into the pipeline

**The old model:** build for months, then hand it to a security team for review at the end.

Two things go wrong:

1. **Findings arrive too late.** A design flaw found a week before release is enormously expensive. The same flaw found at commit time is a ten-minute fix.
2. **It does not scale.** You deploy fifty times a day. No human review keeps up.

---

## DevSecOps and shift left

> **DevSecOps** = building security *into* the delivery pipeline — automatic, continuous, and everyone's job — rather than a gate held by one team at the end.

> **Shift left** = move checks earlier, because the cost of fixing rises the later you find it.

```
commit ──── build ──── test ──── release ──── production
  │                                              │
 cheap ──────────── cost of fixing ─────────── ruinous
```

<div class="quote">Automate the checks. Run them early. Make them block.</div>

---

<!-- _class: dense -->

## ⭐ The three kinds of scanning

**This is the most-asked DevSecOps interview question.**

| | **SAST** | **DAST** | **SCA** |
|---|---|---|---|
| Looks at | **Your source code** | **Your running app**, from outside | **Your dependencies** |
| Needs app running? | No | **Yes** | No |
| Finds | Injection, hardcoded secrets, unsafe functions | Broken auth, XSS, bad headers | Known CVEs in libraries |
| When | Every commit | Against a test environment | Every commit |
| Tools | SonarQube, CodeQL, Semgrep | OWASP ZAP, Burp Suite | **Trivy**, `npm audit`, Snyk |
| Blind spot | Can't see runtime behaviour | Can't see code it never reaches | Only *published* vulnerabilities |

---

## The one-line version

<div class="quote">
🎭 SAST reads the recipe.<br/>
DAST tastes the food.<br/>
SCA checks whether the ingredients have been recalled.
</div>

**Container image scanning** = SCA applied to *everything* inside the image — your dependencies **and** the OS packages in the base image.

---

## 🎯 Predict first

You built your image from an **official** Docker base image, used by millions of people.

<div class="big">How many known vulnerabilities are inside it?</div>

Say your number out loud before anyone runs the scan.

<!--
Note: most people guess between zero and five. An image built on `node:16-alpine` typically
reports dozens of HIGH and CRITICAL findings, none of them in code you wrote.
-->

---

## LAB B.1 — scan your own image

```bash
trivy image --severity HIGH,CRITICAL YOURNAME/devsecops-lab:v1
```

Every row is a **real, published vulnerability**, with a CVE number, in software **you did not write and never chose**.

> **CVE** — Common Vulnerabilities and Exposures. A public ID for one specific known flaw, e.g. `CVE-2023-44487`. Anyone can look it up — including attackers.

⚠️ Your numbers will not match your neighbour's. The database updates daily. **Compare direction, not figures.**

<div class="quote">You did nothing wrong. You inherited this.</div>

---

## Why your image had vulnerabilities

```
your image
 └── node:16-alpine          ← END OF LIFE, no longer patched
      └── Alpine packages        ← nearly all the CVEs live here
      └── Node.js runtime
 └── node_modules            ← old pinned libraries
 └── app.js                  ← the only part you wrote
```

**You inherit the security posture of everything underneath you.**

This is the software supply chain, in one command.

---

## The container hardening rules

| Rule | Why |
|---|---|
| Use a **currently supported** base image | EOL images stop receiving patches entirely |
| Prefer **slim / alpine / distroless** | Fewer packages = fewer CVEs = smaller attack surface |
| **Rebuild regularly** | An image built six months ago is six months out of date, untouched |
| Never `:latest` in production | You cannot patch what you cannot identify |
| Run as **non-root** (`USER node`) | Limits the damage if the app is compromised |
| `COPY` only what you need | `COPY . .` ships `.git`, `.env` and stray credentials |

<div class="quote">The cheapest security win in containers is almost always changing one <code>FROM</code> line.</div>

---

## LAB B.2–B.3 — two separate jobs

**Dependencies (SCA on your code):**
```bash
cd app && npm install && npm audit
npm audit fix --dry-run     # ⚠️ do NOT fix for real yet — Lab C needs these
```

**The image (SCA on the base):**
```bash
docker build -f app/Dockerfile.hardened -t myapp:hardened ./app
trivy image --severity HIGH,CRITICAL myapp:hardened
docker run --rm myapp:hardened whoami      # prints 'node', not 'root'
```

🧠 The `minimist` / `lodash` findings **do not go away** — the hardened Dockerfile only changed the base image.
**OS CVEs and dependency CVEs are two separate problems.**

---

## Secrets

A **secret** is anything that grants access: passwords, API keys, tokens, certificates.

<div class="big">Secrets never go in source code.</div>

Not in `config.js`. Not in the Dockerfile. Not in the image. Not in the YAML.

```js
// ❌  apiKey: 'sk_live_51H8xQ2...'
// ✅  apiKey: process.env.API_KEY
```

---

## 🎯 You committed a secret, then deleted the line

<div class="big">Is it safe now?</div>

---

## No. Git keeps history.

A secret committed on Monday and deleted on Tuesday is **still readable by anyone who clones the repository — forever**.

Bots scan public GitHub for exactly this, continuously.
Exposed cloud keys are typically abused within **minutes**.

> **The only real fix is to rotate the secret** — invalidate it at the source so the leaked copy is worthless.

Removing it from history is housekeeping. **Rotation is the fix.**

---

## Where secrets should live

| Place | Use |
|---|---|
| Environment variables | How the app reads them at run time |
| **GitHub Secrets** | CI/CD credentials — encrypted, masked in logs |
| Kubernetes Secrets | Values injected into pods |
| Vault, AWS Secrets Manager | Production, with rotation and audit logs |

✅ **CHECKPOINT B**

---

<!-- _class: lead -->

# ☕ BREAK
## 15 minutes

---

<!-- _class: lead -->

# PART C
## The security gate

---

## A report nobody reads changes nothing

A **gate** is a pipeline step that **fails the build** when a rule is broken.

```
commit → SAST → build → SCA → image scan → 🚪 GATE → registry → deploy
                                             ↑
                          fails here = nothing vulnerable reaches the registry
```

Not a warning. **A stop.**

---

## A gate is just an exit code

```yaml
- name: Fail on HIGH or CRITICAL
  uses: aquasecurity/trivy-action@master
  with:
    severity: 'HIGH,CRITICAL'
    ignore-unfixed: true    # don't block on CVEs with no patch available
    exit-code: '1'          # ← THIS LINE IS THE GATE
```

The tool exits non-zero → the CI job fails → the pipeline stops.

**That is all a gate is.**

---

## Setting the threshold

| Severity | Typical policy |
|---|---|
| CRITICAL | Block |
| HIGH | Block, with `ignore-unfixed` |
| MEDIUM / LOW | Report only, review periodically |

⚠️ Gate on **everything** and the build is permanently red → people ignore it or switch it off.

That is the **worst** outcome: now you have the *illusion* of safety.

> Exceptions must be **explicit, dated and commented**.
> A silent `|| true` is how a pipeline becomes decorative.

---

## LAB C — three jobs, three kinds of scanning

```bash
cp -r /workspaces/*/lab-starter ~/devsecops-lab && cd ~/devsecops-lab
git init -b main && git add . && git commit -m "lab starter"
gh repo create devsecops-lab --public --source=. --push
```

| Job | Kind | Question it answers |
|---|---|---|
| `dependencies` | **SCA** | Are the libraries I depend on vulnerable? |
| `image` | **Container scan** | Is the image I'm about to ship vulnerable? |
| `code` | **SAST** | Is the code *I wrote* insecure? |

> If push fails on workflow scope: `gh auth refresh -h github.com -s workflow`

---

## 🔴 The red X

Two jobs should be red — **not one**.

- **Container scan** → old base image
- **Dependency scan** → old `minimist` and `lodash`

**This red X is the entire point of the lab.**

<div class="quote">
Nobody had to remember to check.<br/>
Nobody had to be the unpopular person who says no.<br/>
<strong>The pipeline said no.</strong>
</div>

<!--
Note: two jobs fail here, not one — the container scan and the dependency scan. OS-level CVEs
and dependency CVEs are separate problems, and both have to be fixed before the build is green.
-->

---

## Make it pass — honestly

**Fix 1 — the dependencies:**
```bash
cd app && npm install minimist@latest lodash@latest
npm audit --audit-level=high
```

**Fix 2 — the image:**
```bash
cp app/Dockerfile.hardened app/Dockerfile
git add -A && git commit -m "update deps, supported base image, drop root" && git push
```

⚠️ **The dishonest fix** is deleting the gate, dropping to `CRITICAL` only, or adding `|| true`.
The build goes green and **nothing is safer**.

<!--
Note: this is a values question more than a technical one. The dishonest fixes are exactly what
happens in real teams under deadline pressure, which is why they are worth naming out loud
rather than leaving implied.
-->

---

<!-- _class: dense -->

## OWASP Top 10 — recognise the names

| | Risk | One-line meaning |
|---|---|---|
| A01 | Broken Access Control | Users reach things that are not theirs |
| A02 | Cryptographic Failures | Sensitive data weakly or not encrypted |
| A03 | Injection | Untrusted input executed as code |
| A04 | Insecure Design | The design itself is unsafe |
| A05 | Security Misconfiguration | Defaults left on, debug enabled, ports open |
| **A06** | **Vulnerable and Outdated Components** | ← **what your scan found** |
| A07 | Identification & Authentication Failures | Weak login, poor sessions |
| A08 | Software & Data Integrity Failures | Trusting unverified code or updates |
| **A09** | **Logging and Monitoring Failures** | ← **the rest of this session** |
| A10 | Server-Side Request Forgery | Server tricked into fetching attacker URLs |

✅ **CHECKPOINT C**

---

<!-- _class: lead -->

# PART D
## Monitoring

---

## The three pillars of observability

| | Answers | Example |
|---|---|---|
| **Metrics** | *How much / how many?* Numbers over time | CPU 80%, 300 req/sec |
| **Logs** | *What exactly happened?* Individual events | `health check failed` |
| **Traces** | *Where did the time go?* One request across services | web → api → db, 400 ms |

**Metrics tell you *that* something is wrong.**
**Logs and traces tell you *what* and *where*.**

---

## The four golden signals

For any service, measure these four:

| Signal | Question |
|---|---|
| **Latency** | How long do requests take? |
| **Traffic** | How much demand is there? |
| **Errors** | How many requests are failing? |
| **Saturation** | How full is the system — CPU, memory, disk? |

---

## Prometheus, Grafana, Alertmanager

| Tool | Job |
|---|---|
| **Prometheus** | Collects and stores metrics over time; evaluates alert rules |
| **Grafana** | Draws the dashboards |
| **Alertmanager** | Decides who gets told; stops alert storms |

```
  +--------------+    scrapes every 15s    +--------------+
  | App /metrics | <---------------------- |  Prometheus  |
  +--------------+                         +------+-------+
                                                  |
                              +-------------------+-------------------+
                              v                                       v
                    +-------------------+                  +--------------------+
                    | Grafana dashboards|                  | Alertmanager -> you|
                    +-------------------+                  +--------------------+
```

> ⭐ **Exam favourite: Prometheus PULLS (scrapes).** Note the arrow direction. Most people guess push.

---

<!-- _class: dense -->

## See one for real — `play.grafana.org`

Grafana Labs runs a **public sandbox**. No login, no install, nothing to set up.
Live data, updating while you watch. Read-only — you cannot break it.

| What you see on screen | The concept behind it |
|---|---|
| A time-series graph | **Metrics** — numbers over time, the first pillar |
| The time-range picker (top right) | The same query over any window: *"when did it start?"* |
| A panel → **Edit** → the query | The dashboard is not the data. **The query is** |
| A stat panel turning red at a threshold | One short step from an **alert rule** |
| A logs panel beside the graphs | **Logs** — the second pillar, in the same place |

> This is what your `/metrics` endpoint would look like once something was scraping it.

<!--
Note: open play.grafana.org without signing in and pick any dashboard with live graphs. Name the
four golden signals as you pass panels showing them: latency, traffic, errors, saturation.
Everything on that screen still needs a human looking at it — which is the problem probes solve.
-->

---

## But where do the numbers come from?

A dashboard is the **last** step of six. Every monitoring system is this chain.

```
 1. INSTRUMENT     your code counts things            metrics.js
 2. EXPOSE         a plain text page at /metrics      GET /metrics
 3. SCRAPE         Prometheus fetches it on a timer   prometheus.yml
 4. STORE          kept as a time series
 5. QUERY + DRAW   PromQL, rendered as a panel        the dashboard
 6. ACT            a threshold with consequences      alert rule, or a probe
```

Step 2 is the one people get wrong. **Your app does not send anything anywhere.**
It publishes a page and waits.

```
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/health",status="200"} 312
http_requests_total{method="GET",path="/health",status="500"} 9
```

> That is the entire interface between your app and every monitoring tool in the world.

---

<!-- _class: dense -->

## A dashboard worth copying — one row per signal

`lab-starter/monitoring/grafana-dashboard.json` — import it and read the queries.

| Panel | Signal | Query |
|---|---|---|
| Requests/sec by path | **Traffic** | `sum by (path) (rate(http_requests_total[1m]))` |
| Requests/sec by status | **Errors** | `sum by (status) (rate(http_requests_total[1m]))` |
| Error rate % | **Errors** | 5xx rate ÷ total rate — a *ratio*, so traffic growth doesn't fake an improvement |
| p50 / p95 / p99 | **Latency** | `histogram_quantile(0.95, sum by (le) (rate(..._bucket[5m])))` |
| Memory per pod | **Saturation** | `process_resident_memory_bytes` |
| Event loop lag | **Saturation** | `nodejs_eventloop_lag_seconds` — rises *before* CPU does |

**Counters are never read raw.** "4,912,338 requests since startup" is useless.
`rate()` turns it into "31 per second, right now" — the number you actually wanted.

---

## Two things that will catch you out

**1. Averages lie.**
99 requests at 10 ms, 1 request at 5 s → average **60 ms**, looks fine.
p99 is **5 seconds**, and that user is suffering every hundredth request.

<div class="quote">Averages hide exactly the users you most need to know about.</div>

**2. Labels are unbounded, and that kills Prometheus.**

```js
// ❌ a new time series for every user, forever
http_requests_total{path="/users/8837461"}

// ✅ one series per route
http_requests_total{path="/users/:id"}
```

Never put a user ID, email, session token or raw URL in a label.

---

## But a dashboard needs a human

A **health probe** closes the loop: **measure → decide → act**, with nobody in the middle.

| Probe | Question | If it fails |
|---|---|---|
| **liveness** | Is this container alive? | Kubernetes **restarts** it |
| **readiness** | Should it receive traffic now? | Removed from the Service, **not** restarted |
| **startup** | Has a slow app finished booting? | Holds the other probes off until it has |

---

## What a probe looks like

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5    # let the app boot before judging it
  periodSeconds: 5
  failureThreshold: 3       # 3 consecutive failures, then restart
```

**The classic mistake:** `initialDelaySeconds` too low for a slow-starting app.
Kubernetes kills it during startup → it restarts → killed again → **`CrashLoopBackOff` caused entirely by the probe.**

**Why readiness matters separately:** during a rolling update a new pod is *Running* before it is *ready*. Without a readiness probe, users hit a half-started app.

---

## A probe and an alert are the same shape

| | **Liveness probe** | **Alert rule** |
|---|---|---|
| Condition | `/health` returns non-200 | `error rate > 5%` |
| Must hold for | `failureThreshold: 3` × `periodSeconds: 5` | `for: 2m` |
| What happens | Kubernetes **restarts the container** | Alertmanager **wakes a human** |
| Takes | ~15 seconds | as long as the human takes |

Both have a *"don't react to one bad second"* clause. The only difference is what is attached to the end.

> **Prefer the probe wherever the fix is mechanical.**
> Every alert a machine could have handled is an alert that trains people to ignore alerts.

⚠️ And alert on **`TargetDown`** too — if metrics stop arriving, no other rule can fire.
**A silent dashboard is not a healthy one.** That is OWASP **A09**.

---

## 🎯 Predict first

Your app has a `/break` endpoint that makes its health check fail — **running, but useless.**
That is how most real outages actually look.

**Without probes:** the pod stays `Running`, 0 restarts. Kubernetes cannot see inside your container.

<div class="big">With probes in place, what happens when I break it?</div>

---

## LAB D — break it, watch it heal

```bash
kubectl port-forward pod/<pod-name> 8080:3000    # a POD, not the Service
```

```bash
curl localhost:8080/break
kubectl get pods -w        # watch RESTARTS for ~30 seconds
kubectl describe pod <name> | grep -A10 Events
```

**~15 seconds** to act: probe every 5s × 3 consecutive failures.

🧠 **The other pod kept serving the whole time.** Your users never saw the outage.

✅ **CHECKPOINT D**

---

## The takeaway command

```bash
kubectl logs <pod> --previous      # logs from the container that was KILLED
kubectl logs <pod>                 # logs from the fresh one
kubectl top pods                   # live CPU and memory
```

The restart gave you a brand-new container with brand-new logs.
**The evidence of *why* it was killed lives in the dead container.**

> The first thing to reach for whenever you investigate a `CrashLoopBackOff`.

---

<!-- _class: lead -->

# Wrap-up

---

## Incident response

<div class="quote">detect → triage → <strong>mitigate</strong> → fix → learn</div>

**Mitigate before you diagnose.** Restore service first, understand it afterwards.

A **blameless postmortem** assumes good people hit bad systems.
If engineers fear blame they hide incidents — and you lose the information you needed most.

---

## DORA metrics

Four numbers that predict delivery performance:

| Metric | Meaning |
|---|---|
| **Deployment frequency** | How often you ship |
| **Lead time for changes** | Commit → production |
| **Change failure rate** | % of deploys causing a problem |
| **Time to restore** (MTTR) | How fast you recover |

> The counter-intuitive finding: teams that deploy **more** often are **more** stable.
> Small, frequent, reversible changes are safer than rare large ones.

---

## DevSecOps metrics

| Metric | Why |
|---|---|
| Mean time to remediate a vulnerability | Finding it is not fixing it |
| % of builds passing the security gate | A sudden 100% may mean somebody weakened the gate |
| Number of exceptions / suppressions | Should trend **down**, not up |
| Secrets detected in commits | Should be **zero** |

---

<!-- _class: dense -->

## What we named but did not run — and why

| Tool | Why not today | What to know anyway |
|---|---|---|
| **SonarQube** | Needs a server or a SonarCloud account + token | Same category as CodeQL: **SAST**. You ran CodeQL instead |
| **OWASP ZAP** | **DAST** needs a deployed target and time we don't have | Probes a *running* app from the outside |
| **Prometheus + Grafana** | The full stack OOMs a 2-core Codespace next to minikube | You saw Grafana live on `play.grafana.org`; probes gave you the *acting* version |
| **Terraform / Ansible** | Infrastructure as Code is its own unit | Same idea as Kubernetes YAML: declare desired state |

> Being able to **name** these and say which category they belong to is worth marks.

---

## 📌 The eight things to remember

1. **Kubernetes** repairs reality to match your declared desired state.
2. **DevSecOps** = security automated into the pipeline; **shift left** = check early.
3. **SAST** reads your code · **DAST** probes your running app · **SCA** checks your dependencies.
4. Most CVEs in your image come from the **base image**, not your code.
5. Secrets never go in source code — and deleting the line does not undo a leak. **Rotate.**
6. A **gate** fails the build. Without it, a scan is only a suggestion.
7. **Metrics, logs, traces** are the three pillars; the four golden signals are what to watch.
8. A **probe** is monitoring with the loop closed — it acts, in seconds, without a human.

---

## Rules that will save you

1. Scan the image you are **shipping**, not the one on your laptop.
2. A scan without a gate is a **suggestion**. Someone will ignore it.
3. **Rotate** leaked secrets. Deleting the commit is housekeeping, not a fix.
4. **Base image first.** One `FROM` line usually removes most of your CVEs.
5. Set `initialDelaySeconds` **longer** than your app's real start time.
6. Never silence a finding without a **dated comment** saying why.

---

## When something breaks

| Message | Meaning |
|---|---|
| `ImagePullBackOff` | Wrong image name, or the repo is private |
| `CrashLoopBackOff` | App dies at startup → `kubectl logs <pod>` |
| Restarts climbing after adding probes | `initialDelaySeconds` too short |
| Trivy finds 0 vulnerabilities | You scanned the hardened image, or the wrong tag |
| `npm audit` finds nothing | Run it beside `package.json`, after `npm install` |
| Workflow never runs | It must be at `.github/workflows/` in the repo **root** |

---

## The whole course in one sentence

<div class="quote">
Unit 2 automated delivery.<br/>
Unit 3 made it portable.<br/>
Unit 4 made it <strong>safe</strong> and <strong>observable</strong>.
</div>

---

<!-- _class: lead -->

# The one sentence

## Automate the security checks, run them early, make them block

## — and give the system health signals it can act on without waking anyone up.

---

## Homework & revision

| Part | What | Marks |
|---|---|---|
| **1** | Practical T1–T7: deploy, scan, fix, harden, **gate**, secrets, probes | 60 |
| **2** | Run all three scan types on your own project + 150–200 word comparison | 15 |
| **3** | Written: "we ran a scan so we're secure", the dishonest fix, the leaked AWS key, `CrashLoopBackOff` | 15 |
| **4** | Reflection: your CVE guess vs the real number | 10 |

- **Takeaway sheet** — `Unit4-Takeaway-Sheet.md`. One page. Print it.
- **Notes** — `Unit4-Notes.md`. Every concept, glossary, 17 exam questions.

**Two tables to memorise:** SAST vs DAST vs SCA · liveness vs readiness.

> 💡 **Stop your Codespace before you leave.** ☰ → *My Codespaces* → **Stop**.
