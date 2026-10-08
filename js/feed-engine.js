// ==========================================================================
// NAHID TRIX — SUPER FEED ENGINE (js/feed-engine.js)
// Micro-Toast • 1-Click Code Copy • Live Polls • Telegram Rich Entities • SWR
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getFirestore, collection, getDocs, query, orderBy, limit, 
    startAfter, doc, increment, updateDoc, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ====== 1. FIREBASE CONFIGURATION ======
const firebaseConfig = {
    apiKey: "AIzaSyAsP3AubiZpmvCRPngDePdvvQMiDTELCII",
    authDomain: "apple-bot-sell.firebaseapp.com",
    projectId: "apple-bot-sell",
    storageBucket: "apple-bot-sell.firebasestorage.app",
    messagingSenderId: "84956813839",
    appId: "1:84956813839:web:5c2451f102a2291eafe17a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ====== 2. TELEGRAM WEBAPP & HAPTIC ENGINE ======
const tg = window.Telegram?.WebApp;
if (tg) {
    try {
        tg.expand();
        tg.ready();
    } catch(e) {}
}

window.triggerHaptic = function(type = 'light') {
    if (tg && tg.HapticFeedback) {
        if (type === 'success' || type === 'error') {
            tg.HapticFeedback.notificationOccurred(type);
        } else {
            tg.HapticFeedback.impactOccurred(type); 
        }
    }
};

// ====== 3. SHORT MICRO-TOAST NOTIFICATION (DYNAMIC ISLAND STYLE) ======
let alertTimer = null;
window.showAlert = function(msg, isSuccess = true, actionType = null) {
    const alertBox = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    const msgEl = document.getElementById('alertMsg');
    if (!alertBox || !msgEl || !icon) return;

    // আইকন সেটআপ
    if (msg.includes('Login')) {
        icon.className = 'fas fa-lock';
        icon.style.color = '#ff9500';
    } else if (msg.includes('Copied')) {
        icon.className = 'fas fa-link';
        icon.style.color = '#1d9bf0';
    } else if (msg.includes('Saved') || msg.includes('Bookmark')) {
        icon.className = 'fas fa-bookmark';
        icon.style.color = '#ff9500';
    } else {
        icon.className = isSuccess ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
        icon.style.color = isSuccess ? 'var(--twitter-green)' : '#f4212e';
    }

    // টেক্সট সেটআপ ও ঐচ্ছিক বাটন
    if (actionType === 'login') {
        msgEl.innerHTML = `${msg} <button class="toast-action-btn" onclick="window.location.href='auth.html'">Login</button>`;
    } else {
        msgEl.innerText = msg;
    }

    alertBox.classList.add('show');
    window.triggerHaptic(isSuccess ? 'success' : 'error');

    clearTimeout(alertTimer);
    alertTimer = setTimeout(() => {
        alertBox.classList.remove('show');
    }, 2500);
};

// Auth Guard
window.checkAuthForAction = function() {
    if (localStorage.getItem('nahidStore_isLoggedIn') !== 'true') {
        window.triggerHaptic('error');
        window.showAlert("Login Required", false, 'login');
        return false;
    }
    return true;
};

// ====== 4. USER IDENTITY & LOCAL CACHE ======
const tgUser = tg?.initDataUnsafe?.user;
let displayName = "Developer";
let userHandle = "user";
let userAvatar = "https://ui-avatars.com/api/?name=U&background=007aff&color=fff";
let userTgId = null;

if (tgUser && localStorage.getItem('nahidStore_isLoggedIn') === 'true') {
    const firstName = tgUser.first_name || "";
    const lastName = tgUser.last_name || "";
    displayName = `${firstName} ${lastName}`.trim() || "User";
    userHandle = tgUser.username ? `@${tgUser.username}` : `@id${tgUser.id}`;
    userTgId = tgUser.id;

    if (tgUser.photo_url) {
        userAvatar = tgUser.photo_url;
    } else {
        userAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=007aff&color=fff`;
    }

    const curAv = document.getElementById('currUserAvatar');
    const createTxt = document.getElementById('createPostText');
    if (curAv) curAv.src = userAvatar;
    if (createTxt) createTxt.innerText = `What's on your mind, ${firstName}?`;
}

// Compose Trigger
const composeBar = document.getElementById('composeBar');
if (composeBar) {
    composeBar.addEventListener('click', () => {
        if (window.checkAuthForAction()) {
            window.location.href = 'post.html';
        }
    });
}

// Header Hide on Scroll
const mainHeader = document.getElementById('mainHeader');
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    if (currentScrollY > lastScrollY && currentScrollY > 70) {
        mainHeader?.classList.add('hidden');
    } else {
        mainHeader?.classList.remove('hidden');
    }
    lastScrollY = currentScrollY;
}, { passive: true });

