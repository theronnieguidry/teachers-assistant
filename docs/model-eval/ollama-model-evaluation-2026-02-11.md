# Ollama Model Evaluation Report (Free Local Path)

Date: 2026-02-11
Scope: Free local generation path for Teacher's Assistant

## Method
1. Catalog relevant candidates from official Ollama model pages/tags.
2. Evaluate runnable candidates with `scripts/benchmark-ollama-models.cjs`.
3. Rank by weighted score:
   - Quality heuristics on worksheet HTML, lesson plan structure, prompt polishing.
   - Latency penalty to avoid selecting very slow defaults.
4. Lock primary + fallback policy for backend enforcement.

## Repro Commands
```bash
# Deterministic smoke output for CI/docs validation
node scripts/benchmark-ollama-models.cjs --fixture --out docs/model-eval/ollama-benchmark-fixture.json

# Live benchmark for installed models
node scripts/benchmark-ollama-models.cjs --installed-only --out docs/model-eval/ollama-benchmark-live.json

# Live benchmark with pulls enabled
node scripts/benchmark-ollama-models.cjs --auto-pull --out docs/model-eval/ollama-benchmark-live.json
```

## Ranked Outcome (Policy)
1. `llama3.1:8b` (Primary)
2. `qwen2.5:7b` (Fallback #1)
3. `gemma3:4b` (Fallback #2)
4. `llama3.2` (Fallback #3)

## Why `llama3.1:8b` Wins For This App
- Long 128K context support for large prompt templates + inspiration context.
- Strong general instruction quality for structured educational HTML outputs.
- Reasonable footprint (4.9GB default quantized tag) for 16-32GB hosts.
- Predictable text generation behavior without mandatory think/no-think controls.

## Notes on Other Candidates
- `qwen3:8b`: high quality but family includes thinking-mode complexity that can affect deterministic output patterns unless explicitly controlled.
- `deepseek-r1:8b`: strong reasoning but higher latency and thought-mode management overhead for production UX.
- `mistral:7b`: solid baseline, but shorter context and weaker fit for long, structured generation.

## Source Index (Official)
- Llama 3.1 tags: https://ollama.com/library/llama3.1/tags
- Qwen2.5 tags: https://ollama.com/library/qwen2.5/tags
- Qwen3 tags: https://ollama.com/library/qwen3/tags
- DeepSeek R1 tags: https://ollama.com/library/deepseek-r1/tags
- Gemma3 tags: https://ollama.com/library/gemma3/tags
- Mistral tags: https://ollama.com/library/mistral/tags
- Ollama thinking behavior: https://ollama.com/blog/thinking
