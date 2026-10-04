const KEY="mysystem-state";
const DAYKEY=()=>{const d=new Date();return "mysystem-"+d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const defaults=[
{id:"wake",time:"08:00",name:"Réveil",cat:"BASE",desc:"Sortir du lit et ouvrir la journée.",xp:8,stat:"recovery"},
{id:"water",time:"08:05",name:"Eau + lumière",cat:"SANTÉ",desc:"Boire un verre d’eau et prendre un peu de lumière naturelle.",xp:8,stat:"health"},
{id:"shower",time:"08:12",name:"Douche",cat:"BASE",desc:"Te préparer sans chercher la perfection.",xp:8,stat:"discipline"},
{id:"breakfast",time:"08:30",name:"Petit-déjeuner",cat:"NUTRITION",desc:"Un vrai repas simple avant d’attaquer.",xp:10,stat:"health"},
{id:"epfl",time:"09:15",name:"Bloc EPFL",cat:"CONNAISSANCE",desc:"Un bloc de travail concentré. Une seule matière, un objectif clair.",xp:25,stat:"knowledge"},
{id:"lunch",time:"12:30",name:"Pause repas",cat:"RÉCUPÉRATION",desc:"Manger et faire une vraie coupure.",xp:10,stat:"health"},
{id:"outside",time:"14:30",name:"Sortir 10–20 min",cat:"ÉNERGIE",desc:"Changer d’environnement et bouger tranquillement.",xp:12,stat:"energy"},
{id:"social",time:"17:30",name:"Un vrai contact humain",cat:"SOCIAL",desc:"Envoyer un message, appeler quelqu’un ou passer un moment avec une personne.",xp:15,stat:"social"},
{id:"move",time:"19:00",name:"Bouger / sport",cat:"FORME",desc:"Une activité adaptée à ton énergie du jour.",xp:20,stat:"fitness"},
{id:"joy",time:"20:30",name:"Une chose juste pour toi",cat:"HUMEUR",desc:"Faire quelque chose qui te plaît sans le transformer en performance.",xp:12,stat:"mood"},
{id:"tomorrow",time:"22:30",name:"Préparer demain",cat:"ORGANISATION",desc:"Choisir une priorité et rendre demain plus facile.",xp:12,stat:"discipline"},
{id:"calm",time:"23:00",name:"Mode calme",cat:"RÉCUPÉRATION",desc:"Ralentir progressivement et protéger ta nuit.",xp:15,stat:"recovery"}
];
const freshState=()=>({xp:0,done:[],mode:"normal",energy:7,mood:7,stats:{health:28,fitness:24,knowledge:31,discipline:27,social:23,mood:34,recovery:29,energy:36},pantry:["œufs","riz","fruits","yaourt"],journal:"",custom:[],removed:[],overrides:{},sleep:{wake:"08:00",fatigue:7,usual:"23:00"},history:[],coachLog:[],coachResponseId:null,avatar:{style:"neon",hair:"short",accent:"violet"}});
let state=loadState(), questFilter="all", updateWorker=null, reloadOnController=false;

function loadState(){try{const raw=JSON.parse(localStorage.getItem(KEY)||"null");return raw?merge(freshState(),raw):freshState()}catch(e){return freshState()}}
function merge(base,raw){return {...base,...raw,stats:{...base.stats,...(raw.stats||{})},sleep:{...base.sleep,...(raw.sleep||{})},custom:Array.isArray(raw.custom)?raw.custom:[],overrides:raw.overrides||{},removed:Array.isArray(raw.removed)?raw.removed:[],done:Array.isArray(raw.done)?raw.done:[],history:Array.isArray(raw.history)?raw.history:[],coachLog:Array.isArray(raw.coachLog)?raw.coachLog:[],coachResponseId:typeof raw.coachResponseId==="string"?raw.coachResponseId:null}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(DAYKEY(),JSON.stringify({done:state.done,xp:state.xp,energy:state.energy,mood:state.mood,at:Date.now()}))}
function syncNativeWidget(){
  try{
    const bridge=window.webkit?.messageHandlers?.mySystemState;
    if(!bridge)return;
    const q=smartNextTask();
    bridge.postMessage({
      currentQuest:q?{id:q.id,time:q.time,name:q.name,desc:q.desc,xp:q.xp}:null,
      done:Array.isArray(state.done)?state.done:[]
    });
  }catch(e){}
}
window.__mySystemCompleteFromNative=function(id){
  try{
    const q=tasks().find(x=>x.id===id);
    if(q&&!state.done.includes(id)) completeTask(id);
    const ready=window.webkit?.messageHandlers?.mySystemReady;
    if(ready)ready.postMessage("synced");
  }catch(e){}
};
function localDate(){return new Intl.DateTimeFormat("fr-CH",{weekday:"long",day:"numeric",month:"long"}).format(new Date())}
function currentMinutes(){const d=new Date();return d.getHours()*60+d.getMinutes()}
function parseTime(t){if(!/^\d{2}:\d{2}$/.test(t||""))return null;const [h,m]=t.split(":").map(Number);return h*60+m}
function fmtTime(m){m=((m%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")}
function tasks(){return defaults.concat(state.custom||[]).filter(t=>!(state.removed||[]).includes(t.id)).map(t=>{const o=state.overrides[t.id]||{};return {...t,time:o.time||t.time,name:o.name||t.name,desc:o.desc||t.desc,xp:Number.isFinite(o.xp)?o.xp:t.xp}})}
function taskStatus(t){if(state.done.includes(t.id))return"done";const m=parseTime(t.time);if(m===null)return"neutral";const d=m-currentMinutes();if(d<0)return"late";if(d<=45)return"now";return"next"}
function smartNextTask(){const all=tasks().filter(t=>!state.done.includes(t.id));if(!all.length)return null;const now=currentMinutes();const future=all.filter(t=>parseTime(t.time)!==null&&parseTime(t.time)>=now);if(future.length)return future.sort((a,b)=>parseTime(a.time)-parseTime(b.time))[0];return all.sort((a,b)=>(parseTime(a.time)||9999)-(parseTime(b.time)||9999))[0]}
function lvl(){return Math.max(1,Math.floor(state.xp/100)+1)}
function levelPct(){return state.xp%100}
function pct(){const all=tasks();return all.length?Math.round(state.done.length/all.length*100):0}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove("show"),2300)}
function go(id){document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===id));document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.go===id));window.scrollTo({top:0,behavior:"smooth"});renderAll()}
function bubble(text,who){const c=document.getElementById("chat");if(!c)return;const d=document.createElement("div");d.className="bubble "+who;d.textContent=text;c.appendChild(d);c.scrollTop=c.scrollHeight}
function quick(text){document.getElementById("msg").value=text;send()}
function completeTask(id){if(state.done.includes(id))return;const q=tasks().find(x=>x.id===id);if(!q)return;state.done.push(id);state.xp+=q.xp;state.stats[q.stat]=Math.min(100,(state.stats[q.stat]||0)+Math.max(1,Math.round(q.xp/8)));state.history.push({date:new Date().toISOString(),type:"complete",task:id,xp:q.xp});save();toast("✦ QUÊTE ACCOMPLIE · +"+q.xp+" XP");renderAll()}
function toggleMode(){state.mode=state.mode==="normal"?"light":"normal";save();toast(state.mode==="light"?"Mode léger activé":"Mode normal activé");renderAll()}
function setQuestFilter(f){questFilter=f;document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b.dataset.filter===f));renderQuests()}
function editTask(id){const q=tasks().find(x=>x.id===id);if(!q||state.done.includes(id)||q.cat==="FIXE")return;showModal('<div class="time-edit"><span class="eyebrow">MODIFIER LA QUÊTE</span><h3>'+esc(q.name)+'</h3><p class="time-edit-sub">Choisis directement le nouvel horaire.</p><label>Nouvelle heure</label><input id="taskTimeInput" type="time" value="'+esc(q.time)+'" step="300"><div class="time-preview"><span>AVANT</span><b>'+esc(q.time)+'</b><i>→</i><span>APRÈS</span><strong id="taskTimePreview">'+esc(q.time)+'</strong></div><div class="modal-actions"><button class="secondary" onclick="closeModal()">Annuler</button><button class="primary" onclick="saveTaskTime(\''+q.id+'\')">Enregistrer</button></div></div>');const input=document.getElementById("taskTimeInput"),preview=document.getElementById("taskTimePreview");if(input&&preview)input.addEventListener("input",()=>preview.textContent=input.value||q.time);if(input)input.focus()}
function saveTaskTime(id){const q=tasks().find(x=>x.id===id),time=document.getElementById("taskTimeInput")?.value||"";if(!q||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))return toast("Choisis une heure valide");state.overrides[id]={...(state.overrides[id]||{}),time};save();closeModal();toast("Horaire → "+time);renderAll()}
function deleteTask(id){const q=tasks().find(x=>x.id===id);if(!q||state.done.includes(id)||q.cat==="FIXE")return false;state.removed=Array.isArray(state.removed)?state.removed:[];if(!state.removed.includes(id))state.removed.push(id);state.custom=state.custom.filter(t=>t.id!==id);delete state.overrides[id];save();toast("Quête supprimée");renderAll();return true}
function setupQuestSwipe(){const list=document.getElementById("questList");if(!list||list.dataset.swipeReady)return;list.dataset.swipeReady="1";let sx=0,sy=0,row=null,moved=false;list.addEventListener("pointerdown",e=>{const r=e.target.closest(".q-row");if(!r||e.target.closest("button"))return;row=r;sx=e.clientX;sy=e.clientY;moved=false;r.classList.add("swiping")});list.addEventListener("pointermove",e=>{if(!row)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){row=null;return}if(dx>4){moved=true;row.style.transform="translateX("+Math.min(125,dx)+"px)"}});list.addEventListener("pointerup",()=>{if(!row)return;const r=row;row=null;r.classList.remove("swiping");const m=r.style.transform.match(/-?\d+(?:\.\d+)?/);const dx=m?Number(m[0]):0;r.style.transform="";if(moved&&dx>=90)deleteTask(r.dataset.id)});list.addEventListener("pointercancel",()=>{if(row){row.classList.remove("swiping");row.style.transform="";row=null}})}
function addCustomQuest(){const name=prompt("Nom de la quête");if(!name?.trim())return;const time=prompt("Heure (HH:MM)",fmtTime(currentMinutes()+30));if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){toast("Heure invalide");return}state.custom.push({id:"custom-"+Date.now(),time,name:name.trim(),cat:"PERSONNEL",desc:"Une action choisie pour aujourd’hui.",xp:10,stat:"discipline"});save();toast("Nouvelle quête créée");renderAll()}
function adjustEnergy(){const v=prompt("Énergie actuelle sur 10",String(state.energy));if(v===null)return;const n=Math.max(1,Math.min(10,Number(v)));if(!Number.isFinite(n))return;state.energy=n;save();renderAll()}
function adjustMood(){const v=prompt("Humeur actuelle sur 10",String(state.mood));if(v===null)return;const n=Math.max(1,Math.min(10,Number(v)));if(!Number.isFinite(n))return;state.mood=n;save();renderAll()}

