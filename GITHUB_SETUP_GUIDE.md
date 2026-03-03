# GitHub 設定指南

## 什麼是 GitHub？

GitHub 是一個程式碼託管平台，你可以用它來：

1. **版本控制** - 追蹤所有程式碼變更，隨時可以回到之前的版本
2. **雲端備份** - 自動備份你的程式碼到雲端
3. **協作開發** - 多人可以同時編輯，不會互相覆蓋
4. **部署網站** - 可以自動部署到 GitHub Pages、Netlify、Vercel 等
5. **專案管理** - 使用 Issues 追蹤問題，使用 Projects 管理任務

## 設定步驟

### 步驟 1: 在 GitHub 建立新 Repository

1. 前往 https://github.com
2. 登入你的帳號（如果沒有，先註冊）
3. 點擊右上角的 **"+"** → **"New repository"**
4. Repository 名稱：`AIFlowTime_Consultation_Landing_Page`（或你喜歡的名稱）
5. 選擇 **Public**（公開）或 **Private**（私人）
6. **不要**勾選 "Initialize this repository with a README"
7. 點擊 **"Create repository"**

### 步驟 2: 在本地端初始化 Git

在終端機執行以下指令：

```bash
# 進入專案目錄
cd "/Library/1. Vibe Coding with Cursor AI/AIFlowTime_Consultation_Landing_Page"

# 初始化 Git repository
git init

# 加入所有檔案
git add .

# 建立第一個 commit
git commit -m "Initial commit: AIFlowTime Consultation Landing Page"

# 將本地 repository 連接到 GitHub（替換 YOUR_USERNAME 和 REPO_NAME）
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 步驟 3: 日常使用 Git

每次修改程式碼後：

```bash
# 1. 查看變更
git status

# 2. 加入變更的檔案
git add .                    # 加入所有變更
# 或
git add filename.html        # 只加入特定檔案

# 3. 建立 commit（記錄這次變更）
git commit -m "描述這次變更的內容，例如：新增 Design Sparks 按鈕"

# 4. 推送到 GitHub
git push
```

## 常用 Git 指令

| 指令 | 說明 |
|------|------|
| `git status` | 查看哪些檔案有變更 |
| `git add .` | 將所有變更加入暫存區 |
| `git commit -m "訊息"` | 記錄這次變更 |
| `git push` | 上傳到 GitHub |
| `git pull` | 從 GitHub 下載最新版本 |
| `git log` | 查看變更歷史 |
| `git diff` | 查看具體變更內容 |

## 進階功能

### 1. 建立分支（Branch）

當你想嘗試新功能時，可以建立分支：

```bash
# 建立新分支
git checkout -b new-feature

# 切換回主分支
git checkout main

# 合併分支
git merge new-feature
```

### 2. 查看變更歷史

```bash
# 查看所有 commit
git log

# 查看特定檔案的變更歷史
git log -- filename.html
```

### 3. 還原變更

```bash
# 還原未 commit 的變更
git checkout -- filename.html

# 還原到上一個 commit
git reset --hard HEAD~1
```

## 與 Firebase 整合

你的網站目前使用 Firebase Hosting 部署，GitHub 可以：

1. **自動部署** - 使用 GitHub Actions 自動部署到 Firebase
2. **版本追蹤** - 每次部署都對應一個 Git commit
3. **回滾** - 如果部署出問題，可以快速回到之前的版本

## 注意事項

- `.gitignore` 檔案已經建立，會自動排除 `node_modules/` 等不需要的檔案
- 敏感資訊（如 API keys）不要 commit 到 GitHub
- 定期 `git push` 確保程式碼有備份

## 需要幫助？

- GitHub 官方文件：https://docs.github.com
- Git 教學：https://git-scm.com/doc

