#!/usr/bin/env python3
"""Retratos de agentes: prioridade para arte HD original, nunca avatares circulares ampliados.

Mantém as imagens aprovadas da Phoenix e da Velina. Usa candidatos HD já
recortados/validados, depois artes de alta resolução registradas no manifesto,
e finalmente a imagem local sem zoom. Não apaga uma imagem válida se a fonte falhar.
"""
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
from urllib.request import Request, urlopen
import json, re, shutil

ROOT=Path(__file__).resolve().parents[1]
PORTRAITS=ROOT/"assets"/"portraits"
CANDIDATES=ROOT/"assets"/"hd-candidates"
ORIGINALS=ROOT/"assets"/"agents"
PORTRAITS.mkdir(parents=True, exist_ok=True)
OUTPUT=640
MAX_BYTES=16_000_000
PROTECTED={"a0","a1"}  # Referências de qualidade aprovadas pelo usuário
HEADERS={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125 Safari/537.36","Accept":"image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8"}
# Enquadramento de busto (sem close de rosto). Posição no banner original,
# representada como centro horizontal, centro vertical e largura proporcional.
ART_DIRECTION={
 "a2":(0.50,0.39,0.76), # Jane Doe
 "a3":(0.50,0.38,0.78), # Alexandrina / Rina
 "a19":(0.50,0.37,0.78),
 "a20":(0.50,0.39,0.83),
 "a22":(0.50,0.39,0.80),
 "a23":(0.50,0.39,0.80),
 "a24":(0.50,0.38,0.82)
}

def remote_image(url):
    req=Request(url,headers=HEADERS)
    with urlopen(req,timeout=16) as resp:
        if resp.status!=200:raise ValueError("HTTP")
        blob=resp.read(MAX_BYTES+1)
        if len(blob)>MAX_BYTES:raise ValueError("Arquivo grande")
    im=Image.open(BytesIO(blob))
    im.load()
    if min(im.size)<700:raise ValueError("Arte insuficiente para HD")
    if im.format not in {"PNG","JPEG","WEBP","AVIF"}:raise ValueError("Formato")
    return ImageOps.exif_transpose(im.convert("RGBA"))

def crop_composition(im,agent_id,from_highres):
    w,h=im.size
    if not from_highres:
        # A imagem local já foi editada como arte do personagem.
        # Não recortar 120 px de rosto e ampliar para 640 px.
        side=max(w,h)
        base=Image.new("RGBA",(side,side),(18,27,33,255))
        im.thumbnail((side,side),Image.Resampling.LANCZOS)
        base.alpha_composite(im,((side-im.width)//2,(side-im.height)//2))
        return base.resize((OUTPUT,OUTPUT),Image.Resampling.LANCZOS).convert("RGB")
    # Prioriza busto e braços em vez do ícone circular/close excessivo.
    cx,cy,fraction=ART_DIRECTION.get(agent_id,(.50,.39,.80))
    square=int(min(w,h)*fraction)
    left=max(0,min(w-square,int(cx*w-square/2)))
    top=max(0,min(h-square,int(cy*h-square/2)))
    crop=im.crop((left,top,left+square,top+square))
    base=Image.new("RGBA",crop.size,(18,27,33,255))
    base.alpha_composite(crop,(0,0))
    return base.resize((OUTPUT,OUTPUT),Image.Resampling.LANCZOS).convert("RGB")

def main():
    raw=(ROOT/"index.html").read_text(encoding="utf-8")
    match=re.search(r'<script id="db" type="application/json">([\s\S]*?)</script>',raw)
    if not match:raise ValueError("Banco de agentes ausente")
    agents=json.loads(match.group(1))["agents"]
    registry=json.loads((ROOT/"data"/"media-sources.json").read_text(encoding="utf-8"))
    manifests={x["id"]:x for x in registry["agents"]}
    results=[]
    def one(agent):
        id_,name=agent["id"],agent["name"]
        dest=PORTRAITS/(id_+".webp")
        if id_ in PROTECTED and dest.is_file():
            source="retrato_aprovado"
            src=dest
            im=Image.open(dest)
            return {"id":id_,"name":name,"source":source,"width":im.width,"height":im.height,"bytes":dest.stat().st_size,"status":"ok"}
        hd=CANDIDATES/(id_+".webp")
        if hd.is_file() and hd.stat().st_size>12_000:
            with Image.open(hd) as sample:
                if min(sample.size)>=560:
                    shutil.copyfile(hd,dest)
                    return {"id":id_,"name":name,"source":"candidato_hd_curado","width":sample.width,"height":sample.height,"bytes":dest.stat().st_size,"status":"ok"}
        entry=manifests.get(id_,{})
        # Fontes altas resoluções e registradas no manifesto; sem ícones circulares.
        urls=[u for u in entry.get("urls",[]) if u.startswith("https://fastcdn.hoyoverse.com/")]
        urls += [u for u in entry.get("urls",[]) if ("cdn.gachabase.net/" in u or "static.icy-veins.com/" in u) and u not in urls]
        output=None;url_used=None
        for url in urls[:4]:
            try:
                im=remote_image(url)
                output=crop_composition(im,id_,True)
                url_used=url
                break
            except Exception:
                continue
        source="arte_original_hd" if output is not None else "arte_local_sem_zoom"
        if output is None:
            src=ORIGINALS/(id_+".webp")
            if not src.is_file():
                if dest.is_file():
                    with Image.open(dest) as last:
                        return {"id":id_,"name":name,"source":"retrato_anterior_preservado","width":last.width,"height":last.height,"status":"ok"}
                return {"id":id_,"name":name,"status":"missing"}
            output=crop_composition(Image.open(src).convert("RGBA"),id_,False)
        output.save(dest,"WEBP",quality=91,method=5)
        with Image.open(dest) as chk:
            if min(chk.size)<440:raise ValueError("Retrato menor que 440 px")
        return {"id":id_,"name":name,"source":source,"width":output.width,"height":output.height,"bytes":dest.stat().st_size,"url":url_used,"status":"ok"}
    with ThreadPoolExecutor(max_workers=10) as pool:
        tasks={pool.submit(one,a):a for a in agents}
        for f in as_completed(tasks):
            agent=tasks[f]
            try:results.append(f.result())
            except Exception as exc:results.append({"id":agent["id"],"name":agent["name"],"status":"failed","reason":str(exc)[:140]})
    results.sort(key=lambda a:int(a["id"].lstrip("a")))
    count=sum(x["status"]=="ok" for x in results)
    report={"updatedAt":datetime.now(timezone.utc).isoformat(),"total":len(results),"ok":count,
     "sources":{t:sum(x.get("source")==t for x in results) for t in ["retrato_aprovado","candidato_hd_curado","arte_original_hd","arte_local_sem_zoom","retrato_anterior_preservado"]},
     "note":"Ícones circulares de perfil com zoom foram descontinuados; nunca substitui retrato aprovado sem uma alternativa válida.",
     "items":results}
    (ROOT/"data"/"portrait-status.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in report.items() if k!="items"},ensure_ascii=False))
    if count<len(agents):raise RuntimeError("Falha na geração de todos os retratos")
if __name__=="__main__":main()
