/* MY SYSTEM — Improvement Engine
   Proactive opportunities: discover useful ways to grow without silently adding them.
*/
(function(){
  const today=()=>new Date().toISOString().slice(0,10);
  const key=()=>today();
  const capLabels={knowledge:"CONNAISSANCE",fitness:"FORME",health:"SANTÉ",discipline:"DISCIPLINE",social:"SOCIAL",recovery:"RÉCUPÉRATION",mood:"HUMEUR",energy:"ÉNERGIE",curiosity:"CURIOSITÉ",organization:"ORGANISATION"};
  const capIcons={knowledge:"✦",fitness:"◆",health:"♥",discipline:"◈",social:"◎",recovery:"☾",mood:"◒",energy:"⚡",curiosity:"◇",organization:"▣"};
  const ideas={
    knowledge:[
      ["Lire 10 pages d’un livre","10–15 min","knowledge","La connaissance progresse mieux par exposition régulière que par gros blocs occasionnels.","learn"],
      ["Apprendre un concept nouveau","15 min","knowledge","Choisis un concept que tu ne maîtrises pas encore et explique-le avec tes propres mots.","learn"],
      ["Faire 10 cartes Anki utiles","10 min","knowledge","Transformer ce que tu apprends en rappel actif aide à le retenir.","learn"],
      ["Explorer un sujet qui t’intrigue","20 min","curiosity","La curiosité peut devenir une vraie compétence si tu la transformes en exploration concrète.","explore"]
    ],
    fitness:[
      ["20 min de mouvement","20 min","fitness","Un peu de mouvement cohérent avec ton énergie entretient la régularité sans chercher la performance à chaque fois.","move"],
      ["Travailler une compétence physique","20 min","fitness","Une séance orientée technique peut faire progresser une capacité précise plutôt que seulement accumuler du volume.","practice"],
      ["Faire une marche d’observation","20 min","energy","Changer d’environnement et marcher peut servir à la fois l’énergie et la récupération.","move"]
    ],
    discipline:[
      ["Terminer une petite chose en attente","10 min","discipline","Finir une boucle ouverte réduit la friction mentale et libère de l’attention.","organize"],
      ["Préparer ton environnement pour demain","10 min","organization","Rendre la prochaine action évidente augmente les chances de la faire.","organize"],
      ["Faire une action que tu repousses","15 min","discipline","Une petite victoire sur l’évitement travaille directement la capacité d’agir.","practice"]
    ],
    social:[
      ["Proposer un vrai moment à quelqu’un","10 min","social","Les relations se construisent davantage par des interactions réelles que par leur simple intention.","connect"],
      ["Appeler quelqu’un 10 minutes","10 min","social","Un échange court mais réel peut entretenir une relation sans demander une grosse disponibilité.","connect"]
    ],
    recovery:[
      ["20 min sans stimulation","20 min","recovery","Ton système a aussi besoin de périodes où il n’a rien à produire.","recover"],
      ["Faire une vraie pause dehors","15 min","recovery","Une coupure nette aide à séparer deux périodes de la journée.","recover"],
      ["Préparer une descente calme ce soir","15 min","recovery","La récupération commence avant le moment où tu essaies de dormir.","recover"]
    ],
    curiosity:[
      ["Découvrir quelque chose hors de ton domaine","20 min","curiosity","Sortir ponctuellement de tes habitudes nourrit la curiosité et crée de nouvelles connexions.","explore"],
      ["Créer quelque chose sans objectif","20 min","curiosity","Créer sans chercher la performance entretient l’exploration et l’initiative.","create"]
    ]
  };
  function init(){
    state.improvementLog=Array.isArray(state.improvementLog)?state.improvementLog:[];
    state.opportunities=Array.isArray(state.opportunities)?state.opportunities:[];
    // Convert the old automatic adaptive quests into suggestions once, so the user validates them.
    const old=(state.custom||[]).filter(x=>x.generatedDay===key());
    if(old.length){
      old.forEach(q=>{
        if(!state.opportunities.some(o=>o.sourceId===q.id)) state.opportunities.push({
          id:"opp-"+q.id,sourceId:q.id,date:key(),title:q.name,desc:q.desc,time:q.time,stat:q.stat||"discipline",
          minutes:20,xp:q.xp||10,kind:"adaptive",reason:"Le système a repéré ce domaine comme une opportunité aujourd’hui.",status:"pending"
        });
      });
      state.custom=(state.custom||[]).filter(x=>x.generatedDay!==key());
    }
    prune();
    ensureOpportunities();
    injectUI();
    render();
    if(typeof save==="function")save();
  }
  function prune(){
    state.opportunities=state.opportunities.filter(o=>o.date===key() || o.status==="accepted" || o.status==="completed");
    state.improvementLog=state.improvementLog.slice(-80);
  }
  function scoreDomain(k){
    const s=Number(state.stats?.[k]??50);
    const recent=state.history?.filter(x=>x.type==="complete"&&x.date&&Date.now()-new Date(x.date).getTime()<7*86400000) || [];
    const done=recent.filter(x=>x.task&&String(x.task).toLowerCase().includes(k)).length;
    return s - done*2;
  }
  function recentTitles(){
    return new Set(state.improvementLog.filter(x=>x.date&&Date.now()-new Date(x.date).getTime()<10*86400000).map(x=>x.title));
  }
  function ensureOpportunities(){
    const existing=state.opportunities.filter(o=>o.date===key()&&o.status==="pending");
    if(existing.length>=3)return;
    const energy=Number(state.energy)||7, mood=Number(state.mood)||7;
    let domains=["knowledge","discipline","curiosity","social","fitness","recovery"];
    domains.sort((a,b)=>scoreDomain(a)-scoreDomain(b));
    if(energy<=3) domains=["recovery","organization","knowledge","social"];
    const seen=recentTitles();
    const candidates=[];
    domains.forEach(d=>(ideas[d]||[]).forEach(x=>{
      if(!seen.has(x[0])&&!candidates.some(c=>c.title===x[0]))candidates.push({domain:d,x});
    }));
    candidates.slice(0,3-existing.length).forEach((c,i)=>{
      const x=c.x;
      state.opportunities.push({
        id:"opp-"+key()+"-"+Date.now()+"-"+i,date:key(),title:x[0],timeEstimate:x[1],minutes:parseInt(x[1])||15,
        stat:x[2],cat:capLabels[x[2]]||"PROGRESSION",desc:x[0],reason:x[3],kind:x[4],xp:Math.max(8,Math.min(30,Math.round((Number(state.stats?.[x[2]])<35?22:15)))),
        status:"pending"
      });
    });
  }
  function accept(id){
    const o=state.opportunities.find(x=>x.id===id);if(!o)return;
    const t=tasks().find(q=>!state.done.includes(q.id)&&q.cat!=="FIXE"&&q.stat===o.stat);
    let time=o.time;
    if(!/^\d{2}:\d{2}$/.test(time||"")){
      const n=currentMinutes()+30; time=fmtTime(n);
    }
    state.custom.push({id:"improve-"+Date.now(),time,name:o.title,cat:o.cat||"PROGRESSION",desc:o.reason,xp:o.xp,stat:o.stat,improvementId:o.id});
    o.status="accepted";o.acceptedAt=new Date().toISOString();
    state.improvementLog.push({id:o.id,date:new Date().toISOString(),title:o.title,stat:o.stat,status:"accepted"});
    save();toast("✦ AJOUTÉ À TA JOURNÉE");render();renderAll();
  }
  function dismiss(id){
    const o=state.opportunities.find(x=>x.id===id);if(!o)return;
    o.status="dismissed";
    state.improvementLog.push({id:o.id,date:new Date().toISOString(),title:o.title,stat:o.stat,status:"dismissed"});
    save();ensureOpportunities();render();toast("Proposition retirée");
  }
  function why(id){
    const o=state.opportunities.find(x=>x.id===id);if(!o)return;
    showModal('<div class="improve-modal"><span class="eyebrow">POURQUOI MAINTENANT</span><h3>'+esc(o.title)+'</h3><p>'+esc(o.reason)+'</p><div class="improve-meta"><b>'+esc(capIcons[o.stat]||"✦")+' '+esc(capLabels[o.stat]||"PROGRESSION")+'</b><span>'+esc(o.timeEstimate||"15 min")+'</span><span>+'+o.xp+' XP</span></div><button class="primary" onclick="closeModal()">Compris</button></div>');
  }
  function card(o){
    return '<div class="improvement-card"><div class="improvement-top"><span class="improvement-icon">'+esc(capIcons[o.stat]||"✦")+'</span><div><span class="eyebrow">OPPORTUNITÉ · '+esc(capLabels[o.stat]||"PROGRESSION")+'</span><h3>'+esc(o.title)+'</h3></div></div><p>'+esc(o.reason)+'</p><div class="improvement-foot"><span>⏱ '+esc(o.timeEstimate||"15 min")+' · +'+o.xp+' XP</span><div><button class="ghost" onclick="improvementWhy(\''+o.id+'\')">Pourquoi ?</button><button class="secondary" onclick="dismissImprovement(\''+o.id+'\')">Pas maintenant</button><button class="primary" onclick="acceptImprovement(\''+o.id+'\')">Ajouter</button></div></div></div>';
  }
  function injectUI(){
    if(document.getElementById("improvementSection"))return;
    const home=document.getElementById("home");
    const ctx=document.getElementById("dayContext");
    if(!home||!ctx)return;
    const sec=document.createElement("section");sec.id="improvementSection";sec.className="improvement-section";
    sec.innerHTML='<div class="section-head"><div><span class="eyebrow">ÉVOLUTION ACTIVE</span><h2>Le système a repéré ça pour toi</h2></div><span class="improvement-count" id="improvementCount"></span></div><div id="improvementList"></div><button class="wide secondary" id="refreshIdeas">↻ Chercher d’autres opportunités</button>';
    ctx.insertAdjacentElement("afterend",sec);
    document.getElementById("refreshIdeas").onclick=()=>{state.opportunities.filter(o=>o.date===key()&&o.status==="pending").forEach(o=>o.status="dismissed");ensureOpportunities();save();render()};
  }
  function render(){
    const box=document.getElementById("improvementList");if(!box)return;
    ensureOpportunities();
    const list=state.opportunities.filter(o=>o.date===key()&&o.status==="pending").slice(0,3);
    const count=document.getElementById("improvementCount");if(count)count.textContent=list.length+" À EXPLORER";
    box.innerHTML=list.length?list.map(card).join(""):'<div class="improvement-empty">Aucune proposition en attente. Le système continuera à chercher de nouvelles pistes.</div>';
  }
  window.acceptImprovement=accept;window.dismissImprovement=dismiss;window.improvementWhy=why;
  window.MY_SYSTEM_IMPROVEMENT_ENGINE={refresh:()=>{ensureOpportunities();render();save()}};
  // Make proactive improvement visible without taking over the user's planning.
  document.addEventListener("DOMContentLoaded",init);
  setTimeout(init,50);
})();