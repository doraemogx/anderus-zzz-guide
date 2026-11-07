#!/usr/bin/env python3
"""Extrai somente dados factuais (estatísticas, nomes PT-BR, números de habilidades)
de fichas públicas para navegação dentro do guia; não reproduz prosa de terceiros."""
import json,re,time,unicodedata,html as hlib
from pathlib import Path
from urllib.parse import urljoin,urlsplit
from urllib.request import urlopen, Request
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime,timezone

ROOT=Path(__file__).resolve().parents[1]
DB=ROOT/"index.html"
OUT=ROOT/"data"/"encyclopedia.json"
STATUS=ROOT/"data"/"encyclopedia-status.json"
BASE="https://zzz.gg/pt-br/"
HEAD={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36","Accept-Language":"pt-BR,pt;q=0.9,en;q=0.5"}
def fetch(url):
    with urlopen(Request(url,headers=HEAD),timeout=25) as r:
        if r.status!=200:raise ValueError(str(r.status))
        data=r.read(3_000_000)
    return BeautifulSoup(data,"html.parser")
def norm(s):
    s=unicodedata.normalize("NFKD",s.lower().strip())
    return re.sub(r"[^a-z0-9]+","",''.join(c for c in s if not unicodedata.combining(c)))
def txt(node):return node.get_text(" ",strip=True) if node else ""
def line_text(soup):
    if soup.find('main'):soup=soup.find('main')
    for n in soup.find_all(["script","style","nav","footer"]):n.decompose()
    return [x.strip() for x in soup.get_text("\n",strip=True).split("\n") if x.strip()]

def get_links(soup,section):
    links={}
    for a in soup.find_all("a",href=True):
        path=urlsplit(urljoin(BASE,a["href"])).path
        if f"/pt-br/{section}/" not in path:continue
        k=path.rsplit("/",1)[-1]
        if not k:continue
        label=txt(a)
        if label:links[norm(label)]=(k,label)
    return links

ALIASES={
"rin a":"rina","Rina":"rina","Nekomata":"nekomata","Nicole Demara":"nicole","Lucy":"lucy",
"Yuzuha":"yuzuha","Alice":"alice","Hugo":"hugo","Lucia":"lucia",
"Orphie & Magus":"orfeu-magus","Starlight - Billy":"billy-estelar",
"Velina Airgid":"velina","Vivian":"vivian","Ellen Joe":"ellen",
"Koleda Belobog":"koleda","Yidhari":"yidhari","Piper":"piper",
"Soldier 0: Anby":"soldado-n-0-anby","Nangong Yu":"nangong-yu",
"Severian Lowell":"severian","Remielle Dan":"remielle","Norma Hollowell":"norma",
"Sigrid de L'Azur":"sigrid","Roxy Ifrita Pryce":"roxy","Claret Flint":"claret",
"Corin Wickes":"corin","Anby Demara":"anby","Billy Kid":"billy",
"Komano Manato":"manato","Tsukishiro Yanagi":"yanagi","Hoshimi Miyabi":"miyabi",
"Caesar King":"caesar","Grace Howard":"grace","Burnice White":"burnice",
"Anton Ivanov":"anton","Asaba Harumasa":"harumasa","Soldier 11":"n-11",
"Von Lycaon":"lycaon","Evelyn Chevalier":"evelyn","Pulchra":"pulchra",
"Ju Fufu":"ju-fufu","Pan Yinhu":"pan-yinhu","Promeia":"promeia",
"Cissia":"cissia","Sunbringer":"sunbringer","Robin":"robin","Kafka":"kafka"}
ATTRS=["PV","ATQ","DEF","Impacto","Taxa CRIT","Dano CRIT","Maestria de Anomalia","Proficiência de Anomalia","Taxa de Perfuração","Recuperação de Energia"]
KEYS={"pv":"PV","atk":"ATQ","def":"DEF","impacto":"Impacto","taxacrit":"Taxa CRIT","danocrit":"Dano CRIT","maestriadeanomalia":"Maestria de Anomalia","proficienciadeanomalia":"Proficiência de Anomalia","taxadeperfuracao":"Taxa de Perfuração","recuperacaodeenergia":"Recuperação de Energia"}
CAT=("Ataque Básico:","Ataque Especial:","Ataque Especial Reforçado:","Contraesquiva:","Ataque Rápido:","Ataque em Cadeia:","Supremo:","Assistência")
def find_slug(agent,links):
    variants=[agent["name"],ALIASES.get(agent["name"],""),agent["name"].split()[0]]
    for v in variants:
        if norm(v) in links:return links[norm(v)][0]
    for v in variants:
        if not v:continue
        candidate=norm(v)
        for k,(slug,lab) in links.items():
            if candidate and (candidate==norm(slug) or candidate==k):return slug
    v=ALIASES.get(agent["name"],agent["name"])
    return re.sub(r"[^a-z0-9]+","-",unicodedata.normalize("NFKD",v.lower()).encode("ascii","ignore").decode()).strip("-")

def extract_stats(soup):
    heading=next((x for x in soup.find_all(["h2","h3"]) if "Escalonamento de Estatísticas" in txt(x)),None)
    if not heading:return {}
    table=heading.find_next("table")
    if not table:return {}
    d={}
    for tr in table.find_all("tr"):
        td=[txt(x) for x in tr.find_all(["td","th"])]
        if len(td)<3:continue
        key=KEYS.get(norm(td[0]))
        if key:d[key]={"lv1":td[-2],"lv60":td[-1]}
    return d

def extract_skills(soup):
    start=next((x for x in soup.find_all(["h2","h3"]) if "Lista de Habilidades de" in txt(x)),None)
    if not start:return []
    lines=line_text(soup)
    start_idx=next((i for i,x in enumerate(lines) if "Lista de Habilidades de" in x),-1)
    if start_idx<0:return []
    lines=lines[start_idx+1:]
    out=[];current=None;seen=set()
    for i,line in enumerate(lines):
        l=line.strip()
        if l.startswith(("Ataque Básico:","Ataque Especial:","Ataque Especial Reforçado:","Ataque em Cadeia:","Supremo:","Ataque Rápido:","Contraesquiva:","Assistência","Esquiva:","Passiva Principal:","Habilidade Extra:")) and len(l)<135:
            if current and (current.get("numeros") or current.get("nome")):out.append(current)
            current={"nome":l,"nivel":"1","numeros":[]}
            if len(out)>80:break
            continue
        if not current:continue
        if (l.startswith("Nível ") or l.startswith("Nivel ")) and l.split()[-1].isdigit():
            current["nivel"]=l.split()[-1];continue
        is_metric=any(x in norm(l) for x in ["multiplicador","atordoamento","fulgor","energia","taxa","dano","recuperacao","proficiência","maestria","chance","duracao","limite"])
        if is_metric and len(l)<115 and i+1<len(lines):
            nxt=lines[i+1].strip()
            if re.fullmatch(r"[0-9][0-9.,]*%?|[0-9]+(?:\.[0-9]+)?s",nxt):
                key=norm(l)+"="+nxt
                if key not in seen and len(current["numeros"])<30:
                    current["numeros"].append({"metrica":l,"valor":nxt})
                    seen.add(key)
    if current:out.append(current)
    return out[:65]

def build_skill_prio(lines):
    i=next((i for i,x in enumerate(lines) if x.startswith("Ordem de Habilidades")),None)
    return " ".join(lines[i+1:i+8])[:240] if i is not None else ""
def find_build(lines):
    out={}
    for i,line in enumerate(lines):
        if line.startswith("Atributo Principal"):
            out["principais"]=" · ".join(lines[i+1:i+5])[:260]
        if line.startswith("Atributos Secundários"):
            out["secundarios"]=" · ".join(lines[i+1:i+3])[:260]
    return out

def parse_one(a,links):
    slug=find_slug(a,links)
    urls=[BASE+"characters/"+slug]
    if slug!=a["name"].lower().replace(" ","-"):
        urls.append(BASE+"characters/"+a["name"].lower().replace(" ","-"))
    err=[]
    for url in urls:
        try:
            soup=fetch(url)
            if "Lista de Habilidades" not in txt(soup) and "Escalonamento de Estatísticas" not in txt(soup):
                raise ValueError("Sem ficha detalhada")
            lines=line_text(soup)
            heading=soup.find("h1")
            result={"id":a["id"],"name":a["name"],"ptName":txt(heading)[:90] if heading else a["name"],"situacao":"beta" if a.get("beta") else "publicado",
                    "stats":extract_stats(soup),"habilidades":extract_skills(soup),
                    "prioridade":build_skill_prio(lines),"build":find_build(lines),"reference":url}
            result["qualidade"]={"estatisticas":bool(result["stats"]),"movimentos":len(result["habilidades"]),"metricas":sum(len(x["numeros"]) for x in result["habilidades"])}
            return result
        except Exception as exc:err.append(str(exc)[:100])
    return {"id":a["id"],"name":a["name"],"ptName":a["name"],"situacao":"beta" if a.get("beta") else "revisao","stats":{},"habilidades":[],"prioridade":"","build":{},"reference":None,"erro":"; ".join(err[:2])[:240],"qualidade":{"estatisticas":False,"movimentos":0,"metricas":0}}

def main():
    html=DB.read_text(encoding="utf-8")
    match=re.search(r'<script id="db" type="application/json">([\s\S]*?)</script>',html)
    if not match:raise RuntimeError("Banco de dados do site nao encontrado")
    db=json.loads(match.group(1))
    try:links=get_links(fetch(BASE+"characters"),"characters")
    except Exception as exc:print("Falha no indice:",str(exc));links={}
    found=[]
    with ThreadPoolExecutor(max_workers=7) as pool:
        jobs={pool.submit(parse_one,a,links):a for a in db["agents"] if not a.get("beta")}
        for fut in as_completed(jobs):
            a=jobs[fut]
            try:found.append(fut.result())
            except Exception as e:found.append({"id":a["id"],"name":a["name"],"stats":{},"habilidades":[],"erro":str(e)[:180]})
    found.sort(key=lambda a:int(a["id"].lstrip("a")))
    summary={"agents":len(found),"stats":sum(bool(a.get("stats")) for a in found),"withSkills":sum(bool(a.get("habilidades")) for a in found),"numericFacts":sum(sum(len(s["numeros"]) for s in a.get("habilidades",[])) for a in found),"failed":[a.get("name") for a in found if not a.get("stats")]}
    data={"version":"4.0","updatedAt":datetime.now(timezone.utc).isoformat(),"source":"zzz.gg/pt-br game data","scope":"Somente estatisticas e valores numericos factuais; beta nao tem valores finais.","agents":{a["id"]:a for a in found}}
    OUT.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+"\n",encoding="utf-8")
    STATUS.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(summary,ensure_ascii=False))
if __name__=="__main__":main()