// ====== 5. SEARCH & FILTER CONTROLLER ======
const searchToggleBtn = document.getElementById('searchToggleBtn');
const searchIcon = document.getElementById('searchIcon');
const searchInputWrapper = document.getElementById('searchInputWrapper');
const searchInput = document.getElementById('searchInput');
const activeFilterBar = document.getElementById('activeFilterBar');
const filterKeyword = document.getElementById('filterKeyword');
const clearFilterBtn = document.getElementById('clearFilterBtn');

let isSearchOpen = false;
let currentSearchQuery = "";
let searchTimeout = null;

window.toggleSearch = function(forceOpen = false) {
    window.triggerHaptic('light');
    isSearchOpen = forceOpen || !isSearchOpen;
    if (isSearchOpen) {
        mainHeader?.classList.add('search-active');
        searchInputWrapper?.classList.add('active');
        searchToggleBtn?.classList.add('active');
        if (searchIcon) searchIcon.className = 'fas fa-times';
        setTimeout(() => searchInput?.focus(), 250);
    } else {
        closeSearch();
    }
};

function closeSearch() {
    mainHeader?.classList.remove('search-active');
    searchInputWrapper?.classList.remove('active');
    searchToggleBtn?.classList.remove('active');
    if (searchIcon) searchIcon.className = 'fas fa-search';
    if (searchInput) {
        searchInput.value = '';
        searchInput.blur();
    }
    isSearchOpen = false;
    if (currentSearchQuery !== "") window.clearSearchFilter();
}

searchToggleBtn?.addEventListener('click', () => window.toggleSearch(false));

searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const queryVal = e.target.value.trim().replace('#', '').toLowerCase();
        if (queryVal.length > 0) {
            currentSearchQuery = queryVal;
            if (filterKeyword) filterKeyword.innerText = queryVal;
            if (activeFilterBar) activeFilterBar.style.display = 'flex';
            if (composeBar) composeBar.style.display = 'none';
            resetAndFetchFeed();
        } else if (currentSearchQuery !== "") {
            window.clearSearchFilter();
        }
    }, 350);
});

window.clearSearchFilter = function() {
    window.triggerHaptic('light');
    currentSearchQuery = "";
    if (searchInput) searchInput.value = "";
    if (activeFilterBar) activeFilterBar.style.display = 'none';
    if (composeBar) composeBar.style.display = 'flex';

    const url = new URL(window.location);
    url.searchParams.delete('search');
    window.history.pushState({}, '', url);

    resetAndFetchFeed();
};

clearFilterBtn?.addEventListener('click', window.clearSearchFilter);

function resetAndFetchFeed() {
    const feedContainer = document.getElementById('dynamicFeed');
    if (feedContainer) feedContainer.innerHTML = '';
    lastVisibleDoc = null;
    hasMorePosts = true;
    seenPostIds.clear();
    postCounter = 0;
    currentAppIndex = 0;
    fetchPosts(true);
}

// ====== 6. SMART CONTENT PARSER (CODE BLOCKS, TG CARDS & TAGS) ======
window.copyCodeSnippet = function(btnEl) {
    window.triggerHaptic('medium');
    const codeBlock = btnEl.closest('.tweet-code-block');
    const code = codeBlock.querySelector('code').innerText;

    navigator.clipboard.writeText(code).then(() => {
        btnEl.innerHTML = '<i class="fas fa-check"></i> Copied';
        btnEl.style.color = '#38ef7d';
        setTimeout(() => {
            btnEl.innerHTML = '<i class="far fa-copy"></i> Copy';
            btnEl.style.color = '#fff';
        }, 2000);
        window.showAlert("Copied");
    });
};

