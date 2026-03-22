
const DB_KEY='icool_final_db_v1', USERS_KEY='icool_final_users_v1', GAS_KEY='icool_final_gas_v1', STICKY_KEY='icool_final_sticky_v1';
const DEFAULT_USERS=[{username:'admin',password:'1234',role:'admin'},{username:'foreman',password:'1234',role:'foreman'}];
const BLANK={memory:{projects:[],customers:[],workers:[],materials:[],suppliers:[],tasks:[]},entries:{workers:[],materials:[]},projects:[],workerRates:[]};
const $=id=>document.getElementById(id), esc=s=>String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
let db=load(DB_KEY,BLANK), users=load(USERS_KEY,DEFAULT_USERS), sticky=load(STICKY_KEY,{worker:{},material:{}}), currentUser=null, editWorkerId=null, editMaterialId=null;
let lastReport='', lastPayroll='', lastTs='', pendingPhotoFiles=[];
const saveDB=()=>localStorage.setItem(DB_KEY,JSON.stringify(db)); const saveUsers=()=>localStorage.setItem(USERS_KEY,JSON.stringify(users)); const saveSticky=()=>localStorage.setItem(STICKY_KEY,JSON.stringify(sticky));
const uniq=(arr,v)=>{v=String(v||'').trim(); if(v&&!arr.includes(v)) arr.push(v)};
const gasUrl=()=>($('gasUrl')?.value||'').trim()||localStorage.getItem(GAS_KEY)||'';
function parseDateOnly(v){ if(!v) return ''; if(typeof v==='string'){ if(v.includes('T')) return v.slice(0,10); if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; } try{ const d=new Date(v); if(!isNaN(d)) return d.toISOString().slice(0,10);}catch(e){} return String(v).slice(0,10); }
function fmtDate(v){ const d=parseDateOnly(v); return d?d.split('-').reverse().join('-'):''; }
function fmtTime(v){ if(!v) return ''; if(typeof v==='string'){ if(/^\d{2}:\d{2}/.test(v)) return v.slice(0,5); const m=v.match(/T(\d{2}):(\d{2})/); if(m) return m[1]+':'+m[2]; } try{ const d=new Date(v); if(!isNaN(d)) return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }catch(e){} return String(v).slice(0,5); }
function fillTimeSelect(id, defaultVal){ const el=$(id); let opts=''; for(let h=0;h<24;h++){ for(let m=0;m<60;m+=30){ const t=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); opts += `<option value="${t}">${t}</option>`; } } el.innerHTML=opts; el.value=defaultVal||'08:00'; }
function today(){ return new Date().toISOString().slice(0,10); }
function stat(){ $('netStatus').textContent=navigator.onLine?'Online':'Offline'; $('netStatus').className='pill '+(navigator.onLine?'ok':'warn'); const q=db.entries.workers.filter(x=>!x.synced).length+db.entries.materials.filter(x=>!x.synced).length; $('queueStatus').textContent='Queue: '+q; $('queueStatus').className='pill '+(q?'warn':'ok'); $('statProjects').textContent=db.memory.projects.length; $('statWorkers').textContent=db.memory.workers.length; $('statWorkerEntries').textContent=db.entries.workers.length; $('statMaterialEntries').textContent=db.entries.materials.length; }
function show(screen){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); if(screen==='login') $('loginScreen').classList.add('active'); else $('screen-'+screen).classList.add('active'); document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active', b.dataset.screen===screen)); }
function applyRole(){ const isAdmin=currentUser&&currentUser.role==='admin'; document.querySelectorAll('.admin-only').forEach(el=>el.classList.toggle('hidden', !isAdmin)); $('sessionInfo').textContent=currentUser?`${currentUser.username} / ${currentUser.role}`:'-'; $('currentUser').value=currentUser?currentUser.username:''; }
function daySeq(type,date,id){ return db.entries[type].filter(x=>parseDateOnly(x.date)===date && x.id!==id).length+1; }
function updateSeqs(){ $('wSeq').value=daySeq('workers',$('wDate').value||today(), editWorkerId); $('mSeq').value=daySeq('materials',$('mDate').value||today(), editMaterialId); }
function selectOptions(arr, placeholder='اختر'){ return `<option value="">${placeholder}</option>`+arr.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join(''); }
function renderSelects(){
  const customers=db.memory.customers.slice().sort(), workers=db.memory.workers.slice().sort(), materials=db.memory.materials.slice().sort(), suppliers=db.memory.suppliers.slice().sort(), tasks=db.memory.tasks.slice().sort();
  let currentCustomerW=$('wCustomer')?.value||'', currentCustomerM=$('mCustomer')?.value||'', currentProjectW=$('wProject')?.value||'', currentProjectM=$('mProject')?.value||'';
  ['wCustomer','mCustomer','pCustomer','rCustomer'].forEach(id=>{ if($(id)) $(id).innerHTML=selectOptions(customers); });
  ['wWorker','rName','payWorker','tsWorker'].forEach(id=>{ if($(id)) $(id).innerHTML=selectOptions(workers); });
  if($('mMaterial')) $('mMaterial').innerHTML=selectOptions(materials);
  if($('mSupplier')) $('mSupplier').innerHTML=selectOptions(suppliers);
  if($('wTask')) $('wTask').innerHTML=selectOptions(tasks);
  filterProjectSelect('wProject', $('wCustomer')?.value || currentCustomerW);
  filterProjectSelect('mProject', $('mCustomer')?.value || currentCustomerM);
  if($('rProject')) $('rProject').innerHTML=selectOptions(db.memory.projects.slice().sort());
  if($('wCustomer')) $('wCustomer').value=currentCustomerW;
  if($('mCustomer')) $('mCustomer').value=currentCustomerM;
  if($('wProject')) $('wProject').value=currentProjectW;
  if($('mProject')) $('mProject').value=currentProjectM;
}
function filterProjectSelect(selectId, customer){
  const select=$(selectId); if(!select) return;
  let arr=db.projects.filter(p=>!customer || p.customer===customer).map(p=>p.name);
  if(!arr.length && customer){ arr=db.memory.projects.slice(); } else if(!arr.length){ arr=db.memory.projects.slice(); }
  select.innerHTML=selectOptions([...new Set(arr)].sort());
}
function projectCustomer(projectName){
  const p=db.projects.find(x=>x.name===projectName); return p?p.customer:'';
}
function bindSticky(){ $('wDate').value=sticky.worker.date||today(); $('mDate').value=sticky.material.date||today(); $('wCustomer').value=sticky.worker.customer||''; $('mCustomer').value=sticky.material.customer||''; filterProjectSelect('wProject',$('wCustomer').value); filterProjectSelect('mProject',$('mCustomer').value); $('wProject').value=sticky.worker.project||''; $('mProject').value=sticky.material.project||''; $('rFrom').value=$('payFrom').value=$('tsFrom').value=today(); $('rTo').value=$('payTo').value=$('tsTo').value=today(); updateSeqs(); }
function workerRate(n){ return db.workerRates.find(x=>x.name===n)||{rate:0,advance:0}; }
function renderUsers(){ $('usersBox').innerHTML=users.length?users.map(u=>`<div class="item"><div class="name">${esc(u.username)}</div><div class="small">${esc(u.role)}</div></div>`).join(''):'<div class="empty">لا يوجد</div>'; }
function openWA(phone,text){ if(!phone){alert('أدخل رقم واتساب'); return;} const p=phone.replace(/[^\d]/g,''); window.open('https://wa.me/'+p+'?text='+encodeURIComponent(text),'_blank'); }
function printHtml(html,title){ const w=window.open('','_blank'); if(!w){alert('افتح من Safari أو Chrome'); return;} w.document.write(`<html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:right}th{background:#f6f8fb}</style></head><body><img src="./logo-icool.jpg" style="width:140px;max-width:40vw"><br>${html}</body></html>`); w.document.close(); w.print(); }
function renderDayEdits(){
  const wd=$('wDate').value||today(), md=$('mDate').value||today();
  const wItems=db.entries.workers.filter(x=>parseDateOnly(x.date)===wd).sort((a,b)=>(a.seq||0)-(b.seq||0));
  const mItems=db.entries.materials.filter(x=>parseDateOnly(x.date)===md).sort((a,b)=>(a.seq||0)-(b.seq||0));
  $('workersBox').innerHTML=wItems.length?wItems.map(x=>`<div class="item"><div class="row"><div><div class="name">#${x.seq} — ${esc(x.worker)}</div><div class="small">${fmtDate(x.date)} | ${esc(x.project)} | ${fmtTime(x.start)}-${fmtTime(x.end)}</div></div><button class="btn secondary" style="width:88px;height:36px" onclick="editWorker('${x.id}')">تعديل</button></div></div>`).join(''):'<div class="empty">لا يوجد</div>';
  $('materialsBox').innerHTML=mItems.length?mItems.map(x=>`<div class="item"><div class="row"><div><div class="name">#${x.seq} — ${esc(x.material)}</div><div class="small">${fmtDate(x.date)} | ${esc(x.project)} | ${esc(x.supplier)} ${x.photoLinks&&x.photoLinks.length?`| ${x.photoLinks.length} صورة`:''}</div></div><button class="btn secondary" style="width:88px;height:36px" onclick="editMaterial('${x.id}')">تعديل</button></div></div>`).join(''):'<div class="empty">لا يوجد</div>';
}
window.editWorker=(id)=>{ const x=db.entries.workers.find(r=>r.id===id); if(!x) return; if(parseDateOnly(x.date)!==today()){ alert('تعديل اليوم فقط'); return; } editWorkerId=id; $('wDate').value=parseDateOnly(x.date); $('wCustomer').value=x.customer||''; filterProjectSelect('wProject',$('wCustomer').value); $('wProject').value=x.project||''; $('wWorker').value=x.worker||''; $('wStart').value=fmtTime(x.start)||'08:00'; $('wEnd').value=fmtTime(x.end)||'17:00'; $('wTask').value=x.task||''; $('wNote').value=x.note||''; updateSeqs(); };
window.editMaterial=(id)=>{ const x=db.entries.materials.find(r=>r.id===id); if(!x) return; if(parseDateOnly(x.date)!==today()){ alert('تعديل اليوم فقط'); return; } editMaterialId=id; $('mDate').value=parseDateOnly(x.date); $('mCustomer').value=x.customer||''; filterProjectSelect('mProject',$('mCustomer').value); $('mProject').value=x.project||''; $('mMaterial').value=x.material||''; $('mQty').value=x.qty||''; $('mPrice').value=x.price||''; $('mSupplier').value=x.supplier||''; $('mNote').value=x.note||''; pendingPhotoFiles=[]; renderPhotoPreview(x.photoLinks||[]); updateSeqs(); };
function renderPhotoPreview(existingLinks=[]){
  const filesHtml = existingLinks.map(l=>`<a href="${l}" target="_blank">صورة محفوظة</a>`).join('');
  const localHtml = pendingPhotoFiles.map(f=>`<span>${f.name}</span>`).join(' ');
  $('photoPreview').innerHTML = filesHtml + (filesHtml&&localHtml?' | ':'') + localHtml;
}
$('mPhotos').addEventListener('change', (e)=>{ pendingPhotoFiles=[...e.target.files]; renderPhotoPreview([]); });

