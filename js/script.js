console.log("高考默寫腳本已載入。");

// 全局變數
let poemsData = [];
let wenyanwenData = [];
let shiciquData = [];
let allPoemsMap = new Map(); // 按 order 快速查找

// DOM 元素引用
const wenyanwenListElement = document.getElementById('wenyanwen-list');
const shiciquListElement = document.getElementById('shiciqu-list');
const centerContentElement = document.getElementById('center-content');
const poemDisplayArea = document.getElementById('poem-display-area');
const placeholderTextElement = document.getElementById('placeholder-text');

const darkModeToggleButton = document.getElementById('dark-mode-toggle');
const bodyElement = document.body;

// AI 相關 DOM
const aiInterface = document.getElementById('ai-chat-interface');
const aiCloseBtn = document.getElementById('ai-close-btn');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiInputElement = document.getElementById('ai-input');
const aiMessagesElement = document.getElementById('ai-messages');
const openAiBtn = document.getElementById('open-ai-btn');


// --- 函數定義 ---

/**
 * 異步加載並處理詩文數據
 */
async function loadPoems() {
    try {
        const response = await fetch('data/poems.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        poemsData = await response.json();
        console.log("詩文數據已成功載入:", poemsData.length, "篇");

        poemsData.sort((a, b) => a.order - b.order);

        // 分類數據並建立 Map
        wenyanwenData = [];
        shiciquData = [];
        allPoemsMap.clear(); // 清空舊數據
        poemsData.forEach(poem => {
            allPoemsMap.set(poem.order, poem); // 建立 order -> poem 的映射
            if (poem.category === '文言文') {
                wenyanwenData.push(poem);
            } else if (poem.category === '诗词曲') {
                shiciquData.push(poem);
            }
            // 可以添加其他分類或處理未分類的
        });

        console.log("文言文:", wenyanwenData.length, "篇");
        console.log("诗词曲:", shiciquData.length, "篇");

        // 渲染左右導航
        renderNavigation(wenyanwenData, wenyanwenListElement);
        renderNavigation(shiciquData, shiciquListElement);

        // 設置導航監聽器 (只需設置一次，包含兩側)
        setupNavigationListeners();

        // 初始化滾動指示器
        setupScrollIndicators(document.getElementById('left-nav'));
        setupScrollIndicators(document.getElementById('right-nav'));

    } catch (error) {
        console.error("無法載入或處理詩文數據:", error);
        if(wenyanwenListElement) wenyanwenListElement.innerHTML = '<li>加載列表失敗</li>';
        if(shiciquListElement) shiciquListElement.innerHTML = '<li>加載列表失敗</li>';
        if(placeholderTextElement) placeholderTextElement.innerHTML = '<p>抱歉，無法載入詩文列表。請稍後再試。</p>';
    }
}

/**
 * 渲染指定導航列表
 * @param {Array} data - 要渲染的詩文數據數組
 * @param {HTMLElement} listElement - 目標 UL 元素
 */
function renderNavigation(data, listElement) {
    if (!listElement) return;
    listElement.innerHTML = ''; // 清空

    if (data.length === 0) {
        listElement.innerHTML = '<li>暫無篇目</li>';
        return;
    }

    data.forEach(poem => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.textContent = `${poem.title} - ${poem.author}`; // 合併標題和作者
        button.dataset.poemOrder = poem.order;
        button.classList.add('nav-button');
        button.title = `${poem.title} - ${poem.author} (${poem.dynasty})`; // Tooltip 顯示朝代

        listItem.appendChild(button);
        listElement.appendChild(listItem);
    });
    console.log(`已渲染導航列表: ${listElement.id}`);
}

/**
 * 設置左右導航的點擊事件監聽器 (事件委託)
 */
