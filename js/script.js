console.log("高考默写腳本已載入。");

// --- Global Variables ---
let poemsData = [];
let wenyanwenData = [];
let shiciquData = [];
let allPoemsMap = new Map();
let currentPoemObject = null;
let currentSelection = "";

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
const aiInputElement = document.getElementById('ai-input'); // Should be textarea now
const aiMessagesElement = document.getElementById('ai-messages');
const openAiBtn = document.getElementById('open-ai-btn');

// --- Functions ---

async function loadPoems() {
    try {
        const response = await fetch('data/poems.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        poemsData = await response.json();
        console.log("詩文數據已成功載入:", poemsData.length, "篇");

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
        console.log(`分類完成 - 文言文: ${wenyanwenData.length}, 诗词曲: ${shiciquData.length}`);

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
    if (!listElement) {
        console.warn("Target list element not found for rendering navigation.");
        return;
    }
    listElement.innerHTML = ''; // Clear existing items

    if (data.length === 0) {
        listElement.innerHTML = '<li>暫無篇目</li>';
        return;
    }

    const numGhibliColors = 6;
    let colorIndex = 0;

    data.forEach(poem => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.textContent = `${poem.order}. ${poem.title} - ${poem.author}`;
        button.dataset.poemOrder = poem.order;
        button.classList.add('nav-button');
        button.title = `${poem.title} - ${poem.author} (${poem.dynasty})`;

        // Check for questions and add appropriate class
        const hasQuestions = poem.question || poem.question1;
        if (hasQuestions) {
            button.classList.add('has-questions');
            // Cycle through Ghibli colors
            colorIndex = (colorIndex % numGhibliColors) + 1;
            button.classList.add(`has-questions-color-${colorIndex}`);
        } else {
            button.classList.add('no-questions');
        }

        listItem.appendChild(button);
        listElement.appendChild(listItem);
    });
    console.log(`已渲染導航列表: ${listElement.id || 'Mobile List'}`);
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

                document.querySelectorAll('button.nav-button').forEach(btn => {
                    btn.classList.remove('active-poem');
                });
                document.querySelectorAll(`button.nav-button[data-poem-order="${order}"]`).forEach(b => b.classList.add('active-poem'));

                if (mobileNavOverlay && mobileNavOverlay.classList.contains('visible')) {
                    closeMobileNav();
                }
                console.log(`已選擇詩文 (Order ${order}): ${selectedPoem.title}`);
            } else {
                console.warn(`未在 Map 中找到 order 為 ${order} 的詩文。`);
            }
        }
    };

    navContainers.forEach(container => {
        if (container) container.addEventListener('click', handleClick);
    });
    console.log("導航監聽器已設置。");
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
    mobileNavOverlay.addEventListener('click', (event) => {
        if (event.target === mobileNavOverlay) closeMobileNav();
    });
}

function closeMobileNav() {
    if (!mobileNavOverlay || !mobileMenuToggle) return;
    mobileNavOverlay.classList.remove('visible');
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
    mobileNavOverlay.setAttribute('aria-hidden', 'true');
}

/**
 * Display poem content and optionally exam questions.
 * @param {object} poem - The poem object.
 */
function displayPoemContent(poem) {
    if (!poemDisplayArea || !placeholderTextElement || !centerContentElement) return;

    placeholderTextElement.style.display = 'none';
    poemDisplayArea.innerHTML = ''; // Clear previous content

    // Ensure containers exist even if empty later
    const poemTextContainer = document.createElement('div');
    poemTextContainer.classList.add('poem-main-text');
    poemDisplayArea.appendChild(poemTextContainer);

    const questionsContainer = document.createElement('div'); // Create questions container early
    questionsContainer.classList.add('exam-questions');
    // Don't append questionsContainer yet, only if questions exist

    // 1. Render Main Poem Text
    const titleElement = document.createElement('h1');
    titleElement.textContent = poem.title;
    poemTextContainer.appendChild(titleElement);

    const metaElement = document.createElement('p');
    metaElement.classList.add('meta');
    metaElement.textContent = `${poem.author} (${poem.dynasty})`;
    poemTextContainer.appendChild(metaElement);

    poem.paragraphs.forEach((paragraphText) => {
        const paragraphElement = document.createElement('p');
        const processedText = paragraphText.replace(
            /(\[([京Q])(\d{4})\])/g,
            '<span class="exam-marker" title="高考 $3 年">$1</span>'
        );
        paragraphElement.innerHTML = processedText;
        poemTextContainer.appendChild(paragraphElement);
    });


    // 2. Collect and Render Questions
    const questions = [];
    if (poem.question) {
        questions.push({ q: poem.question, a: poem.reference_answer || '暂无答案', y: poem.year || '年份未知' });
    }
    let i = 1;
    while (poem['question' + i]) {
        questions.push({ q: poem['question' + i], a: poem['reference_answer' + i] || '暂无答案', y: poem['year' + i] || '年份未知' });
        i++;
    }

    if (questions.length > 0) {
        const questionsTitle = document.createElement('h2');
        questionsTitle.textContent = '往年真题';
        questionsContainer.appendChild(questionsTitle); // Add title to container

        questions.forEach((item, index) => {
            const questionItem = document.createElement('div');
            questionItem.classList.add('question-item');

            const questionText = document.createElement('p');
            questionText.classList.add('question-text');
            const cleanQuestion = item.q.replace(/\s+/g, ' ').trim();
            questionText.innerHTML = `${index + 1}. ${cleanQuestion} <span class="question-year">(${item.y})</span>`;
            questionText.setAttribute('role', 'button');
            questionText.setAttribute('aria-expanded', 'false');
            questionText.tabIndex = 0;

            const answerDiv = document.createElement('div');
            answerDiv.classList.add('answer');
            answerDiv.textContent = item.a;
            answerDiv.style.display = 'none'; // Initially hidden

            questionItem.appendChild(questionText);
            questionItem.appendChild(answerDiv);
            questionsContainer.appendChild(questionItem); // Add item to container
        });

        poemDisplayArea.appendChild(questionsContainer); // Append the populated container
        console.log(`渲染了 ${questions.length} 道題目。`);
    }

    poemDisplayArea.style.display = 'block';
    centerContentElement.scrollTop = 0;
    setCurrentPoem(poem); // Set current poem context for AI
    console.log(`已顯示詩文及題目: ${poem.title}`);
}