async function uploadPhotoFile(file){
  const url=gasUrl(); if(!url) throw new Error('Missing GAS URL');
  const reader = new FileReader();
  const dataUrl = await new Promise((resolve,reject)=>{ reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(file); });
  const res = await fetch(url, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({action:'uploadImage', fileName:file.name, mimeType:file.type||'image/jpeg', dataUrl})});
  return await res.json();
}
async function uploadPendingPhotos(){
  if(!pendingPhotoFiles.length) return [];
  const links=[];
  for(const f of pendingPhotoFiles){
    const r = await uploadPhotoFile(f);
    if(r && r.ok && r.url) links.push(r.url);
  }
  pendingPhotoFiles=[]; $('mPhotos').value=''; renderPhotoPreview([]);
  return links;
}
function addValuePrompt(label, arrName, callback){
  const v=prompt('أدخل '+label); if(!v) return;
  uniq(db.memory[arrName], v);
  saveDB(); renderSelects();
  if(callback) callback(v);
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>show(b.dataset.screen));
document.querySelectorAll('[data-screen]').forEach(b=>b.onclick=()=>show(b.dataset.screen));
window.addEventListener('online', stat); window.addEventListener('offline', stat);
$('wDate').onchange=()=>{ editWorkerId=null; updateSeqs(); renderDayEdits();}; $('mDate').onchange=()=>{ editMaterialId=null; updateSeqs(); renderDayEdits();};
$('wCustomer').onchange=()=>{ filterProjectSelect('wProject',$('wCustomer').value); sticky.worker.customer=$('wCustomer').value; saveSticky(); };
$('mCustomer').onchange=()=>{ filterProjectSelect('mProject',$('mCustomer').value); sticky.material.customer=$('mCustomer').value; saveSticky(); };
$('wProject').onchange=()=>{ const c=projectCustomer($('wProject').value); if(c){ $('wCustomer').value=c; } sticky.worker.project=$('wProject').value; sticky.worker.customer=$('wCustomer').value; saveSticky(); };
$('mProject').onchange=()=>{ const c=projectCustomer($('mProject').value); if(c){ $('mCustomer').value=c; } sticky.material.project=$('mProject').value; sticky.material.customer=$('mCustomer').value; saveSticky(); };