function scheduleState(){const q=smartNextTask();if(!q)return{label:"SOCLE TERMINÉ",tone:"good",detail:"Plus de mission obligatoire. Le système te laisse choisir."};const m=parseTime(q.time);if(m===null)return{label:"FLEXIBLE",tone:"neutral",detail:"La prochaine action est flexible."};const d=m-currentMinutes();if(d<0)return{label:"EN RETARD",tone:"late",detail:"Pas de rattrapage automatique : on repart de maintenant."};if(d<=45)return{label:"MAINTENANT",tone:"now",detail:"La prochaine action arrive maintenant."};return{label:"DANS LES TEMPS",tone:"good",detail:"Tu as encore du temps avant la prochaine étape."}}
function renderClock(){const time=document.getElementById("clockTime"),date=document.getElementById("clockDate"),status=document.getElementById("clockStatus"),line=document.getElementById("clockLine"),tl=document.getElementById("timeline");if(!time)return;const now=currentMinutes();time.textContent=fmtTime(now);date.textContent=localDate();const ss=scheduleState();status.textContent=ss.label;status.className="status-chip "+ss.tone;document.getElementById("clockLineText").textContent=ss.detail;const start=420,end=1440,ratio=Math.max(0,Math.min(1,(now-start)/(end-start)));line.style.left=(ratio*100)+"%";tl.innerHTML=tasks().map(t=>{const m=parseTime(t.time);if(m===null)return"";const p=Math.max(0,Math.min(100,(m-start)/(end-start)*100));return '<button class="timeline-item '+taskStatus(t)+'" style="left:'+p+'%" onclick="focusTask(\''+t.id+'\')"><span>'+t.time+'</span><i></i><b>'+esc(t.name)+'</b></button>'}).join("")}
function focusTask(id){const q=tasks().find(x=>x.id===id);if(q)toast(q.time+" · "+q.name+" · +"+q.xp+" XP")}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function rankName(){const l=lvl();return l>=40?"S":l>=25?"A":l>=15?"B":l>=8?"C":l>=4?"D":"E"}
function avatarData(){return state.avatar||{style:"neon",hair:"short",accent:"violet"}}
function customizeAvatar(){
  const a=avatarData();
  const style=prompt("Style avatar : neon / cyber / shadow",a.style)||a.style;
  const hair=prompt("Silhouette : short / long / hood",a.hair)||a.hair;
  const accent=prompt("Accent : violet / cyan / gold",a.accent)||a.accent;
  state.avatar={style,hair,accent}; save(); toast("Avatar personnalisé"); renderAll()
}
function renderAvatar(){
  const a=avatarData(), r=rankName(), s=state.stats;
  ["homeAvatar","characterAvatar"].forEach(id=>{const el=document.getElementById(id);if(el){el.dataset.style=a.style;el.dataset.hair=a.hair;el.dataset.accent=a.accent}});
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=Math.round(v)};
  set("hudHealth",s.health);set("hudMind",s.mood);set("hudBody",s.fitness);set("hudKnowledge",s.knowledge);set("hudRank",r);set("hudLevel",lvl());set("charRank",r);set("charLevel",lvl());
  const evo=s.fitness+s.knowledge+s.discipline+s.recovery;
  const title=evo>300?"ASCENSION":evo>220?"ÉVOLUTION":"RECONSTRUCTION";
  const ct=document.getElementById("charArcTitle");if(ct)ct.textContent=title;
  const tx=document.getElementById("charArcText");if(tx)tx.textContent=title==="ASCENSION"?"Ton système commence à refléter une vraie régularité.":"Chaque action réelle donne une forme différente à ton personnage.";
  const ev=document.getElementById("hudEvolution");if(ev)ev.textContent=title+" · RANK "+r;
  const nx=document.getElementById("hudNextStat");if(nx)nx.textContent=(100-levelPct())+" XP avant le prochain niveau";
}
function renderDayBrief(){
 const q=smartNextTask(), h=currentMinutes();
 const title=document.getElementById("dayBriefTitle"),text=document.getElementById("dayBriefText");
 if(!title||!text)return;
 if(state.energy<=3){title.textContent="Aujourd’hui, on protège ton énergie.";text.textContent="Le système privilégie les essentiels et des actions courtes. Tu n’as rien à prouver."}
 else if(q&&parseTime(q.time)!==null&&parseTime(q.time)-h<0){title.textContent="La journée a bougé. On repart de maintenant.";text.textContent="Les tâches passées ne créent aucune dette. La prochaine action devient la référence."}
 else {title.textContent=q?"Ta prochaine action est "+q.name+".":"Ton socle est terminé.";text.textContent=q?"Le reste reste volontairement en arrière-plan jusqu’à ce que celle-ci soit faite.":"Tu peux choisir librement ce qui mérite ton attention."}
}
function renderHome(){renderAvatar();renderDayBrief();const q=smartNextTask(),ss=scheduleState();document.getElementById("streak").textContent="🔥 "+getStreak()+" jour"+(getStreak()>1?"s":"");document.getElementById("xpProgress").textContent=state.xp+" / "+(lvl()*100)+" XP";const badge=document.getElementById("scheduleBadge");badge.textContent=ss.label;badge.className="status-chip "+ss.tone;document.getElementById("scheduleBadge").title=ss.detail;document.getElementById("heroText").textContent=ss.tone==="late"?"Le planning a pris du retard. Pas grave : on repart de maintenant, sans dette.":"Une seule action importante maintenant. Le reste peut attendre.";document.getElementById("currentQuest").innerHTML=q?'<div class="quest-hero"><div class="quest-kicker"><span>'+esc(q.cat)+'</span><span>'+q.time+'</span></div><div class="quest-title">'+esc(q.name)+'</div><div class="quest-desc">'+esc(q.desc)+'</div><div class="quest-foot"><span class="xp">+'+q.xp+' XP</span><button class="primary" onclick="completeTask(\''+q.id+'\')">✓ C’est fait</button></div></div>':'<div class="quest-hero"><div class="eyebrow">SOCLE TERMINÉ</div><div class="quest-title">Tu es libre.</div><div class="quest-desc">Aucune mission obligatoire restante. Profite de l’espace ou crée une quête personnelle.</div></div>';document.getElementById("dayContext").innerHTML='<div class="day-context '+(ss.tone==="late"?"late":"")+'"><b>'+esc(ss.label)+'.</b> '+esc(ss.detail)+'</div>';const target=sleepCalc();document.getElementById("homeSleepStat").textContent=fmtTime(target.bed);document.getElementById("energy").textContent=state.energy;document.getElementById("mood").textContent=state.mood;document.getElementById("todayPct").textContent=pct()+"%";document.getElementById("todayXp").textContent=state.xp+" XP";document.getElementById("homeLevel").textContent=lvl();document.getElementById("homeXpBar").style.width=levelPct()+"%";document.getElementById("questProgressText").textContent=state.done.length+" / "+tasks().length+" missions";document.getElementById("homeNextText").textContent=q?q.time+" · "+q.name:"Socle terminé";document.getElementById("homeSleep").innerHTML='<div class="mini-sleep"><span class="eyebrow">CE SOIR</span><b>'+fmtTime(target.bed)+'</b><small>viser '+target.target+' h · lever '+state.sleep.wake+'</small><button class="ghost" onclick="go(\'sleep\')">Sommeil →</button></div>'}
function renderQuests(){const all=tasks(),next=smartNextTask();document.getElementById("questDone").textContent=state.done.length;document.getElementById("questLeft").textContent=all.length-state.done.length;document.getElementById("questXp").textContent=state.xp;const mode=document.getElementById("modeToggle");mode.textContent=state.mode==="normal"?"NORMAL":"LÉGER";mode.classList.toggle("light",state.mode==="light");let list=all;if(questFilter==="open")list=all.filter(q=>!state.done.includes(q.id));if(questFilter==="done")list=all.filter(q=>state.done.includes(q.id));list=list.slice().sort((a,b)=>{const ta=parseTime(a.time),tb=parseTime(b.time);if(ta===null&&tb===null)return 0;if(ta===null)return 1;if(tb===null)return -1;return ta-tb});document.getElementById("questList").innerHTML=list.length?list.map(q=>'<div class="q-row '+(state.done.includes(q.id)?"done ":"")+(next&&next.id===q.id?"next":"")+'" data-id="'+esc(q.id)+'"><button class="q-check" onclick="completeTask(\''+q.id+'\')">'+(state.done.includes(q.id)?"✓":"")+'</button><span class="q-time">'+q.time+'</span><span class="q-name">'+esc(q.name)+'</span><span class="q-xp">+'+q.xp+'</span><button class="q-edit" onclick="editTask(\''+q.id+'\')">↗</button></div>').join(""):'<div class="empty">Rien ici pour le moment.</div>';setupQuestSwipe()}
function renderStats(){const labels={health:"Santé",fitness:"Forme",knowledge:"Connaissance",discipline:"Discipline",social:"Social",mood:"Humeur",recovery:"Récupération",energy:"Énergie"};document.getElementById("stats").innerHTML=Object.entries(state.stats).map(([k,v])=>'<div class="stat"><div class="stat-top"><span>'+labels[k]+'</span><span>'+Math.round(v)+'</span></div><div class="statbar"><i style="width:'+Math.min(100,v)+'%"></i></div></div>').join("");document.getElementById("levelProgressText").textContent=levelPct()+"%";document.getElementById("levelProgressBar").style.width=levelPct()+"%";document.getElementById("statInsight").textContent=state.mode==="light"?"Le mode léger protège ta régularité quand ton énergie baisse. C’est une adaptation, pas un échec.":"Le système privilégie la régularité : les petites actions répétées comptent plus qu’une journée parfaite."}
const meals=[["🥣","Bol simple","Yaourt, avoine ou céréales, fruit et quelques noix."],["🍳","Œufs + tartine","Œufs, pain complet, fruit ou légumes selon l’envie."],["🍚","Bol riz","Riz, légumes, œufs/tofu/poulet et une sauce simple."],["🥙","Wrap complet","Galette, protéine, crudités et sauce au yaourt."],["🍝","Pâtes équilibrées","Pâtes, légumes, sauce tomate et une source de protéines."],["🥔","Assiette maison","Pommes de terre ou céréales, légumes et protéine."]];
function renderNutrition(){const h=new Date().getHours();const title=h<11?"Petit-déjeuner":h<15?"Déjeuner":h<19?"Goûter / pause":"Dîner";document.getElementById("mealNowTitle").textContent=title;document.getElementById("mealGrid").innerHTML=meals.slice(0,4).map(m=>'<div class="meal"><span>'+m[0]+'</span><b>'+m[1]+'</b><p>'+m[2]+'</p></div>').join("");document.getElementById("pantry").innerHTML=state.pantry.map(x=>'<span class="chip">'+esc(x)+'</span>').join("")||'<span class="chip">frigo vide</span>'}
function shuffleMeal(){const m=meals[Math.floor(Math.random()*meals.length)];document.getElementById("mealNowTitle").textContent=m[1];document.getElementById("mealNowText").textContent=m[2];toast("Idée changée")}
function editPantry(){const v=prompt("Sépare les aliments par des virgules",state.pantry.join(", "));if(v===null)return;state.pantry=v.split(",").map(x=>x.trim()).filter(Boolean);save();renderNutrition();toast("Frigo actualisé")}
function sleepCalc(){const wake=parseTime(state.sleep.wake)||480;const target=state.sleep.fatigue>=8?9:state.sleep.fatigue>=6?8.5:8;return{target,bed:wake-target*60}}
function renderSleep(){const p=state.sleep,c=sleepCalc(),wind=c.bed-45;document.getElementById("bedtime").textContent=fmtTime(c.bed);document.getElementById("sleepTarget").textContent=c.target+" h";document.getElementById("sleepFatigue").textContent=p.fatigue+"/10";document.getElementById("sleepWake").textContent=p.wake;document.getElementById("sleepWind").textContent=fmtTime(wind);document.getElementById("sleepStatus").textContent=p.fatigue>=8?"RÉCUPÉRATION PRIORITAIRE":p.fatigue>=6?"FATIGUE À PROTÉGER":"RYTHME STABLE";document.getElementById("sleepReason").textContent=p.fatigue>=8?"Ce soir, protège surtout une vraie période de repos.":p.fatigue>=6?"Ta fatigue est élevée : mieux vaut protéger une nuit suffisante que repousser le coucher.":"Garde surtout une heure de lever assez régulière.";document.getElementById("sleepPlan").innerHTML='<div class="sleep-step"><b>'+fmtTime(wind)+'</b><span>Mode calme</span><small>Lumière plus douce, activités tranquilles, préparer demain.</small></div><div class="sleep-step"><b>'+fmtTime(c.bed-15)+'</b><span>Fin des écrans stimulants</span><small>Si possible, passer à quelque chose de calme et peu stimulant.</small></div><div class="sleep-step"><b>'+fmtTime(c.bed)+'</b><span>Au lit</span><small>Objectif : laisser suffisamment de temps au sommeil, sans chercher la perfection.</small></div>';}
function openSleepSettings(){const content='<h3>Réglage du rythme</h3><label>Heure de lever cible</label><input id="modalWake" type="time" value="'+state.sleep.wake+'"><label>Fatigue actuelle (1–10)</label><input id="modalFatigue" type="number" min="1" max="10" value="'+state.sleep.fatigue+'"><div class="modal-actions"><button class="secondary" onclick="closeModal()">Annuler</button><button class="primary" onclick="saveSleepSettings()">Enregistrer</button></div>';document.getElementById("modalContent").innerHTML=content;document.getElementById("modal").classList.add("show")}
function saveSleepSettings(){const wake=document.getElementById("modalWake").value,f=Number(document.getElementById("modalFatigue").value);if(!/^\d\d:\d\d$/.test(wake)||!Number.isFinite(f))return;state.sleep.wake=wake;state.sleep.fatigue=Math.max(1,Math.min(10,f));save();closeModal();toast("Rythme actualisé");renderAll()}
function closeModal(){document.getElementById("modal").classList.remove("show")}