/** Sets the current poem object for context */
function setCurrentPoem(poem) {
    currentPoemObject = poem;
    console.log("Current poem context set:", currentPoemObject?.title);
}

/** Sets up event listener for toggling answers visibility */
function setupAnswerToggleListener() {
    if (!poemDisplayArea) return;

    const handleToggle = (element) => {
         const questionItem = element.closest('.question-item');
         if (questionItem) {
             const answerDiv = questionItem.querySelector('.answer');
             if (answerDiv) {
                 const isHidden = answerDiv.style.display === 'none';
                 answerDiv.style.display = isHidden ? 'block' : 'none';
                 element.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
             }
         }
    };

    poemDisplayArea.addEventListener('click', (event) => {
        const questionTextElement = event.target.closest('.question-text');
        if (questionTextElement) {
            handleToggle(questionTextElement);
        }
    });

    poemDisplayArea.addEventListener('keydown', (event) => {
         const questionTextElement = event.target.closest('.question-text');
         if (questionTextElement && (event.key === 'Enter' || event.key === ' ')) {
             event.preventDefault();
             handleToggle(questionTextElement);
         }
    });
    console.log("答案顯示/隱藏監聽器已設置。");
}


function setupDarkMode() {
    if (!bodyElement || !darkModeToggleButton) return;
    if (localStorage.getItem('theme') === 'dark') {
        bodyElement.classList.add('dark-mode');
    } else {
        bodyElement.classList.remove('dark-mode');
    }
    darkModeToggleButton.addEventListener('click', () => {
        bodyElement.classList.toggle('dark-mode');
        const isDarkMode = bodyElement.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });
}

function setupScrollIndicators(navContainer) {
    if (!navContainer) return;
    const listContainer = navContainer.querySelector('.poem-list-container');
    const indicatorTop = navContainer.querySelector('.scroll-indicator.top');
    const indicatorBottom = navContainer.querySelector('.scroll-indicator.bottom');
    if (!listContainer || !indicatorTop || !indicatorBottom) return;

    const updateIndicators = () => {
        requestAnimationFrame(() => {
             const threshold = 5;
             const { scrollTop, scrollHeight, clientHeight } = listContainer;
             indicatorTop.classList.toggle('visible', scrollTop > threshold);
             indicatorBottom.classList.toggle('visible', scrollTop + clientHeight < scrollHeight - threshold);
        });
    };

    listContainer.addEventListener('scroll', updateIndicators, { passive: true });
    if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(updateIndicators);
        resizeObserver.observe(listContainer);
    } else {
        window.addEventListener('resize', updateIndicators);
    }
    const mutationObserver = new MutationObserver(updateIndicators);
    mutationObserver.observe(listContainer, { childList: true, subtree: true });
    setTimeout(updateIndicators, 150);
}

/** Sets up listener for text selection */
function setupTextSelectionListener() {
    if (!centerContentElement) return;
    centerContentElement.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        if (selectedText.length > 1 && selection.anchorNode && poemDisplayArea.contains(selection.anchorNode.parentElement)) {
            currentSelection = selectedText;
            console.log("Text selected:", currentSelection);
        } else {
            currentSelection = "";
        }
    });
    console.log("Text selection listener set up.");
}

