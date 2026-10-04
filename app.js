const now=new Date();
const DAY=new Date(now.getFullYear(),now.getMonth(),now.getDate()).toISOString().slice(0,10);
const KEY="mysystem-"+DAY;
const OLD_KEY="mysystem-v4-"+DAY;

const defaults=[
{id:"wake",time:"08:00",name:"Réveil — sortir du lit",cat:"Corps",desc:"Commencer la journée sans négocier avec le réveil.",xp:10,stat:"discipline"},
{id:"water",time:"08:20",name:"Boire un verre d’eau",cat:"Corps",desc:"Un petit signal simple pour démarrer.",xp:5,stat:"health"},
{id:"ready",time:"08:35",name:"Douche + s’habiller",cat:"Corps",desc:"Passer du mode sommeil au mode journée.",xp:10,stat:"energy"},
{id:"breakfast",time:"09:00",name:"Petit-déjeuner",cat:"Nutrition",desc:"Une base simple avant d’attaquer la journée.",xp:10,stat:"health"},
{id:"study",time:"10:00",name:"Bloc EPFL",cat:"Esprit",desc:"Un bloc concentré. Pas besoin de sauver le semestre en une matinée.",xp:30,stat:"knowledge"},
{id:"lunch",time:"12:30",name:"Pause repas",cat:"Nutrition",desc:"Manger correctement et faire une vraie pause.",xp:10,stat:"health"},
{id:"outside",time:"14:30",name:"Sortir 10–20 min",cat:"Équilibre",desc:"Changer d’environnement et remettre du mouvement.",xp:10,stat:"mood"},
{id:"social",time:"17:30",name:"Un vrai contact humain",cat:"Social",desc:"Un message, un appel ou un moment partagé.",xp:20,stat:"social"},
{id:"move",time:"19:00",name:"Bouger / sport",cat:"Physique",desc:"Une activité adaptée à ton énergie du jour.",xp:25,stat:"fitness"},
{id:"life",time:"20:30",name:"Une chose juste pour toi",cat:"Vie",desc:"Quelque chose qui n’existe pas uniquement pour être productif.",xp:20,stat:"mood"},
{id:"tomorrow",time:"22:30",name:"Préparer demain",cat:"Discipline",desc:"Réduire le nombre de décisions du matin.",xp:15,stat:"discipline"},
{id:"calm",time:"23:00",name:"Passer en mode calme",cat:"Récupération",desc:"Créer une transition vers le sommeil.",xp:15,stat:"recovery"}
];

const statDefs=[
["health","Santé","Habitudes utiles et récupération.","💚"],
["fitness","Physique","Mouvement et régularité sportive.","⚡"],
["knowledge","Connaissances","Études, apprentissage et compétences.","🧠"],
["discipline","Discipline","Capacité à agir malgré les variations d’envie.","🛡"],
["social","Social","Relations, présence et ouverture.","◈"],
["mood","Équilibre","Plaisir, variété et qualité de vie.","☼"],
["recovery","Récupération","Sommeil, pauses et ralentissement.","☾"],
["energy","Énergie","État avec lequel tu peux vivre ta journée.","✦"]
];

const mealIdeas=[
["🥣","Matin","Yaourt + avoine + fruit + quelques noix","Simple et facile à préparer."],
["🍳","Matin","Œufs + pain + fruit","Une option salée et rassasiante."],
["🍚","Midi","Riz + poulet/tofu + légumes","Un repas complet facile à préparer en quantité."],
["🥙","Midi","Wrap + protéine + crudités + sauce au yaourt","Pratique quand tu as peu de temps."],
["🍌","Collation","Fruit + yaourt ou quelques noix","À adapter à ta faim et à ton activité."],
["🍝","Soir","Pâtes + sauce tomate + légumes + protéine","Simple, réconfortant et facile à varier."]
];

const baseState={
xp:0,done:[],mode:"normal",energy:7,mood:7,
stats:{health:28,fitness:24,knowledge:31,discipline:27,social:23,mood:34,recovery:29,energy:36},
pantry:["œufs","riz","fruits","yaourt"],journal:"",custom:[],sleep:{wake:"08:00",fatigue:7,usual:"23:00"}
};

function load(){
  try{
    const raw=localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY);
    if(raw){
      const s=JSON.parse(raw);
      return {...baseState,...s,stats:{...baseState.stats,...(s.stats||{})},sleep:{...baseState.sleep,...(s.sleep||{})}};
    }
  }catch(e){}
  return JSON.parse(JSON.stringify(baseState));
}
let state=load();

