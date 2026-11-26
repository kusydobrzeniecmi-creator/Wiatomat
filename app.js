import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
const $=id=>document.getElementById(id);
const stage=$('stage');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x1b2a21);
const camera=new THREE.PerspectiveCamera(42,1,.1,300);camera.position.set(12,10,13);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;stage.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,1,0);
scene.add(new THREE.HemisphereLight(0xdcebdc,0x354237,2));
const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(7,12,8);sun.castShadow=true;scene.add(sun);
const grid=new THREE.GridHelper(24,24,0x607767,0x35483b);grid.position.y=-.02;scene.add(grid);
const wood=new THREE.MeshStandardMaterial({color:0xb78653,roughness:.8}),darkwood=new THREE.MeshStandardMaterial({color:0x8b603a,roughness:.8}),roofmat=new THREE.MeshStandardMaterial({color:0x667b83,metalness:.55,roughness:.4,side:THREE.DoubleSide});
let parts=[],selected=null,explode=0,exploding=false,project={};
const meters=v=>Number(v)/100;
function val(id){return Number($(id).value)||0}
function addBox(name,type,x,y,z,sx,sy,sz,mat=wood,meta={}){const geo=new THREE.BoxGeometry(sx,sy,sz);const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={name,type,baseY:y,baseX:x,baseZ:z,...meta};scene.add(mesh);parts.push(mesh);return mesh}
function clearModel(){for(const p of parts){scene.remove(p);p.geometry.dispose()}parts=[];selected=null;updateSelectionUI()}
function build(){
 clearModel();
 const L=meters(val('length')),W=meters(val('width')),hi=meters(val('high')),lo=meters(val('low'));
 const rows=Math.max(1,Math.min(10,Math.round(val('rows')))),cols=Math.max(1,Math.min(20,Math.round(val('cols'))));
 const ps=meters(val('postSize')),bs=meters(val('beamSize')),rw=meters(val('rafterW')),rh=meters(val('rafterH'));
 const xs=cols===1?[0]:Array.from({length:cols},(_,i)=>-L/2+i*L/(cols-1));
 const zs=rows===1?[0]:Array.from({length:rows},(_,i)=>-W/2+i*W/(rows-1));
 // Height changes across width: high edge at -W/2, low edge at +W/2.
 const roofY=z=>hi-(hi-lo)*((z+W/2)/W);
 const postTop=[];
 zs.forEach((z,ri)=>xs.forEach((x,ci)=>{
  const h=roofY(z);addBox(`Słup R${ri+1}/S${ci+1}`,'Słup',x,h/2,z,ps,h,ps,darkwood,{baseY:h/2});
 }));
 // Longitudinal beams at each row
 zs.forEach((z,ri)=>{const h=roofY(z);addBox(`Belka podłużna ${ri+1}`,'Belka',0,h-bs/2,z,L,bs,bs,darkwood)});
 // rafters across width at spacing along length
 const step=Math.max(.3,meters(val('rafterStep'))),n=Math.max(1,Math.ceil(L/step));
 for(let i=0;i<=n;i++){const x=-L/2+i*L/n;const y1=hi-bs/2,y2=lo-bs/2;const len=Math.hypot(W,y1-y2);const angle=Math.atan2(y2-y1,W);const m=addBox(`Krokiew ${i+1}`,'Krokiew',x,(y1+y2)/2,0,rw,len,rh,wood);m.rotation.x=angle}
 // battens: across roof width, repeated along length
 const bstep=Math.max(.15,meters(val('battenStep'))),bn=Math.max(1,Math.ceil(W/bstep));
 for(let i=0;i<=bn;i++){const z=-W/2+i*W/bn;const y=roofY(z)+.08;addBox(`Łata ${i+1}`,'Łata',0,y,z,L,.045,.05,darkwood)}
 // roof plane
 const roofGeo=new THREE.BoxGeometry(L,.035,Math.hypot(W,hi-lo));const roof=new THREE.Mesh(roofGeo,roofmat);roof.position.set(0,(hi+lo)/2+.12,0);roof.rotation.x=Math.atan2(lo-hi,W);roof.userData={name:'Pokrycie dachu',type:'Pokrycie',baseY:roof.position.y};roof.castShadow=true;scene.add(roof);parts.push(roof);
 camera.position.set(Math.max(8,L*1.2),Math.max(6,W*1.5),Math.max(8,L*1.2));controls.target.set(0,(hi+lo)/2,0);controls.update();
 $('loading').style.display='none';applyVisibility();updateSummary();
}
function applyVisibility(){const map={Słup:'showPosts',Belka:'showBeams',Krokiew:'showRafters',Łata:'showBattens'};parts.forEach(p=>{const id=map[p.userData.type];p.visible=id?$(id).checked:true})}
function choose(obj){if(selected)selected.material.emissive?.setHex(0x000000);selected=obj; if(selected.material.emissive)selected.material.emissive.setHex(0x443311);updateSelectionUI()}
function updateSelectionUI(){const yes=!!selected;$('noSelection').hidden=yes;$('elementEditor').hidden=!yes;$('selectedLabel').textContent=yes?selected.userData.name:'Nie wybrano elementu';if(yes){$('elementName').textContent=selected.userData.name;$('posX').value=(selected.position.x*100).toFixed(1);$('posY').value=(selected.position.y*100).toFixed(1);$('posZ').value=(selected.position.z*100).toFixed(1);$('offsetZ').value=0}}
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(parts.filter(p=>p.visible));if(hit.length){choose(hit[0].object)}});
$('applyMove').onclick=()=>{if(!selected)return;selected.position.set(val('posX')/100,val('posY')/100+val('offsetZ')/100,val('posZ')/100);selected.userData.baseY=selected.position.y;updateSelectionUI()};
$('duplicateBtn').onclick=()=>{if(!selected)return;const c=selected.clone();c.geometry=selected.geometry.clone();c.position.x+=.35;c.userData={...selected.userData,name:selected.userData.name+' — kopia'};scene.add(c);parts.push(c);choose(c)};
$('buildBtn').onclick=build;
['showPosts','showBeams','showRafters','showBattens'].forEach(id=>$(id).onchange=applyVisibility);
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(''+b.dataset.tab).classList.add('active')});
$('resetView').onclick=()=>{camera.position.set(12,10,13);controls.target.set(0,1,0);controls.update()};
$('explodeBtn').onclick=()=>{exploding=!exploding;$('explodeBtn').textContent=exploding?'Zatrzymaj animację':'Animacja montażu'};
function animate(){requestAnimationFrame(animate);if(exploding){explode=Math.min(1,explode+.008);parts.forEach((p,i)=>{const t=p.userData.type;p.position.y=p.userData.baseY+(t==='Pokrycie'?explode*2:t==='Łata'?explode*1.5:t==='Krokiew'?explode:0)})}controls.update();renderer.render(scene,camera)}animate();
function resize(){const w=stage.clientWidth,h=stage.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)}new ResizeObserver(resize).observe(stage);resize();
function updateSummary(){
 const L=meters(val('length')),W=meters(val('width')),hi=meters(val('high')),lo=meters(val('low')),rows=val('rows'),cols=val('cols');
 const postN=rows*cols,postVol=postN*meters(val('postSize'))**2*((hi+lo)/2);
 const beamVol=rows*L*meters(val('beamSize'))**2;
 const rN=Math.ceil(L/Math.max(.3,meters(val('rafterStep'))))+1,rl=Math.hypot(W,hi-lo);
 const rVol=rN*meters(val('rafterW'))*meters(val('rafterH'))*rl;
 const roofArea=L*rl,batN=Math.ceil(W/Math.max(.15,meters(val('battenStep'))))+1,batVol=batN*L*.045*.05;
 const vol=postVol+beamVol+rVol+batVol,woodCost=vol*(1+val('waste')/100)*val('woodPrice'),roofCost=roofArea*val('roofPrice');
 project.summary={postN,vol,roofArea,woodCost,roofCost,total:woodCost+roofCost,rN,batN};
 $('summary').innerHTML=[['Słupy',`${postN} szt.`],['Krokwie',`${rN} szt. (orientacyjnie)`],['Łaty',`${batN} rzędów`],['Objętość drewna',`${vol.toFixed(3)} m³`],['Powierzchnia dachu',`${roofArea.toFixed(1)} m²`]].map(([a,b])=>`<div class="sumrow"><span>${a}</span><b>${b}</b></div>`).join('');
 $('costTotal').textContent=`Szacunkowo: ${(woodCost+roofCost).toFixed(0)} zł`;
}
['woodPrice','waste','roofPrice'].forEach(id=>$(id).addEventListener('input',updateSummary));
function getProject(){const data={app:'WIATOMAT',version:1,created:new Date().toISOString(),settings:{}};['length','width','high','low','rows','cols','postSize','beamSize','rafterW','rafterH','rafterStep','battenStep','woodPrice','waste','roofPrice'].forEach(id=>data.settings[id]=val(id));return data}
function applyProject(data){if(!data||!data.settings)throw Error('Nieprawidłowy plik projektu');Object.entries(data.settings).forEach(([k,v])=>{if($(k))$(k).value=v});build();$('status').textContent='Wczytano projekt.'}
function download(name,content,type){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('saveBtn').onclick=()=>{localStorage.setItem('wiatomat-project',JSON.stringify(getProject()));$('status').textContent='Zapisano projekt na tym urządzeniu.'};
$('exportBtn').onclick=()=>download('wiatomat-projekt.json',JSON.stringify(getProject(),null,2),'application/json');
$('importBtn').onclick=()=>$('fileInput').click();
$('fileInput').onchange=async e=>{try{applyProject(JSON.parse(await e.target.files[0].text()))}catch(err){$('status').textContent='Nie udało się wczytać pliku.'}};
$('csvBtn').onclick=()=>{const s=project.summary;const csv='Pozycja;Wartość\\nSłupy;'+s.postN+' szt.\\nDrewno;'+s.vol.toFixed(3)+' m3\\nDach;'+s.roofArea.toFixed(1)+' m2\\nKoszt drewna;'+s.woodCost.toFixed(2)+' zł\\nKoszt pokrycia;'+s.roofCost.toFixed(2)+' zł\\nRazem;'+s.total.toFixed(2)+' zł';download('wiatomat-zestawienie.csv','\\ufeff'+csv,'text/csv;charset=utf-8')};
const saved=localStorage.getItem('wiatomat-project');if(saved){try{applyProject(JSON.parse(saved))}catch{}}
build();
let installPrompt;$('installBtn').hidden=true;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installBtn').hidden=false});$('installBtn').onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
