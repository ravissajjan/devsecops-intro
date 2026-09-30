# Unit 4 — Student Lab Handout
### Kubernetes, DevSecOps and Monitoring

> Tick each box. Raise your hand at every ✅ CHECKPOINT.
> One 4-hour session. Labs **A** and **D** need Kubernetes; labs **B** and **C** do not.

> 🔵 Finished a lab early? Each checkpoint has a **CHALLENGE** box, and
> [Unit4-Extra-Practicals.md](Unit4-Extra-Practicals.md) has twelve more short exercises.

---

## ⚠️ BEFORE THE SESSION

Read `Unit4-Before-We-Start.md`. You need:

- [ ] GitHub login
- [ ] Docker Hub login — username: `________________`
- [ ] A Codespace opened once as a practice run

**Nothing to install.** Everything runs in your browser.

---

## LAB 0 — Set up (15 min)

1. Open this repository on GitHub → **Code** → **Codespaces** → **Create codespace on main**.
2. In the terminal:

```bash
docker login          # do this FIRST, before anything pulls an image
minikube start        # takes ~2 min. Let it run while we talk.
```

- [ ] `docker login` says **Login Succeeded**
- [ ] `minikube start` finishes and `kubectl get nodes` shows one **Ready** node

Turn on metrics collection now, so it is warmed up by the time you need it in Lab D:

```bash
minikube addons enable metrics-server
```

- [ ] It says **enabled**

> 📖 `kubectl top` needs something to actually gather CPU and memory numbers. minikube does not
> run that by default — this switches it on. Without it, `kubectl top pods` just says
> *"Metrics API not available"*.

While minikube starts, check your tools:

```bash
cd lab-starter
trivy --version
kubectl version --client
```

- [ ] Both print a version

> 📁 **Stay in `lab-starter` for the whole session.** Every path in this handout is relative to
> it. If you ever get lost, `cd /workspaces/*/lab-starter` puts you back.

> If `trivy` is not found: **Ctrl+Shift+P** → *Codespaces: Rebuild Container*.
> Still missing? Use `docker run --rm aquasec/trivy` wherever the labs say `trivy`.

Warm up Trivy's vulnerability database now, so you are not waiting for it later:

```bash
trivy image alpine
```

- [ ] It downloaded its database and printed a (mostly empty) report

**✅ CHECKPOINT 0**

---

## LAB A — Kubernetes, finished (25 min)

You met Pods, Deployments and Services in Unit 3. Now you run them.

### A.1 Build the lab image (5 min)

Everyone builds this one, including anyone who still has their Unit 3 image. It is the same kind
of app, plus a `/break` endpoint that Lab D needs.

Replace `YOURNAME` with your Docker Hub username, in **lower case**:

```bash
docker build -t YOURNAME/devsecops-lab:v1 ./app
docker push YOURNAME/devsecops-lab:v1
```

- [ ] My image is on Docker Hub and the repository is **Public**

> ⚠️ It must be **Public**. Kubernetes pulls from Docker Hub, and a private repo gives you
> `ImagePullBackOff` with no obvious explanation.

> 📚 **Still have your Unit 3 image?** Write its full name here — you will scan it in Lab B as
> well, to compare: `________________________________`

### A.2 Deploy it (10 min)

Open `k8s/deployment.yaml` and change the `image:` line to **your** image name:

```yaml
          image: YOURNAME/devsecops-lab:v1     # ← your Docker Hub username here
```

```bash
kubectl apply -f k8s/deployment.yaml
kubectl get pods
```

- [ ] Two pods are **Running**

> If they say `ImagePullBackOff`, run `kubectl describe pod <name>` and read the Events at the
> bottom. Nine times out of ten it is a typo in the image name, or a private repository.

> 📖 **Pod** = one running container. **Deployment** = "always keep N pods alive."

### A.3 🔥 Self-healing (5 min)

> 🎯 **Predict first:** I am about to delete a running pod. What happens? ______

