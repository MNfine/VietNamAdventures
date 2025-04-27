# app.py
from flask import (
    Flask, render_template, request, redirect,
    session, flash, jsonify, url_for
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from functools import wraps

from flask_mail import Mail, Message
import pyodbc 
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)   # mở CORS cho tất cả route

# Secret key cho session
app.secret_key = "your-secret-key"

# Hàm kết nối database
def get_db_connection():
    try:
        conn = pyodbc.connect('DRIVER={ODBC Driver 18 for SQL server}; SERVER=LAPTOP-SRHKPKVA\\SQLEXPRESS; DATABASE=VNad; UID=VNad; PWD=12345678;TrustServerCertificate=yes')
        return conn
    except pyodbc.Error as ex:
        sqlstate = ex.args[0]
        if sqlstate == '28000':
            print("Lỗi xác thực Windows Authentication")
        else:
            print("Lỗi kết nối database:", ex)
        return None

# Cấu hình Flask-Mail
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'mandminf@gmail.com'  # Thay bằng email của bạn
app.config['MAIL_PASSWORD'] = 'tqst ctcm eonx jzxu'  # Thay bằng mật khẩu ứng dụng
app.config['MAIL_DEFAULT_SENDER'] = 'mandminf@gmail.com'

mail = Mail(app)

# Kiẻm tra đăng nhập hay chưa
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

# Trang chủ
@app.route("/")
def home():
    return render_template("index.html")

# Đăng ký
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        email = request.form["email"]
        phone = request.form["phone"]

        # Kiểm tra trùng tên
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()

            # Kiểm tra trùng tên
            cursor.execute("SELECT * FROM users WHERE username=?", username)
            if cursor.fetchone():
                flash("Tên người dùng đã tồn tại!", "error")
                conn.close()
                return render_template("register.html")

            hashed_pw = generate_password_hash(password)
            cursor.execute(
                "INSERT INTO users (username, password, email, phone) VALUES (?, ?, ?, ?)",
                (username, hashed_pw, email, phone)
            )
            conn.commit()
            conn.close()
        else:
            flash("Không thể kết nối đến database!", "error")
            return render_template("register.html")

        flash("Đăng ký thành công!", "success")
        return redirect("/login")

    return render_template("register.html")

# Đăng nhập
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE username=?", username)
            user = cursor.fetchone()
            conn.close()

            if user and check_password_hash(user[2], password):  # user[2] là password đã hash
                session["user"] = username
                session["user_id"] = user[0]  # user[0] là id
                flash("Đăng nhập thành công!", "success")
                return redirect("/")
            else:
                flash("Sai thông tin đăng nhập", "error")
                return render_template("login.html")
        else:
            flash("Không thể kết nối đến database!", "error")
            return render_template("login.html")

    return render_template("login.html")

# Đăng xuất
@app.route("/logout")
def logout():
    session.pop("user", None)
    session.pop("user_id", None)
    flash("Đã đăng xuất", "info")
    return redirect("/")

# Trang bài viết
@app.route("/posts")
def posts():
    return render_template("posts.html")

# Bài viết miền nam
@app.route("/postmiennam")
def postmiennam():
    return render_template("postmiennam.html")

# Bài viết miền bắc
@app.route("/postmienbac")
def postmienbac():
    return render_template("postmienbac.html")

# Bài viết miền trung
@app.route("/postmientrung")
def posmientrung():
    return render_template("postmientrung.html")

#Trang game
@app.route("/game")
def game():
    return render_template("game.html")

#Trang bàn cờ
@app.route("/board")
@login_required
def board():
    if 'user' not in session:
        return redirect("/login")
    return render_template("board.html") 

@app.route('/check_login')
def check_login():
    return jsonify(logged_in = 'user_id' in session) 

