# Payroll Forecast Prediction Formulas

## Overview
Forecasts the next 3 months of net payable using weighted month-over-month growth rates, calculated independently per region, then summed.

---

## Step 1 — Month-over-Month Growth Rate
For each consecutive pair of months:
```
growth_rate = (current_month - previous_month) / previous_month
```

Example:
```
May → Jun:  (910,000 - 780,000) / 780,000  = +16.7%
Jun → Jul:  (940,000 - 910,000) / 910,000  = +3.3%
```

---

## Step 2 — Weighted Average Growth Rate
Recent months carry higher weight (weight = index + 1, oldest = 1, newest = N):
```
weighted_avg = Σ(rate_i × weight_i) / Σ(weight_i)
```

Example (2 growth rates):
```
weight_1 = 1  (May→Jun, older)
weight_2 = 2  (Jun→Jul, more recent)

weighted_avg = (16.7% × 1 + 3.3% × 2) / (1 + 2) = 7.8%/mo
```

---

## Step 3 — Project Forward
Starting from the last known month, multiply forward:
```
next_month = last_known × (1 + weighted_growth_rate)
```

The `× (1 + rate)` keeps the full value and adds the growth:
- `× 1` = keep original amount
- `× rate` = add the growth portion

Example (7.8% growth rate):
```
Jul (known):   940,000
Aug (pred):    940,000 × 1.078  =  ~1,013,000
Sep (pred):  1,013,000 × 1.078  =  ~1,092,000
Oct (pred):  1,092,000 × 1.078  =  ~1,177,000
```
Each predicted month feeds into the next (compound growth).

---

## Step 4 — Per Region, Then Summed
Pakistan and UAE each get their own growth rate calculated separately.
Total = Pakistan + UAE for each predicted month.

---

## Step 5 — Confidence Level
Based on **volatility** (standard deviation of all growth rates):

| Condition | Confidence |
|-----------|-----------|
| volatility < 2% AND 4+ months of data | High |
| volatility 2–5% OR fewer than 4 months | Medium |
| volatility > 5% OR fewer than 3 months | Low |

---

## Volatility Formula
```
volatility = std_dev(all_growth_rates)
           = sqrt( Σ(rate_i - mean_rate)² / N )
```

---

## Code Location
- Math engine: `lib/forecast.ts` — `computeForecast(rows, predictMonths=3)`
- API route: `app/api/forecast/route.ts` — calls Gemini to explain the result
- UI component: `components/PayrollForecast.tsx`