function formatTweetContent(text) {
    if (!text) return "";
    let parsed = text;

    // 1. কোড ব্লক পার্সিং (```code```)
    parsed = parsed.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
        const cleanCode = codeContent.trim();
        return `
            <div class="tweet-code-block" onclick="event.stopPropagation();">
                <div class="code-header">
                    <span><i class="fas fa-terminal"></i> Source Code</span>
                    <button class="copy-code-btn" onclick="window.copyCodeSnippet(this)">
                        <i class="far fa-copy"></i> Copy
                    </button>
                </div>
                <pre class="code-content"><code>${cleanCode}</code></pre>
            </div>
        `;
    });

    // 2. টেলিগ্রাম লিংককে রিচ প্রিভিউ কার্ডে রূপান্তর
    parsed = parsed.replace(/(https?:\/\/t\.me\/([a-zA-Z0-9_]+))/g, (match, fullUrl, handle) => {
        return `
            <a href="${fullUrl}" target="_blank" class="tg-rich-card" onclick="event.stopPropagation(); window.triggerHaptic('light');">
                <div class="tg-card-left">
                    <div class="tg-card-icon"><i class="fab fa-telegram-plane"></i></div>
                    <div>
                        <div class="tg-card-title">@${handle}</div>
                        <div class="tg-card-sub">Telegram Channel / Bot</div>
                    </div>
                </div>
                <span class="tg-launch-btn">Open</span>
            </a>
        `;
    });

    // 3. সাধারণ লিংক
    parsed = parsed.replace(/(https?:\/\/(?!t\.me)[^\s<]+)/g, '<a href="$1" target="_blank" class="tweet-link" onclick="event.stopPropagation();">$1</a>');

    // 4. হ্যাশট্যাগ ও মেনশন
    parsed = parsed.replace(/#(\w+)/g, '<span class="tweet-hashtag" onclick="event.stopPropagation(); window.filterByTag(\'$1\');">#$1</span>');
    parsed = parsed.replace(/@(\w+)/g, '<span class="tweet-hashtag" style="color:var(--text-main); font-weight:700;">@$1</span>');

    return parsed;
}

window.filterByTag = function(tag) {
    window.toggleSearch(true);
    if (searchInput) searchInput.value = '#' + tag;
    currentSearchQuery = tag.toLowerCase();
    if (filterKeyword) filterKeyword.innerText = currentSearchQuery;
    if (activeFilterBar) activeFilterBar.style.display = 'flex';
    if (composeBar) composeBar.style.display = 'none';
    resetAndFetchFeed();
};

function timeShortFormat(date) {
    if (!date) return "now";
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return `${Math.floor(diff/86400)}d`;
}

// ====== 7. SPARKLE BURST ENGINE (TWITTER FX) ======
const SPARKLE_COLORS = ['#ff2d55', '#ff9500', '#00bcd4', '#af52de'];

function spawnSparkles(container) {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const sparkle = document.createElement('span');
        sparkle.className = 'like-sparkle';
        
        const angle = (i * (360 / particleCount)) * (Math.PI / 180);
        const distance = 16 + Math.random() * 8;
        
        const tx = Math.cos(angle) * distance + 'px';
        const ty = Math.sin(angle) * distance + 'px';
        
        sparkle.style.setProperty('--tx', tx);
        sparkle.style.setProperty('--ty', ty);
        sparkle.style.backgroundColor = SPARKLE_COLORS[i % SPARKLE_COLORS.length];
        
        container.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 550);
    }
}

// ====== 8. LIKE, BOOKMARK & INTERACTION CONTROLLER ======
let pendingLikes = {};
let syncTimeout = null;

// বুকমার্ক স্টোরেজ হ্যান্ডলার
function getSavedBookmarks() {
    return JSON.parse(localStorage.getItem('nahid_saved_bookmarks') || '[]');
}

window.toggleBookmark = function(postId, el) {
    if (!window.checkAuthForAction()) return;
    window.triggerHaptic('medium');

    let bookmarks = getSavedBookmarks();
    const isBookmarked = bookmarks.includes(postId);

    if (isBookmarked) {
        bookmarks = bookmarks.filter(id => id !== postId);
        el.classList.remove('bookmarked');
        el.querySelector('i').className = 'far fa-bookmark';
        window.showAlert("Removed");
    } else {
        bookmarks.push(postId);
        el.classList.add('bookmarked');
        el.querySelector('i').className = 'fas fa-bookmark';
        window.showAlert("Saved");
    }

    localStorage.setItem('nahid_saved_bookmarks', JSON.stringify(bookmarks));
};

