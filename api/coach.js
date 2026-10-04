const actionSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["move_task","change_task","add_task","remove_task","set_mode"] },
      task_id: { type: "string" },
      time: { type: "string" },
      name: { type: "string" },
      desc: { type: "string" },
      xp: { type: "number" },
      cat: { type: "string" },
      stat: { type: "string" },
      mode: { type: "string" }
    },
    required: ["type","task_id","time","name","desc","xp","cat","stat","mode"],
  }
};

const responseSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    actions: actionSchema
  },
  required: ["reply","actions"]
};

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = origin === "https://emmanueldousse07-rgb.github.io" || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  if (allowed) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, state, tasks, context } = req.body || {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is missing in Vercel Production" });

    const instructions = `Tu es le véritable Coach IA personnel intégré à MY SYSTEM.

Tu dois parler comme un excellent assistant personnel humain : naturel, direct, chaleureux, intelligent et concret. Tu peux être familier en français quand l'utilisateur l'est ("frérot", "mec"), sans forcer.

TON RÔLE
Tu aides l'utilisateur à décider, comprendre, organiser et avancer. Tu n'es PAS un simple chatbot de productivité et tu ne récites pas des règles. Tu comprends le message dans son contexte, poses une question seulement si elle est réellement nécessaire, et proposes une réponse utile immédiatement quand c'est possible.

STYLE
- Réponds en français naturel.
- Pas de langage robotique ni de phrases génériques.
- Ne répète pas inutilement les informations que l'utilisateur vient de donner.
- Pour une question simple : réponse simple.
- Pour une situation complexe : analyse courte puis recommandation claire.
- Quand l'utilisateur demande quoi faire maintenant, donne une prochaine action concrète.
- Ne transforme pas chaque conversation en optimisation de productivité.
- Si l'utilisateur veut juste discuter, discute normalement.
- Tu peux reconnaître une erreur ou dire "je ne sais pas".
- Ne prétends jamais avoir effectué une action si aucune action système n'est renvoyée.
- Ne réponds JAMAIS par une simple validation générique du type "c'est super", "tout est calé", "ton plan est parfait" quand l'utilisateur vient de décrire sa journée. Dans ce cas, apporte du contenu concret.

PLANIFICATION ET CONVERSATION
- Fais d'abord la différence entre une vraie demande de planification et une conversation où l'utilisateur partage simplement sa journée.
- Si l'utilisateur raconte sa journée, ses idées ou ses contraintes sans demander explicitement de l'organiser, réponds comme un humain qui écoute : rebondis sur ce qu'il dit, relève les points importants, donne ton avis et pose éventuellement UNE question naturelle. Ne transforme pas automatiquement son message en planning.
- Si l'utilisateur dit clairement "organise ma journée", "fais-moi un planning", "mets ça dans mes quêtes", "déplace", "ajoute", "prévois", etc., alors tu peux planifier et utiliser les actions système.
- Si le message est ambigu, privilégie une réponse conversationnelle et demande si l'utilisateur veut que tu transforme ça en planning plutôt que de supposer.
- Quand tu planifies réellement, prends en compte toutes les contraintes et donne un planning concret, mais garde un ton humain et personnalisé. Ne réponds pas comme une notification ou un template.
- Ne récite jamais systématiquement toute la journée. Ne reformule que ce qui est utile à la conversation.
- Une action système ne doit être produite que si l'utilisateur a demandé une modification du système ou si la demande implique clairement une modification nécessaire.
- Ne dis jamais "c'est calé", "tout est organisé" ou équivalent si aucune modification réelle n'a été effectuée.

EXEMPLE
Si l'utilisateur dit : "demain je me lève à 8h, j'ai 40 min pour aller à l'université, 2h de train, je veux faire du fitness et je sais pas quoi faire après", réponds comme un coach qui discute avec lui : reconnais ce qui est déjà prévu, donne ton avis sur le fitness/le travail/la soirée, et demande ou propose naturellement s'il veut qu'on construise le planning. Ne génère pas automatiquement un planning complet ni des actions système.

MY SYSTEM
Tu as accès à l'état actuel de l'application, aux quêtes et au contexte. Utilise-les réellement.
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
Pour les champs d'action qui ne servent pas, renvoie une chaîne vide "".
Pour les actions inutiles, renvoie [].

IMPORTANT
Le contexte et l'état peuvent contenir l'historique récent du Coach. Utilise-le pour garder une continuité naturelle.
Ne parle jamais de "tokens", de modèle ou d'API à l'utilisateur sauf s'il le demande.

CONTEXTE ACTUEL
${context}

ÉTAT ACTUEL
${JSON.stringify(state)}

QUÊTES ACTUELLES
${JSON.stringify(tasks)}`;

    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const payload = {
      system_instruction: { parts: [{ text: instructions }] },
      contents: [{ role: "user", parts: [{ text: message.trim() }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        responseMimeType: "application/json",
        responseSchema
      }
    };

    const models = [model, "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"].filter((value, index, arr) => value && arr.indexOf(value) === index);
    let response;
    let data;
    let lastError = "";

    for (const candidate of models) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );
      data = await response.json();
      if (response.ok) break;

      lastError = data?.error?.message || `Gemini HTTP ${response.status}`;
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
    }

    if (!response.ok) {
      return res.status(response.status >= 500 ? 502 : response.status).json({ error: lastError || "Gemini unavailable" });
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    let parsed;
    const cleaned = text
      .replace(/^\s*\`\`\`(?:json)?\s*/i, "")
      .replace(/\s*\`\`\`\s*$/i, "")
      .trim();

    try {
      parsed = JSON.parse(cleaned);
      // Some Gemini responses are JSON encoded twice.
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch {}
      }
    } catch {
      // Recover a JSON object even if Gemini added surrounding text or truncated the object.
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try { parsed = JSON.parse(cleaned.slice(start, end + 1)); }
        catch { parsed = null; }
      }

      // Last resort: recover the reply even when Gemini truncated the JSON before
      // the closing quote/bracket. Never expose the raw JSON wrapper to the UI.
      if (!parsed) {
        const match = cleaned.match(/"reply"\s*:\s*"([\\s\\S]*)/);
        if (match) {
          let recovered = match[1]
            .replace(/"\s*,?\s*"actions"\s*:[\\s\\S]*$/i, "")
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t")
            .replace(/\\\\/g, "\\")
            .replace(/\\\"/g, "\"");
          // Remove a trailing quote only when it is clearly the JSON terminator.
          recovered = recovered.replace(/"\s*}\s*$/s, "").trim();
          if (recovered) parsed = { reply: recovered, actions: [] };
        }
      }

      if (!parsed) {
        const fallbackReply = cleaned || text || "Je n'ai pas réussi à répondre.";
        const safeReply = fallbackReply
          .replace(/^\s*\{\s*"reply"\s*:\s*"/i, "")
          .replace(/"\s*,\s*"actions"[\\s\\S]*$/i, "")
          .replace(/"\s*}\s*$/s, "")
          .trim();
        return res.status(200).json({ reply: safeReply || "Je n'ai pas réussi à répondre.", actions: [], response_id: null });
      }
    }

    // Normalize and validate actions before they reach the app.
    let actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    const taskList = Array.isArray(tasks) ? tasks : [];
    const validIds = new Set(taskList.map(t => t.id));
    actions = actions.map(a => ({
      type: typeof a?.type === "string" ? a.type : "",
      task_id: typeof a?.task_id === "string" ? a.task_id : "",
      time: typeof a?.time === "string" ? a.time : "",
      name: typeof a?.name === "string" ? a.name : "",
      desc: typeof a?.desc === "string" ? a.desc : "",
      xp: Number.isFinite(Number(a?.xp)) ? Number(a.xp) : 0,
      cat: typeof a?.cat === "string" ? a.cat : "",
      stat: typeof a?.stat === "string" ? a.stat : "",
      mode: typeof a?.mode === "string" ? a.mode : ""
    })).filter(a => {
      if (a.type === "move_task" || a.type === "change_task" || a.type === "remove_task") return validIds.has(a.task_id);
      if (a.type === "add_task") return !!a.name;
      if (a.type === "set_mode") return a.mode === "normal" || a.mode === "light";
      return false;
    });

    // Recover a concrete move if Gemini described it but omitted the action.
    const replyForAction = typeof parsed.reply === "string" ? parsed.reply : "";
    if (!actions.length && replyForAction) {
      for (const t of taskList) {
        const name = String(t.name || "");
        if (!name) continue;
        const pos = replyForAction.toLowerCase().indexOf(name.toLowerCase());
        if (pos < 0) continue;
        const nearby = replyForAction.slice(pos, pos + 180);
        const m = nearby.match(/(?:passe|va|déplac|décal|repouss|avance)[^\n]{0,60}?(\d{1,2}):([0-5]\d)/i);
        if (m) {
          actions.push({ type:"move_task", task_id:t.id, time:String(m[1]).padStart(2,"0")+":"+m[2], name:"", desc:"", xp:0, cat:"", stat:"", mode:"" });
          break;
        }
      }
    }

    // Never expose Gemini's raw JSON to the UI.
    let reply = typeof parsed.reply === "string" ? parsed.reply : "Je t'écoute."; 
    const nested = reply.trim().match(/^\s*\{\s*"reply"\s*:\s*"((?:\\.|[^"\\])*)"/s);
    if (nested) {
      try { reply = JSON.parse("\"" + nested[1] + "\""); } catch {}
    }
    reply = reply.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    return res.status(200).json({
      reply,
      actions,
      response_id: null
    });
  } catch (error) {
    console.error("MY SYSTEM Gemini Coach:", error);
    return res.status(500).json({ error: error?.message || "Gemini Coach unavailable" });
  }
}
