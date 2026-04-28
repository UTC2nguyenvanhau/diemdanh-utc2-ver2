if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(err => console.log('Lỗi cài App: ', err)); }); }

const scriptURL = 'https://script.google.com/macros/s/AKfycbwi-MDO-wehI0SNdkVqaW_gDLpCkPrDKToIQhLs3qkXcLUjNtJFriKGaQF6lXAzdJ7R/exec'; 
const SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const CHAR_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";

function getDeviceUUID() {
    let uuid = localStorage.getItem('utc2_device_uuid');
    if (!uuid) { uuid = 'UTC2_DEV_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 12); localStorage.setItem('utc2_device_uuid', uuid); }
    return uuid;
}

function togglePassword(inputId, icon) { const input = document.getElementById(inputId); if (input.type === "password") { input.type = "text"; icon.innerText = "🙈"; } else { input.type = "password"; icon.innerText = "👁️"; } }
function toggleTheme(checkbox) { if(checkbox.checked) { document.body.classList.add('dark-mode'); localStorage.setItem('theme', 'dark'); } else { document.body.classList.remove('dark-mode'); localStorage.setItem('theme', 'light'); } }
function applySavedTheme() { if (localStorage.getItem('theme') === 'dark') { document.body.classList.add('dark-mode'); const checkbox = document.getElementById('checkbox'); if(checkbox) checkbox.checked = true; } }
function checkDeviceType() {
    if (!(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) || !((navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0))) {
        document.getElementById('desktop-blocker').style.display = 'flex'; document.body.style.overflow = 'hidden'; document.getElementById('main-app').style.display = 'none'; document.getElementById('history-section').style.display = 'none'; document.getElementById('main-footer').style.display = 'none';
    }
}
checkDeviceType();

window.addEventListener('offline', () => { document.getElementById('offline-banner').style.display = 'block'; });
window.addEventListener('online', () => { document.getElementById('offline-banner').style.display = 'none'; syncOfflineData(); });

async function syncOfflineData() {
    const offlineUrl = localStorage.getItem('utc2_offline_sync');
    if (!offlineUrl) return; 
    try {
        const res = await fetch(offlineUrl);
        const result = await res.json();
        localStorage.removeItem('utc2_offline_sync'); 
        if (result.success) { Swal.fire({ icon: 'success', title: 'Đồng bộ hoàn tất', text: 'Dữ liệu offline đã được nộp!', confirmButtonColor: '#003366' }); } 
        else { Swal.fire({ icon: 'error', title: 'Đồng Bộ Thất Bại!', html: `<b>Từ chối:</b><br/>${result.message}`, confirmButtonColor: '#e74c3c' }); addHistory("Lỗi Đồng Bộ", false); }
    } catch (e) { console.log("Chưa có mạng để đồng bộ."); }
}

window.onload = () => {
    applySavedTheme(); syncOfflineData(); 
    const savedMssv = localStorage.getItem('utc2_mssv'); const savedName = localStorage.getItem('utc2_name'); const savedClasses = localStorage.getItem('utc2_cached_classes');
    if (savedMssv && savedName) {
        showScreen('attendance-screen'); document.getElementById('student-name').innerText = savedName; document.getElementById('student-mssv').innerText = savedMssv;
        if (savedClasses) renderClassSelect(JSON.parse(savedClasses)); else document.getElementById('class-select').innerHTML = '<option value="">⏳ Đang đồng bộ lớp...</option>';
        fetchClassesBackground(); 
    } else { showScreen('login-screen'); }
};

function showScreen(screenId) { ['login-screen', 'change-pass-screen', 'attendance-screen'].forEach(id => { document.getElementById(id).style.display = (id === screenId) ? 'block' : 'none'; }); }
function setStatus(text, type = "normal", isLoading = false) { const statusEl = document.getElementById('status'); statusEl.innerText = text; document.getElementById('spinner').style.display = isLoading ? "block" : "none"; statusEl.style.color = (type === "error") ? "var(--error)" : (type === "success" ? "var(--success)" : "var(--primary-color)"); }

async function handleLogin() {
    const mssv = document.getElementById('login-mssv').value.trim(); const pass = document.getElementById('login-pass').value.trim();
    if (!mssv || !pass) return setStatus("⚠️ Nhập đầy đủ MSSV và Mật khẩu!", "error");
    setStatus("Đang kiểm tra...", "normal", true); document.getElementById('btnLogin').disabled = true;
    try {
        const res = await fetch(`${scriptURL}?action=login&mssv=${mssv}&pass=${encodeURIComponent(pass)}`);
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('temp_mssv', mssv); localStorage.setItem('temp_name', data.name);
            if (data.isFirstLogin) { showScreen('change-pass-screen'); setStatus("Vui lòng đổi mật khẩu để tiếp tục", "error"); } 
            else { completeLogin(mssv, data.name); }
        } else { setStatus("❌ " + data.message, "error"); }
    } catch (e) { setStatus("❌ Lỗi mạng!", "error"); } finally { document.getElementById('btnLogin').disabled = false; }
}

