/* NEW ERIDU // ANDERUS 5.0 - mobile first / independent shell */
(function(){
"use strict";
const root=document.createElement("div");root.id="and-v5";document.body.appendChild(root);document.body.classList.add("and-v5-mode");
const state={page:"home",type:"agents",id:"",sub:"overview",query:"",element:"",role:"",rarity:"",onlyOwned:false,lesson:"intro",feedFilter:"all",edit:"Phoenix",mode:"deadly"};
let enc={agents:{}},loc={engines:{},discs:{},agents:{}},feed={entries:[]};
const esc=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tr=x=>(loc.engines&&loc.engines[x])||(loc.discs&&loc.discs[x])||(loc.agents&&loc.agents[x])||x;
const findAgent=n=>DB.agents.find(a=>a.name===n);
const findEngine=n=>DB.engines.find(a=>a.name===n);
const findDisc=n=>DB.discs.find(a=>a.name===n);
const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat("pt-BR",{maximumFractionDigits:1}).format(n):"—";
const num=n=>Number(String(n||"").replace(",","."));
const parseName=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const nice=x=>tr(x);
function svg(name,size=20){
 const paths={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 learn:'<path d="M12 7v14M3 18V5a2 2 0 0 1 2-2h4a3 3 0 0 1 3 3v15M21 18V5a2 2 0 0 0-2-2h-4a3 3 0 0 0-3 3"/>',
 agents:'<path d="m12 2 7.5 4.3v8.9L12 19.5l-7.5-4.3V6.3z"/><path d="M8 22h8M8 10h8"/>',
 account:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 radar:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
 search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
 right:'<path d="m9 18 6-6-6-6"/>',
 back:'<path d="m15 18-6-6 6-6"/>',
 sword:'<path d="M4 4l16 16M20 4 4 20M13 7l4-4 4 4-4 4M4 13l-1 4 4 4 4-4"/>',
 shield:'<path d="m12 2 9 4v6c0 5.8-4 8.7-9 10-5-1.3-9-4.2-9-10V6z"/><path d="m8 12 3 3 5-6"/>',
 spark:'<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/>',
 sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5"/><circle cx="16" cy="17" r="2.5"/>',
 check:'<circle cx="12" cy="12" r="10"/><path d="m7 12 3 3 7-7"/>',
 alert:'<path d="m12 3 10 18H2z"/><path d="M12 9v5m0 3v.01"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
 refresh:'<path d="M20 11a8 8 0 1 0-2 6M20 5v6h-6"/>',
 layers:'<path d="m12 2 9 5-9 5-9-5 9-5zm-9 10 9 5 9-5M3 17l9 5 9-5"/>'
 };
 return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.spark)+'</svg>';
}
const portrait=a=>a?'assets/portraits/'+a.id+'.webp':'assets/icon-192.png';
const engineImg=e=>e?'assets/engines/'+e.id+'.webp':'assets/icon-192.png';
const discImg=d=>d?'assets/discs/'+d.id+'.webp':'assets/icon-192.png';
const mark=a=>a.beta?'BETA · PROVISÓRIO':a.upcoming?'ANUNCIADO':a.rank==='I'?'ESPECIAL':'RANK '+a.rank;
const theme=(a)=>a.beta?'beta':a.upcoming?'upcoming':'official';
const moneyBrand='<span class="v5-mark">Z</span>';
const topbar=()=>'<header class="v5-top"><button class="v5-logo" data-v5="go" data-to="home" aria-label="Início">'+moneyBrand+'<span>NEW ERIDU <em>// ANDERUS</em><small>GUIA PERSONALIZADO DE ZENLESS ZONE ZERO</small></span></button><button class="v5-top-account" data-v5="go" data-to="account">MINHA CONTA '+svg("right",13)+'</button></header>';
const navs=[["home","Início","home"],["learn","Aprender","learn"],["encyclopedia","Agentes","agents"],["account","Conta","account"],["radar","Radar","radar"]];
function bottom(){
 return '<nav class="v5-bottom" aria-label="Navegação principal">'+navs.map(([id,t,ic])=>'<button data-v5="go" data-to="'+id+'" class="'+(state.page===id?"selected":"")+'">'+svg(ic,23)+'<span>'+t+'</span></button>').join("")+'</nav>';
}
function frame(body){
 root.innerHTML='<div class="v5-noise"></div><div class="v5-site">'+topbar()+'<main class="v5-main" id="v5-main">'+body+'</main>'+bottom()+'</div>';
}
function go(page,opts={}){
 history.replaceState({...state,__v5:true,scroll:window.scrollY},"");
 const next={...state,page,query:"",element:"",role:"",rarity:"",onlyOwned:false,...opts};
 Object.assign(state,next);history.pushState({...state,__v5:true,scroll:0},"","#and-v5/"+page+(state.id?"/"+state.id:""));
 draw();window.scrollTo(0,0);
}
function ago(){if(history.state&&history.state.__v5)history.back();else go("home");}
window.addEventListener("popstate",ev=>{
 const v=ev.state;
 if(!v||!v.__v5)return;
 Object.assign(state,v);draw();
 requestAnimationFrame(()=>window.scrollTo(0,v.scroll||0));
});
const title=(eyebrow,heading,desc)=>'<div class="v5-heading"><div><span class="v5-eyebrow">'+eyebrow+'</span><h1>'+heading+'</h1><p>'+desc+'</p></div></div>';
function home(){
 const names=Object.keys(account.saved).filter(n=>findAgent(n)),recent=feed.entries||[];
 const art=DB.agents.find(a=>a.name==="Phoenix")||DB.agents[0];
 const banners=[
 ['learn','COMECE PELO BÁSICO','Fundamentos, combate, atributos e progressão','learn'],
 ['encyclopedia','ENCICLOPÉDIA','Agentes, motores-W, discos e equipes','layers'],
 ['account','CONTA DO ANDERUS','Elenco, builds, equipamentos e prioridades','account'],
 ['endgame','ENDGAME','Defesa Shiyu, Investida Mortal e mais','sword'],
 ];
 return '<div class="v5-home"><section class="v5-hero"><div class="v5-stamps"><span class="v5-sticker">VERSÃO 3.3</span><span class="v5-stamp-line">ZZZ // ARQUIVO PESSOAL</span></div><div class="v5-hero-city"></div><h1>BEM-VINDO,<br><em>PROXY</em><b>↗</b></h1><p>Tudo sobre Nova Eridu. Do primeiro combate até sua estratégia de endgame.</p></section>'+
 '<div class="v5-search-wrap"><label class="v5-search">'+svg("search",20)+'<input id="v5-global-search" placeholder="Buscar agente, motor, disco, guia..." autocomplete="off"></label><button class="v5-search-btn" data-v5="go" data-to="encyclopedia" aria-label="Ver enciclopédia">'+svg("sliders")+'</button></div>'+
 '<div class="v5-quick">'+banners.map(([p,h,d,icon],i)=>'<button class="v5-quick-card v5-quick-'+i+'" data-v5="go" data-to="'+p+'">'+svg(icon,28)+'<strong>'+h+'</strong><small>'+d+'</small><span class="v5-quick-arrow">'+svg("right",16)+'</span></button>').join("")+'</div>'+
 '<button class="v5-radar-banner" data-v5="go" data-to="radar">'+svg("radar",30)+'<span><strong>RADAR DE ATUALIZAÇÕES</strong><small>Oficial, beta, mudanças no site e comparações</small></span>'+svg("right",18)+'</button>'+
 '<section class="v5-account-teaser"><div class="v5-sectionline"><span>'+svg("layers",16)+' PRÉVIA DA SUA CONTA</span><button data-v5="go" data-to="account">VER ANÁLISE '+svg("arrow",16)+'</button></div><div class="v5-previewrow"><div class="v5-avatars">'+names.slice(0,4).map(n=>'<img alt="'+esc(n)+'" src="'+portrait(findAgent(n))+'">').join("")+'</div><div class="v5-preview-state"><strong>'+names.length+' AGENTES</strong><span>'+Math.min(3,account.teams.length)+' EQUIPES PLANEJADAS</span></div></div><div class="v5-progress"><span>Inventário registrado</span><div><i style="width:'+Math.min(100,names.length/9*100)+'%"></i></div><b>'+names.length+'/9</b></div></section>'+
 '<section class="v5-highlight"><div class="v5-highlight-art"><img src="'+portrait(art)+'" alt="'+esc(art.name)+'"></div><div class="v5-highlight-copy"><span class="v5-pill">NOTÍCIAS & VERSÕES DE TESTE</span><h2>'+esc(recent.find(x=>x.kind==="beta")?.title||"BETA 3.4 EM ACOMPANHAMENTO")+'</h2><p>Compare o que foi divulgado com o que já entrou no guia.</p><button data-v5="go" data-to="radar">VER MUDANÇAS '+svg("arrow",17)+'</button></div></section><div class="v5-home-foot"><span>NEW ERIDU // ANDERUS</span><span>FEITO PARA VOCÊ, PROXY.</span></div></div>';
}
function listCatalog(){
 const arr=DB[state.type]||[];
 const normalized=x=>parseName(x);
 const needle=normalized(state.query);
 const entries=arr.filter(x=>(!needle||normalized([x.name,tr(x.name),x.role,x.element,x.summary,x.two,x.four].join(' ')).includes(needle))
 &&(!state.element||x.element===state.element)&&(!state.role||x.role===state.role)&&(!state.rarity||x.rank===state.rarity)
 &&(!state.onlyOwned||!!account.saved[x.name]));
 const typeName={agents:"AGENTES",engines:"MOTORES-W",discs:"DISCOS"}[state.type]||"CATÁLOGO";
 const typeOpts=[["agents","Agentes"],["engines","Motores-W"],["discs","Discos"]];
 const elems=state.type==="agents"?[...new Set(DB.agents.map(a=>a.element))]:[];
 const roles=state.type==="agents"?[...new Set(DB.agents.map(a=>a.role))]:state.type==="engines"?[...new Set(DB.engines.map(a=>a.role))]:[];
 return '<div class="v5-inner">'+title('ENCICLOPÉDIA // ARQUIVO 001','CONHEÇA TUDO<span class="v5-dot">.</span>','Catálogo visual de personagens e equipamentos, incluindo itens em teste identificados.')+
 '<div class="v5-segment">'+typeOpts.map(([id,n])=>'<button data-v5="type" data-type="'+id+'" class="'+(state.type===id?'on':'')+'">'+n+'</button>').join("")+'</div>'+
 '<label class="v5-search v5-catalog-search">'+svg("search",18)+'<input id="v5-catalog-search" placeholder="Pesquisar '+typeName.toLowerCase()+'..." value="'+esc(state.query)+'" autocomplete="off"></label>'+
 '<div class="v5-filters">'+(state.type==="agents"?'<select data-v5-select="rarity"><option value="">TODOS OS RANKS</option>'+[...new Set(arr.map(x=>x.rank))].map(x=>'<option '+(state.rarity===x?'selected':'')+' value="'+esc(x)+'">RANK '+x+'</option>').join("")+'</select>':'')+
 (elems.length?'<select data-v5-select="element"><option value="">TODOS OS ATRIBUTOS</option>'+elems.map(x=>'<option value="'+esc(x)+'" '+(state.element===x?'selected':'')+'>'+esc(x)+'</option>').join("")+'</select>':'')+
 (roles.length?'<select data-v5-select="role"><option value="">TODAS AS FUNÇÕES</option>'+roles.map(x=>'<option value="'+esc(x)+'" '+(state.role===x?'selected':'')+'>'+esc(x)+'</option>').join("")+'</select>':'')+
 (state.type==="agents"?'<label class="v5-own-only"><input data-v5-check="own" type="checkbox" '+(state.onlyOwned?'checked':'')+'> SÓ MEUS AGENTES</label>':'')+'</div>'+
 '<div class="v5-resultcount">'+entries.length+' '+typeName+' ENCONTRADOS</div>'+
 '<div id="v5-list" class="'+(state.type==="agents"?'v5-agent-grid':'v5-item-grid')+'">'+entries.map(a=>state.type==="agents"?agentTile(a):itemTile(a,state.type)).join("")+'</div></div>';
}
function agentTile(a){
 return '<button class="v5-agent-tile" data-v5="detail" data-type="agents" data-id="'+esc(a.id)+'"><div class="v5-agent-image"><img loading="lazy" src="'+portrait(a)+'" alt="'+esc(a.name)+'"><span class="v5-rank '+theme(a)+'">'+esc(a.rank)+'</span></div><div class="v5-agent-meta"><strong>'+esc(tr(a.name))+'</strong><small>'+esc(a.element)+' · '+esc(a.role)+'</small><span>'+mark(a)+' '+svg("arrow",14)+'</span></div></button>';
}
function itemTile(a,type){
 return '<button class="v5-item-tile" data-v5="detail" data-type="'+type+'" data-id="'+esc(a.id)+'"><img loading="lazy" src="'+(type==="engines"?engineImg(a):discImg(a))+'" alt="'+esc(a.name)+'"><span><small>'+esc(type==="engines"?a.role:"DISCO DE IMPULSO")+'</small><strong>'+esc(tr(a.name))+'</strong><i>VER DETALHES '+svg("arrow",13)+'</i></span></button>';
}
function details(){
 const type=state.type,list=DB[type]||[],a=list.find(x=>x.id===state.id);
 if(!a)return '<div class="v5-inner"><p>Ficha não encontrada.</p><button data-v5="back">VOLTAR</button></div>';
 if(type==="agents")return detailAgent(a);
 const isEngine=type==="engines";
 return '<div class="v5-inner">'+backline()+'<div class="v5-gear-hero"><img src="'+(isEngine?engineImg(a):discImg(a))+'" alt="'+esc(a.name)+'"><div><span class="v5-eyebrow">'+(isEngine?'MOTOR-W':'DISCO DE IMPULSO')+'</span><h1>'+esc(tr(a.name))+'</h1><p>'+esc(isEngine?a.role:'CONJUNTO DE DISCOS')+'</p></div></div><section class="v5-panel"><h2>COMO FUNCIONA</h2><p>'+esc(isEngine?a.summary:a.two)+'</p>'+(isEngine?'<div class="v5-note">O motor só ativa sua passiva em agentes da especialidade correspondente. Requisitos específicos de acerto, energia ou tempo também precisam ser cumpridos.</div>':'<h3>EFEITO COM 4 PEÇAS</h3><p>'+esc(a.four)+'</p>')+'</section><section class="v5-panel"><h2>AGENTES RELACIONADOS</h2><div class="v5-mini-grid">'+DB.agents.filter(q=>isEngine?q.engine===a.name:(q.disc===a.name||DB.deep[q.name]?.ideal4===a.name)).slice(0,8).map(q=>'<button data-v5="detail" data-type="agents" data-id="'+q.id+'"><img src="'+portrait(q)+'"><strong>'+esc(tr(q.name))+'</strong></button>').join("")+'</div></section></div>';
}
function backline(){return '<button class="v5-back" data-v5="back">'+svg("back",18)+' VOLTAR PARA ONDE PAREI</button>';}
const Tabs=[["overview","VISÃO GERAL"],["skills","HABILIDADES"],["mind","MINDSCAPES"],["build","BUILD"],["teams","EQUIPES"]];
function detailAgent(a){
 const data=enc.agents&&enc.agents[a.id]||{},deep=DB.deep[a.name]||{},owned=account.saved[a.name];
 const tab=state.sub||"overview";
 let content=tab==="overview"?agentOverview(a,deep,data):tab==="skills"?agentSkills(a,data):tab==="mind"?agentMind(a,data):tab==="build"?agentBuild(a,deep):agentTeams(a);
 return '<div class="v5-inner v5-detail">'+backline()+
 '<div class="v5-agent-head"><div class="v5-agent-pic"><img src="'+portrait(a)+'" alt="'+esc(a.name)+'"></div><div class="v5-agent-lead"><span class="v5-eyebrow">ARQUIVO DE AGENTE // '+esc(a.rank)+'</span><h1>'+esc(tr(a.name))+'</h1><div class="v5-tags"><span>'+esc(a.element)+'</span><span>'+esc(a.role)+'</span><span class="'+(a.beta?'v5-pink':'')+'">'+mark(a)+'</span></div><p>'+esc(deep.overview||a.summary)+'</p><button class="v5-button v5-button-yellow" data-v5="add-own" data-name="'+esc(a.name)+'">'+(owned?'EDITAR MINHA BUILD':'ADICIONAR À CONTA')+' '+svg("arrow",16)+'</button></div></div>'+
 (a.beta?'<div class="v5-beta-note">KIT EM TESTE: números, motores e recomendações podem mudar antes do lançamento.</div>':'')+
 '<div class="v5-tabscroll" role="tablist">'+Tabs.map(([id,n])=>'<button class="'+(tab===id?'on':'')+'" data-v5="sub" data-sub="'+id+'" role="tab" aria-selected="'+(tab===id)+'">'+n+'</button>').join("")+'</div>'+
 '<div id="v5-tabcontent">'+content+'</div></div>';
}
function agentOverview(a,deep,data){
 const steps=Array.isArray(deep.rotation)?deep.rotation:[a.how,"Prepare os efeitos dos suportes e confira o requisito adicional.","Entregue a janela de dano ao personagem principal."];
 return '<section class="v5-panel"><span class="v5-eyebrow">01 / COMO ELE FUNCIONA</span><h2>PAPEL NO COMBATE</h2><p>'+esc(deep.overview||a.summary)+'</p><p>'+esc(a.how)+'</p><div class="v5-info-strip"><div><b>'+esc(a.role)+'</b><small>FUNÇÃO</small></div><div><b>'+esc(a.element)+'</b><small>ATRIBUTO</small></div><div><b>'+esc(a.rank)+'</b><small>RARIDADE</small></div></div></section>'+
 '<section class="v5-panel"><span class="v5-eyebrow">02 / PASSO A PASSO</span><h2>ROTAÇÃO EXPLICADA</h2><ol class="v5-steps">'+steps.map((x,i)=>'<li><b>'+String(i+1).padStart(2,"0")+'</b><span>'+esc(x)+'</span></li>').join("")+'</ol></section>'+
 '<section class="v5-panel"><span class="v5-eyebrow">03 / DADOS DE REFERÊNCIA</span><h2>ESTATÍSTICAS BASE · NV. 60</h2><div class="v5-statgrid">'+Object.entries(data.stats||{}).map(([k,v])=>'<div><span>'+esc(k)+'</span><strong>'+esc(v.lv60)+'</strong></div>').join("")+'</div><div class="v5-note">Valores básicos de referência. Os atributos finais da sua conta incluem motores, discos, bônus, efeitos de combate e outros modificadores.</div></section>';
}
function agentSkills(a,data){
 if(a.beta)return '<section class="v5-panel"><h2>HABILIDADES NO BETA</h2><p>O kit ainda está em testes. O guia não exibirá multiplicadores provisórios como definitivos. As mudanças confirmadas entram no Radar com indicação da revisão.</p></section>';
 const list=data.habilidades||[];
 return '<div class="v5-section-intro"><span class="v5-eyebrow">DADOS TÉCNICOS // NV. CONSULTADO</span><h2>KIT DE HABILIDADES</h2><p>Abra cada habilidade para ver os valores de dano e atordoamento registrados. Os números não equivalem ao dano final nem representam todos os níveis automaticamente.</p></div>'+
 (list.length?list.map((skill,i)=>'<details class="v5-skill" '+(i===0?'open':'')+'><summary><span class="v5-skill-id">'+String(i+1).padStart(2,"0")+'</span><strong>'+esc(skill.nome)+'</strong><small>'+((skill.numeros||[]).length)+' PARÂMETROS</small></summary><div class="v5-skill-body"><p>Habilidade da especialidade '+esc(a.role)+'. Os multiplicadores abaixo se referem ao nível '+esc(skill.nivel||"consultado")+'. A ativação depende do movimento e dos requisitos do personagem.</p><div class="v5-numbergrid">'+(skill.numeros||[]).map(x=>'<div><span>'+esc(x.metrica)+'</span><b>'+esc(x.valor)+'</b></div>').join("")+'</div></div></details>').join(""):'<div class="v5-note">Os números dessa habilidade não estão completos na base consultada. Não foram estimados.</div>')+
 '<section class="v5-panel"><h2>COMO INTERPRETAR OS MULTIPLICADORES?</h2><p><b>Dano:</b> percentual que participa do cálculo do golpe. <b>Atordoamento:</b> parcela de Daze produzida pelo movimento. <b>Níveis:</b> escalonamentos podem variar, inclusive com M3 e M5. <b>Passivas:</b> exigem as condições do kit, que podem envolver atributos, função ou tipos de aliados.</p></section>';
}
function agentMind(a,data){
 const points=data.mindscapes||[];
 const rec=a.role==="Suporte"?"M0 como ponto de partida; M1/M2 dependem da janela de buff e do custo.":a.role==="Anomalia"?"M0 funcional; M1/M2 podem melhorar aplicação ou dano, mas é preciso avaliar rotações e recursos.":"M0 funcional; compare M1/M2 com a melhoria de motor e equipamentos antes de gastar mais.";
 return '<div class="v5-section-intro"><span class="v5-eyebrow">CINEMA MENTAL · M0 A M6</span><h2>MINDSCAPE CINEMA</h2><p>As seis cópias adicionais aprimoram o agente. Abaixo estão os nomes, dados numéricos identificados e minha leitura estratégica de cada nível.</p><div class="v5-note">Recomendação inicial: '+esc(rec)+' O efeito descrito é uma explicação técnica resumida, não uma transcrição integral da descrição do jogo.</div></div>'+
 Array.from({length:6},(_,i)=>{const n=i+1,v=points.find(m=>m.nivel===n),owned=(account.saved[a.name]&&Number(account.saved[a.name].mindscape||0)>=n);
 const status=a.beta?"BETA · NÃO CONFIRMADO":v?.verificado?"DADOS IDENTIFICADOS":"PENDENTE DE CONFERÊNCIA";
 const note=n===3||n===5?"Melhoria de níveis de habilidades. Seu valor depende do peso dessas habilidades na rotação.":n===6?"Investimento elevado; avaliar somente após comparar com ampliação de elenco e equipes.":n===1||n===2?"Marco potencial para avaliar custo-benefício. O retorno depende das regras e do time.":"Revisar se altera o dano da equipe inteira ou apenas o dano individual.";
 return '<article class="v5-mind"><header><span class="v5-mindex '+(owned?"owned":"")+'">M'+n+'</span><div><small>'+status+'</small><h3>'+esc(v?.nome||"EFEITO NÃO VERIFICADO")+'</h3></div><span class="v5-mindown">'+(owned?'✓ OBTIDO':'')+'</span></header><div class="v5-mind-body"><p>'+esc(v?.resumo||"Sem efeito confiável publicado. Nada foi inventado.")+'</p>'+(v?.dados?.length?'<div class="v5-mvalues"><small>NÚMEROS CITADOS NO EFEITO</small>'+v.dados.slice(0,12).map(x=>'<span>'+esc(x)+'</span>').join("")+'</div>':'')+(v?.mecanicas?.length?'<div class="v5-mtags">'+v.mecanicas.map(x=>'<span>'+esc(x)+'</span>').join("")+'</div>':'')+'<div class="v5-myview"><b>MINHA ANÁLISE</b><p>'+esc(note)+'</p></div></div></article>';
 }).join(""));
}
function gearCard(x,type,labelTxt){
 if(!x)return '';
 return '<button class="v5-gear" data-v5="detail" data-type="'+type+'" data-id="'+esc(x.id)+'"><img src="'+(type==="engines"?engineImg(x):discImg(x))+'" alt="'+esc(x.name)+'"><span><small>'+labelTxt+'</small><strong>'+esc(tr(x.name))+'</strong><i>VER FICHA '+svg("arrow",13)+'</i></span></button>';
}
function agentBuild(a,deep){
 const x=findEngine(a.engine),d=findDisc(deep.ideal4||a.disc),d2=findDisc(deep.ideal2);
 const mains=deep.mains||[];
 return '<section class="v5-panel"><span class="v5-eyebrow">ARQUIVO DE EQUIPAMENTOS</span><h2>BUILD RECOMENDADA</h2><p>'+esc(deep.overview||a.summary)+'</p><div class="v5-gearcards">'+gearCard(x,"engines","MOTOR-W ASSINATURA")+gearCard(d,"discs","CONJUNTO 4 PEÇAS")+gearCard(d2,"discs","CONJUNTO 2 PEÇAS")+'</div></section>'+
 '<section class="v5-panel"><h2>ATRIBUTOS PRINCIPAIS</h2><div class="v5-statsteps">'+mains.map(v=>'<div>'+esc(v)+'</div>').join("")+'</div><h3>COMO PRIORIZAR</h3><p>'+esc(deep.subs||ROLE_DEFAULTS[a.role]?.sub||"O atributo de escala do kit determina a build.")+'</p><div class="v5-note">Builds são recomendações e não garantias. O motor equipado, Mindscapes e companheiros podem alterar as metas ideais.</div></section>';
}
function agentTeams(a){
 const ts=String(a.teams||"").split(" / ").filter(Boolean).map(t=>t.split(",").map(x=>x.trim()));
 return '<div class="v5-section-intro"><h2>EQUIPES E SINERGIAS</h2><p>Exemplos de composições e condições adicionais. Os membros cadastrados na sua conta são destacados.</p></div>'+
 ts.map((members,i)=>'<section class="v5-panel"><span class="v5-eyebrow">COMPOSIÇÃO '+String(i+1).padStart(2,"0")+'</span><div class="v5-teamline">'+members.map(n=>{const x=findAgent(n);return x?'<button data-v5="detail" data-type="agents" data-id="'+x.id+'"><img src="'+portrait(x)+'"><b>'+esc(tr(x.name))+'</b><small>'+esc(x.role)+'</small>'+(account.saved[x.name]?'<em>NA SUA CONTA</em>':'')+'</button>':'<div>'+esc(n)+'</div>';}).join("")+'</div><div class="v5-note">A sinergia final depende de habilidades adicionais, status, motores e do inimigo. Isso não constitui uma garantia de desempenho.</div></section>').join("");
}
const mindModes=[
 ['deadly','INVESTIDA MORTAL','Três confrontos e equipes diferentes. Foco em pontuação, execução e profundidade de elenco.',3,'A cada rotação, conferir chefes, desafios específicos e bônus disponíveis.'],
 ['shiyu','DEFESA SHIYU','Desafios de tempo e dano; alguns andares exigem equipes distintas.',2,'Antes de investir, confira fraquezas, resistências e bônus da fase.'],
 ['hollow','ESFERA ZERO','Exploração, rotas e recompensas semanais. A composição e os sistemas próprios mudam a avaliação.',1,'Considere bônus da exploração e mecânicas específicas.'],
 ['matrix','MATRIZ DE OPERAÇÕES','Ambientes e condições de combate variáveis em Esfera Zero.',1,'Mecânicas próprias mudam o peso dos atributos.'],
 ['trial','PROVAÇÃO DE COMBATE','Escalada de dificuldade por andares; progressão e execução contam muito.',1,'Equipe adequada não substitui dominar esquivas e ataques dos inimigos.'],
 ['threshold','SIMULAÇÃO DE LIMITE','Desafios avançados com progresso, pontuações e regras especiais.',1,'Acesse o modo quando os requisitos de progressão estiverem cumpridos.'],
 ['annihilation','SIMULACRO DA ANIQUILAÇÃO','Combates avançados associados à progressão da temporada.',1,'Avaliar chefes, modificadores e requisitos antes de comparar times.'],
 ['labyrinth','ENIGMA DO LABIRINTO','Progressão e desafios sazonais; atributos não determinam sozinhos o resultado.',1,'Considere sistemas da temporada, recursos e mecânicas de cada caminho.'],
];
function readyTeam(team){
 const owned=team.filter(n=>n&&account.saved[n]);
 const lv=owned.length?owned.map(n=>Number(account.saved[n].level||1)).reduce((a,b)=>a+b,0)/owned.length:0;
 const withCompatible=owned.filter(n=>{const b=account.saved[n],a=findAgent(n),w=findEngine(b.engine);return a&&w&&a.role===w.role}).length;
 const disco=owned.filter(n=>{const b=account.saved[n];return(b.slots||[]).filter(x=>x.set).length>=4}).length;
 const full=owned.length===3;let status=!full?"INCOMPLETA":lv<50?"EM DESENVOLVIMENTO":lv<58||withCompatible<3||disco<3?"PRECISA DE AJUSTES":"BASE ESTRUTURAL FORTE";
 const cls=!full?"low":status==="BASE ESTRUTURAL FORTE"?"good":"warn";
 return {owned,lv,withCompatible,disco,full,status,cls,reason:!full?"Complete três agentes distintos.":lv<50?"Eleve níveis antes de avaliar metas avançadas.":withCompatible<3?"Revise a especialidade dos motores.":disco<3?"Equipe mais discos e confira conjuntos 4+2.":"Verifique inimigos, bônus e execução; isto não garante estrelas."};
}
function endgame(){
 const m=mindModes.find(x=>x[0]===state.mode)||mindModes[0];
 const uniq=Object.keys(account.saved).filter(x=>findAgent(x));const enough=uniq.length>=m[3]*3;
 const teams=account.teams.slice(0,m[3]).map(x=>x||[]);
 const pool=account.teams.flat().filter(Boolean);
 const anyDuplicates=pool.filter((n,i)=>pool.indexOf(n)!==i);
 return '<div class="v5-inner">'+title('LABORATÓRIO // ENDGAME','VOCÊ ESTÁ PRONTO<span class="v5-dot">?</span>','Veja sua preparação para os modos difíceis, com base nos dados que cadastrou.')+
 '<div class="v5-mode-nav">'+mindModes.map(x=>'<button class="'+(state.mode===x[0]?'on':'')+'" data-v5="mode" data-id="'+x[0]+'">'+x[1]+'</button>').join("")+'</div>'+
 '<section class="v5-panel v5-mode-panel"><div class="v5-eyebrow">ANÁLISE DE PREPARAÇÃO</div><h2>'+m[1]+'</h2><p>'+m[2]+'</p><div class="v5-info-strip"><div><b>'+m[3]+'</b><small>EQUIPE(S) DE REFERÊNCIA</small></div><div><b>'+uniq.length+'</b><small>AGENTES REGISTRADOS</small></div><div><b class="'+(enough?'v5-green':'v5-amber')+'">'+(enough?'ELENCO SUFICIENTE':'ELENCO CURTO')+'</b><small>PARA TIMES DISTINTOS</small></div></div><p class="v5-small">'+m[4]+'</p></section>'+
 teams.map((team,i)=>{const st=readyTeam(team);return '<section class="v5-panel"><div class="v5-rowbetween"><h3>EQUIPE '+(i+1)+'</h3><span class="v5-level '+st.cls+'">'+st.status+'</span></div><div class="v5-endteam">'+team.map(n=>{const a=findAgent(n);return a?'<div><img src="'+portrait(a)+'"><strong>'+esc(tr(a.name))+'</strong></div>':'<div class="v5-emptychar"><span>+</span><small>AGENTE</small></div>';}).join("")+'</div><p>'+esc(st.reason)+'</p><div class="v5-readfacts">NÍVEL MÉDIO <b>'+fmt(st.lv)+'</b> · MOTORES COMPATÍVEIS <b>'+st.withCompatible+'/'+st.owned.length+'</b> · DISCOS EQUIPADOS <b>'+st.disco+'/'+st.owned.length+'</b></div></section>';}).join("")+
 (anyDuplicates.length&&m[3]>1?'<div class="v5-warning">ATENÇÃO: algumas equipes repetem agentes. Investida Mortal exige elencos distintos por chefe.</div>':'')+
 '<section class="v5-panel"><h2>O QUE MELHORAR PRIMEIRO</h2><ol class="v5-priority">'+(uniq.length<m[3]*3?'<li>Você tem '+uniq.length+' agentes registrados; para '+m[3]+' equipes de três, planeje '+m[3]*3+' integrantes distintos. Isso não significa que todos precisam ser de raridade S.</li>':'')+'<li>Priorize agentes no nível 60, talentos centrais e motores da especialidade correta.</li><li>Monte conjuntos de disco coerentes e meça os atributos em combate quando houver buffs.</li><li>Confira a rotação, o bônus do ciclo e a fraqueza do chefe antes de investir em outro personagem.</li></ol><button class="v5-button v5-button-yellow" data-v5="go" data-to="account">EDITAR SUAS EQUIPES '+svg("arrow",15)+'</button></section>'+
 '<div class="v5-note">Esta análise verifica estrutura da conta. Sem resultados de combate, dados do inimigo e cálculos completos de dano, não é possível prever estrelas ou garantir aprovação do desafio.</div></div>';
}
function accountScreen(){
 const list=Object.keys(account.saved).filter(x=>findAgent(x));
 const names=DB.agents.filter(a=>!a.beta&&!a.upcoming&&!account.saved[a.name]);
 const selected=findAgent(state.edit)||findAgent(list[0]);
 const b=selected?account.saved[selected.name]:null;
 const statkeys=[["atk","ATQ"],["hp","PV"],["def","DEF"],["crit","Taxa CRIT (%)"],["cdmg","Dano CRIT (%)"],["proficiency","Proficiência de Anomalia"],["mastery","Maestria de Anomalia"],["pen","Perfuração"],["impact","Impacto"],["energy","Recuperação de Energia"]];
 const compatible=selected?DB.engines.filter(w=>w.role===selected.role):[];
 return '<div class="v5-inner v5-account">'+title('PAINEL PESSOAL // ANDERUS','MINHA CONTA<span class="v5-dot">.</span>','Organize personagens, equipamentos, status, equipes e investimentos. Os dados permanecem neste navegador.')+
 '<section class="v5-profile-bar"><div class="v5-info-strip"><div><b>'+list.length+'</b><small>AGENTES</small></div><div><b>'+account.teams.length+'</b><small>EQUIPES</small></div><div><b>LOCAL</b><small>ARMAZENAMENTO</small></div></div><div class="v5-backup"><button data-v5="backup">EXPORTAR BACKUP</button><button data-v5="import">IMPORTAR</button><input type="file" id="v5-backup-input" accept="application/json,.json" hidden></div></section>'+
 '<div class="v5-account-layout"><aside class="v5-roster"><div class="v5-rowbetween"><strong>MEUS AGENTES</strong><span>'+list.length+'</span></div><div class="v5-roster-list">'+list.map(n=>{const a=findAgent(n);return '<button class="'+(selected&&selected.name===n?'on':'')+'" data-v5="edit" data-name="'+esc(n)+'"><img src="'+portrait(a)+'"><span><b>'+esc(tr(n))+'</b><small>NV. '+esc(account.saved[n].level)+' · M'+esc(account.saved[n].mindscape)+'</small></span>'+svg("right",14)+'</button>';}).join("")+'</div><select id="v5-add-agent"><option value="">+ ADICIONAR PERSONAGEM</option>'+names.map(a=>'<option value="'+esc(a.name)+'">'+esc(tr(a.name))+'</option>').join("")+'</select><button data-v5="add-selected" class="v5-button v5-button-yellow">ADICIONAR À CONTA</button></aside>'+
 '<div class="v5-editor">'+(selected&&b?'<div class="v5-edit-head"><img src="'+portrait(selected)+'"><div><span class="v5-eyebrow">EDITANDO AGENTE</span><h2>'+esc(tr(selected.name))+'</h2><small>'+esc(selected.element)+' · '+esc(selected.role)+'</small></div><button data-v5="detail" data-type="agents" data-id="'+selected.id+'">'+svg("right",18)+'</button></div>'+
 '<div class="v5-fields v5-fields-3">'+field("level","NÍVEL",b.level,"number",1,60)+field("mindscape","MINDSCAPE M0-M6",b.mindscape,"number",0,6)+'<label>HABILIDADE CENTRAL<select data-v5-build="core">'+["A","B","C","D","E","F"].map(x=>'<option '+(x===b.core?'selected':'')+'>'+x+'</option>').join("")+'</select></label></div>'+
 '<div class="v5-editor-section"><span class="v5-eyebrow">01 / ARMA</span><h3>MOTOR-W EQUIPADO</h3><div class="v5-gear-select"><img id="v5-equipped-engine" src="'+engineImg(findEngine(b.engine))+'" alt=""><select data-v5-build="engine"><option value="">NENHUM MOTOR</option>'+compatible.map(w=>'<option value="'+esc(w.name)+'" '+(b.engine===w.name?'selected':'')+'>'+esc(tr(w.name))+'</option>').join("")+'</select></div><div class="v5-fields v5-fields-2">'+field("engineLevel","NÍVEL DO MOTOR",b.engineLevel,"number",1,60)+field("engineRank","REFINAMENTO (1–5)",b.engineRank,"number",1,5)+'</div><p class="v5-small">A foto acompanha o motor selecionado. Apenas motores da função compatível aparecem por padrão.</p></div>'+
 '<div class="v5-editor-section"><span class="v5-eyebrow">02 / ESTATÍSTICAS</span><h3>ATRIBUTOS DA SUA BUILD</h3><div class="v5-fields v5-fields-2">'+statkeys.map(([k,n])=>field("stats."+k,n,b.stats?.[k]||"","text")).join("")+'</div></div>'+
 '<div class="v5-editor-section"><span class="v5-eyebrow">03 / HABILIDADES</span><h3>NÍVEL DAS HABILIDADES</h3><div class="v5-fields v5-fields-3">'+[["basic","ATAQUE BÁSICO"],["dodge","ESQUIVA"],["special","ESPECIAL"],["chain","CADEIA"],["assist","ASSISTÊNCIA"]].map(([k,n])=>'<label>'+n+'<input type="number" min="1" max="16" data-v5-skill="'+k+'" value="'+esc(b.skillLevels?.[k]||1)+'"></label>').join("")+'</div></div>'+
 '<div class="v5-editor-section"><span class="v5-eyebrow">04 / EQUIPAMENTO</span><h3>SEIS DISCOS DE IMPULSO</h3><div class="v5-discslots">'+(b.slots||[]).map((slot,i)=>{const d=findDisc(slot.set);return '<div class="v5-discslot"><div class="v5-discslot-head"><img src="'+discImg(d)+'" alt=""><b>DISCO '+(i+1)+'</b></div><label>CONJUNTO<select data-v5-slot="'+i+'" data-v5-key="set"><option value="">NÃO EQUIPADO</option>'+DB.discs.map(o=>'<option value="'+esc(o.name)+'" '+(o.name===slot.set?'selected':'')+'>'+esc(tr(o.name))+'</option>').join("")+'</select></label><label>ATRIBUTO PRINCIPAL<input data-v5-slot="'+i+'" data-v5-key="main" value="'+esc(slot.main||"")+'" placeholder="Ex.: PV%, ATQ%, CRIT"></label><label>SUBATRIBUTOS<input data-v5-slot="'+i+'" data-v5-key="subs" value="'+esc(slot.subs||"")+'" placeholder="Ex.: ATQ 9%, Prof. 27"></label></div>'}).join("")+'</div></div>'+
 '<div class="v5-editor-section"><span class="v5-eyebrow">05 / ANÁLISE</span><h3>DIAGNÓSTICO DA SUA BUILD</h3>'+accountDiagnostics(selected,b)+'<button class="v5-button v5-button-yellow" data-v5="go" data-to="endgame">AVALIAR ENDGAME '+svg("arrow",15)+'</button><button class="v5-delete" data-v5="remove" data-name="'+esc(selected.name)+'">REMOVER ESTE AGENTE</button></div>':'<div class="v5-panel">Adicione um agente ao seu inventário.</div>')+'</div></div>'+
 '<section class="v5-panel v5-team-edit"><span class="v5-eyebrow">LABORATÓRIO DE EQUIPES</span><h2>SUAS FORMAÇÕES</h2><p>Escolha três agentes por equipe. A análise de endgame usa essas composições.</p>'+account.teams.map((team,i)=>'<div class="v5-team-row"><b>EQUIPE '+(i+1)+'</b>'+team.map((n,j)=>'<select data-v5-team="'+i+'" data-v5-pos="'+j+'"><option value="">VAGO</option>'+list.map(nm=>'<option value="'+esc(nm)+'" '+(n===nm?'selected':'')+'>'+esc(tr(nm))+'</option>').join("")+'</select>').join("")+'</div>').join("")+'</section></div>';
}
function field(key,labelTxt,value,type,min,max){
 return '<label>'+labelTxt+'<input type="'+type+'" data-v5-build="'+esc(key)+'" value="'+esc(value)+'" '+(min!=null?'min="'+min+'"':'')+' '+(max!=null?'max="'+max+'"':'')+'></label>';
}
function accountDiagnostics(a,b){
 const result=assess(a,b);
 const names=Object.keys(account.saved).filter(x=>findAgent(x));
 const recs=[];
 if(Number(b.level)<60)recs.push("Prioridade: concluir a progressão de nível antes de comparar builds avançadas.");
 const en=findEngine(b.engine);
 if(en&&en.role!==a.role)recs.push("Motor incompatível: a passiva do motor não deve ser considerada ativa.");
 if(!en)recs.push("Selecione um Motor-W compatível para avaliar a build.");
 const equipped=(b.slots||[]).filter(s=>s.set).length;
 if(equipped<6)recs.push("Equipe os seis discos e revise os conjuntos 4+2.");
 if(names.length<9)recs.push("Para Investida Mortal, avance na construção de mais equipes distintas.");
 return '<div class="v5-diagnostics">'+result.slice(0,7).map(x=>'<div class="'+(x.kind==="pass"?"pass":x.kind==="fail"?"fail":"pending")+'"><b>'+esc(x.title)+'</b><p>'+esc(x.explain)+'</p></div>').join("")+'</div><div class="v5-note"><b>MINHAS RECOMENDAÇÕES</b><ul>'+recs.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>Não é uma simulação do dano real do combate.</div>';
}
function learnScreen(){
 const l=lessons.find(x=>x.id===state.lesson)||lessons[0];
 return '<div class="v5-inner">'+title('GUIA DEFINITIVO // NÍVEL INICIANTE','APRENDA DO ZERO<span class="v5-dot">.</span>','Mecânicas do jogo explicadas com exemplos práticos, sem exigir conhecimento prévio.')+
 '<div class="v5-learn-layout"><div class="v5-lesson-nav">'+lessons.map((x,i)=>'<button class="'+(x.id===state.lesson?'on':'')+'" data-v5="lesson" data-id="'+x.id+'"><b>'+String(i+1).padStart(2,'0')+'</b><span>'+esc(x.name)+'<small>'+esc(x.sub)+'</small></span>'+svg("right",13)+'</button>').join("")+'</div><article class="v5-lesson-content"><span class="v5-eyebrow">AULA / NOVA ERIDU</span><h2>'+esc(l.name)+'</h2><p class="v5-lesson-sub">'+esc(l.sub)+'</p><div class="v5-lesson-body">'+l.body+'</div><button class="v5-button v5-button-yellow" data-v5="nextlesson">PRÓXIMA LIÇÃO '+svg("arrow",16)+'</button></article></div></div>';
}
function radarScreen(){
 const latest=feed.entries||[];
 const entries=latest.filter(x=>state.feedFilter==='all'||x.kind===state.feedFilter);
 const filters=[["all","TUDO"],["official","OFICIAL"],["beta","BETA"],["site","SITE"]];
 return '<div class="v5-inner">'+title('INTEL // MONITORAMENTO','RADAR DE NOVIDADES<span class="v5-dot">.</span>','Mudanças oficiais, dados em teste e histórico do que foi aplicado ao guia.')+
 '<div class="v5-radar-head"><div><small>VERSÃO OFICIAL</small><b>'+esc(feed.officialVersion||"3.3")+'</b></div><div><small>BETA ACOMPANHADO</small><b>'+esc(feed.betaVersion||"3.4")+'</b></div><div><small>ÚLTIMA VERIFICAÇÃO</small><b>'+esc(feed.checkedAt||"—")+'</b></div></div>'+
 '<div class="v5-note">O radar registra novidades detectadas. Informações beta só entram nas fichas após conferência; a coleta agendada não significa que a estratégia foi validada automaticamente.</div>'+
 '<div class="v5-segment v5-radar-tabs">'+filters.map(([id,l])=>'<button data-v5="feed" data-id="'+id+'" class="'+(id===state.feedFilter?'on':'')+'">'+l+'</button>').join("")+'</div>'+
 '<div class="v5-feed">'+entries.slice(0,100).map(x=>{const agent=DB.agents.find(a=>(x.areas||[]).some(v=>parseName(v)===parseName(a.name)));return '<article class="v5-news"><div class="v5-news-top"><span class="v5-label '+esc(x.kind)+'">'+(x.kind==='beta'?'BETA · SUJEITO A MUDANÇAS':x.kind==='official'?'OFICIAL':'ALTERAÇÃO NO SITE')+'</span><time>'+esc(x.date||"")+'</time></div><div class="v5-news-body">'+(agent?'<img src="'+portrait(agent)+'" alt="'+esc(agent.name)+'">':'')+'<div><h3>'+esc(x.title)+'</h3><p>'+esc(x.summary)+'</p></div></div>'+(x.before||x.after?'<div class="v5-beforeafter"><div><b>ANTES</b><p>'+esc(x.before||"Não registrado")+'</p></div><div><b>DEPOIS</b><p>'+esc(x.after||"Não registrado")+'</p></div></div>':'<div class="v5-no-diff">Sem comparação de valores publicada para esta atualização.</div>')+'<div class="v5-news-tags">'+(x.areas||[]).slice(0,5).map(t=>'<span>'+esc(t)+'</span>').join("")+'</div></article>';}).join("")+'</div></div>';
}
function draw(){
 let body=state.page==='home'?home():state.page==='learn'?learnScreen():state.page==='encyclopedia'?listCatalog():state.page==='detail'?details():state.page==='account'?accountScreen():state.page==='endgame'?endgame():state.page==='radar'?radarScreen():home();
 frame(body);
 for(const a of root.querySelectorAll('.v5-lesson-body a')){const n=document.createElement('span');n.textContent=a.textContent;a.replaceWith(n);}
}
function bindEvents(){
 root.addEventListener("click",function(e){
  const el=e.target.closest("[data-v5]");if(!el)return;
  const act=el.dataset.v5;
  if(act==="go"){go(el.dataset.to,{id:"",type:el.dataset.to==="encyclopedia"?"agents":state.type});return;}
  if(act==="type"){state.type=el.dataset.type;state.query="";state.role="";state.element="";state.rarity="";state.onlyOwned=false;draw();return;}
  if(act==="detail"){go("detail",{type:el.dataset.type,id:el.dataset.id,sub:"overview"});return;}
  if(act==="sub"){state.sub=el.dataset.sub;draw();return;}
  if(act==="back"){ago();return;}
  if(act==="lesson"){state.lesson=el.dataset.id;draw();return;}
  if(act==="nextlesson"){const ix=lessons.findIndex(x=>x.id===state.lesson);state.lesson=lessons[(ix+1)%lessons.length].id;draw();return;}
  if(act==="feed"){state.feedFilter=el.dataset.id;draw();return;}
  if(act==="mode"){state.mode=el.dataset.id;draw();return;}
  if(act==="edit"){state.edit=el.dataset.name;account.selected=state.edit;save();draw();return;}
  if(act==="add-own"){const name=el.dataset.name;if(!account.saved[name])account.saved[name]=blankBuild(findAgent(name));state.edit=name;account.selected=name;save();go("account",{id:""});return;}
  if(act==="add-selected"){const name=root.querySelector("#v5-add-agent")?.value;if(!name)return;if(!account.saved[name])account.saved[name]=blankBuild(findAgent(name));state.edit=name;account.selected=name;save();draw();return;}
  if(act==="remove"){const name=el.dataset.name;if(!confirm('Remover '+name+' da Conta do Anderus?'))return;delete account.saved[name];state.edit=Object.keys(account.saved)[0]||"";account.selected=state.edit;save();draw();return;}
  if(act==="backup"){exportAccount();return;}
  if(act==="import"){root.querySelector("#v5-backup-input")?.click();return;}
 });
 root.addEventListener("change",function(e){
  const t=e.target;
  if(t.dataset.v5Select){state[t.dataset.v5Select]=t.value;draw();return;}
  if(t.dataset.v5Check){state.onlyOwned=t.checked;draw();return;}
  if(t.dataset.v5Build){const b=account.saved[state.edit];if(!b)return;const key=t.dataset.v5Build;if(key.startsWith("stats."))b.stats[key.slice(6)]=t.value;else b[key]=t.value;save();if(key==="engine"){const img=root.querySelector("#v5-equipped-engine");if(img)img.src=engineImg(findEngine(t.value));}return;}
  if(t.dataset.v5Skill){const b=account.saved[state.edit];if(!b)return;b.skillLevels=b.skillLevels||{};b.skillLevels[t.dataset.v5Skill]=Math.max(1,Math.min(16,Number(t.value)||1));save();return;}
  if(t.dataset.v5Slot!=null){const b=account.saved[state.edit];if(!b)return;const slot=b.slots[Number(t.dataset.v5Slot)];if(!slot)return;slot[t.dataset.v5Key]=t.value;save();if(t.dataset.v5Key==="set"){const img=t.closest(".v5-discslot").querySelector("img");if(img)img.src=discImg(findDisc(t.value));}return;}
  if(t.dataset.v5Team!=null){const i=Number(t.dataset.v5Team),j=Number(t.dataset.v5Pos);account.teams[i][j]=t.value;save();return;}
  if(t.id==="v5-backup-input"){importAccount(t.files[0]).then(()=>draw());return;}
 });
 let debounce;
 root.addEventListener("input",function(e){
   const t=e.target;
   if(t.id==="v5-catalog-search"||t.id==="v5-global-search"){
    clearTimeout(debounce);
    const v=t.value;const isGlobal=t.id==="v5-global-search";
    debounce=setTimeout(()=>{state.query=v;if(isGlobal){go("encyclopedia",{type:"agents",query:v,id:""});}else {const p=t.selectionStart;const list=listCatalog();const temp=document.createElement("div");temp.innerHTML=list;const newList=temp.querySelector("#v5-list");const current=root.querySelector("#v5-list");if(current&&newList)current.innerHTML=newList.innerHTML;const count=root.querySelector(".v5-resultcount");const nextCount=temp.querySelector(".v5-resultcount");if(count&&nextCount)count.textContent=nextCount.textContent;}},110);
   }
 });
}
async function init(){
 root.innerHTML='<div class="v5-loading"><span>Z</span><strong>NEW ERIDU // ANDERUS</strong><small>Preparando seu arquivo Proxy OS...</small></div>';
 const get=async p=>{try{const r=await fetch(p+"?version=5",{cache:"no-store"});return r.ok?r.json():null;}catch{return null;}};
 const results=await Promise.all([get("data/encyclopedia.json"),get("data/localizacao-ptbr.json"),get("data/updates.json")]);
 enc=results[0]||enc;loc=results[1]||loc;feed=results[2]||feed;
 const hash=decodeURIComponent(location.hash||"");
 if(hash.indexOf("#and-v5/")===0){const a=hash.slice(8).split("/");state.page=a[0]||"home";state.id=a[1]||"";if(state.id){const it=DB.agents.find(x=>x.id===state.id);state.type=it?"agents":"engines";}}
 history.replaceState({...state,__v5:true,scroll:0},"",location.href);
 bindEvents();draw();
}
init();
})();