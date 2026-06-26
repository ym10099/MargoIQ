import { Anthropic } from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: Request) {
  try {
    const { pnl } = await req.json()

    // Guard: we only narrate numbers that were already computed.
    if (!pnl || typeof pnl.netProfit !== 'number') {
      return NextResponse.json({ error: 'Invalid P&L data' }, { status: 400 })
    }

    const biggest = pnl.biggestExpense
      ? `${pnl.biggestExpense.category} ($${pnl.biggestExpense.amount})`
      : 'none'

    const prompt = `You are an experienced CFO advising a small business owner. You are given the business's already-calculated financials. DO NOT recalculate or invent any numbers — only use the exact figures provided.

Financials:
- Revenue: $${pnl.revenue}
- Expenses: $${pnl.expenses}
- Net profit: $${pnl.netProfit}
- Profit margin: ${pnl.profitMargin}%
- Biggest expense category: ${biggest}
- Number of transactions: ${pnl.transactionCount}

Write a response with EXACTLY these three parts, each one sentence, plain language, no jargon, speaking directly to the owner as "you":

1. THE NUMBER: State whether they made or lost money and how much.
2. THE REASON: The single biggest factor driving that result, referencing the actual figures.
3. THE ACTION: One specific, concrete action they should take this week to improve profit.

Respond ONLY with valid JSON in this exact format, no markdown, no extra text:
{"number": "...", "reason": "...", "action": "..."}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const text =
      message.content[0].type === 'text' ? message.content[0].text : ''

    // Strip any stray markdown fences just in case, then parse
    const clean = text.replace(/```json|```/g, '').trim()
    const insight = JSON.parse(clean)

    return NextResponse.json({ insight })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate insight' },
      { status: 500 }
    )
  }
}