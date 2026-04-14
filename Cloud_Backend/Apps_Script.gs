var listSheetName = 'Danh_Sach_Lop'; 

function doGet(e) {
  // =====================================================================
  // BƯỚC 1: TẠO Ổ KHÓA ĐỂ XẾP HÀNG (CHỐNG NGHẼN CỔ CHAI)
  // =====================================================================
  var lock = LockService.getScriptLock();
  
  try {
    // Yêu cầu xếp hàng chờ tối đa 10 giây (10000 mili-giây)
    lock.waitLock(10000);
  } catch (err) {
    // Nếu đợi quá 10 giây mà vẫn chưa đến lượt (quá tải), báo lỗi cho sinh viên
    return ContentService.createTextOutput("Lỗi: Hệ thống đang quá tải do nhiều người điểm danh cùng lúc. Vui lòng thử lại sau 3 giây!");
  }

  // =====================================================================
  // BƯỚC 2: BẮT ĐẦU XỬ LÝ DỮ LIỆU BÊN TRONG PHÒNG KHÓA
  // =====================================================================
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(listSheetName);
    
    // Nếu không tìm thấy sheet thì báo lỗi ngay để dễ debug
    if (!sheet) {
      return ContentService.createTextOutput("Lỗi: Không tìm thấy tab " + listSheetName);
    }

    var action = e.parameter.action;

    // --- NHÁNH 1: DÀNH CHO GIẢNG VIÊN (LẤY DỮ LIỆU ĐIỂM DANH) ---
    if (action == "getStats") {
      var data = sheet.getDataRange().getValues();
      var stats = [];
      var count = 0;
      
      for (var i = 1; i < data.length; i++) {
        if (data[i][5] == "x") { // Cột F (Index 5) có chữ "x"
          // Gộp Cột C (Họ), D (Tên đệm), E (Tên) và xóa khoảng trắng thừa
          var fullName = (data[i][2] + " " + data[i][3] + " " + data[i][4]).replace(/\s+/g, ' ').trim();
          stats.push({
            mssv: data[i][1],
            name: fullName,
            time: data[i][7] ? Utilities.formatDate(new Date(data[i][7]), "GMT+7", "HH:mm:ss dd/MM/yyyy") : "N/A"
          });
          count++;
        }
      }
      // Trả về dữ liệu dạng JSON cho Web Giảng viên đọc
      return ContentService.createTextOutput(JSON.stringify({total: count, list: stats}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- NHÁNH 2: DÀNH CHO SINH VIÊN (KIỂM TRA & GHI ĐIỂM DANH) ---
    var mssv = e.parameter.mssv;
    var challenge = parseInt(e.parameter.challenge);
    var response = parseInt(e.parameter.response);
    var deviceId = String(e.parameter.deviceId || "").trim();

    // 2.1 - Xác thực lớp giáp ESP32
    var expectedResponse = (challenge * 7) + 123;
    if (response !== expectedResponse || isNaN(response)) {
      return ContentService.createTextOutput("Lỗi: Xác thực thất bại bởi ESP32!");
    }

    // 2.2 - Xử lý ghi nhận điểm danh
    if (mssv !== undefined && deviceId !== "") {
      var data = sheet.getDataRange().getValues();
      var currentTime = new Date();
      
      // --- BỘ LỌC CHỐNG GIAN LẬN: KHÓA 10 PHÚT ---
      for (var i = 1; i < data.length; i++) {
        var rowMssv = String(data[i][1]).trim();
        var rowDeviceId = String(data[i][6]).trim(); // Cột G
        var rowTimeValue = data[i][7];               // Cột H
        
        if (rowTimeValue instanceof Date || !isNaN(Date.parse(rowTimeValue))) {
          var lastTime = new Date(rowTimeValue);
          var diffMinutes = (currentTime.getTime() - lastTime.getTime()) / (1000 * 60);
          
          // CHẶN ĐIỂM DANH HỘ: 1 máy không được điểm danh cho 2 người trong vòng 10 phút
          if (rowDeviceId === deviceId && rowMssv !== String(mssv).trim() && diffMinutes < 10) {
            var waitTime = Math.ceil(10 - diffMinutes);
            return ContentService.createTextOutput("Lỗi: Máy này vừa điểm danh hộ! Đợi " + waitTime + " phút.");
          }
        }
      }

      // --- VƯỢT QUA BỘ LỌC -> BẮT ĐẦU GHI DATA ---
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]).trim() === String(mssv).trim()) {
          sheet.getRange(i + 1, 6).setValue("x");         // Cột F: Đánh dấu
          sheet.getRange(i + 1, 7).setValue(deviceId);    // Cột G: Lưu mã điện thoại
          sheet.getRange(i + 1, 8).setValue(currentTime); // Cột H: Lưu thời gian
          return ContentService.createTextOutput("Thành công: Đã điểm danh cho " + mssv);
        }
      }
      return ContentService.createTextOutput("Lỗi: Không tìm thấy MSSV " + mssv + " trong danh sách.");
    }
    
    return ContentService.createTextOutput("Lỗi: Dữ liệu gửi lên không hợp lệ.");
    
  } finally {
    // =====================================================================
    // BƯỚC 3: MỞ KHÓA CHO NGƯỜI TIẾP THEO (Bắt buộc phải có)
    // =====================================================================
    lock.releaseLock();
  }
}
