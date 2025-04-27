// main.js 

// Đợi cho toàn bộ tài nguyên (hình, CSS, các script khác) load xong
window.addEventListener('load', () => {
  // 1) Ẩn loader
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';

  // 2) Hiện nội dung
  const content = document.getElementById('body-content');
  if (content) content.style.display = 'block';
});

// Điều hướng đăng nhập nếu chưa login
// Giả định: thông tin đăng nhập lưu trong sessionStorage
// Nếu chưa có sessionStorage "userLoggedIn" thì redirect

document.addEventListener("DOMContentLoaded", function () {
    const userIcon = document.getElementById("userIcon");
    userIcon.addEventListener("click", function () {
      if (window.LOGGED_IN === 'true') {
        window.location.href = "/profile";
      } else {
        window.location.href = "/login"; 
      }
    });
  });

// Khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  // Bắt click cho mọi <a> hoặc <button> có text chứa "Trở lại"
  document.body.addEventListener('click', e => {
    const btn = e.target.closest('a, button');
    if (!btn) return;
    const txt = btn.textContent.trim().toLowerCase();
    if (txt === 'trở lại' || txt.startsWith('←') || txt.includes('trở lại')) {
      e.preventDefault();
      window.history.back();
    }
  });
});
