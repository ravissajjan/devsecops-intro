# Unit 4 — Extra Practicals
### Twelve short exercises. Do them in any order, in class or afterwards.

Every exercise here is **under 7 minutes**, needs **nothing new installed**, and ends in
something you can see. **None of them is assessed.** Do them if you finish a lab early, if you
want to understand something properly, or at home afterwards.

> 🔑 **Short of time? Do the two marked ⭐.** E1 shows you that a deleted secret is still
> readable — which you are told in Lab B.4, but seeing it is different. E3 makes "shift left"
> something that happens to you rather than a diagram on a slide.

---

## The list

| # | Exercise | Time | Do it after |
|---|---|---|---|
| ⭐ **E1** | Prove the deleted secret is still there | 5 min | Lab B.4 |
| **E2** | Let a scanner find the secret for you | 3 min | Lab B.4 |
| ⭐ **E3** | Block a secret at the door — a pre-commit hook | 7 min | Lab C |
| **E4** | Look inside your own image | 5 min | Lab B.3 |
| **E5** | Three base images, side by side | 5 min | Lab B.3 |
| **E6** | Read one CVE properly | 5 min | Lab B.1 — no terminal needed |
| **E7** | Generate an SBOM | 4 min | Lab B |
| **E8** | Kubernetes Secrets are not encrypted | 5 min | Lab B.4 |
| **E9** | Watch a zero-downtime deploy | 6 min | Lab D |
| **E10** | Break it on purpose, then roll back | 4 min | Lab A |
| **E11** | Autoscaling, for real (HPA) | 6 min | Lab A.4 |
| **E12** | ConfigMap vs Secret | 5 min | E8 |

---

## ⭐ E1 — Prove the deleted secret is still there (5 min)

**Why bother:** Lab B.4 tells you that deleting a secret does not help. This is you proving it
to yourself, which is worth a great deal more than being told.

```bash
mkdir ~/leak-demo && cd ~/leak-demo
git init -b main

echo "const apiKey = 'sk_live_51H8xQ2FAKEKEY';" > config.js
git add . && git commit -m "add config"

# Now "fix" it, exactly as you would if you had just noticed
echo "const apiKey = process.env.API_KEY;" > config.js
git add . && git commit -m "remove secret"

cat config.js          # clean. Looks fixed.
```

> 🎯 **Predict first:** the file is clean and the fix is committed. Is the key safe? ______

```bash
git log -p -S "sk_live_" --oneline
```

- [ ] I can see the key, in full, in the history

```bash
git show HEAD~1:config.js     # and here it is again, readable
```

**The point:** every clone carries this. Every fork. Every CI cache. Bots scan public GitHub
continuously, and cloud keys get abused within minutes.

> **The fix is rotation.** Rewriting history (`git filter-repo`, BFG) is housekeeping you do
> *afterwards* — and it does nothing about the copies already cloned.

---

## E2 — Let a scanner find it for you (3 min)

**Why bother:** E1 and Lab B.4 both find the secret by eye. That does not scale to a real
repository.

```bash
cd /workspaces/*/lab-starter
trivy fs --scanners secret .
```

> If your Trivy is older: `trivy fs --security-checks secret .`

- [ ] It found the credentials in `secrets-demo/config.js` without being told where to look

**The point:** this is the check that belongs in your pipeline *before* the code is merged. Add
it to `security.yml` and you have a fourth job.

---

## ⭐ E3 — Block a secret at the door (7 min)

**Why bother:** "shift left" is an arrow on a slide until you watch git physically refuse your
commit. This is the earliest possible gate — earlier than CI.

`lab-starter/secrets-demo/pre-commit` is ready to use:

```bash
cd ~/leak-demo                                    # or your lab repo
cp /workspaces/*/lab-starter/secrets-demo/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "const key = 'sk_live_ANOTHERFAKE';" > leak.js
git add leak.js
git commit -m "add config"
```

- [ ] The commit was **refused**, and it printed the offending line

Now fix it properly and watch it pass:

```bash
echo "const key = process.env.API_KEY;" > leak.js
git add leak.js && git commit -m "read key from env"
```

> 🧪 **Better version if you have an extra minute:** try to commit the lab's own
> `secrets-demo/config.js`. The hook catches **all three** planted credentials at once — the
> Stripe-style key, the database password and the Docker Hub token — and names the line numbers.
> Then swap in the fixed block from the bottom of that same file and watch the commit succeed.

**The point:** the gate in Lab C stops a bad build. This stops the bad commit *existing*. Same
mechanism — a non-zero exit code — moved as far left as it goes.

