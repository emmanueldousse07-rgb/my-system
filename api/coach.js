import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, state, tasks, context } = req.body || {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message required" });
    }

    const system = `Tu es le Coach personnel de MY SYSTEM. Tu dois aider l'utilisateur à construire une vie saine, compétente, autonome, intéressante et équilibrée. Tu ne transformes jamais la productivité en valeur personnelle.

Le point important : tu es aussi le cerveau opérationnel du système. Tu peux proposer des changements concrets au planning et aux quêtes. Quand c'est pertinent, utilise des actions structurées plutôt que de seulement expliquer quoi faire.

Règles :
- Réponds en français, naturellement et concrètement.
- Regarde l'heure actuelle, les quêtes terminées, les horaires, l'énergie, l'humeur et le mode.
- Si l'utilisateur est en retard, ne demande pas de rattraper mécaniquement toute la journée : réorganise intelligemment la suite.
- Si l'énergie est basse, réduis ou déplace les demandes exigeantes.
- Tu peux déplacer une quête, modifier son nom/sa description, ajouter une quête ou passer en mode léger.
- Ne modifie pas arbitrairement le planning : une action doit avoir une raison liée au message ou au contexte.
- Les heures doivent être au format HH:MM.
- Utilise uniquement les task_id présents dans la liste pour modifier une quête existante.
- Ne supprime une quête que si l'utilisateur le demande ou si elle est clairement devenue inutile.
- Ne donne pas de diagnostic médical.

Tu dois retourner UNIQUEMENT un JSON valide, sans Markdown, exactement sous cette forme :
{
  "reply": "ta réponse au message",
  "actions": [
    {
      "type": "move_task",
      "task_id": "id existant",
      "time": "HH:MM"
    }
  ]
}

Types d'actions autorisés :
- move_task : déplacer une quête existante à une nouvelle heure.
- change_task : modifier name, desc ou xp d'une quête existante.
- add_task : créer une quête avec name, time, cat, desc, xp, stat.
- remove_task : supprimer une quête personnalisée ou une quête devenue inutile.
- set_mode : mode "normal" ou "light".

Si aucune modification n'est nécessaire, actions doit être [].

Contexte :
${context}

État :
${JSON.stringify(state)}

Quêtes :
${JSON.stringify(tasks)}

Message utilisateur :
${message}`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      input: system
    });

    const raw = response.output_text || "";
    try {
      const parsed = JSON.parse(raw);
      return res.status(200).json({
        reply: typeof parsed.reply === "string" ? parsed.reply : "Je regarde ton système et j'ajuste la suite.",
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