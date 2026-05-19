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
              text: `Analyze this meal photo and estimate the nutritional content.
              Respond ONLY with a valid JSON object (no markdown, no code blocks) with this exact structure:
              {"food_name": "string", "calories": number, "protein": number, "carbs": number, "fat": number}
              All macro values should be in grams. Be as accurate as possible based on what you can see.`,
            },
          ],
        },
      ],
      max_tokens: 200,
    });

    const content = response.choices[0].message.content ?? "{}";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Analyze meal error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