window.toggleTweetLike = function(postId, el, authorTgId) {
    if (!window.checkAuthForAction()) return;

    const countEl = el.querySelector('.like-count') || document.getElementById('dtlLikeCount');
    const iconBox = el.querySelector('.icon-box');
    let current = parseInt(countEl?.innerText || '0') || 0;
    let change = 0;

    if (el.classList.contains('liked')) {
        el.classList.remove('liked');
        el.classList.remove('animate-sparkle');
        if (countEl) countEl.innerText = Math.max(0, current - 1);
        change = -1;
        window.triggerHaptic('light');
    } else {
        el.classList.add('liked');
        el.classList.add('animate-sparkle');
        if (countEl) countEl.innerText = current + 1;
        change = 1;
        
        window.triggerHaptic('medium');
        if (iconBox) spawnSparkles(iconBox);
        setTimeout(() => el.classList.remove('animate-sparkle'), 500);
    }

    if (postsCacheMap.has(postId)) {
        postsCacheMap.get(postId).likes = (postsCacheMap.get(postId).likes || 0) + change;
    }

    pendingLikes[postId] = (pendingLikes[postId] || 0) + change;
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(syncLikesToFirebase, 2200);
};

window.handleDoubleTap = function(postId, authorTgId, frameEl) {
    if (!window.checkAuthForAction()) return;
    window.triggerHaptic('medium');

    const postEl = document.getElementById(`post_${postId}`);
    const likeBtn = postEl ? postEl.querySelector('.like-btn-element') : null;
    const heart = frameEl.querySelector('.heart-overlay');

    if (heart) {
        heart.classList.remove('animate');
        void heart.offsetWidth;
        heart.classList.add('animate');
    }

    if (likeBtn && !likeBtn.classList.contains('liked')) {
        window.toggleTweetLike(postId, likeBtn, authorTgId);
    }
};

async function syncLikesToFirebase() {
    const batch = { ...pendingLikes };
    pendingLikes = {};
    for (const [id, val] of Object.entries(batch)) {
        if (val !== 0) {
            try {
                await updateDoc(doc(db, "posts", id), { likes: increment(val) });
            } catch(e) {}
        }
    }
}

window.triggerRepost = function(postId, el) {
    if (!window.checkAuthForAction()) return;
    window.triggerHaptic('medium');
    const countEl = el.querySelector('.repost-count') || document.getElementById('dtlRepostCount');
    let count = parseInt(countEl?.innerText || '0') || 0;

    if (el.classList.contains('reposted')) {
        el.classList.remove('reposted');
        el.classList.remove('animate-repost');
        if (countEl) countEl.innerText = Math.max(0, count - 1);
    } else {
        el.classList.add('reposted');
        el.classList.add('animate-repost');
        if (countEl) countEl.innerText = count + 1;
        window.showAlert("Reposted");
        setTimeout(() => el.classList.remove('animate-repost'), 500);
    }
};

// ====== 9. LIVE POLL VOTING ENGINE ======
window.votePollOption = function(postId, optionIndex, pollEl) {
    if (!window.checkAuthForAction()) return;
    window.triggerHaptic('medium');

    const votedKey = `nahid_poll_voted_${postId}`;
    if (localStorage.getItem(votedKey)) {
        window.showAlert("Already Voted");
        return;
    }

    localStorage.setItem(votedKey, optionIndex);
    const options = pollEl.querySelectorAll('.poll-option-row');
    
    // ডেমো ক্যালকুলেশন (পরবর্তীতে ফায়ারবেসে সিঙ্ক হবে)
    options.forEach((opt, idx) => {
        const fillBar = opt.querySelector('.poll-bar-fill');
        const percentTxt = opt.querySelector('.poll-percent');
        const isSelected = idx === optionIndex;
        const fakePercent = isSelected ? 65 : 35;

        fillBar.style.width = fakePercent + '%';
        percentTxt.innerText = fakePercent + '%';
        if (isSelected) opt.style.borderColor = 'var(--twitter-blue)';
    });

    window.showAlert("Vote Casted");
};

