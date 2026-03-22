/**
 * iCOOL ERP - Import once + Append only
 * Deploy as Web App:
 * - Execute as: Me
 * - Access: Anyone with the link
 *
 * GET  ?action=importAll
 * POST { action:"appendNewRecords", projects, workerRates, memory, entries:{workers,materials} }
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  if (action === "importAll") {
    return jsonOutput_({ ok:true, db: importAll_() });
  }
  return jsonOutput_({ ok:true, message:"backend ready" });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    if ((body.action || "") === "appendNewRecords") {
      appendNewRecords_(body);
      return ContentService.createTextOutput("OK");
    }
    return ContentService.createTextOutput("UNKNOWN_ACTION");
  } catch (err) {
    return ContentService.createTextOutput("ERROR: " + err.message);
  }
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss_(){ return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name){
  var sh = ss_().getSheetByName(name);
  if (!sh) sh = ss_().insertSheet(name);
  return sh;
}

function ensureHeaders_(name, headers){
  var sh = sheet_(name);
  if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]);
  return sh;
}

function readRows_(name){
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).filter(function(r){ return r.join("") !== ""; }).map(function(row){
    var obj = {};
    headers.forEach(function(h,i){ obj[h]=row[i]; });
    return obj;
  });
}

function readSingle_(name){
  return readRows_(name).map(function(x){ return x.value; }).filter(String);
}

function importAll_(){
  ensureHeaders_("Projects", ["name","customer","commitment"]);
  ensureHeaders_("WorkerRates", ["name","rate","advance"]);
  ensureHeaders_("WorkerEntries", ["id","seq","date","customer","project","worker","start","end","task","hours","rate","cost","synced"]);
  ensureHeaders_("MaterialEntries", ["id","seq","date","customer","project","material","qty","price","supplier","total","synced"]);
  ensureHeaders_("Memory_Projects", ["value"]);
  ensureHeaders_("Memory_Customers", ["value"]);
  ensureHeaders_("Memory_Workers", ["value"]);
  ensureHeaders_("Memory_Materials", ["value"]);
  ensureHeaders_("Memory_Suppliers", ["value"]);
  ensureHeaders_("Memory_Tasks", ["value"]);

  var workers = readRows_("WorkerEntries").map(function(x, i){
    if (!x.id) x.id = "W-IMP-" + (i+1);
    if (x.synced === "" || x.synced == null) x.synced = true;
    return x;
  });
  var materials = readRows_("MaterialEntries").map(function(x, i){
    if (!x.id) x.id = "M-IMP-" + (i+1);
    if (x.synced === "" || x.synced == null) x.synced = true;
    return x;
  });

  return {
    memory: {
      projects: readSingle_("Memory_Projects"),
      customers: readSingle_("Memory_Customers"),
      workers: readSingle_("Memory_Workers"),
      materials: readSingle_("Memory_Materials"),
      suppliers: readSingle_("Memory_Suppliers"),
      tasks: readSingle_("Memory_Tasks")
    },
    entries: { workers: workers, materials: materials },
    projects: readRows_("Projects"),
    workerRates: readRows_("WorkerRates")
  };
}

function upsertListSheet_(name, headers, rows, keyField){
  var sh = ensureHeaders_(name, headers);
  var existing = readRows_(name);
  var map = {};
  existing.forEach(function(x){ map[String(x[keyField]||"")] = x; });
  rows.forEach(function(r){ map[String(r[keyField]||"")] = r; });
  var merged = Object.keys(map).filter(function(k){ return k !== ""; }).map(function(k){ return map[k]; });
  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  if (merged.length) {
    sh.getRange(2,1,merged.length,headers.length).setValues(merged.map(function(r){
      return headers.map(function(h){ return r[h] || ""; });
    }));
  }
}

function appendUniqueEntries_(name, headers, rows, idField){
  var sh = ensureHeaders_(name, headers);
  var existing = readRows_(name);
  var ids = {};
  existing.forEach(function(x){ ids[String(x[idField]||"")] = true; });
  var toAppend = rows.filter(function(r){
    var id = String(r[idField] || "");
    return id && !ids[id];
  });
  if (toAppend.length) {
    sh.getRange(sh.getLastRow()+1,1,toAppend.length,headers.length).setValues(
      toAppend.map(function(r){ return headers.map(function(h){ return r[h] || ""; }); })
    );
  }
}

function appendUniqueValues_(name, values){
  var sh = ensureHeaders_(name, ["value"]);
  var existing = readSingle_(name);
  var set = {};
  existing.forEach(function(v){ set[String(v)] = true; });
  var toAppend = values.filter(function(v){
    var s = String(v || "").trim();
    return s && !set[s];
  }).map(function(v){ return [v]; });
  if (toAppend.length) {
    sh.getRange(sh.getLastRow()+1,1,toAppend.length,1).setValues(toAppend);
  }
}

function appendNewRecords_(body){
  body = body || {};
  var projects = body.projects || [];
  var workerRates = body.workerRates || [];
  var memory = body.memory || {};
  var entries = body.entries || {};

  upsertListSheet_("Projects", ["name","customer","commitment"], projects, "name");
  upsertListSheet_("WorkerRates", ["name","rate","advance"], workerRates, "name");

  appendUniqueEntries_("WorkerEntries",
    ["id","seq","date","customer","project","worker","start","end","task","hours","rate","cost","synced"],
    entries.workers || [],
    "id"
  );

  appendUniqueEntries_("MaterialEntries",
    ["id","seq","date","customer","project","material","qty","price","supplier","total","synced"],
    entries.materials || [],
    "id"
  );

  appendUniqueValues_("Memory_Projects", memory.projects || []);
  appendUniqueValues_("Memory_Customers", memory.customers || []);
  appendUniqueValues_("Memory_Workers", memory.workers || []);
  appendUniqueValues_("Memory_Materials", memory.materials || []);
  appendUniqueValues_("Memory_Suppliers", memory.suppliers || []);
  appendUniqueValues_("Memory_Tasks", memory.tasks || []);
}