"""Photo-guided LAMINA shell visualization; NOT a scan or dimensional CAD.
Run: python tools/build_cover.py
Coordinates are traced in the 591x855 reference projection. Depth, material
thickness and foreshortening are artistic estimates. Canonical length ~1 unit;
there is no measured real-world scale. Do not use this mesh for fitting/tooling.
"""
from pathlib import Path
import io, json, struct, math
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
# Clockwise silhouette traced from the supplied top-view photo, not a donor tank.
OUTLINE = np.array([
 [270,22],[313,25],[354,32],[392,49],[433,76],[473,105],
 [512,133],[548,166],[570,205],[579,254],[583,312],[584,365],
 [579,419],[567,473],[550,526],[524,572],[489,611],[463,647],
 [440,680],[422,716],[403,744],[399,775],[390,794],[361,801],
 [273,803],[244,798],[233,787],[231,766],[221,743],[199,720],
 [178,687],[154,650],[124,618],[91,584],[65,544],[43,497],
 [25,448],[12,394],[3,340],[-1,281],[0,230],[15,194],
 [43,162],[79,132],[117,105],[151,80],[183,53],[218,35]
], dtype=float)
C = np.array([295.,325.]); RX,RY=104.,91.
N,R=192,48

def cross(a,b): return a[0]*b[1]-a[1]*b[0]
def outer_hit(d):
    hits=[]
    for a,b in zip(OUTLINE,np.roll(OUTLINE,-1,axis=0)):
        e=b-a; den=cross(d,e)
        if abs(den)<1e-9: continue
        distance=cross(a-C,e)/den; t=cross(a-C,d)/den
        if distance>0 and 0<=t<=1: hits.append(distance)
    if not hits: raise ValueError('Ray missed silhouette')
    return C+d*min(hits)

def span(py):
    xs=[]
    for a,b in zip(OUTLINE,np.roll(OUTLINE,-1,axis=0)):
        if min(a[1],b[1])<=py<max(a[1],b[1]):
            xs.append(a[0]+(py-a[1])*(b[0]-a[0])/(b[1]-a[1]))
    return (min(xs),max(xs)) if len(xs)>1 else (232,399)

positions=[]; uvs=[]
for j in range(R+1):
    v=j/R
    for i in range(N):
        ang=2*math.pi*i/N; d=np.array([math.cos(ang),math.sin(ang)])
        inner=C+np.array([RX*d[0],RY*d[1]])
        p=inner*(1-v)+outer_hit(d)*v
        px,py=p; left,right=span(py)
        q=np.clip((px-(left+right)/2)/max(1,(right-left)/2),-1,1)
        t=np.clip((py-22)/781,0,1)
        # Inferred crown and descending shoulders. Photo is NOT calibrated.
        crown=.245*max(0,1-q*q)**.72*max(0,math.sin(math.pi*t))**.38
        crown*=1-.65*max(0,(t-.84)/.16)
        crown-=.010*math.exp(-(v/.10)**2)  # recessed filler opening lip
        positions.append([(px-295)/781,crown,(py-412)/781])
        uvs.append([px/591,py/855])
positions=np.array(positions,np.float32); uvs=np.array(uvs,np.float32)
faces=[]
for j in range(R):
    for i in range(N):
        a=j*N+i; b=j*N+(i+1)%N; c=(j+1)*N+i; d=(j+1)*N+(i+1)%N
        faces.extend([[a,c,b],[b,c,d]])
faces=np.array(faces,np.uint32)
# Ensure exterior faces point out of the crown.
vec=np.cross(positions[faces[:,1]]-positions[faces[:,0]],positions[faces[:,2]]-positions[faces[:,0]])
if np.mean(vec[:,1])<0: faces=faces[:,[0,2,1]]
normals=np.zeros_like(positions)
vec=np.cross(positions[faces[:,1]]-positions[faces[:,0]],positions[faces[:,2]]-positions[faces[:,0]])
for k in range(3): np.add.at(normals,faces[:,k],vec)
normals/=np.maximum(1e-12,np.linalg.norm(normals,axis=1,keepdims=True))
count=len(positions)
# Offset a thin inner shell rather than filling the entire tank volume.
inside=positions-normals*.006
allpos=np.concatenate([positions,inside]); alluv=np.concatenate([uvs,uvs])
allnorm=np.concatenate([normals,-normals])
insidefaces=faces[:,[0,2,1]]+count
back=[]; flange=[]
for tri in insidefaces:
    (flange if min(tri-count)>=N*(R-2) else back).append(tri)
edges=[]
for j in [0,R]:
    for i in range(N):
        a=j*N+i;b=j*N+(i+1)%N
        pair=[[a,b,a+count],[b,b+count,a+count]]
        if j==0: pair=[t[::-1] for t in pair]
        edges.extend(pair)
