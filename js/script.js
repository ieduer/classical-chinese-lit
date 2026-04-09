console.log('高考默写腳本已載入。');

const USER_CENTER_ORIGIN = 'https://my.bdfz.net';
const PROGRESS_STORAGE_KEY = 'mf-achievements-v2';
const PROGRESS_SITE_KEY = 'mf';
const AI_WORKER_URL = 'https://moxie.bdfz.net/';

let poemsData = [];
let wenyanwenData = [];
let shiciquData = [];
let allPoemsMap = new Map();
let currentPoemObject = null;
let currentSelection = '';
let isMobileView = window.innerWidth <= 800;
let achievementState = new Map();
let remoteProgressChecked = false;
let remoteProgressEnabled = false;

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
const aiInputElement = document.getElementById('ai-input');
const aiMessagesElement = document.getElementById('ai-messages');
const openAiBtn = document.getElementById('open-ai-btn');

const achievementSummaries = {
    wenyanwen: null,
    shiciqu: null,
    mobile: null,
};

function mountIdentity() {
    window.BdfzIdentity?.mount({ siteKey: PROGRESS_SITE_KEY });
}

function poemItemKey(poem) {
    return `poem-${poem.order}`;
}

function readStoredAchievements() {
    try {
        const parsed = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
        achievementState = new Map(Object.entries(parsed));
    } catch (error) {
        console.warn('讀取本地成就失敗，將忽略。', error);
        achievementState = new Map();
    }
}

function persistAchievements() {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(Object.fromEntries(achievementState.entries())));
}

function buildAchievementRecord(poem, synced = false) {
    return {
        order: poem.order,
        title: poem.title,
        author: poem.author,
        category: poem.category,
        updatedAt: new Date().toISOString(),
        synced,
    };
}

function isPoemAchieved(poemOrOrder) {
    const order = typeof poemOrOrder === 'number' ? poemOrOrder : poemOrOrder?.order;
    return achievementState.has(`poem-${order}`);
}

function ensureSummaryElement(container) {
    if (!container) return null;
    let summary = container.querySelector('.nav-achievement-summary');
    if (!summary) {
        summary = document.createElement('div');
        summary.className = 'nav-achievement-summary';
        const header = container.querySelector('h2');
        if (header?.nextSibling) {
            container.insertBefore(summary, header.nextSibling);
        } else {
            container.appendChild(summary);
        }
    }
    return summary;
}

function getSummarySyncText() {
    if (remoteProgressEnabled) {
        return '已同步到统一用户中心，登录后可在 my.bdfz.net 查看进度。';
    }
    if (remoteProgressChecked) {
        return '当前仅保存在本机浏览器；登录统一中心后会自动继续同步。';
    }
    return '正在检查是否可同步到统一用户中心。';
}

function renderAchievementSummaries() {
    const groups = {
        wenyanwen: wenyanwenData,
        shiciqu: shiciquData,
        mobile: poemsData,
    };

    Object.entries(achievementSummaries).forEach(([key, element]) => {
        if (!element) return;
        const source = groups[key] || [];
        const completed = source.filter((poem) => isPoemAchieved(poem)).length;
        const label = key === 'wenyanwen' ? '文言文' : key === 'shiciqu' ? '诗词曲' : '全站';
        element.innerHTML = `
            <strong>${label}已点亮 ${completed} / ${source.length}</strong>
            <span>点右侧小勋章即可标记完成，再点一次可取消。</span>
            <span class="sync-state">${getSummarySyncText()}</span>
        `;
    });
}

function updateAchievementUI(order) {
    const itemKey = `poem-${order}`;
    const record = achievementState.get(itemKey);
    const achieved = Boolean(record);
    document.querySelectorAll(`[data-poem-order="${order}"]`).forEach((element) => {
        if (element.classList.contains('nav-button')) {
            element.classList.toggle('is-achieved', achieved);
        }
        if (element.classList.contains('achievement-toggle')) {
            element.classList.toggle('is-achieved', achieved);
            element.classList.toggle('sync-pending', achieved && record?.synced === false);
            element.setAttribute('aria-pressed', String(achieved));
            element.title = achieved ? '已标记完成，再点一次取消' : '标记为已完成';
        }
    });
}

function updateAllAchievementUI() {
    poemsData.forEach((poem) => updateAchievementUI(poem.order));
    renderAchievementSummaries();
}

