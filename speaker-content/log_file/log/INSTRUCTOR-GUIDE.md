# Unit 4 — Instructor Guide

> ⚠️ **PRIVATE. Never publish this folder.**
> It contains answers to the "Predict first" questions and the timing of the two reveals.
> It lives inside `devsecops-intro/`, which *is* published — so it is excluded by
> `devsecops-intro/.gitignore`. Confirm with `git status` before your first push.

**Unit 4 — Kubernetes, DevSecOps and Monitoring** · One 4-hour session

File paths below (`lab-starter/`, `secrets-demo/config.js`, `Unit4-Extra-Practicals.md`) refer to
the student files one level up, in `devsecops-intro/`.

---

## The shape of the session

One artifact — **their own container image** — seen through four lenses:

```
their image → deploy it (K8s) → scan it (DevSecOps) → gate it (CI/CD) → watch it (Monitoring)
```

No new app, no new accounts. Every topic lands on something they personally built.

| Time | Segment | Lab |
|---|---|---|
| 0:00 – 0:15 | Welcome; `docker login`; **start `minikube start` immediately** | Lab 0 |
| 0:15 – 0:35 | Kubernetes recap: cluster, Pod, Deployment, Service, desired state | — |
| 0:35 – 1:00 | Deploy, delete a pod, scale, port-forward | **Lab A** |
| 1:00 – 1:15 | DevSecOps principles, shift-left, cost curve, SAST/DAST/SCA table | — |
| 1:15 – 1:45 | Trivy on their own image; `npm audit`; harden and rescan; find the secret | **Lab B** |
| 1:45 – 2:00 | Secrets: why deleting the commit doesn't work; rotation | — |
| — | **BREAK — 15 min** | |
| 2:15 – 2:30 | Security gates; exit codes; choosing thresholds | — |
| 2:30 – 3:05 | Add the gate, watch it fail, fix it honestly | **Lab C** |
| 3:05 – 3:15 | OWASP Top 10 tour; container hardening | — |
| 3:15 – 3:30 | Monitoring vs logging vs tracing; golden signals; Prometheus/Grafana | — |
| 3:30 – 3:50 | Probes; break the app; watch it restart | **Lab D** |
| 3:50 – 4:00 | Case study, DORA + DevSecOps metrics, wrap | — |

**Running late?** Cut order: Lab A.4 (scaling — they saw it in Unit 3) → the OWASP tour →
Lab B.4 (secrets, cover it verbally). **Never cut Lab B.1 or Lab C.3** — those are the two
moments the session exists for.

**Running early, or need something for fast finishers?** `Unit4-Extra-Practicals.md` has twelve
exercises, none over seven minutes, each marked with the segment it belongs beside. The two
worth planning in rather than holding in reserve:

- **E1 — the secret in git history.** Five minutes, and it replaces an assertion you currently
  only make verbally with something they watch happen. `git log -p -S` prints the "deleted" key
  in full. If you add one thing from that file, add this.
- **E3 — the pre-commit hook.** `secrets-demo/pre-commit` refuses to commit a credential. Run it
  against the lab's own `config.js` and it catches all three planted secrets by line number.
  Shift-left stops being an arrow on a slide. Do discuss the limits out loud — hooks are not
  shared by cloning and `--no-verify` bypasses them, which is exactly why the CI gate is the
  real control and the hook is only a courtesy.

E8 (Kubernetes Secrets are only base64) takes about ninety seconds and corrects a belief that
nearly every student holds. It fits inside the secrets segment with no schedule impact.

---

## The two reveals

**1. Lab B.1 — "how many CVEs are in your image?"**
They were asked to write a guess in the pre-reading. Most guess zero to five. An image built on
`node:16-alpine` typically returns **dozens**. Take the guesses out loud *before* anyone runs the
scan, then have three students read their real numbers.

The point to land: *"You did nothing wrong. You inherited this."* Software supply chain in one
command.

**2. Lab C.3 — the red X.**
The build fails and refuses to publish the image. Let them sit with it before explaining. The
line worth saying: *"Nobody had to remember to check. Nobody had to be the unpopular person who
says no. The pipeline said no."*

---

## What was deliberately cut, and what to say

| Topic | Decision | What to tell them |
|---|---|---|
| **SonarQube** | Demo only; **CodeQL** is the hands-on SAST | SonarQube needs a server or a SonarCloud account + token. Show a screenshot, name it, explain it is the same category as CodeQL. The syllabus word is covered |
| **Prometheus + Grafana** | Concepts + probes lab | `helm install kube-prometheus-stack` takes ~8 min and frequently OOMs a 2-core Codespace next to minikube. Teach the architecture; probes give them the *acting* version |
| **DAST / OWASP ZAP** | Explained, not run | Needs a deployed target and time we don't have |
| **Terraform / Ansible IaC** | Not covered | Genuinely does not fit. Push to homework or a fifth session |