$('addCustomerBtn').onclick=()=>addValuePrompt('اسم الزبون','customers',v=>{$('wCustomer').value=v;});
$('addCustomerBtn2').onclick=()=>addValuePrompt('اسم الزبون','customers',v=>{$('mCustomer').value=v;});
$('addWorkerBtn').onclick=()=>addValuePrompt('اسم العامل','workers',v=>{$('wWorker').value=v; $('rName').value=v;});
$('addTaskBtn').onclick=()=>addValuePrompt('وصف العمل','tasks',v=>{$('wTask').value=v;});
$('addMaterialBtn').onclick=()=>addValuePrompt('اسم المادة','materials',v=>{$('mMaterial').value=v;});
$('addSupplierBtn').onclick=()=>addValuePrompt('اسم المورد','suppliers',v=>{$('mSupplier').value=v;});
$('addProjectQuickBtn').onclick=()=>{ const n=prompt('أدخل اسم المشروع'); if(!n) return; const customer=$('wCustomer').value||prompt('اسم الزبون لهذا المشروع')||''; db.projects.push({name:n,customer,commitment:0}); uniq(db.memory.projects,n); if(customer) uniq(db.memory.customers,customer); saveDB(); renderSelects(); $('wCustomer').value=customer; filterProjectSelect('wProject',customer); $('wProject').value=n; };
$('addProjectQuickBtn2').onclick=()=>{ const n=prompt('أدخل اسم المشروع'); if(!n) return; const customer=$('mCustomer').value||prompt('اسم الزبون لهذا المشروع')||''; db.projects.push({name:n,customer,commitment:0}); uniq(db.memory.projects,n); if(customer) uniq(db.memory.customers,customer); saveDB(); renderSelects(); $('mCustomer').value=customer; filterProjectSelect('mProject',customer); $('mProject').value=n; };

