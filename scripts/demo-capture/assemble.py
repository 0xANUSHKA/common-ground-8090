#!/usr/bin/env python3
"""Trim/label real screen recordings. Usage: python3 scripts/demo-capture/assemble.py manifest.json
Does not upload, overwrite a source clip, or invent missing footage. Narration is optional.
"""
import json,sys,subprocess,tempfile,pathlib,math
p=pathlib.Path(sys.argv[1]).resolve();m=json.loads(p.read_text());base=p.parent
resolve=lambda s:(base/s).resolve()
out=resolve(m.get('output','common-ground-submission.mp4'))
clips=m.get('clips',[])
if not clips: raise SystemExit('Add actual footage clips to the manifest first.')
paths=[resolve(c['path']) for c in clips]
if out in paths or out==p or out.exists(): raise SystemExit('Choose a new output path; existing files are preserved.')
for c,path in zip(clips,paths):
 if not path.is_file(): raise SystemExit(f'Missing footage: {path}')
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(path)]))
 a=float(c.get('in',0));d=float(c['duration'])
 if not all(math.isfinite(x) for x in [a,d]) or a<0 or d<=0 or a+d>duration+.1: raise SystemExit(f'Invalid trim for {path.name}: clip is {duration:.2f}s')
 if c.get('role') not in ['anushka','connor','overview']: raise SystemExit('role must be anushka, connor, or overview')
with tempfile.TemporaryDirectory(prefix='common-ground-edit-') as t:
 tmp=pathlib.Path(t);pieces=[]
 for i,(c,path) in enumerate(zip(clips,paths)):
  dest=tmp/f'{i:02}.mp4';pieces.append(dest)
  label={'anushka':'ANUSHKA / SOURCE TEAM','connor':'CONNOR / RECEIVING TEAM','overview':'COMMON GROUND'}[c['role']]
  vf=f"scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1"
  subprocess.run(['ffmpeg','-v','error','-n','-ss',str(c.get('in',0)),'-i',str(path),'-t',str(c['duration']),'-an','-vf',vf,'-r','30','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p',str(dest)],check=True)
 concat=tmp/'clips.txt';concat.write_text('\n'.join(f"file '{x.name}'" for x in pieces))
 joined=tmp/'joined.mp4';subprocess.run(['ffmpeg','-v','error','-n','-f','concat','-safe','1','-i',str(concat),'-c','copy',str(joined)],check=True)
 out.parent.mkdir(parents=True,exist_ok=True)
 # A standard subtitle track works even when ffmpeg was built without drawtext/libass.
 def stamp(t):
  ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
 captions=[];at=0
 for i,c in enumerate(clips):
  d=float(c['duration']);label={'anushka':'ANUSHKA / SOURCE TEAM','connor':'CONNOR / RECEIVING TEAM','overview':'COMMON GROUND'}[c['role']]
  captions.append(f'{i+1}\n{stamp(at)} --> {stamp(at+d)}\n{label}\n');at+=d
 subs=tmp/'roles.srt';subs.write_text('\n'.join(captions))
 cmd=['ffmpeg','-v','error','-n','-i',str(joined),'-i',str(subs)]
 if m.get('narration'):
  audio=resolve(m['narration'])
  if not audio.is_file(): raise SystemExit('Narration file missing')
  cmd+=['-i',str(audio),'-map','0:v','-map','2:a','-map','1:0','-af','apad','-t',str(at),'-c:a','aac','-b:a','192k']
 else: cmd+=['-map','0:v','-map','1:0']
 cmd+=['-c:v','copy','-c:s','mov_text','-metadata:s:s:0','title=Operator','-disposition:s:0','default','-movflags','+faststart',str(out)]
 subprocess.run(cmd,check=True)
print('Saved real-footage edit:',out)
