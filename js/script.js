console.log("高考默写腳本已載入。");

// --- Global Variables ---
let poemsData = [];
let wenyanwenData = [];
let shiciquData = [];
let allPoemsMap = new Map();
let currentPoemObject = null;
let currentSelection = "";
let isMobileView = window.innerWidth <= 800; // Check initial view

// --- DOM Element References ---
const wenyanwenListElement = document.getElementById('wenyanwen-list');
const shiciquListElement = document.getElementById('shiciqu-list');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
const mobilePoemList = document.getElementById('mobile-poem-list');
const mobileNavClose = document.getElementById('mobile-nav-close');
const centerContentElement = document.getElementById('center-content');
const poemDisplayArea = document.getElementById('poem-display-area');
const placeholderTextElement = document.getElementById('placeholder-text');
const darkModeToggleButton = document.getElementById('dark-mode-toggle');
const bodyElement = document.body;
const aiInterface = document.getElementById('ai-chat-interface');
const aiCloseBtn = document.getElementById('ai-close-btn');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiInputElement = document.getElementById('ai-input'); // Textarea element
const aiMessagesElement = document.getElementById('ai-messages');
const openAiBtn = document.getElementById('open-ai-btn');

// --- Functions ---

async function loadPoems() {
    try {
        const response = await fetch('data/poems.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        poemsData = await response.json();
        //console.log("詩文數據已成功載入:", poemsData.length, "篇");

        poemsData.sort((a, b) => a.order - b.order);

        wenyanwenData = [];
        shiciquData = [];
        allPoemsMap.clear();
        poemsData.forEach(poem => {
            allPoemsMap.set(poem.order, poem);
            if (poem.category === '文言文') {
                wenyanwenData.push(poem);
            } else if (poem.category === '诗词曲') {
                shiciquData.push(poem);
            }
        });
        //console.log(`分類完成 - 文言文: ${wenyanwenData.length}, 诗词曲: ${shiciquData.length}`);

        renderNavigation(wenyanwenData, wenyanwenListElement);
        renderNavigation(shiciquData, shiciquListElement);
        renderNavigation(poemsData, mobilePoemList);

        setupNavigationListeners();
        setupScrollIndicators(document.getElementById('left-nav'));
        setupScrollIndicators(document.getElementById('right-nav'));
        setupAnswerToggleListener();

    } catch (error) {
        console.error("無法載入或處理詩文數據:", error);
        const errorMsg = '<li>加載列表失敗</li>';
        if(wenyanwenListElement) wenyanwenListElement.innerHTML = errorMsg;
        if(shiciquListElement) shiciquListElement.innerHTML = errorMsg;
        if(mobilePoemList) mobilePoemList.innerHTML = errorMsg;
        if(placeholderTextElement) placeholderTextElement.innerHTML = '<p>抱歉，無法載入詩文列表。請稍後再試。</p>';
    }
}

/**
 * Render navigation items into a specific list element.
 * Includes conditional styling based on presence of questions.
 * @param {Array} data - Array of poem objects to render.
 * @param {HTMLElement} listElement - The UL element to populate.
 */
function renderNavigation(data, listElement) {
    if (!listElement) return;
    listElement.innerHTML = '';

    if (data.length === 0) { listElement.innerHTML = '<li>暫無篇目</li>'; return; }

    const numGhibliColors = 6;
    let colorIndex = 0;

    data.forEach(poem => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.textContent = `${poem.order}. ${poem.title} - ${poem.author}`;
        button.dataset.poemOrder = poem.order;
        button.classList.add('nav-button');
        button.title = `${poem.title} - ${poem.author} (${poem.dynasty})`;

        const hasQuestions = poem.question || poem.question1;
        if (hasQuestions) {
            button.classList.add('has-questions');
            colorIndex = (colorIndex % numGhibliColors) + 1;
            button.classList.add(`has-questions-color-${colorIndex}`);
        } else {
            button.classList.add('no-questions');
        }

        listItem.appendChild(button);
        listElement.appendChild(listItem);
    });
}

