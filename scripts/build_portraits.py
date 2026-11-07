#!/usr/bin/env python3
"""Gera retratos de rosto/busto padronizados, usando ícones do jogo quando possível.
Fallback: enquadramento de busto a partir da arte previamente verificada.
Não inventa imagens e não mistura identidades.
"""
from __future__ import annotations
import json,re,unicodedata
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter
from io import BytesIO
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
W,H=440,440
SRC=ROOT/"assets"/"agents"
DEST=ROOT/"assets"/"portraits"
DEST.mkdir(parents=True,exist_ok=True)
AGENT_IDS={
"Anby Demara":"01","Nekomata":"11","Nicole Demara":"12","Soldier 11":"05",
"Yidhari":"52","Corin Wickes":"09","Caesar King":"25","Billy Kid":"10",
"Hoshimi Miyabi":"13","Koleda Belobog":"14","Anton Ivanov":"15",
"Ben Bigger":"16","Soukaku":"17","Von Lycaon":"18","Lucy":"27",
"Lighter":"26","Burnice White":"32","Grace Howard":"20",
}
ALIASES={"Rina":["Alexandrina Sebastiane","Rina"],"Hugo":["Hugo Vlad"],"Yuzuha":["Ukinami Yuzuha"],"Piper":["Piper Wheel"],"Alice":["Alice Thymefield"],"Nekomata":["Nekomiya Mana"],"Starlight - Billy":["Starlight Billy Kid","Starlight Billy"],"Lucia":["Lucia Elowen"],"Soldier 0: Anby":["Soldier 0 - Anby"],"Orphie & Magus":["Orphie Magnusson & Magus"],"Vivian":["Vivian Banshee"],"Severian Lowell":["Severian"],"Phoenix":["Phoenix Reffaella"],"Yidhari":["Yidhari Murphy"],"Velina Airgid":["Velina"]}
FORCE_BUST={"Velina Airgid","Sunbringer","Severian Lowell","Robin","Kafka","Pyrois","Remielle Dan","Sigrid de L'Azur","Nangong Yu"}
def norm(s):
  s=unicodedata.normalize("NFKD",s.lower())
  return re.sub("[^a-z0-9]","",''.join(c for c in s if not unicodedata.combining(c)))
