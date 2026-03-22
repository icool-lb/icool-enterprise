
/**
 * iCOOL ERP Final backend
 * GET  ?action=importAll
 * POST action=appendNewRecords
 * POST action=uploadImage
 *
 * Before deploying image upload:
 * 1) Create/choose a Drive folder
 * 2) Put its ID in DRIVE_FOLDER_ID below
 */
var DRIVE_FOLDER_ID = ""; // <-- put Google Drive folder ID here

function doGet(e){
  var action=(e&&e.parameter&&e.parameter.action)||"";
  if(action==="importAll") return jsonOutput_({ok:true,db:importAll_()});
  return jsonOutput_({ok:true,message:"backend ready"});
}
function doPost(e){
  try{
    var body=JSON.parse(e.postData.contents||"{}");
    var action=body.action||"";
    if(action==="appendNewRecords"){ appendNewRecords_(body); return ContentService.createTextOutput("OK"); }
    if(action==="uploadImage"){ return jsonOutput_(uploadImage_(body)); }
    return ContentService.createTextOutput("UNKNOWN_ACTION");
  }catch(err){ return ContentService.createTextOutput("ERROR: "+err.message); }
}
function jsonOutput_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function ss_(){ return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name){ var sh=ss_().getSheetByName(name); if(!sh) sh=ss_().insertSheet(name); return sh; }
function ensureHeaders_(name, headers){ var sh=sheet_(name); if(sh.getLastRow()===0) sh.getRange(1,1,1,headers.length).setValues([headers]); return sh; }
function readRows_(name){ var sh=sheet_(name), values=sh.getDataRange().getValues(); if(values.length<2) return []; var headers=values[0]; return values.slice(1).filter(function(r){return r.join("")!=="";}).map(function(row){ var obj={}; headers.forEach(function(h,i){ obj[h]=row[i];}); return obj;});}
function readSingle_(name){ return readRows_(name).map(function(x){return x.value;}).filter(String); }
function importAll_(){
  ensureHeaders_("Projects",["name","customer","commitment"]);
  ensureHeaders_("WorkerRates",["name","rate","advance"]);
  ensureHeaders_("WorkerEntries",["id","seq","date","customer","project","worker","start","end","task","note","hours","rate","cost","synced"]);
  ensureHeaders_("MaterialEntries",["id","seq","date","customer","project","material","qty","price","supplier","note","photoLinks","total","synced"]);
  ensureHeaders_("Memory_Projects",["value"]); ensureHeaders_("Memory_Customers",["value"]); ensureHeaders_("Memory_Workers",["value"]); ensureHeaders_("Memory_Materials",["value"]); ensureHeaders_("Memory_Suppliers",["value"]); ensureHeaders_("Memory_Tasks",["value"]);
  var db={memory:{projects:readSingle_("Memory_Projects"),customers:readSingle_("Memory_Customers"),workers:readSingle_("Memory_Workers"),materials:readSingle_("Memory_Materials"),suppliers:readSingle_("Memory_Suppliers"),tasks:readSingle_("Memory_Tasks")}, entries:{workers:readRows_("WorkerEntries"),materials:readRows_("MaterialEntries")}, projects:readRows_("Projects"), workerRates:readRows_("WorkerRates")};
  db.entries.materials = db.entries.materials.map(function(x){ if(x.photoLinks && typeof x.photoLinks==="string") x.photoLinks = x.photoLinks ? x.photoLinks.split("||") : []; else if(!x.photoLinks) x.photoLinks=[]; return x; });
  return db;
}
function upsertListSheet_(name, headers, rows, keyField){
  var sh=ensureHeaders_(name,headers), existing=readRows_(name), map={};
  existing.forEach(function(x){ map[String(x[keyField]||"")]=x;});
  rows.forEach(function(r){ map[String(r[keyField]||"")]=r;});
  var merged=Object.keys(map).filter(function(k){return k!=="";}).map(function(k){return map[k];});
  sh.clearContents(); sh.getRange(1,1,1,headers.length).setValues([headers]);
  if(merged.length) sh.getRange(2,1,merged.length,headers.length).setValues(merged.map(function(r){ return headers.map(function(h){ return r[h]||"";});}));
}
function appendUniqueEntries_(name, headers, rows, idField){
  var sh=ensureHeaders_(name,headers), existing=readRows_(name), ids={}; existing.forEach(function(x){ ids[String(x[idField]||"")]=true;});
  var toAppend=rows.filter(function(r){ var id=String(r[idField]||""); return id && !ids[id];}).map(function(r){
    var copy={}; headers.forEach(function(h){ copy[h]=r[h]||""; });
    if(copy.photoLinks && Array.isArray(copy.photoLinks)) copy.photoLinks = copy.photoLinks.join("||");
    return copy;
  });
  if(toAppend.length) sh.getRange(sh.getLastRow()+1,1,toAppend.length,headers.length).setValues(toAppend.map(function(r){ return headers.map(function(h){ return r[h]||"";});}));
}
function appendUniqueValues_(name, values){
  var sh=ensureHeaders_(name,["value"]), existing=readSingle_(name), set={}; existing.forEach(function(v){set[String(v)]=true;});
  var toAppend=values.filter(function(v){ var s=String(v||"").trim(); return s && !set[s];}).map(function(v){ return [v];});
  if(toAppend.length) sh.getRange(sh.getLastRow()+1,1,toAppend.length,1).setValues(toAppend);
}
function appendNewRecords_(body){
  body=body||{}; upsertListSheet_("Projects",["name","customer","commitment"],body.projects||[],"name"); upsertListSheet_("WorkerRates",["name","rate","advance"],body.workerRates||[],"name");
  appendUniqueEntries_("WorkerEntries",["id","seq","date","customer","project","worker","start","end","task","note","hours","rate","cost","synced"],(body.entries&&body.entries.workers)||[],"id");
  appendUniqueEntries_("MaterialEntries",["id","seq","date","customer","project","material","qty","price","supplier","note","photoLinks","total","synced"],(body.entries&&body.entries.materials)||[],"id");
  var memory=body.memory||{}; appendUniqueValues_("Memory_Projects",memory.projects||[]); appendUniqueValues_("Memory_Customers",memory.customers||[]); appendUniqueValues_("Memory_Workers",memory.workers||[]); appendUniqueValues_("Memory_Materials",memory.materials||[]); appendUniqueValues_("Memory_Suppliers",memory.suppliers||[]); appendUniqueValues_("Memory_Tasks",memory.tasks||[]);
}
function uploadImage_(body){
  if(!DRIVE_FOLDER_ID) return {ok:false,error:"Please set DRIVE_FOLDER_ID in Apps Script first."};
  var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var dataUrl = body.dataUrl || "";
  var comma = dataUrl.indexOf(",");
  if(comma < 0) return {ok:false,error:"Invalid dataUrl"};
  var meta = dataUrl.substring(0, comma);
  var bytes = Utilities.base64Decode(dataUrl.substring(comma+1));
  var mime = body.mimeType || "image/jpeg";
  var ext = mime.indexOf("png")>-1 ? ".png" : ".jpg";
  var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd-HH-mm-ss");
  var blob = Utilities.newBlob(bytes, mime, "UPLOAD-" + ts + ext);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {ok:true,url:file.getUrl(),name:file.getName()};
}