function score(){const base=pct(),energy=state.energy*10,mood=state.mood*10;return Math.min(100,Math.round(base*.72+energy*.12+mood*.16))}
function renderReport(){const s=score();document.getElementById("score").textContent=s;document.getElementById("scoreBar").style.width=s+"%";document.getElementById("scoreMood").textContent=state.mode==="light"?"MODE LÉGER":s>=70?"BON RYTHME":s>=40?"EN CONSTRUCTION":"DÉMARRAGE";document.getElementById("scoreText").textContent=s>=80?"Très bonne cohérence entre tes actions et ton énergie.":s>=50?"Tu avances. Le système peut surtout t’aider à garder le cap.":"Pas besoin de rattraper quoi que ce soit. Choisis une petite action utile.";const done=tasks().filter(q=>state.done.includes(q.id));document.getElementById("reportList").innerHTML=(done.length?done.slice(-5).reverse().map(q=>'<div class="report-item"><b>✓ '+esc(q.name)+'</b><span>+'+q.xp+' XP · '+q.cat+'</span></div>').join(""):'<div class="empty">Aucune quête terminée aujourd’hui. Une petite victoire suffit pour commencer.</div>');const q=smartNextTask();document.getElementById("recommendations").innerHTML=q?"Prochaine priorité : <b>"+esc(q.name)+"</b> à "+q.time+". Si ton énergie change, modifie-la ou demande au Coach de recalculer la suite.":"Le socle est terminé. Tu peux créer une quête personnelle ou simplement profiter de ton temps."}
function getStreak(){let n=state.done.length?1:0;for(let i=1;i<30;i++){const d=new Date();d.setDate(d.getDate()-i);const k="mysystem-"+d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");try{const s=JSON.parse(localStorage.getItem(k)||"null");if(s?.done?.length)n++;else break}catch(e){break}}return n}
function analyzeJournal(){const t=document.getElementById("journalText").value.trim();if(!t){toast("Écris ou raconte d’abord ta journée");return}state.journal=t;const low=t.toLowerCase();if(/fatigu|épuis|crevé|mal dorm/.test(low))state.energy=Math.max(1,+(state.energy-.5).toFixed(1));if(/content|heureux|bien passé|fier/.test(low))state.mood=Math.min(10,+(state.mood+.4).toFixed(1));state.xp+=5;state.coachLog.push({date:new Date().toISOString(),message:t});save();document.getElementById("journalResult").innerHTML='<div class="panel" style="margin-top:10px"><span class="eyebrow">CONTEXTE ENREGISTRÉ</span><p style="color:var(--muted);font-size:10px;line-height:1.5">Le système gardera ce retour comme contexte local. Le Coach IA pourra l’utiliser pour mieux adapter les prochaines décisions.</p></div>';toast("Journal enregistré · +5 XP");renderAll()}
function voiceJournal(){const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){toast("La dictée vocale n’est pas disponible ici");go("journal");return}const rec=new Speech();rec.lang="fr-FR";rec.interimResults=true;rec.continuous=false;document.getElementById("recordTitle").textContent="J’écoute…";document.getElementById("recordText").textContent="Parle naturellement. Je transcris ce que tu dis.";rec.onresult=e=>{let t="";for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;document.getElementById("journalText").value=t};rec.onend=()=>{document.getElementById("recordTitle").textContent="C’est enregistré";document.getElementById("recordText").textContent="Tu peux analyser ta journée maintenant.";go("journal")};rec.onerror=()=>toast("Impossible d’utiliser le micro");rec.start()}

function coachContextText(){const q=smartNextTask();return "Heure locale: "+fmtTime(currentMinutes())+" · énergie: "+state.energy+"/10 · humeur: "+state.mood+"/10 · mode: "+state.mode+" · progression: "+pct()+"% · prochaine quête: "+(q?q.time+" "+q.name:"aucune")+" · fatigue sommeil: "+state.sleep.fatigue+"/10"}
function localCoach(m){const low=m.toLowerCase();const tm=low.match(/(?:à|vers|pour)\s*(\d{1,2})[:h](\d{2})/);if((low.includes("déplace")||low.includes("décale")||low.includes("repousse")||low.includes("avance"))&&tm){const q=tasks().find(t=>low.includes(t.name.toLowerCase()));if(q){const time=tm[1].padStart(2,"0")+":"+tm[2];state.overrides[q.id]={...(state.overrides[q.id]||{}),time};save();renderAll();return"Je l’ai déplacée : « "+q.name+" » passe à "+time+"."}}if(low.includes("maintenant")||low.includes("quoi faire")){const q=smartNextTask();return q?"Fais seulement « "+q.name+" ». "+q.desc:"Ton socle est terminé. Tu es libre."}if(low.includes("organis"))return"Je regarde l’heure, ton énergie et les quêtes restantes. La prochaine priorité est « "+(smartNextTask()?.name||"une activité choisie")+" ».";if(low.includes("fatigu")||low.includes("dormi"))return"On baisse l’intensité. Le but est de protéger les essentiels et ta récupération, pas de tout rattraper.";return"Je garde ça comme contexte. Je peux déjà agir localement sur les quêtes ; avec l’IA connectée, je peux analyser plus finement ta situation."}
function applyCoachActions(actions){if(!Array.isArray(actions))return[];state.removed=Array.isArray(state.removed)?state.removed:[];state.removed=Array.isArray(state.removed)?state.removed:[];const changed=[];const all=tasks();actions.forEach(a=>{const q=a.task_id?all.find(t=>t.id===a.task_id):null;const protectedTask=q&&(state.done.includes(q.id)||q.cat==="FIXE");if((a.type==="move_task"||a.type==="change_task"||a.type==="remove_task")&&(!q||protectedTask))return;if(a.type==="move_task"&&a.task_id&&/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time||"")){state.overrides[a.task_id]={...(state.overrides[a.task_id]||{}),time:a.time};changed.push("horaire → "+a.time)}else if(a.type==="change_task"&&a.task_id){state.overrides[a.task_id]={...(state.overrides[a.task_id]||{}),...(a.time&&/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time)?{time:a.time}:{}),...(a.name?{name:a.name}:{}),...(a.desc?{desc:a.desc}:{}),...(Number.isFinite(a.xp)?{xp:Math.max(1,Math.min(100,a.xp))}:{})};changed.push(a.time?"quête + horaire modifiés":"quête modifiée")}else if(a.type==="add_task"&&a.name){state.custom.push({id:"ai-"+Date.now()+"-"+Math.random().toString(16).slice(2),time:/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time||"")?a.time:fmtTime(currentMinutes()+30),name:a.name,cat:a.cat||"COACH",desc:a.desc||"Action proposée par le Coach.",xp:Number(a.xp)||10,stat:a.stat||"discipline"});changed.push("nouvelle quête")}else if(a.type==="remove_task"&&a.task_id){
  if(!state.removed.includes(a.task_id))state.removed.push(a.task_id);
  state.custom=state.custom.filter(t=>t.id!==a.task_id);
  delete state.overrides[a.task_id];
  changed.push("quête supprimée")
}else if(a.type==="set_mode"&&(a.mode==="normal"||a.mode==="light")){if(state.mode!==a.mode){state.mode=a.mode;changed.push("mode "+a.mode)}}});if(changed.length)save();return changed}
function naturalCoachActions(message){
  const low=String(message||"").toLowerCase();
  const all=tasks();
  const removeIntent=/(?:supprime|supprimer|enlève|enlever|retire|retirer|efface|effacer)/i.test(low);
  if(removeIntent){
    const q=all.find(t=>!state.done.includes(t.id)&&t.cat!=="FIXE"&&low.includes(t.name.toLowerCase()));
    if(q)return [{type:"remove_task",task_id:q.id}];
  }
  const out=[];
  const timeMatch=low.match(/(?:à|vers|pour)\s*(\\d{1,2})(?:[:h](\\d{2}))?/i);
  const time=timeMatch?String(Number(timeMatch[1])).padStart(2,"0")+":"+(timeMatch[2]||"00"):"";
  const sport=all.find(t=>!state.done.includes(t.id)&&t.cat!=="FIXE"&&/sport|bouger|fitness|salle|muscu/i.test(t.name));
  const work=all.find(t=>!state.done.includes(t.id)&&t.cat!=="FIXE"&&/epfl|travail|étud|cours/i.test(t.name));
  if(time && sport && /(?:fitness|salle|muscu|musculation|sport|bouger)/i.test(low) &&
     /(?:demain|aujourd|aujourd'hui|finalement|mets|mettre|passe|déplace|décale|fais|faire|vais)/i.test(low)){
    out.push({type:"move_task",task_id:sport.id,time});
  }
  if(sport && /(?:finalement|plutôt|plutot|préfère|prefere)/i.test(low) &&
     /(?:courir|course|running)/i.test(low)){
    out.push({type:"change_task",task_id:sport.id,name:"Course / running",desc:"Courir à l’intensité adaptée à ton énergie du jour."});
  }
  if(time && work && /(?:travail|étud|cours|epfl)/i.test(low) &&
     /(?:mets|mettre|passe|déplace|décale|fais|faire)/i.test(low)){
    out.push({type:"move_task",task_id:work.id,time});
  }
  return out;
}

async function send(){
  const input=document.getElementById("msg"),m=input.value.trim();
  if(!m||window.__coachBusy)return;
  window.__coachBusy=true;
  bubble(m,"me");
  input.value="";
  input.disabled=true;
  const placeholder=document.createElement("div");
  placeholder.className="bubble coach";
  placeholder.textContent="…";
  document.getElementById("chat").appendChild(placeholder);
  document.getElementById("chat").scrollTop=99999;
  document.getElementById("coachState").textContent="Coach IA · réflexion…";
  const started=performance.now();
  try{
    const r=await fetch("https://my-system-2hpc.vercel.app/api/coach",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        message:m,
        state,
        context:coachContextText(),
        tasks:tasks(),
        previous_response_id:state.coachResponseId||null
      })
    });
    if(!r.ok){let detail="";try{const err=await r.json();detail=err?.error||""}catch{}throw new Error(detail||("HTTP "+r.status));}
    const d=await r.json();
    placeholder.textContent=d.reply||"Je t’écoute.";
    if(d.response_id)state.coachResponseId=d.response_id;
    // Always use the protected public action handler so Coach changes are
    // actually applied to the same state used by the Quêtes screen.
    const modelActions=Array.isArray(d.actions)?d.actions:[];
    const localActions=naturalCoachActions(m);
    const mergedActions=[...modelActions];
    for(const a of localActions){
      if(!mergedActions.some(x=>x.type===a.type&&x.task_id===a.task_id&&(!a.time||x.time===a.time))) mergedActions.push(a);
    }
    const changed=typeof window.applyCoachActions==="function"
      ? window.applyCoachActions(mergedActions)
      : applyCoachActions(mergedActions);
    if(changed.length){
      bubble("⚙ Système ajusté · "+changed.join(" · "),"coach");
      save();
    }
    state.coachLog=Array.isArray(state.coachLog)?state.coachLog:[];
    state.coachLog.push({date:new Date().toISOString(),message:m,reply:d.reply||""});
    state.coachLog=state.coachLog.slice(-40);
    save();
    const ms=Math.round(performance.now()-started);
    document.getElementById("coachState").textContent="Gemini Coach · connecté · "+(ms<2500?"rapide":"analyse");
    renderAll();
  }catch(e){
    placeholder.textContent="⚠️ Le Coach IA n’a pas répondu. "+(e.message||"Erreur inconnue");
    document.getElementById("coachState").textContent="IA indisponible · erreur détectée";
  }finally{
    window.__coachBusy=false;
    input.disabled=false;
    input.focus();
  }
}
function resetToday(){if(!confirm("Réinitialiser les quêtes et XP de cette journée ?"))return;state.done=[];state.xp=0;save();toast("Journée réinitialisée");renderAll()}

