# Before We Start — Unit 4
### Read before the session. 10 minutes.

Unit 2 built the pipeline. Unit 3 built the box your code travels in.
Unit 4 asks two questions nobody asked yet:

> **Is what we are shipping safe?**
> **And how would we know if it stopped working?**

---

## 1. Where we are

```
Unit 2   pipeline        build → test → deploy, automatically
Unit 3   containers      package it so it runs anywhere
Unit 4   security        is it safe?        ← you are here
         monitoring      is it healthy?
```

In Unit 3 you built an image and pushed it to Docker Hub. You will start this session by
**scanning that image** — and finding real published vulnerabilities in it. Not because you did
anything wrong.

## 2. Four words for the security half

| Word | Meaning |
|---|---|
| **DevSecOps** | Building security *into* the pipeline, automatically, instead of a manual review at the end |
| **Shift left** | Checking early, because a problem found at commit time costs minutes and the same problem found in production costs days |
| **CVE** | A public ID for one known vulnerability, e.g. `CVE-2023-44487`. Anyone can look it up — including attackers |
| **Security gate** | A pipeline step that **fails the build** when a rule is broken. Not a warning. A stop |

## 3. Three words for the monitoring half

| Word | Meaning |
|---|---|
| **Metrics** | Numbers over time — CPU, requests per second, error rate |
| **Logs** | Individual events — "health check failed at 14:02" |
| **Probe** | A health check that **Kubernetes acts on** — if the app stops responding, it restarts it without asking anybody |

## 4. The one table worth arriving with

Three kinds of security scanning. You will use all three.

| | Looks at | App running? | Example tool |
|---|---|---|---|
| **SAST** | Your source code | No | CodeQL, SonarQube |
| **DAST** | Your running app, from outside | **Yes** | OWASP ZAP |
| **SCA** | Your dependencies | No | Trivy, `npm audit` |

> 🎭 SAST reads the recipe. DAST tastes the food. SCA checks whether the ingredients have been
> recalled.

---

## Pre-work checklist

- [ ] GitHub login works
- [ ] Docker Hub login works — username: `________________`
      <br/>**Bring your password.** The first command of the day is `docker login`
- [ ] Opened a Codespace once as a practice run
- [ ] Read sections 1–4 above

### Useful but not required

- [ ] Your **Unit 3 image** still on Docker Hub — we will scan it as a comparison
      <br/>Full name: `_________________________________`

> **You will build a fresh image at the start of the session anyway**, so nothing depends on
> your Unit 3 or Unit 2 work surviving. If you still have them, you get an extra comparison to
> look at. If you don't, you lose nothing.

---

## 5. Commands you will meet

| Command | What it does |
|---|---|
| `minikube start` | Start a small Kubernetes cluster in your Codespace |
| `kubectl get pods` | List what Kubernetes is running |
| `kubectl logs <pod>` | Read what a pod printed |
| `kubectl top pods` | Live CPU and memory per pod |
| `trivy image <name>` | Scan a container image for known vulnerabilities |
| `npm audit` | Scan your Node dependencies for known vulnerabilities |

---

## 6. One thing to think about beforehand

You built your Unit 3 image from `node:20-alpine` — an **official** image, from Docker, used by
millions of people.

> 🎯 **How many known security vulnerabilities do you think are inside it?** ______

Write your guess down and bring it. We will run the scan in the first hour.
