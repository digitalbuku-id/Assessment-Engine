# TASK-001

Title: Recommendation Engine — MVP Format Output

Owner: Hera → Ares

Priority: High

Status: OPEN

## Objective

Menentukan format Recommendation Engine versi pertama
untuk assessment Leadership.

## Input

Assessment Result DTO

Contoh:

```json
{
  "communication": 72,
  "decisiveness": 65
}
```

## Output

Recommendation JSON yang berisi:

- strengths
- weaknesses
- next_best_action

## Acceptance Criteria

- Deterministic
- Explainable
- Versioned
