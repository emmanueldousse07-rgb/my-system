import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const actionSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["move_task","change_task","add_task","remove_task","set_mode"] },
      task_id: { type: ["string","null"] },
      time: { type: ["string","null"] },
      name: { type: ["string","null"] },
      desc: { type: ["string","null"] },
      xp: { type: ["number","null"] },
      cat: { type: ["string","null"] },
      stat: { type: ["string","null"] },
      mode: { type: ["string","null"] }
    },
    required: ["type","task_id","time","name","desc","xp","cat","stat","mode"],
    additionalProperties: false
  }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://emmanueldousse07-rgb.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, state, tasks, context, previous_response_id } = req.body || {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message required" });
    }

    const instructions = `Tu es le véritable Coach IA personnel intégré à MY SYSTEM.
Tu dois parler comme un excellent assistant personnel humain : naturel, direct, chaleureux, intelligent et concret. Tu peux être familier en français quand l'utilisateur l'est ("frérot", "mec"), sans forcer.

TON RÔLE
Tu aides l'utilisateur à décider, comprendre, organiser et avancer. Tu n'es PAS un simple chatbot de productivité et tu ne récites pas des règles. Tu comprends le message dans son contexte, poses une question seulement si elle est réellement nécessaire, et proposes une réponse utile immédiatement quand c'est possible.

STYLE
- Réponds en français naturel.
- Pas de langage robotique, pas de phrases génériques du type "je garde ça comme contexte".
- Ne répète pas inutilement les informations que l'utilisateur vient de donner.
- Pour une question simple : réponse simple.
- Pour une situation complexe : analyse courte puis recommandation claire.
- Quand l'utilisateur demande quoi faire maintenant, donne une prochaine action concrète.
- Ne transforme pas chaque conversation en optimisation de productivité.
- Si l'utilisateur veut juste discuter, discute normalement.
- Tu peux reconnaître une erreur ou dire "je ne sais pas".
- Ne prétends jamais avoir effectué une action si aucune action système n'est renvoyée.

MY SYSTEM
Tu as accès à l'état actuel de l'application, aux quêtes et à quelques éléments de contexte. Utilise-les réellement.
Tu peux piloter le système avec des actions structurées.
Une action n'est produite que si elle est utile et justifiée par le message.
Respecte les contraintes FIXE : ne les déplace/supprime jamais automatiquement.
Ne modifie jamais une quête terminée.
Si l'utilisateur est en retard, ne crée pas de dette artificielle.
Si l'énergie est basse, protège récupération, repas, obligations essentielles et mouvement raisonnable.
Les XP, niveaux et stats sont des éléments de jeu, jamais une mesure de la valeur personnelle.

ACTIONS
- move_task : déplacer une quête existante.
- change_task : modifier nom/description/XP d'une quête existante.
- add_task : créer une quête.
- remove_task : supprimer une quête uniquement quand c'est demandé ou clairement nécessaire.
- set_mode : "normal" ou "light".
Pour task_id, utilise uniquement un id réellement présent dans les quêtes fournies.
Pour une nouvelle quête, choisis une heure réaliste en HH:MM.
Pour les actions inutiles, renvoie [].

FORMAT
Retourne uniquement un objet JSON conforme au schéma demandé, avec :
reply = ta vraie réponse à l'utilisateur
actions = les éventuelles actions système.

CONTEXTE ACTUEL
${context}

ÉTAT ACTUEL
${JSON.stringify(state)}

QUÊTES ACTUELLES
${JSON.stringify(tasks)}`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      instructions,
      input: message.trim(),
      previous_response_id: typeof previous_response_id === "string" && previous_response_id ? previous_response_id : undefined,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "my_system_coach",
          strict: true,
          schema: {
            type: "object",
            properties: {
              reply: { type: "string" },
              actions: actionSchema
            },
            required: ["reply","actions"],
            additionalProperties: false
          }
        },
        verbosity: "low"
      },
      max_output_tokens: 700
    });

    let parsed;
    try {
      parsed = JSON.parse(response.output_text || "{}");
    } catch {
      parsed = { reply: response.output_text || "Je n’ai pas réussi à formuler ma réponse.", actions: [] };
    }

    return res.status(200).json({
      reply: typeof parsed.reply === "string" ? parsed.reply : "Je t’écoute.",
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      response_id: response.id || null
    });
  } catch (error) {
    console.error("MY SYSTEM Coach:", error);
    return res.status(500).json({ error: error?.message || "Coach unavailable" });
  }
}