function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
function tasks(){return defaults.concat(state.custom||[])}
function lvl(){return Math.floor(state.xp/100)+1}
function levelPct(){return state.xp%100}
function pct(){const all=tasks();return all.length?Math.round(state.done.length/all.length*100):0}
function localDate(){
  return new Intl.DateTimeFormat("fr-CH",{weekday:"long",day:"numeric",month:"long"}).format(new Date());
}
function parseTime(t){const [h,m]=t.split(":").map(Number);return h*60+m}
function fmtTime(min){min=(min+1440)%1440;return String(Math.floor(min/60)).padStart(2,"0")+":"+String(min%60).padStart(2,"0")}
function currentMinutes(){const d=new Date();return d.getHours()*60+d.getMinutes()}
function statGain(s){return ["health","recovery"].includes(s)?0.5:["knowledge","discipline"].includes(s)?0.7:0.4}
function toast(t){const e=document.getElementById("toast");if(!e)return;e.textContent=t;e.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove("show"),1800)}

function smartNextTask(){
  const pending=tasks().filter(t=>!state.done.includes(t.id));
  if(!pending.length)return null;
  const nowMin=currentMinutes();
  const overdue=pending.filter(t=>parseTime(t.time)<=nowMin);
  if(!overdue.length)return pending[0];
  if(state.mode==="light"){
    return overdue.find(t=>["Corps","Équilibre","Nutrition","Vie"].includes(t.cat))||overdue[0];
  }
  return overdue[overdue.length-1]||pending[0];
}

function completeTask(id){
  const q=tasks().find(x=>x.id===id);
  if(!q||state.done.includes(id))return;
  state.done.push(id);
  state.xp+=q.xp;
  state.stats[q.stat]=Math.min(100,(state.stats[q.stat]||20)+statGain(q.stat));
  if(q.stat==="mood")state.mood=Math.min(10,+(state.mood+.2).toFixed(1));
  if(q.stat==="energy")state.energy=Math.min(10,+(state.energy+.2).toFixed(1));
  toast("Quête terminée · +"+q.xp+" XP");
  save();
}

function go(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  const target=document.getElementById(id);
  if(target)target.classList.add("active");
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.go===id));
  renderAll();
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderAll(){
  document.getElementById("level").textContent=lvl();
  document.getElementById("charLevel").textContent=lvl();
  document.getElementById("todayLabel").textContent=localDate().toUpperCase();
  document.getElementById("todayXp").textContent=state.xp;
  document.getElementById("todayPct").textContent=pct()+"%";
  document.getElementById("energy").textContent=state.energy;
  document.getElementById("mood").textContent=state.mood;
  document.getElementById("levelProgressText").textContent=levelPct()+"%";
  document.getElementById("levelProgressBar").style.width=levelPct()+"%";
  renderHome();renderQuests();renderStats();renderNutrition();renderReport();renderSleep();
}

function renderHome(){
  const q=smartNextTask();
  const box=document.getElementById("currentQuest");
  const explore=document.getElementById("explore");
  const context=document.getElementById("dayContext");
  document.getElementById("streak").textContent="🔥 "+getStreak()+" jour"+(getStreak()>1?"s":"");
  document.getElementById("xpProgress").textContent=levelPct()+" / 100 XP";
  if(q){
    box.innerHTML='<div class="quest-hero"><div class="quest-kicker"><span>'+q.cat.toUpperCase()+'</span><span>'+q.time+'</span></div><div class="quest-title">'+q.name+'</div><div class="quest-desc">'+q.desc+'</div><div class="quest-foot"><span class="xp">+'+q.xp+' XP</span><button class="primary" onclick="completeTask(\''+q.id+'\')">✓ C’est fait</button></div></div>';
    explore.innerHTML="";
    const late=parseTime(q.time)<currentMinutes();
    context.innerHTML=late
      ?'<div class="day-context"><b>Le planning s’adapte.</b> Cette action était prévue plus tôt, mais elle reste la priorité utile maintenant. Pas besoin de rattraper toute la journée.</div>'
      :'<div class="day-context"><b>Prochaine étape.</b> Fais uniquement cette action. Une fois terminée, le système choisira la suivante.</div>';
    document.getElementById("heroText").textContent=late?"Tu as pris du retard ? Aucun problème. On repart de maintenant.":"Une seule chose à faire maintenant. Le reste peut attendre.";
  }else{
    box.innerHTML='<div class="quest-hero"><div class="eyebrow">JOURNÉE COMPLÈTE</div><div class="quest-title">Tu as terminé le socle.</div><div class="quest-desc">Le système passe en exploration. Tu peux enrichir ta journée sans transformer chaque minute en obligation.</div></div>';
    renderExplore();
    context.innerHTML='<div class="day-context"><b>Mode exploration.</b> Tu as terminé les engagements du jour. Choisis quelque chose parce que tu en as envie.</div>';
    document.getElementById("heroText").textContent="Le socle est fait. Maintenant, choisis ce qui a du sens pour toi.";
  }
}

