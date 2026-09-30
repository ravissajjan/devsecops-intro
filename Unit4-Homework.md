# Unit 4 — Homework
### Kubernetes, DevSecOps and Monitoring

Work in a **public** GitHub repo called `devsecops-lab`.
Everything can be done in a browser (Codespaces).

---

## Part 1 — Practical (60 marks)

| # | Task | Marks |
|---|---|---|
| **T1** | Deploy your image to Kubernetes with **3 replicas** and a Service. Screenshot `kubectl get pods` and `kubectl get svc`. | 8 |
| **T2** | **Scan and report.** Run `trivy image` on any image built from an end-of-life base (e.g. `node:16-alpine`). Screenshot the summary and state the HIGH + CRITICAL count. | 8 |
| **T3** | **Fix it and prove it.** Change only the base image, rebuild, rescan. Screenshot both counts and explain in 2 lines why one line of change did so much. | 10 |
| **T4** | **Harden the Dockerfile.** Submit a Dockerfile that uses a supported base, copies only what it needs, and runs as a non-root user. Prove non-root with `docker run --rm YOURIMAGE whoami`. | 8 |
| **T5** | **Build the gate.** Add a Trivy step to a GitHub Actions workflow that fails on HIGH/CRITICAL. Submit **two** screenshots: the run that **failed** ❌ and the run that **passed** ✅ after a genuine fix. | 12 |
| **T6** | **Secrets.** Take `secrets-demo/config.js` and rewrite it to read from environment variables. Then add one GitHub Actions step that uses a repository **Secret**. Screenshot the log showing the value **masked** as `***`. | 8 |
| **T7** | **Probes.** Add liveness and readiness probes to your Deployment. Call `/break`, then screenshot `kubectl get pods` showing the **RESTARTS** count increase, plus the probe failure in `kubectl describe pod`. | 6 |

---

## Part 2 — The scanning comparison (15 marks)

Run all three kinds of scan against your own project:

1. **SCA** — `npm audit` (or `trivy fs .`)
2. **Container scan** — `trivy image <your image>`
3. **SAST** — enable CodeQL on your repo and let it run once

Submit the three results, then answer in **150–200 words**:

- Which scan found the **most** findings? Why that one?
- Name one type of problem that **only SAST** could have found.
- Name one type of problem that **none of the three** would find.
  *(Think: business logic, a weak password policy, an insider.)*

---

## Part 3 — Written (15 marks)

Answer in **300–400 words total**.

1. A teammate says: *"We ran a security scan, so we're secure now."* Give **two** specific
   reasons that is wrong.

2. Your pipeline's security gate has been failing for three weeks. A manager asks you to add
   `|| true` so the team can ship. Explain what that does, why it is dangerous, and describe a
   **better** short-term option that still lets the team deliver.

3. An engineer commits an AWS key, notices within five minutes, and pushes a second commit
   deleting the line. Explain precisely why the key is still compromised and exactly what they
   must do now.

4. Your app takes 45 seconds to start. You add a liveness probe with
   `initialDelaySeconds: 10` and the pod enters `CrashLoopBackOff`. Explain the mechanism, and
   give **two** different ways to fix it.

---

## Part 4 — Reflection (10 marks)

1. Before the session you guessed how many vulnerabilities were in your Unit 3 image. What was
   your guess, what was the real number, and what does the gap tell you about how software
   supply chains actually work?

2. Name **one thing a security scanner cannot do.**

---

## Practice questions for the viva

**Recall**
1. What does CVE stand for, and what is a CVSS score?
2. What does SCA stand for, and what does it scan?
3. Which of SAST / DAST / SCA needs the application to be running?
4. What is a security gate?
5. What are the three pillars of observability?
6. Does Prometheus push or pull metrics?

**Understanding**
7. Why did an image built from an *official* base image contain dozens of vulnerabilities?
8. Why is `ignore-unfixed` useful when setting a gate threshold?
9. What is the difference between a liveness probe and a readiness probe?
10. Why does a readiness probe matter particularly during a rolling update?
11. Why is running a container as root a risk, given the container is isolated anyway?
12. What are the four golden signals, and which would catch a memory leak?

**Judgement**
13. Your gate blocks on a CRITICAL CVE with no available patch. What are your options?
14. How would you set gate thresholds for a brand-new project versus a ten-year-old one?
15. A scanner reports 200 findings. How do you decide what to fix first?
16. What are the four DORA metrics, and why are frequent deployers usually *more* stable?
17. Explain "shift left" to a project manager who thinks security testing slows delivery down.
18. Your security gate has a 100% pass rate this month. Why might that be a **bad** sign?

---

## Optional bonus — Mini project (teams of 3, 1 week)

Take any application of your own and make it production-defensible:

- [ ] A hardened Dockerfile — supported base, minimal, non-root, no secrets
- [ ] A CI pipeline with **three** gates: SAST, SCA and image scanning
- [ ] One deliberate vulnerability, committed on a branch, with the **failing** pipeline run as
      evidence the gate works
- [ ] All secrets from environment variables or GitHub Secrets — none in the repo
- [ ] A Kubernetes Deployment with probes, resource limits and a `securityContext`
- [ ] A one-page `SECURITY.md`: what you scan, what your thresholds are, and how someone reports
      a vulnerability to you

**Demo day (10 min):** push a commit with a known-vulnerable dependency and let the class watch
your pipeline refuse it. Then break the running app and let them watch Kubernetes repair it.
