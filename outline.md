# AIFlowTime 網站結構大綱

## 文件結構

```
/mnt/okcomputer/output/
├── index.html              # 主頁面
├── consultation.html       # 諮詢服務子頁
├── main.js                # 主要 JavaScript 功能
├── hero-workflow.png      # Hero 區背景圖
├── design.md              # 設計系統文檔
├── interaction.md         # 交互設計文檔
└── outline.md             # 本文件
```

## 主頁面（index.html）結構

### A. Header/Navigation
- Logo：AIFlowTime
- 導航連結：關於、服務、諮詢、聯絡
- CTA 按鈕：立即預約

### B. Hero 區
- 左側內容：
  - H1：身份輪播（斜槓族/媽媽/小生意老闆）
  - H2：用 AI 快速建立第一條工作流｜每星期省返 7 小時
  - 補充文字：唔使識 Coding｜唔使辭工｜由 0 到有，一步一步砌好
  - CTA 按鈕：做 2 分鐘省時診斷
- 右側視覺：workflow 抽象圖像

### C. 目標受眾與成果
- 三張卡片：
  1. 在家媽媽
  2. 斜槓族/自由工作者
  3. 全職返工想搞副業

### D. 為何而家要學 AI
- 段落標題：而家入場，會比大多數人更快建立優勢
- 50 字短訊息（香港語感）
- Quote block：Sam Altman 引言
- 次要 CTA：了解 90 分鐘諮詢內容

### E. 服務簡介
- 價格卡片：AI 省時諮詢（90 分鐘）HK$1,500
- CTA：立即預約

### F. 活動 Banner 輪播
- 三張活動 banner
- 自動輪播（5 秒切換）
- 手動控制（箭頭 + 圓點）

### G. Footer
- 簡介、聯絡方式、版權

## 子頁面（consultation.html）結構

### A. Header/Navigation
- 與主頁相同，高亮「諮詢」選項

### B. Hero 區
- 頁面標題：AI 省時諮詢｜HK$1,500／90 分鐘
- 簡短描述

### C. 諮詢流程
- Timeline 展示：
  1. 問題定位（Problem spotting）
  2. 痛點拆解（Pain point）
  3. 你會得到（Deliverables）
  4. 結果（Result）

### D. FAQ 區
- 3-5 條常見問題
- 手風琴式展開/收起

### E. CTA 區
- 主要 CTA：立即預約
- 聯絡資訊

### F. Footer
- 與主頁相同

## JavaScript 功能（main.js）

1. 身份輪播動畫
2. 平滑滾動
3. 滾動觸發動畫
4. 視差效果
5. Banner 輪播
6. FAQ 交互
7. 表單處理

## 響應式斷點

- 桌面：≥1024px
- 平板：768px - 1023px
- 手機：<768px
