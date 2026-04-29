var ACCOUNT_SHEET_NAME = 'Tai_Khoan'; 

function responseJSON(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function getAccounts(ss, forceRefresh) {
  var cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    var cachedData = cache.get("utc2_accounts_map");
    if (cachedData) return JSON.parse(cachedData);
  }
  var sheetAcc = ss.getSheetByName(ACCOUNT_SHEET_NAME);
  if (!sheetAcc) return null;
  var data = sheetAcc.getDataRange().getValues();
  var accMap = {};
  for (var i = 1; i < data.length; i++) {
    var mssvKey = String(data[i][0]).trim();
    if (mssvKey === "") continue;
    accMap[mssvKey] = {
      name: String(data[i][1]).trim(), pass: String(data[i][2]).trim(), status: String(data[i][3]).trim().toUpperCase(),
      deviceId: String(data[i][4] || "").trim(), rowIndex: i + 1 
    };
  }
  cache.put("utc2_accounts_map", JSON.stringify(accMap), 21600); 
  return accMap;
}

function doGet(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); 
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e.parameter.action;
    var cache = CacheService.getScriptCache();

    if (action == "clearCache") {
      cache.remove("utc2_accounts_map"); cache.remove("utc2_class_list");
      return responseJSON({success: true, message: "Đã đồng bộ dữ liệu mới từ Sheet!"});
    }

    if (action == "login") {
      var accMap = getAccounts(ss, true); 
      var mssv = String(e.parameter.mssv || "").trim(); var pass = String(e.parameter.pass || "").trim();
      var user = accMap[mssv];
      if (user && user.pass === pass) return responseJSON({ success: true, name: user.name, isFirstLogin: (user.status === "NEW") });
      return responseJSON({success: false, message: "Sai MSSV hoặc Mật khẩu!"});
    }

    if (action == "changePass") {
      var accMap = getAccounts(ss, false); var mssv = String(e.parameter.mssv || "").trim(); var user = accMap[mssv];
      if (user) {
        ss.getSheetByName(ACCOUNT_SHEET_NAME).getRange(user.rowIndex, 3).setValue(String(e.parameter.newPass || "").trim());
        ss.getSheetByName(ACCOUNT_SHEET_NAME).getRange(user.rowIndex, 4).setValue("ACTIVE");
        cache.remove("utc2_accounts_map"); return responseJSON({success: true});
      } return responseJSON({success: false});
    }

    if (action == "resetPassByDevice") {
      var accMap = getAccounts(ss, false); var mssv = String(e.parameter.mssv || "").trim(); var deviceId = String(e.parameter.deviceId || "").trim();
      var user = accMap[mssv];
      if (!user) return responseJSON({success: false, message: "MSSV không tồn tại!"});
      if (user.deviceId && user.deviceId === deviceId) {
        ss.getSheetByName(ACCOUNT_SHEET_NAME).getRange(user.rowIndex, 3).setValue(String(e.parameter.newPass || "").trim());
        cache.remove("utc2_accounts_map"); return responseJSON({success: true, message: "Khôi phục thành công!"});
      } else return responseJSON({ success: false, message: "Thiết bị lạ! Yêu cầu dùng máy chính chủ." });
    }

    if (action == "searchStudent") {
      var accMap = getAccounts(ss, false); var user = accMap[String(e.parameter.mssv || "").trim()];
      if (user) return responseJSON({ success: true, mssv: String(e.parameter.mssv).trim(), name: user.name, password: user.pass });
      return responseJSON({success: false, message: "Không tìm thấy sinh viên!"});
    }

    if (action == "getClasses") {
      return responseJSON({success: true, classes: ss.getSheets().map(s => s.getName()).filter(n => n !== ACCOUNT_SHEET_NAME && n !== "Log_Data")});
    }

    if (action == "getDates") {
      var sheet = ss.getSheetByName(e.parameter.classId); if (!sheet) return responseJSON({success: false});
      var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; var dates = [];
      for (var j = 2; j < headerRow.length; j++) {
        if (headerRow[j]) {
          var str = Object.prototype.toString.call(headerRow[j]) === "[object Date]" ? Utilities.formatDate(headerRow[j], "GMT+7", "dd/MM") : String(headerRow[j]);
          if (!dates.includes(str) && str.includes("/")) dates.push(str);
        }
      } return responseJSON({success: true, dates: dates});
    }

    if (action == "getStats") {
      var sheet = ss.getSheetByName(e.parameter.classId); if (!sheet || sheet.getLastRow() < 2) return responseJSON({total: 0, list: []});
      var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; var dIdx = [];
      for (var j = 0; j < header.length; j++) {
        var str = Object.prototype.toString.call(header[j]) === "[object Date]" ? Utilities.formatDate(header[j], "GMT+7", "dd/MM") : String(header[j]).trim();
        if (str === e.parameter.date) dIdx.push(j);
      }
      if (dIdx.length === 0) return responseJSON({total: 0, list: []});
      var sData = sheet.getRange(2, 2, sheet.getLastRow() - 1, 2).getValues(); var stats = []; var seen = {}; 
      for (var k = 0; k < dIdx.length; k++) {
        var cVals = sheet.getRange(2, dIdx[k] + 1, sheet.getLastRow() - 1, 1).getValues();
        var cNotes = sheet.getRange(2, dIdx[k] + 1, sheet.getLastRow() - 1, 1).getNotes();
        for (var i = 0; i < sData.length; i++) {
          var cMssv = String(sData[i][0]).trim();
          if (String(cVals[i][0]).trim().toLowerCase() === "x" && !seen[cMssv]) {
             stats.push({ mssv: cMssv, name: String(sData[i][1]).trim(), time: cNotes[i][0].includes("Time: ") ? cNotes[i][0].split("Time: ")[1].split("\n")[0].trim() : "--:--:--" });
             seen[cMssv] = true; 
          }
        }
      } return responseJSON({total: stats.length, list: stats});
    }

    if (action == "checkin") {
      var mssv = String(e.parameter.mssv || "").trim(); var deviceId = String(e.parameter.deviceId || "").trim();
      var accMap = getAccounts(ss, false); var currentUser = accMap[mssv];
      if (!currentUser) return responseJSON({ success: false, title: "Lỗi", message: "Sai tài khoản." });
      
      var deviceOwner = null; for (var k in accMap) { if (accMap[k].deviceId === deviceId) { deviceOwner = k; break; } }
      if (deviceOwner && deviceOwner !== mssv) return responseJSON({ success: false, title: "Máy Đã Bị Khóa", message: "Điện thoại này đã dùng cho sinh viên " + deviceOwner });
      if (currentUser.deviceId && currentUser.deviceId !== deviceId) return responseJSON({ success: false, title: "Sai Thiết Bị", message: "Vui lòng dùng điện thoại chính chủ của bạn." });

      if (!currentUser.deviceId || currentUser.deviceId === "") {
          ss.getSheetByName(ACCOUNT_SHEET_NAME).getRange(currentUser.rowIndex, 5).setValue(deviceId);
          cache.remove("utc2_accounts_map"); 
      }

      var sheet = ss.getSheetByName(e.parameter.classId); if (!sheet) return responseJSON({ success: false, title: "Lỗi", message: "Lớp không tồn tại." });
      var today = Utilities.formatDate(new Date(), "GMT+7", "dd/MM"); var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; var colIdx = -1;
      for (var j = 0; j < header.length; j++) { var dStr = Object.prototype.toString.call(header[j]) === "[object Date]" ? Utilities.formatDate(header[j], "GMT+7", "dd/MM") : String(header[j]); if (dStr === today) { colIdx = j; break; } }
      if (colIdx === -1) { colIdx = header.length; sheet.getRange(1, colIdx + 1).setValue(today); }

      var flatMssv = sheet.getRange(2, 2, sheet.getLastRow(), 1).getValues().map(r => String(r[0]).trim()); var sIdx = flatMssv.indexOf(mssv);
      if (sIdx !== -1) {
        var cell = sheet.getRange(sIdx + 2, colIdx + 1);
        if (cell.getValue().toString().toLowerCase() === "x") return responseJSON({ success: true, title: "Đã Điểm Danh", message: "Bạn đã điểm danh rồi." });
        cell.setValue("x").setNote("Device: " + deviceId + "\nTime: " + Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss"));
        return responseJSON({ success: true, title: "Thành Công!", message: "Ghi nhận: " + mssv });
      } return responseJSON({ success: false, title: "Lỗi", message: "Không có tên trong lớp." });
    }
  } catch (err) { return responseJSON({ success: false, message: "Lỗi Server" }); } finally { lock.releaseLock(); }
}
