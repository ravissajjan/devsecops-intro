# Unit 4 — Practice Questions and Answers
### Kubernetes, DevSecOps and Monitoring

Answers are given below each question. **Cover them, answer first, then check.** A wrong guess
you have committed to is remembered far longer than a correct sentence you have only read.

---

## A — Quick check

Eight questions. Commit to an answer before you read the line underneath.

**1. You built an image from an official `node:16-alpine`. How many HIGH/CRITICAL CVEs?**
&nbsp;&nbsp;&nbsp;(a) 0 (b) 1–5 (c) 6–20 (d) dozens
> **(d).** Most people guess (a) or (b). None of them are your code — they arrive inside the
> base image, which reached end of life and stopped receiving patches.

**2. You commit a secret, then delete the line in the very next commit. Is it safe?**
> **No.** It is in the repository history forever, and every clone carries it. The only fix is
> **rotation** — invalidate the secret at its source so the leaked copy is worthless.

**3. A Kubernetes Secret is encrypted.**
> **False.** base64 is *encoding*, not encryption. By default the value sits in etcd in the
> clear. It is still better than hardcoding it, because it is out of your git repository and
> access is controlled by RBAC — but it is not a vault.

**4. Does Prometheus push or pull metrics?**
> **Pull.** Your app exposes `/metrics` and waits; Prometheus scrapes it on a timer. Most people
> assume applications push their metrics out.

**5. Which needs the application running — SAST, DAST or SCA?**
> **DAST only.** SAST reads your source code and SCA reads your dependency list; neither needs
> anything running.

**6. A liveness probe fails. What does Kubernetes do?**
> **Restarts the container.** A *readiness* probe failing does something different: the pod is
> removed from the Service and stops receiving traffic, but is **not** restarted.

**7. Your security scan reports 40 vulnerabilities and the build goes green. Is that a gate?**
> **No.** Without a non-zero exit code it is a *report*, and reports get ignored. A gate fails
> the build.

**8. Trivy finds zero vulnerabilities in your image. Good news?**
> **Check what you scanned first.** Usually it means you scanned the hardened image, used the
> wrong tag, or have a stale vulnerability database — not that you are clean.

---

## B — Discussion questions

These have no single right answer. They are the questions that separate people who have
memorised the tools from people who understand the trade-offs. Try writing two or three
sentences on each.

**1. The build has been red for three weeks on one HIGH CVE with no available patch. Your
manager asks you to add `|| true`. What do you do?**
> A good answer covers: `ignore-unfixed`, or an explicit, dated, commented exception for *that
> one CVE* — not a blanket disabling. Plus a ticket, so the exception expires rather than
> becoming permanent. The wrong answer is any fix that is silent.

**2. Gate on CRITICAL only, or on CRITICAL and HIGH?**
> A good answer covers: a permanently red build gets switched off or ignored, and the worst
> outcome is the *illusion* of safety — worse than having no gate, because now nobody is
> looking. The threshold matters less than whether people still trust it.

**3. Your scan is clean. Are you secure?**
> A good answer covers: scanners only know *published* vulnerabilities. Nothing in your scan
> found your business logic flaw, your weak password policy, or an insider. A clean scan means
> "no known CVEs today" — and tomorrow the database updates.

**4. Who should fix a vulnerability found in a base image — the developer or the security team?**
> A good answer covers: the question itself is the old model. It is a one-line change the
> developer makes, caught automatically at commit time, not a ticket handed to another
> department weeks later. That handoff is exactly what DevSecOps removes.

**5. Should a probe or an alert handle a pod that has stopped responding?**
> A good answer covers: a probe, because the fix is mechanical and needs no judgement. Alert a
> human only where a decision is genuinely required. Every alert a machine could have handled
> trains people to ignore alerts.

**6. Your team deploys once a quarter "to be safe". What would you say to them?**
> A good answer covers: the DORA finding that frequent deployers are *more* stable, not less. A
> quarterly release is a large, hard-to-review, hard-to-roll-back change. Small, frequent,
> reversible changes are safer than rare large ones.

---

## C — Test yourself

If you can answer these three from memory, you have the core of the unit.

1. Name the three kinds of scanning and say which one needs the app running.
2. You leaked an API key in a commit. Give the **one** action that actually fixes it.
3. What is the difference between what happens when a **liveness** probe fails and when a
   **readiness** probe fails?

> Question 3 is the most commonly confused pair in the unit, and a near-guaranteed interview
> question. If you hesitated, go back to section 12 of the notes.

---

## D — Rapid fire recall

Cover the right-hand column.

| | Answer |
|---|---|
| CVE stands for? | Common Vulnerabilities and Exposures |
| CVSS is? | The 0–10 severity score attached to a CVE |
| `ignore-unfixed` does what? | Skips CVEs with no patch available yet |
| Three pillars of observability? | Metrics, logs, traces |
| Four golden signals? | Latency, traffic, errors, saturation |
| Four DORA metrics? | Deployment frequency, lead time, change failure rate, time to restore |
| A Service finds pods by? | **Label** — not name, not IP |
| Command to see why a pod was killed? | `kubectl logs <pod> --previous` |
| Cheapest security win in containers? | Change the `FROM` line |
| OWASP risk your dependency scan finds? | **A06** — Vulnerable and Outdated Components |
| What actually makes a scan a gate? | A non-zero exit code that fails the build |
| Where do most of an image's CVEs come from? | The base image, not your code |
