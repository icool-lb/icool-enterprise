(() => {
const KEY='icool_final_db', USERS_KEY='icool_final_users', GAS_KEY='icool_gas_webapp_url_v1';
const DEFAULT_USERS=[{username:'admin',password:'1234',role:'admin'},{username:'foreman',password:'1234',role:'foreman'}];
const blank={memory:{projects:[],customers:[],workers:[],materials:[],suppliers:[],tasks:[]},entries:{workers:[],materials:[]},projects:[],workerRates:[]};
const $=id=>document.getElementById(id), esc=s=>String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
let db=load(KEY,blank), users=load(USERS_KEY,DEFAULT_USERS), currentUser=null, lastReport='', lastPayroll='', lastTs='';
const saveDB=()=>localStorage.setItem(KEY,JSON.stringify(db)); const saveUsers=()=>localStorage.setItem(USERS_KEY,JSON.stringify(users));
const uniq=(arr,v)=>{v=String(v||'').trim(); if(v&&!arr.includes(v))arr.push(v)};
function fill(id,arr){$(id).innerHTML=(arr||[]).map(v=>`<option value="${esc(v)}"></option>`).join('');}
function renderMemory(){fill('projectsList',db.memory.projects); fill('customersList',db.memory.customers); fill('workersList',db.memory.workers); fill('materialsList',db.memory.materials); fill('suppliersList',db.memory.suppliers); fill('tasksList',db.memory.tasks);}
function stat(){const q=db.entries.workers.filter(x=>!x.synced).length+db.entries.materials.filter(x=>!x.synced).length; $('queueStatus').textContent='Queue: '+q; $('queueStatus').className='pill '+(q?'warn':'ok'); $('netStatus').textContent=navigator.onLine?'Online':'Offline'; $('netStatus').className='pill '+(navigator.onLine?'ok':'warn');}
function show(screen){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); if(screen==='login') $('loginScreen').classList.add('active'); else $('screen-'+screen).classList.add('active'); document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.screen===screen));}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>show(b.dataset.screen));
function renderLists(){
 $('workersBox').innerHTML=db.entries.workers.length?db.entries.workers.slice().reverse().slice(0,10).map(x=>`<div class="item"><div class="name">${esc(x.worker)}</div><div class="small">${x.date} | ${esc(x.project)} | ${esc(x.task)}</div></div>`).join(''):'<div class="empty">لا يوجد</div>';
 $('materialsBox').innerHTML=db.entries.materials.length?db.entries.materials.slice().reverse().slice(0,10).map(x=>`<div class="item"><div class="name">${esc(x.material)}</div><div class="small">${x.date} | ${esc(x.project)} | ${esc(x.supplier)}</div></div>`).join(''):'<div class="empty">لا يوجد</div>';
 $('projectsBox').innerHTML=db.projects.length?db.projects.map(x=>`<div class="item"><div class="name">${esc(x.name)}</div><div class="small">${esc(x.customer)} | $${Number(x.commitment||0).toFixed(2)}</div></div>`).join(''):'<div class="empty">لا يوجد</div>';
 $('ratesBox').innerHTML=db.workerRates.length?db.workerRates.map(x=>`<div class="item"><div class="name">${esc(x.name)}</div><div class="small">Rate $${Number(x.rate||0).toFixed(2)} | Advance $${Number(x.advance||0).toFixed(2)}</div></div>`).join(''):'<div class="empty">لا يوجد</div>';
 $('usersBox').innerHTML=users.length?users.map(u=>`<div class="item"><div class="name">${esc(u.username)}</div><div class="small">${esc(u.role)}</div></div>`).join(''):'<div class="empty">لا يوجد</div>';
}
function applyRole(){const admin=currentUser&&currentUser.role==='admin'; document.querySelectorAll('.admin-only').forEach(el=>el.classList.toggle('hidden',!admin)); $('sessionInfo').textContent=currentUser?`${currentUser.username} / ${currentUser.role}`:'-'; $('currentUser').value=currentUser?currentUser.username:'';}
$('loginBtn').onclick=()=>{const user=users.find(u=>u.username===$('loginUser').value.trim()&&u.password===$('loginPass').value.trim()); if(!user){alert('بيانات خاطئة'); return;} currentUser=user; $('loginScreen').classList.remove('active'); $('appShell').classList.remove('hidden'); applyRole(); show('home');};
$('logoutBtn').onclick=()=>{currentUser=null; $('appShell').classList.add('hidden'); show('login');};
function workerRate(name){return db.workerRates.find(x=>x.name===name)||{rate:0,advance:0};}
async function syncNow(){const url=$('gasUrl').value.trim()||localStorage.getItem(GAS_KEY)||''; if(!url){$('syncStatus').textContent='ضع رابط Web App أولاً'; return;} try{const res=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'pushAll',db:db})}); const txt=await res.text(); $('syncStatus').textContent='تمت المزامنة: '+txt; $('syncMini').textContent='Synced'; $('syncMini').className='pill ok'; db.entries.workers.forEach(x=>x.synced=true); db.entries.materials.forEach(x=>x.synced=true); saveDB(); stat(); renderLists();}catch(e){$('syncStatus').textContent='فشل الربط'; $('syncMini').textContent='Failed'; $('syncMini').className='pill bad';}}
async function pullNow(){const url=$('gasUrl').value.trim()||localStorage.getItem(GAS_KEY)||''; if(!url){$('syncStatus').textContent='ضع الرابط أولاً'; return;} try{const res=await fetch(url+'?action=pullAll'); const data=await res.json(); if(data.db){db=data.db; saveDB(); renderMemory(); renderLists(); stat(); $('syncStatus').textContent='تم السحب'; $('syncMini').textContent='Pulled'; $('syncMini').className='pill ok';}}catch(e){$('syncStatus').textContent='فشل السحب';}}
function maybeSync(){if(navigator.onLine) syncNow();}
$('saveUrlBtn').onclick=()=>{localStorage.setItem(GAS_KEY,$('gasUrl').value.trim()); $('syncStatus').textContent='تم حفظ الرابط';};
$('syncBtn').onclick=syncNow; $('pullBtn').onclick=pullNow; window.addEventListener('online',()=>{stat(); maybeSync();}); window.addEventListener('offline',stat);
$('saveWorkerBtn').onclick=()=>{const rec={date:$('wDate').value,customer:$('wCustomer').value.trim(),project:$('wProject').value.trim(),worker:$('wWorker').value.trim(),start:$('wStart').value,end:$('wEnd').value,task:$('wTask').value.trim(),synced:false}; if(!rec.date||!rec.customer||!rec.project||!rec.worker){alert('املأ الحقول'); return;} const rr=workerRate(rec.worker), sp=rec.start.split(':'), ep=rec.end.split(':'); rec.hours=((+ep[0]*60+ +ep[1])-(+sp[0]*60+ +sp[1]))/60; rec.rate=rr.rate||0; rec.cost=rec.hours*rec.rate; db.entries.workers.push(rec); uniq(db.memory.customers,rec.customer); uniq(db.memory.projects,rec.project); uniq(db.memory.workers,rec.worker); uniq(db.memory.tasks,rec.task); saveDB(); renderMemory(); renderLists(); stat(); $('syncMini').textContent='Pending'; $('syncMini').className='pill warn'; maybeSync(); $('wWorker').value=''; $('wTask').value='';};
$('saveMaterialBtn').onclick=()=>{const rec={date:$('mDate').value,customer:$('mCustomer').value.trim(),project:$('mProject').value.trim(),material:$('mMaterial').value.trim(),qty:+$('mQty').value||0,price:+$('mPrice').value||0,supplier:$('mSupplier').value.trim(),synced:false}; if(!rec.date||!rec.customer||!rec.project||!rec.material){alert('املأ الحقول'); return;} rec.total=rec.qty*rec.price; db.entries.materials.push(rec); uniq(db.memory.customers,rec.customer); uniq(db.memory.projects,rec.project); uniq(db.memory.materials,rec.material); uniq(db.memory.suppliers,rec.supplier); saveDB(); renderMemory(); renderLists(); stat(); $('syncMini').textContent='Pending'; $('syncMini').className='pill warn'; maybeSync(); $('mMaterial').value=''; $('mQty').value=''; $('mPrice').value=''; $('mSupplier').value='';};
$('saveProjectBtn').onclick=()=>{const rec={name:$('pName').value.trim(),customer:$('pCustomer').value.trim(),commitment:+$('pCommitment').value||0}; if(!rec.name||!rec.customer){alert('املأ الحقول'); return;} const i=db.projects.findIndex(x=>x.name===rec.name); if(i>=0) db.projects[i]=rec; else db.projects.push(rec); uniq(db.memory.projects,rec.name); uniq(db.memory.customers,rec.customer); saveDB(); renderMemory(); renderLists(); maybeSync(); $('pName').value=''; $('pCustomer').value=''; $('pCommitment').value='';};
$('saveRateBtn').onclick=()=>{const rec={name:$('rateName').value.trim(),rate:+$('rateValue').value||0,advance:+$('advanceValue').value||0}; if(!rec.name){alert('أدخل العامل'); return;} const i=db.workerRates.findIndex(x=>x.name===rec.name); if(i>=0) db.workerRates[i]=rec; else db.workerRates.push(rec); uniq(db.memory.workers,rec.name); saveDB(); renderMemory(); renderLists(); maybeSync(); $('rateName').value=''; $('rateValue').value=''; $('advanceValue').value='';};
$('changePassBtn').onclick=()=>{const a=$('newPass').value,b=$('confirmPass').value; if(!a||a.length<4){alert('الباسورد قصير'); return;} if(a!==b){alert('التأكيد غير مطابق'); return;} const i=users.findIndex(u=>u.username===currentUser.username); users[i].password=a; currentUser=users[i]; saveUsers(); renderLists(); $('newPass').value=''; $('confirmPass').value=''; alert('تم تغيير الباسورد');};
$('addUserBtn').onclick=()=>{const n=$('uName').value.trim(),p=$('uPass').value.trim(),r=$('uRole').value; if(!n||!p){alert('املأ الحقول'); return;} if(users.some(u=>u.username===n)){alert('المستخدم موجود'); return;} users.push({username:n,password:p,role:r}); saveUsers(); renderLists(); $('uName').value=''; $('uPass').value=''; alert('تمت إضافة user');};
function printHtml(html,title){const w=window.open('','_blank'); if(!w){alert('افتح من Safari أو Chrome'); return;} w.document.write(`<html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:right}th{background:#f6f8fb}</style></head><body>${html}</body></html>`); w.document.close(); w.print();}
$('buildReportBtn').onclick=()=>{const mode=$('reportMode').value, project=$('rProject').value.trim(), customer=$('rCustomer').value.trim(), from=$('rFrom').value, to=$('rTo').value; const inRange=d=>(!from||d>=from)&&(!to||d<=to); const workers=db.entries.workers.filter(x=>inRange(x.date)&&(mode==='project'?(x.project===project||!project):(x.customer===customer||!customer))); const mats=db.entries.materials.filter(x=>inRange(x.date)&&(mode==='project'?(x.project===project||!project):(x.customer===customer||!customer))); const wc=workers.reduce((s,x)=>s+Number(x.cost||0),0), mc=mats.reduce((s,x)=>s+Number(x.total||0),0); lastReport=`<h3>${mode==='project'?'كشف المشروع':'كشف الزبون'}</h3><div>${mode==='project'?'المشروع':'الزبون'}: ${esc(mode==='project'?project:customer)} | الفترة ${from||'-'} إلى ${to||'-'}</div><table><tr><th>كلفة العمال</th><th>كلفة المواد</th><th>الإجمالي</th></tr><tr><td>$${wc.toFixed(2)}</td><td>$${mc.toFixed(2)}</td><td>$${(wc+mc).toFixed(2)}</td></tr></table><h4>العمال</h4><table><tr><th>التاريخ</th><th>العامل</th><th>الوقت</th><th>الساعات</th><th>الكلفة</th></tr>${workers.map(x=>`<tr><td>${x.date}</td><td>${esc(x.worker)}</td><td>${x.start}-${x.end}</td><td>${Number(x.hours||0).toFixed(2)}</td><td>$${Number(x.cost||0).toFixed(2)}</td></tr>`).join('')||'<tr><td colspan="5">لا يوجد</td></tr>'}</table><h4>المواد</h4><table><tr><th>التاريخ</th><th>المادة</th><th>المورد</th><th>الكمية</th><th>الإجمالي</th></tr>${mats.map(x=>`<tr><td>${x.date}</td><td>${esc(x.material)}</td><td>${esc(x.supplier)}</td><td>${Number(x.qty||0).toFixed(2)}</td><td>$${Number(x.total||0).toFixed(2)}</td></tr>`).join('')||'<tr><td colspan="5">لا يوجد</td></tr>'}</table>`; $('reportBox').innerHTML=lastReport;};
$('printReportBtn').onclick=()=>{if(!lastReport){alert('أنشئ التقرير أولاً');return;} printHtml(lastReport,'Report');};
$('buildPayrollBtn').onclick=()=>{const worker=$('payWorker').value.trim(), from=$('payFrom').value, to=$('payTo').value; const inRange=d=>(!from||d>=from)&&(!to||d<=to); const data=db.entries.workers.filter(x=>inRange(x.date)&&(!worker||x.worker===worker)); const grouped={}; data.forEach(x=>{const r=workerRate(x.worker); if(!grouped[x.worker]) grouped[x.worker]={hours:0,cost:0,days:0,rate:r.rate||0,advance:r.advance||0}; grouped[x.worker].hours+=Number(x.hours||0); grouped[x.worker].cost+=Number(x.cost||0); grouped[x.worker].days+=1;}); lastPayroll=`<h3>Payroll</h3><div>الفترة ${from||'-'} إلى ${to||'-'}</div><table><tr><th>العامل</th><th>الأيام</th><th>الساعات</th><th>الأجرة</th><th>الإجمالي</th><th>السلفة</th><th>الصافي</th></tr>${Object.entries(grouped).map(([n,v])=>`<tr><td>${esc(n)}</td><td>${v.days}</td><td>${v.hours.toFixed(2)}</td><td>$${Number(v.rate).toFixed(2)}</td><td>$${v.cost.toFixed(2)}</td><td>$${Number(v.advance).toFixed(2)}</td><td>$${(v.cost-v.advance).toFixed(2)}</td></tr>`).join('')||'<tr><td colspan="7">لا يوجد</td></tr>'}</table>`; $('payrollBox').innerHTML=lastPayroll||'<div class="empty">لا يوجد</div>';};
$('printPayrollBtn').onclick=()=>{if(!lastPayroll){alert('أنشئ Payroll أولاً');return;} printHtml(lastPayroll,'Payroll');};
$('buildTsBtn').onclick=()=>{const worker=$('tsWorker').value.trim(), from=$('tsFrom').value, to=$('tsTo').value; const inRange=d=>(!from||d>=from)&&(!to||d<=to); const data=db.entries.workers.filter(x=>inRange(x.date)&&(!worker||x.worker===worker)).sort((a,b)=>a.date.localeCompare(b.date)); const by={}; data.forEach(x=>{if(!by[x.worker]) by[x.worker]=[]; by[x.worker].push(x)}); let out='<h3>Time Sheet</h3>'; Object.entries(by).forEach(([n,rows])=>{out+=`<h4>${esc(n)}</h4><table><tr><th>التاريخ</th><th>دخول</th><th>خروج</th><th>ساعات</th><th>المشروع</th><th>الحالة</th></tr>`+rows.map(r=>`<tr><td>${r.date}</td><td>${r.start}</td><td>${r.end}</td><td>${Number(r.hours||0).toFixed(2)}</td><td>${esc(r.project)}</td><td>${esc(r.task||'حضور')}</td></tr>`).join('')+'</table>';}); lastTs=out||'<div>لا يوجد</div>'; $('timesheetBox').innerHTML=lastTs||'<div class="empty">لا يوجد</div>';};
$('printTsBtn').onclick=()=>{if(!lastTs){alert('أنشئ Time Sheet أولاً');return;} printHtml(lastTs,'Timesheet');};
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').then(()=>{$('swStatus').textContent='PWA Ready'; $('swStatus').className='pill ok';}).catch(()=>{});}
$('gasUrl').value=localStorage.getItem(GAS_KEY)||''; const d=new Date().toISOString().slice(0,10); ['wDate','mDate','rFrom','rTo','payFrom','payTo','tsFrom','tsTo'].forEach(id=>$(id).value=d); renderMemory(); renderLists(); stat();
})();