# Xem profile 
@app.route('/profile')
@login_required
def profile():
    # Lấy thông tin user từ session
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id=?", session['user_id'])
        user = cursor.fetchone()
        conn.close()
        if user:
            return render_template('profile.html', user=user)
        else:
            flash("Không tìm thấy thông tin người dùng", "error")
            return redirect("/")
    else:
        flash("Không thể kết nối đến database!", "error")
        return redirect("/")

# --- API: current game state ---
@app.route('/api/game_state', methods=['GET', 'POST'])
@login_required
def api_game_state():
    conn = get_db_connection()
    if not conn:
        return jsonify(status='error', message="Không thể kết nối đến database!")

    cursor = conn.cursor()
    user_id = session['user_id']

    try:
        if request.method == 'GET':
            # Lấy trạng thái hiện tại
            cursor.execute(
                "SELECT current_tile, money, owned_tiles, has_free_jail, jail_status, updated_at "
                "FROM game_states WHERE user_id=?",
                (user_id,)
            )
            gs = cursor.fetchone()

            if not gs:
                # Khởi tạo nếu chưa có
                cursor.execute(
                    "INSERT INTO game_states "
                    "(user_id, current_tile, money, owned_tiles, has_free_jail, jail_status, updated_at) "
                    "VALUES (?, 0, 1000, '', 0, 0, GETDATE())",
                    (user_id,)
                )
                conn.commit()
                cursor.execute(
                    "SELECT current_tile, money, owned_tiles, has_free_jail, jail_status, updated_at "
                    "FROM game_states WHERE user_id=?",
                    (user_id,)
                )
                gs = cursor.fetchone()

            current_tile, money, owned_str, free_jail, jail_status, updated_at = gs
            owned_tiles = [int(i) for i in owned_str.split(',') if owned_str]  # chuyển về list
            return jsonify({
                'current_tile': current_tile,
                'money': money,
                'owned_tiles': owned_tiles,
                'has_free_jail': bool(free_jail),
                'jail_status': jail_status,
                'updated_at': updated_at.isoformat()
            })

        else:  # POST
            data = request.get_json() or {}
            current_tile  = data.get('current_tile', 0)
            money         = data.get('money', 0)
            owned_tiles   = data.get('owned_tiles') or []
            has_free_jail = data.get('has_free_jail', False)
            jail_status   = data.get('jail_status', 0)

            # Chuyển list thành chuỗi "1,3,5"
            tiles_str = ','.join(str(i) for i in owned_tiles)

            # Thử UPDATE trước
            cursor.execute(
                "UPDATE game_states "
                "SET current_tile=?, money=?, owned_tiles=?, has_free_jail=?, jail_status=?, updated_at=GETDATE() "
                "WHERE user_id=?",
                (current_tile, money, tiles_str, int(has_free_jail), jail_status, user_id)
            )

            # Nếu chưa có record nào bị UPDATE (rowcount==0) thì INSERT
            if cursor.rowcount == 0:
                cursor.execute(
                    "INSERT INTO game_states "
                    "(user_id, current_tile, money, owned_tiles, has_free_jail, jail_status, updated_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, GETDATE())",
                    (user_id, current_tile, money, tiles_str, int(has_free_jail), jail_status)
                )

            conn.commit()
            return jsonify(status='ok')

    except Exception as e:
        print(f"Lỗi API GameState: {e}")
        return jsonify(status='error', message=str(e))

    finally:
        conn.close()

