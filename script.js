/* --- CẬP NHẬT CSS CHO CÁC FORM MỚI --- */

.form-control {
    width: 100%; height: 50px; background: var(--input-bg); border: 2px solid var(--input-border); 
    border-radius: 15px; font-size: 16px; font-weight: 700; color: var(--primary-color); 
    text-align: center; box-sizing: border-box; box-shadow: var(--inset-dark), var(--inset-light); 
    outline: none; transition: all 0.4s ease; margin-bottom: 15px;
}
.form-control:focus { border-color: var(--accent-color); }

select.form-control { appearance: none; cursor: pointer; font-size: 14px; }

.btn-primary {
    width: 100%; height: 55px; background: linear-gradient(135deg, #66b3ff 0%, #0073e6 100%); 
    color: #ffffff; border: none; border-radius: 15px; font-size: 16px; font-weight: 900; 
    cursor: pointer; box-shadow: 5px 5px 12px rgba(0, 115, 230, 0.2); display: flex; 
    align-items: center; justify-content: center; transition: all 0.3s ease; margin-top: 10px;
}
.btn-primary:disabled { background: #cbd4db; color: #8a9ba8; cursor: not-allowed; box-shadow: none; }

.btn-secondary {
    width: 100%; height: 40px; background: transparent; color: var(--error); border: 2px dashed var(--error);
    border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; margin-top: 15px; transition: 0.3s;
}

.user-info { background: rgba(102, 179, 255, 0.1); padding: 10px; border-radius: 15px; border: 1px dashed var(--accent-color); margin-bottom: 15px; }
.user-info p { margin: 5px 0; }
