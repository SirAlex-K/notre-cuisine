import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const body = await req.json();
    const { goal, calories, protein, carbs, fat, caloriesEaten, proteinEaten, carbsEaten, fatEaten } = body;

    const remaining = {
      calories: Math.max(0, calories - caloriesEaten),
      protein: Math.max(0, protein - proteinEaten),
      carbs: Math.max(0, carbs - carbsEaten),
      fat: Math.max(0, fat - fatEaten),
    };

    const goalLabels: Record<string, string> = {
      lose: "perte de poids",
      maintain: "maintien du poids",
      gain: "prise de masse musculaire",
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `Tu es un nutritionniste expert. L'utilisateur a pour objectif: ${goalLabels[goal] ?? goal}.

Objectifs journaliers: ${calories} kcal | ${protein}g protéines | ${carbs}g glucides | ${fat}g lipides
Déjà consommé aujourd'hui: ${caloriesEaten} kcal | ${proteinEaten}g protéines | ${carbsEaten}g glucides | ${fatEaten}g lipides
Il reste à couvrir: ${remaining.calories} kcal | ${remaining.protein}g protéines | ${remaining.carbs}g glucides | ${remaining.fat}g lipides

Propose 3 idées de repas ou collations adaptées à ce qui reste à manger aujourd'hui. Les suggestions doivent être réalistes, simples à préparer et délicieuses.

Réponds UNIQUEMENT avec un JSON valide (pas de markdown) :
{
  "suggestions": [
    {
      "name": "Nom du repas",
      "description": "Description courte et appétissante",
      "calories": nombre,
      "protein": nombre,
      "carbs": nombre,
      "fat": nombre,
      "why": "Pourquoi ce repas est adapté à l'objectif"
    }
  ]
}`,
        },
      ],
      max_tokens: 800,
    });

    const content = response.choices[0].message.content ?? "{}";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Suggest meals error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
