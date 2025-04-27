CREATE DATABASE VNad
USE VNad

CREATE TABLE users (
    id INT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(50) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL,
    email NVARCHAR(100),
    phone NVARCHAR(20)
);

CREATE TABLE posts (
    id INT PRIMARY KEY IDENTITY(1,1),
    title NVARCHAR(255),
    content NVARCHAR(MAX),
    region NVARCHAR(50),          -- Miền Bắc / Trung / Nam
    image_url NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE()
);

-- Game --
CREATE TABLE game_states (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    user_id          INT           NOT NULL,
    current_tile     INT           NOT NULL  CONSTRAINT DF_game_states_current_tile DEFAULT(0),
    money            BIGINT        NOT NULL  CONSTRAINT DF_game_states_money        DEFAULT(0),
    owned_tiles      VARCHAR(255)  Not NULL  CONSTRAINT DF_game_states_owned_tiles    DEFAULT(''),
    has_free_jail    BIT           NOT NULL  CONSTRAINT DF_game_states_has_free_jail DEFAULT(0),
    jail_status      VARCHAR(50)   NULL     CONSTRAINT DF_game_states_jail_status    DEFAULT(''),
    updated_at       DATETIME2     NOT NULL  CONSTRAINT DF_game_states_updated_at     DEFAULT(SYSDATETIME())
);

ALTER TABLE game_states
ADD CONSTRAINT FK_game_states_users
    FOREIGN KEY(user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

-- Tự động cập nhật cột updated_at mỗi lần ghi
CREATE OR ALTER TRIGGER trg_game_states_updated_at
   ON game_states
   AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE gs
    SET updated_at = SYSDATETIME()
  FROM game_states AS gs
  INNER JOIN inserted AS i ON gs.id = i.id;
END;

-- Kết quả chơi game --
CREATE TABLE game_states_final (
  id               INT           IDENTITY(1,1) PRIMARY KEY,
  user_id          INT           NOT NULL
    CONSTRAINT FK_game_states_final_users FOREIGN KEY REFERENCES users(id),
  final_money      BIGINT        NOT NULL,            -- tiền cuối cùng khi hoàn thành KPI
  final_tiles      NVARCHAR(MAX) NULL,                -- JSON hoặc chuỗi các ô đã sở hữu khi hoàn thành
  completed_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_game_states_final_user UNIQUE(user_id)
);

-- Diễn đàn --
-- 1) Bảng posts
CREATE TABLE posts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL                        -- người đăng
        CONSTRAINT FK_posts_users REFERENCES users(id),
    content NVARCHAR(MAX) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- 2) Bảng tags (nếu bạn muốn gán tag cho bài)
CREATE TABLE tags (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(50) NOT NULL UNIQUE
);

-- 3) Liên kết posts ↔ tags (nhiều-nhiều)
CREATE TABLE post_tags (
    post_id INT NOT NULL
        CONSTRAINT FK_posttags_posts REFERENCES posts(id),
    tag_id INT NOT NULL
        CONSTRAINT FK_posttags_tags REFERENCES tags(id),
    PRIMARY KEY(post_id, tag_id)
);

-- 4) Bảng comments
CREATE TABLE comments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    post_id INT NOT NULL
        CONSTRAINT FK_comments_posts REFERENCES posts(id),
    user_id INT NOT NULL
        CONSTRAINT FK_comments_users REFERENCES users(id),
    content NVARCHAR(MAX) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- 5) Bảng likes
CREATE TABLE likes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    post_id INT NOT NULL
        CONSTRAINT FK_likes_posts REFERENCES posts(id),
    user_id INT NOT NULL
        CONSTRAINT FK_likes_users REFERENCES users(id),
    created_at DATETIME DEFAULT GETDATE()
);

-- 6) Bảng shares (nếu cần)
CREATE TABLE shares (
    id INT IDENTITY(1,1) PRIMARY KEY,
    post_id INT NOT NULL
        CONSTRAINT FK_shares_posts REFERENCES posts(id),
    user_id INT NOT NULL
        CONSTRAINT FK_shares_users REFERENCES users(id),
    created_at DATETIME DEFAULT GETDATE()
);

-- Góp ý --
CREATE TABLE feedbacks (
    id INT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(50),
    message NVARCHAR(MAX),
    submitted_at DATETIME DEFAULT GETDATE()
);

-- Cập nhật thêm --
-- Bảng users
ALTER TABLE users
ADD created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    is_active BIT NOT NULL DEFAULT 1,
    role NVARCHAR(20) NOT NULL DEFAULT 'user';

-- Bảng feedbacks
ALTER TABLE feedbacks
ADD user_id INT NULL
CONSTRAINT FK_feedbacks_users FOREIGN KEY REFERENCES dbo.users(id),
    feedback_type NVARCHAR(50) NULL;

