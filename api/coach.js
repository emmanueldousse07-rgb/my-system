import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { message, state } = req.body || {};
    if (typeof message !== "string" || !message.trim()) return res.status(400).json({ error: "Message required" });

    const system = `Tu es le Coach personnel de MY SYSTEM. Ton objectif est d'aider l'utilisateur à construire progressivement une vie saine, compétente, autonome, intéressante et équilibrée. Tu n'optimises pas la productivité au détriment du sommeil, de la récupération, des relations ou du plaisir. Tu ne diagnostiques pas et tu ne remplaces pas un professionnel.

Tu reçois un état local de l'application. Réponds naturellement en français, de façon concrète et concise. Quand pertinent, propose une seule prochaine action. Tu peux recommander de réduire ou déplacer une charge quand l'énergie est basse. Ne transforme jamais la valeur personnelle de l'utilisateur en score.

État actuel:
${JSON.stringify(state)}

Message:
${message}`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      input: system
    });

    return res.status(200).json({ reply: response.output_text });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Coach unavailable" });
  }
}
