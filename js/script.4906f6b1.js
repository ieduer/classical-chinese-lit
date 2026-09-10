console.log('高考默写腳本已載入。');

const USER_CENTER_ORIGIN = 'https://my.bdfz.net';
const PROGRESS_STORAGE_KEY = 'mf-achievements-v2';
const READING_MODE_STORAGE_KEY = 'mf-reading-mode-v1';
const PROGRESS_SITE_KEY = 'mf';
const AI_WORKER_URL = 'https://moxie.bdfz.net/';
const WELCOME_SEQUENCE_TARGET = 'welcome';
const WELCOME_SEQUENCE_TITLE = '并不欢迎你来';

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
let remoteProgressHydration = null;
let aiConversation = [];
let aiConversationSessionKey = '';

const wenyanwenListElement = document.getElementById('wenyanwen-list');
const shiciquListElement = document.getElementById('shiciqu-list');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
const mobilePoemList = document.getElementById('mobile-poem-list');
const mobileNavClose = document.getElementById('mobile-nav-close');
const centerContentElement = document.getElementById('center-content');
const readingScrollElement = document.getElementById('reading-scroll-region');
const poemDisplayArea = document.getElementById('poem-display-area');
const placeholderTextElement = document.getElementById('placeholder-text');
const darkModeToggleButton = document.getElementById('dark-mode-toggle');
const readingModeToggleButton = document.getElementById('reading-mode-toggle');
const sideNavigationElements = Array.from(document.querySelectorAll('.side-nav'));
const immersiveSequenceNav = document.getElementById('immersive-sequence-nav');
const immersivePreviousButton = document.getElementById('immersive-previous-poem');
const immersiveNextButton = document.getElementById('immersive-next-poem');
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

function resetAiConversationSession() {
    aiConversationSessionKey = window.BdfzIdentity?.createSessionKey?.(`${PROGRESS_SITE_KEY}-chat`) || `${PROGRESS_SITE_KEY}-chat-${Date.now().toString(36)}`;
}

function syncAiConversation(reason = 'update') {
    if (!aiConversation.length) return;
    if (!aiConversationSessionKey) resetAiConversationSession();
    window.BdfzIdentity?.recordConversation?.({
        siteKey: PROGRESS_SITE_KEY,
        sessionKey: aiConversationSessionKey,
        title: (currentPoemObject?.title || '高考默写').slice(0, 80),
        summary: aiConversation[aiConversation.length - 1]?.content?.slice(0, 120) || '默写对话',
        sourceUrl: window.location.href,
        messages: aiConversation.map((message, index) => ({
            id: String(index + 1),
            role: message.role,
            content: message.content,
        })),
        meta: {
            reason,
            poemOrder: currentPoemObject?.order || '',
        },
    }).catch(() => {});
}

function pushAiConversation(role, content, reason = 'update') {
    const normalizedRole = role === 'assistant' || role === 'system' ? role : 'user';
    const text = String(content || '').trim();
    if (!text) return;
    aiConversation.push({ role: normalizedRole, content: text });
    if (aiConversation.length > 80) {
        aiConversation = aiConversation.slice(-80);
    }
    syncAiConversation(reason);
}

function poemItemKey(poem) {
    return `poem-${poem.order}`;
}