function renderExplore(){
  document.getElementById("explore").innerHTML='<div class="section-head"><div><span class="eyebrow">MODE EXPLORATION</span><h2>Développer quoi ?</h2></div></div><div class="choice-grid"><button class="choice" onclick="addIdea(\'knowledge\')"><b>🧠 Approfondir</b><small>Apprendre quelque chose pendant 20–30 min.</small></button><button class="choice" onclick="addIdea(\'social\')"><b>◈ Relations</b><small>Créer un vrai moment avec quelqu’un.</small></button><button class="choice" onclick="addIdea(\'mood\')"><b>☼ Plaisir</b><small>Faire quelque chose choisi pour toi.</small></button><button class="choice" onclick="addIdea(\'fitness\')"><b>⚡ Bouger</b><small>Marche, mobilité ou activité légère.</small></button></div>';
}
function addIdea(stat){
  const map={knowledge:["Mini-session d’apprentissage","Choisis un sujet et apprends quelque chose pendant 20 minutes."],social:["Créer un vrai contact","Envoie un message ou propose un moment à quelqu’un."],mood:["Une activité pour toi","Fais quelque chose que tu aurais envie de faire même sans XP."],fitness:["Bouger 20 minutes","Une activité légère, adaptée à ton énergie."]};
  const a=map[stat];
  state.custom.push({id:"custom-"+Date.now(),time:"Maintenant",name:a[0],cat:"Exploration",desc:a[1],xp:10,stat});
  toast("Quête ajoutée");save();
}

function renderQuests(){
  const all=tasks(),next=smartNextTask();
  document.getElementById("questDone").textContent=state.done.length;
  document.getElementById("questLeft").textContent=all.length-state.done.length;
  document.getElementById("questXp").textContent=state.xp;
  document.getElementById("questList").innerHTML=all.map(q=>'<div class="q-row '+(state.done.includes(q.id)?"done ":"")+(next&&next.id===q.id?"next":"")+'"><button class="q-check" onclick="completeTask(\''+q.id+'\')">'+(state.done.includes(q.id)?"✓":"")+'</button><span class="q-time">'+q.time+'</span><span class="q-name">'+q.name+'</span><span class="q-xp">+'+q.xp+'</span></div>').join("");
  document.getElementById("modeToggle").classList.toggle("on",state.mode==="normal");
}
function addCustomQuest(){
  const n=prompt("Nom de la quête ?");
  if(!n)return;
  state.custom.push({id:"custom-"+Date.now(),time:"Flexible",name:n,cat:"Perso",desc:"Une action choisie par toi.",xp:10,stat:"discipline"});
  save();toast("Nouvelle quête créée");
}
function toggleMode(){state.mode=state.mode==="normal"?"light":"normal";toast(state.mode==="normal"?"Mode normal":"Mode léger");save()}

function renderStats(){
  document.getElementById("stats").innerHTML=statDefs.map(s=>'<div class="stat"><div class="stat-top"><span>'+s[3]+' '+s[1]+'</span><span>'+Math.round(state.stats[s[0]])+'/100</span></div><div class="statbar"><i style="width:'+state.stats[s[0]]+'%"></i></div></div>').join("");
  const best=[...statDefs].sort((a,b)=>state.stats[b[0]]-state.stats[a[0]])[0];
  document.getElementById("statInsight").textContent="Ton axe le plus développé actuellement est "+best[1].toLowerCase()+". Les stats montent lentement : l’objectif est de rendre tes habitudes plus solides, pas de remplir une barre.";
}