/* ===== Smart auto sync extension ===== */
const VERSION_KEY = 'icool_sheet_version_v1';
function getLocalVersion(){ return Number(localStorage.getItem(VERSION_KEY) || 0); }
function setLocalVersion(v){ localStorage.setItem(VERSION_KEY, String(Number(v)||0)); }
function gasUrl_(){ return ($('gasUrl')?.value || '').trim() || localStorage.getItem(GAS_KEY) || ''; }

async function checkForRemoteUpdates() {
  const url = gasUrl_();
  if (!url || !navigator.onLine) return;
  try {
    const localVersion = getLocalVersion();
    const res = await fetch(url + '?action=pullIfChanged&version=' + encodeURIComponent(localVersion), { cache: 'no-store' });
    const json = await res.json();
    if (!json || !json.ok) return;
    if (json.changed && json.db) {
      db = json.db;
      saveDB();
      if (json.version != null) setLocalVersion(json.version);
      renderMemory();
      renderLists();
      stat();
      $('syncStatus').textContent = 'تم التحديث تلقائياً من Google';
      $('syncMini').textContent = 'Updated';
      $('syncMini').className = 'pill ok';
    }
  } catch (e) {
    // keep silent; manual sync still available
  }
}

async function smartPullNow() {
  const url = gasUrl_();
  if (!url) { $('syncStatus').textContent = 'ضع الرابط أولاً'; return; }
  try {
    const res = await fetch(url + '?action=pullAll', { cache: 'no-store' });
    const json = await res.json();
    if (json && json.db) {
      db = json.db;
      saveDB();
      if (json.version != null) setLocalVersion(json.version);
      renderMemory();
      renderLists();
      stat();
      $('syncStatus').textContent = 'تم السحب الكامل';
      $('syncMini').textContent = 'Pulled';
      $('syncMini').className = 'pill ok';
    }
  } catch (e) {
    $('syncStatus').textContent = 'فشل السحب';
    $('syncMini').textContent = 'Pull failed';
    $('syncMini').className = 'pill bad';
  }
}

