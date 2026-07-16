import { Anthropic } from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: Request) {
  try {
    const { pnl, monthly, recentTransactions } = await req.json()

    if (!pnl || typeof pnl.netProfit !== 'number') {
      return NextResponse.json({ error: 'Invalid P&L data' }, { status: 400 })
    }

    const biggest = pnl.biggestExpense
      ? `${pnl.biggestExpense.category} ($${pnl.biggestExpense.amount})`
      : 'none'

    const hasTrend = Array.isArray(monthly) && monthly.length >= 2
    let trajectory = ''
    if (hasTrend) {
      trajectory = monthly
        .map(
          (m: any) =>
            `  - ${m.label}: net ${m.netProfit < 0 ? '-' : '+'}$${Math.abs(m.netProfit)} (revenue $${m.revenue}, expenses $${m.expenses})`
        )
        .join('\n')
    }

    // Last 7 days of transactions summary
    const recentSummary = Array.isArray(recentTransactions) && recentTransactions.length > 0
      ? recentTransactions
          .map((t: any) => `  - ${t.txn_date} | ${t.description} | ${t.type === 'income' ? '+' : '-'}$${t.amount}`)
          .join('\n')
      : '  - No transactions in the last 7 days'

    const prompt = `You are an experienced CFO writing a weekly digest for a small business owner. Use ONLY the exact figures provided — do not invent or recalculate anything.

Overall financials (all time):
- Revenue: $${pnl.revenue}
- Expenses: $${pnl.expenses}
- Net profit: $${pnl.netProfit}
- Profit margin: ${pnl.profitMargin}%
- Biggest expense category: ${biggest}
- Total transactions: ${pnl.transactionCount}

${hasTrend ? `Month-by-month trajectory:\n${trajectory}\n` : 'Only one month of data available.\n'}

Transactions from the last 7 days:
${recentSummary}

Give the owner ONE sharp financial insight from this data. Respond with EXACTLY these three parts, each 1-2 sentences, plain language, no jargon, speaking directly to the owner as "you". Be specific — use real numbers from the data.
1. NUMBER: The single most important number or fact they should know right now.
2. REASON: Why it matters — what is driving it in their data.
3. ACTION: One concrete thing to do about it this week.

Respond ONLY with valid JSON, no markdown, no extra text:
{"number": "...", "reason": "...", "action": "..."}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const insight = JSON.parse(clean)

    return NextResponse.json({ insight })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate digest' },
      { status: 500 }
    )
  }
}