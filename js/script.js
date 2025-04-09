console.log("高考默寫腳本已載入。");

// --- Global Variables ---
let poemsData = [];
let wenyanwenData = [];
let shiciquData = [];
let allPoemsMap = new Map(); // order -> poem object

// --- DOM Element References ---
// Desktop Navigation
const wenyanwenListElement = document.getElementById('wenyanwen-list');
const shiciquListElement = document.getElementById('shiciqu-list');
// Mobile Navigation
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
const mobilePoemList = document.getElementById('mobile-poem-list');
const mobileNavClose = document.getElementById('mobile-nav-close');
// Content Area
const centerContentElement = document.getElementById('center-content');
const poemDisplayArea = document.getElementById('poem-display-area');
const placeholderTextElement = document.getElementById('placeholder-text');
// Dark Mode
const darkModeToggleButton = document.getElementById('dark-mode-toggle');
const bodyElement = document.body;
// AI Interface
const aiInterface = document.getElementById('ai-chat-interface');
const aiCloseBtn = document.getElementById('ai-close-btn');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiInputElement = document.getElementById('ai-input');
const aiMessagesElement = document.getElementById('ai-messages');
const openAiBtn = document.getElementById('open-ai-btn');

// --- Functions ---

/**
 * Load and process poem data from JSON.
 */