// ====== 10. THREAD DETAIL VIEW (FULL PAGE SPA) ======
const postsCacheMap = new Map();
let currentDetailPostData = null;
const threadModal = document.getElementById('tweetDetailView');
const dtlCloseBtn = document.getElementById('dtlCloseBtn');

dtlCloseBtn?.addEventListener('click', () => window.closeTweetDetailView());

window.openTweetDetailView = function(postId) {
    window.triggerHaptic('light');
    const data = postsCacheMap.get(postId);
    if (!data) return;

    currentDetailPostData = data;

    document.getElementById('dtlAvatar').src = data.authorAvatar || 'https://ui-avatars.com/api/?name=U&background=007aff&color=fff';
    document.getElementById('dtlName').innerText = data.authorName || 'Anonymous';
    document.getElementById('dtlHandle').innerText = data.authorHandle ? `@${data.authorHandle.replace('@','')}` : '@user';
    document.getElementById('dtlText').innerHTML = formatTweetContent(data.content || '');

    const mediaFrame = document.getElementById('dtlMediaFrame');
    const imgEl = document.getElementById('dtlImage');
    if (data.image) {
        imgEl.src = data.image;
        mediaFrame.style.display = 'block';
    } else {
        mediaFrame.style.display = 'none';
    }

    let postDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
    const timeOpts = { hour: 'numeric', minute: '2-digit', hour12: true };
    const dateOpts = { month: 'short', day: 'numeric', year: 'numeric' };
    const timeStr = `${postDate.toLocaleTimeString([], timeOpts)} · ${postDate.toLocaleDateString([], dateOpts)}`;
    document.getElementById('dtlTimestamp').innerText = `${timeStr} · ${(data.views || 120)} Views`;

    document.getElementById('dtlRepostCount').innerText = data.reposts || 0;
    document.getElementById('dtlLikeCount').innerText = data.likes || 0;
    document.getElementById('dtlCommentCount').innerText = data.comments || 0;

    const likeBtn = document.getElementById('dtlLikeBtn');
    likeBtn.onclick = () => window.toggleTweetLike(data.id, likeBtn, data.authorTgId || "");

    const repostBtn = document.getElementById('dtlRepostBtn');
    repostBtn.onclick = () => window.triggerRepost(data.id, repostBtn);

    const shareBtn = document.getElementById('dtlShareBtn');
    shareBtn.onclick = () => window.openShareOptions(data.id);

    const replyTrigger = document.getElementById('dtlReplyTriggerBtn');
    replyTrigger.onclick = () => window.focusDetailReplyInput();

    mediaFrame.onclick = () => window.openLightbox(data.image);

    loadDetailReplies(data.id);

    threadModal?.classList.add('active');
    window.history.pushState({ tweetDetailOpen: true, postId: data.id }, '');
};

window.closeTweetDetailView = function() {
    window.triggerHaptic('light');
    threadModal?.classList.remove('active');
    currentDetailPostData = null;
};

window.addEventListener('popstate', () => {
    if (threadModal?.classList.contains('active')) {
        threadModal.classList.remove('active');
    }
});

async function loadDetailReplies(postId) {
    const list = document.getElementById('dtlRepliesList');
    if (!list) return;
    list.innerHTML = `<div class="loading-replies-state"><i class="fas fa-spinner fa-spin"></i> Loading replies...</div>`;

    try {
        const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        list.innerHTML = "";

        if (snap.empty) {
            list.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:13.5px;">No replies yet. Be the first to share your thoughts!</div>`;
            return;
        }

        snap.forEach(d => {
            const c = d.data();
            let repDate = c.createdAt?.toDate ? c.createdAt.toDate() : new Date();
            list.innerHTML += `
                <div class="detail-reply-item">
                    <img src="${c.avatar || 'https://ui-avatars.com/api/?name=U'}" class="detail-reply-avatar">
                    <div class="detail-reply-body">
                        <div class="detail-reply-meta">
                            <span class="detail-reply-author">${c.name || 'User'}</span>
                            <span class="detail-reply-time">· ${timeShortFormat(repDate)}</span>
                        </div>
                        <div class="detail-reply-text">${formatTweetContent(c.text || '')}</div>
                    </div>
                </div>
            `;
        });
    } catch(e) {
        list.innerHTML = `<div style="text-align:center; color:#f4212e; padding:15px;">Failed to load replies. Check connection.</div>`;
    }
}

