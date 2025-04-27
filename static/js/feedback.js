// feedback.js 
// Lắng nghe sự kiện submit của form
document.getElementById('feedback-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Ngừng hành động mặc định của form

    // Lấy dữ liệu từ form
    const formData = new FormData(this);

    // Gửi dữ liệu đến backend
    fetch('/send_feedback', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Hiển thị thông báo
        const notification = document.getElementById('notification');
        const message = document.getElementById('notification-message');
        message.textContent = data.message;

        // Thêm class để thay đổi màu sắc dựa trên trạng thái
        if (data.success) {
            notification.className = 'success';
        } else {
            notification.className = 'error';
        }

        notification.style.display = 'block';

        // Reload lại trang sau 3 giây nếu thành công
        if (data.success) {
            setTimeout(() => {
                location.reload();
            }, 3000);
        }

        // Ẩn thông báo sau 3 giây
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    })
    .catch(error => {
        console.error('Lỗi:', error);

        // Hiển thị thông báo lỗi
        const notification = document.getElementById('notification');
        const message = document.getElementById('notification-message');
        message.textContent = 'Đã xảy ra lỗi khi gửi phản hồi.';
        notification.className = 'error';
        notification.style.display = 'block';

        // Ẩn thông báo sau 3 giây
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    });
});