```bash
kubectl get pods
kubectl delete pod <paste-one-pod-name>
kubectl get pods
```

- [ ] I recorded what happened to the number of pods

> 📖 Kubernetes compares **desired state** (2 pods) to **actual state** and repairs the
> difference. Nobody was paged.

### A.4 A Service, and scaling (5 min)

```bash
kubectl apply -f k8s/service.yaml
kubectl port-forward service/web 8080:80
```

Leave that running. In a **second terminal** (`+` in the terminal panel):

```bash
curl localhost:8080 | grep container
```

Run it a few times and watch the container ID change.

- [ ] Different pods answered

```bash
kubectl scale deployment web --replicas=5
kubectl get pods
```

- [ ] Five pods, in seconds

> 📖 **Service** = one stable address in front of pods that come and go. It finds them by
> **label** and load-balances between them.

> 🔵 **CHALLENGE — only if you finished early.**
> 1. Scale to 4 replicas by **editing `k8s/deployment.yaml`** and re-applying, instead of using
>    `kubectl scale`. Which of the two would you want in a real project, and why?
> 2. Delete **all** the pods at once: `kubectl delete pods -l app=web`. Time how long full
>    recovery takes. Did the Service address change?
> 3. `kubectl get replicaset`. You never created one. Who did, and what is it for?

**✅ CHECKPOINT A**

---

## LAB B — Find the vulnerabilities (30 min)

Stop `port-forward` with **Ctrl+C**. Kubernetes can wait.

### B.1 Scan the image you just deployed (10 min)

> 🎯 **Predict first:** you built this image from an official Docker base image.
> How many known vulnerabilities do you think it contains? ______

```bash
trivy image --severity HIGH,CRITICAL YOURNAME/devsecops-lab:v1
```

- [ ] I wrote down the number of HIGH and CRITICAL findings: ______

Look at the table. Each row is a real, published vulnerability with a CVE number, in software
**you did not write and never chose** — it arrived inside the base image.

> 📚 **If you still have your Unit 3 image**, scan that too and compare:
> `trivy image --severity HIGH,CRITICAL YOURNAME/containers-lab-web:v1`
> It was built on a newer base, so it should be healthier — but almost certainly not clean.

> 📖 **DEFINITION — CVE**: Common Vulnerabilities and Exposures. A public ID for one specific
> known flaw, e.g. `CVE-2023-44487`. Anyone can look it up — including attackers.
>
> 📖 **DEFINITION — SCA** (Software Composition Analysis): scanning the *dependencies* you pulled
> in, rather than the code you wrote. Trivy and `npm audit` are both doing SCA here.

> ℹ️ **Your numbers will not match your neighbour's.** The vulnerability database updates daily
> and base images move. Compare the *direction* of change, not the exact figures.

### B.2 Scan your dependencies (5 min)

```bash
cd app
npm install          # takes ~20 seconds
npm audit
```

- [ ] `npm audit` reports vulnerabilities in `minimist` and/or `lodash`

Open `app/package.json`. Those versions were pinned deliberately. In a real project they get old
on their own, quietly, while nobody is looking.

Ask npm what it *would* do about it — without actually changing anything yet:

```bash
npm audit fix --dry-run
```

- [ ] I can see which versions it wants to move to

> ⚠️ **Do not run `npm audit fix` for real yet.** You need these vulnerabilities to still be here
> in Lab C, so you can watch the pipeline refuse them. You will fix them properly there.

> 📖 Note that `npm audit` only sees **your Node dependencies**. It knows nothing about the
> operating system packages in your base image — that is Trivy's job. Neither tool covers the
> other, which is why real pipelines run both.

### B.3 Fix the image (10 min)

Open `app/Dockerfile` and read the four **PROBLEM** comments. Then open
`app/Dockerfile.hardened` next to it and compare.

| Problem | Fix |
|---|---|
| `node:16-alpine` — end of life, unpatched | A current base image |
| `COPY . .` — copies `.git`, `.env`, everything | Copy only what you need |
| Old pinned dependencies | `npm ci --omit=dev` |
| Runs as **root** | `USER node` |

