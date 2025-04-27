// Khi click vào mục trong sidebar, active class sẽ bật/tắt
// sidebar.js
document.querySelectorAll('.sidebar .menu li').forEach(li => {
  li.addEventListener('click', () => {
    // Logout
    if (li.dataset.action === 'logout') {
      window.location.href = '/logout';
      return;
    }
    // Xoá active cũ, thêm active mới
    document.querySelectorAll('.sidebar .menu li')
      .forEach(i => i.classList.remove('active'));
    li.classList.add('active');

    // Điều hướng theo data-item
    switch(li.dataset.item) {
      case 'home': window.location.href = '/forum'; break;
      case 'tags': window.location.href = '#'; break;
      case 'your_posts': window.location.href = '/your_posts'; break;
      case 'your_answers': window.location.href = '/your_answers'; break;
      case 'your_shares': window.location.href = '/your_shares'; break;
    }
  });
});

  