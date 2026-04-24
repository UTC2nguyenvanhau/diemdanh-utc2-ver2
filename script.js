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
const scriptURL = 'https://script.google.com/macros/s/AKfycbyOy0tHt992Bui7MYsudz8cAD_trRHurzVtamLSjLHO--EJ2PKIZwnh3qlciW1iSjd0/exec'; 
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
// GIAO DIỆN & TÍNH NĂNG PHỤ
// ==========================================
function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text"; icon.innerText = "🙈"; 
    } else {
        input.type = "password"; icon.innerText = "👁️";  
    }
}

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
window.addEventListener('online', () => { 
    document.getElementById('offline-banner').style.display = 'none'; 
    syncOfflineData();
});

// ==========================================
// THUẬT TOÁN AUTO-RETRY (THỬ LẠI KHI MẠNG YẾU)
// ==========================================
async function fetchWithRetry(url, retries = 3, timeoutMs = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            
            if (!response.ok) throw new Error("Lỗi HTTP");
            return await response.json(); 
        } catch (err) {
            if (i === retries - 1) throw err; 
            setStatus(`⚠️ Mạng nghẽn! Đang thử lại lần ${i + 1}/${retries}...`, "error", true);
            await new Promise(r => setTimeout(r, 2000)); 
        }
    }
}

// ==========================================
// PHIÊN ĐĂNG NHẬP (KIẾN TRÚC 0 GIÂY)
// ==========================================
window.onload = () => {
    applySavedTheme(); 
    syncOfflineData(); // Chạy đồng bộ nháp Offline nếu có
    
    const savedMssv = localStorage.getItem('utc2_mssv');
    const savedName = localStorage.getItem('utc2_name');
    const savedClasses = localStorage.getItem('utc2_cached_classes');
    
    if (savedMssv && savedName) {
        showScreen('attendance-screen');
        document.getElementById('student-name').innerText = savedName;
        document.getElementById('student-mssv').innerText = savedMssv;
        
        // Load danh sách lớp ngay lập tức từ Cache (0 giây)
        if (savedClasses) {
            renderClassSelect(JSON.parse(savedClasses));
        } else {
            document.getElementById('class-select').innerHTML = '<option value="">⏳ Đang đồng bộ lớp...</option>';
        }
        // Tải ngầm danh sách lớp mới
        fetchClassesBackground(); 
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
    } finally { document.getElementById('btnLogin').disabled = false; }
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
            localStorage.removeItem('utc2_cached_classes');
            window.location.reload();
        }
    })
}

// ==========================================
// TẢI DANH SÁCH LỚP (CHẠY NGẦM)
// ==========================================
async function fetchClassesBackground() {
    try {
        const data = await fetchWithRetry(`${scriptURL}?action=getClasses`, 2, 5000);
        if (data && data.success && data.classes.length > 0) {
            localStorage.setItem('utc2_cached_classes', JSON.stringify(data.classes));
            renderClassSelect(data.classes);
        }
    } catch (e) { console.log("Lỗi tải lớp ngầm."); }
}

function renderClassSelect(classesArray) {
    const select = document.getElementById('class-select');
    select.innerHTML = '<option value="">-- Chọn lớp học phần --</option>';
    classesArray.forEach(cls => {
        let opt = document.createElement('option');
        opt.value = cls;
        opt.innerHTML = "📚 Lớp: " + cls;
        select.appendChild(opt);
    });
}
function loadClasses() { fetchClassesBackground(); } // Dự phòng

// ==========================================
// HỆ THỐNG ĐỒNG BỘ OFFLINE NGẦM
// ==========================================
async function syncOfflineData() {
    const offlineUrl = localStorage.getItem('utc2_offline_sync');
    if (!offlineUrl) return; 

    try {
        console.log("Đang đồng bộ dữ liệu Offline...");
        const result = await fetchWithRetry(offlineUrl, 2, 5000);
        
        if (result && result.success) {
            localStorage.removeItem('utc2_offline_sync'); 
            Swal.fire({
                icon: 'success',
                title: 'Đồng bộ hoàn tất',
                text: 'Dữ liệu điểm danh offline của bạn đã được đẩy lên hệ thống trường!',
                confirmButtonColor: '#003366'
            });
        }
    } catch (e) { console.log("Đồng bộ ngầm thất bại, sẽ thử lại sau."); }
}

// ==========================================
// CORE: XỬ LÝ ĐIỂM DANH (BLE + API + OFFLINE)
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
        
        // [CỰC KỲ QUAN TRỌNG] Nhận diện iPhone để tránh văng kết nối
        const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
        if (isIOS) {
            setStatus("⏳ Đang đồng bộ giao thức iOS...", "normal", true);
            await new Promise(r => setTimeout(r, 1000)); 
        }

        const service = await server.getPrimaryService(SERVICE_UUID);
        const characteristic = await service.getCharacteristic(CHAR_UUID);

        const challenge = Math.floor(Math.random() * 9000) + 1000;
        const encoder = new TextEncoder();
        await characteristic.writeValue(encoder.encode(challenge.toString()));
        
        if (isIOS) await new Promise(r => setTimeout(r, 500)); 

        const value = await characteristic.readValue();
        const response = new TextDecoder().decode(value);
        device.gatt.disconnect();

        setStatus("☁️ Đang đồng bộ Cloud trường...", "normal", true);
        const finalUrl = `${scriptURL}?action=checkin&classId=${encodeURIComponent(classId)}&mssv=${mssv}&challenge=${challenge}&response=${response}&deviceId=${deviceId}`;
        
        // --- BƯỚC GỬI DỮ LIỆU LÊN GOOGLE ---
        try {
            const result = await fetchWithRetry(finalUrl, 3, 5000);
            btn.disabled = false;
            
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
        } catch (networkError) {
            // NẾU MẤT MẠNG -> LƯU OFFLINE VÀO ĐIỆN THOẠI
            btn.disabled = false;
            localStorage.setItem('utc2_offline_sync', finalUrl);
            setStatus("📥 Đã lưu Offline", "error");
            addHistory(classId + " (Offline)", true);
            
            Swal.fire({
                icon: 'warning',
                title: 'Mạng Quá Yếu!',
                text: 'Mạch BLE đã xác thực thành công nhưng không thể kết nối tới Google. Hệ thống đã lưu tạm kết quả vào máy.',
                footer: '<b style="color: #27ae60;">Hệ thống sẽ TỰ ĐỘNG ĐỒNG BỘ khi điện thoại có mạng trở lại. Bạn có thể vào lớp!</b>',
                confirmButtonColor: '#003366',
                confirmButtonText: 'Đã hiểu'
            });
        }

    } catch (err) {
        // BẮT LỖI TỪ PHẦN CỨNG BLE (Mất kết nối, hủy quét...)
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
