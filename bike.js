/* ═══════════════════════════════════════════════════════════════════════
   LAMINA — scroll-scrubbed exploded view

   A stylised sport bike built entirely from primitives in code. No model
   files, no scanned geometry, and deliberately NOT photoreal: it reads as
   a technical diagram, which is honest about what it is and avoids
   depicting any manufacturer's trademarked bodywork.

   Scroll timeline (p = 0..1):
     0.00-0.18  assembled, slow rotation
     0.18-0.42  parts explode outward
     0.42-0.58  camera pushes in on the tank cover, the rest dims
     0.58-0.74  tank cover swaps painted -> carbon twill
     0.74-1.00  reassembles, carbon parts edged in hi-vis
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from './vendor/three.module.js';

const HV      = 0xd7ff2e;
const CARBON  = 0x15181c;
const PAINT   = 0x3a4048;
const METAL   = 0x6b737d;

const host = document.getElementById('rig');
if (host) boot();

function boot(){
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const canvas = document.getElementById('rig-canvas');
  /* size to the STICKY viewport box, never to the tall scroll track:
     measuring #rig (420vh) gave a 765x2070 buffer and threw the model
     entirely out of frame. */
  const stick  = host.querySelector('.rig__sticky');
  const label  = document.getElementById('rig-label');
  const stageEl= document.getElementById('rig-stage');

  let renderer;
  try{
    const _qa = location.search.indexOf('rigp')>-1;
    renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, preserveDrawingBuffer:_qa});
  }catch(e){ host.classList.add('rig--failed'); return; }
  if(!renderer || !renderer.getContext()){ host.classList.add('rig--failed'); return; }

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

  /* ---------- lighting: dark studio with a hi-vis rim ---------- */
  scene.add(new THREE.HemisphereLight(0xa8bcd4, 0x14181d, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 3.0); key.position.set(5,7,6); scene.add(key);
  const fill= new THREE.DirectionalLight(0x9fb4cc, 1.5); fill.position.set(-6,2,-4); scene.add(fill);
  const rim = new THREE.PointLight(HV, 9, 26); rim.position.set(-4.0,2.2,-4.2); scene.add(rim);

  /* ---------- carbon twill texture ---------- */
  const tex = new THREE.TextureLoader().load('img/twill.png');
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5,3);
  tex.colorSpace = THREE.SRGBColorSpace;

  const matPaint  = new THREE.MeshStandardMaterial({color:PAINT, roughness:.42, metalness:.25});
  const matMetal  = new THREE.MeshStandardMaterial({color:METAL, roughness:.34, metalness:.85});
  const matDark   = new THREE.MeshStandardMaterial({color:CARBON,roughness:.6,  metalness:.2});
  const matRubber = new THREE.MeshStandardMaterial({color:0x121417,roughness:.95,metalness:0});
  const matCarbon = new THREE.MeshStandardMaterial({
    color:0xffffff, map:tex, roughness:.18, metalness:.35,
    transparent:true, opacity:0
  });

  const bike  = new THREE.Group();
  const parts = [];
  scene.add(bike);

  /* add(mesh, explodeVector, isCarbonCandidate) */
  function add(mesh, ex, carbon){
    mesh.userData.home = mesh.position.clone();
    mesh.userData.ex   = ex;
    bike.add(mesh);
    parts.push(mesh);
    const e = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, 28),
      new THREE.LineBasicMaterial({color:HV, transparent:true, opacity:0})
    );
    e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); e.scale.copy(mesh.scale);
    mesh.userData.edge = e; bike.add(e);
    if(carbon) mesh.userData.carbon = true;
    return mesh;
  }

  /* ---------- wheels ---------- */
  function wheel(x){
    const g = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(1.02,.30,12,40), matRubber);
    const rimM = new THREE.Mesh(new THREE.CylinderGeometry(.74,.74,.34,22), matMetal);
    rimM.rotation.x = Math.PI/2;
    g.add(tyre, rimM);
    for(let i=0;i<5;i++){
      const s = new THREE.Mesh(new THREE.BoxGeometry(.13,1.42,.10), matMetal);
      s.rotation.z = i*Math.PI/5; g.add(s);
    }
    const m = new THREE.Group(); m.add(g); m.position.set(x,-1.05,0);
    return m;
  }
  const wF = wheel( 2.52), wR = wheel(-2.42);
  [[wF,new THREE.Vector3( 3.2,-.4,0)],[wR,new THREE.Vector3(-3.2,-.4,0)]].forEach(([w,ex])=>{
    w.userData.home=w.position.clone(); w.userData.ex=ex; bike.add(w); parts.push(w);
  });

  /* ---------- running gear ---------- */
  const forkL = new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,2.5,12), matMetal);
  forkL.position.set(2.18,.18,.34); forkL.rotation.z=-0.42;
  add(forkL, new THREE.Vector3(1.8,1.6,.8));
  const forkR = forkL.clone(); forkR.position.z=-.34;
  add(forkR, new THREE.Vector3(1.8,1.6,-.8));

  const swing = new THREE.Mesh(new THREE.BoxGeometry(2.0,.26,.95), matMetal);
  swing.position.set(-1.35,-.72,0); swing.rotation.z=0.07;
  add(swing, new THREE.Vector3(-1.4,-1.5,0));

  const engine = new THREE.Mesh(new THREE.BoxGeometry(1.75,1.25,1.12), matDark);
  engine.position.set(-.10,-.46,0);
  add(engine, new THREE.Vector3(0,-2.6,0));

  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.3,.20,1.02), matMetal);
  frame.position.set(.10,.16,0);
  add(frame, new THREE.Vector3(0,-1.1,0));

  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.19,.24,1.5,14), matMetal);
  pipe.position.set(-2.0,-.52,.36); pipe.rotation.z=Math.PI/2;
  add(pipe, new THREE.Vector3(-2.2,-1.1,1.4));

  /* ---------- bodywork ---------- */
  /* the tank cover: the hero part. tapered wedge, pointed forward,
     matching the real shell's silhouette rather than a generic box. */
  const shape = new THREE.Shape();
  shape.moveTo( 1.30, 0.00);
  shape.quadraticCurveTo( 1.05, 0.46,  0.35, 0.56);
  shape.quadraticCurveTo(-0.55, 0.66, -1.20, 0.42);
  shape.lineTo(-1.20,-0.42);
  shape.quadraticCurveTo(-0.55,-0.66,  0.35,-0.56);
  shape.quadraticCurveTo( 1.05,-0.46,  1.30, 0.00);
  const tankGeo = new THREE.ExtrudeGeometry(shape,{
    depth:.52, bevelEnabled:true, bevelSize:.16, bevelThickness:.14, bevelSegments:4, curveSegments:18
  });
  tankGeo.center();
  const tank = new THREE.Mesh(tankGeo, matPaint);
  tank.position.set(.38,.66,0); tank.rotation.x=Math.PI/2; tank.scale.set(.92,.92,.86);
  add(tank, new THREE.Vector3(0,2.6,0), true);

  /* the carbon twin sits in the same place and fades in on the swap */
  const tankCarbon = new THREE.Mesh(tankGeo, matCarbon);
  tankCarbon.position.copy(tank.position); tankCarbon.rotation.copy(tank.rotation);
  tankCarbon.scale.setScalar(1.012);
  bike.add(tankCarbon);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.75,.62,.80), matPaint);
  tail.position.set(-1.70,.74,0); tail.rotation.z=.20;
  add(tail, new THREE.Vector3(-1.2,2.2,0), true);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.25,1.05,1.12), matPaint);
  nose.position.set(1.92,.74,0); nose.rotation.z=-.30;
  add(nose, new THREE.Vector3(2.6,1.9,0), true);

  const sideL = new THREE.Mesh(new THREE.BoxGeometry(2.25,1.35,.20), matPaint);
  sideL.position.set(.50,-.30,.60);
  add(sideL, new THREE.Vector3(0,-.4,2.9), true);
  const sideR = sideL.clone(); sideR.position.z=-.60;
  add(sideR, new THREE.Vector3(0,-.4,-2.9), true);

  const fender = new THREE.Mesh(new THREE.BoxGeometry(1.0,.18,.5), matPaint);
  fender.position.set(2.45,.05,0); fender.rotation.z=-.3;
  add(fender, new THREE.Vector3(2.4,1.0,0), true);

  const screen = new THREE.Mesh(new THREE.BoxGeometry(.6,.42,.72),
    new THREE.MeshStandardMaterial({color:0x8fa6bd, roughness:.1, metalness:.1, transparent:true, opacity:.5}));
  screen.position.set(2.18,1.34,0); screen.rotation.z=-.5;
  add(screen, new THREE.Vector3(3.0,2.2,0));

  bike.position.y = .45;

  /* ---------- timeline helpers ---------- */
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const seg=(p,a,b)=>clamp((p-a)/(b-a),0,1);
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const easeOut=t=>1-Math.pow(1-t,3);

  const STAGES=[
    [0.00,'Assembled'], [0.18,'Exploding'], [0.42,'Tank cover'],
    [0.58,'Carbon swap'], [0.74,'Reassembled']
  ];

  /* measure the assembled model once, then derive every camera distance
     from it. Hard-coded positions cropped the bike at some aspect ratios. */
  const _box = new THREE.Box3().setFromObject(bike);
  const _sph = _box.getBoundingSphere(new THREE.Sphere());
  const R0   = _sph.radius;
  const CENTER = _sph.center.clone();
  const TANKPT = new THREE.Vector3(tank.position.x, tank.position.y+bike.position.y, 0);
  const _look  = new THREE.Vector3();

  function distFor(radius){
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2*Math.atan(Math.tan(vFov/2)*camera.aspect);
    return radius / Math.sin(Math.max(0.12, Math.min(vFov,hFov)/2));
  }

  let progress=0;
  function apply(p){
    const out  = seg(p,0.18,0.42);          // explode
    const back = seg(p,0.74,1.00);          // reassemble
    const amt  = easeOut(out)*(1-easeOut(back));
    const focus= seg(p,0.42,0.58)*(1-seg(p,0.74,0.88));
    const swap = seg(p,0.58,0.74);

    for(const m of parts){
      const ex=m.userData.ex, home=m.userData.home;
      const isTank = (m===tank);
      // the tank cover barely moves - the camera comes to it instead
      const k = isTank ? amt*0.35 : amt;
      m.position.set(home.x+ex.x*k, home.y+ex.y*k, home.z+ex.z*k);
      if(m.userData.edge){
        m.userData.edge.position.copy(m.position);
        m.userData.edge.material.opacity = m.userData.carbon ? (0.30+swap*0.60) : (0.16+amt*0.16);
      }
      if(m.material && m.material.transparent!==undefined && !isTank && m!==screen){
        // dim everything else while the lens is on the tank
        const dim = 1 - focus*0.55;
        if(m.material.color && !m.userData.baseColor) m.userData.baseColor=m.material.color.clone();
        if(m.userData.baseColor) m.material.color.copy(m.userData.baseColor).multiplyScalar(dim);
      }
    }
    tankCarbon.position.copy(tank.position);
    matCarbon.opacity = easeOut(swap);
    matPaint.opacity  = 1;
    tank.visible = swap < 0.985;

    // camera: frame the whole bike, push in on the tank, pull back out
    const push = ease(focus);
    const wideR = R0*(1 + amt*0.62);            // exploded parts need more room
    const radius= THREE.MathUtils.lerp(wideR, 2.55, push);
    const dist  = distFor(radius)*1.06;
    const spin  = (0.62 + p*1.15) * Math.PI*0.5;
    const elev  = THREE.MathUtils.lerp(0.20, 0.34, push);
    camera.position.set(
      Math.cos(spin)*Math.cos(elev)*dist,
      Math.sin(elev)*dist + 0.35,
      Math.sin(spin)*Math.cos(elev)*dist
    );
    _look.lerpVectors(CENTER, TANKPT, push);
    camera.lookAt(_look);

    if(label){
      let s=STAGES[0][1];
      for(const [t,n] of STAGES) if(p>=t) s=n;
      if(label.textContent!==s) label.textContent=s;
    }
    if(stageEl) stageEl.style.setProperty('--sp', (p*100).toFixed(1)+'%');
  }

  /* ---------- sizing ---------- */
  function resize(){
    const r = (stick||host).getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height || innerHeight));
    renderer.setSize(w,h,false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
    // pull the camera back on narrow/portrait viewports so the bike still fits
    fit = Math.max(1, 1.52/Math.min(camera.aspect,1.52));
  }
  let fit = 1;

  /* ---------- scroll scrub ---------- */
  function readProgress(){
    const r = host.getBoundingClientRect();
    const span = r.height - innerHeight;
    if(span<=0) return 0;
    return clamp(-r.top/span, 0, 1);
  }

  let visible=false, raf=null, dirty=true;
  /* read the QA pin BEFORE wiring the observer: otherwise the observer
     fires async, calls loop(), and overwrites the pinned frame with the
     scroll-derived one - which made every test frame byte-identical. */
  const pinned = new URLSearchParams(location.search).get('rigp');
  const isPinned = pinned!==null;
  const io = new IntersectionObserver(es=>{
    visible = es[0].isIntersecting;
    if(isPinned) return;
    if(visible){ dirty=true; loop(); } else if(raf){ cancelAnimationFrame(raf); raf=null; }
  },{rootMargin:'120px'});
  io.observe(host);

  addEventListener('scroll', ()=>{ dirty=true; }, {passive:true});
  addEventListener('resize', ()=>{ resize(); dirty=true; }, {passive:true});

  function loop(){
    raf = requestAnimationFrame(loop);
    if(!visible) return;
    const p = readProgress();
    if(dirty || Math.abs(p-progress)>0.0005){
      progress = p; dirty=false;
      apply(reduce ? 0.5 : p);     // reduced motion: one static, informative frame
      renderer.render(scene,camera);
    }
  }

  /* The pinned stage must be applied BEFORE the first paint: headless
     --screenshot captures the first composited frame, so applying it later
     (even synchronously after an initial render) produced byte-identical
     p=0 images for every stage. */
  const p0 = isPinned ? clamp(parseFloat(pinned)||0, 0, 1) : (reduce ? 0.5 : 0);

  if(isPinned){
    // a #hash does not scroll in headless, so place the viewport ourselves.
    // html{scroll-behavior:smooth} turns scrollTo into an animation that
    // never settles under virtual time - force an instant jump.
    const de=document.documentElement, prev=de.style.scrollBehavior;
    de.style.scrollBehavior='auto';
    const span = host.offsetHeight - innerHeight;
    scrollTo({top: host.offsetTop + Math.max(0,span)*p0, behavior:'instant'});
    de.style.scrollBehavior=prev;
  }

  resize();
  apply(p0);
  renderer.render(scene,camera);
  host.classList.add('rig--ready');

  if(isPinned){
    // re-apply after layout settles, then expose the real framebuffer as a
    // data URL. headless --screenshot does not reliably composite the WebGL
    // canvas, so verification reads the pixels back directly.
    setTimeout(()=>{
      resize(); apply(p0); renderer.render(scene,camera);
      const el=document.createElement('script');
      el.type='text/plain'; el.id='qa-shot';
      el.textContent=canvas.toDataURL('image/png');
      document.body.appendChild(el);
      document.title='QA-READY '+p0;
    }, 200);
  }else{
    loop();
  }

  /* expose for verification screenshots */
  window.__rig = {set(p){ apply(p); renderer.render(scene,camera); }};
}