$('loginBtn').onclick=()=>{ const user=users.find(u=>u.username===$('loginUser').value.trim()&&u.password===$('loginPass').value.trim()); if(!user){ alert('بيانات خاطئة'); return; } currentUser=user; $('loginScreen').classList.remove('active'); $('appShell').classList.remove('hidden'); applyRole(); show('home'); };
$('logoutBtn').onclick=()=>{ currentUser=null; $('appShell').classList.add('hidden'); show('login'); };
$('saveUrlBtn').onclick=()=>{ localStorage.setItem(GAS_KEY, $('gasUrl').value.trim()); $('syncStatus').textContent='تم حفظ الرابط'; };

$('importBtn').onclick=async()=>{ const url=gasUrl(); if(!url){ $('syncStatus').textContent='ضع الرابط أولاً'; return; } try{ const res=await fetch(url+'?action=importAll',{cache:'no-store'}); const json=await res.json(); if(json&&json.db){ db=json.db; db.entries.workers.forEach(x=>{x.synced=true; x.date=parseDateOnly(x.date); x.start=fmtTime(x.start); x.end=fmtTime(x.end);}); db.entries.materials.forEach(x=>{x.synced=true; x.date=parseDateOnly(x.date);}); saveDB(); renderSelects(); stat(); renderDayEdits(); $('syncStatus').textContent='تم التحديث من الشيت'; $('syncMini').textContent='Imported'; $('syncMini').className='pill ok'; } }catch(e){ $('syncStatus').textContent='فشل الاستيراد'; $('syncMini').textContent='Failed'; $('syncMini').className='pill bad'; }};

