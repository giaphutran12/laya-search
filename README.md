# Laya Search

A local YC company discovery app inspired by the supplied startup-logo search demo.

## Run

```sh
npm start
```

Open http://127.0.0.1:4317. Node 22+ required. The server loads `.env.local` execution-only; `JEV_API_KEY` stays server-side. Laya runs locally with Core ML. Public logo images load from their original hosts. JEV mode sends your query and shortlisted public company profiles to TypeSafe.

## Install the local model on another Mac

Requires Apple Silicon, uv and Python 3.12:

```sh
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python laya-coreml==0.1.0
.venv/bin/hf download aac6fef/laya-multilingual-coreml --revision 8139e9089273319512c730218903784074133187 --local-dir models/laya
npm start
```

Model download is about 680 MB. Wait for the local status to become ready. Restart the server after installing the model. Copy `.env.example` to `.env.local` only on a fresh setup and enter your key locally; do not overwrite an existing environment file.

## Search behavior and limits

The snapshot includes 6,245 publicly launched YC companies, fetched September 22, 2026. BM25-style keyword retrieval with a small explicit synonym dictionary shortlists up to 48 profiles. Your chosen engine judges each profile's relevance; scores at least 0.45 are returned, up to 30 cards. These are model estimates, not verified matches. Shortlisting can miss semantic matches without shared terms. Both backends judge the same shortlist, but use different model context capacities. Laya clips long profiles to its 1024-token input limit.

This is a text-search implementation, not full feature parity with the video: logo-color/image queries are not indexed, and company age means batch metadata rather than verified founding dates. The interface now follows the supplied video: centered search, compact scored logo grid, hover details, and a canvas logo pile with gravity, collisions, pointer forces, and a toss control. It uses simplified circular collision bodies for square logo sprites. No sub-second guarantee or search-quality benchmark. API errors remain visible, with no silent engine fallback.

The server binds only to loopback; it is a local tool, not production hosting. Model files and secrets are excluded by `.gitignore`.

## Sources

- Dataset: https://github.com/yc-oss/api and https://yc-oss.github.io/api/companies/all.json
- Laya: https://github.com/mizorewww/laya-coreml
- Model: https://huggingface.co/aac6fef/laya-multilingual-coreml
- JEV HTTP contract: https://docs.typesafe.ai/api

QA receipts are in `receipts/`.