def index_circle_ids():
  try:
    url="https://ghost.mwb.moe/en/zenless/avatar_profile"
    req=Request(url,headers={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) Chrome/125 Safari/537.36"})
    with urlopen(req,timeout=15) as r:raw=r.read(2_000_000).decode("utf-8","replace")
    from bs4 import BeautifulSoup
    soup=BeautifulSoup(raw,"html.parser")
    out={}
    for tag in soup.find_all(["tr","a","article","div","li"]):
      txt=tag.get_text(" ",strip=True)
      if len(txt)>200:continue
      ids=re.findall(r"IconRoleCircle(\d+)",str(tag)[:7000])
      if not ids:continue
      for name in names:
        aliases=[name]+ALIASES.get(name,[])
        if any(norm(a) in norm(txt) for a in aliases if len(norm(a))>5):
          out[name]=ids[0];break
    return out
  except Exception as exc:
    print("Index de perfil não acessível:",str(exc)[:160]);return {}
def download_circle(number):
  try:
    url="https://static.nanoka.cc/assets/zzz/IconRoleCircle"+number+".webp"
    req=Request(url,headers={"User-Agent":"Mozilla/5.0 Chrome/125 Safari/537.36"})
    with urlopen(req,timeout=9) as r:
      if r.status!=200:raise ValueError("status")
      content=r.read(2_000_000)
    im=Image.open(BytesIO(content)).convert("RGBA")
    if im.width<100 or im.height<100:raise ValueError("too small")
    return im
  except Exception:return None
# Regiões de rosto/busto conferidas visualmente no arquivo original 424 px.
# Círculos de perfil do jogo são usados diretamente; o crop só é aplicado
# para os personagens cuja imagem verificada era uma arte de corpo inteiro.
FOCUS={
 "Velina Airgid":(146,2,126),
 "Norma Hollowell":(120,52,125),
 "Pyrois":(166,42,108),
 "Starlight - Billy":(143,42,115),
 "Promeia":(150,44,113),
 "Cissia":(170,43,115),
 "Nangong Yu":(178,57,122),
 "Aria":(192,25,120),
 "Sunna":(121,53,114),
 "Zhao":(110,73,126),
 "Seed":(112,12,136),
 "Soldier 0: Anby":(142,17,118),
 "Piper":(121,39,124),
 "Sunbringer":(165,12,220),
}
def paste_portrait(im,name,game_icon=False):
  im=ImageOps.exif_transpose(im.convert("RGBA"))
  if not game_icon and name in FOCUS:
    x,y,side=FOCUS[name]
    # Originais são imagens em 424 px de largura; preserva o mesmo
    # enquadramento relativo se o fornecedor mudar a resolução.
    k=im.width/424
    left,top,width=int(x*k),int(y*k),int(side*k)
    left=max(0,min(left,im.width-width))
    top=max(0,min(top,im.height-width))
    width=min(width,im.width-left,im.height-top)
    im=im.crop((left,top,left+width,top+width))
  else:
    # Uma foto de perfil já quadrada não pode ser reduzida a 200 px e colada
    # no centro de 440: o erro anterior causava personagens minúsculos.
    w,h=im.size
    side=min(w,h)
    left=max(0,(w-side)//2)
    top=max(0,(h-side)//2)
    im=im.crop((left,top,left+side,top+side))
  im=im.resize((W,H),Image.Resampling.LANCZOS)
  canvas=Image.new("RGBA",(W,H),(17,23,29,255))
  from PIL import ImageDraw
  p=ImageDraw.Draw(canvas)
  p.ellipse((-66,-58,W+66,H+70),outline=(43,61,66,255),width=2)
  canvas.alpha_composite(im,(0,0))
  return canvas.convert("RGB")

def main():
  global names
  m=re.search(r'<script id="db" type="application/json">([\s\S]*?)</script>',(ROOT/"index.html").read_text(encoding="utf-8"))
  if not m:raise ValueError("Banco de agentes ausente")
  db=json.loads(m.group(1))
  names=[a["name"] for a in db["agents"]]
  mapped={**AGENT_IDS,**index_circle_ids()}
  result=[]
  def job(a):
    src=SRC/(a["id"]+".webp")
    if not src.exists():return {"name":a["name"],"status":"missing_original"}
    original=Image.open(src).convert("RGBA")
    code=mapped.get(a["name"])
    candidate=download_circle(code) if code else None
    chosen=candidate if candidate else original
    output=paste_portrait(chosen,a["name"],candidate is not None)
    fp=DEST/(a["id"]+".webp")
    output.save(fp,"WEBP",quality=86,method=5)
    check=Image.open(fp)
    if check.size!=(440,440):raise ValueError("Dimensão de saída incorreta")
    return {"id":a["id"],"name":a["name"],"source":"icone_de_perfil" if candidate else "recorte_do_agente","circleID":code,"bytes":fp.stat().st_size,"status":"ok"}
  with ThreadPoolExecutor(max_workers=10) as pool:
    futures=[pool.submit(job,a) for a in db["agents"]]
    for f in as_completed(futures):
      try:result.append(f.result())
      except Exception as exc:result.append({"status":"failed","reason":str(exc)[:120]})
  result.sort(key=lambda x:int(x.get("id","a999").lstrip("a")))
  doc={"updatedAt":datetime.now(timezone.utc).isoformat(),"total":len(result),"ok":sum(x["status"]=="ok" for x in result),"gameIcons":sum(x.get("source")=="icone_de_perfil" for x in result),"fallbackCrops":sum(x.get("source")=="recorte_do_agente" for x in result),"items":result}
  (ROOT/"data"/"portrait-status.json").write_text(json.dumps(doc,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
  print(json.dumps({k:v for k,v in doc.items() if k!="items"},ensure_ascii=False))
if __name__=="__main__":main()