function setupNavigationListeners() {
    const navContainers = [
        document.getElementById('left-nav'),
        document.getElementById('right-nav'),
        mobilePoemList
    ];
    const handleClick = (event) => {
        const button = event.target.closest('button.nav-button[data-poem-order]');
        if (button) {
            const order = parseInt(button.dataset.poemOrder, 10);
            const selectedPoem = allPoemsMap.get(order);
            if (selectedPoem) {
                displayPoemContent(selectedPoem);
                document.querySelectorAll('button.nav-button').forEach(btn => btn.classList.remove('active-poem'));
                document.querySelectorAll(`button.nav-button[data-poem-order="${order}"]`).forEach(b => b.classList.add('active-poem'));
                if (mobileNavOverlay?.classList.contains('visible')) closeMobileNav();
            }
        }
    };
    navContainers.forEach(container => { if (container) container.addEventListener('click', handleClick); });
}

function setupMobileNavToggle() {
    if (!mobileMenuToggle || !mobileNavOverlay || !mobileNavClose) return;
    mobileMenuToggle.addEventListener('click', () => {
        mobileNavOverlay.classList.add('visible');
        mobileMenuToggle.setAttribute('aria-expanded', 'true');
        mobileNavOverlay.setAttribute('aria-hidden', 'false');
        mobileNavClose.focus();
    });
    mobileNavClose.addEventListener('click', closeMobileNav);
    mobileNavOverlay.addEventListener('click', (event) => { if (event.target === mobileNavOverlay) closeMobileNav(); });
}

function closeMobileNav() {
    if (!mobileNavOverlay || !mobileMenuToggle) return;
    mobileNavOverlay.classList.remove('visible');
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
    mobileNavOverlay.setAttribute('aria-hidden', 'true');
}

function displayPoemContent(poem) {
     if (!poemDisplayArea || !placeholderTextElement || !centerContentElement) return;

     placeholderTextElement.style.display = 'none';
     poemDisplayArea.innerHTML = '';

     const poemTextContainer = document.createElement('div');
     poemTextContainer.classList.add('poem-main-text');
     poemDisplayArea.appendChild(poemTextContainer);

     const questionsContainer = document.createElement('div');
     questionsContainer.classList.add('exam-questions');

     // Render Main Text
     const titleElement = document.createElement('h1');
     titleElement.textContent = poem.title;
     poemTextContainer.appendChild(titleElement);
     const metaElement = document.createElement('p');
     metaElement.classList.add('meta');
     metaElement.textContent = `${poem.author} (${poem.dynasty})`;
     poemTextContainer.appendChild(metaElement);
     poem.paragraphs.forEach((paragraphText) => {
         const p = document.createElement('p');
         p.innerHTML = paragraphText.replace(/(\[([京Q])(\d{4})\])/g, '<span class="exam-marker" title="高考 $3 年">$1</span>');
         poemTextContainer.appendChild(p);
     });

     // Collect and Render Questions
     const questions = [];
     if (poem.question) questions.push({ q: poem.question, a: poem.reference_answer || '暂无答案', y: poem.year || '年份未知' });
     let i = 1;
     while (poem['question' + i]) {
         questions.push({ q: poem['question' + i], a: poem['reference_answer' + i] || '暂无答案', y: poem['year' + i] || '年份未知' });
         i++;
     }
     if (questions.length > 0) {
         const h2 = document.createElement('h2');
         h2.textContent = '往年真题';
         questionsContainer.appendChild(h2);
         questions.forEach((item, index) => {
             const qItem = document.createElement('div');
             qItem.className = 'question-item';
             const qText = document.createElement('p');
             qText.className = 'question-text';
             qText.innerHTML = `${index + 1}. ${item.q.replace(/\s+/g, ' ').trim()} <span class="question-year">(${item.y})</span>`;
             qText.tabIndex = 0; qText.setAttribute('role', 'button'); qText.setAttribute('aria-expanded', 'false');
             const aDiv = document.createElement('div');
             aDiv.className = 'answer'; aDiv.textContent = item.a; aDiv.style.display = 'none';
             qItem.append(qText, aDiv);
             questionsContainer.appendChild(qItem);
         });
         poemDisplayArea.appendChild(questionsContainer);
     }

     poemDisplayArea.style.display = 'block';
     centerContentElement.scrollTop = 0;
     setCurrentPoem(poem);
}

