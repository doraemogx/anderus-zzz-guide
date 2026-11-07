import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
const report={};
for(const width of [360,393,412,1280]){
 const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1,isMobile:width<700,hasTouch:width<700});
 const errs=[];page.on('pageerror',e=>errs.push(e.message));
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:60000});
 if(!await page.locator('#and-v5').count()){
  await page.addStyleTag({url:'http://127.0.0.1:8765/assets/anderus-v5.css'});
  await page.addScriptTag({url:'http://127.0.0.1:8765/assets/anderus-v5.js'});
 }
 await page.waitForSelector('.v5-home',{timeout:15000});
 if(await page.locator('.v5-quick-card').count()!==4)throw Error('Home quick links: expected 4');
 if(await page.locator('.v5-bottom button').count()!==5)throw Error('Bottom nav: expected 5');
 await page.locator('.v5-bottom [data-to="encyclopedia"]').click();
 await page.waitForSelector('.v5-agent-tile');
 if(await page.locator('.v5-agent-tile').count()!==65)throw Error('Expected 65 agents');
 await page.evaluate(()=>window.scrollTo(0,550));
 await page.waitForTimeout(100);
 const previousScroll=await page.evaluate(()=>window.scrollY);
 await page.locator('.v5-agent-tile[data-id="a40"]').click();
 await page.waitForSelector('.v5-agent-head');
 await page.goBack();
 await page.waitForSelector('.v5-agent-tile[data-id="a40"]');
 await page.waitForTimeout(180);
 const restoredScroll=await page.evaluate(()=>window.scrollY);
 if(previousScroll>90&&Math.abs(restoredScroll-previousScroll)>70)throw Error('Voltar não preservou posição na lista: '+previousScroll+' -> '+restoredScroll);
 await page.locator('.v5-agent-tile[data-id="a0"]').click();
 await page.locator('.v5-tabscroll [data-sub="mind"]').click();
 await page.waitForSelector('.v5-mind');
 if(await page.locator('.v5-mind').count()!==6)throw Error('Expected all six Mindscapes');
 if(!await page.locator('.v5-mind').first().innerText().then(s=>s.includes('Dor Residual')))throw Error('Phoenix M1 not loaded');
 await page.locator('.v5-tabscroll [data-sub="skills"]').click();
 const count=await page.locator('.v5-skill').count();if(count<10)throw Error('Abilities incomplete '+count);
 await page.locator('.v5-tabscroll [data-sub="build"]').click();
 if(await page.locator('.v5-gear').count()<2)throw Error('Build images missing');
 await page.locator('.v5-bottom [data-to="account"]').click();
 await page.waitForSelector('.v5-account');
 if(!await page.locator('.v5-editor').isVisible())throw Error('Account editor missing');
 await page.locator('[data-v5-build="level"]').fill('60');
 await page.locator('[data-v5-build="level"]').blur();
 const owned=await page.evaluate(()=>JSON.parse(localStorage.getItem('ANDERUS_PROXY_OS_v2')));
 if(Number(owned.saved.Phoenix.level)!==60)throw Error('Account not persisted in same key');
 await page.locator('.v5-editor [data-to="endgame"]').click();
 await page.waitForSelector('.v5-mode-nav');
 if(await page.locator('.v5-mode-nav button').count()!==8)throw Error('Expected 8 endgame modes');
 await page.locator('.v5-bottom [data-to="radar"]').click();
 await page.waitForSelector('.v5-radar-head');
 await page.locator('.v5-radar-tabs [data-id="beta"]').click();
 if(await page.locator('.v5-news').count()<1)throw Error('Beta feed empty');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 if(overflow>4)throw Error('Horizontal overflow '+width+': '+overflow);
 if(errs.length)throw Error('JS errors '+width+': '+errs.join(' // '));
 if(width===393){await page.locator('.v5-bottom [data-to="home"]').click();await page.screenshot({path:'v5-hibrida-s25-edge.png',fullPage:true});}
 report[width]={agents:65,mindscapes:6,skills:count,endgame:8,overflow,errors:0};
 await page.close();
}
console.log(JSON.stringify({status:'PASSOU',report},null,2));
await browser.close();
