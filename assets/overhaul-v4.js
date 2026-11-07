/* ANDERUS PROXY OS V4: interface própria, retratos, fatos numéricos internos */
(function(){
'use strict';
var loc={engines:{},discs:{},agents:{},labels:{}},ency=null,gear={engines:{}},pairs=[];
var nativePic=pic,nativeRender=render,nativeUpdate=updateCatalog;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
pic=function(src,fallback,cls,alt,sources){
  if(typeof src==='string'&&/^assets\/agents\/a[0-9]+\.webp$/.test(src)){
    return nativePic(src.replace('assets/agents/','assets/portraits/'),src,cls,alt,[src,fallback].concat(sources||[]));
  }
  return nativePic(src,fallback,cls,alt,sources);
};
function dictionary(){return Object.assign({},loc.engines,loc.discs,loc.agents,loc.labels);}
function label(name){return dictionary()[name]||name;}
function refreshPairs(){
  pairs=Object.entries(dictionary()).filter(function(p){return p[0]!==p[1];}).sort(function(a,b){return b[0].length-a[0].length;});
}
function translate(root){
  if(!root||!pairs.length)return;
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
  while(w.nextNode()){
    var n=w.currentNode;
    if(n.nodeValue.trim()&&!n.parentElement.closest('script,style,textarea,pre,code'))nodes.push(n);
  }
  nodes.forEach(function(node){
    var v=node.nodeValue;
    pairs.forEach(function(p){
      if(v.indexOf(p[0])!==-1)v=v.split(p[0]).join(p[1]);
      var upper=p[0].toUpperCase();
      if(v.indexOf(upper)!==-1)v=v.split(upper).join(p[1].toUpperCase());
    });
    if(node.nodeValue!==v)node.nodeValue=v;
  });
}
function clearRedirects(page){
  page.querySelectorAll('a[target="_blank"],a[href^="https://"]').forEach(function(a){
    var span=document.createElement('span');
    span.className='v4-internal';
    span.textContent='Informações disponíveis neste guia';
    a.replaceWith(span);
  });
  if(S.page==='detail'&&S.type==='agent'){
    page.querySelectorAll('.detailSection').forEach(function(x){
      if(x.textContent.indexOf('ABRIR FONTE EXTERNA')>=0)x.remove();
    });
  }
}
function safeStats(stats){
  var names=['PV','ATQ','DEF','Impacto','Taxa CRIT','Dano CRIT','Maestria de Anomalia','Proficiência de Anomalia','Taxa de Perfuração','Recuperação de Energia'];
  var found=names.filter(function(x){return stats&&stats[x];});
  if(!found.length)return '<div class="v4-unverified">Os números ainda não foram verificados para este personagem. Não são exibidas estimativas.</div>';
  return '<div class="v4-stats">'+found.map(function(n){return '<div class="v4-stat"><span>'+esc(n)+'</span><strong>'+esc(stats[n].lv60)+'</strong><small>NÍVEL 60</small></div>';}).join('')+'</div>';
}
function skillList(arr){
  if(!arr||!arr.length)return '<div class="v4-unverified">Multiplicadores não disponíveis em formato validado para este personagem. Nenhum valor foi inventado.</div>';
  var rows=arr.map(function(m,i){
    var numbers=(m.numeros||[]).filter(function(n){return n.valor;});
    var content=numbers.length?'<div class="v4-metrics">'+numbers.map(function(n){return '<div><span>'+esc(n.metrica)+'</span><b>'+esc(n.valor)+'</b></div>';}).join('')+'</div>':'<div class="v4-unverified">Sem valores numéricos comprovados nesta variação.</div>';
    return '<details class="v4-skill"><summary><span class="v4-counter">'+String(i+1).padStart(2,'0')+'</span><strong>'+esc(m.nome)+'</strong><small>'+numbers.length+' valores</small></summary><div class="v4-skill-content">'+content+'<p>Referência de nível '+esc(m.nivel||'1')+'. Multiplicadores diferentes podem existir em outros níveis.</p></div></details>';
  });
  return '<div class="v4-skill-grid">'+rows.join('')+'</div>';
}
function equipment(a){
  var vals=[a.engine,a.disc,DB.deep[a.name]&&DB.deep[a.name].ideal2].filter(Boolean);
  return '<div class="v4-gear">'+vals.map(function(name,i){
    var it=DB.engines.find(function(x){return x.name===name;})||DB.discs.find(function(x){return x.name===name;});
    if(!it)return '';
    var type=DB.engines.indexOf(it)!==-1?'engine':'disc';
    return '<button data-open="'+type+'" data-id="'+esc(it.id)+'"><img src="'+esc(it.img)+'" loading="lazy" alt="'+esc(name)+'"><small>'+(i?'DISCO DE IMPULSO':'MOTOR-W')+'</small><strong>'+esc(label(name))+'</strong></button>';
  }).join('')+'</div>';
}
function newSection(a){
  var data=ency&&ency.agents&&ency.agents[a.id],deep=DB.deep[a.name]||{},beta=!!a.beta;
  var p=document.createElement('section');p.id='v4-encyclopedia';p.className='v4-encyclopedia';
  var status=beta?'VERSÃO BETA — SUJEITA A MUDANÇAS':data&&Object.keys(data.stats||{}).length?'ESTATÍSTICAS FACTUAIS CONFERIDAS':'DADOS PARCIAIS — CONFERÊNCIA PENDENTE';
  var intro='<header class="v4-section-title"><span>ARQUIVO TÁTICO DO AGENTE</span><h2>TUDO SOBRE '+esc(label(a.name)).toUpperCase()+'</h2><p>Estatísticas, habilidades e valores reunidos aqui. Não é necessário abrir fontes externas.</p><b>'+status+'</b></header>';
  var summary='<section class="v4-panel"><div class="v4-kicker">01 / PROGRESSÃO</div><h3>ESTATÍSTICAS DO AGENTE</h3>'+(beta?'<p>Os números de teste não devem ser considerados definitivos.</p>':safeStats(data&&data.stats))+'</section>';
  var rota=(deep.rotation&&deep.rotation.length?deep.rotation:[a.how,'Prepare os apoios e confira a habilidade adicional do agente.','Use a janela de dano e reaplique efeitos antes de trocar.']);
  var guide='<section class="v4-panel"><div class="v4-kicker">02 / COMBATE</div><h3>COMO FUNCIONA NA PRÁTICA</h3><p>'+esc(deep.overview||a.summary)+'</p><ol>'+rota.map(function(s){return '<li>'+esc(s)+'</li>';}).join('')+'</ol></section>';
  var skills='<section class="v4-panel"><div class="v4-kicker">03 / DADOS DAS HABILIDADES</div><h3>MULTIPLICADORES E GOLPES</h3><p>Valores apresentados apenas quando encontrados e estruturados na base de referência. Ausência de valor não significa 0%.</p>'+(beta?'<div class="v4-unverified">Os kits em beta ainda não possuem multiplicadores finais e não devem orientar investimentos irreversíveis.</div>':skillList(data&&data.habilidades))+'</section>';
  var researched=data&&data.build||{};
  var factualBuild='<div class="v4-buildfact"><div><small>ATRIBUTOS PRINCIPAIS (REFERÊNCIA)</small><p>'+esc(researched.principais||'Consulte a recomendação editorial e as condições do kit.')+'</p></div><div><small>SUBATRIBUTOS (REFERÊNCIA)</small><p>'+esc(researched.secundarios||'Prioridades ainda não disponíveis.')+'</p></div><div><small>PRIORIDADE DE HABILIDADES</small><p>'+esc(data&&data.prioridade||'Sujeita à composição da equipe.')+'</p></div></div>';
  var build='<section class="v4-panel"><div class="v4-kicker">04 / BUILD E EQUIPE</div><h3>ITENS RELACIONADOS</h3>'+factualBuild+equipment(a)+'<p>Composições de exemplo: '+esc(a.teams||'sem equipe validada').replaceAll(' / ',' · ')+'</p><div class="v4-unverified">'+(a.buildReviewed?'Recomendação editorial revisada. A adequação depende da sua conta.':'Recomendação editorial: verificação individual de kit e sinergias pendente.')+'</div></section>';
  p.innerHTML=intro+'<div class="v4-split">'+summary+guide+'</div>'+skills+build+'<footer class="v4-footer">Arquivo pessoal em português brasileiro. Dados de versões de teste aparecem separados de dados oficiais.</footer>';
  return p;
}
function applyDetail(){
  var page=document.querySelector('.details');if(!page||S.page!=='detail')return;
  var existing=page.querySelector('#v4-encyclopedia');if(existing)existing.remove();
  if(S.type==='agent'){
    var a=DB.agents.find(function(a){return a.id===S.id;});
    if(a)page.appendChild(newSection(a));
  }else if(S.type==='engine'){
    var engine=DB.engines.find(function(a){return a.id===S.id;});
    if(engine){
      var el=document.createElement('section');el.id='v4-encyclopedia';el.className='v4-panel v4-encyclopedia';
      var facts=gear&&gear.engines&&gear.engines[engine.id];
      var numbers=facts&&facts.numeros&&facts.numeros.length?'<div class="v4-numeric-tags">'+facts.numeros.map(function(n){return '<span>'+esc(n)+'</span>';}).join('')+'</div>':'';
      el.innerHTML='<div class="v4-kicker">MOTOR-W / EQUIPAMENTO</div><h2>'+esc(label(engine.name))+'</h2><p>'+esc(engine.summary)+'</p><h3>VALORES RELEVANTES</h3>'+numbers+'<div class="v4-unverified">'+(engine.beta?'BETA — NÃO DEFINITIVO':'Efeito resumido em português. Valores exatos não confirmados permanecem sem números inventados.')+'</div>';
      page.appendChild(el);
    }
  }
}
function homeBanner(){
  var page=document.querySelector('.page');if(!page||S.page!=='home'||page.querySelector('.v4-homebanner'))return;
  var p=document.createElement('div');p.className='v4-homebanner';
  p.innerHTML='<span>PROXY OS / ANDERUS</span><strong>SEU ARQUIVO DE NOVA ERIDU.</strong><small>AGENTES, HABILIDADES, EQUIPAMENTOS E CONTA PESSOAL · V4</small>';
  page.insertBefore(p,page.firstChild);
}
function enhance(){
  var page=document.querySelector('.page');if(!page)return;
  clearRedirects(page);
  applyDetail();homeBanner();
  translate(page);
}
render=function(){nativeRender();enhance();};
updateCatalog=function(){nativeUpdate();enhance();};
async function load(path){
  try{var r=await fetch(path+'?v=4.0',{cache:'no-store'});return r.ok?await r.json():null;}catch{return null;}
}
async function bootstrap(){
  document.title='NEW ERIDU // ANDERUS · Enciclopédia V4';
  var arr=await Promise.all([load('data/localizacao-ptbr.json'),load('data/encyclopedia.json'),load('data/gear-ptbr.json')]);
  if(arr[0]){loc=arr[0];refreshPairs();}
  if(arr[1])ency=arr[1];
  if(arr[2])gear=arr[2];
  enhance();
}
render();
bootstrap();
})();
