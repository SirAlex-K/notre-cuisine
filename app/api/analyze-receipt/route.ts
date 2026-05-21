import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            {
              type: "text",
              text: `Analyse ce ticket de caisse et extrais toutes les informations.
              Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de blocs de code) avec cette structure exacte:
              {
                "store_name": "nom du magasin",
                "date": "YYYY-MM-DD ou null si illisible",
                "total": nombre (montant total en euros),
                "items": [
                  {"name": "nom du produit", "quantity": "quantité ou null", "price": nombre en euros}
                ]
              }
              Si tu ne vois pas clairement un champ, mets null. Les prix doivent être en euros (nombre décimal).`,
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content ?? "{}";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Analyze receipt error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
