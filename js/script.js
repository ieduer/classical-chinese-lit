console.log("古典詩文集腳本已載入。");

// 全局變數存儲詩文數據
let poemsData = [];

// DOM 元素引用
const poemListElement = document.getElementById('poem-list');
const poemContentElement = document.getElementById('poem-content');
const aiInterface = document.getElementById('ai-chat-interface');
const aiCloseBtn = document.getElementById('ai-close-btn');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiInputElement = document.getElementById('ai-input');
const aiMessagesElement = document.getElementById('ai-messages');


// --- 函數定義 ---

/**
 * 異步加載詩文數據
 */
async function loadPoems() {
    try {
        const response = await fetch('data/poems.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        poemsData = await response.json();
        console.log("詩文數據已成功載入:", poemsData);

        // 按 order 排序 (儘管 JSON 中已有序，以防萬一)
        poemsData.sort((a, b) => a.order - b.order);

        // 渲染導航
        renderNavigation();
        // 設置導航監聽器
        setupNavigationListener();

    } catch (error) {
        console.error("無法載入詩文數據:", error);
        poemListElement.innerHTML = '<li>加載詩文列表失敗</li>';
        poemContentElement.innerHTML = '<p>抱歉，無法載入詩文內容。請檢查網絡連接或聯繫管理員。</p>';
    }
}

/**
 * 渲染左側導航目錄
 */
function renderNavigation() {
    if (!poemListElement) return; // 防禦性編程

    poemListElement.innerHTML = ''; // 清空 "載入中..."

    poemsData.forEach(poem => {
        const listItem = document.createElement('li');
        // 使用 button 可能更符合語義，因為它觸發動作而非跳轉
        const button = document.createElement('button');
        button.textContent = poem.title;
        button.dataset.poemOrder = poem.order; // 使用 data-* 屬性存儲標識符
        button.classList.add('nav-button'); // 添加樣式類 (可選)

        listItem.appendChild(button);
        poemListElement.appendChild(listItem);
    });
     console.log("導航目錄已渲染。");
}

/**
 * 設置導航點擊事件監聽器 (事件委託)
 */
function setupNavigationListener() {
    if (!poemListElement) return;

    poemListElement.addEventListener('click', (event) => {
        // 檢查點擊的是否是我們添加的按鈕
        if (event.target && event.target.tagName === 'BUTTON' && event.target.dataset.poemOrder) {
            const order = parseInt(event.target.dataset.poemOrder, 10);
            const selectedPoem = poemsData.find(p => p.order === order);

            if (selectedPoem) {
                displayPoemContent(selectedPoem);

                // 更新導航的激活狀態
                // 移除所有按鈕的 active 類
                poemListElement.querySelectorAll('button').forEach(btn => {
                    btn.classList.remove('active-poem');
                });
                // 給當前點擊的按鈕添加 active 類
                event.target.classList.add('active-poem');
                 console.log(`已選擇詩文: ${selectedPoem.title}`);
            } else {
                console.warn(`未找到 order 為 ${order} 的詩文。`);
            }
        }
    });
}

/**
 * 在右側主區域顯示選中的詩文內容
 * @param {object} poem - 選中的詩文對象
 */
function displayPoemContent(poem) {
    if (!poemContentElement) return;

    poemContentElement.innerHTML = ''; // 清空先前內容

    // 創建並添加標題
    const titleElement = document.createElement('h1');
    titleElement.textContent = poem.title;
    poemContentElement.appendChild(titleElement);

    // 創建並添加作者和朝代信息
    const metaElement = document.createElement('p');
    metaElement.classList.add('meta'); // 使用 CSS class
    metaElement.textContent = `${poem.author} (${poem.dynasty})`;
    poemContentElement.appendChild(metaElement);

    // 創建並添加段落
    poem.paragraphs.forEach((paragraphText, index) => {
        const paragraphElement = document.createElement('p');
        // 注意：直接設置 textContent 可以防止 XSS 攻擊，比 innerHTML 安全
        paragraphElement.textContent = paragraphText;
        // CSS 中的 nth-child 已經處理了背景色，無需在此添加類
        poemContentElement.appendChild(paragraphElement);
    });
     console.log(`已顯示詩文: ${poem.title}`);
}

/**
 * 處理 AI 聊天界面的開關和消息發送 (初步框架)
 */
function setupAIChatInterface() {
    if (aiCloseBtn && aiInterface) {
        aiCloseBtn.addEventListener('click', () => {
            aiInterface.style.display = 'none';
        });
    }

    // 這裡可以添加打開 AI 窗口的邏輯，例如綁定到某個一直顯示的按鈕
    // const openAiBtn = document.getElementById('open-ai-btn');
    // if (openAiBtn) {
    //    openAiBtn.addEventListener('click', () => {
    //       aiInterface.style.display = 'flex'; // 'flex' 以便內部佈局
    //       aiInputElement.focus();
    //    });
    // }


    if (aiSendBtn && aiInputElement && aiMessagesElement) {
        aiSendBtn.addEventListener('click', handleAISend);
        aiInputElement.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                handleAISend();
            }
        });
    }
}

function handleAISend() {
    const userQuery = aiInputElement.value.trim();
    if (!userQuery) return;

    // 顯示用戶消息
    appendAIMessage(userQuery, 'user');
    aiInputElement.value = '';

    // 顯示思考中...
    appendAIMessage('思考中...', 'ai thinking');

    // TODO: 在 Phase 3 中調用 Cloudflare Worker
    // callAIWorker(userQuery);
    // 暫時模擬 AI 回應
    setTimeout(() => {
        // 移除 "思考中..."
        const thinkingMsg = aiMessagesElement.querySelector('.thinking');
        if(thinkingMsg) thinkingMsg.remove();
        // 添加模擬回應
        appendAIMessage(`這是對 "${userQuery}" 的模擬回應。實際功能將在後續階段實現。`, 'ai');
    }, 1500);

    aiInputElement.focus();
}

/**
 * 向 AI 聊天窗口添加消息
 * @param {string} message - 消息內容
 * @param {string} sender - 'user', 'ai', 或 'system', 'thinking' 等
 */
function appendAIMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender); // 添加基礎 'message' 類和發送者特定類
    messageDiv.textContent = message;
    aiMessagesElement.appendChild(messageDiv);
    // 滾動到底部
    aiMessagesElement.scrollTop = aiMessagesElement.scrollHeight;
}


// --- 初始化 ---

// 在 DOM 完全載入後執行的代碼
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM 已載入，開始加載詩文。");
    loadPoems(); // 開始加載詩文數據並渲染導航
    // setupAIChatInterface(); // 設置 AI 界面交互（目前主要是關閉和模擬發送）

    // 可以在這裡添加一個按鈕來打開 AI 窗口
    // 例如，在 footer 或 header 添加一個按鈕，然後用 JS 獲取它並添加監聽器
});