async function upsertRemoteProgress(poem, completed) {
    if (!remoteProgressEnabled) return;

    const payload = completed
        ? {
            siteKey: PROGRESS_SITE_KEY,
            itemKey: poemItemKey(poem),
            itemTitle: poem.title,
            itemGroup: poem.category,
            itemType: 'poem',
            state: 'done',
            score: 1,
            completed: true,
            meta: {
                order: poem.order,
                author: poem.author,
                dynasty: poem.dynasty,
            },
        }
        : {
            siteKey: PROGRESS_SITE_KEY,
            itemKey: poemItemKey(poem),
            completed: false,
        };

    const response = await fetch(`${USER_CENTER_ORIGIN}/api/progress`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (response.status === 401) {
        remoteProgressEnabled = false;
        renderAchievementSummaries();
        return;
    }

    if (!response.ok) {
        throw new Error(`同步失败 (${response.status})`);
    }
}

async function syncLocalAchievementsToRemote() {
    const pendingPoems = poemsData.filter((poem) => {
        const record = achievementState.get(poemItemKey(poem));
        return record && record.synced === false;
    });

    for (const poem of pendingPoems) {
        try {
            await upsertRemoteProgress(poem, true);
            const itemKey = poemItemKey(poem);
            const current = achievementState.get(itemKey);
            if (current) {
                achievementState.set(itemKey, { ...current, synced: true });
            }
        } catch (error) {
            console.warn('同步本地成就失败：', poem.title, error);
        }
    }

    persistAchievements();
    updateAllAchievementUI();
}

async function hydrateRemoteAchievements() {
    if (remoteProgressChecked) return;
    remoteProgressChecked = true;

    try {
        const response = await fetch(`${USER_CENTER_ORIGIN}/api/progress?site=${PROGRESS_SITE_KEY}`, {
            credentials: 'include',
        });

        if (response.status === 401) {
            remoteProgressEnabled = false;
            renderAchievementSummaries();
            return;
        }

        if (!response.ok) {
            throw new Error(`載入遠端進度失敗 (${response.status})`);
        }

        const payload = await response.json();
        const remoteItems = Array.isArray(payload.items) ? payload.items : [];
        remoteItems.forEach((item) => {
            const poem = poemsData.find((entry) => poemItemKey(entry) === item.itemKey);
            if (!poem) return;
            achievementState.set(item.itemKey, {
                order: poem.order,
                title: item.itemTitle || poem.title,
                author: poem.author,
                category: item.itemGroup || poem.category,
                updatedAt: item.updatedAt || new Date().toISOString(),
                synced: true,
            });
        });
        remoteProgressEnabled = true;
        persistAchievements();
        updateAllAchievementUI();
        await syncLocalAchievementsToRemote();
    } catch (error) {
        console.warn('讀取統一中心進度失敗，將回退為本地模式。', error);
        remoteProgressEnabled = false;
        renderAchievementSummaries();
    }
}

async function toggleAchievement(order) {
    const poem = allPoemsMap.get(order);
    if (!poem) return;

    const itemKey = poemItemKey(poem);
    if (achievementState.has(itemKey)) {
        achievementState.delete(itemKey);
        persistAchievements();
        updateAchievementUI(order);
        renderAchievementSummaries();

        try {
            await hydrateRemoteAchievements();
            if (remoteProgressEnabled) {
                await upsertRemoteProgress(poem, false);
            }
        } catch (error) {
            console.warn('取消同步远端成就失败。', error);
        }
        return;
    }

    achievementState.set(itemKey, buildAchievementRecord(poem, false));
    persistAchievements();
    updateAchievementUI(order);
    renderAchievementSummaries();

    try {
        await hydrateRemoteAchievements();
        if (remoteProgressEnabled) {
            await upsertRemoteProgress(poem, true);
            achievementState.set(itemKey, buildAchievementRecord(poem, true));
            persistAchievements();
            updateAchievementUI(order);
            renderAchievementSummaries();
        }
    } catch (error) {
        console.warn('同步远端成就失败，保留本地记录。', error);
    }
}

async function initializeAchievements() {
    readStoredAchievements();
    updateAllAchievementUI();
    await hydrateRemoteAchievements();
}

function renderNavigation(data, listElement) {
    if (!listElement) return;
    listElement.innerHTML = '';

    if (!data.length) {
        listElement.innerHTML = '<li>暫無篇目</li>';
        return;
    }

    const numGhibliColors = 6;
    let colorIndex = 0;

    data.forEach((poem) => {
        const listItem = document.createElement('li');
        const row = document.createElement('div');
        row.className = 'nav-item-row';

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

        const achievementButton = document.createElement('button');
        achievementButton.type = 'button';
        achievementButton.className = 'achievement-toggle';
        achievementButton.dataset.poemOrder = poem.order;
        achievementButton.setAttribute('aria-pressed', 'false');
        achievementButton.title = '标记为已完成';
        achievementButton.innerHTML = '<span class="achievement-mark" aria-hidden="true"></span>';

        row.append(button, achievementButton);
        listItem.appendChild(row);
        listElement.appendChild(listItem);
        updateAchievementUI(poem.order);
    });
}

function setupNavigationListeners() {
    const navContainers = [
        document.getElementById('left-nav'),
        document.getElementById('right-nav'),
        mobilePoemList,
    ];

    const handleClick = async (event) => {
        const toggle = event.target.closest('button.achievement-toggle[data-poem-order]');
        if (toggle) {
            event.preventDefault();
            event.stopPropagation();
            await toggleAchievement(parseInt(toggle.dataset.poemOrder, 10));
            return;
        }

        const button = event.target.closest('button.nav-button[data-poem-order]');
        if (!button) return;

        const order = parseInt(button.dataset.poemOrder, 10);
        const selectedPoem = allPoemsMap.get(order);
        if (!selectedPoem) return;

        displayPoemContent(selectedPoem);
        document.querySelectorAll('button.nav-button').forEach((item) => item.classList.remove('active-poem'));
        document.querySelectorAll(`button.nav-button[data-poem-order="${order}"]`).forEach((item) => item.classList.add('active-poem'));
        if (mobileNavOverlay?.classList.contains('visible')) closeMobileNav();
    };

    navContainers.forEach((container) => {
        if (container) {
            container.addEventListener('click', handleClick);
        }
    });
}

async function loadPoems() {
    try {
        const response = await fetch('data/poems.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        poemsData = await response.json();
        poemsData.sort((a, b) => a.order - b.order);

        wenyanwenData = [];
        shiciquData = [];
        allPoemsMap.clear();
        poemsData.forEach((poem) => {
            allPoemsMap.set(poem.order, poem);
            if (poem.category === '文言文') {
                wenyanwenData.push(poem);
            } else if (poem.category === '诗词曲') {
                shiciquData.push(poem);
            }
        });

        achievementSummaries.wenyanwen = ensureSummaryElement(document.getElementById('left-nav'));
        achievementSummaries.shiciqu = ensureSummaryElement(document.getElementById('right-nav'));
        achievementSummaries.mobile = ensureSummaryElement(document.querySelector('.mobile-nav-content'));

        renderNavigation(wenyanwenData, wenyanwenListElement);
        renderNavigation(shiciquData, shiciquListElement);
        renderNavigation(poemsData, mobilePoemList);

        setupNavigationListeners();
        setupScrollIndicators(document.getElementById('left-nav'));
        setupScrollIndicators(document.getElementById('right-nav'));
        setupAnswerToggleListener();
        await initializeAchievements();
    } catch (error) {
        console.error('無法載入或處理詩文數據:', error);
        const errorMsg = '<li>加載列表失敗</li>';
        if (wenyanwenListElement) wenyanwenListElement.innerHTML = errorMsg;
        if (shiciquListElement) shiciquListElement.innerHTML = errorMsg;
        if (mobilePoemList) mobilePoemList.innerHTML = errorMsg;
        if (placeholderTextElement) placeholderTextElement.innerHTML = '<p>抱歉，無法載入詩文列表。請稍後再試。</p>';
    }
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

function displayPoemContent(poem) {
    if (!poemDisplayArea || !placeholderTextElement || !centerContentElement) return;

    placeholderTextElement.style.display = 'none';
    poemDisplayArea.innerHTML = '';

    const poemTextContainer = document.createElement('div');
    poemTextContainer.classList.add('poem-main-text');
    poemDisplayArea.appendChild(poemTextContainer);

    const questionsContainer = document.createElement('div');
    questionsContainer.classList.add('exam-questions');

    const titleElement = document.createElement('h1');
    titleElement.textContent = poem.title;
    poemTextContainer.appendChild(titleElement);

    const metaElement = document.createElement('p');
    metaElement.classList.add('meta');
    metaElement.textContent = `${poem.author} (${poem.dynasty})`;
    poemTextContainer.appendChild(metaElement);

    poem.paragraphs.forEach((paragraphText) => {
        const paragraph = document.createElement('p');
        paragraph.innerHTML = paragraphText.replace(/(\[([京Q])(\d{4})\])/g, '<span class="exam-marker" title="高考 $3 年">$1</span>');
        poemTextContainer.appendChild(paragraph);
    });

    const questions = [];
    if (poem.question) {
        questions.push({ q: poem.question, a: poem.reference_answer || '暂无答案', y: poem.year || '年份未知' });
    }
    let index = 1;
    while (poem[`question${index}`]) {
        questions.push({
            q: poem[`question${index}`],
            a: poem[`reference_answer${index}`] || '暂无答案',
            y: poem[`year${index}`] || '年份未知',
        });
        index += 1;
    }

    if (questions.length) {
        const header = document.createElement('h2');
        header.textContent = '往年真题';
        questionsContainer.appendChild(header);

        questions.forEach((item, position) => {
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';
            const questionText = document.createElement('p');
            questionText.className = 'question-text';
            questionText.innerHTML = `${position + 1}. ${item.q.replace(/\s+/g, ' ').trim()} <span class="question-year">(${item.y})</span>`;
            questionText.tabIndex = 0;
            questionText.setAttribute('role', 'button');
            questionText.setAttribute('aria-expanded', 'false');
            const answerDiv = document.createElement('div');
            answerDiv.className = 'answer';
            answerDiv.textContent = item.a;
            answerDiv.style.display = 'none';
            questionItem.append(questionText, answerDiv);
            questionsContainer.appendChild(questionItem);
        });

        poemDisplayArea.appendChild(questionsContainer);
    }

    poemDisplayArea.style.display = 'block';
    centerContentElement.scrollTop = 0;
    currentPoemObject = poem;
}

function setupAnswerToggleListener() {
    if (!poemDisplayArea) return;

    const handleToggle = (element) => {
        const answerDiv = element.closest('.question-item')?.querySelector('.answer');
        if (!answerDiv) return;
        const isHidden = answerDiv.style.display === 'none';
        answerDiv.style.display = isHidden ? 'block' : 'none';
        element.setAttribute('aria-expanded', String(isHidden));
    };

    poemDisplayArea.addEventListener('click', (event) => {
        const questionText = event.target.closest('.question-text');
        if (questionText) handleToggle(questionText);
    });

    poemDisplayArea.addEventListener('keydown', (event) => {
        const questionText = event.target.closest('.question-text');
        if (questionText && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            handleToggle(questionText);
        }
    });
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
        localStorage.setItem('theme', bodyElement.classList.contains('dark-mode') ? 'dark' : 'light');
    });
}

function setupScrollIndicators(navContainer) {
    if (!navContainer) return;
    const list = navContainer.querySelector('.poem-list-container');
    const topIndicator = navContainer.querySelector('.top');
    const bottomIndicator = navContainer.querySelector('.bottom');
    if (!list || !topIndicator || !bottomIndicator) return;

    const update = () => requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = list;
        topIndicator.classList.toggle('visible', scrollTop > 5);
        bottomIndicator.classList.toggle('visible', scrollTop + clientHeight < scrollHeight - 5);
    });

    list.addEventListener('scroll', update, { passive: true });
    if ('ResizeObserver' in window) {
        new ResizeObserver(update).observe(list);
    } else {
        window.addEventListener('resize', update);
    }
    new MutationObserver(update).observe(list, { childList: true, subtree: true });
    setTimeout(update, 150);
}

