// ==========================================
// CẤU HÌNH HỆ THỐNG
// ==========================================
const scriptURL = 'https://script.google.com/macros/s/AKfycbwRLuFo3-7Zmo_KNz3DPaiCmHy7nPz-Z19n1LwXK7p2wqwsZs6Q-LzE77ZnixrwLNIW/exec'; 
const SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const CHAR_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";
const fpPromise = FingerprintJS.load();

// ==========================================
// 1. KIỂM TRA THIẾT BỊ & GIAO DIỆN
// ==========================================
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

window.addEventListener('offline', () => {
    document.getElementById('offline-banner').style.display = 'block';
});
window.addEventListener('online', () => {
    document.getElementById('offline-banner').style.display = 'none';
});

// ==========================================
// 2. QUẢN LÝ PHIÊN ĐĂNG NHẬP (SESSION)
// ==========================================
window.onload = () => {
    const savedMssv = localStorage.getItem('utc2_mssv');
    const savedName = localStorage.getItem('utc2_name');
    
    if (savedMssv && savedName) {
        // Đã đăng nhập -> Bỏ qua login, vào thẳng màn hình điểm danh
        showScreen('attendance-screen');
        document.getElementById('student-name').innerText = savedName;
        document.getElementById('student-mssv').innerText = savedMssv;
        loadClasses(); // Tải danh sách lớp từ Google Sheets
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
// 3. XỬ LÝ ĐĂNG NHẬP & ĐỔI MẬT KHẨU
// ==========================================
async function handleLogin() {
    const mssv = document.getElementById('login-mssv').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    if (!mssv || !pass) return setStatus("⚠️ Nhập đầy đủ MSSV và Mật khẩu!", "error");

    setStatus("Đang kiểm tra dữ liệu...", "normal", true);
    document.getElementById('btnLogin').disabled = true;

    try {
        const res = await fetch(`${scriptURL}?action=login&mssv=${mssv}&pass=${pass}`);
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

    if (newPass.length < 6) return setStatus("⚠️ Mật khẩu phải từ 6 ký tự!", "error");
    if (newPass !== confirmPass) return setStatus("⚠️ Mật khẩu xác nhận không khớp!", "error");

    setStatus("Đang cập nhật mật khẩu...", "normal", true);
    document.getElementById('btnChangePass').disabled = true;

    try {
        const res = await fetch(`${scriptURL}?action=changePass&mssv=${mssv}&newPass=${newPass}`);
        const msg = await res.text();
        
        alert("✅ " + msg);
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
    if(confirm("Bạn có chắc chắn muốn đăng xuất thiết bị này?")) {
        localStorage.clear();
        window.location.reload();
    }
}

// ==========================================
// 4. LẤY DANH SÁCH LỚP HỌC (AUTO LOAD)
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
// 5. XỬ LÝ ĐIỂM DANH BLE (LÕI)
// ==========================================
async function handleAttendance() {
    const mssv = localStorage.getItem('utc2_mssv');
    const classId = document.getElementById('class-select').value;
    const btn = document.getElementById('btnSubmit');

    if (!classId) return setStatus("⚠️ Vui lòng chọn lớp học phần!", "error");

    try {
        btn.disabled = true;
        setStatus("🔒 Đang quét mã định danh thiết bị...", "normal", true);
        
        const fp = await fpPromise;
        const fpResult = await fp.get();
        const deviceId = fpResult.visitorId;

        setStatus("🔍 Đang tìm Trạm điểm danh (Bật Bluetooth)...", "normal", true);
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'TRAM-DIEM-DANH' }],
            optionalServices: [SERVICE_UUID]
        });

        setStatus("🔗 Đang giải mã phần cứng ESP32...", "normal", true);
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

        setStatus("☁️ Đang đồng bộ với Cloud trường...", "normal", true);
        const finalUrl = `${scriptURL}?action=checkin&classId=${encodeURIComponent(classId)}&mssv=${mssv}&challenge=${challenge}&response=${response}&deviceId=${deviceId}`;
        
        const apiResponse = await fetch(finalUrl);
        const result = await apiResponse.text();
        
        btn.disabled = false;

        if (result.includes("Thành công")) {
            setStatus("🎉 " + result, "success");
            addHistory(classId, true); 
        } else {
            setStatus("⚠️ " + result, "error");
            addHistory(classId, false); 
        }

    } catch (err) {
        btn.disabled = false;
        setStatus("❌ Lỗi: Từ chối kết nối hoặc không đứng gần Trạm!", "error");
        console.error(err);
    }
}

// ==========================================
// 6. LỊCH SỬ & ANTI CHÍP (GIỮ NGUYÊN)
// ==========================================
function addHistory(className, isSuccess) {
    const historyList = document.getElementById('history-list');
    const timeStr = new Date().toLocaleTimeString('vi-VN');
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
        <div class="history-info">
            <span class="h-mssv">${className}</span>
            <span class="h-time">${timeStr}</span>
        </div>
        <span class="h-status ${isSuccess ? 'h-success' : 'h-error'}">${isSuccess ? 'Thành công' : 'Thất bại'}</span>
    `;
    historyList.prepend(card);
}
function clearHistory() { document.getElementById('history-list').innerHTML = ''; }

document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
    if (e.keyCode == 123) return false; 
    if (e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0))) return false; 
    if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) return false; 
}
