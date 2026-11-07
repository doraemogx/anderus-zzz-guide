#!/usr/bin/env python3
"""Mapeia somente rótulos PT-BR e números dos motores, sem reproduzir descrições integrais."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urljoin,urlsplit,quote
from bs4 import BeautifulSoup
from datetime import datetime,timezone
import json,re,unicodedata

ROOT=Path(__file__).resolve().parents[1]
HEAD={"User-Agent":"Mozilla/5.0 Chrome/124 Safari/537.36","Accept-Language":"pt-BR,pt;q=0.9"}
def get(url):
    req=Request(quote(url,safe=':/?&=%'),headers=HEAD)
    with urlopen(req,timeout=30) as r:return BeautifulSoup(r.read(2_500_000),"html.parser")
def norm(s):
    s=unicodedata.normalize("NFKD",s.lower())
    return re.sub("[^a-z0-9]+","",''.join(x for x in s if not unicodedata.combining(x)))
def name_from_link(a):
    head=a.find(["h2","h3","h4"])
    s=head.get_text(" ",strip=True) if head else a.get_text(" ",strip=True)
    for cut in ["ATQ Básico","Base ATK","ATK Básico","ATQ Base"]:
        if cut in s:s=s.split(cut,1)[0]
    return re.sub(r"^\d+","",s.strip()).strip()[:105]
def links(soup):
    result={}
    for a in soup.select("a[href]"):
        href=urlsplit(urljoin("https://zzz.gg",a["href"])).path
        if "/w-engines/" not in href:continue
        slug=href.rsplit("/",1)[-1]
        if not slug or slug=="w-engines":continue
        label=name_from_link(a)
        alltext=a.get_text(" ",strip=True)
        if len(label)<3:continue
        img=a.find("img")
        src=(img.get("src") or img.get("data-src") or img.get("data-lazy-src") or "") if img else ""
        image_key=urlsplit(urljoin("https://zzz.gg",src)).path.rsplit("/",1)[-1].split(".")[0] if src else ""
        result[slug]={"name":label,"text":alltext,"icon":image_key}
    return result
def main():
    obj=json.loads(re.search(r'<script id="db" type="application/json">([\s\S]*?)</script>',(ROOT/"index.html").read_text()).group(1))
    loc=json.loads((ROOT/"data"/"localizacao-ptbr.json").read_text(encoding="utf-8"))
    en=links(get("https://zzz.gg/w-engines"))
    pt=links(get("https://zzz.gg/pt-br/w-engines"))
    mapped={}
    for slug,v in en.items():
        item=next((x for x in obj["engines"] if norm(x["name"])==norm(v["name"])),None)
        if not item or slug not in pt:continue
        ent=pt[slug]
        words=ent["text"].replace(ent["name"],"",1)
        numbers=re.findall(r"(?:\d{1,3}(?:[.,]\d+)?%|\d+(?:[.,]\d+)?\s*s)",words)
        mapped[item["id"]]={"nome":ent["name"],"numeros":list(dict.fromkeys(numbers))[:28],
        "confirmado":True,"base":"lista PT-BR"}
    # Match by editorial name when English list labels differ
    for item in obj["engines"]:
        if item["id"] in mapped:continue
        expected=loc["engines"].get(item["name"],"")
        for slug,v in pt.items():
            if expected and norm(v["name"])==norm(expected):
                words=v["text"].replace(v["name"],"",1)
                nums=list(dict.fromkeys(re.findall(r"(?:\d{1,3}(?:[.,]\d+)?%|\d+(?:[.,]\d+)?\s*s)",words)))
                mapped[item["id"]]={"nome":v["name"],"numeros":nums[:28],"confirmado":True,"base":"lista PT-BR"};break
    # Referência por slug estável, quando o título do card é abreviado ou traduzido.
    # Não aproxima nomes: só aceita slug com correspondência exata normalizada.
    for item in obj["engines"]:
        if item["id"] in mapped:continue
        candidates=[norm(item["name"]),norm(loc["engines"].get(item["name"],""))]
        candidates=[x for x in candidates if len(x)>3]
        exact=next(((slug,v) for slug,v in pt.items() if norm(slug) in candidates),None)
        if exact is None:continue
        slug,v=exact
        words=v["text"].replace(v["name"],"",1)
        nums=list(dict.fromkeys(re.findall(r"(?:\d{1,3}(?:[.,]\d+)?%|\d+(?:[.,]\d+)?\s*s)",words)))
        mapped[item["id"]]={"nome":v["name"],"numeros":nums[:28],"confirmado":True,"base":"slug PT-BR"}
    # O mesmo ícone do jogo possui um ID de arquivo idêntico em todos os idiomas.
    # Isso permite ligar o nome em inglês ao nome PT-BR mesmo com URL traduzida.
    official_images={v["icon"]:(slug,v) for slug,v in pt.items() if len(v.get("icon",""))>6}
    for slug,en_item in en.items():
        icon=en_item.get("icon","")
        if len(icon)<=6 or icon not in official_images:continue
        pt_slug,pt_item=official_images[icon]
        item=next((x for x in obj["engines"] if norm(x["name"])==norm(en_item["name"])),None)
        if not item or item["id"] in mapped:continue
        words=pt_item["text"].replace(pt_item["name"],"",1)
        nums=list(dict.fromkeys(re.findall(r"(?:\\d{1,3}(?:[.,]\\d+)?%|\\d+(?:[.,]\\d+)?\\s*s)",words)))
        mapped[item["id"]]={"nome":pt_item["name"],"numeros":nums[:28],"confirmado":True,"base":"ícone idêntico EN/PT-BR"}
    total=len(mapped)
    data={"version":"4.1","updatedAt":datetime.now(timezone.utc).isoformat(),"engines":mapped}
    (ROOT/"data"/"gear-ptbr.json").write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+"\n",encoding="utf-8")
    (ROOT/"data"/"gear-status.json").write_text(json.dumps({"mapped":total,"allEngines":len(obj["engines"]),"unmapped":[x["name"] for x in obj["engines"] if x["id"] not in mapped]},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Motores com correspondência PT-BR",total,"de",len(obj["engines"]))
if __name__=="__main__":main()
