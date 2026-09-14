# SIH26041 pitch deck

A real `.pptx`, generated from code — not hand-built in PowerPoint.

## Fill this in before you submit

`content.js`'s `team` object at the top has placeholder text
(`[Your Team Name]`, `[Member 1 — Team Leader]`, etc.) — that's the one
part I can't fill in for you. Edit those fields (or tell me your team
name/members/institution/contact and I'll drop them in), then regenerate.

## How "self-updating" actually works here

`content.js` is the single source of truth for every slide's content.
Whenever the actual project changes in a way that matters for the pitch
(a new module, a new security feature, a stack change), it gets updated
there — the same habit already used for `ar-safety-trainer/README.md`
all through this project. The `.pptx` itself is just a build output of
that file, regenerated on demand, never hand-edited directly (any manual
edit to the `.pptx` would be silently overwritten next time it's
regenerated).

## Regenerate

```
npm install   # first time only
npm run generate
```

Produces `SIH26041-pitch-deck.pptx` in this folder. Run it again anytime
content.js changes.

## Format note

Built to match the documented SIH/AICTE 6-slide format (strict limit —
teams have been disqualified for exceeding it or altering the mandated
template). What's here is a clean deck matching that structure and
content requirements, **not** a copy of SIH's own officially-branded
template file (that's typically distributed through the SIH portal or
your institution's nodal center). If you're handed an actual official
`.pptx` with mandated fonts/branding, paste this content into *that*
file rather than submitting this one directly, to stay safe on the
"don't alter the template" rule.