function renderAll(){document.getElementById("level").textContent=lvl();document.getElementById("charLevel").textContent=lvl();document.getElementById("todayLabel").textContent=localDate().toUpperCase();document.getElementById("coachContext").textContent=coachContextText();renderHome();renderClock();renderQuests();renderAvatar();renderDayBrief();renderStats();renderNutrition();renderSleep();renderReport()}

function setupUpdates(){if(!("serviceWorker"in navigator)||location.protocol==="file:")return;navigator.serviceWorker.register("./sw.js").then(reg=>{if(reg.waiting){updateWorker=reg.waiting;showUpdate()};reg.addEventListener("updatefound",()=>{const w=reg.installing;if(!w)return;w.addEventListener("statechange",()=>{if(w.state==="installed"&&navigator.serviceWorker.controller){updateWorker=w;showUpdate()}})});setInterval(()=>reg.update().catch(()=>{}),60000)}).catch(()=>{});navigator.serviceWorker.addEventListener("controllerchange",()=>{if(reloadOnController)location.reload()})}
function showUpdate(){document.getElementById("updateBanner").classList.add("show")}
function applyUpdate(){if(!updateWorker){location.reload();return}reloadOnController=true;updateWorker.postMessage({type:"SKIP_WAITING"});document.getElementById("updateBanner").classList.remove("show")}
document.getElementById("msg").addEventListener("keydown",e=>{if(e.key==="Enter")send()});
bubble("Je suis le centre de contrôle de MY SYSTEM. Dis-moi où tu en es vraiment : je peux t’aider à choisir la prochaine action et, quand l’IA est connectée, agir directement sur ton planning.","coach");
renderAll();setupUpdates();setInterval(()=>{renderClock();renderHome()},30000);
setTimeout(()=>{try{syncNativeWidget();window.webkit?.messageHandlers?.mySystemReady?.postMessage("ready")}catch(e){}},500);
/* MY SYSTEM adaptive core */
(function(){
const today=()=>new Date().toISOString().slice(0,10), valid=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t||""), mins=t=>valid(t)?Number(t.slice(0,2))*60+Number(t.slice(3)):null, esc2=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
state.achievements=Array.isArray(state.achievements)?state.achievements:[];state.dayPlan=state.dayPlan||{note:"",anchors:[]};state.arcs=state.arcs||{current:"FOUNDATION",days:0};state.dayKey=state.dayKey||today();state.dayXp=Number.isFinite(state.dayXp)?state.dayXp:0;
if(state.dayKey!==today()){state.history=Array.isArray(state.history)?state.history:[];state.history.push({date:state.dayKey,type:"day_end",done:state.done.length,dayXp:state.dayXp});state.done=[];state.dayXp=0;state.journal="";state.dayKey=today();state.arcs.days=(state.arcs.days||0)+1}
const oldSave=save;save=function(){state.dayKey=today();localStorage.setItem(KEY,JSON.stringify(state));const d=new Date(),k="mysystem-"+d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");localStorage.setItem(k,JSON.stringify({done:state.done,xp:state.dayXp,energy:state.energy,mood:state.mood,at:Date.now()}));syncNativeWidget()};
function achievement(id,name){if(!state.achievements.includes(id)){state.achievements.push(id);state.history.push({date:new Date().toISOString(),type:"achievement",id,name});toast("✦ SUCCÈS · "+name)}}
function checkAchievements(){const n=state.history.filter(x=>x.type==="complete").length;if(state.xp>=100)achievement("lvl2","Premier niveau");if(n>=10)achievement("10quests","10 quêtes");if(state.dayXp>=50)achievement("50day","Journée solide");if(state.dayXp>=100)achievement("100day","Journée complète")}
window.completeTask=function(id){if(state.done.includes(id))return;const q=tasks().find(x=>x.id===id);if(!q)return;state.done.push(id);state.xp+=q.xp;state.dayXp+=q.xp;if(q.xp)state.stats[q.stat]=Math.min(100,(state.stats[q.stat]||0)+Math.max(1,Math.round(q.xp/8)));state.history.push({date:new Date().toISOString(),type:"complete",task:id,xp:q.xp});checkAchievements();save();toast("✦ QUÊTE ACCOMPLIE · +"+q.xp+" XP");renderAll()};
window.openDayPlanner=function(){showModal('<h3>Décris ta vraie journée</h3><p style="color:var(--muted);font-size:10px;line-height:1.5">Le système construit autour de ta réalité. Les contraintes fixes ne sont pas déplacées automatiquement.</p><label>Contexte</label><textarea id="planNote" style="min-height:105px" placeholder="Cours, rendez-vous, sport, repas, priorité…">'+esc2(state.dayPlan.note||"")+'</textarea><label>Moments fixes (HH:MM - nom)</label><textarea id="planAnchors" style="min-height:90px" placeholder="10:00 - Cours EPFL\n19:00 - Dîner">'+esc2((state.dayPlan.anchors||[]).map(x=>x.time+" - "+x.name).join("\n"))+'</textarea><div class="modal-actions"><button class="secondary" onclick="closeModal()">Annuler</button><button class="primary" onclick="saveDayPlanner()">Construire</button></div>')};
window.saveDayPlanner=function(){const note=(document.getElementById("planNote")?.value||"").trim(),raw=document.getElementById("planAnchors")?.value||"",anchors=raw.split("\\n").map(x=>x.trim()).filter(Boolean).map(x=>{const m=x.match(/^(\\d{1,2}):([0-5]\\d)\s*-\s*(.+)$/);return m?{time:String(m[1]).padStart(2,"0")+":"+m[2],name:m[3].trim()}:null}).filter(Boolean);state.dayPlan={note,anchors};anchors.forEach((a,i)=>{const id="anchor-"+a.time+"-"+i;if(!state.custom.some(x=>x.anchorId===id))state.custom.push({id,anchorId:id,time:a.time,name:a.name,cat:"FIXE",desc:"Contrainte déclarée par toi.",xp:0,stat:"discipline"})});if(state.energy<=3)state.mode="light";save();closeModal();toast("✦ JOURNÉE RECALCULÉE");renderAll()};
function planButton(){const b=document.getElementById("dayBrief");if(b&&!b.querySelector("[data-plan]")){const x=document.createElement("button");x.dataset.plan=1;x.textContent="PLANIFIER";x.onclick=openDayPlanner;b.appendChild(x)}}
window.smartNextTask=function(){const all=tasks().filter(t=>!state.done.includes(t.id)),now=currentMinutes();if(!all.length)return null;const future=all.filter(t=>mins(t.time)!==null&&mins(t.time)>=now),fixed=future.filter(t=>t.cat==="FIXE").sort((a,b)=>mins(a.time)-mins(b.time));if(fixed[0])return fixed[0];if(state.energy<=3){const safe=future.filter(t=>["BASE","SANTÉ","NUTRITION","RÉCUPÉRATION","ÉNERGIE","HUMEUR"].includes(t.cat)).sort((a,b)=>mins(a.time)-mins(b.time));if(safe[0])return safe[0]}return future.sort((a,b)=>mins(a.time)-mins(b.time))[0]||all.sort((a,b)=>(mins(a.time)||9999)-(mins(b.time)||9999))[0]};
window.scheduleState=function(){const q=smartNextTask();if(!q)return{label:"SOCLE TERMINÉ",tone:"good",detail:"Plus de mission obligatoire. Le système te laisse choisir."};const m=mins(q.time),d=m-currentMinutes();if(d<0)return{label:"EN RETARD",tone:"late",detail:"Aucune dette : on repart de maintenant."};if(d<=45)return{label:"MAINTENANT",tone:"now",detail:"La prochaine action arrive dans les 45 prochaines minutes."};return{label:"DANS LES TEMPS",tone:"good",detail:"Tu as encore du temps avant la prochaine étape."}};
window.rankName=function(){const l=lvl();return l>=40?"S":l>=25?"A":l>=15?"B":l>=8?"C":l>=4?"D":"E"};
const oldAvatar=renderAvatar;renderAvatar=function(){oldAvatar();[document.getElementById("homeAvatar"),document.getElementById("characterAvatar")].forEach(x=>{if(x){x.dataset.rank=rankName();x.classList.toggle("evolved",lvl()>=4);x.classList.toggle("awakened",lvl()>=8)}});const meta=document.querySelector("#character .insight");if(meta&&!document.getElementById("achievementPanel")){const p=document.createElement("div");p.id="achievementPanel";p.className="panel insight";meta.parentNode.appendChild(p)}const box=document.getElementById("achievementPanel");if(box){const names={"lvl2":"Premier niveau","10quests":"10 quêtes","50day":"Journée solide","100day":"Journée complète"};const u=state.achievements.length?state.achievements.map(a=>"✦ "+esc2(names[a]||a)).join(" · "):"Aucun succès débloqué pour l’instant.";box.innerHTML="<span class='eyebrow'>SUCCÈS</span><p>"+u+"</p><p style='margin-top:6px;color:var(--muted)'>Arc : <b>"+esc2(state.arcs.current)+"</b> · Niveau "+lvl()+"</p>"}};
const oldBrief=renderDayBrief;renderDayBrief=function(){const q=smartNextTask(),h=currentMinutes(),a=document.getElementById("dayBriefTitle"),b=document.getElementById("dayBriefText");if(!a||!b)return;if(state.energy<=3){a.textContent="Mode protection : énergie basse.";b.textContent="Les essentiels passent devant le reste. Les tâches exigeantes peuvent être réduites ou déplacées."}else if(state.dayPlan.note){a.textContent="Contexte pris en compte.";b.textContent=state.dayPlan.note.slice(0,180)}else if(q&&parseTime(q.time)<h){a.textContent="La journée a bougé.";b.textContent="Aucune dette : le système repart de maintenant."}else{a.textContent=q?"Prochaine action : "+q.name:"Socle terminé.";b.textContent=q?"Une seule action visible. Le reste reste en arrière-plan.":"Tu peux choisir librement la suite."}planButton()};
window.sleepCalc=function(){const wake=parseTime(state.sleep.wake)||480,target=state.sleep.fatigue>=8?9.5:state.sleep.fatigue>=6?9:8.5;return{target,bed:wake-target*60}};const oldSleep=renderSleep;renderSleep=function(){oldSleep();const p=document.querySelector("#sleep .sleep-note p");if(p)p.textContent="Le système vise surtout une durée suffisante et un lever assez régulier. Si le sommeil reste très difficile malgré de bonnes habitudes, en parler à un professionnel peut être utile."};
const oldNutrition=renderNutrition;renderNutrition=function(){oldNutrition();const p=document.querySelector("#nutrition .pantry-panel");if(p&&!document.getElementById("nutritionGuide")){const d=document.createElement("div");d.id="nutritionGuide";d.className="nutrition-guide";d.innerHTML='<span class="eyebrow">GUIDE DU SYSTÈME</span><p>À chaque repas : une base rassasiante, une source de protéines, des fruits ou légumes et quelque chose que tu apprécies. Ajuste à ta faim et à ta journée, sans calcul obligatoire.</p>';p.appendChild(d)}};
const oldJournal=analyzeJournal;analyzeJournal=function(){oldJournal();const t=(state.journal||"").toLowerCase();if(/fatigu|épuis|crevé|mal dorm|stress/.test(t)){state.energy=Math.max(1,Number((state.energy-.5).toFixed(1)));state.mode="light"}if(/fier|réussi|heureux|content|bien passé/.test(t))state.mood=Math.min(10,Number((state.mood+.3).toFixed(1)));state.history.push({date:new Date().toISOString(),type:"journal_signal",energy:state.energy,mood:state.mood});save()};
const oldLocal=localCoach;window.localCoach=function(m){const l=m.toLowerCase();if(l.includes("organise")||l.includes("planifie")){openDayPlanner();return"Donne-moi les contraintes réelles de ta journée et je construis autour."}if(/fatigu|crevé|épuis/.test(l)){state.energy=Math.max(1,state.energy-1);state.mode="light";save();renderAll();return"Mode léger activé. On protège les essentiels et on enlève la dette."}return oldLocal(m)};
const oldActions=applyCoachActions;window.applyCoachActions=function(actions){return oldActions((actions||[]).filter(a=>!(String(a.task_id||"").startsWith("anchor-"))))};
const css=document.createElement("style");css.textContent='.day-brief{position:relative;overflow:hidden}.day-brief:after{content:"ADAPTIVE CORE";position:absolute;right:12px;bottom:5px;font-size:6px;letter-spacing:1.6px;color:#ffffff22}.nutrition-guide{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}.nutrition-guide p{font-size:9px;line-height:1.55;color:var(--muted);margin:6px 0}.avatar-figure.evolved .avatar-core{box-shadow:0 0 38px #61eaff66}.avatar-figure.awakened .avatar-body{box-shadow:inset 0 0 30px #a26dff22,0 0 35px #7b63ff18}';document.head.appendChild(css);
try{checkAchievements();save();renderAll()}catch(e){console.error("MY SYSTEM core",e)}
})();