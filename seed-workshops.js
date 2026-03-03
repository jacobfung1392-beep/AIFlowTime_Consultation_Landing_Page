/**
 * Seed script: Populate Firestore `workshops` collection with the existing
 * hardcoded workshop data from ai-beginner-workshop.html.
 *
 * Usage:
 *   1. Make sure you're logged in to Firebase CLI:  firebase login
 *   2. Run:  node seed-workshops.js
 *
 * This script uses the Firebase Admin SDK with Application Default Credentials
 * (provided by `firebase login`). It targets the "aiflowtime-hk" project.
 *
 * NOTE: Running this multiple times will overwrite existing workshop docs
 *       with the same IDs — it won't create duplicates.
 */

// Use firebase-admin from functions/ subdirectory (no need to install at root)
let admin;
try {
  admin = require("./functions/node_modules/firebase-admin");
} catch (e) {
  admin = require("firebase-admin"); // fallback if installed at root
}

// Use Application Default Credentials (from `firebase login` or GOOGLE_APPLICATION_CREDENTIALS)
admin.initializeApp({
  projectId: "aiflowtime-hk",
});

const db = admin.firestore();

const workshops = [
  {
    id: "workshop-0",
    visible: true,
    workshopNumber: "Workshop 0",
    order: 0,
    title: "Change Your Mind",
    levelBadge: "初階 Beginner - 思維整理",
    levelType: "beginner",
    duration: "課時約 1.5 小時",
    price: "",
    date: "",
    description:
      "AI 不是魔法，而是一面鏡子——你問得多深，它就答得多準。這堂課不教你任何工具，而是先教你如何「用腦」與 AI 對話。",
    details: [
      "掌握深度提問思維，讓 AI 真正理解你的需求",
      "認清 AI 的能力邊界，避免浪費時間",
      "學會三大核心技巧：Few-Shot、Context Injection、Chain of Thought",
      "突破自己的認知邊界，獲取超出專業的洞察",
      "拆解專家級 Prompt 的設計邏輯",
      "即場實戰演練，帶走屬於你的有效 Prompt",
    ],
    imageUrl: "",
    capacity: 10,
    enrolled: 0,
    ctaText: "立即預約",
    ctaLink: "/workshop-0",
  },
  {
    id: "workshop-a",
    visible: true,
    workshopNumber: "Workshop A",
    order: 1,
    title: "AI 原住民養成班 — 從陌生到自在",
    levelBadge: "AI 自我重構實驗室",
    levelType: "beginner",
    duration: "",
    price: "",
    date: "",
    description:
      "覺得 AI 永遠答非所問？仲要俾啲垃圾圖你？你不是一個人，而且這不是你的問題。大部分人從來冇人教過點樣正確使用呢啲工具。呢堂課，我哋會一齊動手試用唔同嘅 AI 工具，搵到最適合你嗰幾個，讓你帶走真正用得上的結果。",
    details: [
      "<strong>了解 AI 為什麼總是給你不想要的結果</strong> — 找出真正的原因，學會如何避免",
      "<strong>找到最適合你的 AI 工具</strong> — 不同工具擅長不同的事，學會根據你的工作需求做選擇",
      "<strong>學會 AI Native 都在用的進階 Prompting 技巧</strong> — 將 AI 從基本助手變成你的強力協作夥伴",
      "<strong>在課堂上用 AI 完成一件你真正需要做的事</strong> — 不是演示，不是模擬，是你帶得走的實際成果",
      "<strong>帶走你的個人 AI 工具箱</strong> — 你選好的工具、測試過的 Prompt、以及明天就能上手的信心",
    ],
    imageUrl: "",
    capacity: 10,
    enrolled: 0,
    ctaText: "加入等候名單",
    ctaLink: "#waitlist",
  },
  {
    id: "workshop-b",
    visible: true,
    workshopNumber: "Workshop B",
    order: 2,
    title: "時間回購術 — 用 AI 奪回你的一天",
    levelBadge: "時間奪回",
    levelType: "intermediate",
    duration: "",
    price: "",
    date: "",
    description:
      "時間是你最昂貴的資源。這個工作坊教你如何識別並擺脫「時間吸血鬼」，將低價值的重複性任務系統性地委派給 AI。",
    details: [
      "識別日常工作中最消耗精力但價值低的重複性任務",
      "掌握系統化的任務委派方法，讓 AI 成為得力助手",
      "親手打造能即時應用於工作與生活的實用 Workflow",
      "轉變工作方式，遇到重複任務第一時間想到自動化",
      "根據實際需求建立個人化的 AI 應用組合",
      "透過每日小練習鞏固所學，養成持續優化的習慣",
    ],
    imageUrl: "",
    capacity: 10,
    enrolled: 0,
    ctaText: "加入等候名單",
    ctaLink: "#waitlist",
  },
  {
    id: "workshop-c",
    visible: true,
    workshopNumber: "Workshop C",
    order: 3,
    title: "下一級視覺 — 用 AI 打造商業級圖像",
    levelBadge: "中階 Intermediate",
    levelType: "intermediate",
    duration: "",
    price: "",
    date: "",
    description:
      "學懂用 AI 工具快速生成符合品牌風格的商業圖像與短片，再配合簡單的後製技巧，輸出可直接用於社交媒體、網站及宣傳素材的專業視覺內容。",
    details: [
      "認識最實用的 AI 圖像及影片生成工具，減少來來回回改稿的時間成本",
      "調整風格參數、統一視覺語調，生成符合品牌調性的商業級素材",
      "掌握 AI 生成後的簡易修圖及剪輯技巧，由構思到成品一小時內完成",
    ],
    imageUrl: "",
    capacity: 10,
    enrolled: 0,
    ctaText: "加入等候名單",
    ctaLink: "#waitlist",
  },
  {
    id: "workshop-d",
    visible: true,
    workshopNumber: "Workshop D",
    order: 4,
    title: "AI × 自我突破 — 用科技推動個人成長",
    levelBadge: "初階至中階",
    levelType: "beginner",
    duration: "",
    price: "",
    date: "",
    description:
      "這個工作坊不談技術，只談成長。你會學到七種獨特的方法，運用AI進行自我探索、整理思緒，並為自己制定真正可行的改變計劃。無需任何程式背景，只需要一顆想要變得更好的心。",
    details: [
      "建立結構化的學習路徑，每一步都看得見成果",
      "運用AI拆解書籍核心概念，針對你的處境提出適用的見解",
      "透過對話式提問發現思維慣性中的限制",
      "從願景到具體步驟，把模糊的「想要」轉化為清晰的「做到」",
      "學會與AI建立有溫度的對話關係，成為你的思考夥伴",
    ],
    imageUrl: "",
    capacity: 10,
    enrolled: 0,
    ctaText: "加入等候名單",
    ctaLink: "#waitlist",
  },
];

async function seed() {
  console.log("Seeding workshops to Firestore (project: aiflowtime-hk)...\n");

  for (const ws of workshops) {
    const { id, ...data } = ws;
    data.createdAt = admin.firestore.FieldValue.serverTimestamp();
    data.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection("workshops").doc(id).set(data, { merge: true });
    console.log(`  ✓ ${id} — ${data.title}`);
  }

  console.log("\nDone! " + workshops.length + " workshops seeded.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
