# AIFlowTime 交互設計

## 核心交互功能

### 1. Hero 區身份輪播效果

**功能描述：**
- 三個身份文字（斜槓族、媽媽、小生意老闆）以 1.2 秒節奏輪流切換
- 使用淡入淡出效果，平滑過渡
- 身份文字下方保留固定總結文字「全部都包括」

**技術實現：**
- JavaScript setInterval 控制切換
- CSS transition 實現淡入淡出
- 使用 opacity 和 transform 屬性

### 2. 主要 CTA 按鈕交互

**功能描述：**
- 「做 2 分鐘省時診斷」按鈕
- 點擊後平滑滾動到「省時緊迫感」區塊
- 按鈕 hover 效果：背景色加深 + 輕微放大

**技術實現：**
- scrollIntoView({ behavior: 'smooth' })
- CSS hover 狀態樣式
- transform: scale(1.02) 和 filter: brightness(0.9)

### 3. 受眾卡片交互

**功能描述：**
- 三張卡片並排展示（桌面）/ 直排（移動端）
- 卡片 hover 時上浮並加深陰影
- 卡片內容包含圖標、標題、描述文字

**技術實現：**
- CSS transform: translateY(-4px)
- box-shadow 加深效果
- transition 持續 300ms

### 4. 活動 Banner 輪播

**功能描述：**
- 3:2 比例的橫向輪播
- 每 5 秒自動切換下一張
- 小圓點指示器顯示當前位置
- 左右箭頭支持手動切換
- 無限循環播放

**技術實現：**
- JavaScript setInterval 自動播放
- transform: translateX() 實現滑動
- 事件監聽器處理手動切換

### 5. 滾動觸發動畫

**功能描述：**
- 每個 section 進場時淡入 + 輕微上移
- 元素進入視口時觸發動畫
- 保持克制，避免過度動畫

**技術實現：**
- Intersection Observer API
- CSS animation 或 transition
- opacity: 0 → 1, transform: translateY(20px) → 0

### 6. 視差滾動效果

**功能描述：**
- Hero 區背景元素輕微視差移動
- 背景移動速度為前景的 0.5x
- 營造深度感但不過分搶眼

**技術實現：**
- window.scrollY 監聽
- requestAnimationFrame 優化性能
- transform: translateY() 計算偏移

### 7. 諮詢子頁面交互

**功能描述：**
- 步驟 timeline 展示（問題定位 → 痛點拆解 → 交付物）
- FAQ 手風琴展開/收起
- 預約 CTA 按鈕

**技術實現：**
- CSS 繪製 timeline 線條和節點
- JavaScript 控制 FAQ 展開/收起
- max-height 和 opacity 實現平滑過渡

## 響應式設計

**桌面端（≥1024px）**
- 三欄佈局（受眾卡片）
- Hero 區左右分欄
- 活動 Banner 橫向展示

**平板端（768px - 1023px）**
- 兩欄或單欄佈局
- 適當調整間距和字體大小

**移動端（<768px）**
- 單欄佈局
- 受眾卡片改為直排
- 調整按鈕和觸控區域大小

## 性能優化

- 使用 Intersection Observer 替代 scroll 事件監聽
- CSS transform 替代 position 改變
- 圖片懶加載
- 動畫使用 requestAnimationFrame