function sleepPrefs(){return state.sleep||baseState.sleep}
function renderSleep(){
  const p=sleepPrefs(),wake=parseTime(p.wake);
  const target=p.fatigue>=8?9.5:p.fatigue>=6?9:p.fatigue>=4?8.5:8;
  const bed=wake-target*60,wind=bed-45;
  document.getElementById("bedtime").textContent=fmtTime(bed);
  document.getElementById("sleepTarget").textContent=target+" h";
  document.getElementById("sleepFatigue").textContent=p.fatigue+"/10";
  document.getElementById("sleepWake").textContent=p.wake;
  document.getElementById("sleepWind").textContent=fmtTime(wind);
  document.getElementById("sleepStatus").textContent=p.fatigue>=8?"fatigue élevée":p.fatigue>=6?"récupération prioritaire":"rythme stable";
  document.getElementById("sleepReason").textContent=p.fatigue>=8?"Ce soir, protège surtout une vraie période de repos.":p.fatigue>=6?"Ta fatigue est élevée : mieux vaut protéger une nuit suffisante que repousser le coucher.":"Garde surtout une heure de lever assez régulière.";
  document.getElementById("sleepPlan").innerHTML='<div class="sleep-step"><b>'+fmtTime(wind)+'</b><span>Mode calme</span><small>Lumière plus douce, activités tranquilles, préparer demain.</small></div><div class="sleep-step"><b>'+fmtTime(bed-15)+'</b><span>Fin des écrans stimulants</span><small>Si possible, passer à quelque chose de calme et peu stimulant.</small></div><div class="sleep-step"><b>'+fmtTime(bed)+'</b><span>Au lit</span><small>Objectif : laisser suffisamment de temps au sommeil, sans chercher la perfection.</small></div>';
}
function openSleepSettings(){
  const p=sleepPrefs();
  document.getElementById("modalContent").innerHTML='<h2>Ton rythme</h2><p>On règle surtout l’heure de lever et la fatigue ressentie. Le système propose ensuite une fenêtre de coucher.</p><label style="display:block;margin-top:14px;font-size:11px;color:var(--muted)">HEURE DE LEVER</label><input id="wakeInput" type="time" value="'+p.wake+'" style="margin-top:6px;width:100%;background:#12151e;border:1px solid var(--line);color:white;border-radius:14px;padding:13px"><label style="display:block;margin-top:14px;font-size:11px;color:var(--muted)">FATIGUE · 1 À 10</label><input id="fatigueInput" type="range" min="1" max="10" value="'+p.fatigue+'" style="width:100%;margin-top:10px"><div id="fatigueValue" style="text-align:center;font-weight:900">'+p.fatigue+'/10</div><button class="primary wide" onclick="saveSleepSettings()">Enregistrer</button>';
  document.getElementById("fatigueInput").oninput=e=>document.getElementById("fatigueValue").textContent=e.target.value+"/10";
  document.getElementById("modal").classList.add("show");
}
function saveSleepSettings(){state.sleep={...sleepPrefs(),wake:document.getElementById("wakeInput").value||"08:00",fatigue:Number(document.getElementById("fatigueInput").value||7)};closeModal();save();toast("Rythme actualisé")}

function renderNutrition(){
  document.getElementById("mealGrid").innerHTML=mealIdeas.map(m=>'<div class="meal"><span>'+m[0]+'</span><b>'+m[1]+'</b><div>'+m[2]+'</div><p>'+m[3]+'</p></div>').join("");
  document.getElementById("pantry").innerHTML=state.pantry.map(x=>'<span class="chip">'+x+'</span>').join("");
}
function shuffleMeal(){
  const m=mealIdeas[Math.floor(Math.random()*mealIdeas.length)];
  document.getElementById("mealNowTitle").textContent=m[0]+" "+m[1];
  document.getElementById("mealNowText").textContent=m[2]+" — "+m[3];
}
function editPantry(){const x=prompt("Tes aliments disponibles, séparés par des virgules :",state.pantry.join(", "));if(x===null)return;state.pantry=x.split(",").map(s=>s.trim()).filter(Boolean);save()}

function renderReport(){
  const score=Math.min(100,Math.round(pct()*.65+state.mood*3+state.energy*2));
  document.getElementById("score").textContent=score;
  document.getElementById("scoreBar").style.width=score+"%";
  document.getElementById("scoreText").textContent=score>75?"Bonne journée : tu as avancé sans tout miser sur la perfection.":score>45?"Journée correcte : on garde ce qui a fonctionné et on simplifie le reste.":"Journée difficile : demain, on repart petit plutôt que d’essayer de tout rattraper.";
  const completed=tasks().filter(q=>state.done.includes(q.id));
  const names=completed.slice(-3).map(q=>q.name).join(" · ");
  document.getElementById("reportList").innerHTML='<div class="report-item"><b>⚡ '+state.xp+' XP gagnés</b><p>'+state.done.length+' actions terminées sur '+tasks().length+'.</p></div><div class="report-item"><b>☺ Humeur '+state.mood+'/10 · Énergie '+state.energy+'/10</b><p>Des indicateurs personnels, pas des diagnostics.</p></div><div class="report-item"><b>✓ Ce qui a avancé</b><p>'+(names||"Aucune action terminée pour l’instant.")+'</p></div>';
  document.getElementById("recommendations").innerHTML='<div class="rec"><b>01 · Réduire la friction</b><p>Prépare la première action de demain avant de finir ta soirée.</p></div><div class="rec"><b>02 · Garder une vraie vie</b><p>Le système doit aussi protéger les relations, le plaisir et les moments gratuits.</p></div><div class="rec"><b>03 · Adapter, pas culpabiliser</b><p>Si ton énergie est basse, le mode léger devient une stratégie normale.</p></div>';
}