function setupNavigationListeners() {
    const leftNav = document.getElementById('left-nav');
    const rightNav = document.getElementById('right-nav');

    const handleClick = (event) => {
        if (event.target && event.target.tagName === 'BUTTON' && event.target.dataset.poemOrder) {
            const order = parseInt(event.target.dataset.poemOrder, 10);
            const selectedPoem = allPoemsMap.get(order); // 從 Map 中快速查找

            if (selectedPoem) {
                displayPoemContent(selectedPoem);

                // 更新所有導航按鈕的激活狀態
                document.querySelectorAll('.side-nav button.nav-button').forEach(btn => {
                    btn.classList.remove('active-poem');
                });
                event.target.classList.add('active-poem'); // 激活當前點擊的按鈕
                console.log(`已選擇詩文 (Order ${order}): ${selectedPoem.title}`);
            } else {
                console.warn(`未在 Map 中找到 order 為 ${order} 的詩文。`);
            }
        }
    };

    if (leftNav) leftNav.addEventListener('click', handleClick);
    if (rightNav) rightNav.addEventListener('click', handleClick);
}

/**
 * 在中間主區域顯示選中的詩文內容
 * @param {object} poem - 選中的詩文對象
 */
function displayPoemContent(poem) {
    if (!poemDisplayArea || !placeholderTextElement) return;

    placeholderTextElement.style.display = 'none'; // 隱藏說明文字
    poemDisplayArea.innerHTML = ''; // 清空先前內容

    const titleElement = document.createElement('h1');
    titleElement.textContent = poem.title;
    poemDisplayArea.appendChild(titleElement);

    const metaElement = document.createElement('p');
    metaElement.classList.add('meta');
    metaElement.textContent = `${poem.author} (${poem.dynasty})`;
    poemDisplayArea.appendChild(metaElement);

    poem.paragraphs.forEach((paragraphText) => {
        const paragraphElement = document.createElement('p');
        paragraphElement.textContent = paragraphText;
        poemDisplayArea.appendChild(paragraphElement);
        // 注意: 段落隱藏/顯示功能將在下一階段添加
    });

    poemDisplayArea.style.display = 'block'; // 顯示詩文區域
    centerContentElement.scrollTop = 0; // 每次加載新內容時滾動到頂部
    console.log(`已顯示詩文: ${poem.title}`);
}

/**
 * 設置黑暗模式切換
 */
function setupDarkMode() {
    // 頁面加載時檢查本地存儲
    if (localStorage.getItem('theme') === 'dark') {
        bodyElement.classList.add('dark-mode');
    }

    if (darkModeToggleButton) {
        darkModeToggleButton.addEventListener('click', () => {
            bodyElement.classList.toggle('dark-mode');
            // 保存用戶偏好
            if (bodyElement.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                console.log("已切換到黑暗模式");
            } else {
                localStorage.setItem('theme', 'light');
                console.log("已切換到明亮模式");
            }
        });
    }
}

/**
 * 設置滾動指示器 (上下箭頭) 的邏輯
 * @param {HTMLElement} navContainer - 包含列表和指示器的 nav 元素
 */
 function setupScrollIndicators(navContainer) {
    if (!navContainer) return;
    const listContainer = navContainer.querySelector('.poem-list-container');
    const indicatorTop = navContainer.querySelector('.scroll-indicator.top');
    const indicatorBottom = navContainer.querySelector('.scroll-indicator.bottom');

    if (!listContainer || !indicatorTop || !indicatorBottom) return;

    const updateIndicators = () => {
         // 添加一個小的閾值，避免在邊緣時誤判
        const threshold = 5;
        const { scrollTop, scrollHeight, clientHeight } = listContainer;

        // 檢查是否可以向上滾動
        indicatorTop.classList.toggle('visible', scrollTop > threshold);

        // 檢查是否可以向下滾動
        indicatorBottom.classList.toggle('visible', scrollTop + clientHeight < scrollHeight - threshold);
    };

    // 監聽滾動事件
    listContainer.addEventListener('scroll', updateIndicators);

    // 初始檢查 + 窗口大小變化時也檢查 (使用 ResizeObserver 更佳，但 resize 兼容性好)
    // 使用 setTimeout 確保在初始渲染後再檢查
    setTimeout(updateIndicators, 100);
    window.addEventListener('resize', updateIndicators);

     // 添加 MutationObserver 監聽列表內容變化（例如異步加載完成後）
    const observer = new MutationObserver(updateIndicators);
    observer.observe(listContainer, { childList: true, subtree: true });
}