async function handleChangePass() {
    const newPass = document.getElementById('new-pass').value.trim();
    if (newPass.length < 6 || newPass !== document.getElementById('confirm-pass').value.trim()) return setStatus("⚠️ Mật khẩu không hợp lệ!", "error");
    setStatus("Đang cập nhật...", "normal", true);
    try { 
        await fetch(`${scriptURL}?action=changePass&mssv=${localStorage.getItem('temp_mssv')}&newPass=${encodeURIComponent(newPass)}`); 
        completeLogin(localStorage.getItem('temp_mssv'), localStorage.getItem('temp_name')); 
    } catch (e) { setStatus("❌ Lỗi mạng", "error"); }
}

async function forgotPassword() {
    const { value: formValues } = await Swal.fire({
        title: 'Khôi phục Mật khẩu',
        html: '<p style="font-size:13px; color:#8a9ba8; margin-bottom: 15px;">Chỉ áp dụng khi thao tác trên điện thoại chính chủ.</p>' +
              '<input id="swal-mssv" class="swal2-input" placeholder="Nhập MSSV">' +
              '<input id="swal-newpass" type="password" class="swal2-input" placeholder="Mật khẩu mới (từ 6 ký tự)">',
        focusConfirm: false, showCancelButton: true, confirmButtonText: 'Khôi phục', confirmButtonColor: '#003366',
        preConfirm: () => {
            const mssv = document.getElementById('swal-mssv').value.trim();
            const newPass = document.getElementById('swal-newpass').value.trim();
            if (!mssv || newPass.length < 6) { Swal.showValidationMessage('Nhập đầy đủ thông tin!'); return false; }
            return { mssv, newPass };
        }
    });

    if (formValues) {
        setStatus("Đang kiểm tra...", "normal", true);
        try {
            const deviceId = getDeviceUUID();
            const res = await fetch(`${scriptURL}?action=resetPassByDevice&mssv=${formValues.mssv}&newPass=${encodeURIComponent(formValues.newPass)}&deviceId=${deviceId}`);
            const data = await res.json();
            if (data.success) { Swal.fire('Thành công!', 'Đã đặt lại mật khẩu.', 'success'); document.getElementById('login-mssv').value = formValues.mssv; document.getElementById('login-pass').value = ''; } 
            else { Swal.fire('Thất bại!', data.message, 'error'); }
        } catch (e) { Swal.fire('Lỗi mạng!', 'Không thể kết nối máy chủ.', 'error'); } finally { setStatus("Sẵn sàng", "normal", false); }
    }
}

function completeLogin(mssv, name) { localStorage.setItem('utc2_mssv', mssv); localStorage.setItem('utc2_name', name); window.location.reload(); }
function logout() { Swal.fire({ title: 'Đăng xuất?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c', confirmButtonText: 'Đăng xuất' }).then((res) => { if (res.isConfirmed) { ['utc2_mssv', 'utc2_name', 'utc2_cached_classes'].forEach(k => localStorage.removeItem(k)); window.location.reload(); } }); }

