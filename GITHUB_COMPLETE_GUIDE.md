# GitHub 完整設定指南（新手版）

## 📚 目錄
1. [什麼是 Git 和 GitHub？](#什麼是-git-和-github)
2. [前置準備](#前置準備)
3. [步驟 1: 設定 Git（第一次使用）](#步驟-1-設定-git第一次使用)
4. [步驟 2: 在 GitHub 建立 Repository](#步驟-2-在-github-建立-repository)
5. [步驟 3: 初始化本地 Git Repository](#步驟-3-初始化本地-git-repository)
6. [步驟 4: 建立第一個 Commit](#步驟-4-建立第一個-commit)
7. [步驟 5: 連接到 GitHub](#步驟-5-連接到-github)
8. [步驟 6: 推送到 GitHub](#步驟-6-推送到-github)
9. [日常使用流程](#日常使用流程)
10. [常見問題](#常見問題)

---

## 什麼是 Git 和 GitHub？

### Git（版本控制系統）
- **就像「時光機」**：可以回到任何一個之前的版本
- **就像「備份系統」**：自動記錄每次變更
- **就像「協作工具」**：多人可以同時編輯而不會衝突

### GitHub（雲端平台）
- **就像「Google Drive for 程式碼」**：把你的程式碼存在雲端
- **就像「社交媒體 for 開發者」**：可以分享、協作、學習
- **免費**：公開的 repository 完全免費

---

## 前置準備

### ✅ 檢查清單
- [ ] Git 已安裝（✅ 已完成）
- [ ] 有 GitHub 帳號（如果沒有，我們會教你註冊）
- [ ] 網路連線

---

## 步驟 1: 設定 Git（第一次使用）

**這一步只需要做一次，之後就不用了！**

### 1.1 設定你的名字和 Email

在終端機執行（**替換成你的名字和 email**）：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的email@example.com"
```

**範例：**
```bash
git config --global user.name "Jacob"
git config --global user.email "jacob@aiflowtime.com"
```

**為什麼需要這個？**
- Git 需要知道是誰做了這些變更
- 這個資訊會記錄在每次的 commit 裡

### 1.2 確認設定成功

```bash
git config --global user.name
git config --global user.email
```

應該會顯示你剛才輸入的名字和 email。

---

## 步驟 2: 在 GitHub 建立 Repository

### 2.1 註冊 GitHub 帳號（如果還沒有）

1. 前往：https://github.com
2. 點擊右上角的 **"Sign up"**
3. 輸入：
   - Username（使用者名稱，例如：`jacob-aiflowtime`）
   - Email
   - Password
4. 完成驗證
5. 選擇 **"Free"** 方案（免費方案就夠用了）

### 2.2 建立新 Repository

1. 登入 GitHub 後，點擊右上角的 **"+"** 圖示
2. 選擇 **"New repository"**

3. **Repository 設定：**
   - **Repository name**: `AIFlowTime_Consultation_Landing_Page`
     - 這是你專案的名稱
     - 可以用英文、數字、連字號
   - **Description**（選填）: `AIFlowTime Consultation Landing Page Website`
   - **Public** 或 **Private**:
     - **Public** = 任何人都可以看到（推薦，免費）
     - **Private** = 只有你可以看到（需要付費方案才能多人協作）
   - **⚠️ 重要：不要勾選以下選項：**
     - ❌ Add a README file
     - ❌ Add .gitignore
     - ❌ Choose a license
   - （因為我們已經有檔案了，不需要這些）

4. 點擊綠色的 **"Create repository"** 按鈕

### 2.3 複製 Repository URL

建立完成後，你會看到一個頁面，上面有：
- **Quick setup** 區塊
- 一個網址，例如：`https://github.com/YOUR_USERNAME/AIFlowTime_Consultation_Landing_Page.git`

**📋 複製這個網址，等一下會用到！**

---

## 步驟 3: 初始化本地 Git Repository

### 3.1 進入專案目錄

```bash
cd "/Library/1. Vibe Coding with Cursor AI/AIFlowTime_Consultation_Landing_Page"
```

### 3.2 初始化 Git

```bash
git init
```

**這會做什麼？**
- 在你的專案資料夾建立一個隱藏的 `.git` 資料夾
- 告訴 Git：「這個資料夾要開始做版本控制了」

**成功訊息：**
```
Initialized empty Git repository in /path/to/your/project/.git/
```

---

## 步驟 4: 建立第一個 Commit

### 4.1 查看目前狀態

```bash
git status
```

**你會看到：**
- 很多檔案顯示為 "Untracked files"（未追蹤的檔案）
- 這是正常的！表示 Git 發現了這些檔案，但還沒有開始追蹤

### 4.2 加入所有檔案到 Git

```bash
git add .
```

**這會做什麼？**
- `.` 表示「當前資料夾的所有檔案」
- 告訴 Git：「我要開始追蹤這些檔案了」
- 檔案會被加入「暫存區」（Staging Area）

**注意：**
- `.gitignore` 檔案會自動排除 `node_modules/` 等不需要的檔案
- 所以不用擔心會上傳太多不必要的檔案

### 4.3 建立第一個 Commit

```bash
git commit -m "Initial commit: AIFlowTime Consultation Landing Page"
```

**這會做什麼？**
- `commit` = 建立一個「快照」，記錄目前所有檔案的狀態
- `-m` = 加上訊息（message）
- 訊息應該清楚描述這次變更的內容

**成功訊息：**
```
[main (root-commit) abc1234] Initial commit: AIFlowTime Consultation Landing Page
 X files changed, Y insertions(+)
```

**為什麼叫 "commit"？**
- 就像「提交作業」一樣，你告訴 Git：「我確定要保存這個版本了」

---

## 步驟 5: 連接到 GitHub

### 5.1 加入 Remote（遠端倉庫）

```bash
git remote add origin https://github.com/YOUR_USERNAME/AIFlowTime_Consultation_Landing_Page.git
```

**⚠️ 重要：**
- 把 `YOUR_USERNAME` 替換成你的 GitHub 使用者名稱
- 把網址換成你在步驟 2.3 複製的網址

**範例：**
```bash
git remote add origin https://github.com/jacob-aiflowtime/AIFlowTime_Consultation_Landing_Page.git
```

**這會做什麼？**
- `remote` = 遠端倉庫（GitHub）
- `origin` = 給這個遠端倉庫取的名字（慣例都用 `origin`）
- 告訴 Git：「我的程式碼要存在這個 GitHub repository」

### 5.2 確認 Remote 設定成功

```bash
git remote -v
```

**應該會顯示：**
```
origin  https://github.com/YOUR_USERNAME/AIFlowTime_Consultation_Landing_Page.git (fetch)
origin  https://github.com/YOUR_USERNAME/AIFlowTime_Consultation_Landing_Page.git (push)
```

---

## 步驟 6: 推送到 GitHub

### 6.1 設定主分支名稱（如果需要）

```bash
git branch -M main
```

**這會做什麼？**
- 確保你的主分支叫做 `main`（GitHub 的標準）
- 舊版本可能用 `master`，現在都用 `main`

### 6.2 推送到 GitHub

```bash
git push -u origin main
```

**這會做什麼？**
- `push` = 上傳你的程式碼到 GitHub
- `-u` = 設定「預設的遠端和分支」
- `origin main` = 上傳到 `origin` 的 `main` 分支

**第一次推送時：**
- 可能會要求你輸入 GitHub 的使用者名稱和密碼
- 或者會開啟瀏覽器讓你授權

**成功訊息：**
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Writing objects: 100% (X/X), done.
To https://github.com/YOUR_USERNAME/AIFlowTime_Consultation_Landing_Page.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

### 6.3 確認上傳成功

1. 回到 GitHub 網頁
2. 重新整理你的 repository 頁面
3. **你應該會看到所有檔案都出現了！** 🎉

---

## 日常使用流程

每次修改程式碼後，執行以下三個步驟：

### 1. 查看變更

```bash
git status
```

**會顯示：**
- 哪些檔案被修改了
- 哪些檔案是新的
- 哪些檔案被刪除了

### 2. 加入變更

```bash
git add .
```

**或者只加入特定檔案：**
```bash
git add linktree.html
git add consultation.html
```

### 3. 建立 Commit

```bash
git commit -m "描述這次變更，例如：新增 Design Sparks 按鈕"
```

**好的 Commit 訊息範例：**
- ✅ `"新增 Design Sparks 按鈕到 linktree"`
- ✅ `"優化 consultation.html 的載入速度"`
- ✅ `"修正手機版 navbar 顯示問題"`
- ❌ `"更新"`（太模糊）
- ❌ `"改東西"`（不清楚改什麼）

### 4. 推送到 GitHub

```bash
git push
```

**注意：**
- 第一次之後，只需要 `git push` 就可以了
- 不需要再寫 `-u origin main`

---

## 常用指令速查表

| 指令 | 說明 | 使用時機 |
|------|------|----------|
| `git status` | 查看變更狀態 | 修改檔案後 |
| `git add .` | 加入所有變更 | 準備 commit 前 |
| `git commit -m "訊息"` | 記錄變更 | 確定要保存時 |
| `git push` | 上傳到 GitHub | commit 後 |
| `git pull` | 下載最新版本 | 開始工作前 |
| `git log` | 查看歷史記錄 | 想看看之前做了什麼 |
| `git diff` | 查看具體變更 | 想知道改了什麼 |

---

## 常見問題

### Q1: 如果推送時要求輸入密碼怎麼辦？

**A:** GitHub 現在不支援密碼驗證，你需要：

1. **使用 Personal Access Token（推薦）：**
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token → 勾選 `repo` 權限
   - 複製 token，推送時密碼欄位貼上 token

2. **或者使用 SSH（進階）：**
   - 設定 SSH key（比較複雜，但之後更方便）

### Q2: 如果推送失敗怎麼辦？

**A:** 常見原因：
- 網路問題：檢查網路連線
- 認證問題：確認 GitHub 帳號和密碼/token
- 衝突：如果 GitHub 上有你沒有的變更，先執行 `git pull`

### Q3: 不小心 commit 錯的訊息怎麼辦？

**A:** 
```bash
git commit --amend -m "正確的訊息"
```

### Q4: 想回到之前的版本怎麼辦？

**A:**
```bash
# 查看歷史
git log

# 回到特定版本（替換 COMMIT_ID）
git checkout COMMIT_ID

# 回到最新版本
git checkout main
```

### Q5: `.gitignore` 是什麼？

**A:** 
- 告訴 Git「這些檔案不要追蹤」
- 例如：`node_modules/`、`.DS_Store` 等
- 已經幫你建立好了！

---

## 🎉 完成！

現在你的程式碼已經安全地備份在 GitHub 上了！

**下一步可以：**
- 每次修改後記得 `git add .` → `git commit -m "訊息"` → `git push`
- 在 GitHub 上查看你的程式碼
- 分享 repository 連結給其他人
- 使用 GitHub Issues 追蹤問題

**需要幫助？**
- GitHub 官方文件：https://docs.github.com
- Git 官方文件：https://git-scm.com/doc

