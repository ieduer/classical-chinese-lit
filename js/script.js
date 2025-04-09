  // 在 DOM 完全載入後執行的代碼
  document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM 已載入，準備處理詩文數據。");

    // 在這裡添加加載和顯示詩文列表的代碼 (Phase 2)
    // loadPoems();

    // 示例：AI 關閉按鈕 (如果存在)
    const aiCloseBtn = document.getElementById('ai-close-btn');
    const aiInterface = document.getElementById('ai-chat-interface');
    if (aiCloseBtn && aiInterface) {
        aiCloseBtn.addEventListener('click', () => {
            aiInterface.style.display = 'none';
        });
    }

    // 示例：未來可能會有打開 AI 界面的按鈕
    // const openAiBtn = document.getElementById('open-ai-btn'); // 假設有一個這樣的按鈕
    // if (openAiBtn && aiInterface) {
    //     openAiBtn.addEventListener('click', () => {
    //         aiInterface.style.display = 'flex'; // 使用 flex 以便內部元素佈局
    //     });
    // }
});

// 接下來的階段將在此文件中添加更多功能：
// - fetch 詩文數據
// - 渲染目錄
// - 處理目錄點擊事件
// - 渲染詩文內容
// - 實現隱藏/顯示段落
// - 處理文本選擇和 AI 交互