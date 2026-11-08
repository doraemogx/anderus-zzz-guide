/* ANDERUS LAB — importadores separados de Discos, Motor-W e Habilidades (V6.3) */
(function(){
"use strict";
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\u00a0/g," ").replace(/[’']/g,"").replace(/\s+/g," ").trim();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const catalog=()=>window.AnderusImportCatalog||{engines:[],discs:[]};
const aliases={"blues livre":"Freedom Blues","melodia de phaethon":"Phaethon's Melody","pluma renascente":"Plume of Rebirth"};
const labelCatalog=(category)=>catalog()[category]||[];
function matchCatalog(text,category){
 const raw=norm(text),items=labelCatalog(category);
 if(!raw)return "";
 const candidates=items.flatMap(item=>[{name:item.name,label:item.label||item.name},{name:item.name,label:item.name}]);
 for(const [local,english] of Object.entries(aliases))if(category==="discs"&&english!=="Plume of Rebirth"||category==="engines"&&english==="Plume of Rebirth")candidates.push({label:local,name:english});
 candidates.sort((a,b)=>norm(b.label).length-norm(a.label).length);
 const hit=candidates.find(x=>norm(x.label).length>=5&&raw.includes(norm(x.label)));
 return hit?.name||"";
}
const statPattern=/^(b[o0ôó]nus\s+de\s+dano(?:\s+de\s+(?:fogo|gelo|eter|eletrico|fisico|vento))?|profici[eê]ncia\s+de\s+anomalia|maestria\s+de\s+anomalia|taxa\s+crit|dano\s+crit|taxa\s+de\s+perfura[cç][aã]o|perfura[cç][aã]o|recupera[cç][aã]o\s+de\s+energia|atq|def|pv)\b/i;
function statName(s){
 const n=norm(s).replace(/^[^a-z]+/,"").replace(/\s+/g," ");
 if(n.startsWith("bonus")&&n.includes("dano"))return s.replace(/^[^A-Za-zÀ-ÿ]+/,"").trim();
 if(n.includes("profic")&&n.includes("anomalia"))return "Proficiência de Anomalia";
 if(n.includes("maestria")&&n.includes("anomalia"))return "Maestria de Anomalia";
 if(n.includes("taxa")&&n.includes("crit"))return "Taxa CRIT";
 if(n.includes("dano")&&n.includes("crit"))return "Dano CRIT";
 if(n.includes("taxa")&&n.includes("perfur"))return "Taxa de Perfuração";
 if(n.includes("perfur"))return "Perfuração";
 if(n.includes("atq"))return "ATQ";
 if(n.includes("def"))return "DEF";
 if(/\bpv\b/.test(n))return "PV";
 if(n.includes("energia"))return "Recuperação de Energia";
 return "";
}
function number(v){const raw=String(v||"").replace(/\s/g,"").replace(/[Oo]/g,"0").replace("%","");if(!raw)return null;const fixed=raw.includes(",")?raw.replace(/\./g,"").replace(",","."): /^\d{1,3}(?:\.\d{3})+$/.test(raw)?raw.replace(/\./g,""):raw;return /^-?\d+(?:\.\d+)?$/.test(fixed)?Number(fixed):null;}
function parseStatLine(line){
 let clean=String(line||"").replace(/[│•◈●]/g," ").replace(/\s+/g," ").trim();
 const match=clean.match(/([-+]?\d[\d.,]*\s*%?)\s*$/);
 if(!match)return null;
 const val=match[1].trim();if(number(val)===null)return null;
 const before=clean.slice(0,match.index).trim();
 const roll=before.match(/\+\s*([1-5])\s*$/);
 const name=statName((roll?before.slice(0,roll.index):before).replace(/^[^a-zA-ZÀ-ÿ]+/,""));
 if(!name)return null;
 return {name,value:val,rolls:roll?Number(roll[1]):null};
}
function normalizedLines(text){
 const src=String(text||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean),joined=[];
 // Merge common wrapped property labels where number is only on next line.
 for(let i=0;i<src.length;i++){
  if(i+1<src.length&&/(profici[eê]ncia de|maestria de|b[oôó]nus de dano de)$/i.test(src[i])&&/anomalia|fogo|gelo|eter|fisico|eletrico|vento/i.test(src[i+1])){
   joined.push(src[i]+" "+src[++i]);continue;
  }
  joined.push(src[i]);
 }
 return joined;
}
function parseDiscCard(text,expectedSlot){
 const lines=normalizedLines(text);
 let set=matchCatalog(lines.slice(0,6).join(" "),"discs");
 const inline=lines.join(" ").match(/\[(\d)\]/),slot=inline&&Number(inline[1])>=1&&Number(inline[1])<=6?Number(inline[1]):expectedSlot;
 let level=null,grade=null;
 for(const line of lines.slice(0,6)){let lv=line.match(/\b(?:Nv|Lv)\.?\s*(\d{1,2})\b/i);if(lv)level=Number(lv[1]);if(/\b(?:Rank|Raridade)\s*S\b/i.test(line))grade="S";}
 const stats=[];
 for(const line of lines){
  if(/^(?:Fonte|UID|Anderus|Discos|Nv\.)\b/i.test(line))continue;
  const parsed=parseStatLine(line);
  if(parsed)stats.push(parsed);
 }
 // The first numeric attribute in the disc card is the main stat;
 // subsequent attributes are substats, never infer roll counts from values.
 const main=stats[0]||null,substats=stats.slice(1,5);
 const valid=Boolean(set&&main&&Number.isInteger(slot)&&slot>=1&&slot<=6);
 return {slot,set,level:level!==null&&level>=0&&level<=15?level:null,grade,main:main?.name||"",mainValue:main?.value||"",substats,recognized:stats.length,valid,raw:lines.join("\n")};
}
function parseDiscsText(text){
 const src=String(text||""),parts=src.split(/(?=(?:Blues\s+Livre|Melodia\s+de\s+Phaethon|[A-ZÀ-ÿa-z\s'-]{5,40})\s*\[\s*[1-6]\s*\])/i);
 const list=[];
 for(const part of parts){const m=part.match(/\[\s*([1-6])\s*\]/);if(!m)continue;const parsed=parseDiscCard(part,Number(m[1]));if(parsed.valid)list.push(parsed);}
 return list;
}
function parseEngineText(text){
 const lines=normalizedLines(text);
 const engines=labelCatalog("engines");
 const name=matchCatalog(lines.join("\n"),"engines");
 let level=null,rank=null,baseAtk=null,advancedName="",advancedValue="";
 const idx=lines.findIndex(line=>name&&(norm(line).includes(norm(engines.find(e=>e.name===name)?.label||""))||norm(line).includes(norm(name))));
 const near=(idx>=0?lines.slice(Math.max(0,idx-1),idx+8):lines).join(" ");
 const lv=near.match(/\b(?:Nv|Lv)\.?\s*(\d{1,2})\b/i);
 if(lv&&Number(lv[1])>=1&&Number(lv[1])<=60)level=Number(lv[1]);
 const explicitRank=near.match(/\b(?:Refinamento|Ranque|Rank|R)\s*[.:]?\s*([1-5])\b/i);
 if(explicitRank)rank=Number(explicitRank[1]);
 let atk=lines.join(" ").match(/ATQ\s*B[aá]sico\s*\+?\s*(\d{2,4})/i);
 if(atk)baseAtk=Number(atk[1]);
 for(const line of lines){
  const m=line.match(/(?:Atributos\s+Avan[cç]ados\s*)?((?:Maestria|Profici[eê]ncia)\s+de\s+Anomalia|ATQ|DEF|PV|Taxa\s+CRIT|Dano\s+CRIT|Recupera[cç][aã]o\s+de\s+Energia)\s*\+?\s*(\d[\d.,]*\s*%?)/i);
  if(m&&(!/b[aá]sico/i.test(line))){advancedName=statName(m[1])||m[1];advancedValue=m[2].trim();break;}
 }
 return {name,level,rank,baseAtk,advancedName,advancedValue,recognized:[name,level,baseAtk,advancedValue].filter(v=>v!==null&&v!=="").length,raw:lines.join("\n")};
}
const skillKeys=["basic","dodge","assist","special","chain","coreLevel"];
const skillLabels=["Básico","Esquiva","Assistência","Especial","Cadeia","6º ícone (nível)"];
function parseSkillsText(text){
 const raw=String(text||""),lines=normalizedLines(raw);
 const first=lines.findIndex(line=>/\bhabilidades\b/i.test(norm(line))&&!/sugest/i.test(norm(line)));
 const idx=first<0?0:first;
 const stop=lines.findIndex((l,i)=>i>idx&&/\bsugestoes\s+de\s+aprimoramento\b/i.test(norm(l)));
 const segment=lines.slice(idx+1,stop<0?Math.min(idx+17,lines.length):stop).join(" ");
 const candidates=segment.match(/\b(?:0?[1-9]|1[0-6])\b/g)||[];
 const values=candidates.length>=6?candidates.slice(0,6).map(Number):[];
 return {values,recognized:values.length,raw:lines.join("\n")};
}
function parseSkillsWords(words,text){
 const items=(words||[]).filter(w=>w&&w.text).map(w=>({text:String(w.text),x:w.bbox?.x0??w.x??0,y:w.bbox?.y0??w.y??0,width:(w.bbox?.x1??(w.x??0)+(w.width??0))-(w.bbox?.x0??w.x??0)}));
 const headings=items.filter(w=>norm(w.text).replace(/[^a-z]/g,"")==="habilidades");
 const rowGroups=[];
 for(const h of headings){
  const nums=items.filter(w=>/^(?:0?[1-9]|1[0-6])$/.test(w.text.trim())&&w.y>h.y+35&&w.y<h.y+320);
  const ys=[...new Set(nums.map(x=>Math.round(x.y/22)*22))];
  for(const y of ys){
   const row=nums.filter(x=>Math.abs(x.y-y)<=20).sort((a,b)=>a.x-b.x);
   if(row.length===6&&new Set(row.map(w=>Math.round(w.x/35))).size===6)rowGroups.push({y,values:row.map(w=>Number(w.text))});
  }
 }
 rowGroups.sort((a,b)=>a.y-b.y);
 const values=rowGroups[0]?.values||parseSkillsText(text).values;
 return {values,recognized:values.length,raw:String(text||"")};
}
const api={parseDiscCard,parseDiscsText,parseEngineText,parseSkillsText,parseSkillsWords,matchCatalog,parseStatLine,number,version:"6.4",configure:data=>{window.AnderusImportCatalog=data;}};
window.AnderusGearOCR=api;

let modal=null,activeAgent="",kind="",photoUrl=null,busy=false,worker=null,loaded=null,review=null;
const types={discs:{title:"IMPORTAR OS SEIS DISCOS",help:"Envie um print contendo os seis cartões (1 a 6), como no relatório que você mostrou."},engine:{title:"IMPORTAR MOTOR-W",help:"Envie o print com nome do motor, nível e atributos. O refinamento pode precisar ser informado manualmente."},skills:{title:"IMPORTAR HABILIDADES",help:"Envie o print com os seis ícones e níveis atuais. Não confunda com a linha de níveis recomendados."}};
function say(s,err=false){const el=modal?.querySelector("[data-gi-status]");if(el){el.textContent=s;el.classList.toggle("error",err);}}
function close(){if(busy)return;if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;modal?.remove();modal=null;review=null;activeAgent="";document.body.classList.remove("lab-scan-open");}
function renderPreview(parsed,raw=""){
 const area=modal.querySelector("[data-gi-results]");area.hidden=false;
 if(kind==="discs"){
  review=parsed;
  area.innerHTML='<div class="lab-scan-summary"><strong>'+parsed.filter(d=>d.valid).length+' de 6 discos reconhecidos</strong><p>Confirme posição, conjunto, nível, atributo principal e subatributos. Os cartões desmarcados não serão alterados.</p></div>'+
  '<div class="gi-disc-grid">'+Array.from({length:6},(_,i)=>{const d=parsed.find(x=>x.slot===i+1)||{slot:i+1,set:"",level:null,main:"",mainValue:"",substats:[],valid:false};return '<section class="gi-disc-card"><label class="gi-disc-heading"><input type="checkbox" data-gi-check="'+i+'" '+(d.valid?"checked":"")+'><b>DISCO '+(i+1)+'</b><small>'+((d.valid)?"REVISAR":"NÃO DETECTADO")+'</small></label>'+
  '<label>CONJUNTO<select data-gi-disc="'+i+'" data-key="set"><option value="">NÃO IDENTIFICADO</option>'+labelCatalog("discs").map(x=>'<option value="'+esc(x.name)+'" '+(d.set===x.name?"selected":"")+'>'+esc(x.label||x.name)+'</option>').join("")+'</select></label>'+
  '<div class="gi-disc-two"><label>NÍVEL (0–15)<input type="number" min="0" max="15" data-gi-disc="'+i+'" data-key="level" value="'+esc(d.level??"")+'"></label><label>VALOR PRINCIPAL<input data-gi-disc="'+i+'" data-key="mainValue" value="'+esc(d.mainValue)+'" placeholder="Ex.: 30%"></label></div>'+
  '<label>ATRIBUTO PRINCIPAL<input data-gi-disc="'+i+'" data-key="main" value="'+esc(d.main)+'" placeholder="Ex.: Bônus de Dano de Fogo"></label>'+
  '<label>SUBATRIBUTOS (até 4 linhas)<textarea data-gi-disc="'+i+'" data-key="subs" rows="3" placeholder="Ex.: ATQ 9% (+2); Perfuração 27 (+2)">'+esc(d.substats.map(s=>s.name+" "+s.value+(s.rolls?" (+"+s.rolls+")":"")).join("; "))+'</textarea></label></section>';}).join("")+'</div>';
 }else if(kind==="engine"){
  const d=parsed;review=d;
  area.innerHTML='<div class="lab-scan-summary"><strong>'+d.recognized+' informações reconhecidas</strong><p>Escolha o motor correto, confirme nível, refinamento e atributos antes de salvar.</p></div>'+
   '<div class="gi-engine-fields"><label>Motor-W<select data-gi-engine="name"><option value="">NÃO IDENTIFICADO</option>'+labelCatalog("engines").map(x=>'<option value="'+esc(x.name)+'" '+(d.name===x.name?"selected":"")+'>'+esc(x.label||x.name)+'</option>').join("")+'</select></label>'+
   '<div class="gi-disc-two"><label>Nível (1–60)<input type="number" min="1" max="60" data-gi-engine="level" value="'+esc(d.level??"")+'"></label><label>Refinamento (1–5)<input type="number" min="1" max="5" data-gi-engine="rank" value="'+esc(d.rank??"")+'" placeholder="Conferir estrelas"></label></div>'+
   '<div class="gi-disc-two"><label>ATQ básico<input type="number" data-gi-engine="baseAtk" value="'+esc(d.baseAtk??"")+'" placeholder="Não identificado"></label><label>Atributo avançado<input data-gi-engine="advancedName" value="'+esc(d.advancedName||"")+'"></label></div>'+
   '<label>Valor do atributo avançado<input data-gi-engine="advancedValue" value="'+esc(d.advancedValue||"")+'"></label></div>';
 }else{
  review=parsed;
  area.innerHTML='<div class="lab-scan-summary"><strong>'+parsed.recognized+' de 6 níveis reconhecidos</strong><p>Ordem padrão: Básico, Esquiva, Assistência, Especial, Cadeia e 6º ícone. Se o relatório estiver ordenado por prioridade, ajuste a correspondência abaixo.</p></div>'+
   '<div class="gi-skills-grid">'+Array.from({length:6},(_,i)=>'<div class="gi-skill"><strong>ÍCONE '+(i+1)+'</strong><label>Correspondência<select data-gi-skill-map="'+i+'">'+skillKeys.map((k,j)=>'<option value="'+k+'" '+(i===j?"selected":"")+'>'+esc(skillLabels[j])+'</option>').join("")+'</select></label><label>NÍVEL<input type="number" min="1" max="16" data-gi-skill="'+i+'" value="'+esc(parsed.values[i]??"")+'" placeholder="—"></label></div>').join("")+'</div>'+
   '<p class="gi-tip">O 6º nível é armazenado separadamente do grau A–F da habilidade central; o grau que você já cadastrou não será alterado.</p>';
 }
 area.innerHTML+='<details class="lab-scan-raw"><summary>Texto reconhecido (para conferir)</summary><pre>'+esc(raw)+'</pre></details>';
 modal.querySelector("[data-gi-apply]").disabled=false;
 say("Leitura concluída. Confira os campos e selecione o que deseja salvar.");
}
function open(which,name){
 if(modal&&!busy)close();
 if(!types[which]||!name)return;
 kind=which;activeAgent=name;
 modal=document.createElement("div");modal.id="lab-gear-dialog";modal.className="lab-scan-backdrop gi-backdrop";
 const meta=types[which];
 modal.innerHTML='<div class="lab-scan-dialog gi-dialog" role="dialog" aria-modal="true" aria-labelledby="gi-title" tabindex="-1"><header><div><small>ANDERUS LAB // IMPORTAÇÃO SEPARADA</small><h2 id="gi-title">'+esc(meta.title)+'</h2><p>Destino: <strong>'+esc(name)+'</strong></p></div><button type="button" class="lab-scan-close" data-gi-close aria-label="Fechar">×</button></header>'+
 '<div class="lab-scan-body"><p>'+esc(meta.help)+' A imagem não será enviada para o servidor do guia.</p><label class="lab-scan-drop"><span>ESCOLHER PRINT '+(which==="discs"?"DOS DISCOS":which==="engine"?"DO MOTOR":"DAS HABILIDADES")+'</span><small>PNG, JPG, WEBP · até 15 MB</small><input type="file" data-gi-file accept="image/png,image/jpeg,image/webp,image/*"></label>'+
 '<div class="lab-scan-image" data-gi-image hidden></div><div class="lab-scan-status" data-gi-status role="status" aria-live="polite">Selecione a captura para analisar.</div><div class="lab-scan-results" data-gi-results hidden></div>'+
 '<p class="lab-scan-privacy">Leitura local por Tesseract.js. Os dados só serão aplicados após sua confirmação. Algumas imagens exigem correção manual, especialmente os números pequenos.</p></div>'+
 '<footer><button class="lab-scan-cancel" type="button" data-gi-close>CANCELAR</button><button class="lab-scan-apply" type="button" data-gi-apply disabled>CONFERIR E SALVAR</button></footer></div>';
 document.body.appendChild(modal);document.body.classList.add("lab-scan-open");
 modal.querySelector(".gi-dialog").focus();
 modal.addEventListener("click",e=>{
  if(e.target===modal||e.target.closest("[data-gi-close]")){close();return;}
  if(e.target.closest("[data-gi-apply]"))apply();
 });
 modal.querySelector("[data-gi-file]").addEventListener("change",e=>{const file=e.target.files?.[0];if(file)scan(file);});
 modal.addEventListener("input",e=>{if(e.target.matches('[data-gi-disc],[data-gi-engine],[data-gi-skill]')){const btn=modal.querySelector("[data-gi-apply]");if(btn)btn.disabled=false;}});
}
async function ocrWorker(){
 if(!window.Tesseract?.createWorker){
  if(!loaded)loaded=new Promise((resolve,reject)=>{
   const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";s.async=true;s.crossOrigin="anonymous";
   s.onload=()=>resolve();s.onerror=()=>reject(Error("Não foi possível carregar o reconhecedor"));
   document.head.appendChild(s);
  }).catch(e=>{loaded=null;throw e;});
  await loaded;
 }
 try{return await window.Tesseract.createWorker(["por","eng"],1);}
 catch{return await window.Tesseract.createWorker("eng");}
}
function readImage(file){
 return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error("A imagem não pôde ser aberta"));};img.src=url;});
}
function makeCanvas(img,rect={x:0,y:0,w:1,h:1},contrast=false){
 const sx=Math.round(img.naturalWidth*rect.x),sy=Math.round(img.naturalHeight*rect.y);
 const sw=Math.max(1,Math.min(img.naturalWidth-sx,Math.round(img.naturalWidth*rect.w))),sh=Math.max(1,Math.min(img.naturalHeight-sy,Math.round(img.naturalHeight*rect.h)));
 const scale=Math.min(3.5,1600/sw,2100/sh),canvas=document.createElement("canvas");
 canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
 const ctx=canvas.getContext("2d",{willReadFrequently:true});
 ctx.drawImage(img,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
 if(contrast){
  const im=ctx.getImageData(0,0,canvas.width,canvas.height),d=im.data;
  for(let i=0;i<d.length;i+=4){
   const l=.21*d[i]+.72*d[i+1]+.07*d[i+2],v=Math.max(0,Math.min(255,(255-l-120)*1.35+128));
   d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;
  }
  ctx.putImageData(im,0,0);
 }
 return canvas;
}
const DISC_LAYOUT=[
 {x:.033,y:.123,w:.457,h:.225},{x:.505,y:.123,w:.462,h:.225},
 {x:.033,y:.352,w:.457,h:.226},{x:.505,y:.352,w:.462,h:.226},
 {x:.033,y:.581,w:.457,h:.247},{x:.505,y:.581,w:.462,h:.247}
];
function allWords(data){
 const words=[...(data?.words||[])];
 for(const block of data?.blocks||[])for(const para of block.paragraphs||[])for(const line of para.lines||[])for(const word of line.words||[])words.push(word);
 return words;
}
function badgeRects(y){
 const xs=[.116,.268,.420,.574,.726,.878];
 return xs.map(x=>({x:Math.max(0,x-.039),y:Math.max(0,y-.017),w:.078,h:.034}));
}
async function recognizeSkillBadges(ocr,image,data){
 // Numeric chips are rendered inside circular skill icons. Reading the
 // surrounding paragraph rarely captures them, so crop only these chips.
 const H=image.naturalHeight,W=image.naturalWidth;
 const whole={x:.03,y:.13,w:.94,h:.77},canvasScale=Math.min(3.5,1600/(W*whole.w),2100/(H*whole.h));
 const word=allWords(data).filter(w=>/^habilidades\b/.test(norm(w.text))&&Number.isFinite(w.bbox?.y0)).sort((a,b)=>a.bbox.y0-b.bbox.y0)[0];
 const centers=[];
 if(word?.bbox&&Number.isFinite(word.bbox.y0)){
  const header=(whole.y*H)+(word.bbox.y0/canvasScale);
  centers.push(Math.max(.03,Math.min(.95,header/H+.107)));
 }
 // Fallbacks for the two real phone screenshot placements supplied to the
 // project; only use the values if the OCR sees six valid level chips.
 if(!centers.length)centers.push(.566,.825);
 try{await ocr.setParameters({tessedit_pageseg_mode:"7",tessedit_char_whitelist:"0123456789"});}catch{}
 let best=[];
 for(const center of centers){
  const levels=[];
  for(const rect of badgeRects(center)){
   const canvas=makeCanvas(image,rect,true);
   const result=await ocr.recognize(canvas);
   const raw=String(result.data?.text||"").replace(/[Oo]/g,"0").replace(/[Il]/g,"1");
   const digits=raw.match(/(?:0?[1-9]|1[0-6])/g)?.[0]||"";
   const value=digits?Number(digits):null;
   levels.push(value!==null&&value>=1&&value<=16?value:null);
  }
  if(levels.filter(v=>v!==null).length>best.filter(v=>v!==null).length)best=levels;
  if(best.every(v=>v!==null))break;
 }
 return {values:best,recognized:best.filter(v=>v!==null).length};
}

async function scan(file){
 if(busy)return;
 if(!file.type.startsWith("image/")||file.size>15*1024*1024){say("Selecione uma imagem de até 15 MB.",true);return;}
 busy=true;modal.querySelector("[data-gi-file]").disabled=true;modal.querySelector("[data-gi-apply]").disabled=true;
 modal.querySelector("[data-gi-results]").hidden=true;
 if(photoUrl)URL.revokeObjectURL(photoUrl);
 photoUrl=URL.createObjectURL(file);
 const wrap=modal.querySelector("[data-gi-image]");wrap.hidden=false;wrap.innerHTML='<img src="'+esc(photoUrl)+'" alt="Captura selecionada">';
 try{
  say("Carregando reconhecimento no navegador…");
  worker=await ocrWorker();
  const image=await readImage(file);
  if(kind==="discs"){
   const parts=[],raw=[];
   for(let i=0;i<6;i++){
    say("Lendo disco "+(i+1)+" de 6…");
    const canvas=makeCanvas(image,DISC_LAYOUT[i],false);
    const result=await worker.recognize(canvas);
    let parsed=parseDiscCard(result.data?.text||"",i+1);
    if((!parsed.set||!parsed.main||parsed.level===null||parsed.recognized<5)&&result.data?.text){
     const alt=await worker.recognize(makeCanvas(image,DISC_LAYOUT[i],true));
     const other=parseDiscCard(alt.data?.text||"",i+1);
     const quality=d=>(d.set?6:0)+(d.main?5:0)+(d.level!==null?3:0)+d.recognized;
     if(quality(other)>quality(parsed))parsed=other;
    }
    // Card position is fixed by its placement, not by unreliable OCR of [1] etc.
    parsed.slot=i+1;
    parts.push(parsed);raw.push("Disco "+(i+1)+":\n"+parsed.raw);
   }
   renderPreview(parts,raw.join("\n\n"));
  }else{
   say("Lendo "+(kind==="engine"?"motor":"habilidades")+"…");
   const result=await worker.recognize(makeCanvas(image,{x:.03,y:.13,w:.94,h:.77}));
   const txt=result.data?.text||"";
   let parsed=kind==="engine"?parseEngineText(txt):parseSkillsWords(result.data?.words||[],txt);
   if(kind==="skills"&&parsed.recognized!==6){
    say("Identificando os seis números dentro dos ícones…");
    const badges=await recognizeSkillBadges(worker,image,result.data||{});
    if(badges.recognized>parsed.recognized){
     parsed={...parsed,values:badges.values,recognized:badges.recognized};
    }else if(parsed.recognized<6){
     const retry=await worker.recognize(makeCanvas(image,{x:.03,y:.13,w:.94,h:.77},true));
     const other=parseSkillsWords(allWords(retry.data||{}),retry.data?.text||"");
     if(other.recognized>parsed.recognized)parsed=other;
    }
   }
   renderPreview(parsed,parsed.raw||txt);
  }
 }catch(e){say("Não consegui interpretar automaticamente: "+String(e.message||e)+". Você pode tentar outra captura ou usar o editor manual.",true);}
 finally{try{await worker?.terminate();}catch{}worker=null;busy=false;if(modal)modal.querySelector("[data-gi-file]").disabled=false;}
}
function dataValue(sel){return modal.querySelector(sel)?.value?.trim()||"";}
function apply(){
 if(!modal||busy)return;
 let payload=null;
 if(kind==="discs"){
  const items=[];for(let i=0;i<6;i++){
   if(!modal.querySelector('[data-gi-check="'+i+'"]')?.checked)continue;
   const val=k=>dataValue('[data-gi-disc="'+i+'"][data-key="'+k+'"]');
   const set=val("set"),main=val("main"),mainValue=val("mainValue"),rawLevel=val("level"),subs=val("subs");
   if(!set||!main||!mainValue){say("Disco "+(i+1)+": informe conjunto, atributo principal e seu valor, ou desmarque esse cartão.",true);return;}
   if(rawLevel&&(!/^\d{1,2}$/.test(rawLevel)||Number(rawLevel)>15)){say("Disco "+(i+1)+": nível deve estar entre 0 e 15.",true);return;}
   items.push({slot:i+1,set,main,mainValue,level:rawLevel?Number(rawLevel):null,subs:subs.slice(0,500),
    substats:review?.find(x=>x.slot===i+1)?.substats||[]});
  }
  if(!items.length){say("Marque ao menos um disco para salvar.",true);return;}
  payload={discs:items};
 }else if(kind==="engine"){
  const name=dataValue('[data-gi-engine="name"]'),level=dataValue('[data-gi-engine="level"]'),rank=dataValue('[data-gi-engine="rank"]');
  if(!name){say("Selecione o Motor-W correto antes de salvar.",true);return;}
  if(level&&(!/^\d{1,2}$/.test(level)||Number(level)<1||Number(level)>60)){say("Nível do motor inválido.",true);return;}
  if(rank&&(!/^[1-5]$/.test(rank))){say("Refinamento precisa estar entre 1 e 5.",true);return;}
  payload={engine:{name,level:level?Number(level):null,rank:rank?Number(rank):null,
   baseAtk:dataValue('[data-gi-engine="baseAtk"]'),advancedName:dataValue('[data-gi-engine="advancedName"]'),
   advancedValue:dataValue('[data-gi-engine="advancedValue"]')}};
 }else{
  const levels={},coreLevel=[];
  for(let i=0;i<6;i++){
   const value=dataValue('[data-gi-skill="'+i+'"]'),key=dataValue('[data-gi-skill-map="'+i+'"]');
   if(!value)continue;
   if(!/^\d{1,2}$/.test(value)||Number(value)<1||Number(value)>16){say("Nível inválido no ícone "+(i+1)+".",true);return;}
   if(Object.hasOwn(levels,key)){say("Cada habilidade pode aparecer uma única vez. Revise o mapeamento.",true);return;}
   levels[key]=Number(value);
  }
  if(!Object.keys(levels).length){say("Preencha ao menos um nível de habilidade.",true);return;}
  payload={skills:levels};
 }
 modal.querySelector("[data-gi-apply]").disabled=true;
 window.dispatchEvent(new CustomEvent("anderus:apply-gear",{detail:{name:activeAgent,kind,...payload}}));
}
window.addEventListener("anderus:gear-applied",ev=>{
 if(!modal||ev.detail?.name!==activeAgent||ev.detail?.kind!==kind)return;
 if(ev.detail.ok){
  say("✓ "+ev.detail.count+" item(ns) salvos na build de "+activeAgent+".");
  const btn=modal.querySelector("[data-gi-apply]");if(btn){btn.disabled=true;btn.textContent="SALVO ✓";}
 }else{modal.querySelector("[data-gi-apply]").disabled=false;say("Não consegui confirmar o salvamento. Seus dados anteriores foram preservados.",true);}
});
document.addEventListener("click",e=>{const b=e.target.closest('[data-v5="import-gear"]');if(b){e.preventDefault();open(b.dataset.kind,b.dataset.agent);}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&modal&&!busy)close();});
})();