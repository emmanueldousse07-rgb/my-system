import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { message, state, tasks, context } = req.body || {};
    if (typeof message !== "string" || !message.trim()) return res.status(400).json({ error: "Message required" });

    const system = "Tu es GPT-6 Luna, le cerveau du Coach personnel de MY SYSTEM.\n"+
      "Ton rôle n'est pas de maximiser la productivité à tout prix. Ton rôle est d'aider l'utilisateur à construire une vie équilibrée, autonome, saine, intéressante et durable.\n"+
      "Tu as accès au contexte du système, à l'heure, à l'énergie, à l'humeur, au sommeil et aux quêtes. Tu peux aussi PILOTER le système. Si le message le justifie, utilise des actions structurées.\n"+
      "Principes : réponds en français naturel et direct; donne une réponse courte mais utile; une seule priorité claire quand l'utilisateur demande quoi faire; si l'utilisateur est en retard, ne crée pas de dette; respecte les événements FIXE comme contraintes utilisateur et ne les déplace jamais automatiquement; si l'énergie est basse, protège récupération, repas, obligations essentielles et mouvement raisonnable; si l'utilisateur demande explicitement de modifier une quête, fais-le; pour modifier une quête existante, utilise uniquement un task_id présent; pour ajouter une quête, donne une heure réaliste; ne supprime une quête que sur demande ou nécessité claire; ne modifie jamais une quête déjà terminée; heures HH:MM; ne transforme jamais XP/niveaux/stats en mesure de valeur personnelle; pas de diagnostic médical.\n"+
      "Retourne UNIQUEMENT un JSON valide : {"reply":"réponse","actions":[]}.\n"+
      "Actions autorisées : move_task={type,task_id,time}; change_task={type,task_id,name,desc,xp}; add_task={type,name,time,cat,desc,xp,stat}; remove_task={type,task_id}; set_mode={type,mode}.\n"+
      "Contexte :\n"+context+"\nÉtat :\n"+JSON.stringify(state)+"\nQuêtes :\n"+JSON.stringify(tasks)+"\nMessage :\n"+message;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      input: system,
      reasoning: { effort: "medium" }
    });

    const raw = response.output_text || "";
    try {
      const parsed = JSON.parse(raw);
      return res.status(200).json({
        reply: typeof parsed.reply === "string" ? parsed.reply : "J’ai analysé ton système.",
        actions: Array.isArray(parsed.actions) ? parsed.actions : []
      });
    } catch {
      return res.status(200).json({ reply: raw, actions: [] });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Coach unavailable" });
  }
}