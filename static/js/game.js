// game.js

function startGame() {
    fetch('/check_login')
      .then(res => res.json())
      .then(data => {
        if (data.logged_in) {
          window.location.href = '/board';
        } else {
          window.location.href = '/login';
        }
      })
      .catch(error => {
        console.error("Lỗi khi kiểm tra đăng nhập", error);
        alert("Có lỗi xảy ra, thử lại sau!");
      });
  }
  