# --- API: complete KPI, lưu vào bảng final ---
@app.route('/api/complete_kpi', methods=['POST'])
@login_required
def complete_kpi():
    conn = get_db_connection()
    if not conn:
        return jsonify(status='error', message="Không thể kết nối đến database!")

    cursor = conn.cursor()
    user_id = session['user_id']
    data = request.get_json() or {}

    try:
        final_money = data.get('final_money', 0)
        final_tiles = ','.join(str(i) for i in data.get('final_tiles', []))

        # Kiểm tra xem đã có bản ghi GameStateFinal cho user này chưa
        cursor.execute("SELECT * FROM game_states_final WHERE user_id=?", user_id)
        gsf = cursor.fetchone()

        if not gsf:
            # Nếu chưa có, tạo mới
            cursor.execute(
                "INSERT INTO game_states_final (user_id, final_money, final_tiles, completed_at) VALUES (?, ?, ?, GETDATE())",
                (user_id, final_money, final_tiles)
            )
        else:
            # Nếu đã có, cập nhật
            cursor.execute(
                "UPDATE game_states_final SET final_money=?, final_tiles=?, completed_at=GETDATE() WHERE user_id=?",
                (final_money, final_tiles, user_id)
            )

        conn.commit()
        return jsonify(status='ok')

    except Exception as e:
        print(f"Lỗi API complete_kpi: {e}")
        return jsonify(status='error', message=str(e))
    finally:
        conn.close()

# map English ➔ Vietnamese
TYPE_LABELS = {
    'suggestion': 'Góp ý nội dung bài viết',
    'complaint': 'Phàn nàn',
    'layout': 'Góp ý về giao diện',
    'feature': 'Đề xuất tính năng mới',
    'other': 'Khác'
}

# Trang diễn đàn
@app.route('/forum')
def forum():
    return render_template(
        'forum.html', 
        is_logged_in = ('user_id' in session),
        active_item = 'home')

# Trang viết bài mới của diễn đàn 
@app.route('/new_post')
def new_post():
    return render_template(
        'new_post.html',
        is_logged_in = True,
        active_item = 'your_posts')

# --- API cho Forum ------------------------------------------------------
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/api/posts', methods=['GET'])
def api_get_posts():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Lấy query tìm kiếm nếu có
    search = request.args.get('search', '').strip()
    where_clause = ""
    params = ()
    if search:
        where_clause = "WHERE p.title LIKE ? OR p.content LIKE ?"
        params = (f"%{search}%", f"%{search}%")

    cursor.execute(f"""
        SELECT
          p.id, u.username, p.title, p.content, p.created_at,
          (SELECT COUNT(*) FROM likes    WHERE post_id=p.id) AS like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id=p.id) AS comment_count,
          (SELECT COUNT(*) FROM shares   WHERE post_id=p.id) AS share_count
        FROM posts p
        JOIN users u ON p.user_id=u.id
        {where_clause}
        ORDER BY p.created_at DESC
    """, params)
    posts = []
    for row in cursor.fetchall():
        posts.append({
            "id":        row[0],
            "author":    row[1],
            "title":     row[2],
            "content":   row[3],
            "timestamp": int(row[4].timestamp() * 1000),
            "stats": {
                "likes":    row[-3],
                "comments": row[-2],
                "shares":   row[-1]
            }
        })

    conn.close()
    return jsonify(posts)


@app.route('/api/posts', methods=['POST'])
@login_required
def api_create_post():
    data = request.get_json() or {}
    title   = data.get('title', '').strip()
    content = data.get('content', '').strip()
    user_id = session['user_id']

    if not title or not content:
        return jsonify({"error": "Tiêu đề và nội dung không được để trống"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)",
        (user_id, title, content)
    )
    conn.commit()
    new_id = cursor.execute("SELECT SCOPE_IDENTITY()").fetchval()
    conn.close()

    return jsonify({"success": True, "id": new_id}), 201


