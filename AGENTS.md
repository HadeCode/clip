# AI Video Clipping Engine — Core Rules & Operational Directives

## 1. Core Principle
The engine selects **SEMANTIC EVENTS**, not arbitrary temporal windows. Every final clip must represent an independent, meaningful moment.

---

## 2. Inviolable Constraints ("Never")
- **Never** generate the next clip by extending or sliding the previous clip.
- **Never** assume nearby timestamps represent separate clips.
- **Never** return multiple clips from the same semantic event.
- **Never** select only the highest-scoring candidates without diversity selection.
- **Never** analyze only the beginning of a long video.
- **Never** cut mid-sentence when a natural boundary is available.
- **Never** manufacture weak clips merely to satisfy the requested clip count.

---

## 3. Mandatory Workflow ("Always")
1. **Analyze the full source timeline**: Scan the complete timeline across all partitions.
2. **Build a semantic event map**: Detect discourse boundaries, audio peaks, and topic markers.
3. **Generate a high-recall candidate pool**: Capture all viable standalone candidates before filtering.
4. **Score candidates independently**: Evaluate on multi-dimensional quality criteria.
5. **Apply user intent/topic filtering**: Adapt weight matrices based on user requests (funny, climax, trending, educational, story).
6. **Apply temporal deduplication**: Enforce minimum inter-clip spacing and event isolation.
7. **Apply semantic deduplication**: Compute normalized TF-IDF cosine similarity to reject topic duplicates ($\text{sim} > 0.58$).
8. **Apply diversity-aware selection**: Maximize marginal relevance (MMR) across topics and timeline zones.
9. **Refine clip boundaries**: Snap start/end to natural sentence beginnings, speech pauses, hooks, and payoffs.
10. **Validate each final clip as standalone content**: Confirm complete thought, hook presence, and resolution.

---

## 4. Selection Objective
Optimize:
$$\text{Quality} + \text{Relevance} + \text{Novelty} + \text{Standalone Coherence} + \text{Topic Match} + \text{Timeline Coverage}$$

While strictly minimizing:
$$\text{Temporal Overlap} + \text{Semantic Similarity} + \text{Same-Event Duplication} + \text{Continuation Clips}$$

---

## 5. Semantic Equivalence Definition
Two clips are considered duplicates even when they possess completely different timestamps if they represent the same:
- Story
- Joke
- Claim
- Event
- Conversation
- Narrative beat
- Reaction
- Idea

---

## 6. Final-Selection Principle
Use **Marginal Relevance / Diversity Selection (MMR)** rather than simply taking the top $N$ scores. The next clip must justify its existence independently from the clips already selected.

---

## 7. Quality Over Quantity
If only 5 excellent independent moments exist, return 5. Do not create 10 mediocre variations of those 5 moments.

---

## 8. Debug Metadata Requirements
Every selected clip retains:
- `source_event_id`: Unique identifier of the source semantic event
- `start` / `end`: Boundary timestamps
- `topic`: Classified taxonomy category
- `quality_score`: Multi-dimensional quality score ($0-100$)
- `hook_score`: Hook strength ($0-100$)
- `payoff_score`: Payoff strength ($0-100$)
- `standalone_score`: Standalone completeness score ($0-100$)
- `diversity_score`: Marginal diversity contribution score
- `why_selected` / `reason_selected`: Narrative rationale for selection
- `scoreBreakdown`: Hook, flow, engagement, and trend indicators

---

## 9. Regression Invariant
Any future change to clip discovery must preserve the invariant verified in `tests/test_clipping_engine.js`:
> Multiple requested clips must not become sequential continuations of the same source moment.