/**
 * 處理 AI 聊天界面的交互
 */
function setupAIChatInterface() {
    if (!aiInterface || !openAiBtn || !aiCloseBtn || !aiSendBtn || !aiInputElement || !aiMessagesElement) {
        console.warn("AI 界面部分元素缺失，無法完全初始化。");
        return;
    }

    // 打開 AI 窗口
    openAiBtn.addEventListener('click', () => {
        aiInterface.classList.add('visible'); // 添加 'visible' 類來觸發 CSS 過渡
        aiInterface.style.display = 'flex'; // 確保 display 屬性正確
        aiInputElement.focus();
        console.log("AI 聊天窗口已打開");
    });

    // 關閉 AI 窗口
    aiCloseBtn.addEventListener('click', () => {
        aiInterface.classList.remove('visible'); // 移除 'visible' 類
         // 在過渡動畫完成後再隱藏，避免動畫失效
        aiInterface.addEventListener('transitionend', () => {
            if (!aiInterface.classList.contains('visible')) {
                aiInterface.style.display = 'none';
            }
        }, { once: true }); // 確保監聽器只執行一次
        console.log("AI 聊天窗口已關閉");
    });

    // 發送消息
    const handleAISend = () => {
        const userQuery = aiInputElement.value.trim();
        if (!userQuery) return;

        appendAIMessage(userQuery, 'user');
        aiInputElement.value = '';
        appendAIMessage('AI 正在思考...', 'ai thinking');

        // TODO: Phase 3 - 替換為實際調用 Cloudflare Worker 的邏輯
        callAIWorkerMock(userQuery); // 使用模擬函數

        aiInputElement.focus();
    };

    aiSendBtn.addEventListener('click', handleAISend);
    aiInputElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) { // 按 Enter 發送，Shift+Enter 換行 (雖然 input 不支持)
             event.preventDefault(); // 阻止默認的 Enter 行為 (如果有的話)
            handleAISend();
        }
    });
}

/**
 * 向 AI 聊天窗口添加消息
 * @param {string} message - 消息內容
 * @param {string} sender - 'user', 'ai', 'system', 'thinking' 等CSS類名
 */
function appendAIMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender); // 添加多個類
    messageDiv.textContent = message;
    aiMessagesElement.appendChild(messageDiv);
    aiMessagesElement.scrollTop = aiMessagesElement.scrollHeight; // 自動滾動到底部
}

/**
 * 模擬調用 AI Worker (僅用於前端演示)
 * @param {string} query
 */
function callAIWorkerMock(query) {
     console.log("模擬調用 AI，問題:", query);
    setTimeout(() => {
        // 移除 "思考中..."
        const thinkingMsg = aiMessagesElement.querySelector('.thinking');
        if (thinkingMsg) thinkingMsg.remove();

        // 模擬的回應
        const aiResponse = `這是針對 "${query}" 的 Ghibli 風格模擬回答。\n真正的 AI 回答將更具體和有用。\n\n例如，我可以幫你解釋詞語、分析句子或提供背景知識。`;
        appendAIMessage(aiResponse, 'ai');
    }, 1500 + Math.random() * 1000); // 模擬網絡延遲
}

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM 已載入，開始初始化...");
    setupDarkMode();
    loadPoems(); // 加載詩文數據是核心
    setupAIChatInterface(); // 初始化 AI 界面交互
    console.log("初始化完成。");
});