function setCurrentPoem(poem) {
    currentPoemObject = poem;
}

function setupAnswerToggleListener() {
    if (!poemDisplayArea) return;
    const handleToggle = (element) => {
         const answerDiv = element.closest('.question-item')?.querySelector('.answer');
         if (answerDiv) {
             const isHidden = answerDiv.style.display === 'none';
             answerDiv.style.display = isHidden ? 'block' : 'none';
             element.setAttribute('aria-expanded', String(isHidden));
         }
    };
    poemDisplayArea.addEventListener('click', (e) => { if (e.target.closest('.question-text')) handleToggle(e.target.closest('.question-text')); });
    poemDisplayArea.addEventListener('keydown', (e) => { if (e.target.closest('.question-text') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleToggle(e.target.closest('.question-text')); } });
}

function setupDarkMode() {
    if (!bodyElement || !darkModeToggleButton) return;
    if (localStorage.getItem('theme') === 'dark') bodyElement.classList.add('dark-mode'); else bodyElement.classList.remove('dark-mode');
    darkModeToggleButton.addEventListener('click', () => {
        bodyElement.classList.toggle('dark-mode');
        localStorage.setItem('theme', bodyElement.classList.contains('dark-mode') ? 'dark' : 'light');
    });
}

function setupScrollIndicators(navContainer) {
    if (!navContainer) return;
    const list = navContainer.querySelector('.poem-list-container'), top = navContainer.querySelector('.top'), bottom = navContainer.querySelector('.bottom');
    if (!list || !top || !bottom) return;
    const update = () => requestAnimationFrame(() => { const { scrollTop: st, scrollHeight: sh, clientHeight: ch } = list; top.classList.toggle('visible', st > 5); bottom.classList.toggle('visible', st + ch < sh - 5); });
    list.addEventListener('scroll', update, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(list); else window.addEventListener('resize', update);
    new MutationObserver(update).observe(list, { childList: true, subtree: true });
    setTimeout(update, 150);
}

/** Sets up listener for text selection */
function setupTextSelectionListener() {
    if (!centerContentElement || !openAiBtn || !aiInterface) return;
    centerContentElement.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        if (selectedText.length > 1 && selection.anchorNode && poemDisplayArea.contains(selection.anchorNode.parentElement)) {
            currentSelection = selectedText;
            console.log("Text selected:", currentSelection);
            if (!aiInterface.classList.contains('visible')) { // Auto-open only if closed
                 openAiBtn.click();
            }
        } else {
            currentSelection = "";
        }
    });
}

/** Sets up auto-resizing for the AI textarea */
function setupTextareaAutosize() {
     if (!aiInputElement || aiInputElement.tagName !== 'TEXTAREA') return;
     const adjustHeight = () => {
         aiInputElement.style.height = 'auto';
         const scrollHeight = aiInputElement.scrollHeight;
         const maxHeight = parseFloat(getComputedStyle(aiInputElement).lineHeight) * 5; // Max height approx 5 lines
         aiInputElement.style.height = Math.min(scrollHeight, maxHeight) + 'px';
         aiInputElement.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
     };
     aiInputElement.addEventListener('input', adjustHeight);
     setTimeout(adjustHeight, 0);
}

/** Updates the isMobileView flag on resize and hides/shows AI button */
function handleResize() {
    isMobileView = window.innerWidth <= 800;
    // Hide open button if chat is visible AND it's mobile view
    if(aiInterface?.classList.contains('visible') && isMobileView) {
        openAiBtn?.classList.add('hidden');
    } else {
        openAiBtn?.classList.remove('hidden'); // Show otherwise
    }
}

