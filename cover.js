import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {RGBELoader} from './vendor/RGBELoader.js';
import {buildEnvironment} from './bike-model.js';

const canvas=document.getElementById('cover-canvas');
const host=canvas.parentElement,status=document.getElementById('cover-state');
const qa=new URLSearchParams(location.search).has('qa');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:qa});}
catch(e){status.textContent='3D unavailable in this browser. You can still download the model below.';}
if(renderer) boot();
function boot(){
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.95;
  const scene=new THREE.Scene();
  scene.environment=buildEnvironment(renderer);scene.environmentIntensity=.55;
  const camera=new THREE.PerspectiveCamera(34,1,.01,30);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=.075;
  controls.enablePan=false;controls.minDistance=.8;controls.maxDistance=4;
  controls.autoRotate=false;controls.autoRotateSpeed=.7;
  const key=new THREE.DirectionalLight(0xffffff,1.7);key.position.set(-2,3,2);scene.add(key);
  const fill=new THREE.HemisphereLight(0xcad7e5,0x302b23,.6);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffe5b8,.8);rim.position.set(2,0,-3);scene.add(rim);
  let model,exterior,photoMaterial,studioMaterial;
  const target=new THREE.Vector3(0,.1,0);
  controls.target.copy(target);
  function render(){renderer.render(scene,camera);}
  function resize(){const b=host.getBoundingClientRect();renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();render();}
  function view(name){
    if(name==='top')camera.position.set(0,1.9,.001);
    else if(name==='under')camera.position.set(.3,-1.55,.55);
    else camera.position.set(1.0,1.15,1.25);
    const portrait=Math.min(1,camera.aspect/.9);
    camera.position.sub(target).multiplyScalar(1/portrait).add(target);
    camera.lookAt(target);controls.update();render();
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
  const spin=document.getElementById('cover-spin');
  spin.addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;spin.setAttribute('aria-pressed',String(controls.autoRotate));spin.textContent=controls.autoRotate?'Pause rotation':'Rotate slowly';});
  controls.addEventListener('change',render);
  const textureLoader=new THREE.TextureLoader();
  function texture(url,srgb){const t=textureLoader.load(url,render);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(18,24);t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t;}
  studioMaterial=new THREE.MeshPhysicalMaterial({map:texture('img/cf-color.jpg',true),normalMap:texture('img/cf-normal.jpg',false),roughnessMap:texture('img/cf-rough.jpg',false),normalScale:new THREE.Vector2(.35,.35),metalness:.08,roughness:.65,clearcoat:1,clearcoatRoughness:.08});
  document.querySelectorAll('[name=surface]').forEach(r=>r.addEventListener('change',()=>{if(!exterior)return;exterior.material=r.value==='photo'?photoMaterial:studioMaterial;render();}));
  new RGBELoader().load('env/studio_1k.hdr',hdr=>{const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromEquirectangular(hdr).texture;pm.dispose();hdr.dispose();render();},undefined,()=>{});
  new GLTFLoader().load('model/tank-cover-photo.glb',gltf=>{
    model=gltf.scene;scene.add(model);
    model.traverse(o=>{if(o.isMesh&&o.material.name==='Photo-derived exterior'){exterior=o;photoMaterial=o.material;}});
    host.classList.add('ready');
    status.textContent='Photo-guided shell · unmeasured scale';
    resize();view('angle');
    if(qa)window.__coverQA={scene,camera,controls,model,view,render,exterior,ready:true};
  },undefined,err=>{status.textContent='The model could not load. Reload this page, or download the GLB below.';console.error(err);});
  new ResizeObserver(resize).observe(host);
  let last=0;
  function animate(now){requestAnimationFrame(animate);if(document.hidden)return;const dt=Math.min((now-last)/1000,.1);last=now;controls.update(dt);}
  requestAnimationFrame(animate);
  if(reduced)controls.autoRotate=false;
  resize();view('angle');
}