@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
@login_required
def api_delete_post(post_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Lấy user_id của post
    cursor.execute("SELECT user_id FROM posts WHERE id=?", (post_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Bài viết không tồn tại"}), 404

    post_owner_id = row[0]

    # 2. So sánh với user_id đang login
    if post_owner_id != session['user_id']:
        conn.close()
        return jsonify({"error": "Bạn không có quyền xóa bài này"}), 403

    # 3. Nếu cùng user thì xóa
    # Xóa hết các bản ghi phụ thuộc
    cursor.execute("DELETE FROM comments WHERE post_id=?", (post_id,))
    cursor.execute("DELETE FROM likes    WHERE post_id=?", (post_id,))
    cursor.execute("DELETE FROM shares   WHERE post_id=?", (post_id,))
    
    cursor.execute("DELETE FROM posts WHERE id=?", (post_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
@login_required
def api_like(post_id):
    user_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    # optional: tránh like trùng
    cursor.execute("INSERT INTO likes (post_id, user_id) VALUES (?, ?)", (post_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"success":True})

@app.route('/api/posts/<int:post_id>/comment', methods=['POST'])
@login_required
def api_comment(post_id):
    data = request.get_json()
    text = data.get('text','').strip()
    user_id = session['user_id']
    if not text:
        return jsonify({"error":"Bình luận trống"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)",
                   (post_id, user_id, text))
    conn.commit()
    conn.close()
    return jsonify({"success":True})

@app.route('/api/posts/<int:post_id>/comments', methods=['GET'])
def api_get_comments(post_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
      SELECT c.id, u.username, c.content, c.created_at
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    """, post_id)
    comments = [
      {
        "id": row[0],
        "author": row[1],
        "content": row[2],
        "timestamp": int(row[3].timestamp() * 1000)
      }
      for row in cursor.fetchall()
    ]
    conn.close()
    return jsonify(comments)

#Trang feedback
@app.route("/feedback")
def feedback():
    return render_template("feedback.html")

@app.route('/send_feedback', methods=['POST'])
def send_feedback():
    type_key = request.form.get('feedback-type')
    type_label = TYPE_LABELS.get(type_key, type_key)  # fallback nếu key lạ 
    # Lấy dữ liệu từ form
    name = request.form.get('name', 'Ẩn danh')  # Nếu không có tên, mặc định là "Ẩn danh"
    email = request.form.get('email', 'Không cung cấp')  # Nếu không có email, mặc định là "Không cung cấp"
    feedback_type = type_label # Loại góp ý
    content = request.form.get('content', '')  # Lấy nội dung góp ý
    rating = request.form.get('rating', 'Không đánh giá')  # Lấy đánh giá

    # Kiểm tra các trường bắt buộc
    if not feedback_type:
        return jsonify({'success': False, 'message': 'Loại góp ý không được để trống.'})
    if not content:
        return jsonify({'success': False, 'message': 'Nội dung góp ý không được để trống.'})

    # Tạo nội dung email
    subject = f"Phản hồi từ {name}"
    body = f"""
    Loại góp ý: {feedback_type}
    Đánh giá: {rating if rating else 'Không đánh giá'}
    Người gửi: {name if name else 'Ẩn danh'}
    Email: {email if email else 'Không cung cấp'}

    Nội dung góp ý:
    {content}
    """

    # Gửi email
    try:
        msg = Message(subject, recipients=['mandminf@gmail.com'], body=body)
        mail.send(msg)
        return jsonify({'success': True, 'message': 'Phản hồi đã được gửi thành công!'})
    except Exception as e:
        print(f"Lỗi khi gửi email: {e}")
        return jsonify({'success': False, 'message': 'Đã xảy ra lỗi khi gửi phản hồi.'})

@app.route('/rank')
@login_required
def rank():
    conn = get_db_connection()
    if not conn:
        flash("Không thể kết nối đến database!", "error")
        return redirect("/")

    cursor = conn.cursor()
    try:
        cursor.execute("SELECT username, final_money FROM game_states_final INNER JOIN users ON game_states_final.user_id = users.id ORDER BY final_money DESC, completed_at ASC")
        entries = cursor.fetchall()
        return render_template('rank.html', entries=entries)
    except Exception as e:
        print(f"Lỗi leaderboard: {e}")
        flash("Lỗi khi truy vấn leaderboard", "error")
        return redirect("/")
    finally:
        conn.close()

if __name__ == "__main__":
    app.run(debug=True, port=5001)