function setReadingMode(isFocusMode, { persist = true } = {}) {
    document.documentElement.classList.toggle('is-reading-focus', isFocusMode);

    if (readingModeToggleButton) {
        const label = readingModeToggleButton.querySelector('.reading-mode-label');
        const icon = readingModeToggleButton.querySelector('.reading-mode-icon');
        readingModeToggleButton.setAttribute('aria-pressed', String(isFocusMode));
        readingModeToggleButton.setAttribute(
            'aria-label',
            isFocusMode ? '展开两侧目录' : '收起两侧目录，进入沉浸阅读',
        );
        readingModeToggleButton.title = isFocusMode ? '展开两侧目录' : '沉浸阅读';
        if (label) label.textContent = isFocusMode ? '展开目录' : '沉浸阅读';
        if (icon) icon.textContent = isFocusMode ? '☰' : '⤢';
    }

    sideNavigationElements.forEach((navigation) => {
        navigation.toggleAttribute('inert', isFocusMode);
        if (isFocusMode) {
            navigation.setAttribute('aria-hidden', 'true');
        } else {
            navigation.removeAttribute('aria-hidden');
        }
    });

    if (!persist) return;
    try {
        localStorage.setItem(READING_MODE_STORAGE_KEY, isFocusMode ? 'focus' : 'directory');
    } catch (_) {
        // The visual state remains usable when browser storage is unavailable.
    }
}

function setupReadingMode() {
    if (!readingModeToggleButton) return;
    setReadingMode(document.documentElement.classList.contains('is-reading-focus'), { persist: false });
    readingModeToggleButton.addEventListener('click', () => {
        setReadingMode(!document.documentElement.classList.contains('is-reading-focus'));
    });
}

function setSequenceButton(button, item, direction) {
    if (!button) return;
    button.hidden = !item;

    if (!item) {
        button.removeAttribute('data-sequence-target');
        button.removeAttribute('aria-label');
        const title = button.querySelector('.sequence-title');
        if (title) title.textContent = '';
        return;
    }

    button.dataset.sequenceTarget = item.target;
    button.setAttribute('aria-label', `${direction}：${item.title}`);
    const title = button.querySelector('.sequence-title');
    if (title) title.textContent = item.title;
}

function updateImmersiveSequenceNavigation(poem) {
    if (!immersiveSequenceNav) return;

    const currentIndex = poemsData.findIndex((item) => item.order === poem?.order);
    const previousItem = currentIndex > 0
        ? { target: String(poemsData[currentIndex - 1].order), title: poemsData[currentIndex - 1].title }
        : currentIndex === 0
            ? { target: WELCOME_SEQUENCE_TARGET, title: WELCOME_SEQUENCE_TITLE }
            : null;
    const nextPoem = currentIndex < 0 ? poemsData[0] : poemsData[currentIndex + 1];
    const nextItem = nextPoem
        ? { target: String(nextPoem.order), title: nextPoem.title }
        : null;

    setSequenceButton(immersivePreviousButton, previousItem, '上一篇');
    setSequenceButton(immersiveNextButton, nextItem, '下一篇');
    immersiveSequenceNav.hidden = !previousItem && !nextItem;
}

function showWelcomeScreen() {
    if (!poemDisplayArea || !placeholderTextElement) return;

    placeholderTextElement.style.display = '';
    poemDisplayArea.style.display = 'none';
    poemDisplayArea.innerHTML = '';
    if (readingScrollElement) readingScrollElement.scrollTop = 0;
    currentPoemObject = null;
    currentSelection = '';
    document.querySelectorAll('button.nav-button').forEach((item) => item.classList.remove('active-poem'));
    updateImmersiveSequenceNavigation(null);
    aiConversation = [];
    resetAiConversationSession();
}

async function selectPoem(poem) {
    if (!poem) return;

    displayPoemContent(poem);
    document.querySelectorAll('button.nav-button').forEach((item) => item.classList.remove('active-poem'));
    document.querySelectorAll(`button.nav-button[data-poem-order="${poem.order}"]`).forEach((item) => item.classList.add('active-poem'));
    if (mobileNavOverlay?.classList.contains('visible')) closeMobileNav();
    await markPoemAsRead(poem);
}

