# Ollama Free Model Candidate Catalog (16-32GB Deployment Baseline)

Date: 2026-02-11

## Full-Library Metadata Sweep Baseline
Full namespace discovery was run against the public Ollama library page and captured in:

- `docs/model-eval/ollama-library-namespace-scan-2026-02-11.json`

Snapshot summary:
- Total discovered model namespaces: 211
- Source: `https://ollama.com/library`

This catalog is the constrained shortlist derived from that full-library sweep by applying deployment-fit and workload-fit filters.

## Selection Scope
This catalog includes free local text-generation candidates relevant to Teacher's Assistant workloads (worksheet HTML, lesson-plan HTML, prompt polishing) that are practical for 16-32GB deployments.

In-scope filters:
- General-purpose instruction/chat models in Ollama library.
- Practical quantized tags in ~2GB-10GB range for broad deployability.
- Context window and instruction behavior suitable for long educational prompts.

Out-of-scope:
- Embedding-only / reranker-only models.
- 20GB+ defaults not practical for 16GB baseline hosts.
- Highly specialized coding-only models for default free path.

## Candidate Table
| Model | Family | Default Size | Context Window | Strengths | Risks / Notes | Source |
|---|---|---:|---|---|---|---|
| `llama3.1:8b` | Llama 3.1 | 4.9GB | 128K | Long-context instruction quality; strong general generation for structured educational output | Larger than 3B fallbacks, but still deployable in target baseline | https://ollama.com/library/llama3.1/tags |
| `qwen2.5:7b` | Qwen 2.5 | 4.7GB | 32K card default (model docs mention long-context support) | Strong instruction following and structured output behavior | Card/context presentation differs by tag; requires explicit test in app prompts | https://ollama.com/library/qwen2.5/tags |
| `qwen3:8b` | Qwen 3 | 5.2GB | 40K | Competitive quality with broad language support | Thinking-capable family can require explicit think/no-think handling depending on tag/runtime | https://ollama.com/library/qwen3/tags |
| `deepseek-r1:8b` | DeepSeek R1 | 5.2GB | 128K | High reasoning quality | Thinking-first behavior can increase latency and response-format variance unless explicitly managed | https://ollama.com/library/deepseek-r1/tags |
| `gemma3:4b` | Gemma 3 | 3.3GB | 128K | Efficient footprint with good instruction quality | Smaller parameter count can reduce quality for long structured generation | https://ollama.com/library/gemma3/tags |
| `mistral:7b` | Mistral | 4.4GB | 32K | Fast baseline and mature family | Shorter context vs top long-context candidates | https://ollama.com/library/mistral/tags |
| `llama3.2` | Llama 3.2 | ~2.0GB class default | Small-model class | Fast and lightweight fallback | Lower quality ceiling for complex worksheet/lesson-plan generation | https://ollama.com/library/llama3.2 |

## Decision Inputs
- Official Ollama tag metadata (size/context windows).
- Existing app prompt complexity (long HTML templates + inspiration context).
- Deployment baseline constraint (16-32GB hosts).
- Need for deterministic non-thinking outputs for UI/DB pipelines.

## Locked Policy Outcome
Primary (default): `llama3.1:8b`
Fallback chain: `qwen2.5:7b`, `gemma3:4b`, `llama3.2`

Rationale:
1. `llama3.1:8b` provides the best quality/context balance for this app's long structured outputs.
2. `qwen2.5:7b` is the best nearest-size alternative for structured generation.
3. `gemma3:4b` provides a smaller-footprint fallback.
4. `llama3.2` remains the final compatibility fallback.
