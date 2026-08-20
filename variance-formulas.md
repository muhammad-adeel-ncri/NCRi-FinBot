# Department Variance Formulas

## Two columns shown in Department Wise Variance table

### vs Last Month (v1)
```
v1 = (current - prev1) / prev1 × 100
```
Compares current month gross salary against the immediately previous month.

### vs 2mo Avg (v2)
```
avgPrev2 = (prev1 + prev2) / 2
v2 = (current - avgPrev2) / avgPrev2 × 100
```
Compares current month against the **average of the two months before it** — smooths out single-month spikes.

### Flagged (red row)
```
flagged = |v1| > 3%  OR  |v2| > 3%
```

---

## Verified Example (July 2026 — one department)

| Period | Gross | Net | EOBI | Tax | Employees |
|--------|-------|-----|------|-----|-----------|
| May 2026 | 260,000 | 251,856 | 370 | 7,774 | 1 |
| June 2026 | 341,000 | 332,855 | 370 | 7,775 | 2 |
| July 2026 | 344,000 | 322,292 | 370 | 21,338 | 2 |

### vs Last Month (July − June)

| Metric | Calculation | Result |
|--------|-------------|--------|
| Gross | (344,000 − 341,000) / 341,000 | +0.9% |
| Net | (322,292 − 332,855) / 332,855 | −3.2% |
| EOBI | (370 − 370) / 370 | 0.0% |
| Tax | (21,338 − 7,775) / 7,775 | +174.4% |
| Employees | 2 − 2 | 0 |

### vs 2mo Avg (July − avg(May, June))

| Metric | avg(May, Jun) | Calculation | Result |
|--------|--------------|-------------|--------|
| Gross | (260,000 + 341,000) / 2 = 300,500 | (344,000 − 300,500) / 300,500 | +14.5% |
| Net | (251,856 + 332,855) / 2 = 292,355.5 | (322,292 − 292,355.5) / 292,355.5 | +10.2% |
| EOBI | (370 + 370) / 2 = 370 | (370 − 370) / 370 | 0.0% |
| Tax | (7,774 + 7,775) / 2 = 7,774.5 | (21,338 − 7,774.5) / 7,774.5 | +174.5% |
| Employees | (1 + 2) / 2 = 1.5 | 2 − 1.5 | +0.5 |

---

## Code Location
- Formula computed in: `app/(app)/dashboard/page.tsx` — `varianceMap` useMemo
- Displayed in: `components/DepartmentTable.tsx`
- Detail modal: `components/DeptVarianceModal.tsx`