Build the fixed version and scan it:

```bash
cd ..
docker build -f app/Dockerfile.hardened -t myapp:hardened ./app
trivy image --severity HIGH,CRITICAL myapp:hardened
```

- [ ] HIGH/CRITICAL before: ______  after: ______

> 📌 Most of that drop came from **one line** — changing the base image. The cheapest security
> win in containers is usually "stop using an old base image".

> 🧠 **Notice what did *not* get fixed.** The `minimist` and `lodash` findings are still there,
> because the hardened Dockerfile only changed the *base image*, not `package.json`.
> Operating-system CVEs and dependency CVEs are two separate jobs. You will need both in Lab C.

Prove the non-root fix worked:

```bash
docker run --rm myapp:hardened whoami
```

- [ ] It prints `node`, not `root`

### B.4 Find the secret (5 min)

```bash
cat secrets-demo/config.js
```

- [ ] I found the hardcoded API key, database password and token

> 🎯 **Question to write down:** you commit this, notice the mistake, and delete the line in your
> next commit. Is the secret safe now? ______

It is not. It is in the git history forever, and anyone who clones the repo gets it. **The only
real fix is to rotate the secret** — change it at the source so the leaked one is worthless.

The bottom of that file shows the correct version: read the values from the **environment**,
and supply them at run time from GitHub Secrets, AWS Secrets Manager or Vault.

> 🔵 **CHALLENGE — only if you finished early.**
> 1. Can you get HIGH + CRITICAL to **zero**? Try other base images in `Dockerfile.hardened` —
>    `node:22-slim`, or a distroless image. What do you give up each time?
> 2. Make Trivy machine-readable: `trivy image -f json -o out.json <image>`. Now you have
>    something a pipeline can parse rather than a human reading a table.
> 3. `trivy fs --scanners secret .` — it finds the secret without being told where to look.
>    Which of SAST / DAST / SCA is that, and where in the pipeline should it run?

**✅ CHECKPOINT B**

---

## LAB C — Build the security gate (35 min)

Finding vulnerabilities is useless if everyone ignores the report. A **gate** makes the build
*fail*, so the vulnerable thing cannot be shipped.

### C.1 Put the lab on GitHub (8 min)

The scans have to run on GitHub, so the code needs to be in **your own** repository.

```bash
cp -r /workspaces/*/lab-starter ~/devsecops-lab
cd ~/devsecops-lab

# Leave the planted secrets behind - see the note below.
rm -rf secrets-demo

git init -b main
git add .
git commit -m "lab starter"
gh repo create devsecops-lab --public --source=. --push
```

- [ ] The command printed a URL, and I can see my files on GitHub

> 🧠 **Why delete `secrets-demo/` first?** GitHub runs **push protection** on public
> repositories: it scans what you are pushing and *refuses the push* if it finds something
> shaped like a real credential. The fake Stripe key in `config.js` is shaped exactly like a real
> one — deliberately — so GitHub would block you here.
>
> **That is the same idea as the gate you are about to build**, moved even further left: it acts
> before the code is even accepted, never mind built. You already scanned that file in Lab B.4;
> it has done its job and does not need to be in this repository.

> 📁 **Lab C runs from `~/devsecops-lab`.** Lab D goes back to `lab-starter`.

> ⚠️ If the push fails with *"refusing to allow an OAuth App to create or update workflow"*,
> your Codespace token cannot write workflow files. Fix it once:
> ```bash
> gh auth refresh -h github.com -s workflow
> ```
> Follow the code it shows you, then run `git push -u origin main`.

> 📚 **Your Unit 2 repo is not used here**, even if you still have it. Its files sit at the root,
> while this workflow expects them in `app/`. Adapting it is a good homework exercise.

### C.2 Read the workflow while it runs (7 min)

Pushing already triggered it. Open the **Actions** tab on GitHub and leave it running while you
read `.github/workflows/security.yml`.

It has three jobs — one for each kind of scanning:

| Job | Kind | Question it answers |
|---|---|---|
| `dependencies` | **SCA** | Are the libraries I depend on vulnerable? |
| `image` | **Container scan** | Is the image I'm about to ship vulnerable? |
| `code` | **SAST** | Is the code *I wrote* insecure? |

Notice that the `image` job runs Trivy **twice**. The first run reports everything with
`exit-code: '0'`, so the log is useful even on a good day. The second run is the gate.

Now look at the Actions tab.

- [ ] The workflow ran
- [ ] At least one job **FAILED** ❌

### C.3 Read the failure (5 min)

Click into the failed jobs and expand the failing step.

- [ ] I can see which CVE stopped the build

> 🧠 **Two** jobs should be red, not one: the **container scan** (old base image) and the
> **dependency scan** (old `minimist` and `lodash`). That is the lesson from B.3 showing up in
> the pipeline — OS vulnerabilities and dependency vulnerabilities are separate problems and
> you have to fix both.

**This red X is the entire point of the lab.** The pipeline just refused to ship a vulnerable
image. Nobody had to remember to check. Nobody had to be the unpopular one who says no.

> 📖 **DEFINITION — Security gate**: a pipeline step that *fails the build* when a security rule
> is broken. The rule is enforced by the machine, not by someone's good intentions.
>
> 📖 The mechanism is simply the **exit code**. `exit-code: '1'` tells Trivy to exit non-zero when
> it finds something, and any non-zero exit fails the job. That is all a "gate" really is.

### C.4 Make it pass, honestly (10 min)

You have two red jobs, so you need two real fixes.

**Fix 1 — the dependencies:**

```bash
cd app
npm install minimist@latest lodash@latest
npm audit --audit-level=high          # should now be quiet
cd ..
```

**Fix 2 — the image:**

```bash
cp app/Dockerfile.hardened app/Dockerfile
```

Push both together:

```bash
git add -A
git commit -m "update vulnerable deps, use a supported base image, drop root"
git push
```

> 📁 `git status` should show `package.json`, `package-lock.json` and `app/Dockerfile` — and
> **not** thousands of `node_modules` files. The `.gitignore` keeps those out. Committing
> `node_modules` is one of the most common beginner mistakes on GitHub.

- [ ] All three jobs are now **green** ✅

> If the container scan is *still* red, read the actual CVE it names. New vulnerabilities are
> published constantly, and `node:22-alpine` may have picked one up since this lab was written.
> That is not a failure of the lab — it is exactly what this job is for. Note the CVE and move on.

> ⚠️ **The dishonest fix** is to delete the gate, or set `severity: CRITICAL` only, or add
> `|| true`. The build goes green and nothing is safer. If you ever *must* accept a specific
> finding, use an explicit, dated, commented exception — never a silent one.

### C.5 Where the gate belongs (5 min)

```
commit → SAST → build → SCA → image scan → 🚪 GATE → push to registry → deploy
                                             ↑
                              fails here = nothing vulnerable ever reaches the registry
```

> 📖 **Shift left**: run security checks as early as possible. A finding costs minutes at the
> commit stage, hours in a release, and days in production.

> 🔵 **CHALLENGE — only if you finished early.**
> 1. **Break it again on purpose.** Re-pin `lodash` to `4.17.15`, push, and confirm the gate
>    still catches it. A gate you have never seen fail is a gate you cannot trust.
> 2. Add a **fourth job** that runs `trivy fs --scanners secret .` and fails on a finding.
>    Then copy `secrets-demo/config.js` back in and try to push it. **GitHub will refuse the
>    push before your workflow even runs** — that is push protection, a gate that sits to the
>    left of yours. Read the error, follow its link, and notice that bypassing it requires a
>    deliberate, recorded decision.
> 3. Change the gate to `severity: 'CRITICAL'` only. The build goes green. Write one sentence
>    explaining to a manager why that is worse than leaving it red.

**✅ CHECKPOINT C**

---

## LAB D — Monitoring that acts (25 min)

