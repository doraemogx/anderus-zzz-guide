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
def paste_portrait(im,forced=False):
  im=ImageOps.exif_transpose(im.convert("RGBA"))
  # Discard transparent empty margins without losing the character's silhouette
  a=im.getchannel("A")
  bbox=a.point(lambda n:255 if n>=20 else 0).getbbox()
  if bbox: im=im.crop(bbox)
  w,h=im.size
  # Framing: square head and shoulders. Keep existing close-up icons as-is.
  opaque_ratio=sum(1 for pix in im.resize((44,44)).getchannel("A").getdata() if pix>120)/(44*44)
  if forced or (h>w*1.08 and opaque_ratio<.63) or (w<h*.69):
    side=max(1,min(w,int(h*.62)))
    center=int(w*.5)
    l=max(0,min(w-side,center-side//2))
    y=max(0,min(int(h*.06),h-side))
    im=im.crop((l,y,l+side,y+side))
  else:
    # square close-up; gently center without clipping the character
    side=max(w,h)
    bg=Image.new("RGBA",(side,side),(0,0,0,0))
    bg.alpha_composite(im,((side-w)//2,(side-h)//2))
    im=bg
  im.thumbnail((420,420),Image.Resampling.LANCZOS)
  canvas=Image.new("RGBA",(W,H),(17,23,29,255))
  # subtle neutral surface, no artificial silhouette/face
  from PIL import ImageDraw
  p=ImageDraw.Draw(canvas)
  p.ellipse((-66,-58,W+66,H+70),outline=(43,61,66,255),width=2)
  canvas.alpha_composite(im,((W-im.width)//2,(H-im.height)//2))
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
    output=paste_portrait(chosen,a["name"] in FORCE_BUST and candidate is None)
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
