// Khởi tạo FingerprintJS
const fpPromise = import('https://openfpcdn.io/fingerprintjs/v4').then(FingerprintJS => FingerprintJS.load());

// 1. KIỂM TRA THIẾT BỊ (CHẶN PC/LAPTOP)
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
checkDeviceType(); // Chạy ngay khi load

// 2. CẤU HÌNH API
const scriptURL = 'https://script.google.com/macros/s/AKfycbzCByqoQ70J0732L9TkhIN0LeGxQcg2RMiLj3cIQ-D74qhI6BappOCU8tSenX-O7RfE/exec'; 
const SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const CHAR_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";

// 3. XỬ LÝ GIAO DIỆN & LOCAL STORAGE
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('utc2_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('checkbox').checked = true;
    }
});

function toggleTheme(element) {
    if (element.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('utc2_theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('utc2_theme', 'light');
    }
}

// 4. LỊCH SỬ ĐIỂM DANH
function addHistory(mssv, isSuccess, message) {
    const historyList = document.getElementById('history-list');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN');
    
    const card = document.createElement('div');
    card.className = 'history-card';
    const statusClass = isSuccess ? 'h-success' : 'h-error';
    const statusText = isSuccess ? 'Thành công' : 'Thất bại';

    card.innerHTML = `
        <div class="history-info">
            <span class="h-mssv">${mssv}</span>
            <span class="h-time">${timeStr}</span>
        </div>
        <span class="h-status ${statusClass}">${statusText}</span>
    `;
    historyList.prepend(card);
}

function clearHistory() {
    document.getElementById('history-list').innerHTML = '';
}

// 5. CẢNH BÁO MẤT MẠNG
window.addEventListener('offline', () => {
    document.getElementById('offline-banner').style.display = 'block';
    document.getElementById('btnSubmit').disabled = true;
});
window.addEventListener('online', () => {
    document.getElementById('offline-banner').style.display = 'none';
    document.getElementById('btnSubmit').disabled = false;
});

// 6. XỬ LÝ ĐIỂM DANH (LÕI)
async function handleAttendance() {
    const mssv = document.getElementById('mssv').value.trim();
    const status = document.getElementById('status');
    const btn = document.getElementById('btnSubmit');
    const loader = document.getElementById('spinner');

    if (!mssv) {
        status.style.color = "var(--error)";
        status.innerText = "❌ Vui lòng nhập MSSV!";
        return;
    }

    try {
        btn.disabled = true;
        loader.style.display = "block";
        
        // Lớp giáp FingerprintJS
        status.style.color = "var(--primary)";
        status.innerText = "🔒 Đang quét thông tin thiết bị...";
        const fp = await fpPromise;
        const fpResult = await fp.get();
        const deviceId = fpResult.visitorId;

        // Lớp giáp Bluetooth ESP32
        status.innerText = "🔍 Đang tìm Trạm BLE...";
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'TRAM-DIEM-DANH' }],
            optionalServices: [SERVICE_UUID]
        });

        status.innerText = "🔗 Đang kiểm tra bảo mật...";
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

        // Gửi dữ liệu lên Google Sheets
        status.innerText = "☁️ Đang đồng bộ...";
        const finalUrl = `${scriptURL}?mssv=${mssv}&challenge=${challenge}&response=${response}&deviceId=${deviceId}`;
        
        const apiResponse = await fetch(finalUrl);
        const result = await apiResponse.text();
        
        loader.style.display = "none";
        btn.disabled = false;

        if (result.includes("Thành công")) {
            status.style.color = "var(--success)";
            status.innerHTML = "🎉 " + result;
            addHistory(mssv, true, result); 
            document.getElementById('mssv').value = ""; 
        } else {
            status.style.color = "var(--error)";
            status.innerHTML = "⚠️ " + result;
            addHistory(mssv, false, result); 
        }

    } catch (err) {
        loader.style.display = "none";
        btn.disabled = false;
        status.style.color = "var(--error)";
        status.innerText = "❌ Lỗi: Từ chối kết nối hoặc không tìm thấy trạm!";
        console.error(err);
    }
}

// 7. CHỐNG SOI CODE (ANTI-F12)
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
    if (e.keyCode == 123) return false; 
    if (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) return false; 
    if (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) return false; 
    if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) return false; 
}