function setupTextSelectionListener() {
    if (!centerContentElement || !openAiBtn || !aiInterface) return;
    centerContentElement.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim() || '';
        const anchorTarget = selection?.anchorNode?.nodeType === Node.TEXT_NODE
            ? selection.anchorNode.parentElement
            : selection?.anchorNode;
        if (selectedText.length > 1 && anchorTarget && poemDisplayArea.contains(anchorTarget)) {
            currentSelection = selectedText;
            if (!aiInterface.classList.contains('visible')) {
                openAiBtn.click();
            }
        } else {
            currentSelection = '';
        }
    });
}

function setupTextareaAutosize() {
    if (!aiInputElement || aiInputElement.tagName !== 'TEXTAREA') return;
    const adjustHeight = () => {
        aiInputElement.style.height = 'auto';
        const scrollHeight = aiInputElement.scrollHeight;
        const lineHeight = parseFloat(getComputedStyle(aiInputElement).lineHeight) || 20;
        const maxHeight = lineHeight * 5;
        aiInputElement.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        aiInputElement.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    };
    aiInputElement.addEventListener('input', adjustHeight);
    setTimeout(adjustHeight, 0);
}

function handleResize() {
    isMobileView = window.innerWidth <= 800;
    if (aiInterface?.classList.contains('visible') && isMobileView) {
        openAiBtn?.classList.add('hidden');
    } else {
        openAiBtn?.classList.remove('hidden');
    }
}

