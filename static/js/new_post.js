// static/js/new_post.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById("newPostForm");
  const addImageBtn   = document.querySelector(".add-image-btn");
  const saveDraftBtn  = document.querySelector(".save-draft-btn");

  form.addEventListener("submit", async function(e) {
    e.preventDefault();

    const title   = this.title.value.trim();
    const content = this.content.value.trim();

    if (!title) {
      return alert("Tiêu đề không được để trống!");
    }
    if (!content) {
      return alert("Nội dung không được để trống!");
    }

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title, content })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Đã tạo bài viết thành công!");
        window.location.href = '/forum';  // Chuyển về trang diễn đàn sau khi đăng
      } else {
        alert(data.error || 'Lỗi tạo bài viết');
      }
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Không thể kết nối đến server.");
    }
  });

  addImageBtn.addEventListener("click", () => {
    alert("Chức năng thêm ảnh chưa được triển khai.");
  });

  saveDraftBtn.addEventListener("click", () => {
    // Có thể sau này lưu draft vào localStorage hoặc server
    alert("Đã lưu nháp!");
  });
});