window.focusDetailReplyInput = function() {
    if (!window.checkAuthForAction()) return;
    document.getElementById('dtlReplyInput')?.focus();
};

const dtlSendReplyBtn = document.getElementById('dtlSendReplyBtn');
dtlSendReplyBtn?.addEventListener('click', async () => {
    if (!window.checkAuthForAction()) return;
    if (!currentDetailPostData) return;

    window.triggerHaptic('light');
    const input = document.getElementById('dtlReplyInput');
    const text = input?.value.trim();
    if (!text) return;

    const list = document.getElementById('dtlRepliesList');
    if (list?.innerText.includes("No replies yet")) list.innerHTML = "";

    list?.insertAdjacentHTML('beforeend', `
        <div class="detail-reply-item">
            <img src="${userAvatar}" class="detail-reply-avatar">
            <div class="detail-reply-body">
                <div class="detail-reply-meta">
                    <span class="detail-reply-author">${displayName}</span>
                    <span class="detail-reply-time">· now</span>
                </div>
                <div class="detail-reply-text">${formatTweetContent(text)}</div>
            </div>
        </div>
    `);

    input.value = "";
    const postId = currentDetailPostData.id;

    const cCount = document.getElementById('dtlCommentCount');
    if (cCount) cCount.innerText = parseInt(cCount.innerText || '0') + 1;
    const feedCountEl = document.querySelector(`#post_${postId} .comment-count`);
    if (feedCountEl) feedCountEl.innerText = parseInt(feedCountEl.innerText || '0') + 1;

    try {
        await addDoc(collection(db, "posts", postId, "comments"), {
            name: displayName, avatar: userAvatar, tgId: userTgId, text: text, createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, "posts", postId), { comments: increment(1) });
    } catch(e) {}
});

// ====== 11. FULLSCREEN LIGHTBOX ======
const lightbox = document.getElementById('fullscreenLightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');

window.openLightbox = function(src) {
    window.triggerHaptic('medium');
    if (lightboxImg) lightboxImg.src = src;
    lightbox?.classList.add('active');
};

function closeLightbox() {
    window.triggerHaptic('light');
    lightbox?.classList.remove('active');
}

lightbox?.addEventListener('click', closeLightbox);
lightboxCloseBtn?.addEventListener('click', closeLightbox);
lightboxImg?.addEventListener('click', (e) => e.stopPropagation());

// ====== 12. BOTTOM SHEETS & SHARING ======
const overlay = document.getElementById('sheetOverlay');
let activeSharePostId = null;

window.openSheet = function(id) {
    window.triggerHaptic('medium');
    overlay?.classList.add('active');
    document.getElementById(id)?.classList.add('active');
};

window.closeAllSheets = function() {
    overlay?.classList.remove('active');
    document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('active'));
};

overlay?.addEventListener('click', window.closeAllSheets);

window.openShareOptions = function(postId) {
    activeSharePostId = postId;
    window.openSheet('shareSheet');
};

document.getElementById('optCopyLink')?.addEventListener('click', () => {
    window.triggerHaptic('light');
    const link = `https://t.me/nahid_trix_bot/app?startapp=post_${activeSharePostId}`;
    navigator.clipboard.writeText(link);
    window.showAlert("Copied");
    window.closeAllSheets();
});

document.getElementById('optShareTelegram')?.addEventListener('click', () => {
    window.triggerHaptic('light');
    const link = `https://t.me/nahid_trix_bot/app?startapp=post_${activeSharePostId}`;
    if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Check out this post on NAHID TRIX!")}`);
    }
    window.closeAllSheets();
});

document.getElementById('optReportPost')?.addEventListener('click', () => {
    if (!window.checkAuthForAction()) return;
    window.triggerHaptic('error');
    window.showAlert("Reported");
    window.closeAllSheets();
});

// ====== 13. FEED STREAM ENGINE (ZERO FLICKER) ======
let lastVisibleDoc = null;
let isFetching = false;
let hasMorePosts = true;
let postCounter = 0;
let storeApps = [];
let currentAppIndex = 0;

const seenPostIds = new Set();
const feedContainer = document.getElementById('dynamicFeed');
const loader = document.getElementById('infiniteLoader');

