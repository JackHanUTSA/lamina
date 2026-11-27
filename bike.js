/* ═══════════════════════════════════════════════════════════════════════
   LAMINA — scroll-scrubbed teardown rig

   Loads a real modelled sport bike (CC0, unbranded, metre scale),
   buckets its 599 named parts into assemblies, and scrubs them through:

     0.00-0.18  assembled, slow orbit
     0.18-0.42  parts explode outward
     0.42-0.58  camera pushes in on the fuel tank
     0.58-0.74  tank swaps painted -> LAMINA carbon twill
     0.74-1.00  reassembles, LAMINA parts edged in hi-vis

   The GLB is ~7 MB, so it is fetched lazily when the section approaches.
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {HV, buildEnvironment, contactShadow, GROUPS} from './bike-model.js';

const host = document.getElementById('rig');
if (host) boot();

function boot(){
  const reduce  = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const canvas  = document.getElementById('rig-canvas');
  const stick   = host.querySelector('.rig__sticky');
  const label   = document.getElementById('rig-label');
  const stageEl = document.getElementById('rig-stage');

  const qa = new URLSearchParams(location.search).get('rigp');
  const isPinned = qa !== null;

  let renderer;
  try{
    renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true,
                                        preserveDrawingBuffer:isPinned});
  }catch(e){ return fail(); }
  if(!renderer || !renderer.getContext()) return fail();
  function fail(){ host.classList.add('rig--failed'); }

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 120);
  const envMap = buildEnvironment(renderer);
  scene.environment = envMap;

  scene.add(new THREE.HemisphereLight(0xaebfd4, 0x0d1013, .45));
  const key = new THREE.DirectionalLight(0xffffff, 1.35); key.position.set(2.6,3.4,2.2); scene.add(key);
  const rim = new THREE.DirectionalLight(HV, .45);         rim.position.set(-2.4,1.3,-2.6); scene.add(rim);

  /* Carbon needs relief, not just a picture of a weave: the normal map is
     what makes the tows catch the environment and read as cloth under clear. */
  const TL = new THREE.TextureLoader();
  const REP = new THREE.Vector2(1, 1);   // scale comes from the projected UVs
  function tex(url, srgb){
    const t = TL.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.copy(REP);
    t.anisotropy = 8;
    if(srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  /* The GLB's UVs are degenerate for our purposes (V is constant across
     most vertices), so a weave mapped through them smears into nothing.
     Box-project fresh UVs from world position instead, at a real tow pitch. */
  const TOW_TILE = 0.052;          // metres covered by one 8-tow tile ~= 6.5mm pitch
  function boxProjectUV(srcGeo, tile){
    const geo = srcGeo.clone();
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const uv  = new Float32Array(pos.count*2);
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i);
      const nx=Math.abs(nor?nor.getX(i):0), ny=Math.abs(nor?nor.getY(i):1), nz=Math.abs(nor?nor.getZ(i):0);
      let u,v;
      if(nx>=ny && nx>=nz){ u=z; v=y; }        // facing X -> project ZY
      else if(ny>=nx && ny>=nz){ u=x; v=z; }   // facing Y -> project XZ
      else { u=x; v=y; }                       // facing Z -> project XY
      uv[i*2]=u/tile; uv[i*2+1]=v/tile;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv,2));
    return geo;
  }

  const carbonMat = new THREE.MeshPhysicalMaterial({
    map:          tex('img/twill-color.png', true),
    normalMap:    tex('img/twill-normal.png', false),
    roughnessMap: tex('img/twill-rough.png', false),
    normalScale:  new THREE.Vector2(1.15, 1.15),
    color:0xffffff, metalness:.28, roughness:1.0,
    clearcoat:1, clearcoatRoughness:.035,
    transparent:true, opacity:0, envMap, envMapIntensity:1.25
  });

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const seg=(p,a,b)=>clamp((p-a)/(b-a),0,1);
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const easeOut=t=>1-Math.pow(1-t,3);
  const STAGES=[[0,'Assembled'],[.18,'Exploding'],[.42,'Fuel tank'],[.58,'Carbon swap'],[.74,'Reassembled']];

  let ready=false, groups=[], tankGroup=null, carbonMesh=null;
  let R0=1, CENTER=new THREE.Vector3(), TANKPT=new THREE.Vector3();
  const _look=new THREE.Vector3();

  function setLabel(t){ if(label && label.textContent!==t) label.textContent=t; }

  /* ---------- load ---------- */
  function load(){
    if(load.started) return; load.started=true;
    setLabel('Loading…');
    new GLTFLoader().load('model/sportbike.glb', gltf=>{
      const root = gltf.scene;

      /* restyle: the asset ships red paint. Dark graphite keeps the brand
         palette and makes the carbon swap unmistakable. */
      root.traverse(o=>{
        if(!o.isMesh) return;
        const m=o.material; if(!m) return;
        const n=(m.name||'').toLowerCase();
        m.envMap=envMap; m.envMapIntensity=1.15;
        if(n.includes('red outdoor paint')){
          m.color.setHex(0x20252b); m.metalness=.30; m.roughness=.24;
          if('clearcoat' in m){ m.clearcoat=1; m.clearcoatRoughness=.06; }
        }else if(n.includes('warm white outdoor paint')){
          m.color.setHex(0x8e969f); m.metalness=.25; m.roughness=.3;
        }else if(n.includes('tyre rubber')){ m.color.setHex(0x0d0f12); m.roughness=.95; }
        else if(n.includes('saddle leather')){ m.color.setHex(0x14171b); m.roughness=.82; }
        m.needsUpdate=true;
      });

      /* bucket the named nodes into assemblies, preserving world transforms */
      const buckets={};
      for(const g of GROUPS){
        const grp=new THREE.Group(); grp.userData.ex=new THREE.Vector3(...g.ex);
        grp.userData.carbon=!!g.carbon; grp.userData.hero=!!g.hero;
        buckets[g.key]=grp; scene.add(grp); groups.push(grp);
      }
      const rest=new THREE.Group(); rest.userData.ex=new THREE.Vector3(0,0,0);
      scene.add(rest); groups.push(rest);

      const meshes=[]; root.traverse(o=>{ if(o.isMesh) meshes.push(o); });
      const norm = o => (o.name||'').replace(/_/g,' ');
      let matched=0;
      for(const o of meshes){
        /* three.js sanitises glTF node names: spaces become underscores
           ("Drive chain roller 1" -> "Drive_chain_roller_1"), which silently
           broke every multi-word rule. Normalise before testing. */
        const name=(o.name||'').replace(/_/g,' ');
        const g=GROUPS.find(G=>G.test(name));
        (g ? buckets[g.key] : rest).attach(o);   // attach() keeps world transform
        if(g) matched++;
      }

      tankGroup=buckets.tank;

      /* carbon twin of the tank shell */
      /* names are underscore-sanitised by three.js - normalise here too,
         or the hero mesh is never found and no carbon twin is ever made */
      const tankMesh=[];
      tankGroup.traverse(o=>{
        if(o.isMesh && /fuel\s*tank/i.test((o.name||'').replace(/_/g,' '))) tankMesh.push(o);
      });
      if(tankMesh.length){
        const src=tankMesh[0];
        carbonMesh=new THREE.Mesh(boxProjectUV(src.geometry, TOW_TILE), carbonMat);
        /* Share the source's PARENT and copy its LOCAL transform. Setting a
           world transform then calling attach() depends on a matrixWorld that
           has not been computed yet, which silently parked the twin elsewhere. */
        carbonMesh.position.copy(src.position);
        carbonMesh.quaternion.copy(src.quaternion);
        carbonMesh.scale.copy(src.scale).multiplyScalar(1.004);
        src.parent.add(carbonMesh);
        carbonMesh.userData.src=src;
      }

      /* hi-vis outline on the parts LAMINA makes */
      for(const g of groups){
        if(!g.userData.carbon) continue;
        g.traverse(o=>{
          if(!o.isMesh || o===carbonMesh) return;
          const e=new THREE.LineSegments(
            new THREE.EdgesGeometry(o.geometry, 38),
            new THREE.LineBasicMaterial({color:HV, transparent:true, opacity:0, depthWrite:false}));
          o.add(e);
          (g.userData.edges ||= []).push(e.material);
        });
      }

      /* ground the model and frame it */
      const box=new THREE.Box3();
      for(const g of groups) box.expandByObject(g);   // bike only, never lights
      const sph=box.getBoundingSphere(new THREE.Sphere());
      R0=sph.radius; CENTER.copy(sph.center);
      const tb=new THREE.Box3().setFromObject(tankGroup);
      tb.getCenter(TANKPT);
      for(const g of groups) g.userData.home=g.position.clone();

      scene.add(contactShadow(box.max.x-box.min.x, 0.9));

      ready=true;
      host.dataset.parts=meshes.length;
      host.dataset.matched=matched;
      setLabel('Assembled');
      if(isPinned) renderPinned(); else { dirty=true; loop(); }
    },
    undefined,
    err=>{ console.warn('GLB load failed', err); fail(); });
  }

  /* ---------- timeline ---------- */
  function apply(p){
    if(!ready) return;
    const out=seg(p,.18,.42), back=seg(p,.74,1), amt=easeOut(out)*(1-easeOut(back));
    const focus=seg(p,.42,.58)*(1-seg(p,.74,.88));
    const swap=seg(p,.58,.74);

    for(const g of groups){
      const ex=g.userData.ex, home=g.userData.home;
      if(!home) continue;
      const k=(g===tankGroup)? amt*.22 : amt;      // tank holds; the camera travels
      g.position.set(home.x+ex.x*k, home.y+ex.y*k, home.z+ex.z*k);
      if(g.userData.edges){
        const o=(g===tankGroup)? (.16+swap*.70) : (.07+amt*.26);
        for(const mat of g.userData.edges) mat.opacity=o;
      }
    }
    carbonMat.opacity=easeOut(swap);
    if(carbonMesh && carbonMesh.userData.src) carbonMesh.userData.src.visible = swap < .99;

    const push=ease(focus);
    const radius=THREE.MathUtils.lerp(R0*(1+amt*.26), .32, push);
    const vF=THREE.MathUtils.degToRad(camera.fov);
    const hF=2*Math.atan(Math.tan(vF/2)*camera.aspect);
    const dist=radius/Math.sin(Math.max(.12,Math.min(vF,hF)/2))*0.94;
    const spin=(.52+p*1.08)*Math.PI*.5;
    const elev=THREE.MathUtils.lerp(.12,.30,push);
    _look.lerpVectors(CENTER,TANKPT,push);
    camera.position.set(_look.x+Math.cos(spin)*Math.cos(elev)*dist,
                        _look.y+Math.sin(elev)*dist,
                        _look.z+Math.sin(spin)*Math.cos(elev)*dist);
    camera.lookAt(_look);

    let s=STAGES[0][1]; for(const [t,n] of STAGES) if(p>=t) s=n;
    setLabel(s);
    if(stageEl) stageEl.style.setProperty('--sp',(p*100).toFixed(1)+'%');
  }

  function resize(){
    const r=(stick||host).getBoundingClientRect();
    const w=Math.max(1,Math.round(r.width)), h=Math.max(1,Math.round(r.height||innerHeight));
    renderer.setSize(w,h,false);
    camera.aspect=w/h; camera.updateProjectionMatrix();
  }
  function readProgress(){
    const r=host.getBoundingClientRect(); const span=r.height-innerHeight;
    return span<=0?0:clamp(-r.top/span,0,1);
  }

  let visible=false, raf=null, dirty=true, progress=-1;
  new IntersectionObserver(es=>{
    visible=es[0].isIntersecting;
    if(visible) load();                       // lazy: 7 MB only when near
    if(isPinned) return;
    if(visible){ dirty=true; loop(); }
    else if(raf){ cancelAnimationFrame(raf); raf=null; }
  },{rootMargin:'600px'}).observe(host);

  addEventListener('scroll',()=>{dirty=true},{passive:true});
  addEventListener('resize',()=>{resize();dirty=true},{passive:true});

  function loop(){
    raf=requestAnimationFrame(loop);
    if(!visible||!ready) return;
    const p=readProgress();
    if(dirty||Math.abs(p-progress)>.0005){
      progress=p; dirty=false;
      apply(reduce?.5:p);
      renderer.render(scene,camera);
    }
  }

  const p0 = isPinned ? clamp(parseFloat(qa)||0,0,1) : (reduce?.5:0);
  function renderPinned(){
    const de=document.documentElement, prev=de.style.scrollBehavior;
    de.style.scrollBehavior='auto';
    const span=host.offsetHeight-innerHeight;
    scrollTo({top:host.offsetTop+Math.max(0,span)*p0, behavior:'instant'});
    de.style.scrollBehavior=prev;
    resize(); apply(p0); renderer.render(scene,camera);
    /* headless --screenshot will not composite a WebGL canvas reliably,
       so hand back the real framebuffer for verification */
    const el=document.createElement('script');
    el.type='text/plain'; el.id='qa-shot';
    el.textContent=canvas.toDataURL('image/png');
    document.body.appendChild(el);
    document.title='QA-READY '+p0+' parts='+(host.dataset.parts||0)+' matched='+(host.dataset.matched||0);
  }

  resize();
  host.classList.add('rig--ready');
  if(isPinned) load();                        // pinned mode loads immediately
}