function setupImmersiveSequenceNavigation() {
    [immersivePreviousButton, immersiveNextButton].forEach((button) => {
        button?.addEventListener('click', async () => {
            const target = button.dataset.sequenceTarget || '';
            if (target === WELCOME_SEQUENCE_TARGET) {
                showWelcomeScreen();
            } else {
                const order = Number.parseInt(target, 10);
                if (!Number.isFinite(order)) return;
                await selectPoem(allPoemsMap.get(order));
            }
            if (button.hidden) {
                const fallbackButton = button === immersivePreviousButton
                    ? immersiveNextButton
                    : immersivePreviousButton;
                fallbackButton?.focus({ preventScroll: true });
            }
        });
    });
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
        if ([...achievementState.values()].some((record) => record.synced === false)) {
            return '部分阅读记录仍保存在本机；重新打开本页或再次点选篇目可重试同步。';
        }
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
            <strong>${label}已閱讀 ${completed} / ${source.length}</strong>
            <span>點擊篇目閱讀即自動標記。</span>
            <span class="sync-state">${getSummarySyncText()}</span>
        `;
    });
}

function updateAchievementUI(order) {
    const itemKey = `poem-${order}`;
    const record = achievementState.get(itemKey);
    const achieved = Boolean(record);
    document.querySelectorAll(`button.nav-button[data-poem-order="${order}"]`).forEach((element) => {
        element.classList.toggle('is-achieved', achieved);
    });
}

function updateAllAchievementUI() {
    poemsData.forEach((poem) => updateAchievementUI(poem.order));
    renderAchievementSummaries();
}

async function upsertRemoteProgress(poem, completed) {
    if (!remoteProgressEnabled) return false;

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
        console.info(JSON.stringify({ event: 'mf_progress_sync', stage: 'write', result: 'authentication_required', httpStatus: 401 }));
        renderAchievementSummaries();
        return false;
    }

    if (!response.ok) {
        throw Object.assign(new Error('同步失败'), { status: response.status });
    }
    const receipt = await response.json();
    if (receipt?.ok !== true || receipt.item?.siteKey !== PROGRESS_SITE_KEY
        || receipt.item?.itemKey !== poemItemKey(poem)) {
        throw new Error('同步回执未确认当前篇目');
    }
    return true;
}

async function syncLocalAchievementsToRemote() {
    const pendingPoems = poemsData.filter((poem) => {
        const record = achievementState.get(poemItemKey(poem));
        return record && record.synced === false;
    });

    for (const poem of pendingPoems) {
        try {
            if (!await upsertRemoteProgress(poem, true)) break;
            const itemKey = poemItemKey(poem);
            const current = achievementState.get(itemKey);
            if (current) {
                achievementState.set(itemKey, { ...current, synced: true });
            }
        } catch (error) {
            console.warn(JSON.stringify({ event: 'mf_progress_sync', stage: 'pending_write', result: 'retry_pending', httpStatus: Number.isInteger(error?.status) ? error.status : null }));
            break;
        }
    }

    persistAchievements();
    updateAllAchievementUI();
}

async function hydrateRemoteAchievements() {
    if (remoteProgressHydration) return remoteProgressHydration;
    remoteProgressHydration = loadRemoteAchievements();
    try {
        await remoteProgressHydration;
    } finally {
        remoteProgressHydration = null;
    }
}

async function loadRemoteAchievements() {
    if (remoteProgressChecked && remoteProgressEnabled) {
        await syncLocalAchievementsToRemote();
        return;
    }
    remoteProgressChecked = true;

    try {
        const session = await window.BdfzIdentity?.getSession?.();
        if (session?.authenticated !== true) {
            remoteProgressEnabled = false;
            renderAchievementSummaries();
            return;
        }
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
        if (!Array.isArray(payload.items)) throw new Error('进度回执不完整');
        const remoteItems = payload.items;
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
        console.warn(JSON.stringify({ event: 'mf_progress_sync', stage: 'hydrate', result: 'local_preserved' }));
        remoteProgressEnabled = false;
        renderAchievementSummaries();
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
        const button = event.target.closest('button.nav-button[data-poem-order]');
        if (!button) return;

        const order = parseInt(button.dataset.poemOrder, 10);
        const selectedPoem = allPoemsMap.get(order);
        if (!selectedPoem) return;

        // 點擊即標記已讀
        await selectPoem(selectedPoem);
    };

    navContainers.forEach((container) => {
        if (container) {
            container.addEventListener('click', handleClick);
        }
    });
}

// 點擊篇目自動標記已讀（不可取消，與論語模式一致）
async function markPoemAsRead(poem) {
    if (!poem) return;
    const itemKey = poemItemKey(poem);
    if (achievementState.has(itemKey)) {
        if (achievementState.get(itemKey)?.synced === false) await hydrateRemoteAchievements();
        return;
    }

    achievementState.set(itemKey, buildAchievementRecord(poem, false));
    persistAchievements();
    updateAchievementUI(poem.order);
    renderAchievementSummaries();

    try {
        await hydrateRemoteAchievements();
    } catch (error) {
        console.warn(JSON.stringify({ event: 'mf_progress_sync', stage: 'read_write', result: 'retry_pending' }));
    }
}

async function loadPoems() {
    try {
        const response = await fetch('data/poems.ad0aad72.json');
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
        updateImmersiveSequenceNavigation(null);

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

function findContextRanges(text, context) {
    const normalizedText = [];
    const indexMap = [];
    for (let i = 0; i < text.length; i += 1) {
        if (/\s/.test(text[i])) continue;
        normalizedText.push(text[i]);
        indexMap.push(i);
    }

    const normalizedContext = context.replace(/\s+/g, '');
    if (!normalizedContext) return [];

    const ranges = [];
    const normalized = normalizedText.join('');
    let index = normalized.indexOf(normalizedContext);
    while (index !== -1) {
        ranges.push({
            start: indexMap[index],
            end: indexMap[index + normalizedContext.length - 1] + 1,
        });
        index = normalized.indexOf(normalizedContext, index + normalizedContext.length);
    }
    return ranges;
}

function collectAnnotationRanges(text, annotations) {
    const ranges = [];

    annotations.forEach((annotation) => {
        const target = annotation.target || '';
        const pinyin = annotation.pinyin || '';
        const context = annotation.context || target;
        if (!target || !pinyin) return;

        const addTargetMatches = (start, end) => {
            let index = text.indexOf(target, start);
            while (index !== -1 && index + target.length <= end) {
                ranges.push({
                    start: index,
                    end: index + target.length,
                    text: target,
                    pinyin,
                    source: annotation.source || '',
                });
                index = text.indexOf(target, index + target.length);
            }
        };

        if (context && context !== target) {
            let matchedContext = false;
            findContextRanges(text, context).forEach((range) => {
                matchedContext = true;
                addTargetMatches(range.start, range.end);
            });
            if (!matchedContext && context.length > text.length) {
                addTargetMatches(0, text.length);
            }
            return;
        }

        addTargetMatches(0, text.length);
    });

    ranges.sort((a, b) => a.start - b.start || b.end - a.end);

    const nonOverlapping = [];
    let cursor = 0;
    ranges.forEach((range) => {
        if (range.start < cursor) return;
        nonOverlapping.push(range);
        cursor = range.end;
    });

    return nonOverlapping;
}

function appendTextWithExamMarkers(container, text) {
    const markerPattern = /(\[([京Q])(\d{4})\])/g;
    let lastIndex = 0;
    let match;

    while ((match = markerPattern.exec(text))) {
        if (match.index > lastIndex) {
            container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }

        const marker = document.createElement('span');
        marker.className = 'exam-marker';
        marker.title = `高考 ${match[3]} 年`;
        marker.textContent = match[1];
        container.appendChild(marker);

        lastIndex = match.index + match[1].length;
    }

    if (lastIndex < text.length) {
        container.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
}

function appendRuby(container, text, pinyin, source) {
    const ruby = document.createElement('ruby');
    ruby.className = 'inline-pinyin';
    if (source) ruby.title = source;
    ruby.appendChild(document.createTextNode(text));

    const rt = document.createElement('rt');
    rt.textContent = pinyin;
    ruby.appendChild(rt);
    container.appendChild(ruby);
}

function appendAnnotatedText(container, text, annotations = []) {
    const ranges = collectAnnotationRanges(text, annotations);
    let cursor = 0;

    ranges.forEach((range) => {
        if (range.start > cursor) {
            appendTextWithExamMarkers(container, text.slice(cursor, range.start));
        }

        appendRuby(container, range.text, range.pinyin, range.source);
        cursor = range.end;
    });

    if (cursor < text.length) {
        appendTextWithExamMarkers(container, text.slice(cursor));
    }
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
    const inlinePinyin = Array.isArray(poem.inlinePinyin) ? poem.inlinePinyin : [];

    const titleElement = document.createElement('h1');
    appendAnnotatedText(titleElement, poem.title, inlinePinyin);
    poemTextContainer.appendChild(titleElement);

    const metaElement = document.createElement('p');
    metaElement.classList.add('meta');
    metaElement.textContent = `${poem.author} (${poem.dynasty})`;
    poemTextContainer.appendChild(metaElement);

    poem.paragraphs.forEach((paragraphText) => {
        const paragraph = document.createElement('p');
        appendAnnotatedText(paragraph, paragraphText, inlinePinyin);
        poemTextContainer.appendChild(paragraph);
    });

    const questions = [];
    if (poem.question) {
        questions.push({
            q: poem.question,
            a: poem.reference_answer || '暂无答案',
            y: poem.year || '年份未知',
            origin: poem.answer_origin || '',
        });
    }
    let index = 1;
    while (poem[`question${index}`]) {
        questions.push({
            q: poem[`question${index}`],
            a: poem[`reference_answer${index}`] || '暂无答案',
            y: poem[`year${index}`] || '年份未知',
            origin: poem[`answer_origin${index}`] || '',
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
            answerDiv.textContent = item.origin ? `${item.a}\n${item.origin}（非官方答案）` : item.a;
            answerDiv.style.display = 'none';
            questionItem.append(questionText, answerDiv);
            questionsContainer.appendChild(questionItem);
        });

        poemDisplayArea.appendChild(questionsContainer);
    }

    poemDisplayArea.style.display = 'block';
    if (readingScrollElement) readingScrollElement.scrollTop = 0;
    currentPoemObject = poem;
    updateImmersiveSequenceNavigation(poem);
    aiConversation = [];
    resetAiConversationSession();
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
    pushAiConversation('user', userQuery, 'user-message');
    if (selectionToSend) {
        appendAIMessage(`(针对选中文字: “${selectionToSend}”)`, 'system info');
        pushAiConversation('system', `(针对选中文字: “${selectionToSend}”)`, 'selection');
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
        pushAiConversation('assistant', '抱歉，需要先選擇一篇文章才能提問。', 'assistant-message');
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
            pushAiConversation('assistant', result.reply, 'assistant-message');
        } else if (result.error) {
            appendAIMessage(`AI 返回錯誤: ${result.error}`, 'system error');
            pushAiConversation('assistant', `AI 返回錯誤: ${result.error}`, 'assistant-error');
        } else {
            appendAIMessage('收到來自 AI 的未知回應格式。', 'system error');
            pushAiConversation('assistant', '收到來自 AI 的未知回應格式。', 'assistant-error');
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
        pushAiConversation('assistant', displayError, 'assistant-error');
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
    resetAiConversationSession();
    setupDarkMode();
    setupReadingMode();
    setupImmersiveSequenceNavigation();
    setupMobileNavToggle();
    setupAIChatInterface();
    setupTextSelectionListener();
    setupTextareaAutosize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('focus', () => {
        if (poemsData.length) void hydrateRemoteAchievements();
    });
    handleResize();
    await loadPoems();
    console.log('初始化完成。');
});