async function fetchStoreApps() {
    try {
        const snap = await getDocs(query(collection(db, "apps"), orderBy("createdAt", "desc"), limit(12)));
        storeApps = [];
        snap.forEach(d => storeApps.push({ id: d.id, ...d.data() }));
        storeApps.sort(() => Math.random() - 0.5);
    } catch(e) {}
}

async function fetchPosts(isInitial = false) {
    if (isFetching || !hasMorePosts) return;
    isFetching = true;
    if (loader && !isInitial) loader.style.display = 'block';

    try {
        let fetchLimit = currentSearchQuery !== "" ? 25 : 8;
        let q;

        if (isInitial) {
            q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(fetchLimit));
        } else {
            q = query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(lastVisibleDoc), limit(fetchLimit));
        }

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            hasMorePosts = false;
            if (loader) loader.style.display = 'none';
            if (feedContainer && feedContainer.innerHTML === "") {
                feedContainer.innerHTML = `<div style="text-align: center; padding: 50px 20px; color: var(--text-muted); font-size: 14px;"><i class="fas fa-search-minus" style="font-size:24px; margin-bottom:8px;"></i><br>No posts found.</div>`;
            }
            return;
        }

        lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

        const fetched = [];
        snapshot.forEach(docSnap => {
            if (!seenPostIds.has(docSnap.id)) {
                const d = { id: docSnap.id, ...docSnap.data() };
                postsCacheMap.set(docSnap.id, d);

                if (currentSearchQuery !== "") {
                    const c = (d.content || "").toLowerCase();
                    const a = (d.authorName || "").toLowerCase();
                    if (c.includes(currentSearchQuery) || a.includes(currentSearchQuery)) {
                        seenPostIds.add(docSnap.id);
                        fetched.push(d);
                    }
                } else {
                    seenPostIds.add(docSnap.id);
                    fetched.push(d);
                }
            }
        });

        // SWR Cache Storage
        if (isInitial && currentSearchQuery === "") {
            localStorage.setItem('nahid_feed_cache', JSON.stringify(fetched));
        }

        renderTweets(fetched);
    } catch(e) {
        console.error("Feed fetch error", e);
    } finally {
        isFetching = false;
        if (loader) loader.style.display = 'none';
    }
}