async function fetchClassesBackground() { try { const res = await fetch(`${scriptURL}?action=getClasses`); const data = await res.json(); if (data.success) { localStorage.setItem('utc2_cached_classes', JSON.stringify(data.classes)); renderClassSelect(data.classes); } } catch (e) {} }
function renderClassSelect(classesArray) { const select = document.getElementById('class-select'); select.innerHTML = '<option value="">-- Chọn lớp học phần --</option>'; classesArray.forEach(cls => { let opt = document.createElement('option'); opt.value = cls; opt.innerHTML = "📚 Lớp: " + cls; select.appendChild(opt); }); }
function loadClasses() { fetchClassesBackground(); } 

async function handleAttendance() {
    const mssv = localStorage.getItem('utc2_mssv'); const classId = document.getElementById('class-select').value; const btn = document.getElementById('btnSubmit');
    if (!classId) return setStatus("⚠️ Vui lòng chọn lớp học phần!", "error");
    try {
        btn.disabled = true; setStatus("🔒 Đang tạo mã định danh...", "normal", true); const deviceId = getDeviceUUID();
        setStatus("🔍 Quét tìm Trạm...", "normal", true); const device = await navigator.bluetooth.requestDevice({ filters: [{ name: 'TRAM-DIEM-DANH' }], optionalServices: [SERVICE_UUID] });
        setStatus("🔗 Đang giải mã...", "normal", true); const server = await device.gatt.connect();
        
        const characteristic = await (await server.getPrimaryService(SERVICE_UUID)).getCharacteristic(CHAR_UUID);
        const challenge = Math.floor(Math.random() * 9000) + 1000;
        await characteristic.writeValue(new TextEncoder().encode(challenge.toString()));
        const response = new TextDecoder().decode(await characteristic.readValue()); device.gatt.disconnect();

        setStatus("☁️ Đang nộp dữ liệu...", "normal", true);
        const finalUrl = `${scriptURL}?action=checkin&classId=${encodeURIComponent(classId)}&mssv=${mssv}&challenge=${challenge}&response=${response}&deviceId=${deviceId}`;
        
        try {
            const res = await fetch(finalUrl);
            const result = await res.json();
            btn.disabled = false;
            if (result.success) { setStatus("🎉 Hoàn tất", "success"); addHistory(classId, true); Swal.fire({ icon: result.type === 'ALREADY_DONE' ? 'info' : 'success', title: result.title, text: result.message, confirmButtonColor: '#003366' }); } 
            else { setStatus("⚠️ " + result.title, "error"); addHistory(classId, false); Swal.fire({ icon: 'error', title: result.title, html: `${result.message}`, confirmButtonColor: '#e74c3c' }); }
        } catch (networkError) {
            btn.disabled = false; localStorage.setItem('utc2_offline_sync', finalUrl); setStatus("📥 Đã lưu Offline", "error"); addHistory(classId + " (Offline)", true);
            Swal.fire({ icon: 'warning', title: 'Mạng Yếu!', text: 'Đã lưu kết quả vào máy. Tự động đồng bộ khi có mạng.', confirmButtonColor: '#003366' });
        }
    } catch (err) { btn.disabled = false; setStatus("❌ Không quét được Trạm!", "error"); Swal.fire({ icon: 'error', title: 'Lỗi Bluetooth', text: 'Hãy đứng gần thiết bị và thử lại.', confirmButtonColor: '#e74c3c' }); }
}

function addHistory(className, isSuccess) {
    const historyList = document.getElementById('history-list'); const now = new Date(); const card = document.createElement('div'); card.className = 'history-card';
    card.innerHTML = `<div class="history-info"><span class="h-mssv">${className}</span><span class="h-time">${now.toLocaleDateString('vi-VN')} - ${now.toLocaleTimeString('vi-VN')}</span></div><span class="h-status ${isSuccess ? 'h-success' : 'h-error'}">${isSuccess ? 'Thành công' : 'Thất bại'}</span>`;
    historyList.prepend(card);
}
function clearHistory() { document.getElementById('history-list').innerHTML = ''; }
document.addEventListener('contextmenu', e => e.preventDefault());
document.onkeydown = e => { if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey) || (e.ctrlKey && e.keyCode == 85)) return false; }