> ⚠️ **Discuss the limits.** Hooks live in `.git/`, so they are **not** shared by cloning and
> anyone can bypass them with `git commit --no-verify`. A hook is a helpful reminder for honest
> people; the CI gate is the control. You need both, and only one of them is enforceable.

---

## E4 — Look inside your own image (5 min)

**Why bother:** Lab B.3 says `COPY . .` ships `.git` and `.env`. This proves it.

```bash
cd /workspaces/*/lab-starter/app
echo "API_KEY=sk_live_FAKE" > .env       # pretend this was lying around
docker build -t leaky:v1 .

docker run --rm leaky:v1 ls -la          # what actually shipped?
docker run --rm leaky:v1 cat .env        # your "local only" file, inside the image
```

- [ ] My `.env` is in the image

```bash
docker history leaky:v1 --no-trunc | head -20
```

- [ ] I can see each instruction and what it added

Then the hardened version, which copies named files only:

```bash
docker build -f Dockerfile.hardened -t clean:v1 .
docker run --rm clean:v1 ls -la
rm .env
```

- [ ] No `.env`, no `.git`

**The point:** an image layer is a permanent tar file. Deleting a file in a *later* layer does
not remove it from the earlier one — the same lesson as E1, in a different technology.

---

## E5 — Three base images, side by side (5 min)

**Why bother:** one table makes the "change the `FROM` line" advice concrete. No building
required.

```bash
for img in node:16-alpine node:20-alpine node:22-alpine; do
  echo "=== $img ==="
  trivy image --severity HIGH,CRITICAL --quiet "$img" | tail -3
  docker images "$img" --format "size: {{.Size}}"
done
```

Fill this in:

| Base image | HIGH + CRITICAL | Size |
|---|---|---|
| `node:16-alpine` (EOL) | | |
| `node:20-alpine` | | |
| `node:22-alpine` | | |

**The point:** you did not write a single line of code differently. Supported beats unsupported,
and smaller beats bigger, every time.

---

## E6 — Read one CVE properly (5 min)

**Why bother:** you will see CVE IDs scroll past all day without ever reading one. No terminal
needed.

Take any CVE from your Lab B scan and look it up at `https://nvd.nist.gov/vuln/search`.

Answer these:

1. What is the **CVSS base score**, and what severity does that make it?
2. Read the CVSS vector. Is it exploitable **over the network**, or does it need local access?
3. Does it require **user interaction**?
4. Is there a **fixed version**? (If not, that is what `ignore-unfixed` is about.)
5. **Does your app actually call the affected code path?**

**The point:** question 5 is the one tools cannot answer, and it is why a CRITICAL is not
automatically an emergency. Severity is a property of the vulnerability. **Risk is a property of
your system.** This is the honest version of "we have 40 CVEs".

---

## E7 — Generate an SBOM (4 min)

**Why bother:** "software bill of materials" is a term you will be asked about, and an
increasingly common contract
requirement. It is one command.

```bash
trivy image --format spdx-json --output sbom.json YOURNAME/devsecops-lab:v1
grep -c '"name"' sbom.json          # roughly, how many components you shipped
```

- [ ] The number is far larger than I expected

**The point:** you shipped hundreds of components and personally chose two of them. An SBOM is
the list you hand someone when a new CVE lands and the question is *"are we affected?"* —
answerable in seconds instead of days.

---

## E8 — Kubernetes Secrets are not encrypted (5 min)

**Why bother:** almost everybody assumes the word "Secret" means encrypted. It does not, and
this
is a favourite exam question.

```bash
kubectl create secret generic demo-secret --from-literal=api-key=supersecret123
kubectl get secret demo-secret -o yaml
```

> 🎯 **Predict first:** the value looks scrambled. Is it encrypted? ______

```bash
kubectl get secret demo-secret -o jsonpath='{.data.api-key}' | base64 -d; echo
```

- [ ] It printed `supersecret123`

```bash
kubectl delete secret demo-secret
```

**The point:** base64 is **encoding, not encryption** — it exists so binary values survive YAML.
By default a Kubernetes Secret is stored in etcd in the clear. It is better than a hardcoded
value (it is out of your git repo, and access is controlled by RBAC), but it is not a vault.
Production wants encryption at rest plus an external secret store.

---

## E9 — Watch a zero-downtime deploy (6 min)

**Why bother:** Lab D proves a probe restarts a broken pod. This proves the *readiness* probe
earns its
place, which is otherwise the more abstract of the two.

Make sure the probes version is applied, then start a traffic monitor:

```bash
kubectl apply -f k8s/deployment-probes.yaml
kubectl port-forward service/web 8080:80
```

Second terminal — one line per request, so any failure is visible:

```bash
while true; do curl -s -o /dev/null -w "%{http_code} " localhost:8080; sleep 0.2; done
```

Third terminal — force a full rollout:

```bash
kubectl rollout restart deployment/web
kubectl rollout status deployment/web
```

- [ ] Every replaced pod, and **still nothing but `200`**

**The point:** Kubernetes replaced every pod under live traffic and no user noticed. That only
works because the readiness probe holds each new pod out of the Service until it can actually
serve. Remove it and users hit half-started pods for a second or two on every deploy.

> **Try it the other way** if you have time: `kubectl apply -f k8s/deployment.yaml` (no probes),
> rollout-restart again, and watch for `000` and `502` in the stream.

---

## E10 — Break it on purpose, then roll back (4 min)

**Why bother:** you will meet `ImagePullBackOff` for real one day, probably under pressure.
Better to meet it deliberately now and learn the one command that explains it.

```bash
kubectl set image deployment/web web=YOURNAME/devsecops-lab:v99-does-not-exist
kubectl get pods
```

- [ ] New pods are stuck in `ImagePullBackOff` or `ErrImagePull`

```bash
kubectl describe pod <stuck-pod-name> | tail -15
```

- [ ] The Events at the bottom name the real problem

> 📖 **`kubectl describe`, and read the Events at the bottom.** That is the answer to almost every
> "why is my pod not running" question you will ever have.

```bash
kubectl rollout undo deployment/web
kubectl get pods
```

- [ ] Back to healthy

**The point:** notice that **the old pods kept running the whole time.** A Deployment will not
tear down working pods to make room for ones that cannot start. Your bad deploy failed *safely* —
and `rollout undo` is the fastest mitigation in Kubernetes. Mitigate first, diagnose after.

---

## If you only do three

1. **E1** — the secret in git history. It turns something you were told into something you saw.
2. **E3** — the pre-commit hook. Shift-left becomes something that happens to you.
3. **E8** — base64 Secrets. Thirty seconds, and it corrects a belief nearly everybody holds.

---

## E11 — Autoscaling, for real (6 min)

**Why bother:** "it scales automatically" is the single most-repeated claim about Kubernetes and
almost
nobody has watched it happen. `metrics-server` is already enabled from Lab 0, so this costs one
command.

```bash
kubectl autoscale deployment web --cpu-percent=50 --min=2 --max=8
kubectl get hpa -w
```

Leave that watching. In a second terminal, generate load:

```bash
kubectl port-forward service/web 8080:80
```

Third terminal:

```bash
while true; do curl -s localhost:8080 > /dev/null; done
```

- [ ] `TARGETS` climbs above 50%
- [ ] `REPLICAS` increases on its own

Stop the load with **Ctrl+C** and keep watching.

- [ ] It scales **back down** — but takes several minutes to do it

> 🧠 **Why is scaling down so much slower than scaling up?** Because being wrong in one
> direction costs money and being wrong in the other costs an outage. The default cooldown is
> deliberate, not a bug.

```bash
kubectl delete hpa web
```

**The point:** this is the same desired-state loop as self-healing in Lab A. You did not say
"add a pod". You said "keep CPU near 50%", and the controller works out the rest.

---

## E12 — ConfigMap vs Secret (5 min)

**Why bother:** having just met Secrets in E8, most people still cannot say when to use which.
The distinction is on every exam and in every real deployment.

```bash
kubectl create configmap app-config --from-literal=LOG_LEVEL=debug --from-literal=REGION=eu-west
kubectl create secret generic app-secret --from-literal=API_KEY=sk_live_fake123

kubectl get configmap app-config -o yaml     # plain text
kubectl get secret    app-secret -o yaml     # base64 - which you already know is not encryption
```

| | ConfigMap | Secret |
|---|---|---|
| For | Non-sensitive settings | Credentials |
| Stored as | Plain text | base64 (encrypted at rest **only if** the cluster is configured for it) |
| Shows in `kubectl describe` | **Values** | Only sizes |
| Same risk if leaked? | No | **Yes** |

```bash
kubectl describe configmap app-config    # you can read the values
kubectl describe secret app-secret       # 'api-key: 15 bytes' - deliberately not shown
kubectl delete configmap app-config; kubectl delete secret app-secret
```

- [ ] `describe` printed ConfigMap values but withheld the Secret's

**The point:** both are key-value pairs injected into pods the same way. The difference is how
the platform *handles* them — and `describe` hiding one but not the other is the clearest
evidence that Kubernetes treats them differently, even though neither is encrypted by default.

> **Rule of thumb:** if it appearing in a screenshot during a demo would be a problem, it is a
> Secret. Everything else is a ConfigMap.

