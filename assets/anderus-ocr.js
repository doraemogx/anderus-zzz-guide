/* ANDERUS LAB / Importação local de atributos por captura ZZZ — V6.1 */
(function(){
"use strict";
const keys=[
 {key:"hp",label:"PV",pattern:/^(?:p\.?\s*v\.?|hp|vida)\b/i,min:1,max:100000},
 {key:"atk",label:"ATQ",pattern:/^(?:atq|ataque)\b/i,min:1,max:30000},
 {key:"def",label:"DEF",pattern:/^(?:def|defesa)\b/i,min:0,max:30000},
 {key:"impact",label:"Impacto",pattern:/^impacto\b/i,min:0,max:1000},
 {key:"crit",label:"Taxa CRIT (%)",pattern:/^taxa\s*(?:de\s*)?crit(?:ico|ica)?\b/i,min:0,max:200},
 {key:"cdmg",label:"Dano CRIT (%)",pattern:/^dano\s*crit(?:ico|ica)?\b/i,min:0,max:900},
 {key:"mastery",label:"Maestria de Anomalia",pattern:/^maestria\s*(?:de\s*)?anomalia\b/i,min:0,max:2000},
 {key:"proficiency",label:"Proficiência de Anomalia",pattern:/^proficiencia\s*(?:de\s*)?anomalia\b/i,min:0,max:2000},
 {key:"penRatio",label:"Taxa de Perfuração (%)",pattern:/^taxa\s*(?:de\s*)?(?:perfuracao|penetracao)\b/i,min:0,max:150},
 {key:"energy",label:"Recuperação de Energia",pattern:/^recuperacao\s*(?:de\s*)?energia\b/i,min:0,max:15},
 {key:"pen",label:"Perfuração (valor fixo)",pattern:/^(?:perfuracao|penetracao)\b/i,min:0,max:5000},
 {key:"bonusDamage",label:"Bônus de Dano Elemental (%)",pattern:/^bonus\s*(?:de\s*)?dano\s*(?:(?:de|do|da)\s*)?(?:fogo|gelo|eter|fisico|eletrico|vento|geral|elemental)?/i,min:0,max:500}
];
const normalize=text=>String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\u00a0/g," ").toLowerCase();
const html=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
function parseValue(value,key){
 const raw=String(value||"").replace(/\s/g,"").replace("%","").replace(/[Oo](?=\d)|(?<=\d)[Oo](?=\d)/g,"0");
 if(!raw)return null;
 let number=raw;
 if(raw.includes(","))number=raw.replace(/\./g,"").replace(",",".");
 else if(/^\d{1,3}(?:\.\d{3})+$/.test(raw)&&key!=="energy")number=raw.replace(/\./g,"");
 const n=Number(number);
 const def=keys.find(x=>x.key===key);
 return Number.isFinite(n)&&def&&n>=def.min&&n<=def.max?n:null;
}
// Some games place glyph icons immediately before labels. OCR may read them as
// characters such as "@ PV", "am ATQ", "4} Taxa CRIT" and "M) Perfuragao".
// Match the actual label anywhere on the line, not only at column 0.
const statMatchers=[
 ["penRatio",/\btaxa\s*(?:de\s*)?(?:perfur\w*|penetr\w*)/i],
 ["crit",/\btaxa\s*(?:de\s*)?crit\w*/i],
 ["cdmg",/\bdano\s*crit\w*/i],
 ["mastery",/\bmaestria\s*(?:de\s*)?anomalia\b/i],
 ["proficiency",/\bprofici\w*\s*(?:de\s*)?anomalia\b/i],
 ["energy",/\brecupera\w*\s*(?:de\s*)?energia\b/i],
 ["bonusDamage",/\bb(?:onus|6enus|0nus|enus)\s*(?:de\s*)?dano\b/i],
 ["impact",/\bimpacto\b/i],
 ["atk",/\batq\b/i],
 ["def",/\bdef\b/i],
 ["hp",/\bpv\b/i],
 ["pen",/\b(?:perfur\w*|penetr\w*)/i]
];
function parseText(text){
 const lines=String(text||"").replace(/\r/g,"").split("\n").map(x=>x.replace(/[│|]/g," ").trim()).filter(Boolean);
 const fields={},warnings=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i],plain=normalize(line).replace(/[•·:;]/g," ").replace(/\s+/g," ");
  for(const [key,matcher] of statMatchers){
   if(Object.hasOwn(fields,key))continue;
   const match=matcher.exec(plain);
   if(!match)continue;
   if(key==="pen"&&/\btaxa\s*(?:de\s*)?(?:perfur|penetr)/i.test(plain))continue;
   const def=keys.find(x=>x.key===key);
   let suffix=line.slice(match.index+match[0].length);
   let tokens=suffix.match(/[-+]?\d[\d.,]*\s*%?/g);
   if(!tokens?.length&&i+1<lines.length&&/^[\d\s.,%]+$/.test(lines[i+1]))tokens=[lines[i+1]];
   const candidate=tokens?.[tokens.length-1]?.trim()||"";
   const value=parseValue(candidate,key);
   if(value!==null){
    fields[key]=String(value);
    if(key==="bonusDamage"){
     const element=plain.match(/\bdano\s*(?:(?:de|do|da)\s*)?(fogo|gelo|eter|fisico|eletrico|vento)\b/i)?.[1];
     if(element)fields.bonusDamageElement=element.charAt(0).toUpperCase()+element.slice(1);
    }
   }else warnings.push(def.label+" — não foi possível ler com segurança");
   break;
  }
 }
 return {fields,warnings,recognized:keys.filter(x=>Object.hasOwn(fields,x.key)).length,lines};
}