$('appendBtn').onclick=async()=>{ const url=gasUrl(); if(!url){ $('syncStatus').textContent='ضع الرابط أولاً'; return; } const payload={action:'appendNewRecords', projects:db.projects, workerRates:db.workerRates, memory:db.memory, entries:{workers:db.entries.workers.filter(x=>!x.synced), materials:db.entries.materials.filter(x=>!x.synced)}}; try{ const res=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),cache:'no-store'}); const txt=await res.text(); db.entries.workers.forEach(x=>x.synced=true); db.entries.materials.forEach(x=>x.synced=true); saveDB(); stat(); $('syncStatus').textContent='تم إرسال السجلات الجديدة: '+txt; $('syncMini').textContent='Synced'; $('syncMini').className='pill ok'; }catch(e){ $('syncStatus').textContent='فشل الإرسال'; $('syncMini').textContent='Failed'; $('syncMini').className='pill bad'; }};

$('saveWorkerBtn').onclick=()=>{ const rec={id:editWorkerId||('W-'+Date.now()), seq:daySeq('workers',$('wDate').value, editWorkerId), date:$('wDate').value, customer:$('wCustomer').value, project:$('wProject').value, worker:$('wWorker').value, start:$('wStart').value, end:$('wEnd').value, task:$('wTask').value, note:$('wNote').value.trim(), synced:false}; if(!rec.date||!rec.customer||!rec.project||!rec.worker){ alert('املأ الحقول'); return; } const rr=workerRate(rec.worker), sp=rec.start.split(':'), ep=rec.end.split(':'); rec.hours=((+ep[0]*60+ +ep[1])-(+sp[0]*60+ +sp[1]))/60; rec.rate=Number(rr.rate||0); rec.cost=rec.hours*rec.rate; if(editWorkerId){ const i=db.entries.workers.findIndex(x=>x.id===editWorkerId); db.entries.workers[i]=rec; } else { db.entries.workers.push(rec); } uniq(db.memory.customers,rec.customer); uniq(db.memory.projects,rec.project); uniq(db.memory.workers,rec.worker); uniq(db.memory.tasks,rec.task); sticky.worker={date:rec.date,customer:rec.customer,project:rec.project}; saveSticky(); saveDB(); renderSelects(); stat(); $('syncMini').textContent='Pending'; $('syncMini').className='pill warn'; editWorkerId=null; $('wWorker').value=''; $('wTask').value=''; $('wNote').value=''; fillTimeSelect('wStart','08:00'); fillTimeSelect('wEnd','17:00'); bindSticky(); renderDayEdits(); };

$('saveMaterialBtn').onclick=async()=>{ const rec={id:editMaterialId||('M-'+Date.now()), seq:daySeq('materials',$('mDate').value, editMaterialId), date:$('mDate').value, customer:$('mCustomer').value, project:$('mProject').value, material:$('mMaterial').value, qty:+$('mQty').value||0, price:+$('mPrice').value||0, supplier:$('mSupplier').value, note:$('mNote').value.trim(), synced:false}; if(!rec.date||!rec.customer||!rec.project||!rec.material){ alert('املأ الحقول'); return; } rec.total=rec.qty*rec.price; let links=[]; try{ links=await uploadPendingPhotos(); }catch(e){ alert('تعذر رفع بعض الصور الآن. يمكنك المتابعة بدونها أو التأكد من رابط Apps Script.'); } if(editMaterialId){ const old=db.entries.materials.find(x=>x.id===editMaterialId); rec.photoLinks=(old.photoLinks||[]).concat(links); const i=db.entries.materials.findIndex(x=>x.id===editMaterialId); db.entries.materials[i]=rec; } else { rec.photoLinks=links; db.entries.materials.push(rec); } uniq(db.memory.customers,rec.customer); uniq(db.memory.projects,rec.project); uniq(db.memory.materials,rec.material); uniq(db.memory.suppliers,rec.supplier); sticky.material={date:rec.date,customer:rec.customer,project:rec.project}; saveSticky(); saveDB(); renderSelects(); stat(); $('syncMini').textContent='Pending'; $('syncMini').className='pill warn'; editMaterialId=null; $('mMaterial').value=''; $('mQty').value=''; $('mPrice').value=''; $('mSupplier').value=''; $('mNote').value=''; bindSticky(); renderDayEdits(); };