If you have a projector and two spare minutes, a live Grafana public demo dashboard
(`play.grafana.org`) makes the concepts concrete at no setup cost.

### The `play.grafana.org` demo — optional, 2 minutes

Grafana Labs runs a public, read-only sandbox. No login, no install, nothing to configure, and
nothing 40 students can break. It is the cheapest way to make "metrics" stop being an abstraction.

**Before the session:** open it in a tab and leave it there. Do **not** sign in — the anonymous
view is the point, and a login prompt on the projector wastes the two minutes you have.

**Where it goes:** the 3:15–3:30 monitoring segment, immediately after the Prometheus/Grafana
architecture slide and immediately before probes. There is a deck slide for it.

**What to point at, in order:**

| Point at | Say |
|---|---|
| A time-series panel | "Metrics. Numbers over time. Pillar one" |
| The time-range picker | "Same query, any window. This is how you answer *when did it start*" |
| One panel → Edit → the query | "The dashboard is not the data. The query is. The dashboard is just a drawing of it" |
| A stat panel with a threshold colour | "That red is a number crossing a line. An alert rule is the same thing, with a phone call attached" |
| A logs panel, if the dashboard has one | "Pillar two, sitting next to pillar one. That is why people pay for this" |

Name the **four golden signals out loud** as you pass panels that show them — latency, traffic,
errors, saturation. Students remember the list far better attached to something moving.

**The line that ends the demo**, and sets up Lab D:

> *"Everything you have just seen still needs a human to be looking at it. At 3am, nobody is.
> That is what the next twenty minutes are about."*

**Do not** go hunting for a specific dashboard by URL in front of the room — the demo site's
content changes. Open the **Dashboards** list and pick any one with live graphs. Any of them
makes the point.

**If the site is down or blocked** by campus networking, skip it without ceremony. `kubectl top
pods` in Lab D is your fallback: it is the same idea — numbers over time — with no browser.

---

## 🔴 Landmines

1. **Start `minikube start` in the first five minutes**, before you talk. It takes ~2 minutes and
   nothing in Lab A works without it. Lab 0 also enables the **metrics-server** addon — without
   it `kubectl top` in Lab D just errors.
2. **`docker login` first**, as in Unit 3. Docker Hub rate-limits anonymous pulls per IP and the
   room shares one. Trivy also pulls, which doubles the exposure.
3. **Trivy's first run downloads its vulnerability database** (~40 MB). Lab 0 warms it with
   `trivy image alpine` for exactly this reason — don't let them skip that step.
4. **CVE counts will not match between students.** The database updates daily and base image
   digests move. Say so before anyone thinks they did it wrong. Compare *direction*, not numbers.
5. **`gh repo create` may refuse to push the workflow file.** The default Codespaces token often
   lacks `workflow` scope, giving *"refusing to allow an OAuth App to create or update workflow"*.
   The fix is in the handout — `gh auth refresh -h github.com -s workflow` — but it involves a
   device code, so **walk the room through it together** rather than letting 40 people hit it
   individually.
6. **CodeQL needs the repo to be public** and Actions enabled. On a private repo it requires
   GitHub Advanced Security and will fail.
7. **Two jobs go red in Lab C, not one.** The container scan *and* the dependency scan. This is
   deliberate — it mirrors the B.3 lesson that OS CVEs and dependency CVEs are separate problems.
   Make sure they fix both in C.4, or the build stays red and they think they did it wrong.
8. **Lab D must port-forward to a *pod*, not the Service.** With 2 replicas, forwarding to the
   Service means `/break` hits one pod and `/health` may hit the other, and the demo silently
   fails. The handout uses `kubectl port-forward pod/<name> 8080:3000` — watch for students
   reverting to the Service form out of habit from Unit 3.
9. **Lab B.2 uses `npm audit fix --dry-run` on purpose.** If a student runs the real
   `npm audit fix`, their dependency vulnerabilities are gone before Lab C, that job goes green,
   and the "two red jobs" moment collapses. The handout warns them; say it out loud too. If
   somebody does it anyway, they can `git checkout app/package.json` or simply re-pin the old
   versions by hand.

---

## 🔌 If the environment fails — have a plan B

Everything in this unit assumes Codespaces. That is the right default, but it is a single point
of failure: a student out of free quota, a campus network blocking it, or a GitHub incident and
they have nothing. Decide your fallback **before** the day, not during it.

