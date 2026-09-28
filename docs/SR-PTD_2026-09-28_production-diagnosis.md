# SR-PTD — Production diagnosis (quick template)

**Date**: 2026-09-28
**Branch**: `main` (no code commits — diagnosis only)
**Report**: [`DIAGNOSTIC-2026-09-28.md`](DIAGNOSTIC-2026-09-28.md)

> **Where this file lives.** As with the earlier SR-PTDs, neither the `sr-ptd-skill` nor
> `C:/projects/Skills/Dev_doc_for_skills` exists in this WSL environment, so the document is
> kept here in `docs/`.

## Task
The goal was a full diagnosis of production (`louisa-shopping-dev.netlify.app`) across four areas:
- errors and outages
- performance
- functional flows
- general health

## What happened
1. The smoke test returned 500 on `/connexion`, `/inscription`, `/commander` and `/recherche`, and `/catalogue` rendered empty.
2. The Netlify function logs (`NETLIFY_SITE_ID=… netlify logs --source functions`) showed `(ENOTFOUND) tenant/user app_anon.<ref> not found` for both app roles.
3. Public DNS returned NXDOMAIN for `<ref>.supabase.co`. That means the free-tier project had been paused after 11 idle days.
4. The owner restored the project, and every route came back to 200 with no new errors.
5. Lint, typecheck, `npm audit`, Redis, auth guards and security headers were checked afterwards. The report ranks findings D1 to D7.

## Lessons (reusable)
- **Symptom of a paused Supabase project:** the pooler returns `ENOTFOUND tenant/user … not found` (XX000 FATAL), and the project host is NXDOMAIN. Check DNS first; it rules out role or password problems in a few seconds.
- **Netlify CLI without a linked folder:** set `NETLIFY_SITE_ID=<id>` for `netlify logs`, and pass `--site <id>` to `netlify env:list` or `env:get`. Secret values come back masked, so a port inside a DB URL can't be verified from the CLI.
- **Most of the storefront answers HTTP 200 during a DB outage.** The home is served from the prerendered shell, and the catalogue's error boundary renders client-side. Only uncached server reads, such as the auth pages and `/commander`, return a real 500. Build uptime checks on those pages or on page content.
- **Lighthouse under WSL** launches the Windows Chrome and fails with `Unable to connect to Chrome`. Even then, `lhci assert` exits 0 with "0 URL(s)". Always check the run count before trusting a green result.
- **The PageSpeed Insights API without a key** shares a daily quota, which can already be exhausted.

## Follow-up (same day): performance and customer flow
6. **Performance:** Lighthouse ran with Playwright's `chromium-headless-shell` (`CHROME_PATH=…`, `--no-sandbox`). Perf was 74–86 and LCP 2.6–4.5 s, failing the budget on `/catalogue` and the product page. CLS was 0 everywhere. The product image had a 2.5 s load delay, and the home TTFB was 3.2 s.
7. **Playwright customer flow:** browse → cart → sign-up → checkout → order → `wa.me` → `/compte` → admin guard all passed.
8. **Bugs found:**
   - The footer WhatsApp link was broken: `href="{`…`}"`, a JSX expression inside quotes (`9941d06`).
   - The footer showed the placeholder text "[Ville — À COMPLÉTER]".
9. **TEST data left in production:** the account `diag-test-20260928@example.com` and the order `d640358d-…`.

**More lessons:**
- **Playwright `waitUntil: 'networkidle'`** can hang on this site. `load` plus a short wait is reliable.
- **PPR in-stream redirects:** after `goto`, the URL only changes once the client runs `NEXT_REDIRECT`. Wait a few seconds before asserting on `page.url()`, otherwise `/admin` looks "allowed".
- **A JSX attribute in quotes is a string:** `href="{`…${x}…`}"` compiles and passes lint and typecheck, but it ships broken. Only a runtime check catches it.

## Open items
The details are in the report:
- **D2:** alerting.
- **D3:** keep-alive or a paid plan.
- **D4:** the runtime DB port on Netlify and in GitHub secrets.
- **D5:** security headers.
- **D6:** the logo on Cloudinary.
- **D7:** the audit advisories.
- **D8:** the footer link is **fixed** in `footer.tsx`. The `href` is now built from `whatsapp_config` with the fallback `+22660554400`. Lint and typecheck pass. It is not committed and not deployed.
- **D9:** performance.
- **D10:** the placeholder copy.
- **Not yet run:** the DB and Sentry checks, the admin flow and the IDOR test. `env.local` has no `DATABASE_URL_*` and no Sentry token.
- **To clean up:** the TEST data.