function setupAIChatInterface() {
     if (!aiInterface || !openAiBtn || !aiCloseBtn || !aiSendBtn || !aiInputElement || !aiMessagesElement) return;
     openAiBtn.addEventListener('click', () => {
        aiInterface.style.display = 'flex';
         requestAnimationFrame(() => { aiInterface.classList.add('visible'); });
        aiInputElement.focus();
        // Hide open button when chat is opened, if on mobile
        if (isMobileView) {
            openAiBtn.classList.add('hidden');
        }
     });
     aiCloseBtn.addEventListener('click', () => {
        aiInterface.classList.remove('visible');
        aiInterface.addEventListener('transitionend', () => { if (!aiInterface.classList.contains('visible')) aiInterface.style.display = 'none'; }, { once: true });
        // Show open button when chat is closed
        openAiBtn.classList.remove('hidden');
     });

     aiSendBtn.addEventListener('click', handleAISend);
     aiInputElement.addEventListener('keypress', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleAISend(); } });
}

/** Handles sending message to AI worker */
async function handleAISend() {
    let userQuery = aiInputElement.value.trim();
    const selectionToSend = currentSelection;
    currentSelection = "";

    if (!userQuery && !selectionToSend) return;

    if (!currentPoemObject) {
        appendAIMessage("請先選擇一篇文章，然後再提問或選中文字。", 'system error');
        aiInputElement.value = userQuery;
        return;
    }

    if (!userQuery && selectionToSend) { userQuery = `解释一下这段文字：“${selectionToSend}”`; }

    appendAIMessage(userQuery, 'user');
    if (selectionToSend) { appendAIMessage(`(针对选中文字: “${selectionToSend}”)`, 'system info'); }

    aiInputElement.value = '';
    aiInputElement.style.height = 'auto';
    aiInputElement.dispatchEvent(new Event('input'));

    appendAIMessage('窺視者思考中...', 'ai-thinking'); // Use valid class name

    const payload = { selectedText: selectionToSend, poemContext: currentPoemObject, explicitQuery: userQuery };
    await callAIWorker(payload);
    aiInputElement.focus();
}

 /** Calls the Cloudflare Worker */
 async function callAIWorker(payload) {
     // !!! IMPORTANT: Ensure this URL is correct !!!
     const WORKER_URL = "https://moxie.bdfz.net/";

     const thinkingMsg = aiMessagesElement?.querySelector('.ai-thinking');

     if (!payload.poemContext) {
         console.error("Cannot call AI without poem context (safeguard check).");
         if (thinkingMsg) thinkingMsg.remove();
         appendAIMessage("抱歉，需要先選擇一篇文章才能提問。", 'system error');
         return;
     }

     try {
         const response = await fetch(WORKER_URL, {
             method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
         });

          if (thinkingMsg) thinkingMsg.remove();

         if (!response.ok) {
             let errorText = `AI 請求失敗 (${response.status})`;
             try { errorText += `: ${(await response.json()).error || '未知服務端錯誤'}`; } catch (e) {}
             throw new Error(errorText);
         }
         const result = await response.json();
         if (result.reply) appendAIMessage(result.reply, 'ai');
         else if (result.error) appendAIMessage(`AI 返回錯誤: ${result.error}`, 'system error');
         else appendAIMessage("收到來自 AI 的未知回應格式。", 'system error');
     } catch (error) {
         console.error("Error calling AI Worker:", error);
         if (thinkingMsg) thinkingMsg.remove();
         let displayError = `無法連接到窺視者: ${error.message}`;
         if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
              displayError = "無法連接到窺視者。請檢查網絡或 Worker 地址是否正確。";
         }
         appendAIMessage(displayError, 'system error');
     }
 }

 /** Appends message to AI chat, handles line breaks */
 function appendAIMessage(message, senderClass) {
     if (!aiMessagesElement) return;
     const messageDiv = document.createElement('div');
     const validSenderClass = senderClass.replace(/\s+/g, '-').toLowerCase();
     messageDiv.classList.add('message', validSenderClass);
     message = message.replace(/\n/g, '<br>');
     messageDiv.innerHTML = message;
     aiMessagesElement.appendChild(messageDiv);
     aiMessagesElement.scrollTop = aiMessagesElement.scrollHeight;
 }

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM 已載入，開始初始化...");
    setupDarkMode();
    loadPoems();
    setupMobileNavToggle();
    setupAIChatInterface();
    setupTextSelectionListener();
    setupTextareaAutosize();
    // Listen for window resize to update mobile view flag and AI button visibility
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    console.log("初始化完成。");
});