| Situation | Fallback |
|---|---|
| A few students out of Codespaces quota | **Pair them up.** Two to a screen is far better than one person watching a broken laptop |
| Codespaces blocked or down for everyone | **Killercoda** (`killercoda.com`) gives a browser Kubernetes playground with no account setup. Labs A and D transfer; Lab C still works because it runs on GitHub Actions |
| Docker Hub rate-limiting the room's shared IP | Have students scan **public** images instead: `trivy image node:16-alpine` still makes the Lab B point without anyone pushing |
| minikube will not start at all | Labs **B and C need no Kubernetes**. Run those first and return to A/D if it recovers |

> ⚠️ **If you use Killercoda, verify one specific scenario yourself first.** Playground
> environments differ in whether a locally built image is visible to the cluster, which breaks
> `kubectl apply` with `ImagePullBackOff` for reasons that have nothing to do with the lesson.
> Pushing to Docker Hub and pulling from there (what the handout already does) sidesteps this —
> which is another reason not to let students skip `docker push`.

**The order of the labs is deliberate:** A and D need a cluster, B and C do not. If the cluster
is the thing that is broken, you can still deliver the two segments the session exists for.

---

## Teaching notes

- **The pre-reading question is load-bearing.** If they haven't written a guess, the Lab B reveal
  is just a table of text. Remind them in the previous class.
- **Let the gate failure sit.** Resist explaining it for thirty seconds. The discomfort of a red
  build is the lesson.
- **Lab C.4 is a values lesson, not a technical one.** The dishonest fixes (`|| true`, dropping to
  CRITICAL-only, deleting the step) are exactly what happens in real teams under deadline
  pressure. Ask the room which of the two fixes their future manager would prefer, then ask which
  one is correct.
- **`kubectl get pods -w` is the right command for Lab D.** Students who run plain `get pods`
  repeatedly often miss the restart entirely.
- **If Lab D shows no restart:** either they forwarded to the Service instead of a pod, or
  `failureThreshold × periodSeconds` (15s) hasn't elapsed. Wait, then re-check.
- **`kubectl logs --previous` is the takeaway command of Lab D.** After a restart the normal logs
  are from the *new* container and show nothing. This is the single most useful debugging habit
  in the whole unit — call it out explicitly.
- **Everyone builds the Unit 4 image in Lab A.1**, even students who still have their Unit 3 one,
  because Lab D needs the `/break` endpoint. Their Unit 3 image is used only as an optional
  second scan in B.1, which makes a nice comparison: newer base, fewer findings, still not clean.
- **Tie it back at the end.** Unit 2 automated delivery, Unit 3 made it portable, Unit 4 made it
  safe and observable. That is the whole course in one sentence.

---

## The deliberately vulnerable files

Three files in `lab-starter/` are intentionally wrong. Each is marked in-file, each has a fix
beside it, and all credentials are fake.

| File | Planted problem | Fix shown in |
|---|---|---|
| `app/Dockerfile` | EOL base, root user, `COPY . .`, old deps | `app/Dockerfile.hardened` |
| `app/package.json` | `minimist@1.2.0`, `lodash@4.17.15` | Version bump in Lab C.4 |
| `secrets-demo/config.js` | Hardcoded key, DB password, token | Commented block at the bottom |

If your institution scans student repos for secrets, warn them in advance that this repo will
trigger it, and why — that is itself a good teaching moment about detection working.

---

## Before you teach

- [ ] Dry-run Lab 0 in a fresh Codespace: `trivy --version`, `minikube start`,
      `minikube addons enable metrics-server`
- [ ] Run Lab B.1 yourself **this week** and note the current CVE count, so you know what to expect
- [ ] Run Lab C end to end in a throwaway repo. Confirm **two** jobs fail, then both pass after
      the dependency bump *and* the Dockerfile swap
- [ ] Check whether `gh repo create --push` hits the workflow-scope error on your account, so you
      know whether to pre-empt it for the room
- [ ] Dry-run Lab D with `port-forward pod/...` and time how long the restart actually takes
- [ ] **Watch Lab D's first `kubectl apply` specifically.** `deployment-probes.yaml` imposes
      `runAsUser: 1000` and `readOnlyRootFilesystem: true` on an image built from the
      *deliberately insecure* Dockerfile, which runs as root. It should start cleanly — the
      `node` user is UID 1000 and the app only reads from disk — but if a pod ever comes up
      `CreateContainerConfigError` or `CrashLoopBackOff` here, that interaction is the first
      place to look, not the probe settings
- [ ] Confirm `kubectl top pods` returns numbers after metrics-server has been up a minute
- [ ] Have a Grafana demo dashboard open in a tab if you want the visual
- [ ] Confirm `speaker-content/` is **not** inside the repository students can see
