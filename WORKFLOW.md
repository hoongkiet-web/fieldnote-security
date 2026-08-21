# Git & Deploy Workflow

Nothing gets built directly against production anymore. This is the
standard flow from here on.

## Branch structure

```
feature branch  --->  staging  --->  main
```

1. Do work on a feature branch (branched from `staging`, not `main`).
2. Merge (or push directly, for solo quick changes) into `staging`.
3. QA against the live staging site (see below).
4. Once it's good, merge `staging` into `main`. That's the only thing
   that updates production.

## Testing on staging

Staging deploys automatically on every push to the `staging` branch, via
`.github/workflows/deploy-staging.yml`. It publishes to a separate GitHub
repo (`fieldnote-security-staging`) so it gets its own Pages URL, served at:

**https://staging.fieldnotesecurity.com**
*(pending your Cloudflare DNS step - see the staging setup report for the
exact CNAME record. Until that's added, the same content is reachable at
https://hoongkiet-web.github.io/fieldnote-security-staging/)*

Staging is kept out of search results automatically as part of the deploy
(disallow-all `robots.txt` + `noindex` meta tag injected into every page) -
this only happens on the staging deploy, production's `robots.txt` is
untouched.

**Login gate:** proposed but not yet applied - see the staging setup
report, Part 3. If you approve it, this section gets updated with the
login flow.

## How production actually updates

GitHub Pages is configured to build only from the `main` branch (confirmed
in the staging setup report). So:

```bash
git checkout main
git merge staging
git push origin main
```

That's the only path to production. Pushing to any other branch, or to
`staging`, never touches the live site.

## Chatbot Worker deploys

Two separate environments, two separate KV namespaces (rate-limit counters
never cross between them), from `chatbot-worker/`:

```bash
# Staging - workers.dev preview URL, safe to hammer while testing
wrangler deploy --env staging

# Production - fieldnotesecurity.com/api/chat
wrangler deploy --env ""
```

See `chatbot-worker/README.md` for the one-time KV namespace setup for
each environment.