async function loadPoems() {
    try {
        const response = await fetch('data/poems.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        poemsData = await response.json();
        console.log("詩文數據已成功載入:", poemsData.length, "篇");

        poemsData.sort((a, b) => a.order - b.order);

        // Clear previous data and populate categories and map
        wenyanwenData = [];
        shiciquData = [];
        allPoemsMap.clear();
        poemsData.forEach(poem => {
            allPoemsMap.set(poem.order, poem);
            if (poem.category === '文言文') {
                wenyanwenData.push(poem);
            } else if (poem.category === '诗词曲') { // Corrected category name if needed
                shiciquData.push(poem);
            }
            // Handle other/uncategorized poems if necessary
        });
        console.log(`分類完成 - 文言文: ${wenyanwenData.length}, 诗词曲: ${shiciquData.length}`);

        // Render all navigation lists
        renderNavigation(wenyanwenData, wenyanwenListElement);
        renderNavigation(shiciquData, shiciquListElement);
        renderNavigation(poemsData, mobilePoemList); // Mobile list gets all poems

        setupNavigationListeners(); // Setup listeners for all nav areas

        // Setup scroll indicators for desktop navs
        setupScrollIndicators(document.getElementById('left-nav'));
        setupScrollIndicators(document.getElementById('right-nav'));

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

    data.forEach(poem => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        // Add number prefix using poem.order
        button.textContent = `${poem.order}. ${poem.title} - ${poem.author}`;
        button.dataset.poemOrder = poem.order;
        button.classList.add('nav-button');
        button.title = `${poem.title} - ${poem.author} (${poem.dynasty})`;

        listItem.appendChild(button);
        listElement.appendChild(listItem);
    });
    console.log(`已渲染導航列表: ${listElement.id || 'Mobile List'}`);
}

/**
 * Setup click event listeners for all navigation areas using event delegation.
 */
function setupNavigationListeners() {
    const navContainers = [
        document.getElementById('left-nav'),
        document.getElementById('right-nav'),
        mobilePoemList // Listen directly on the mobile UL
    ];

    const handleClick = (event) => {
        // Ensure the click is on a button with the correct data attribute
        const button = event.target.closest('button.nav-button[data-poem-order]');
        if (button) {
            const order = parseInt(button.dataset.poemOrder, 10);
            const selectedPoem = allPoemsMap.get(order);

            if (selectedPoem) {
                displayPoemContent(selectedPoem);

                // Update active state for all nav buttons
                document.querySelectorAll('button.nav-button').forEach(btn => {
                    btn.classList.remove('active-poem');
                });
                // Add active class to the specific button clicked (and potentially its counterpart in other lists if needed)
                // For simplicity, just highlight the one clicked for now.
                 button.classList.add('active-poem');
                 // Also highlight corresponding buttons in other lists if visible
                 document.querySelectorAll(`button.nav-button[data-poem-order="${order}"]`).forEach(b => b.classList.add('active-poem'));


                // If the click came from the mobile overlay, close it
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
        if (container) {
            container.addEventListener('click', handleClick);
        }
    });
    console.log("導航監聽器已設置。");
}

 /**
  * Setup toggle functionality for the mobile navigation overlay.
  */
 function setupMobileNavToggle() {
     if (!mobileMenuToggle || !mobileNavOverlay || !mobileNavClose) {
         console.warn("Mobile navigation elements missing, cannot setup toggle.");
         return;
     }

     mobileMenuToggle.addEventListener('click', () => {
         mobileNavOverlay.classList.add('visible');
         mobileMenuToggle.setAttribute('aria-expanded', 'true');
         mobileNavOverlay.setAttribute('aria-hidden', 'false');
         // Focus the close button or the list for accessibility
          mobileNavClose.focus();
         console.log("Mobile navigation opened.");
     });

     mobileNavClose.addEventListener('click', closeMobileNav);

     // Optional: Close overlay if clicking outside the content box
     mobileNavOverlay.addEventListener('click', (event) => {
         // Check if the click is directly on the overlay background
         if (event.target === mobileNavOverlay) {
             closeMobileNav();
         }
     });
 }

 /** Helper function to close mobile nav */
 function closeMobileNav() {
     if (!mobileNavOverlay || !mobileMenuToggle) return;
     mobileNavOverlay.classList.remove('visible');
     mobileMenuToggle.setAttribute('aria-expanded', 'false');
     mobileNavOverlay.setAttribute('aria-hidden', 'true');
     console.log("Mobile navigation closed.");
 }

/**
 * Display the selected poem content in the center area.
 * @param {object} poem - The poem object to display.
 */
function displayPoemContent(poem) {
    if (!poemDisplayArea || !placeholderTextElement || !centerContentElement) return;

    placeholderTextElement.style.display = 'none';
    poemDisplayArea.innerHTML = ''; // Clear previous content

    const titleElement = document.createElement('h1');
    titleElement.textContent = poem.title;
    poemDisplayArea.appendChild(titleElement);

    const metaElement = document.createElement('p');
    metaElement.classList.add('meta');
    metaElement.textContent = `${poem.author} (${poem.dynasty})`;
    poemDisplayArea.appendChild(metaElement);

    poem.paragraphs.forEach((paragraphText) => {
        const paragraphElement = document.createElement('p');
        // Use innerHTML to allow exam marker spans, carefully
        const processedText = paragraphText.replace(
            /(\[([京Q])(\d{4})\])/g,
            '<span class="exam-marker" title="高考 $3 年">$1</span>' // Add title for hover info
        );
        paragraphElement.innerHTML = processedText;
        poemDisplayArea.appendChild(paragraphElement);
        // Collapsible logic would go here in a later phase
    });

    poemDisplayArea.style.display = 'block';
    centerContentElement.scrollTop = 0; // Scroll to top
    console.log(`已顯示詩文: ${poem.title}`);
}

/**
 * Setup dark mode toggle functionality.
 */
function setupDarkMode() {
    if (!bodyElement || !darkModeToggleButton) return;
    // Apply theme on initial load
    if (localStorage.getItem('theme') === 'dark') {
        bodyElement.classList.add('dark-mode');
    } else {
        bodyElement.classList.remove('dark-mode'); // Ensure it's light if not set
    }

    darkModeToggleButton.addEventListener('click', () => {
        bodyElement.classList.toggle('dark-mode');
        const isDarkMode = bodyElement.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        console.log(`已切換到 ${isDarkMode ? '黑暗' : '明亮'} 模式`);
    });
}

/**
 * Setup scroll indicators for a given navigation container.
 * @param {HTMLElement} navContainer - The <nav> element.
 */
function setupScrollIndicators(navContainer) {
    if (!navContainer) return;
    const listContainer = navContainer.querySelector('.poem-list-container');
    const indicatorTop = navContainer.querySelector('.scroll-indicator.top');
    const indicatorBottom = navContainer.querySelector('.scroll-indicator.bottom');

    if (!listContainer || !indicatorTop || !indicatorBottom) return;

    const updateIndicators = () => {
        requestAnimationFrame(() => { // Use rAF for smoother updates
             const threshold = 5;
             const { scrollTop, scrollHeight, clientHeight } = listContainer;
             indicatorTop.classList.toggle('visible', scrollTop > threshold);
             indicatorBottom.classList.toggle('visible', scrollTop + clientHeight < scrollHeight - threshold);
        });
    };

    listContainer.addEventListener('scroll', updateIndicators, { passive: true }); // Use passive listener

    // Use ResizeObserver if available for better performance than window resize
    if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(updateIndicators);
        resizeObserver.observe(listContainer);
    } else {
        window.addEventListener('resize', updateIndicators);
    }

     // Use MutationObserver to detect when content is added/changed
    const mutationObserver = new MutationObserver(updateIndicators);
    mutationObserver.observe(listContainer, { childList: true, subtree: true });

    // Initial check after slight delay
    setTimeout(updateIndicators, 150);
}

/**
 * Setup AI chat interface interactions (open, close, send).
 */
function setupAIChatInterface() {
     if (!aiInterface || !openAiBtn || !aiCloseBtn || !aiSendBtn || !aiInputElement || !aiMessagesElement) {
        console.warn("AI 界面部分元素缺失，無法完全初始化。");
        return;
     }

     openAiBtn.addEventListener('click', () => {
        aiInterface.style.display = 'flex'; // Make it visible first
         requestAnimationFrame(() => { // Then trigger transition
              aiInterface.classList.add('visible');
         });
        aiInputElement.focus();
        console.log("AI 聊天窗口已打開");
     });

     aiCloseBtn.addEventListener('click', () => {
        aiInterface.classList.remove('visible');
        aiInterface.addEventListener('transitionend', () => {
            if (!aiInterface.classList.contains('visible')) {
                aiInterface.style.display = 'none';
            }
        }, { once: true });
        console.log("AI 聊天窗口已關閉");
     });

     const handleAISend = () => {
        const userQuery = aiInputElement.value.trim();
        if (!userQuery) return;
        appendAIMessage(userQuery, 'user');
        aiInputElement.value = '';
        appendAIMessage('AI 正在思考...', 'ai thinking');
        callAIWorkerMock(userQuery);
        aiInputElement.focus();
     };

     aiSendBtn.addEventListener('click', handleAISend);
     aiInputElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleAISend();
        }
     });
     console.log("AI 界面交互已設置。");
}

