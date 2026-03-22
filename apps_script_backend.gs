/**
 * iCOOL Enterprise backend for Google Apps Script
 * Deploy as Web App:
 * - Execute as: Me
 * - Who has access: Anyone with the link
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  if (action === "pullAll") return jsonOutput({ ok: true, db: pullDatabase_() });
  return jsonOutput({ ok: true, message: "iCOOL backend ready" });
}
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    if ((body.action || "") === "pushAll") {
      pushDatabase_(body.db || {});
      return ContentService.createTextOutput("OK");
    }
    return ContentService.createTextOutput("UNKNOWN_ACTION");
  } catch (err) {
    return ContentService.createTextOutput("ERROR: " + err.message);
  }
}
function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function ss_(){ return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name){ var sh = ss_().getSheetByName(name); if(!sh) sh = ss_().insertSheet(name); return sh; }
function replaceSheetData_(name, headers, rows) {
  var sh = sheet_(name);
  sh.clearContents();
  var values = [headers].concat(rows || []);
  sh.getRange(1, 1, values.length, headers.length).setValues(values);
}
function pushDatabase_(db) {
  db = db || {};
  var memory = db.memory || {};
  var entries = db.entries || {};
  var projects = db.projects || [];
  var workerRates = db.workerRates || [];

  replaceSheetData_("Projects", ["id","name","customer","commitment","startDate","status"],
    projects.map(function(x){ return [x.id||"", x.name||"", x.customer||"", x.commitment||0, x.startDate||"", x.status||""]; })
  );
  replaceSheetData_("WorkerRates", ["name","rate","advance"],
    workerRates.map(function(x){ return [x.name||"", x.rate||0, x.advance||0]; })
  );
  replaceSheetData_("WorkerEntries", ["id","seq","date","customer","project","worker","start","end","task","note","createdBy","rate","hours","cost","synced"],
    (entries.workers || []).map(function(x){ return [x.id||"", x.seq||"", x.date||"", x.customer||"", x.project||"", x.worker||"", x.start||"", x.end||"", x.task||"", x.note||"", x.createdBy||"", x.rate||0, x.hours||0, x.cost||0, x.synced===true]; })
  );
  replaceSheetData_("MaterialEntries", ["id","seq","date","customer","project","material","qty","price","supplier","note","createdBy","total","synced"],
    (entries.materials || []).map(function(x){ return [x.id||"", x.seq||"", x.date||"", x.customer||"", x.project||"", x.material||"", x.qty||0, x.price||0, x.supplier||"", x.note||"", x.createdBy||"", x.total||0, x.synced===true]; })
  );
  replaceSheetData_("Memory_Projects", ["value"], (memory.projects || []).map(function(x){ return [x]; }));
  replaceSheetData_("Memory_Customers", ["value"], (memory.customers || []).map(function(x){ return [x]; }));
  replaceSheetData_("Memory_Workers", ["value"], (memory.workers || []).map(function(x){ return [x]; }));
  replaceSheetData_("Memory_Materials", ["value"], (memory.materials || []).map(function(x){ return [x]; }));
  replaceSheetData_("Memory_Suppliers", ["value"], (memory.suppliers || []).map(function(x){ return [x]; }));
  replaceSheetData_("Memory_Tasks", ["value"], (memory.tasks || []).map(function(x){ return [x]; }));
}
function readRows_(name) {
  var sh = sheet_(name), values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}
function readSingleColumn_(name) { return readRows_(name).map(function(x){ return x.value; }).filter(String); }
function pullDatabase_() {
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