const _oldSyncNow = typeof syncNow === 'function' ? syncNow : null;
syncNow = async function() {
  const url = gasUrl_();
  if (!url) { $('syncStatus').textContent = 'ضع رابط Web App أولاً'; return false; }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({action:'pushAll', db:db}),
      cache: 'no-store'
    });
    const txt = await res.text();
    $('syncStatus').textContent = 'تمت المزامنة: ' + txt;
    $('syncMini').textContent = 'Synced';
    $('syncMini').className = 'pill ok';
    db.entries.workers.forEach(x=>x.synced=true);
    db.entries.materials.forEach(x=>x.synced=true);
    saveDB();
    // refresh version after push
    try {
      const vres = await fetch(url + '?action=getVersion', { cache:'no-store' });
      const vjson = await vres.json();
      if (vjson && vjson.version != null) setLocalVersion(vjson.version);
    } catch(e){}
    renderLists();
    stat();
    return true;
  } catch (e) {
    $('syncStatus').textContent = 'فشل الربط';
    $('syncMini').textContent = 'Failed';
    $('syncMini').className = 'pill bad';
    return false;
  }
};

if ($('pullBtn')) {
  $('pullBtn').onclick = smartPullNow;
}
if ($('saveUrlBtn')) {
  const old = $('saveUrlBtn').onclick;
  $('saveUrlBtn').onclick = () => {
    if (old) old();
    // fetch version immediately when URL saved
    checkForRemoteUpdates();
  };
}

window.addEventListener('online', () => {
  stat();
  checkForRemoteUpdates();
});

setInterval(() => {
  checkForRemoteUpdates();
}, 10000);

// initial version probe
setTimeout(checkForRemoteUpdates, 1500);