function renderTweets(arr) {
    if (!feedContainer) return;
    let html = "";
    const savedBookmarks = getSavedBookmarks();

    arr.forEach(post => {
        postsCacheMap.set(post.id, post);
        postCounter++;

        // Promoted App Card every 5 posts
        if (currentSearchQuery === "" && postCounter % 5 === 0 && storeApps.length > currentAppIndex) {
            const appData = storeApps[currentAppIndex++];
            html += `
                <div class="tweet-post" style="border-left: 3px solid var(--twitter-blue);" onclick="triggerHaptic('light'); window.location.href='details.html?id=${appData.id}';">
                    <div class="tweet-left-col">
                        <img src="${appData.image || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80'}" class="tweet-author-avatar">
                    </div>
                    <div class="tweet-body-col">
                        <div class="tweet-header">
                            <div class="tweet-meta">
                                <span class="tweet-name">${appData.name}</span>
                                <i class="fas fa-certificate tweet-verified-badge" style="color:var(--twitter-green)"></i>
                                <span class="tweet-handle">@promoted</span>
                            </div>
                            <span style="font-size:11px; color:var(--text-muted);"><i class="fas fa-bolt"></i> Promoted</span>
                        </div>
                        <div style="font-size:13.5px; color:var(--text-main); margin-top:4px;">${appData.description ? appData.description.substring(0, 80) + '...' : 'Premium Telegram Mini App & Bot. Instant setup available!'}</div>
                        <a href="details.html?id=${appData.id}" class="promoted-app-card" onclick="event.stopPropagation(); triggerHaptic('light')">
                            <img src="${appData.image}" class="promoted-app-img" loading="lazy">
                            <div class="promoted-app-footer">
                                <div>
                                    <div class="promoted-title">${appData.name}</div>
                                    <div class="promoted-badge">${appData.price || 'Free'} · ${appData.network || 'Telegram'}</div>
                                </div>
                                <span class="promoted-get-btn">GET</span>
                            </div>
                        </a>
                    </div>
                </div>
            `;
        }

        let postDate = post.createdAt?.toDate ? post.createdAt.toDate() : new Date();
        const timeStr = timeShortFormat(postDate);
        const handleStr = post.authorHandle ? `@${post.authorHandle.replace('@','')}` : `@user`;
        const isBookmarked = savedBookmarks.includes(post.id);

        let mediaBlock = "";
        if (post.image) {
            mediaBlock = `
                <div class="tweet-media-frame" onclick="event.stopPropagation(); window.openTweetDetailView('${post.id}')" ondblclick="event.stopPropagation(); window.handleDoubleTap('${post.id}', '${post.authorTgId || ""}', this)">
                    <i class="fas fa-heart heart-overlay"></i>
                    <img src="${post.image}" class="tweet-media-img" loading="lazy" decoding="async">
                </div>
            `;
        }

        html += `
            <div class="tweet-post" id="post_${post.id}" onclick="window.openTweetDetailView('${post.id}')">
                <div class="tweet-left-col">
                    <img src="${post.authorAvatar || 'https://ui-avatars.com/api/?name=U&background=007aff&color=fff'}" class="tweet-author-avatar" loading="lazy" onclick="event.stopPropagation(); window.openTweetDetailView('${post.id}')">
                </div>
                <div class="tweet-body-col">
                    <div class="tweet-header">
                        <div class="tweet-meta">
                            <span class="tweet-name">${post.authorName || 'Anonymous'}</span>
                            <i class="fas fa-circle-check tweet-verified-badge"></i>
                            <span class="tweet-handle">${handleStr}</span>
                            <span class="tweet-dot"></span>
                            <span class="tweet-time">${timeStr}</span>
                        </div>
                        <i class="fas fa-ellipsis tweet-more-btn" onclick="event.stopPropagation(); window.openShareOptions('${post.id}')"></i>
                    </div>

                    <div class="tweet-content-wrapper">
                        <div class="tweet-text clamp-text">${formatTweetContent(post.content || '')}</div>
                    </div>

                    ${mediaBlock}

                    <div class="tweet-actions-row">
                        <div class="tw-action-btn reply" onclick="event.stopPropagation(); window.openTweetDetailView('${post.id}')">
                            <div class="icon-box"><i class="far fa-comment"></i></div>
                            <span class="comment-count">${post.comments || 0}</span>
                        </div>
                        <div class="tw-action-btn repost" onclick="event.stopPropagation(); window.triggerRepost('${post.id}', this)">
                            <div class="icon-box"><i class="fas fa-retweet"></i></div>
                            <span class="repost-count">${post.reposts || 0}</span>
                        </div>
                        <div class="tw-action-btn like like-btn-element" onclick="event.stopPropagation(); window.toggleTweetLike('${post.id}', this, '${post.authorTgId || ""}')">
                            <div class="icon-box"><i class="far fa-heart"></i></div>
                            <span class="like-count">${post.likes || 0}</span>
                        </div>
                        <div class="tw-action-btn bookmark ${isBookmarked ? 'bookmarked' : ''}" onclick="event.stopPropagation(); window.toggleBookmark('${post.id}', this)">
                            <div class="icon-box"><i class="${isBookmarked ? 'fas' : 'far'} fa-bookmark"></i></div>
                        </div>
                        <div class="tw-action-btn" onclick="event.stopPropagation(); window.openShareOptions('${post.id}')">
                            <div class="icon-box"><i class="far fa-paper-plane"></i></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    feedContainer.insertAdjacentHTML('beforeend', html);
}

// ====== 14. SCROLL OBSERVER & AUTO-INIT ENGINE ======
const scrollObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMorePosts && !isFetching) {
        fetchPosts(false);
    }
}, { rootMargin: '300px' });

async function init() {
    await fetchStoreApps();

    const justPosted = sessionStorage.getItem('nahid_just_posted');
    if (justPosted === 'true') {
        sessionStorage.removeItem('nahid_just_posted');
        localStorage.removeItem('nahid_feed_cache');
    }

    // Instant SWR Load (0ms Render)
    const cached = localStorage.getItem('nahid_feed_cache');
    if (cached && !justPosted) {
        try {
            renderTweets(JSON.parse(cached));
        } catch(e) {}
    }

    // Fetch fresh posts
    await fetchPosts(true);
    if (loader) scrollObserver.observe(loader);
}

// Start Engine
init();