window.AnderusOCR={parseText,parseValue,version:"6.2"};
let modal=null,activeAgent="",lastUrl=null,processing=false,cachePromise=null;
function announce(text,error=false){
 const el=modal?.querySelector("[data-scan-status]");
 if(el){el.textContent=text;el.classList.toggle("error",error);}
}
function close(){
 if(processing)return;
 if(lastUrl){URL.revokeObjectURL(lastUrl);lastUrl=null;}
 modal?.remove();modal=null;activeAgent="";
}
function renderPreview(image){
 const wrap=modal.querySelector("[data-scan-image]");wrap.hidden=false;
 if(lastUrl)URL.revokeObjectURL(lastUrl);
 lastUrl=URL.createObjectURL(image);
 wrap.innerHTML='<img src="'+html(lastUrl)+'" alt="Captura selecionada para reconhecimento">';
}
function showResults(parsed){
 const box=modal.querySelector("[data-scan-results]");
 box.hidden=false;
 box.innerHTML='<div class="lab-scan-summary"><strong>'+parsed.recognized+' de '+keys.length+' atributos reconhecidos</strong><p>Revise os valores, desmarque os incorretos e preencha os que não foram identificados.</p></div>'+
 '<div class="lab-scan-fields">'+keys.map(def=>{
  const value=parsed.fields[def.key]??"",found=value!=="";
  return '<label class="lab-scan-field"><input type="checkbox" data-scan-use="'+def.key+'" '+(found?"checked":"")+' aria-label="Atualizar '+html(def.label)+'"><span>'+html(def.label)+'</span><input type="text" inputmode="decimal" data-scan-value="'+def.key+'" value="'+html(value)+'" placeholder="Não identificado" aria-label="Valor de '+html(def.label)+'"></label>';
 }).join("")+'</div>'+
 (parsed.fields.bonusDamageElement?'<label class="lab-scan-element">Elemento do bônus de dano <input type="text" value="'+html(parsed.fields.bonusDamageElement)+'" data-scan-element></label>':"")+
 '<details class="lab-scan-raw"><summary>Conferir texto reconhecido</summary><pre>'+html(parsed.lines.join("\n"))+'</pre></details>';
 modal.querySelector("[data-scan-apply]").disabled=parsed.recognized===0;
 if(parsed.recognized>0)announce("Leitura concluída. Confira cada número antes de aplicar.");
 else announce("Não encontrei atributos reconhecíveis. Tente uma captura da janela 'Atributos do Agente' no jogo.",true);
}
function open(agent){
 if(modal)close();
 if(!agent)return;
 activeAgent=agent;
 modal=document.createElement("div");
 modal.className="lab-scan-backdrop";modal.id="lab-scan-dialog";
 modal.innerHTML='<div class="lab-scan-dialog" role="dialog" aria-modal="true" aria-labelledby="lab-scan-title" tabindex="-1">'+
 '<header><div><small>ANDERUS LAB // LEITURA LOCAL</small><h2 id="lab-scan-title">IMPORTAR ATRIBUTOS POR PRINT</h2><p>Destino: <strong>'+html(agent)+'</strong></p></div><button type="button" class="lab-scan-close" data-scan-close aria-label="Fechar">×</button></header>'+
 '<div class="lab-scan-body"><p>Abra <b>Atributos do Agente</b> dentro do ZZZ, tire um print e selecione a imagem. A captura não é salva na sua conta nem enviada ao nosso servidor.</p>'+
 '<label class="lab-scan-drop"><span>CARREGAR PRINT DE ATRIBUTOS</span><small>PNG, JPG ou WEBP · até 15 MB</small><input type="file" accept="image/png,image/jpeg,image/webp,image/*" data-scan-file></label>'+
 '<div class="lab-scan-image" data-scan-image hidden></div><div class="lab-scan-status" data-scan-status role="status" aria-live="polite">Escolha uma imagem para começar.</div>'+
 '<div class="lab-scan-results" data-scan-results hidden></div>'+
 '<p class="lab-scan-privacy">O reconhecimento roda no seu navegador. Na primeira leitura, os modelos de idioma são baixados de um fornecedor externo; a imagem permanece no dispositivo. Revise os dados antes de confirmar.</p></div>'+
 '<footer><button type="button" class="lab-scan-cancel" data-scan-close>CANCELAR</button><button type="button" class="lab-scan-apply" data-scan-apply disabled>CONFIRMAR E SALVAR</button></footer></div>';
 document.body.appendChild(modal);
 document.body.classList.add("lab-scan-open");
 modal.querySelector(".lab-scan-dialog").focus();
 const cleanup=()=>{document.body.classList.remove("lab-scan-open");};
 const originalClose=close;
 modal.addEventListener("click",e=>{
  if(e.target===modal||e.target.closest("[data-scan-close]")){if(!processing){originalClose();cleanup();}return;}
  if(e.target.closest("[data-scan-apply]"))apply();
 });
 modal.querySelector("[data-scan-file]").addEventListener("change",e=>{const file=e.target.files?.[0];if(file)scan(file);});
 modal.addEventListener("input",e=>{if(e.target.matches("[data-scan-value]")){const key=e.target.dataset.scanValue;const use=modal.querySelector('[data-scan-use="'+key+'"]');if(use){use.checked=e.target.value.trim()!=="";}const apply=modal.querySelector("[data-scan-apply]");if(apply)apply.disabled=false;}});
}
function loadTesseract(){
 if(window.Tesseract?.createWorker)return Promise.resolve(window.Tesseract);
 if(cachePromise)return cachePromise;
 cachePromise=new Promise((resolve,reject)=>{
  const tag=document.createElement("script");tag.src="https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";
  tag.async=true;tag.crossOrigin="anonymous";
  tag.onload=()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(Error("Biblioteca de reconhecimento indisponível"));
  tag.onerror=()=>reject(Error("Não foi possível baixar o reconhecedor de imagens"));
  document.head.appendChild(tag);
 }).catch(err=>{cachePromise=null;throw err;});
 return cachePromise;
}
async function prepare(file,{whole=false,soft=false}={}){
 const objectUrl=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{
   const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error("Imagem não pôde ser aberta"));im.src=objectUrl;
  });
  const w=img.naturalWidth,h=img.naturalHeight,portrait=h/w>1.55;
  // Phone screenshots have decorative wallpaper, navigation bar and app controls.
  // Their attribute sheet normally occupies the middle/lower part of the image.
  // Remove those distractions before OCR and enlarge the actual typography.
  const left=whole?0:Math.round(w*.03),top=whole?0:Math.round(h*(portrait?.225:.045));
  const cropW=whole?w:Math.max(40,w-2*left);
  const cropH=whole?h:Math.max(40,Math.min(h-top,Math.round(h*(portrait?.675:.91))));
  const scale=Math.min(2.3,1850/cropW,2850/cropH);
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(cropW*scale));
  canvas.height=Math.max(1,Math.round(cropH*scale));
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  if(!ctx)throw Error("Canvas de imagem indisponível");
  ctx.drawImage(img,left,top,cropW,cropH,0,0,canvas.width,canvas.height);
  const frame=ctx.getImageData(0,0,canvas.width,canvas.height),data=frame.data;
  for(let i=0;i<data.length;i+=4){
   const luminance=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
   const inverted=255-luminance;
   const value=Math.max(0,Math.min(255,Math.round((inverted-128)*(soft?1.15:1.9)+128)));
   data[i]=value;data[i+1]=value;data[i+2]=value;data[i+3]=255;
  }
  ctx.putImageData(frame,0,0);
  return canvas;
 }finally{URL.revokeObjectURL(objectUrl);}
}
async function scan(file){
 if(processing)return;
 if(!file.type.startsWith("image/")||file.size>15*1024*1024){announce("Selecione uma imagem válida de até 15 MB.",true);return;}
 processing=true;
 modal.querySelector("[data-scan-file]").disabled=true;
 modal.querySelector("[data-scan-apply]").disabled=true;
 modal.querySelector("[data-scan-results]").hidden=true;
 renderPreview(file);
 let worker;
 try{
  announce("Preparando leitura de imagem…");
  const tess=await loadTesseract();
  announce("Carregando modelos de Português e Inglês…");
  try{worker=await tess.createWorker(["por","eng"],1,{logger:m=>{
   if(m.status==="recognizing text")announce("Lendo atributos: "+Math.round((m.progress||0)*100)+"%…");
  }});}
  catch{worker=await tess.createWorker("eng");}
  const canvas=await prepare(file);
  announce("Lendo a área de atributos em alta resolução…");
  try{await worker.setParameters({tessedit_pageseg_mode:"4",preserve_interword_spaces:"1"});}catch{}
  const result=await worker.recognize(canvas);
  let parsed=parseText(result.data?.text||"");
  // Second pass, only if the first did not recover most of the printed stats.
  if(parsed.recognized<8){
   announce("Tentando uma segunda leitura do print…");
   try{await worker.setParameters({tessedit_pageseg_mode:"11"});}catch{}
   const alternate=await prepare(file,{whole:false,soft:true});
   const second=await worker.recognize(alternate);
   const retry=parseText(second.data?.text||"");
   if(retry.recognized>parsed.recognized)parsed=retry;
  }
  showResults(parsed);
 }catch(e){
  announce("Não consegui ler essa imagem automaticamente: "+String(e.message||e)+". Você pode continuar preenchendo os atributos manualmente.",true);
 }finally{
  try{await worker?.terminate();}catch{}
  processing=false;
  if(modal){modal.querySelector("[data-scan-file]").disabled=false;}
 }
}
function apply(){
 if(!modal||processing)return;
 const values={};let invalid=0;
 for(const def of keys){
  const chosen=modal.querySelector('[data-scan-use="'+def.key+'"]');
  if(!chosen?.checked)continue;
  const input=modal.querySelector('[data-scan-value="'+def.key+'"]'),val=parseValue(input?.value,def.key);
  if(val===null){invalid++;input?.classList.add("invalid");continue;}
  values[def.key]=String(val);
 }
 if(invalid){announce("Confira "+invalid+" valor(es) inválido(s) antes de salvar.",true);return;}
 if(!Object.keys(values).length){announce("Marque pelo menos um atributo para atualizar.",true);return;}
 if(Object.hasOwn(values,"bonusDamage")){
  const type=modal.querySelector("[data-scan-element]")?.value||"";
  if(type&&/^(Fogo|Gelo|Éter|Eter|Físico|Fisico|Elétrico|Eletrico|Vento)$/i.test(type))values.bonusDamageElement=type;
 }
 window.dispatchEvent(new CustomEvent("anderus:apply-stats",{detail:{name:activeAgent,stats:values}}));
}
window.addEventListener("anderus:scan-applied",ev=>{
 if(!modal||ev.detail?.name!==activeAgent)return;
 if(ev.detail?.ok){
  announce("✓ "+ev.detail.count+" atributo(s) salvos com sucesso. O aprimoramento foi atualizado.");
  processing=false;
  const field=modal.querySelector("[data-scan-file]");if(field)field.disabled=false;
  const button=modal.querySelector("[data-scan-apply]");if(button){button.disabled=true;button.textContent="SALVO ✓";}
 }else announce("Não foi possível confirmar o salvamento. Confira o armazenamento do navegador.",true);
});
document.addEventListener("click",e=>{
 const button=e.target.closest('[data-v5="scan-open"]');
 if(button){e.preventDefault();open(button.dataset.agent);}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&modal&&!processing){close();document.body.classList.remove("lab-scan-open");}});
})();