function bubble(t,c){const e=document.createElement("div");e.className="bubble "+c;e.textContent=t;document.getElementById("chat").appendChild(e);document.getElementById("chat").scrollTop=99999}
function coachContextText(){
  const q=smartNextTask();
  return "Niveau "+lvl()+" · "+state.xp+" XP · "+state.done.length+"/"+tasks().length+" quêtes · énergie "+state.energy+"/10 · humeur "+state.mood+"/10 · prochaine action : "+(q?q.name:"socle terminé");
}
function quick(t){document.getElementById("msg").value=t;send()}
async function send(){
  const input=document.getElementById("msg"),m=input.value.trim();if(!m)return;
  bubble(m,"me");input.value="";
  const fallback=localCoach(m);
  bubble(fallback,"coach");
  document.getElementById("coachState").textContent="Réflexion sur ton contexte…";
  try{
    const r=await fetch("/api/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m,state,context:coachContextText()})});
    if(r.ok){const d=await r.json();const last=document.querySelector("#chat .coach:last-child");if(last&&d.reply)last.textContent=d.reply;document.getElementById("coachState").textContent="IA connectée";}
    else document.getElementById("coachState").textContent="Mode local";
  }catch(e){document.getElementById("coachState").textContent="Mode local · serveur non connecté";}
}
function localCoach(m){
  const low=m.toLowerCase();
  if(low.includes("maintenant")||low.includes("quoi faire")){const q=smartNextTask();return q?"Fais seulement « "+q.name+" ». "+q.desc:"Ton socle est terminé. Choisis une activité qui te fait réellement envie."}
  if(low.includes("organis"))return "On ne va pas refaire toute ta journée. Ta priorité est « "+(smartNextTask()?.name||"une activité choisie")+" ». Quand c’est fait, je recalcule la suite.";
  if(low.includes("fatigu")||low.includes("dormi"))return "Si tu es fatigué, passe en mode léger. On réduit l’ambition et on protège les bases : repas, mouvement raisonnable, travail essentiel et récupération.";
  return "Je garde ce que tu viens de me dire comme contexte. Pour l’instant, je peux agir sur ton état local ; avec le serveur IA, le Coach pourra analyser ton historique et te répondre avec beaucoup plus de profondeur.";
}

function voiceJournal(){
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){toast("La dictée vocale n’est pas disponible ici");go("journal");return}
  const rec=new Speech();rec.lang="fr-FR";rec.interimResults=true;rec.continuous=false;
  document.getElementById("recordTitle").textContent="J’écoute…";
  document.getElementById("recordText").textContent="Parle naturellement. Tu peux raconter ce qui s’est passé, ton énergie, ce que tu as réussi ou ce qui t’a bloqué.";
  rec.onresult=e=>{let t="";for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;document.getElementById("journalText").value=t};
  rec.onend=()=>{document.getElementById("recordTitle").textContent="C’est enregistré";document.getElementById("recordText").textContent="Tu peux analyser ta journée maintenant.";go("journal")};
  rec.onerror=()=>{toast("Impossible d’utiliser le micro");go("journal")};
  rec.start();
}
function analyzeJournal(){
  const t=document.getElementById("journalText").value.trim();if(!t){toast("Raconte-moi d’abord ta journée");return}
  state.journal=t;
  const low=t.toLowerCase();
  if(/fatigu|épuis|crevé|mal dorm/.test(low))state.energy=Math.max(1,+(state.energy-.5).toFixed(1));
  if(/content|heureux|bien passé|fier/.test(low))state.mood=Math.min(10,+(state.mood+.4).toFixed(1));
  if(/stress|angoiss|bloqué|procrast/.test(low))state.mood=Math.max(1,+(state.mood-.2).toFixed(1));
  state.xp+=5;save();
  document.getElementById("journalResult").innerHTML='<div class="panel" style="margin-top:12px"><span class="eyebrow">LECTURE DU SYSTÈME</span><h3 style="margin:9px 0 5px">Contexte enregistré</h3><p style="color:var(--muted);font-size:12px;line-height:1.5">Le système a enregistré ton état du jour. Avec l’IA serveur, ce journal pourra servir à détecter des tendances et à adapter les prochaines journées.</p><button class="secondary wide" onclick="go(\'report\')">Voir mon bilan →</button></div>';
  toast("Journal enregistré · +5 XP");
}

function getStreak(){
  let n=state.done.length?1:0;
  for(let i=1;i<30;i++){
    const d=new Date();d.setDate(d.getDate()-i);
    const key="mysystem-"+new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString().slice(0,10);
    try{const s=JSON.parse(localStorage.getItem(key)||"null");if(s&&s.done&&s.done.length)n++;else break}catch(e){break}
  }
  return n;
}
function closeModal(){document.getElementById("modal").classList.remove("show")}

