# Submission Checklist

## Source ZIP

Commit the final reviewed tree, then create the source archive from `HEAD`:

```bash
git archive --format=zip --prefix=mathquest/ HEAD -o mathquest-src.zip
```

The source archive intentionally reflects committed files only. Do not include `.env.local`, API keys, node_modules, `.next`, or personal data.

## Outer Candidate ZIP

Create `candidate_details.txt` from `candidate_details.txt.template`, then add your real candidate details and resume locally. Keep those private files out of Git. Package `mathquest-src.zip`, `candidate_details.txt`, and the resume into:

```text
FullName_RegisterNumber_Task1.zip
```

Do not commit real candidate data or resume material.

## Final checks

- Run `npm install`, `npm run build`, and `npm test` from a fresh clone.
- Run `npm run release-check`; resolve every FAIL and review the EVAL warning.
- Add processed art assets and capture screenshot placeholders listed in README.
- Add the deployed Vercel URL and measured evaluation details.
- Complete the AI-assistance disclosure in README truthfully.
- Have a qualified teacher review GSE alignment and lesson wording.
