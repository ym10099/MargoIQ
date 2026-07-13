import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: Request) {
  try {
    const { fileData, mediaType } = await req.json()

    if (!fileData || !mediaType) {
      return Response.json({ error: 'No file provided.' }, { status: 400 })
    }

    // Build the file block — Claude reads PDFs as "document" and images as "image"
    const isPdf = mediaType === 'application/pdf'
    const fileBlock = isPdf
      ? {
          type: 'document' as const,
          source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: fileData },
        }
      : {
          type: 'image' as const,
          source: { type: 'base64' as const, media_type: mediaType, data: fileData },
        }

    const prompt = `You are analyzing a purchase order document. Extract the key information and return it as JSON.

Return ONLY a valid JSON object (no markdown, no backticks, no extra text) with exactly this structure:
{
  "vendor": "the vendor/supplier name, or null if not found",
  "po_number": "the purchase order number, or null if not found",
  "total": the total amount as a number (no currency symbol), or null if not found,
  "po_date": "the date on the PO as a string, or null if not found",
  "line_items": [
    { "description": "item description", "quantity": number or null, "price": number or null }
  ],
  "summary": "a 2-3 sentence plain-English summary of what this purchase order is for, who it's from, and the key details a business owner should know"
}

If the document is not a purchase order or you cannot read it, still return the JSON with null values and explain in the summary field.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            fileBlock as any,
            { type: 'text', text: prompt },
          ],
        },
      ],
    })

    // Pull the text out of Claude's response
    const textBlock = message.content.find((b) => b.type === 'text')
    const raw = textBlock && 'text' in textBlock ? textBlock.text : ''

    // Clean any stray markdown fences, then parse
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return Response.json({ error: 'Could not parse the document. Try a clearer file.' }, { status: 500 })
    }

    return Response.json({ result: parsed })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Something went wrong.' }, { status: 500 })
  }
}