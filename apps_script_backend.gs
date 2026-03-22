/**
 * iCOOL ERP backend for Google Apps Script
 * Deploy as Web App:
 * - Execute as: Me
 * - Access: Anyone with the link
 *
 * Smart sync:
 * - GET ?action=getVersion
 * - GET ?action=pullIfChanged&version=#
 * - GET ?action=pullAll
 * - POST { action: "pushAll", db: {...} }
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";

  if (action === "getVersion") {
    return jsonOutput_({
      ok: true,
      version: getMetaVersion_(),
      last_update: getMetaValue_("last_update")
    });
  }

  if (action === "pullIfChanged") {
    var clientVersion = Number((e.parameter && e.parameter.version) || 0);
    var serverVersion = getMetaVersion_();
    if (clientVersion >= serverVersion) {
      return jsonOutput_({
        ok: true,
        changed: false,
        version: serverVersion,
        last_update: getMetaValue_("last_update")
      });
    }
    return jsonOutput_({
      ok: true,
      changed: true,
      version: serverVersion,
      last_update: getMetaValue_("last_update"),
      db: pullDatabase_()
    });
  }

  if (action === "pullAll") {
    return jsonOutput_({
      ok: true,
      changed: true,
      version: getMetaVersion_(),
      last_update: getMetaValue_("last_update"),
      db: pullDatabase_()
    });
  }

  return jsonOutput_({ ok: true, message: "iCOOL backend ready" });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    if ((body.action || "") === "pushAll") {
      pushDatabase_(body.db || {});
      bumpMetaVersion_();
      return ContentService.createTextOutput("OK");
    }
    return ContentService.createTextOutput("UNKNOWN_ACTION");
  } catch (err) {
    return ContentService.createTextOutput("ERROR: " + err.message);
  }
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ss_(){ return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(name){
  var sh = ss_().getSheetByName(name);
  if(!sh) sh = ss_().insertSheet(name);
  return sh;
}

function ensureMeta_() {
  var sh = sheet_("Meta");
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 3, 2).setValues([
      ["key", "value"],
      ["version", 1],
      ["last_update", new Date().toISOString()]
    ]);
  } else {
    var headers = sh.getRange(1,1,1,2).getValues()[0];
    if (headers[0] !== "key" || headers[1] !== "value") {
      sh.clearContents();
      sh.getRange(1, 1, 3, 2).setValues([
        ["key", "value"],
        ["version", 1],
        ["last_update", new Date().toISOString()]
      ]);
    }
  }
  return sh;
}

function getMetaMap_() {
  var sh = ensureMeta_();
  var values = sh.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < values.length; i++) {
    var k = values[i][0];
    var v = values[i][1];
    if (k) map[String(k)] = v;
  }
  return map;
}

function getMetaVersion_() {
  var m = getMetaMap_();
  return Number(m.version || 1);
}

function getMetaValue_(key) {
  var m = getMetaMap_();
  return m[key] || "";
}

function setMetaValue_(key, value) {
  var sh = ensureMeta_();
  var values = sh.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(key)) {
      sh.getRange(i + 1, 2).setValue(value);
      found = true;
      break;
    }
  }
  if (!found) {
    sh.appendRow([key, value]);
  }
}

function bumpMetaVersion_() {
  var current = getMetaVersion_();
  setMetaValue_("version", current + 1);
  setMetaValue_("last_update", new Date().toISOString());
}

function replaceSheetData_(name, headers, rows) {
  var sh = sheet_(name);
  sh.clearContents();
  var values = [headers].concat(rows || []);
  sh.getRange(1, 1, values.length, headers.length).setValues(values);
}

function readRows_(name) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).filter(function(r){ return r.join("") !== ""; }).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function readSingleColumn_(name) {
  return readRows_(name).map(function(x){ return x.value; }).filter(String);
}

function pushDatabase_(db) {
  db = db || {};
  var memory = db.memory || {};
  var entries = db.entries || {};
  var projects = db.projects || [];
  var workerRates = db.workerRates || [];

  replaceSheetData_("Projects", ["name","customer","commitment"],
    projects.map(function(x){ return [x.name||"", x.customer||"", x.commitment||0]; })
  );

  replaceSheetData_("WorkerRates", ["name","rate","advance"],
    workerRates.map(function(x){ return [x.name||"", x.rate||0, x.advance||0]; })
  );

  replaceSheetData_("WorkerEntries", ["date","customer","project","worker","start","end","task","hours","rate","cost","synced"],
    (entries.workers || []).map(function(x){
      return [x.date||"", x.customer||"", x.project||"", x.worker||"", x.start||"", x.end||"", x.task||"", x.hours||0, x.rate||0, x.cost||0, x.synced===true];
    })
  );

  replaceSheetData_("MaterialEntries", ["date","customer","project","material","qty","price","supplier","total","synced"],
    (entries.materials || []).map(function(x){
      return [x.date||"", x.customer||"", x.project||"", x.material||"", x.qty||0, x.price||0, x.supplier||"", x.total||0, x.synced===true];
    })
  );

  replaceSheetData_("Memory_Projects", ["value"], (memory.projects || []).map(function(x){ return [x]; }));
  replaceSheetData_("Memory_Customers", ["value"], (memory.customers || []).map(function(x){ return [x]; }));
  replaceSheetData_("Memory_Workers", ["value"], (memory.workers || []).map(function(x){ return [x]; }));
  replaceSheetData_("Memory_Materials", ["value"], (memory.materials || []).map(function(x){ return [x]; }));
  replaceSheetData_("Memory_Suppliers", ["value"], (memory.suppliers || []).map(function(x){ return [x]; }));
  replaceSheetData_("Memory_Tasks", ["value"], (memory.tasks || []).map(function(x){ return [x]; }));
}

function pullDatabase_() {
  ensureMeta_();
  return {
    memory: {
      projects: readSingleColumn_("Memory_Projects"),
      customers: readSingleColumn_("Memory_Customers"),
      workers: readSingleColumn_("Memory_Workers"),
      materials: readSingleColumn_("Memory_Materials"),
      suppliers: readSingleColumn_("Memory_Suppliers"),
      tasks: readSingleColumn_("Memory_Tasks")
    },
    entries: {
      workers: readRows_("WorkerEntries"),
      materials: readRows_("MaterialEntries")
    },
    projects: readRows_("Projects"),
    workerRates: readRows_("WorkerRates")
  };
}
