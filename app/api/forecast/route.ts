import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { computeForecast, ForecastRow } from '@/lib/forecast';

export async function POST(req: NextRequest) {
  const { rows } = await req.json() as { rows: ForecastRow[] };

  const result = computeForecast(rows, 3);

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ ...result, explanation: null });
  }

  const MODELS = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];

  const histSummary = result.historical.map((h) =>
    `${h.month}: PKR ${h.total.toLocaleString()} (${Object.entries(h.byRegion).map(([r, v]) => `${r}: PKR ${v.toLocaleString()}`).join(', ')})`
  ).join('\n');

  const predSummary = result.predictions.map((p) =>
    `${p.month}: PKR ${p.total.toLocaleString()} (${Object.entries(p.byRegion).map(([r, v]) => `${r}: PKR ${v.toLocaleString()}`).join(', ')})`
  ).join('\n');

  const prompt = `You are a payroll finance analyst. Analyze this net payable data and explain the forecast professionally.

Historical Net Payable (${result.monthsOfData} months):
${histSummary}

Average month-over-month growth: ${(result.avgGrowthRate * 100).toFixed(2)}%
Volatility: ${(result.volatility * 100).toFixed(2)}%
Confidence: ${result.confidence}

Forecast (next ${result.predictions.length} months):
${predSummary}

Write 3-4 sentences in paragraph form (no bullet points) covering: what the historical trend shows, why these predictions are reasonable, what could change the outcome, and the overall confidence. Be factual, concise, and under 100 words.`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  let lastErr = '';

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const geminiResult = await model.generateContent(prompt);
      const explanation = geminiResult.response.text();
      return NextResponse.json({ ...result, explanation, modelUsed: modelName });
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      console.error(`Gemini [${modelName}] error:`, lastErr);
    }
  }

  return NextResponse.json({ ...result, explanation: null, geminiError: lastErr });
}