A dashboard tells a human something is wrong. A **health probe** tells Kubernetes, which fixes it
without waking anybody. Same signal, no human in the loop.

### D.1 The problem with Lab A (5 min)

Your app has a `/break` endpoint that makes its health check start failing — an app that is
running but useless, which is how most real outages actually look.

Go back to the lab folder and pick one specific pod:

```bash
cd /workspaces/*/lab-starter
kubectl get pods
```

Copy one pod name, then forward **straight to that pod** — not to the Service:

```bash
kubectl port-forward pod/<paste-pod-name> 8080:3000
```

> 🧠 **Why the pod and not the Service?** The Service load-balances, so `/break` would hit one
> pod and `/health` might hit another. Talking to one pod directly makes the experiment
> deterministic.

In a second terminal:

```bash
curl localhost:8080/break
curl localhost:8080/health      # now returns UNHEALTHY
kubectl get pods
```

- [ ] `/health` returns **UNHEALTHY**
- [ ] That pod still shows **Running**, with **0 restarts**

> Kubernetes cannot see inside your container. Without a probe, "the process has not exited" is
> the only thing it knows — and that process is perfectly happy serving errors.

### D.2 Add probes (10 min)

Stop the port-forward with **Ctrl+C**. Open `k8s/deployment-probes.yaml`, set your image name,
and read the `livenessProbe` and `readinessProbe` blocks.

| Probe | Question | If it fails |
|---|---|---|
| **liveness** | Is this container alive? | Kubernetes **restarts** it |
| **readiness** | Should it get traffic *now*? | Pod is removed from the Service, **not** restarted |

```bash
kubectl apply -f k8s/deployment-probes.yaml
kubectl get pods -w        # Ctrl+C when they are all Running
```

- [ ] New pods rolled out

> 🧠 **Scroll to the bottom of that file before you move on.** It also adds `resources` and a
> `securityContext` with `runAsNonRoot`, `allowPrivilegeEscalation: false` and
> `readOnlyRootFilesystem`. That is the **Kubernetes half of Lab B.3** — you dropped root in the
> Dockerfile, and here the cluster enforces it again regardless of what the image says.
> Two layers, because either one can be got wrong.

### D.3 🔥 Break it again (10 min)

> 🎯 **Predict first:** with probes in place, what happens when I break the app? ______

```bash
kubectl get pods
kubectl port-forward pod/<paste-a-pod-name> 8080:3000
```

Second terminal:

```bash
curl localhost:8080/break
kubectl get pods -w
```

Watch the **RESTARTS** column for about 30 seconds. Nothing happens immediately — the probe runs
every 5 seconds and needs 3 consecutive failures, so it takes ~15 seconds to act.

- [ ] I recorded what happened: ______________________

```bash
kubectl describe pod <name> | grep -A10 Events
```

- [ ] The events mention the liveness probe failing

> 🧠 **Two things worth noticing.**
> 1. The pod is healthy again afterwards. Restarting gave it a fresh process, and `/break` only
>    changed a value in memory. A restart genuinely fixes a surprising number of real faults.
> 2. **The other pod kept serving the whole time.** Your users never saw the outage. That is the
>    readiness probe and the Service doing their job together.

Now look at the other monitoring signals you get for free:

```bash
kubectl logs <pod-name> --previous      # logs from the container that was KILLED
kubectl logs <pod-name>                 # logs from the fresh one
kubectl top pods                        # live CPU and memory
```

- [ ] I found `health check failed` in the `--previous` logs

> 🧠 **Why `--previous`?** The restart gave you a brand-new container with brand-new logs. The
> evidence of *why* it was killed lives in the dead container. This flag is the first thing to
> reach for whenever you are investigating a `CrashLoopBackOff`.

> If `kubectl top` says *"Metrics API not available"*, the addon from Lab 0 is still starting.
> Wait 30 seconds and try again.