function setupAIChatInterface() {
    if (!aiInterface || !openAiBtn || !aiCloseBtn || !aiSendBtn || !aiInputElement || !aiMessagesElement) return;

    openAiBtn.addEventListener('click', () => {
        aiInterface.style.display = 'flex';
        requestAnimationFrame(() => aiInterface.classList.add('visible'));
        aiInputElement.focus();
        if (isMobileView) {
            openAiBtn.classList.add('hidden');
        }
    });

    aiCloseBtn.addEventListener('click', () => {
        aiInterface.classList.remove('visible');
        aiInterface.addEventListener('transitionend', () => {
            if (!aiInterface.classList.contains('visible')) {
                aiInterface.style.display = 'none';
            }
        }, { once: true });
        openAiBtn.classList.remove('hidden');
    });

    aiSendBtn.addEventListener('click', handleAISend);
    aiInputElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleAISend();
        }
    });
}

async function handleAISend() {
    let userQuery = aiInputElement.value.trim();
    const selectionToSend = currentSelection;
    currentSelection = '';

    if (!userQuery && !selectionToSend) return;

    if (!currentPoemObject) {
        appendAIMessage('請先選擇一篇文章，然後再提問或選中文字。', 'system error');
        aiInputElement.value = userQuery;
        return;
    }

    if (!userQuery && selectionToSend) {
        userQuery = `解释一下这段文字：“${selectionToSend}”`;
    }

    appendAIMessage(userQuery, 'user');
    if (selectionToSend) {
        appendAIMessage(`(针对选中文字: “${selectionToSend}”)`, 'system info');
    }

    aiInputElement.value = '';
    aiInputElement.style.height = 'auto';
    aiInputElement.dispatchEvent(new Event('input'));
    appendAIMessage('窺視者思考中...', 'ai-thinking');

    const payload = {
        selectedText: selectionToSend,
        poemContext: currentPoemObject,
        explicitQuery: userQuery,
    };
    await callAIWorker(payload);
    aiInputElement.focus();
}

