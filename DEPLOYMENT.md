# Source synchronisation and deployment boundaries

The public source snapshot was captured from https://saadamil.com/ on 2026-11-26.
It contains 74 public HTML pages: 37 Arabic and 37 English, with 373 FAQ answers per language.

## Runtime state stays on Hostinger

Never commit, overwrite, delete, mirror, or clean the production data/ directory.
Only data/.htaccess belongs in source control. Existing runtime files on the server,
including articles, FAQ data, cases, consultations, the private admin template,
authentication configuration and rate/session state, must survive any deployment.
The repository intentionally does not contain the private admin configuration or template.
A new installation requires a separately provisioned configuration and private template;
the admin code must fail closed while these are absent. Do not substitute the public bar ID.

Do not deploy by replacing public_html, using a destructive mirror or running git clean.
Use a reviewed file allowlist, stage and verify it first, and preserve production-only files.
Exclude AGENTS.md, README.md, DEPLOYMENT.md, scripts, .github/, and local audit reports from web deployment.

## Release source

Use the current master source, not the older source snapshot or a historical package.
The rollback reference backup/before-live-sync-20261126 preserves the prior commit for comparison.
It contains legacy admin code and must never be deployed wholesale.

The sync does not deploy to Hostinger. No hosting Git deployment or GitHub webhook was connected
when checked on 2026-11-26; check again before future deployment changes.
Do not turn on automatic hosting deployment without reviewing its handling of runtime state.

## Search notifications

The IndexNow job runs on relevant pushes or an explicit manual dispatch, without a daily schedule.
It sends only public canonical HTML URLs listed in the checked-in and live sitemaps,
using the public verification key file and the global IndexNow gateway.
Accepted notification is not proof of crawling, indexing, ranking or AI recommendation.
Use [skip indexnow] in the head commit message for a source-only sync already notified elsewhere.
