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
# Revisions per character: allows the UI to show precisely when a beta
# dossier needs editorial re-check; never invent or blindly replace multipliers.
from html import unescape
beta_targets={
    "Sunbringer":"https://zzz.gachabase.net/agents/1601/sunbringer/beta?lang=en",
    "Robin":"https://zzz.gachabase.net/agents/1661/robin/beta?lang=en",
    "Kafka":"https://zzz.gachabase.net/agents/1651/kafka/beta?lang=en"
}
observed=data.get("betaAgentRevisions") or {}
for name,url in beta_targets.items():
    try:
        page=grab(url)
        visible=unescape(re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",page)))
        found=re.search(r"Last\s+Updated:\s*v(\d+\.\d+\.\d+)\s+Rev\.\s*(\d+)",visible,re.I)
        if not found:
            print("Revisao por agente nao extraida:",name)
            continue
        version,revision=found.groups()
        previous=observed.get(name,{})
        if previous.get("revision") and previous["revision"]!=revision:
            eid="auto-beta-agent-"+name.lower()+"-"+revision
            if eid not in seen:
                entries.append({"id":eid,"date":datetime.now(timezone.utc).date().isoformat(),
                  "kind":"beta","status":"monitoring","title":name+" · nova revisão de kit "+revision,
                  "summary":"Revisão diferente da última observada. Multiplicadores e recomendações precisam ser reconferidos antes de serem publicados nas fichas.",
                  "areas":[name,"Kit beta","Conferir valores"],"url":url,
                  "before":"Rev. "+previous["revision"],"after":"Rev. "+revision})
                seen.add(eid)
        observed[name]={"version":version,"revision":revision,"url":url,"lastChecked":datetime.now(timezone.utc).date().isoformat()}
    except Exception as exc:
        print("Fonte individual indisponivel",name,str(exc)[:100])
data["betaAgentRevisions"]=observed

manual=[x for x in entries if not str(x.get("id","")).startswith("auto-")]
auto=sorted([x for x in entries if str(x.get("id","")).startswith("auto-")],key=lambda x:x.get("date",""),reverse=True)[:30]
data["entries"]=sorted(manual+auto,key=lambda x:x.get("date",""),reverse=True)
data["checkedAt"]=datetime.now(timezone.utc).date().isoformat()
data["note"]="Monitoramento de noticias e revisoes; dados das fichas exigem revisao antes de publicar."
F.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Itens no radar:",len(data["entries"]))