async function callAIWorker(payload) {
    const thinkingMessage = aiMessagesElement?.querySelector('.ai-thinking');

    if (!payload.poemContext) {
        if (thinkingMessage) thinkingMessage.remove();
        appendAIMessage('抱歉，需要先選擇一篇文章才能提問。', 'system error');
        return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 25000);

    try {
        const response = await fetch(AI_WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        if (thinkingMessage) thinkingMessage.remove();

        if (!response.ok) {
            let errorText = `AI 請求失敗 (${response.status})`;
            try {
                errorText += `: ${(await response.json()).error || '未知服務端錯誤'}`;
            } catch (_) {
                // ignore malformed error payload
            }
            throw new Error(errorText);
        }

        const result = await response.json();
        if (result.reply) {
            appendAIMessage(result.reply, 'ai');
        } else if (result.error) {
            appendAIMessage(`AI 返回錯誤: ${result.error}`, 'system error');
        } else {
            appendAIMessage('收到來自 AI 的未知回應格式。', 'system error');
        }
    } catch (error) {
        if (thinkingMessage) thinkingMessage.remove();
        let displayError = `無法連接到窺視者: ${error.message}`;
        if (error.name === 'AbortError') {
            displayError = '窺視者思考太久，請再問一次或縮短問題。';
        } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            displayError = '無法連接到窺視者。請檢查網絡或 Worker 地址是否正確。';
        }
        appendAIMessage(displayError, 'system error');
    } finally {
        window.clearTimeout(timeoutId);
    }
}

function appendAIMessage(message, senderClass) {
    if (!aiMessagesElement) return;
    const messageDiv = document.createElement('div');
    const classNames = String(senderClass || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    messageDiv.classList.add('message', ...classNames);
    messageDiv.innerHTML = String(message || '').replace(/\n/g, '<br>');
    aiMessagesElement.appendChild(messageDiv);
    aiMessagesElement.scrollTop = aiMessagesElement.scrollHeight;
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM 已載入，開始初始化...');
    mountIdentity();
    setupDarkMode();
    setupMobileNavToggle();
    setupAIChatInterface();
    setupTextSelectionListener();
    setupTextareaAutosize();
    window.addEventListener('resize', handleResize);
    handleResize();
    await loadPoems();
    console.log('初始化完成。');
});
