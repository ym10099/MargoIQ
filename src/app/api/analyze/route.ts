import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { revenues, expenses, totalRevenue, totalExpenses, netProfit, margin } = await req.json();

  const revenueLines = revenues
    .filter((r: { label: string; amount: string }) => r.label || r.amount)
    .map((r: { label: string; amount: string }) => `  - ${r.label || 'Unnamed'}: $${parseFloat(r.amount || '0').toLocaleString()}`)
    .join('\n');

  const expenseLines = expenses
    .filter((e: { label: string; amount: string }) => e.label || e.amount)
    .map((e: { label: string; amount: string }) => `  - ${e.label || 'Unnamed'}: $${parseFloat(e.amount || '0').toLocaleString()}`)
    .join('\n');

  const prompt = `You are a sharp, friendly financial advisor analyzing a small business P&L statement.

Here are the numbers:

REVENUE:
${revenueLines || '  - None entered'}

EXPENSES:
${expenseLines || '  - None entered'}

SUMMARY:
- Total Revenue: $${totalRevenue.toLocaleString()}
- Total Expenses: $${totalExpenses.toLocaleString()}
- Net Profit: $${netProfit.toLocaleString()}
- Profit Margin: ${margin}%

Give a concise, honest, and actionable analysis in 3-4 short paragraphs. Cover:
1. Overall financial health — is this healthy, concerning, or okay?
2. What stands out (biggest expense, revenue concentration risk, etc.)
3. 2-3 specific, practical recommendations to improve profitability
4. One honest warning if anything looks risky

Be direct and plain-spoken. No fluff. Talk like a trusted advisor, not a textbook.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  const insight = data.content?.[0]?.text || 'Unable to generate analysis.';

  return NextResponse.json({ insight });
}