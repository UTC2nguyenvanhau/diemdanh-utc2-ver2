// ==========================================
// ĐĂNG KÝ APP OFFLINE (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('Lỗi cài App: ', err));
    });
}

// ==========================================
// CẤU HÌNH HỆ THỐNG
// ==========================================
// DÁN LINK APPS SCRIPT V3.0 (BẢN TRẢ VỀ JSON) VÀO ĐÂY:
const scriptURL = 'https://script.google.com/macros/s/AKfycbzyP5uGhs3iLrFUDWw12SCnogsizy18HBFmdlVh47n-fbQHHk5yxqpAfTD5DY8llPxj/exec'; 
const SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const CHAR_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";

// ==========================================
// THUẬT TOÁN TẠO ID THIẾT BỊ (CHỐNG GIAN LẬN)
// ==========================================
function getDeviceUUID() {
    let uuid = localStorage.getItem('utc2_device_uuid');
    if (!uuid) {
        uuid = 'UTC2_DEV_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 12);
        localStorage.setItem('utc2_device_uuid', uuid);
    }
    return uuid;
}

// ==========================================
// TÍNH NĂNG ẨN/HIỆN MẬT KHẨU
// ==========================================
function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        icon.innerText = "🙈"; 
    } else {
        input.type = "password";
        icon.innerText = "👁️";  
    }
}

// ==========================================
// GIAO DIỆN & KIỂM TRA THIẾT BỊ
// ==========================================
function toggleTheme(checkbox) {
    if(checkbox.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark'); 
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light'); 
    }
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    const checkbox = document.getElementById('checkbox');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if(checkbox) checkbox.checked = true;
    }
}

function checkDeviceType() {
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasTouchScreen = (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    
    if (!isMobileUA || !hasTouchScreen) {
        document.getElementById('desktop-blocker').style.display = 'flex';
        document.body.style.overflow = 'hidden'; 
        document.getElementById('main-app').style.display = 'none';
        document.getElementById('history-section').style.display = 'none';
        document.getElementById('main-footer').style.display = 'none';
    }
}
checkDeviceType();

window.addEventListener('offline', () => { document.getElementById('offline-banner').style.display = 'block'; });
window.addEventListener('online', () => { document.getElementById('offline-banner').style.display = 'none'; });

// ==========================================
// PHIÊN ĐĂNG NHẬP
// ==========================================
window.onload = () => {
    applySavedTheme(); 
    
    const savedMssv = localStorage.getItem('utc2_mssv');
    const savedName = localStorage.getItem('utc2_name');
    
    if (savedMssv && savedName) {
        showScreen('attendance-screen');
        document.getElementById('student-name').innerText = savedName;
        document.getElementById('student-mssv').innerText = savedMssv;
        loadClasses(); 
    } else {
        showScreen('login-screen');
    }
};

function showScreen(screenId) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('change-pass-screen').style.display = 'none';
    document.getElementById('attendance-screen').style.display = 'none';
    document.getElementById(screenId).style.display = 'block';
}

function setStatus(text, type = "normal", isLoading = false) {
    const statusEl = document.getElementById('status');
    const spinner = document.getElementById('spinner');
    statusEl.innerText = text;
    spinner.style.display = isLoading ? "block" : "none";
    
    if (type === "error") statusEl.style.color = "var(--error)";
    else if (type === "success") statusEl.style.color = "var(--success)";
    else statusEl.style.color = "var(--primary-color)";
}

// ==========================================
// XỬ LÝ ĐĂNG NHẬP & ĐỔI MẬT KHẨU
// ==========================================
async function handleLogin() {
    const mssv = document.getElementById('login-mssv').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    if (!mssv || !pass) return setStatus("⚠️ Nhập đầy đủ MSSV và Mật khẩu!", "error");

    setStatus("Đang kiểm tra dữ liệu...", "normal", true);
    document.getElementById('btnLogin').disabled = true;

    try {
        const res = await fetch(`${scriptURL}?action=login&mssv=${mssv}&pass=${encodeURIComponent(pass)}`);
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('temp_mssv', mssv);
            localStorage.setItem('temp_name', data.name);

            if (data.isFirstLogin) {
                showScreen('change-pass-screen');
                setStatus("Vui lòng đổi mật khẩu để tiếp tục", "error");
            } else {
                completeLogin(mssv, data.name);
            }
        } else {
            setStatus("❌ " + data.message, "error");
        }
    } catch (e) {
        setStatus("❌ Lỗi mạng, không thể kết nối server", "error");
    } finally {
        document.getElementById('btnLogin').disabled = false;
    }
}

async function handleChangePass() {
    const newPass = document.getElementById('new-pass').value.trim();
    const confirmPass = document.getElementById('confirm-pass').value.trim();
    const mssv = localStorage.getItem('temp_mssv');

    if (newPass.length < 6 || newPass.length > 20) return setStatus("⚠️ Mật khẩu phải từ 6 đến 20 ký tự!", "error");
    if (newPass.includes(" ")) return setStatus("⚠️ Mật khẩu không được chứa khoảng trắng!", "error");
    if (newPass !== confirmPass) return setStatus("⚠️ Mật khẩu xác nhận không khớp!", "error");

    setStatus("Đang cập nhật mật khẩu...", "normal", true);
    document.getElementById('btnChangePass').disabled = true;

    try {
        const res = await fetch(`${scriptURL}?action=changePass&mssv=${mssv}&newPass=${encodeURIComponent(newPass)}`);
        const msg = await res.text();
        
        Swal.fire({ icon: 'success', title: 'Thành công', text: msg, confirmButtonColor: '#003366' });
        completeLogin(mssv, localStorage.getItem('temp_name'));
    } catch (e) {
        setStatus("❌ Lỗi mạng, thử lại sau", "error");
        document.getElementById('btnChangePass').disabled = false;
    }
}

