/* ═══════════════════════════════════════════════════════════════════════
   LAMINA — studio environment helpers for the teardown rig.

   The bike itself is no longer built here: it is a real modelled asset
   (model/sportbike.glb, CC0, unbranded, 599 named parts, metre scale).
   What stays is the lighting setup, which is what makes gloss paint and
   clear-coated carbon read as material rather than plastic.
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from './vendor/three.module.js';

export const HV = 0xd7ff2e;

/* A few emissive planes PMREM'd into an environment map. Without an env map
   every glossy surface has nothing to reflect and renders flat. */
export function buildEnvironment(renderer){
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x12161a);
  const panel = (w,h,color,intensity,pos,rot)=>{
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w,h),
      new THREE.MeshBasicMaterial({color, side:THREE.DoubleSide})
    );
    m.material.color.multiplyScalar(intensity);
    m.position.set(...pos);
    if(rot) m.rotation.set(...rot);
    env.add(m);
  };
  panel(14, 6, 0xffffff, 5.2, [0, 7, -1], [Math.PI/2, 0, 0]);   // overhead softbox
  panel( 8, 5, 0xdbe9ff, 3.4, [-7, 2.6,  2], [0,  Math.PI/2, 0]); // cool key, left
  panel( 8, 5, 0xfff1dc, 2.1, [ 7, 2.2, -2], [0, -Math.PI/2, 0]); // warm fill, right
  panel( 6, 2.4, 0xffffff, 4.6, [0, 2.6, -7]);                    // rim strip behind
  panel(16,16, 0x090a0c, 1.0, [0, -2, 0], [-Math.PI/2, 0, 0]);    // dark floor

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const rt = pmrem.fromScene(env, 0.04);
  pmrem.dispose();
  return rt.texture;
}

/* Soft contact shadow so the bike sits on a floor instead of floating. */
export function contactShadow(width=2.4, depth=0.9){
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128,128,4,128,128,124);
  grd.addColorStop(0,   'rgba(0,0,0,.70)');
  grd.addColorStop(.42, 'rgba(0,0,0,.32)');
  grd.addColorStop(1,   'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0,0,256,256);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({map:tex, transparent:true, depthWrite:false})
  );
  m.rotation.x = -Math.PI/2;
  m.position.y = 0.004;
  return m;
}

/* ── part grouping ──────────────────────────────────────────────────────
   The GLB ships 599 individually named nodes. Rather than explode 599
   pieces into confetti, they are bucketed into assemblies a rider would
   recognise, each with a direction to fly in.
   `carbon:true` marks the parts LAMINA actually makes. */
export const GROUPS = [
  {key:'tank',    ex:[0.0,0.1,0.0], order:0.40, carbon:true, hero:true,
   test:n=>/fuel tank|tank filler/i.test(n)},

  {key:'noseFwd', ex:[0.7,0.26,0.0], order:0.00, carbon:true,
   test:n=>/nose fairing|optical and fairing|windscreen|windscreen seated|forward lamp|forward amber|indicator|instrument|mirror/i.test(n)},

  {key:'cowlL',   ex:[0.06,0.04,0.46], order:0.10, carbon:true,
   test:n=>/upper sport cowl 1$|sport cowl retained fixing 1|sport cowl seated frame stay 1/i.test(n)},
  {key:'cowlR',   ex:[0.06,0.04,-0.46], order:0.10, carbon:true,
   test:n=>/upper sport cowl -1$|sport cowl retained fixing -1|sport cowl seated frame stay -1/i.test(n)},

  {key:'bellyL',  ex:[0.0,-0.34,0.38], order:0.20, carbon:true,
   test:n=>/belly cowl 1$|radiator edge fairing bridge 1/i.test(n)},
  {key:'bellyR',  ex:[0.0,-0.34,-0.38], order:0.20, carbon:true,
   test:n=>/belly cowl -1$|radiator edge fairing bridge -1/i.test(n)},

  {key:'tail',    ex:[-0.66,0.22,0.0], order:0.30, carbon:true,
   test:n=>/rear body cowl|rear lamp|saddle|seat support|seat subframe|seat stay|rear mudguard/i.test(n)},

  {key:'fenderF', ex:[0.52,0.46,0.0], order:0.50, carbon:true,
   test:n=>/front mudguard/i.test(n)},
  {key:'hugger',  ex:[-0.52,0.42,0.0], order:0.54, carbon:true,
   test:n=>/rear wheel arch/i.test(n)},

  {key:'wheelF',  ex:[0.8,-0.06,0.0], order:0.68,
   test:n=>/^front (rounded tyre|sculpted alloy spoke|turned rim|bearing hub|finite brake rotor|seated brake caliper|caliper carrier|seated through axle|rotor fixing)/i.test(n)},
  {key:'wheelR',  ex:[-0.82,-0.06,0.0], order:0.68,
   test:n=>/^rear (rounded tyre|sculpted alloy spoke|turned rim|bearing hub|finite brake rotor|seated brake caliper|caliper carrier|seated through axle|rotor fixing|machined teeth|sprocket)/i.test(n)},

  {key:'fork',    ex:[0.4,0.56,0.0], order:0.76,
   test:n=>/fork |steering yoke|steering head|handlebar|rubber grip|control switch|curved lever|brake hose|mirror mounted stem|indicator mounted stalk/i.test(n)},

  {key:'engine',  ex:[0.0,-0.64,0.0], order:0.92,
   test:n=>/cylinder|crankcase|engine c|engine seated|gearbox|radiator (cooling|matrix|seated|coolant)/i.test(n)},

  {key:'exhaust', ex:[-0.26,-0.5,-0.36], order:0.60,
   test:n=>/exhaust|silencer/i.test(n)},

  {key:'swing',   ex:[-0.5,-0.26,0.0], order:0.84,
   test:n=>/swing arm|swingarm|drive chain|rear damper|rear spring|spring seated perch|shock |rear sprocket carrier/i.test(n)},

  {key:'frame',   ex:[0.0,0.08,0.0], order:1.00,
   test:n=>/triangulated frame|footpeg|footrest|side stand|seat support tray/i.test(n)},
];
