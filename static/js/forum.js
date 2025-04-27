// static/js/forum.js

let posts = [];
let activeTab = "latest";
let searchQuery = "";

function getTimeAgo(ts) {
  const now = Date.now();
  const diffMs = now - ts;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "Vừa xong";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

async function loadPosts() {
  const url = searchQuery
    ? `/api/posts?search=${encodeURIComponent(searchQuery)}`
    : '/api/posts';
  const res = await fetch(url);
  posts = await res.json();
  renderPosts();
  renderSuggestions();
}

function renderPosts() {
  const container = document.getElementById("forumContent");
  container.innerHTML = "";

  const list = activeTab === "latest"
    ? posts
    : [...posts].sort((a, b) =>
        (b.stats.likes + b.stats.shares) - (a.stats.likes + a.stats.shares)
      );

  list.forEach(post => {
    const div = document.createElement("div");
    div.className = "forum-post";
    div.innerHTML = `
      <div class="post-meta">
        <span class="post-author">${post.author}</span> •
        <span class="post-time">${getTimeAgo(post.timestamp)}</span>
      </div>
      <h3 class="post-title">${post.title}</h3>
      <p>${post.content}</p>
      <div class="post-stats">
        <span class="icon like-icon"    data-id="${post.id}">👍 ${post.stats.likes}</span>
        <span class="icon comment-icon" data-id="${post.id}">💬 ${post.stats.comments}</span>
        <span class="icon share-icon"   data-id="${post.id}">↻ ${post.stats.shares}</span>
      </div>
      ${window.LOGGED_IN ? `<span class="icon delete-icon" data-id="${post.id}">🗑️</span>` : ''}
    `;
    container.appendChild(div);
  });
}

function renderSuggestions() {
  const sug = [...posts]
    .sort((a, b) =>
      (b.stats.likes + b.stats.shares) - (a.stats.likes + a.stats.shares)
    )
    .slice(0, 3);

  document.getElementById("suggestionsList").innerHTML =
    sug.map(p => `<li><a href="#">${p.content}</a></li>`).join("");
}

function attachEvents() {
  // Tab filters
  document.getElementById("btnLatest").onclick = () => {
    activeTab = "latest";
    document.getElementById("btnLatest").classList.add("active");
    document.getElementById("btnPopular").classList.remove("active");
    renderPosts();
  };
  document.getElementById("btnPopular").onclick = () => {
    activeTab = "popular";
    document.getElementById("btnPopular").classList.add("active");
    document.getElementById("btnLatest").classList.remove("active");
    renderPosts();
  };

  // Login and Register navigation
  document.getElementById("btnRegister").addEventListener("click", () => {
    window.location.href = "/register";
  });
  document.getElementById("btnLogin").addEventListener("click", () => {
    window.location.href = "/login";
  });

  // Add post button
  document.getElementById("btnAddPost").addEventListener("click", async () => {
    try {
      const res = await fetch("/check_login");
      const { logged_in } = await res.json();
      window.location.href = logged_in ? "/new_post" : "/login";
    } catch {
      window.location.href = "/login";
    }
  });

  // Live search
  document.querySelector(".search-input").addEventListener("input", e => {
    searchQuery = e.target.value.trim();
    loadPosts();
  });

  // Like / Comment / Share / Delete events
  document.getElementById("forumContent").addEventListener("click", async e => {
    const postId = +e.target.dataset.id;
    if (!postId) return;

    if (e.target.classList.contains("delete-icon")) {
      if (confirm("Bạn có chắc muốn xóa bài viết này?")) {
        await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
        loadPosts();
      }
      return;
    }

    if (e.target.classList.contains("like-icon")) {
      await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
      await loadPosts();
    } else if (e.target.classList.contains("comment-icon")) {
      showCommentsPopup(postId);
    } else if (e.target.classList.contains("share-icon")) {
      alert("Đã chia sẻ!");
      await loadPosts();
    }
  });
}

async function showCommentsPopup(postId) {
  document.querySelectorAll(".comments-popup").forEach(el => el.remove());
  let comments = [];
  try {
    const res = await fetch(`/api/posts/${postId}/comments`);
    comments = await res.json();
  } catch {
    console.error("Không tải được bình luận");
  }

  const popup = document.createElement("div");
  popup.className = "comments-popup";
  popup.innerHTML = `
    <div class="popup-content">
      <h4>Bình luận</h4>
      <ul>
        ${comments.length
          ? comments.map(c => `<li><strong>${c.author}</strong>: ${c.content}</li>`).join("")
          : "<li>Chưa có bình luận</li>"}
      </ul>
      <textarea id="newComment" placeholder="Viết bình luận..."></textarea>
      <button id="submitComment">Đăng</button>
      <button id="closePopup">Đóng</button>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById("closePopup").onclick = () => popup.remove();
  document.getElementById("submitComment").onclick = async () => {
    const textEl = document.getElementById("newComment");
    const text = textEl.value.trim();
    if (!text) return;
    await fetch(`/api/posts/${postId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    popup.remove();
    showCommentsPopup(postId);
    loadPosts();
  };
}

window.addEventListener('DOMContentLoaded', () => {
  loadPosts();
  attachEvents();
});
