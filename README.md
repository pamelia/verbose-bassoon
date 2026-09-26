# ¡Dale!

A tiny, ad-free Spanish practice app with 205 prompts from the first weeks of A1 study. It mixes
sentence completion, phrase recall, immediate feedback, and lightweight spaced
practice in a ten-question session. A round can focus on conversation, people
and professions, likes and plans, verbs, or numbers. Say-it-aloud mode lets two
people take turns, reveal the answer, and self-grade without typing.

## Why this is not just a flashcard deck

Flashcards are useful when they make you retrieve an answer. They are much less
useful when they become a stack to reread. The app therefore asks for typed
answers in short, familiar contexts and brings missed prompts back sooner.

The design is based on a few durable findings:

- Repeated retrieval improved delayed foreign-vocabulary recall while repeated
  study after a correct answer did not: [Karpicke & Roediger, 2008](https://doi.org/10.1126/science.1152408).
- Longer spacing between foreign-vocabulary relearning sessions substantially
  improved long-term retention: [Bahrick et al., 1993](https://doi.org/10.1111/j.1467-9280.1993.tb00571.x).
- Retrieval paired with corrective feedback benefits additional-language
  vocabulary learning: [Li et al., 2024](https://eric.ed.gov/?id=EJ1420152).
- A balanced language course also needs meaning-focused input, meaning-focused
  output, deliberate language study, and fluency work: [Nation, 2007](https://www.wgtn.ac.nz/lals/resources/paul-nations-resources/paul-nations-publications/publications/documents/2007-Four-strands.pdf).

¡Dale! covers deliberate recall and a small amount of written output. Lessons,
conversation, and understandable listening/reading remain essential.

## Run locally

No build or package install is needed.

```bash
python3 -m http.server 8080 --directory dist
```

Open <http://localhost:8080>. Without the production API, progress stays in the
browser's local storage.

## Check

```bash
node --test tests/app.test.mjs
```

## Deployment

`Dockerfile` builds a small Go server that serves the static files and persists
authenticated progress through PostgreSQL. Pushes to `main` publish
`ghcr.io/pamelia/verbose-bassoon` with timestamped commit tags. The Hetzner
cluster deployment is reconciled by Flux from the companion
`pamelia/effective-garbanzo` repository and is exposed at
<https://dale.pamelia.se>.
