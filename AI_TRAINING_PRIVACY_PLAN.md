# Optional AI-training contribution — implementation checklist (draft, not enabled)

Status: PROPOSAL ONLY. Do not transmit research/training events until the data flow, security, retention, consent wording, and youth safeguards have been reviewed. Existing optional cloud saving is a different permission.

## Intended player flow
1. Player can start and finish two levels without any AI-training events being recorded or transmitted. Existing local gameplay progress is separate from training contribution.
2. After the second completed level, show a short age-range and automatically generated nickname screen, followed by a plain-language training-data notice with equally visible **Accept** and **Decline**.
3. Decline continues normal gameplay, with no training uploads. Acceptance begins recording *subsequent* eligible gameplay only. Do not backfill the first two levels.
4. Under 13: no AI-training contribution; normal local gameplay remains available.
5. Ages 13–15 and 16–17: age-appropriate notice, affirmative opt-in, and reviewed assessment of capacity and applicable guardian permission before any upload. If uncertain, keep collection disabled.
6. Ages 18+: affirmative opt-in after notice; no prechecked boxes.
7. Settings: see consent status, stop future contribution, review full notice, and request deletion of linked records. Cloud saving and AI training must have separate controls.

## Proposed minimal event schema (subject to review)
- Random participant identifier (pseudonymous, not anonymous), age *range* only
- Game type, level, outcome, coarse response time, adaptive difficulty settings
- No names, emails, exact birth dates, IP addresses in application payloads, free text, health data, device fingerprints, or precise location
- Avoid raw timestamps where session-relative ordering suffices; define a short retention schedule before launch

## Engineering acceptance criteria
- Separate keys/consent version for training vs. cloud sync; default false, including existing users
- No network calls to training endpoint before explicit valid consent
- First two levels are never uploaded, including on later acceptance, cloud restore, retry, or refresh
- Server enforces consent, eligibility, least-privilege access, and rate limits; client UI alone is insufficient
- Withdrawal stops new uploads immediately; deletion and backup/log limitations are accurately disclosed
- Test adult accept/decline, youth flows, under-13, refresh, offline, network failure, consent revocation, and old accounts
- No public training-data table or service credentials in browser source
- No medical effectiveness claims

## Review questions before activation
- Who operates and accesses the training database?
- Where is it hosted and for how long are events retained?
- Which jurisdictions will Memora serve, and is guardian permission needed for some teen users?
- How can a user with a lost anonymous session exercise deletion rights?
- Does the current optional cloud-sync notice cover its own purposes accurately?
- Who is the published privacy contact?

This is a planning document, not a consent policy or evidence of legal compliance.