function completeLogin(mssv, name) {
    localStorage.setItem('utc2_mssv', mssv);
    localStorage.setItem('utc2_name', name);
    window.location.reload(); 
}

function logout() {
    Swal.fire({
        title: 'Đăng xuất?',
        text: "Bạn có chắc chắn muốn thoát khỏi thiết bị này?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#8a9ba8',
        confirmButtonText: 'Đăng xuất',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('utc2_mssv');
            localStorage.removeItem('utc2_name');
            window.location.reload();
        }
    })
}

// ==========================================
// TẢI DANH SÁCH LỚP
// ==========================================
async function loadClasses() {
    const select = document.getElementById('class-select');
    try {
        const res = await fetch(`${scriptURL}?action=getClasses`);
        const data = await res.json();
        
        if (data.success && data.classes.length > 0) {
            select.innerHTML = '<option value="">-- Chọn lớp học phần --</option>';
            data.classes.forEach(cls => {
                let opt = document.createElement('option');
                opt.value = cls;
                opt.innerHTML = "📚 Lớp: " + cls;
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = '<option value="">Không có lớp nào đang mở</option>';
        }
    } catch (e) {
        select.innerHTML = '<option value="">Lỗi tải danh sách lớp</option>';
    }
}

// ==========================================
// XỬ LÝ ĐIỂM DANH BLE + GỌI API JSON
// ==========================================
async function handleAttendance() {
    const mssv = localStorage.getItem('utc2_mssv');
    const classId = document.getElementById('class-select').value;
    const btn = document.getElementById('btnSubmit');

    if (!classId) return setStatus("⚠️ Vui lòng chọn lớp học phần!", "error");

    try {
        btn.disabled = true;
        setStatus("🔒 Đang tạo mã định danh...", "normal", true);
        const deviceId = getDeviceUUID();

        setStatus("🔍 Bật Bluetooth & Quét tìm Trạm...", "normal", true);
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'TRAM-DIEM-DANH' }],
            optionalServices: [SERVICE_UUID]
        });

        setStatus("🔗 Đang giải mã ESP32...", "normal", true);
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        const characteristic = await service.getCharacteristic(CHAR_UUID);

        const challenge = Math.floor(Math.random() * 9000) + 1000;
        const encoder = new TextEncoder();
        await characteristic.writeValue(encoder.encode(challenge.toString()));
        
        await new Promise(r => setTimeout(r, 250)); 

        const value = await characteristic.readValue();
        const response = new TextDecoder().decode(value);
        device.gatt.disconnect();

        setStatus("☁️ Đang đồng bộ Cloud trường...", "normal", true);
        const finalUrl = `${scriptURL}?action=checkin&classId=${encodeURIComponent(classId)}&mssv=${mssv}&challenge=${challenge}&response=${response}&deviceId=${deviceId}`;
        
        const apiResponse = await fetch(finalUrl);
        const result = await apiResponse.json(); 
        
        btn.disabled = false;

        // HIỂN THỊ POPUP CHI TIẾT
        if (result.success) {
            setStatus("🎉 Hoàn tất", "success");
            addHistory(classId, true); 
            
            Swal.fire({
                icon: result.type === 'ALREADY_DONE' ? 'info' : 'success',
                title: result.title,
                text: result.message,
                confirmButtonColor: '#003366',
                confirmButtonText: 'Đóng'
            });
        } else {
            setStatus("⚠️ " + result.title, "error");
            addHistory(classId, false); 
            
            Swal.fire({
                icon: 'error',
                title: result.title,
                text: result.message,
                footer: `<b style="color: #e74c3c;">Giải pháp: </b> &nbsp; ${result.action}`,
                confirmButtonColor: '#e74c3c',
                confirmButtonText: 'Đã hiểu'
            });
        }

    } catch (err) {
        btn.disabled = false;
        setStatus("❌ Không quét được Trạm BLE!", "error");
        Swal.fire({
            icon: 'error',
            title: 'Lỗi Kết Nối BLE',
            text: 'Không thể giao tiếp với hộp ESP32. Hãy đứng gần thiết bị, bật Bluetooth và thử lại.',
            confirmButtonColor: '#e74c3c'
        });
        console.error(err);
    }
}

// ==========================================
// LỊCH SỬ (CÓ NGÀY GIỜ)
// ==========================================
function addHistory(className, isSuccess) {
    const historyList = document.getElementById('history-list');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN');
    const dateStr = now.toLocaleDateString('vi-VN'); 
    
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
        <div class="history-info">
            <span class="h-mssv">${className}</span>
            <span class="h-time">Ngày: ${dateStr} - Giờ: ${timeStr}</span>
        </div>
        <span class="h-status ${isSuccess ? 'h-success' : 'h-error'}">${isSuccess ? 'Thành công' : 'Thất bại'}</span>
    `;
    historyList.prepend(card);
}
function clearHistory() { document.getElementById('history-list').innerHTML = ''; }

// Chống Inspect
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
    if (e.keyCode == 123) return false; 
    if (e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0))) return false; 
    if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) return false; 
}
