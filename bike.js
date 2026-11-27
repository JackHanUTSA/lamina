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
import {RGBELoader} from './vendor/RGBELoader.js';
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
  /* The hand-built panel rig lights the scene on frame one so nothing waits
     on a download. A real captured light probe (Poly Haven, CC0) then replaces
     it: measured studio light is what makes clear coat read as clear coat. */
  const envMap = buildEnvironment(renderer);
  scene.environment = envMap;

  new RGBELoader().load('env/studio_1k.hdr', hdr=>{
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    const probe = pm.fromEquirectangular(hdr).texture;
    pm.dispose(); hdr.dispose();
    scene.environment = probe;
    scene.environmentIntensity = 0.55;   // reflections yes, flat fill no
    renderer.toneMappingExposure = 0.78;
    dirty = true;
    if(isPinned && ready){ apply(p0); renderer.render(scene,camera); }
    host.dataset.probe = 'hdri';
  }, undefined, ()=>{ host.dataset.probe = 'procedural'; });

  scene.add(new THREE.HemisphereLight(0xaebfd4, 0x0d1013, .22));
  const key = new THREE.DirectionalLight(0xffffff, 0.95); key.position.set(2.6,3.4,2.2); scene.add(key);
  const rim = new THREE.DirectionalLight(HV, .20);         rim.position.set(-2.4,1.3,-2.6); scene.add(rim);

  /* Scanned CC0 carbon weave (ambientCG Fabric004) rather than a tile drawn
     by hand: my generated version alternated horizontal and vertical floats,
     which reads as herringbone, and sat far too light to pass as carbon. */
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
  const TOW_TILE = 0.032;          // metres per tile; ~4mm tows, real 3K cloth
  function wrapUV(srcGeo, tile){
    /* Box projection picks its plane per-VERTEX, so across a curved shell the
       axis flips and the weave mirrors into chevrons. Cloth does not do that.
       Wrap cylindrically about the bike's long axis instead - the way a real
       layup follows the mould - which keeps every tow running one direction. */
    const geo = srcGeo.clone();
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const cy = (bb.min.y+bb.max.y)/2, cz = (bb.min.z+bb.max.z)/2;
    const rad = ((bb.max.y-bb.min.y) + (bb.max.z-bb.min.z)) / 4 || 0.1;
    const pos = geo.attributes.position;
    const uv  = new Float32Array(pos.count*2);
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i);
      const ang = Math.atan2(z-cz, y-cy);
      uv[i*2]   = x/tile;
      uv[i*2+1] = ang*rad/tile;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv,2));
    return geo;
  }

  const carbonMat = new THREE.MeshPhysicalMaterial({
    map:          tex('img/cf-color.jpg', true),
    normalMap:    tex('img/cf-normal.jpg', false),
    roughnessMap: tex('img/cf-rough.jpg', false),
    normalScale:  new THREE.Vector2(1.15, 1.15),
    color:0xffffff, metalness:.22, roughness:1.0,
    clearcoat:1, clearcoatRoughness:.022,
    transparent:true, opacity:0, envMapIntensity:1.05
  });

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const seg=(p,a,b)=>clamp((p-a)/(b-a),0,1);
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const easeOut=t=>1-Math.pow(1-t,3);
  const STAGES=[[0,'Assembled'],[.18,'Exploding'],[.42,'Fuel tank'],[.58,'Carbon swap'],[.74,'Reassembled']];

  let ready=false, groups=[], tankGroup=null, carbonMesh=null, tankPivot=null;
  const twins=[];
  let R0=1, CENTER=new THREE.Vector3(), TANKPT=new THREE.Vector3();
  const _look=new THREE.Vector3(), _bmin=new THREE.Vector3(), _bmax=new THREE.Vector3();
  const _c=new THREE.Vector3(), _t=new THREE.Vector3(), _live=new THREE.Vector3();

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
        m.envMapIntensity=0.95;
        if(n.includes('red outdoor paint')){
          m.color.setHex(0x15181c); m.metalness=.30; m.roughness=.26;
          if('clearcoat' in m){ m.clearcoat=1; m.clearcoatRoughness=.06; }
        }else if(n.includes('warm white outdoor paint')){
          m.color.setHex(0x6b737c); m.metalness=.25; m.roughness=.32;
        }else if(n.includes('tyre rubber')){ m.color.setHex(0x0d0f12); m.roughness=.95; }
        else if(n.includes('saddle leather')){ m.color.setHex(0x14171b); m.roughness=.82; }
        m.needsUpdate=true;
      });

      /* bucket the named nodes into assemblies, preserving world transforms */
      const buckets={};
      for(const g of GROUPS){
        const grp=new THREE.Group(); grp.userData.ex=new THREE.Vector3(...g.ex);
        grp.userData.carbon=!!g.carbon; grp.userData.hero=!!g.hero;
        grp.userData.order=g.order ?? 0.5;
        buckets[g.key]=grp; scene.add(grp); groups.push(grp);
      }
      const rest=new THREE.Group(); rest.userData.ex=new THREE.Vector3(0,0,0); rest.userData.order=1;
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

      /* Carbon twins for EVERY part LAMINA makes, not just the tank: the whole
         point is that the bike goes back together in carbon. One shared
         material means a single opacity drives the entire swap. */
      const isTank = o => /fuel\s*tank/i.test((o.name||'').replace(/_/g,' '));
      /* A fairing group also contains the things bolted THROUGH it. You cannot
         lay carbon over a windscreen, a lens, a mirror glass or a bulb socket,
         so these are excluded from the swap even inside a carbon assembly. */
      const NO_CARBON = /windscreen|glaz|lens|lamp|bulb|socket|mirror|indicator|instrument|gauge|reflector|grip|saddle|seat pad|tyre|rubber|chrome trim|filler cap|mounting spine|subframe|support|strut|stay|fixing|bracket|bolt|clip/i;
      const carbonable = o => {
        const n=(o.name||'').replace(/_/g,' ');
        if(NO_CARBON.test(n)) return false;
        const mn=((o.material&&o.material.name)||'').toLowerCase();
        if(mn.includes('glazing') || mn.includes('glass') || mn.includes('rubber')) return false;
        return true;
      };
      for(const g of groups){
        if(!g.userData.carbon) continue;
        const targets=[];
        g.traverse(o=>{
          // skip bolts, clips and stays - twinning those adds cost, not realism
          if(o.isMesh && o.geometry.attributes.position.count>=90 && carbonable(o)) targets.push(o);
        });
        for(const o of targets){
          const t=new THREE.Mesh(wrapUV(o.geometry, TOW_TILE), carbonMat);
          /* Share the source's PARENT and copy its LOCAL transform. Setting a
             world transform then calling attach() depends on a matrixWorld that
             has not been computed yet, which silently parked the twin elsewhere. */
          t.position.copy(o.position);
          t.quaternion.copy(o.quaternion);
          t.scale.copy(o.scale).multiplyScalar(1.004);
          t.renderOrder=1;
          o.parent.add(t);
          twins.push({twin:t, src:o});
          if(isTank(o)) carbonMesh=t;
        }
      }
      host.dataset.twins=twins.length;

      /* hi-vis outline on the parts LAMINA makes */
      const twinSet=new Set(twins.map(t=>t.twin));
      for(const g of groups){
        if(!g.userData.carbon) continue;
        g.traverse(o=>{
          if(!o.isMesh || twinSet.has(o)) return;
          const e=new THREE.LineSegments(
            new THREE.EdgesGeometry(o.geometry, 38),
            new THREE.LineBasicMaterial({color:HV, transparent:true, opacity:0, depthWrite:false}));
          o.add(e);
          (g.userData.edges ||= []).push(e.material);
        });
      }

      /* A fuel tank is bolted at the front and hinges up at the REAR; it does
         not levitate. Re-parent the tank into a pivot sitting on its front
         lower edge so the lift is a rotation, the way the real part moves. */
      scene.updateMatrixWorld(true);
      {
        const tb=new THREE.Box3().setFromObject(tankGroup);
        tankPivot=new THREE.Group();
        tankPivot.position.set(tb.max.x, tb.min.y, (tb.min.z+tb.max.z)/2);  // +x is front
        tankGroup.add(tankPivot);
        tankPivot.updateMatrixWorld(true);
        for(const kid of [...tankGroup.children]){
          if(kid!==tankPivot) tankPivot.attach(kid);
        }
      }

      /* ground the model and frame it */
      const box=new THREE.Box3();
      for(const g of groups) box.expandByObject(g);   // bike only, never lights
      const sph=box.getBoundingSphere(new THREE.Sphere());
      R0=sph.radius; CENTER.copy(sph.center);
      const tb=new THREE.Box3().setFromObject(tankGroup);
      tb.getCenter(TANKPT);
      for(const g of groups){
        g.userData.home=g.position.clone();
        const gb=new THREE.Box3().setFromObject(g);
        if(gb.isEmpty()){ g.userData.sr=0; continue; }
        const gs=gb.getBoundingSphere(new THREE.Sphere());
        g.userData.sc=gs.center.clone().sub(g.position);  // offset from group origin
        g.userData.sr=gs.radius;
      }

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
    const out=seg(p,.18,.42), back=seg(p,.74,1);
    /* Panels leave in real service order and return in the exact reverse
       (tail first, windscreen last) instead of all moving at once. */
    const STAG=0.55;
    const win=(prog,o)=>clamp((prog-o*STAG)/(1-STAG),0,1);
    const amt=easeOut(out)*(1-easeOut(back));
    const focus=seg(p,.42,.58)*(1-seg(p,.74,.88));
    const swap=seg(p,.58,.74);

    for(const g of groups){
      const ex=g.userData.ex, home=g.userData.home;
      if(!home) continue;
      const o=g.userData.order ?? 0.5;
      const k=easeOut(win(out,o))*(1-easeOut(win(back,1-o)));
      g.position.set(home.x+ex.x*k, home.y+ex.y*k, home.z+ex.z*k);
      if(g.userData.edges){
        const o=(g===tankGroup)? (.16+swap*.70) : (.07+amt*.26);
        for(const mat of g.userData.edges) mat.opacity=o;
      }
    }
    if(tankPivot){
      const to=tankGroup.userData.order ?? .4;
      const tk=easeOut(win(out,to))*(1-easeOut(win(back,1-to)));
      tankPivot.rotation.z = -0.52*tk;            // negative lifts the rear
    }
    carbonMat.opacity=easeOut(swap);
    const painted = swap < .99;
    for(const t of twins) t.src.visible = painted;

    /* Staggered panels travel further than any single guessed radius, so they
       were flying out of shot. Enclose the assemblies where they actually are. */
    const bmin=_bmin.set(Infinity,Infinity,Infinity), bmax=_bmax.set(-Infinity,-Infinity,-Infinity);
    for(const g of groups){
      if(!g.userData.sr) continue;
      const c=_c.copy(g.userData.sc).add(g.position), r=g.userData.sr;
      bmin.min(_t.set(c.x-r,c.y-r,c.z-r));
      bmax.max(_t.set(c.x+r,c.y+r,c.z+r));
    }
    const live=_live.addVectors(bmin,bmax).multiplyScalar(0.5);
    let liveR=0;
    for(const g of groups){
      if(!g.userData.sr) continue;
      const c=_c.copy(g.userData.sc).add(g.position);
      liveR=Math.max(liveR, c.distanceTo(live)+g.userData.sr);
    }
    if(!isFinite(liveR) || liveR<=0) liveR=R0;

    const push=ease(focus);
    const radius=THREE.MathUtils.lerp(liveR, .32, push);
    const vF=THREE.MathUtils.degToRad(camera.fov);
    const hF=2*Math.atan(Math.tan(vF/2)*camera.aspect);
    const dist=radius/Math.sin(Math.max(.12,Math.min(vF,hF)/2))*0.92;
    if(carbonMesh){
      // Follow the actual shell through its hinge rotation, not the group's
      // cached home centre. Compute the local centre once, then transform it.
      if(!carbonMesh.geometry.boundingBox) carbonMesh.geometry.computeBoundingBox();
      carbonMesh.geometry.boundingBox.getCenter(TANKPT);
      carbonMesh.updateWorldMatrix(true, false);
      carbonMesh.localToWorld(TANKPT);
    }
    const spin=(.52+p*1.08)*Math.PI*.5;
    const elev=THREE.MathUtils.lerp(.12,.30,push);
    _look.lerpVectors(live,TANKPT,push);
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
    /* QA-only: expose the graph so stage checks can count real geometry
       instead of inferring it from screenshots at different camera angles */
    window.__rig = {scene, camera, groups, twins, apply, render:()=>renderer.render(scene,camera)};
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