$('saveProjectBtn').onclick=()=>{ const rec={name:$('pName').value.trim(), customer:$('pCustomer').value, commitment:+$('pCommitment').value||0}; if(!rec.name||!rec.customer){ alert('املأ الحقول'); return; } const i=db.projects.findIndex(x=>x.name===rec.name); if(i>=0) db.projects[i]=rec; else db.projects.push(rec); uniq(db.memory.projects,rec.name); uniq(db.memory.customers,rec.customer); saveDB(); renderSelects(); $('pName').value=''; $('pCustomer').value=''; $('pCommitment').value=''; };
$('saveRateBtn').onclick=()=>{ const rec={name:$('rName').value, rate:+$('rRate').value||0, advance:+$('rAdvance').value||0}; if(!rec.name){ alert('أدخل العامل'); return; } const i=db.workerRates.findIndex(x=>x.name===rec.name); if(i>=0) db.workerRates[i]=rec; else db.workerRates.push(rec); uniq(db.memory.workers,rec.name); saveDB(); renderSelects(); $('rRate').value=''; $('rAdvance').value=''; };

$('changePassBtn').onclick=()=>{ const a=$('newPass').value,b=$('confirmPass').value; if(!a||a.length<4){alert('الباسورد قصير'); return;} if(a!==b){alert('التأكيد غير مطابق'); return;} const i=users.findIndex(u=>u.username===currentUser.username); users[i].password=a; currentUser=users[i]; saveUsers(); renderUsers(); $('newPass').value=''; $('confirmPass').value=''; alert('تم تغيير الباسورد'); };
$('addUserBtn').onclick=()=>{ const n=$('uName').value.trim(), p=$('uPass').value.trim(), r=$('uRole').value; if(!n||!p){ alert('املأ الحقول'); return; } if(users.some(u=>u.username===n)){ alert('المستخدم موجود'); return; } users.push({username:n,password:p,role:r}); saveUsers(); renderUsers(); $('uName').value=''; $('uPass').value=''; };

$('buildReportBtn').onclick=()=>{ const mode=$('reportMode').value, project=$('rProject').value, customer=$('rCustomer').value, from=$('rFrom').value, to=$('rTo').value; const inRange=d=>(!from||parseDateOnly(d)>=from)&&(!to||parseDateOnly(d)<=to); const workers=db.entries.workers.filter(x=>inRange(x.date)&&(mode==='project'?(!project||x.project===project):(!customer||x.customer===customer))); const mats=db.entries.materials.filter(x=>inRange(x.date)&&(mode==='project'?(!project||x.project===project):(!customer||x.customer===customer))); const wc=workers.reduce((s,x)=>s+Number(x.cost||0),0), mc=mats.reduce((s,x)=>s+Number(x.total||0),0); lastReport=`<img src="./logo-icool.jpg" style="width:140px"><h3>${mode==='project'?'كشف المشروع':'كشف الزبون'}</h3><div>${mode==='project'?'المشروع':'الزبون'}: ${esc(mode==='project'?project:customer)} | الفترة ${fmtDate(from)} إلى ${fmtDate(to)}</div><table><tr><th>كلفة العمال</th><th>كلفة المواد</th><th>الإجمالي</th></tr><tr><td>$${wc.toFixed(2)}</td><td>$${mc.toFixed(2)}</td><td>$${(wc+mc).toFixed(2)}</td></tr></table><h4>العمال</h4><table><tr><th>التاريخ</th><th>العامل</th><th>الوقت</th><th>الساعات</th><th>الكلفة</th></tr>${workers.map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${esc(x.worker)}</td><td>${fmtTime(x.start)}-${fmtTime(x.end)}</td><td>${Number(x.hours||0).toFixed(2)}</td><td>$${Number(x.cost||0).toFixed(2)}</td></tr>`).join('')||'<tr><td colspan="5">لا يوجد</td></tr>'}</table><h4>المواد</h4><table><tr><th>التاريخ</th><th>المادة</th><th>المورد</th><th>الكمية</th><th>الإجمالي</th></tr>${mats.map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${esc(x.material)}</td><td>${esc(x.supplier)}</td><td>${Number(x.qty||0).toFixed(2)}</td><td>$${Number(x.total||0).toFixed(2)}</td></tr>`).join('')||'<tr><td colspan="5">لا يوجد</td></tr>'}</table>`; $('reportBox').innerHTML=lastReport; };
$('printReportBtn').onclick=()=>{ if(!lastReport){ alert('أنشئ التقرير أولاً'); return; } printHtml(lastReport,'Report'); };
$('waReportBtn').onclick=()=>{ if(!lastReport){ alert('أنشئ التقرير أولاً'); return; } openWA($('reportWhatsapp').value, $('reportBox').innerText); };

