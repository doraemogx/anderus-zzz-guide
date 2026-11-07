#!/usr/bin/env python3
"""Espelha retratos de ZZZ de fontes identificadas para assets locais.
Nenhuma imagem é considerada publicada antes de seu download e validação.
"""
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import json
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"data"/"media-sources.json"
STATUS=ROOT/"data"/"media-status.json"
MAX_BYTES=6*1024*1024
SIZES={"agents":(424,424),"engines":(280,280),"discs":(220,220)}
MIN_DIM={"agents":96,"engines":55,"discs":55}
HEADERS={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125 Safari/537.36","Accept":"image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5"}

def valid_url(u):
    return isinstance(u,str) and u.startswith("https://") and any(host in u for host in (
      "fastcdn.hoyoverse.com/","cdn.gachabase.net/","i.gachabase.net/",
      "static.nanoka.cc/","api.hakush.in/","zenless-zone-zero.fandom.com/",
      "static.icy-veins.com/","rackoon.com.br/","img.gachabase.net/","img.4gamers.com.tw/"))

def fetch_img(url,kind):
    req=Request(url,headers=HEADERS)
    with urlopen(req,timeout=12) as rsp:
        if rsp.status!=200:raise ValueError("http "+str(rsp.status))
        data=rsp.read(MAX_BYTES+1)
        if len(data)>MAX_BYTES:raise ValueError("oversized")
    img=Image.open(BytesIO(data))
    if img.width<MIN_DIM[kind] or img.height<MIN_DIM[kind]:raise ValueError("image too small")
    img.load()
    if img.format not in {"PNG","JPEG","WEBP","AVIF"}:raise ValueError("unrecognized image")
    img=ImageOps.exif_transpose(img)
    img.thumbnail(SIZES[kind],Image.Resampling.LANCZOS)
    if img.mode not in ("RGB","RGBA"):img=img.convert("RGBA")
    result=BytesIO()
    img.save(result,"WEBP",quality=84,method=5)
    if result.tell()<500:raise ValueError("empty converted image")
    return result.getvalue(),img.width,img.height

def job(kind,item):
    id_,name=str(item["id"]),item["name"]
    filename=ROOT/"assets"/kind/(id_+".webp")
    filename.parent.mkdir(parents=True,exist_ok=True)
    if filename.exists() and filename.stat().st_size>1200:
        return {"id":id_,"name":name,"status":"ok","source":"local","bytes":filename.stat().st_size}
    attempts=[]
    for url in item.get("urls",[])[:10]:
        if not valid_url(url):continue
        try:
            content,w,h=fetch_img(url,kind)
            filename.write_bytes(content)
            return {"id":id_,"name":name,"status":"ok","source":url,"width":w,"height":h,"bytes":len(content)}
        except (ValueError,HTTPError,URLError,TimeoutError,OSError,UnidentifiedImageError) as ex:
            attempts.append({"url":url[:145],"error":str(ex)[:100]})
    return {"id":id_,"name":name,"status":"missing","attempts":attempts[:5]}

def main():
    src=json.loads(MANIFEST.read_text(encoding="utf-8"))
    futures={}
    results={"agents":[],"engines":[],"discs":[]}
    with ThreadPoolExecutor(max_workers=16) as pool:
        for kind in results:
            for item in src.get(kind,[]):
                futures[pool.submit(job,kind,item)]=kind
        for fut in as_completed(futures):
            kind=futures[fut]
            try:results[kind].append(fut.result())
            except Exception as ex:results[kind].append({"status":"error","reason":str(ex)[:160]})
    for kind,items in results.items():items.sort(key=lambda x:x.get("id",""))
    counts={kind:{"ok":sum(x["status"]=="ok" for x in items),"missing":sum(x["status"]!="ok" for x in items),"total":len(items)} for kind,items in results.items()}
    doc={"checkedAt":datetime.now(timezone.utc).isoformat(),"counts":counts,"results":results,"note":"Arte registrada como OK apenas após obter e decodificar arquivo real. Itens ausentes exigem revisão."}
    STATUS.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(counts,ensure_ascii=False))
    for kind,items in results.items():
        missing=[x.get("name") for x in items if x["status"]!="ok"]
        if missing:print("Missing",kind,":",", ".join(missing))
if __name__=="__main__":main()
