#!/usr/bin/env python3
"""Atualiza apenas o radar de publicacoes. Nao modifica automaticamente kits ou builds."""
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from email.utils import parsedate_to_datetime
import json, re, xml.etree.ElementTree as ET
F=Path(__file__).resolve().parents[1]/"data"/"updates.json"
data=json.loads(F.read_text(encoding="utf-8"))
entries=data.get("entries", [])
seen={str(x.get("id")) for x in entries}
def grab(url):
    req=Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; Anderus-ZZZ-Guide/1.0)"})
    with urlopen(req,timeout=20) as r: return r.read(2_000_000).decode("utf-8","replace")
try:
    root=ET.fromstring(grab("https://store.steampowered.com/feeds/news/app/4162040/?cc=us&l=english"))
    for el in root.findall(".//item")[:10]:
        title=(el.findtext("title") or "").strip()
        link=(el.findtext("link") or "").strip()
        guid=(el.findtext("guid") or link).strip()
        if not title or not link.startswith(("https://","http://")): continue
        id_="auto-official-"+re.sub(r"[^a-z0-9]","",guid.lower())[-40:]
        if id_ in seen: continue
        try: date=parsedate_to_datetime((el.findtext("pubDate") or "").strip()).date().isoformat()
        except Exception: date=datetime.now(timezone.utc).date().isoformat()
        entries.append({"id":id_,"date":date,"kind":"official","status":"monitoring","title":title[:160],"summary":"Nova publicacao do canal oficial via Steam. Consulte o anuncio; as fichas nao foram alteradas automaticamente.","areas":["Noticias oficiais"],"url":link})
        seen.add(id_)
except Exception as e: print("Fonte oficial indisponivel:",e)
try:
    beta=grab("https://zzz.gachabase.net/changelog/beta?lang=en")
    plain=re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",beta))
    hits=re.findall(r"v(\d+\.\d+\.\d+)\s+Rev\.\s*(\d+)",plain)
    if hits:
        version,revision=hits[0]
        data["betaVersion"]=version
        data["betaRevision"]=revision
        id_="auto-beta-"+version.replace(".","-")+"-"+revision
        if id_ not in seen:
            entries.append({"id":id_,"date":datetime.now(timezone.utc).date().isoformat(),"kind":"beta","status":"monitoring","title":f"Nova revisao de teste v{version} · {revision}","summary":"Revisao beta detectada; numeros requerem curadoria antes de alterar fichas.","areas":["Beta","Pendente de validacao"],"url":"https://zzz.gachabase.net/changelog/beta?lang=en"})
except Exception as e: print("Fonte beta indisponivel:",e)
manual=[x for x in entries if not str(x.get("id","")).startswith("auto-")]
auto=sorted([x for x in entries if str(x.get("id","")).startswith("auto-")],key=lambda x:x.get("date",""),reverse=True)[:30]
data["entries"]=sorted(manual+auto,key=lambda x:x.get("date",""),reverse=True)
data["checkedAt"]=datetime.now(timezone.utc).date().isoformat()
data["note"]="Monitoramento de noticias e revisoes; dados das fichas exigem revisao antes de publicar."
F.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Itens no radar:",len(data["entries"]))