document.getElementById("msg").addEventListener("keydown",e=>{if(e.key==="Enter")send()});
bubble("Je suis ton centre de contrôle. Dis-moi ce qui se passe vraiment, et je peux déjà utiliser ton état local pour choisir la prochaine action.","coach");
document.getElementById("coachContext").textContent=coachContextText();
renderAll();
if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});


/* MY SYSTEM adaptive layer */
state.overrides=state.overrides||{};
state.history=Array.isArray(state.history)?state.history:[];
state.coachLog=Array.isArray(state.coachLog)?state.coachLog:[];

function tasks(){
  return defaults.concat(state.custom||[]).map(t=>({
    ...t,
    time:(state.overrides[t.id]&&state.overrides[t.id].time)||t.time,
    name:(state.overrides[t.id]&&state.overrides[t.id].name)||t.name,
    desc:(state.overrides[t.id]&&state.overrides[t.id].desc)||t.desc,
    xp:state.overrides[t.id]&&Number.isFinite(state.overrides[t.id].xp)?state.overrides[t.id].xp:t.xp
  }));
}
function taskStatus(t){
  if(state.done.includes(t.id))return "done";
  const tm=parseTime(t.time); if(tm===null)return "neutral";
  const delta=tm-currentMinutes();
  if(delta<0)return "late";
  if(delta<=45)return "now";
  return "next";
}
function scheduleState(){
  const q=smartNextTask();
  if(!q)return {label:"SOCLE TERMINÉ",tone:"good",detail:"Tu es libre de choisir la suite."};
  const tm=parseTime(q.time);
  if(tm===null)return {label:"FLEXIBLE",tone:"neutral",detail:"Cette quête s’adapte à ton moment."};
  const delta=tm-currentMinutes();
  if(delta<0)return {label:"EN RETARD",tone:"late",detail:"Le système recale la priorité à partir de maintenant."};
  if(delta<=45)return {label:"MAINTENANT",tone:"now",detail:"Tu arrives dans la fenêtre de cette quête."};
  return {label:"DANS LES TEMPS",tone:"good",detail:"Tu as encore du temps avant la prochaine étape."};
}
function renderClock(){
  const timeEl=document.getElementById("clockTime"),dateEl=document.getElementById("clockDate"),statusEl=document.getElementById("clockStatus"),line=document.getElementById("clockLine"),timeline=document.getElementById("timeline");
  if(!timeEl)return;
  const nowMin=currentMinutes();
  timeEl.textContent=fmtTime(nowMin);
  dateEl.textContent=new Intl.DateTimeFormat("fr-CH",{weekday:"long",day:"numeric",month:"long"}).format(new Date());
  const ss=scheduleState();
  statusEl.textContent=ss.label; statusEl.className="clock-status "+ss.tone;
  const dayStart=420,dayEnd=1440,ratio=Math.max(0,Math.min(1,(nowMin-dayStart)/(dayEnd-dayStart)));
  line.style.left=(ratio*100)+"%";
  timeline.innerHTML=tasks().map(t=>{
    const tm=parseTime(t.time); if(tm===null)return "";
    const pos=Math.max(0,Math.min(100,(tm-dayStart)/(dayEnd-dayStart)*100));
    return '<button class="timeline-item '+taskStatus(t)+'" style="left:'+pos+'%" onclick="focusTask(\''+t.id+'\')"><span>'+t.time+'</span><i></i><b>'+t.name+'</b></button>';
  }).join("");
}
function focusTask(id){
  const q=tasks().find(x=>x.id===id); if(!q)return;
  const el=document.getElementById("clockFocus"); if(!el)return;
  el.innerHTML="<b>"+q.time+" · "+q.name+"</b><span>"+q.cat+" · +"+q.xp+" XP</span>";
  el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2600);
}
function renderHome(){
  const q=smartNextTask(),box=document.getElementById("currentQuest"),explore=document.getElementById("explore"),context=document.getElementById("dayContext"),ss=scheduleState();
  document.getElementById("streak").textContent="🔥 "+getStreak()+" jour"+(getStreak()>1?"s":"");
  document.getElementById("xpProgress").textContent=levelPct()+" / 100 XP";
  const badge=document.getElementById("scheduleBadge");
  if(badge){badge.textContent=ss.label;badge.className="schedule-badge "+ss.tone}
  const detail=document.getElementById("scheduleDetail"); if(detail)detail.textContent=ss.detail;
  if(q){
    const late=taskStatus(q)==="late";
    box.innerHTML='<div class="quest-hero"><div class="quest-kicker"><span>'+q.cat.toUpperCase()+'</span><span>'+q.time+'</span></div><div class="quest-title">'+q.name+'</div><div class="quest-desc">'+q.desc+'</div><div class="quest-foot"><span class="xp">+'+q.xp+' XP</span><button class="primary" onclick="completeTask(\''+q.id+'\')">✓ C’est fait</button></div></div>';
    explore.innerHTML="";
    context.innerHTML='<div class="day-context '+(late?"late":"")+'"><b>'+(late?"Tu es hors timing, mais le système ne te punit pas.":"Le système garde le cap.")+'</b> '+(late?"On prend cette action comme nouveau point de départ.":"Une seule action maintenant. La suite sera recalculée après.")+'</div>';
    document.getElementById("heroText").textContent=late?"Le planning est en retard. Pas besoin de tout rattraper : on repart de maintenant.":"Le système regarde l’heure, ton état et la prochaine action. Le reste peut attendre.";
  }else{
    box.innerHTML='<div class="quest-hero complete"><div class="eyebrow">JOURNÉE COMPLÈTE</div><div class="quest-title">Le socle est terminé.</div><div class="quest-desc">Tu n’as plus de mission obligatoire. Passe en exploration ou profite simplement de ton temps.</div></div>';
    renderExplore(); context.innerHTML='<div class="day-context"><b>Mode exploration.</b> Tu as terminé les engagements du jour.</div>';
    document.getElementById("heroText").textContent="Le socle est fait. Maintenant, choisis ce qui a du sens pour toi.";
  }
}
function renderQuests(){
  const all=tasks(),next=smartNextTask();
  document.getElementById("questDone").textContent=state.done.length;
  document.getElementById("questLeft").textContent=all.length-state.done.length;
  document.getElementById("questXp").textContent=state.xp;
  document.getElementById("questList").innerHTML=all.map(q=>'<div class="q-row '+(state.done.includes(q.id)?"done ":"")+(next&&next.id===q.id?"next":"")+'"><button class="q-check" onclick="completeTask(\''+q.id+'\')">'+(state.done.includes(q.id)?"✓":"")+'</button><span class="q-time">'+q.time+'</span><span class="q-name">'+q.name+'</span><span class="q-xp">+'+q.xp+'</span><button class="q-edit" onclick="editTask(\''+q.id+'\')">↗</button></div>').join("");
  document.getElementById("modeToggle").classList.toggle("on",state.mode==="normal");
}
function editTask(id){
  const q=tasks().find(x=>x.id===id); if(!q)return;
  const time=prompt("Nouvelle heure (HH:MM) :",q.time); if(time===null)return;
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){toast("Heure invalide");return}
  state.overrides[id]={...(state.overrides[id]||{}),time:time}; save(); toast("Horaire actualisé");
}
function renderSleep(){
  const p=sleepPrefs(),wake=parseTime(p.wake);
  const target=p.fatigue>=8?9.5:p.fatigue>=6?9:p.fatigue>=4?8.5:8;
  const bed=wake-target*60,wind=bed-45;
  document.getElementById("bedtime").textContent=fmtTime(bed);
  document.getElementById("sleepTarget").textContent=target+" h";
  document.getElementById("sleepFatigue").textContent=p.fatigue+"/10";
  document.getElementById("sleepWake").textContent=p.wake;
  document.getElementById("sleepWind").textContent=fmtTime(wind);
  document.getElementById("sleepStatus").textContent=p.fatigue>=8?"fatigue élevée":p.fatigue>=6?"récupération prioritaire":"rythme stable";
  document.getElementById("sleepReason").textContent=p.fatigue>=8?"Ce soir, protège surtout une vraie période de repos.":p.fatigue>=6?"Ta fatigue est élevée : mieux vaut protéger une nuit suffisante que repousser le coucher.":"Garde surtout une heure de lever assez régulière.";
  document.getElementById("sleepPlan").innerHTML='<div class="sleep-step"><b>'+fmtTime(wind)+'</b><span>Mode calme</span><small>Lumière plus douce, activités tranquilles, préparer demain.</small></div><div class="sleep-step"><b>'+fmtTime(bed-15)+'</b><span>Fin des écrans stimulants</span><small>Si possible, passer à quelque chose de calme et peu stimulant.</small></div><div class="sleep-step"><b>'+fmtTime(bed)+'</b><span>Au lit</span><small>Objectif : laisser suffisamment de temps au sommeil, sans chercher la perfection.</small></div>';
  const hs=document.getElementById("homeSleep");
  if(hs)hs.innerHTML='<div class="mini-sleep"><span class="eyebrow">CE SOIR</span><b>'+fmtTime(bed)+'</b><small>viser '+target+' h · lever '+p.wake+'</small><button class="ghost" onclick="go(\'sleep\')">Ouvrir le sommeil →</button></div>';
}
function renderAll(){
  document.getElementById("level").textContent=lvl();document.getElementById("charLevel").textContent=lvl();
  document.getElementById("todayLabel").textContent=localDate().toUpperCase();document.getElementById("todayXp").textContent=state.xp;
  document.getElementById("todayPct").textContent=pct()+"%";document.getElementById("energy").textContent=state.energy;document.getElementById("mood").textContent=state.mood;
  document.getElementById("levelProgressText").textContent=levelPct()+"%";document.getElementById("levelProgressBar").style.width=levelPct()+"%";
  renderHome();renderClock();renderQuests();renderStats();renderNutrition();renderReport();renderSleep();
}
function applyCoachActions(actions){
  if(!Array.isArray(actions))return [];
  const changed=[];
  actions.forEach(a=>{
    if(a.type==="move_task"&&a.task_id&&/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time||"")){
      state.overrides[a.task_id]={...(state.overrides[a.task_id]||{}),time:a.time};changed.push("horaire "+a.task_id+" → "+a.time);
    }else if(a.type==="change_task"&&a.task_id){
      state.overrides[a.task_id]={...(state.overrides[a.task_id]||{}),...(a.name?{name:a.name}:{}),...(a.desc?{desc:a.desc}:{}),...(Number.isFinite(a.xp)?{xp:Math.max(1,Math.min(100,a.xp))}:{})};changed.push("quête "+a.task_id+" modifiée");
    }else if(a.type==="add_task"&&a.name){
      state.custom.push({id:"ai-"+Date.now()+Math.random().toString(16).slice(2),time:/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time||"")?a.time:fmtTime(currentMinutes()+30),name:a.name,cat:a.cat||"IA",desc:a.desc||"Une action proposée par le Coach.",xp:Number(a.xp)||10,stat:a.stat||"discipline"});changed.push("nouvelle quête : "+a.name);
    }else if(a.type==="remove_task"&&a.task_id){state.custom=state.custom.filter(t=>t.id!==a.task_id);delete state.overrides[a.task_id];changed.push("quête supprimée");
    }else if(a.type==="set_mode"&&(a.mode==="normal"||a.mode==="light")){state.mode=a.mode;changed.push("mode "+a.mode)}
  });
  if(changed.length)save(); return changed;
}
async function send(){
  const input=document.getElementById("msg"),m=input.value.trim();if(!m)return;
  bubble(m,"me");input.value="";bubble(localCoach(m),"coach");
  document.getElementById("coachState").textContent="Réflexion sur ton contexte…";
  try{
    const r=await fetch("/api/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m,state,context:coachContextText(),tasks:tasks()})});
    if(r.ok){
      const d=await r.json(),last=document.querySelector("#chat .coach:last-child");
      if(last&&d.reply)last.textContent=d.reply;
      const changed=applyCoachActions(d.actions||[]);
      if(changed.length)bubble("⚙ Système ajusté : "+changed.join(" · "),"coach");
      document.getElementById("coachState").textContent="IA connectée · système pilotable";
    }else document.getElementById("coachState").textContent="Mode local";
  }catch(e){document.getElementById("coachState").textContent="Mode local · serveur non connecté"}
}
function localCoach(m){
  const low=m.toLowerCase(),tm=low.match(/(?:à|vers|pour)\s*(\d{1,2})[:h](\d{2})/);
  if((low.includes("déplace")||low.includes("décale")||low.includes("avance")||low.includes("repousse"))&&tm){
    const q=tasks().find(t=>low.includes(t.id)||low.includes(t.name.toLowerCase().split(" ")[0]));
    if(q){const time=tm[1].padStart(2,"0")+":"+tm[2];state.overrides[q.id]={...(state.overrides[q.id]||{}),time};save();return "C’est déplacé. « "+q.name+" » passe à "+time+" et l’horloge est recalculée."}
  }
  if(low.includes("maintenant")||low.includes("quoi faire")){const q=smartNextTask();return q?"Fais seulement « "+q.name+" ». "+q.desc:"Ton socle est terminé. Choisis une activité qui te fait réellement envie."}
  if(low.includes("organis"))return "Je regarde l’heure, les quêtes restantes et ton état. La prochaine priorité est « "+(smartNextTask()?.name||"une activité choisie")+" ».";
  if(low.includes("fatigu")||low.includes("dormi"))return "Si tu es fatigué, passe en mode léger. On réduit l’ambition et on protège les bases : repas, mouvement raisonnable, travail essentiel et récupération.";
  return "Je garde ce que tu viens de me dire comme contexte. En mode local, je peux déjà recalculer la prochaine action et certains horaires ; avec le serveur IA, le Coach pourra piloter le planning de façon beaucoup plus fine.";
}
setInterval(renderClock,30000);
renderAll();