/** Sets up auto-resizing for the AI textarea */
function setupTextareaAutosize() {
     if (!aiInputElement || aiInputElement.tagName !== 'TEXTAREA') return;
     const adjustHeight = () => {
         aiInputElement.style.height = 'auto';
         aiInputElement.style.height = (aiInputElement.scrollHeight) + 'px';
     };
     aiInputElement.addEventListener('input', adjustHeight);
     setTimeout(adjustHeight, 0);
     console.log("Textarea autosize handler set up.");
}


function setupAIChatInterface() {
     if (!aiInterface || !openAiBtn || !aiCloseBtn || !aiSendBtn || !aiInputElement || !aiMessagesElement) return;
     openAiBtn.addEventListener('click', () => {
        aiInterface.style.display = 'flex';
         requestAnimationFrame(() => { aiInterface.classList.add('visible'); });
        aiInputElement.focus();
     });
     aiCloseBtn.addEventListener('click', () => {
        aiInterface.classList.remove('visible');
        aiInterface.addEventListener('transitionend', () => {
            if (!aiInterface.classList.contains('visible')) aiInterface.style.display = 'none';
        }, { once: true });
     });

     aiSendBtn.addEventListener('click', handleAISend); // Use async handler
     aiInputElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleAISend(); }
     });
     console.log("AI 界面交互已設置。");
}

/** Handles sending message to AI worker */
async function handleAISend() { // Async function
    let userQuery = aiInputElement.value.trim();
    const selectionToSend = currentSelection;
    currentSelection = ""; // Clear selection

    if (!userQuery && !selectionToSend) return;

    if (!userQuery && selectionToSend) {
        userQuery = `解释一下这段文字：“${selectionToSend}”`;
    }

    appendAIMessage(userQuery, 'user');
    if (selectionToSend) {
        appendAIMessage(`(针对选中文字: “${selectionToSend}”)`, 'system info'); // Use a specific class
    }

    aiInputElement.style.height = 'auto'; // Reset height before clearing
    aiInputElement.value = '';

    appendAIMessage('窺視者思考中...', 'ai thinking');

    const payload = {
        selectedText: selectionToSend,
        poemContext: currentPoemObject,
        explicitQuery: userQuery
    };

    await callAIWorker(payload); // Await the worker call

    aiInputElement.focus();
}

/**
 * Calls the Cloudflare Worker to get AI response.
 * @param {object} payload - Data to send { selectedText, poemContext, explicitQuery }
 */
async function callAIWorker(payload) {
    // !!! IMPORTANT: Replace with your actual deployed Worker URL !!!
    const WORKER_URL = "https://moxie-peer.bdfz.workers.dev/"; // Replace this placeholder

    if (!payload.poemContext) {
        console.error("Cannot call AI without poem context.");
        appendAIMessage("抱歉，需要先選擇一篇文章才能提問。", 'system error'); // Use specific error class
        const thinkingMsg = aiMessagesElement?.querySelector('.thinking');
        if (thinkingMsg) thinkingMsg.remove();
        return;
    }

    // Remove thinking message before fetch starts or after it finishes/errors
    const thinkingMsg = aiMessagesElement?.querySelector('.thinking');
    if (thinkingMsg) thinkingMsg.remove();

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            let errorText = `AI 請求失敗 (${response.status})`;
            try {
                const errorJson = await response.json();
                errorText += `: ${errorJson.error || '未知服務端錯誤'}`;
            } catch (e) { /* Ignore if error body is not JSON */ }
            throw new Error(errorText);
        }

        const result = await response.json();

        if (result.reply) {
            appendAIMessage(result.reply, 'ai');
        } else if (result.error) {
            appendAIMessage(`AI 返回錯誤: ${result.error}`, 'system error');
        } else {
            appendAIMessage("收到來自 AI 的未知回應格式。", 'system error');
        }

    } catch (error) {
        console.error("Error calling AI Worker:", error);
        appendAIMessage(`無法連接到窺視者: ${error.message}`, 'system error');
    }
}


/** Appends message to AI chat, handles line breaks */
function appendAIMessage(message, sender) {
    if (!aiMessagesElement) return;
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender); // Add sender class (e.g., 'user', 'ai', 'system', 'thinking', 'error')
    // Replace newline characters with <br> tags for HTML rendering
    message = message.replace(/\n/g, '<br>');
    messageDiv.innerHTML = message; // Use innerHTML to render <br> tags
    aiMessagesElement.appendChild(messageDiv);
    aiMessagesElement.scrollTop = aiMessagesElement.scrollHeight; // Auto-scroll
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM 已載入，開始初始化...");
    setupDarkMode();
    loadPoems(); // Loads data, renders nav, sets up poem selection listeners
    setupMobileNavToggle(); // Sets up mobile menu button and overlay
    setupAIChatInterface(); // Sets up AI button, window, input, send button listeners
    setupTextSelectionListener(); // Sets up listener for text selection
    setupTextareaAutosize(); // Sets up AI input auto-resize
    // Answer toggle listener is now set up within loadPoems after initial render
    console.log("初始化完成。");
});