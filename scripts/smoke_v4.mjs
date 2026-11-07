import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const pageErrors=[];
page.on('pageerror',e=>pageErrors.push(e.message));
await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForSelector('#mobNav button[data-nav="agents"]');
await page.locator('#mobNav button[data-nav="agents"]').click();
await page.waitForSelector('.agentCard');
await page.waitForTimeout(1200);
const count=await page.locator('.agentCard').count();
if(count!==65)throw new Error('Agentes esperados 65, encontrado '+count);
const images=await page.locator('.agentCard img').first().evaluate(async im=>{
  if(!im.complete)await new Promise(resolve=>{im.onload=resolve;im.onerror=resolve;setTimeout(resolve,8500)});
  return {src:im.getAttribute('src'),loaded:im.naturalWidth>0,w:im.naturalWidth};
});
if(!images.loaded)throw new Error('Retrato principal não carregou: '+JSON.stringify(images));
const assetsCheck=await page.evaluate(async()=>{
 const sources=[...Array(65)].map((_,i)=>'assets/portraits/a'+i+'.webp')
  .concat([...Array(106)].map((_,i)=>'assets/engines/w'+i+'.webp'))
  .concat([...Array(32)].map((_,i)=>'assets/discs/d'+i+'.webp'));
 let idx=0,verified=0,failed=[],sizes={};
 async function check(){
  while(idx<sources.length){
   const url=sources[idx++];
   try{
     const r=await fetch(url);
     if(!r.ok)throw new Error('HTTP '+r.status);
     const b=await r.blob(),bitmap=await createImageBitmap(b);
     if(bitmap.width<50||bitmap.height<50)throw new Error('imagem pequena');
     if(url.includes('/portraits/') && bitmap.width!==bitmap.height)throw new Error('retrato não quadrado');
     bitmap.close();verified++;
   }catch(e){failed.push(url+': '+e.message)}
  }
 }
 await Promise.all(Array.from({length:12},check));
 return {verified,total:sources.length,failed:failed.slice(0,20)};
});
if(assetsCheck.failed.length)throw new Error('Artes locais: '+JSON.stringify(assetsCheck));
await page.screenshot({path:'qa-v4-agentes.png',fullPage:false});
await page.locator('.agentCard').first().click();
await page.waitForSelector('#v4-encyclopedia');
await page.waitForTimeout(1200);
await page.screenshot({path:'qa-v4-ficha.png',fullPage:false});
const stats=await page.locator('#v4-encyclopedia .v4-stat').count();
if(stats!==10)throw new Error('Esperadas 10 estatísticas, obtidas '+stats);
const moveCount=await page.locator('#v4-encyclopedia .v4-skill').count();
if(moveCount<10)throw new Error('Movimentos internos incompletos: '+moveCount);
const links=await page.locator('.details a[target="_blank"]').count();
if(links)throw new Error('Ficha ainda possui '+links+' links para site externo');
await page.goBack();
await page.waitForSelector('.agentCard');
await page.locator('#mobNav button[data-nav="engines"]').click();
await page.waitForSelector('.itemCard');
const engineCount=await page.locator('.itemCard').count();
if(engineCount!==106)throw new Error('Esperados 106 motores, encontrado '+engineCount);
await page.waitForTimeout(1000);
const firstEngine=await page.locator('.itemCard').first().innerText();
if(!firstEngine.includes('Anjo na Concha'))throw new Error('Tradução de motores não foi aplicada: '+firstEngine.slice(0,100));
await page.locator('#mobNav button[data-nav="account"]').click();
await page.waitForTimeout(300);
await page.locator('#mobNav button[data-nav="updates"]').click();
await page.waitForSelector('.newsPage');
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
if(overflow>3)throw new Error('Barra horizontal no S25 Edge: '+overflow);
if(pageErrors.length)throw new Error('Erro JS: '+pageErrors.join(' | '));
await page.screenshot({path:'qa-v4-mobile.png',fullPage:false});
console.log(JSON.stringify({status:'PASSOU',viewport:393,agents:count,engineCount,stats,movimentos:moveCount,image:images.src,overflow,assetsCheck},null,2));
await browser.close();
