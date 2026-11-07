#!/usr/bin/env python3
"""Candidatos HD, não substitui retratos de produção sem revisão visual."""
import json,io,concurrent.futures
from pathlib import Path
from urllib.request import urlopen,Request
from PIL import Image,ImageOps
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/"data/media-sources.json").read_text())
sources={x["id"]:x for x in data["agents"]}
focus={
"a1":(146,2,126),"a9":(120,52,125),"a10":(143,20,130),"a11":(143,42,115),
"a12":(150,44,113),"a13":(170,43,115),"a14":(178,57,122),
"a15":(130,31,145),"a16":(118,52,140),"a18":(110,73,126),
"a25":(112,12,136),"a33":(142,17,118),"a58":(121,39,124),
"a62":(165,12,220)
}
def one(id,box):
 entry=sources[id]
 candidates=[u for u in entry["urls"] if u.startswith("https://fastcdn.hoyoverse.com/")]
 if not candidates:return {"id":id,"status":"not_official_source"}
 for url in candidates[:2]:
  try:
   req=Request(url,headers={"User-Agent":"Mozilla/5.0 Chrome/125 Safari/537.36"})
   with urlopen(req,timeout=25) as r:raw=r.read(12_000_000)
   img=ImageOps.exif_transpose(Image.open(io.BytesIO(raw)).convert("RGBA"))
   ow,oh=img.size
   scale=min(424/ow,424/oh)
   xx,yy,ss=box
   crop=[int(xx/scale),int(yy/scale),int((xx+ss)/scale),int((yy+ss)/scale)]
   crop[0]=min(max(0,crop[0]),ow-1)
   crop[1]=min(max(0,crop[1]),oh-1)
   crop[2]=min(ow,max(crop[0]+1,crop[2]))
   crop[3]=min(oh,max(crop[1]+1,crop[3]))
   sq=min(crop[2]-crop[0],crop[3]-crop[1])
   if sq<150:raise ValueError("source not high enough resolution for HD crop")
   cropped=img.crop((crop[0],crop[1],crop[0]+sq,crop[1]+sq))
   cropped=cropped.resize((640,640),Image.Resampling.LANCZOS)
   base=Image.new("RGBA",(640,640),(17,23,29,255))
   base.alpha_composite(cropped)
   out=ROOT/"assets/hd-candidates"/(id+".webp")
   out.parent.mkdir(parents=True,exist_ok=True)
   base.convert("RGB").save(out,"WEBP",quality=91,method=5)
   return {"id":id,"name":entry["name"],"status":"ok","original":[ow,oh],"crop":crop,"size":out.stat().st_size,"url":url}
  except Exception as e:reason=str(e)[:120]
 return {"id":id,"name":entry["name"],"status":"unavailable","error":reason}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
 results=list(ex.map(lambda x:one(*x),focus.items()))
doc={"candidates":results,"count":sum(x["status"]=="ok" for x in results)}
(ROOT/"data/hd-candidates-status.json").write_text(json.dumps(doc,ensure_ascii=False,indent=2)+"\n")
print(json.dumps(doc,ensure_ascii=False))
