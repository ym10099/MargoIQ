import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const { goal, progress, summary } = await req.json()
    if (!goal) return NextResponse.json({ error: 'Missing goal' }, { status: 400 })

    const prompt = `You are Margo, an AI CFO coaching a small business owner toward a specific goal.

THE GOAL:
${goal.title} (${goal.type} target of ${goal.target}${goal.deadline ? `, deadline ${goal.deadline}` : ''})
${goal.why ? `Why it matters to them: ${goal.why}` : ''}

CURRENT PROGRESS:
${progress}

THEIR FINANCIAL DATA:
${summary || 'No data available.'}

Give them 2-4 short sentences of specific, actionable coaching toward THIS goal. Rules:
- Use their real numbers. Never invent figures.
- Be concrete: name specific projects, expenses, or amounts from their data when relevant.
- If they are behind, say what would close the gap in practical terms.
- If they are ahead, acknowledge it and say what protects the lead.
- Reference their "why" if they gave one, briefly and warmly.
- Plain language, no jargon, no markdown, no asterisks, no bullet symbols.
- Warm and direct, like a CFO who wants them to win.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ advice: text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not generate advice' }, { status: 500 })
  }
}