$('buildPayrollBtn').onclick=()=>{ const worker=$('payWorker').value, from=$('payFrom').value, to=$('payTo').value; const inRange=d=>(!from||parseDateOnly(d)>=from)&&(!to||parseDateOnly(d)<=to); const data=db.entries.workers.filter(x=>inRange(x.date)&&(!worker||x.worker===worker)); const grouped={}; data.forEach(x=>{ const r=workerRate(x.worker); if(!grouped[x.worker]) grouped[x.worker]={hours:0,cost:0,days:0,rate:r.rate||0,advance:r.advance||0}; grouped[x.worker].hours+=Number(x.hours||0); grouped[x.worker].cost+=Number(x.cost||0); grouped[x.worker].days+=1; }); lastPayroll=`<img src="./logo-icool.jpg" style="width:140px"><h3>Payroll</h3><div>الفترة ${fmtDate(from)} إلى ${fmtDate(to)}</div><table><tr><th>العامل</th><th>الأيام</th><th>الساعات</th><th>الأجرة</th><th>الإجمالي</th><th>السلفة</th><th>الصافي</th></tr>${Object.entries(grouped).map(([n,v])=>`<tr><td>${esc(n)}</td><td>${v.days}</td><td>${v.hours.toFixed(2)}</td><td>$${Number(v.rate).toFixed(2)}</td><td>$${v.cost.toFixed(2)}</td><td>$${Number(v.advance).toFixed(2)}</td><td>$${(v.cost-v.advance).toFixed(2)}</td></tr>`).join('')||'<tr><td colspan="7">لا يوجد</td></tr>'}</table>`; $('payrollBox').innerHTML=lastPayroll; };
$('printPayrollBtn').onclick=()=>{ if(!lastPayroll){ alert('أنشئ Payroll أولاً'); return; } printHtml(lastPayroll,'Payroll'); };
$('waPayrollBtn').onclick=()=>{ if(!lastPayroll){ alert('أنشئ Payroll أولاً'); return; } openWA($('payWhatsapp').value, $('payrollBox').innerText); };

$('buildTsBtn').onclick=()=>{ const worker=$('tsWorker').value, from=$('tsFrom').value, to=$('tsTo').value; const inRange=d=>(!from||parseDateOnly(d)>=from)&&(!to||parseDateOnly(d)<=to); const data=db.entries.workers.filter(x=>inRange(x.date)&&(!worker||x.worker===worker)).sort((a,b)=>parseDateOnly(a.date).localeCompare(parseDateOnly(b.date))); const by={}; data.forEach(x=>{ if(!by[x.worker]) by[x.worker]=[]; by[x.worker].push(x); }); let out='<img src="./logo-icool.jpg" style="width:140px"><h3>Time Sheet</h3>'; Object.entries(by).forEach(([n,rows])=>{ out+=`<h4>${esc(n)}</h4><table><tr><th>التاريخ</th><th>دخول</th><th>خروج</th><th>ساعات</th></tr>`+rows.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${fmtTime(r.start)}</td><td>${fmtTime(r.end)}</td><td>${Number(r.hours||0).toFixed(2)}</td></tr>`).join('')+'</table>'; }); lastTs=out||'<div>لا يوجد</div>'; $('timesheetBox').innerHTML=lastTs; };
$('printTsBtn').onclick=()=>{ if(!lastTs){ alert('أنشئ Time Sheet أولاً'); return; } printHtml(lastTs,'Timesheet'); };
$('waTsBtn').onclick=()=>{ if(!lastTs){ alert('أنشئ Time Sheet أولاً'); return; } openWA($('tsWhatsapp').value, $('timesheetBox').innerText); };

if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').then(()=>{ $('syncMini').textContent='PWA Ready'; $('syncMini').className='pill ok'; }).catch(()=>{}); }
fillTimeSelect('wStart','08:00'); fillTimeSelect('wEnd','17:00');
$('gasUrl').value=localStorage.getItem(GAS_KEY)||''; renderSelects(); renderUsers(); stat(); bindSticky(); renderDayEdits();