> 📖 **The four golden signals** — what to measure for any service:
> **latency** (how slow), **traffic** (how much), **errors** (how many failures),
> **saturation** (how full). Prometheus collects these; Grafana draws them; an **alert** decides
> when a human should care.
>
> Your probe is the same idea with the loop closed: measure → decide → **act**, in seconds.

> 🔵 **CHALLENGE — only if you finished early.**
> 1. **Predict, then verify.** Change `periodSeconds` to `10` and `failureThreshold` to `4`.
>    How long should a restart take now? Re-apply, call `/break`, and time it.
> 2. Set `initialDelaySeconds: 1`. Re-apply and watch. Explain the `CrashLoopBackOff` you get
>    in terms of the probe, not the app.
> 3. Delete **only** the `readinessProbe`, then run `kubectl rollout restart deployment/web`
>    while a `curl` loop is running. What do your users see now that they did not see before?

**✅ CHECKPOINT D**

---

## Clean up

```bash
kubectl delete deployment web
kubectl delete service web
minikube stop
```

Then stop your Codespace: ☰ menu → *My Codespaces* → **Stop**.

---

## Command cheat sheet

```bash
# kubernetes
kubectl apply -f file.yaml        kubectl get pods / svc / deploy
kubectl delete pod <name>         kubectl scale deployment web --replicas=5
kubectl logs <pod>                kubectl logs <pod> --previous   # the killed container
kubectl describe pod <name>       kubectl get pods -w             # watch live
kubectl top pods                  minikube addons enable metrics-server
kubectl port-forward pod/<name> 8080:3000       # one specific pod
kubectl port-forward service/web 8080:80        # load-balanced
minikube start / stop

# scanning
trivy image <name>                              # everything
trivy image --severity HIGH,CRITICAL <name>     # only what matters today
trivy image --ignore-unfixed <name>             # skip CVEs with no patch yet
trivy fs .                                      # scan a folder instead of an image
npm audit                         npm audit fix

# git
git add . && git commit -m "msg" && git push
```

## When something breaks

| Problem | Fix |
|---|---|
| `trivy: command not found` | Rebuild the container, or use `docker run --rm aquasec/trivy` |
| `ImagePullBackOff` | Image name wrong, or the Docker Hub repo is **private** |
| `ErrImagePull` with no detail | `kubectl describe pod <name>` and read the Events |
| `denied: requested access to the resource is denied` | `docker login`, and the image name must start with **your** username |
| `repository name must be lowercase` | Docker image names are lowercase only |
| `minikube: command not found` | **Ctrl+Shift+P** → *Codespaces: Rebuild Container* |
| minikube won't start / out of memory | `minikube delete` then `minikube start` |
| `curl localhost:<nodeport>` refused | Expected on minikube — use `kubectl port-forward` |
| `kubectl top` says *Metrics API not available* | `minikube addons enable metrics-server`, then wait 30s |
| Pod stuck `CrashLoopBackOff` | `kubectl logs <pod> --previous` — the app is dying at startup |
| Pod restarts forever after adding probes | `initialDelaySeconds` too short; the app needs longer to boot |
| `/health` still says OK after `/break` | You forwarded to the **Service**, so you hit a different pod. Forward to `pod/<name>` instead |
| No restart after `/break` | Wait 15s — the probe needs 3 failures at 5s intervals |
| Logs show nothing after a restart | Use `kubectl logs <pod> --previous` — you are reading the new container |
| `refusing to allow an OAuth App to ... workflow` | `gh auth refresh -h github.com -s workflow`, then push again |
| Actions workflow doesn't appear | It must be at `.github/workflows/` in the repo **root** |
| `npm audit` says it needs a lockfile | Run `npm install` first, or `npm install --package-lock-only` |
| `npm audit` finds nothing | Run it inside `app/` |
| `git status` shows thousands of files | `node_modules` is being tracked — check `.gitignore` exists |
| Trivy finds 0 vulnerabilities | You scanned the hardened image — that's the point. Scan the original |
| My CVE count differs from my neighbour's | Normal. The database updates daily. Compare direction, not numbers |