primitives=[faces,np.array(back,np.uint32),np.array(flange,np.uint32),np.array(edges,np.uint32)]
# Structural checks include edge incidence, not just aggregate vertex counts.
allfaces=np.concatenate(primitives)
unique_edges,edge_counts=np.unique(np.sort(np.concatenate([allfaces[:,[0,1]],allfaces[:,[1,2]],allfaces[:,[2,0]]]),axis=1),axis=0,return_counts=True)
assert np.all(edge_counts==2), 'Non-manifold shell'
# Shared triangle edges must have opposite directions (consistent winding).
directed=np.concatenate([allfaces[:,[0,1]],allfaces[:,[1,2]],allfaces[:,[2,0]]])
edge_signs=np.where(directed[:,0]<directed[:,1],1,-1)
_,edge_inverse=np.unique(np.sort(directed,axis=1),axis=0,return_inverse=True)
assert np.all(np.bincount(edge_inverse,weights=edge_signs)==0), 'Inconsistent triangle winding'
assert np.isfinite(allpos).all() and np.isfinite(allnorm).all()
areas=np.linalg.norm(np.cross(allpos[allfaces[:,1]]-allpos[allfaces[:,0]],allpos[allfaces[:,2]]-allpos[allfaces[:,0]]),axis=1)
assert areas.min()>1e-10, 'Degenerate triangles'

# Self-contained GLB: all geometry and the reference photograph embedded.
binbuf=bytearray(); views=[]; accessors=[]
def blob(data,target=None):
    while len(binbuf)%4: binbuf.append(0)
    off=len(binbuf); binbuf.extend(data)
    view={'buffer':0,'byteOffset':off,'byteLength':len(data)}
    if target: view['target']=target
    views.append(view);return len(views)-1

def accessor(arr,kind,component,target):
    arr=np.ascontiguousarray(arr)
    view=blob(arr.tobytes(),target)
    a={'bufferView':view,'componentType':component,'count':len(arr),'type':kind}
    if kind=='VEC3': a.update(min=arr.min(axis=0).tolist(),max=arr.max(axis=0).tolist())
    accessors.append(a);return len(accessors)-1
posacc=accessor(allpos,'VEC3',5126,34962)
normacc=accessor(allnorm,'VEC3',5126,34962)
uvacc=accessor(alluv,'VEC2',5126,34962)
meshprims=[]
for idx,tri in enumerate(primitives):
    ia=accessor(tri.reshape(-1).astype('<u4'),'SCALAR',5125,34963)
    meshprims.append({'attributes':{'POSITION':posacc,'NORMAL':normacc,'TEXCOORD_0':uvacc},'indices':ia,'material':idx})
im=Image.open(ROOT/'img/tank-top.jpg').convert('RGB'); im.thumbnail((1024,1536))
out=io.BytesIO();im.save(out,'JPEG',quality=90); imageview=blob(out.getvalue())
materials=[
 {'name':'Photo-derived exterior','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':.04,'roughnessFactor':.48},'extensions':{'KHR_materials_clearcoat':{'clearcoatFactor':.30,'clearcoatRoughnessFactor':.15}},'doubleSided':False},
 {'name':'Estimated inner backing','pbrMetallicRoughness':{'baseColorFactor':[.026,.023,.018,1],'metallicFactor':0,'roughnessFactor':.87}},
 {'name':'Illustrative reinforced edge','pbrMetallicRoughness':{'baseColorFactor':[.16,.12,.045,1],'metallicFactor':0,'roughnessFactor':.84}},
 {'name':'Thin shell cut edge','pbrMetallicRoughness':{'baseColorFactor':[.018,.019,.021,1],'metallicFactor':0,'roughnessFactor':.72},'doubleSided':True}
]
gltf={'asset':{'version':'2.0','generator':'LAMINA photo-guided shell builder','copyright':'User-supplied product photography'},'extensionsUsed':['KHR_materials_clearcoat'],'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'Tank_cover_photo_guided_approximation','mesh':0}],'meshes':[{'name':'Open tank cover shell with through-cut filler opening','primitives':meshprims}],'buffers':[{'byteLength':len(binbuf)}],'bufferViews':views,'accessors':accessors,'images':[{'bufferView':imageview,'mimeType':'image/jpeg'}],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],'textures':[{'source':0,'sampler':0}],'materials':materials,'extras':{'method':'Manually traced silhouette and filler opening from top photo; underside photograph used as qualitative shell reference. No photogrammetry or measured reconstruction.','scale':'UNMEASURED. Normalized visualization units, not physical dimensions.','estimated':['depth','curvature','thickness','backing appearance','foreshortening'],'notFor':['manufacturing','fitment','structural analysis']}}
js=json.dumps(gltf,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
binbuf+=b'\0'*((-len(binbuf))%4)
data=struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(binbuf))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binbuf),b'BIN\0')+binbuf
(ROOT/'model').mkdir(exist_ok=True)
(ROOT/'model/tank-cover-photo.glb').write_bytes(data)
# Portable geometry fallback (same geometry, without material texture).
with (ROOT/'model/tank-cover-photo.obj').open('w') as f:
    f.write('# Photo-guided approximation. Unmeasured scale. NOT production CAD.\n')
    for x,y,z in allpos:f.write(f'v {x:.7f} {y:.7f} {z:.7f}\n')
    for tri in allfaces:f.write('f '+' '.join(str(int(x)+1) for x in tri)+'\n')
report={'vertices':len(allpos),'triangles':len(allfaces),'nonManifoldEdges':int(np.sum(edge_counts!=2)),'degenerateTriangles':int(np.sum(areas<1e-10)),'glbBytes':len(data),'scale':'unmeasured','references':['img/tank-top.jpg','img/tank-under.jpg']}
(ROOT/'model/tank-cover-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