/**
 * Append a message to the AI chat window.
 * @param {string} message - The message text.
 * @param {string} sender - CSS class for sender ('user', 'ai', 'system', 'thinking').
 */
function appendAIMessage(message, sender) {
    if (!aiMessagesElement) return;
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    messageDiv.textContent = message; // Keep using textContent for safety
    aiMessagesElement.appendChild(messageDiv);
    aiMessagesElement.scrollTop = aiMessagesElement.scrollHeight;
}

/**
 * Mock function for AI worker call (replace in Phase 3).
 * @param {string} query - User's query.
 */
function callAIWorkerMock(query) {
    console.log("模擬調用 AI，問題:", query);
    setTimeout(() => {
        const thinkingMsg = aiMessagesElement?.querySelector('.thinking');
        if (thinkingMsg) thinkingMsg.remove();
        const aiResponse = `這是針對 "${query}" 的 Ghibli 風格模擬回答。\n請等待後續 AI 功能集成。\n我可以解釋字詞、分析句子...`;
        appendAIMessage(aiResponse, 'ai');
    }, 1200 + Math.random() * 800);
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM 已載入，開始初始化...");
    setupDarkMode();
    loadPoems(); // Load data, render navs, setup listeners
    setupMobileNavToggle(); // Setup mobile nav open/close
    setupAIChatInterface(); // Setup AI interface interactions
    console.log("初始化完成。");
});