// ===== ИМПОРТЫ =====
import { API_BASE_URL } from './api/config.js';
import {
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
    fetchCommentsByPost,
    createComment,
    updateComment,
    deleteComment
} from './api/apiService.js';
import {
    saveDraft,
    getDraft,
    clearDraft,
    getOfflineQueue,
    addToOfflineQueue,
    removeFromOfflineQueue,
    cachePosts,
    getCachedPosts,
    saveProfile,
    getProfile
} from './storage/localStorage.js';
import { parsePost, parseComment, getPostLikes, setPostLikes, toggleLike as toggleLikeUtil } from './utils/dataParser.js';

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let userProfile = getProfile();               // загружаем профиль из localStorage
let posts = [];                               // массив постов (локальная копия)
let currentPostPage = 0;
const POSTS_PER_PAGE = 3;
let isLoading = false;
let hasMore = true;
let scrollHandlerActive = false;
let feedContainer, loaderElement, createPostBtn;
let currentPostForComments = null;
let currentSort = 'date-desc';                // date-desc, date-asc, title-asc, title-desc
let searchQuery = '';
let isEditingPost = false;
let editingPostId = null;

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ===== API И КЭШ =====
async function loadPostsFromAPI() {
    const cached = getCachedPosts();
    if (cached && cached.length) {
        // Убедимся, что у каждого поста есть поле pending
        posts = cached.map(p => ({ ...p, pending: p.pending !== undefined ? p.pending : false }));
        await refreshFeed();
    } else {
        posts = [];
    }
    try {
        const apiPosts = await fetchPosts();
        const newPosts = apiPosts.map(apiPost => ({
            id: apiPost.id,
            author: `Пользователь ${apiPost.userId}`,
            date: new Date().toISOString(),
            content: apiPost.body,
            likes: getPostLikes(apiPost.id),
            liked: false,
            comments: [],
            pending: false
        }));
        const MAX_REAL_ID = 100;
        const localOnly = posts.filter(p => p.id > MAX_REAL_ID);
        posts = [...newPosts, ...localOnly];
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        cachePosts(posts);
        await refreshFeed();
    } catch (error) {
        console.error('Ошибка загрузки из API, используем только кэш:', error);
        if (!cached) throw new Error('Нет данных');
    }
    return posts;
}

async function loadCommentsForPost(postId) {
    try {
        const apiComments = await fetchCommentsByPost(postId);
        const parsed = apiComments.map(parseComment);
        const post = posts.find(p => p.id === postId);
        if (post) post.comments = parsed;
        return parsed;
    } catch (error) {
        console.error(`Ошибка загрузки комментариев для поста ${postId}:`, error);
        return [];
    }
}

async function syncPostToAPI(postData, method = 'POST', id = null) {
    try {
        let result;
        if (method === 'POST') {
            result = await createPost(postData);
        } else if (method === 'PUT') {
            result = await updatePost(id, postData);
        } else if (method === 'DELETE') {
            await deletePost(id);
            return true;
        }
        return result;
    } catch (error) {
        console.error(`Ошибка синхронизации:`, error);
        addToOfflineQueue({ method, data: postData, id });
        throw error;
    }
}

async function processOfflineQueue() {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;
    console.log('Очередь элементов:', queue);
    let needRefresh = false;

    for (const item of queue) {
        console.log('Обработка элемента:', item);
        try {
            const { method, data, originalId, id, postId, type } = item.data;

            if (method === 'POST') {
                if (postId) {
                    // Комментарий
                    const result = await createComment(data);
                    let post = posts.find(p => p.id === postId);
                    if (!post && postId > 100) {
                        console.warn('Пост для комментария не найден, создаём фиктивный пост');
                        post = {
                            id: postId,
                            author: 'Восстановленный пользователь',
                            date: new Date().toISOString(),
                            content: 'Восстановленный пост',
                            likes: 0,
                            liked: false,
                            comments: [],
                            pending: false
                        };
                        posts.unshift(post);
                    }
                    if (post) {
                        const commentIndex = post.comments.findIndex(c => c.id === originalId);
                        if (commentIndex !== -1) {
                            post.comments[commentIndex].id = result.id;
                            post.comments[commentIndex].pending = false;
                        } else {
                            post.comments.push({
                                id: result.id,
                                author: data.name,
                                text: result.body,
                                date: new Date().toISOString(),
                                pending: false
                            });
                        }
                        cachePosts(posts);
                        needRefresh = true;
                    }
                } else {
                    // Пост
                    const result = await createPost(data);
                    let localPost = posts.find(p => p.id === originalId);
                    if (!localPost) {
                        console.warn('Локальный пост не найден, создаём новый из данных очереди');
                        localPost = {
                            id: result.id,
                            author: userProfile.name,
                            date: new Date().toISOString(),
                            content: result.body,
                            likes: 0,
                            liked: false,
                            comments: [],
                            pending: false
                        };
                        posts.unshift(localPost);
                    } else {
                        localPost.id = result.id;
                        localPost.content = result.body;
                        localPost.pending = false;
                    }
                    cachePosts(posts);
                    needRefresh = true;
                }
                removeFromOfflineQueue(item.id);
            }
            else if (method === 'PUT') {
                if (type === 'comment') {
                    await updateComment(id, data);
                    for (const post of posts) {
                        const comment = post.comments.find(c => c.id === id);
                        if (comment) {
                            comment.pending = false;
                            cachePosts(posts);
                            needRefresh = true;
                            break;
                        }
                    }
                } else {
                    await updatePost(id, data);
                    let localPost = posts.find(p => p.id === id);
                    if (!localPost && id > 100) {
                        localPost = {
                            id: id,
                            author: userProfile.name,
                            date: new Date().toISOString(),
                            content: data.body,
                            likes: 0,
                            liked: false,
                            comments: [],
                            pending: false
                        };
                        posts.unshift(localPost);
                    } else if (localPost) {
                        localPost.pending = false;
                    }
                    cachePosts(posts);
                    needRefresh = true;
                }
                removeFromOfflineQueue(item.id);
            }
            else if (method === 'DELETE') {
                if (type === 'comment') {
                    await deleteComment(id);
                    for (const post of posts) {
                        const index = post.comments.findIndex(c => c.id === id);
                        if (index !== -1) {
                            post.comments.splice(index, 1);
                            cachePosts(posts);
                            needRefresh = true;
                            break;
                        }
                    }
                } else {
                    await deletePost(id);
                    const index = posts.findIndex(p => p.id === id);
                    if (index !== -1) {
                        posts.splice(index, 1);
                        cachePosts(posts);
                        needRefresh = true;
                    }
                }
                removeFromOfflineQueue(item.id);
            }
        } catch (e) {
            console.error('Ошибка при обработке элемента очереди:', e);
        }
    }

    if (needRefresh) {
        await refreshFeed();
        if (currentPostForComments) {
            renderCommentsInModal(currentPostForComments);
        }
    } else {
        console.log('Нет изменений, лента не обновлена');
    }
}

// ===== ЛОГИКА ЛЕНТЫ (ФИЛЬТРАЦИЯ, СОРТИРОВКА, РЕНДЕРИНГ) =====
function getFilteredAndSortedPosts() {
    let filtered = posts.filter(post =>
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    switch (currentSort) {
        case 'date-desc':
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'date-asc':
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'title-asc':
            filtered.sort((a, b) => a.content.localeCompare(b.content));
            break;
        case 'title-desc':
            filtered.sort((a, b) => b.content.localeCompare(a.content));
            break;
        default:
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return filtered;
}

function renderPost(post) {
    const postElement = document.createElement('article');
    postElement.className = 'post';
    postElement.dataset.id = post.id;

    const likedClass = post.liked ? 'liked' : '';
    const likeIcon = post.liked ? '❤️' : '🤍';
    const isOwner = (post.author === userProfile.name);
    const pendingIcon = post.pending ? ' ⏳ (не отправлено)' : '';   // ← индикатор

    const editDeleteButtons = isOwner ? `
        <button class="post__edit-btn" data-edit-post>✏️ Редактировать</button>
        <button class="post__delete-btn" data-delete-post>🗑️ Удалить</button>
    ` : '';

    postElement.innerHTML = `
        <div class="post__header">
            <div class="post__avatar"></div>
            <div>
                <div class="post__author">${escapeHtml(post.author)}${pendingIcon}</div>
                <div class="post__date">${new Date(post.date).toLocaleString()}</div>
            </div>
        </div>
        <div class="post__content">${escapeHtml(post.content)}</div>
        <div class="post__actions">
            <button class="post__like-btn ${likedClass}" data-like-btn>
                <span class="like-icon">${likeIcon}</span> <span class="like-count">${post.likes}</span>
            </button>
            <button class="post__comments-btn" data-comments-btn>💬 Комментарии (${post.comments.length})</button>
            ${editDeleteButtons}
        </div>
    `;

    // Лайк
    const likeBtn = postElement.querySelector('[data-like-btn]');
    likeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const { likes, liked } = toggleLikeUtil(post.id, post.liked);
        post.likes = likes;
        post.liked = liked;
        cachePosts(posts);
        await refreshFeed();
    });

    // Комментарии
    const commentsBtn = postElement.querySelector('[data-comments-btn]');
    commentsBtn.addEventListener('click', async () => {
        if (post.comments.length === 0) {
            await loadCommentsForPost(post.id);
        }
        openCommentsModal(post);
    });

    // Редактирование
    const editBtn = postElement.querySelector('[data-edit-post]');
    if (editBtn) {
        editBtn.addEventListener('click', () => openEditPostModal(post));
    }

    // Удаление
    const deleteBtn = postElement.querySelector('[data-delete-post]');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (confirm('Удалить пост?')) {
                try {
                    await syncPostToAPI(null, 'DELETE', post.id);
                    posts = posts.filter(p => p.id !== post.id);
                    cachePosts(posts);
                    await refreshFeed();
                } catch (error) {
                    alert('Пост будет удалён при восстановлении соединения');
                    posts = posts.filter(p => p.id !== post.id);
                    cachePosts(posts);
                    await refreshFeed();
                    addToOfflineQueue({ method: 'DELETE', data: null, id: post.id });
                }
            }
        });
    }

    return postElement;
}

async function refreshFeed() {
    if (!feedContainer) return;
    const filtered = getFilteredAndSortedPosts();
    const visiblePosts = filtered.slice(0, (currentPostPage + 1) * POSTS_PER_PAGE);
    feedContainer.innerHTML = '';
    for (const post of visiblePosts) {
        feedContainer.appendChild(renderPost(post));
    }
    hasMore = visiblePosts.length < filtered.length;
    if (!hasMore && loaderElement) loaderElement.style.display = 'none';
}

async function loadMorePosts() {
    if (isLoading || !hasMore) return;
    isLoading = true;
    if (loaderElement) loaderElement.style.display = 'block';
    setTimeout(() => {
        currentPostPage++;
        refreshFeed();
        isLoading = false;
        if (loaderElement) loaderElement.style.display = 'none';
    }, 500);
}

// ===== СОЗДАНИЕ, РЕДАКТИРОВАНИЕ, УДАЛЕНИЕ ПОСТОВ =====
let isCreating = false; // уже есть в глобальных

async function createNewPost(content) {
    if (isCreating) return false;
    isCreating = true;
    try {
        if (!content || content.trim() === '') return false;
        const newPostData = {
            userId: 1,
            title: '',
            body: content
        };
        const tempId = Date.now();
        const tempPost = {
            id: tempId,
            author: userProfile.name,
            date: new Date().toISOString(),
            content: content,
            likes: 0,
            liked: false,
            comments: [],
            pending: true   // ← индикатор
        };
        posts.unshift(tempPost);
        await refreshFeed();
        cachePosts(posts);

        if (navigator.onLine) {
            try {
                const apiPost = await createPost(newPostData);
                const index = posts.findIndex(p => p.id === tempId);
                if (index !== -1) {
                    posts[index] = {
                        id: apiPost.id,
                        author: userProfile.name,
                        date: new Date().toISOString(),
                        content: apiPost.body,
                        likes: 0,
                        liked: false,
                        comments: [],
                        pending: false
                    };
                }
                await refreshFeed();
                cachePosts(posts);
                clearDraft();
                return true;
            } catch (error) {
                console.error('Ошибка при отправке поста:', error);
                addToOfflineQueue({ method: 'POST', data: newPostData, originalId: tempId });
                alert('Пост сохранён локально и будет отправлен при восстановлении соединения.');
                return true;
            }
        } else {
            addToOfflineQueue({ method: 'POST', data: newPostData, originalId: tempId });
            alert('Нет соединения. Пост сохранён в очередь и будет отправлен позже.');
            return true;
        }
    } finally {
        isCreating = false;
    }
}

async function updateExistingPost(postId, newContent) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const updatedData = {
        userId: 1,
        title: '',
        body: newContent
    };
    post.content = newContent;
    post.pending = true;   // помечаем как несинхронизированное
    await refreshFeed();
    cachePosts(posts);

    if (postId <= 100 && navigator.onLine) {
        try {
            await updatePost(postId, updatedData);
            post.pending = false;
            await refreshFeed();
            cachePosts(posts);
        } catch (error) {
            alert('Изменения сохранены локально, синхронизация позже');
            addToOfflineQueue({ method: 'PUT', data: updatedData, id: postId });
        }
    } else if (postId > 100) {
        console.log('Временный пост обновлён локально');
        addToOfflineQueue({ method: 'PUT', data: updatedData, id: postId });
    } else {
        addToOfflineQueue({ method: 'PUT', data: updatedData, id: postId });
        alert('Изменения сохранены в очередь');
    }
}

function openEditPostModal(post) {
    isEditingPost = true;
    editingPostId = post.id;
    const modal = document.getElementById('postModal');
    const titleElem = document.getElementById('postModalTitle');
    const textarea = document.getElementById('postContent');
    titleElem.textContent = 'Редактировать пост';
    textarea.value = post.content;
    document.getElementById('editPostId').value = post.id;
    modal.style.display = 'flex';
    // Больше никакого переопределения обработчика кнопки
}

// ===== КОММЕНТАРИИ (МОДАЛЬНОЕ ОКНО) =====
function openCommentsModal(post) {
    currentPostForComments = post;
    const modal = document.getElementById('commentsModal');
    if (!modal) return;
    renderCommentsInModal(post);
    modal.style.display = 'flex';
}

function renderCommentsInModal(post) {
    const container = document.getElementById('commentsList');
    if (!container) return;
    container.innerHTML = '';
    if (post.comments.length === 0) {
        container.innerHTML = '<p>Нет комментариев</p>';
    } else {
        post.comments.forEach(comment => {
            const div = document.createElement('div');
            div.className = 'comment';
            const pendingIcon = comment.pending ? ' ⏳' : '';
            div.innerHTML = `
                <div><strong>${escapeHtml(comment.author)}</strong>${pendingIcon} <small>${new Date(comment.date).toLocaleString()}</small></div>
                <div>${escapeHtml(comment.text)}</div>
                <div>
                    <button class="edit-comment-btn" data-id="${comment.id}">✏️</button>
                    <button class="delete-comment-btn" data-id="${comment.id}">🗑️</button>
                </div>
            `;
            container.appendChild(div);
        });
        // Редактирование комментария (оставляем без изменений, но можно добавить pending)
        document.querySelectorAll('.edit-comment-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const commentId = parseInt(btn.dataset.id);
                const comment = post.comments.find(c => c.id === commentId);
                const newText = prompt('Редактировать комментарий:', comment.text);
                if (newText && newText.trim()) {
                    comment.text = newText;
                    comment.pending = true;
                    renderCommentsInModal(post);
                    await refreshFeed();
                    cachePosts(posts);
                    if (commentId <= 500 && navigator.onLine) {
                        try {
                            await updateComment(commentId, { body: newText });
                            comment.pending = false;
                            renderCommentsInModal(post);
                            cachePosts(posts);
                        } catch (error) {
                            alert('Ошибка, комментарий сохранён локально');
                        }
                    }
                }
            });
        });
        // Удаление комментария (оставляем без изменений)
        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const commentId = parseInt(btn.dataset.id);
                if (confirm('Удалить комментарий?')) {
                    if (commentId > 500) {
                        post.comments = post.comments.filter(c => c.id !== commentId);
                        renderCommentsInModal(post);
                        await refreshFeed();
                        cachePosts(posts);
                    } else {
                        try {
                            await deleteComment(commentId);
                            post.comments = post.comments.filter(c => c.id !== commentId);
                            renderCommentsInModal(post);
                            await refreshFeed();
                            cachePosts(posts);
                        } catch (error) {
                            alert('Комментарий будет удалён при соединении');
                            post.comments = post.comments.filter(c => c.id !== commentId);
                            renderCommentsInModal(post);
                            cachePosts(posts);
                            addToOfflineQueue({ method: 'DELETE', data: null, id: commentId });
                        }
                    }
                }
            });
        });
    }
}

async function addCommentToPost(postId, commentText) {
    const post = posts.find(p => p.id === postId);
    if (!post || !commentText.trim()) return;

    const tempId = Date.now();
    const tempComment = {
        id: tempId,
        author: userProfile.name,
        text: commentText,
        date: new Date().toISOString(),
        pending: true
    };
    post.comments.push(tempComment);
    renderCommentsInModal(post);
    await refreshFeed();
    cachePosts(posts);

    const newComment = {
        postId: postId,
        name: userProfile.name,
        email: userProfile.email,
        body: commentText
    };

    if (navigator.onLine && postId <= 100) {
        try {
            const apiComment = await createComment(newComment);
            const index = post.comments.findIndex(c => c.id === tempId);
            if (index !== -1) {
                post.comments[index] = {
                    id: apiComment.id,
                    author: apiComment.name || userProfile.name,
                    text: apiComment.body,
                    date: new Date().toISOString(),
                    pending: false
                };
            }
            renderCommentsInModal(post);
            await refreshFeed();
            cachePosts(posts);
        } catch (error) {
            console.error('Ошибка отправки комментария:', error);
            alert('Комментарий сохранён локально, будет отправлен позже');
        }
    } else {
        alert('Комментарий сохранён локально');
        addToOfflineQueue({ method: 'POST', data: newComment, originalId: tempId, postId: postId });
    }
}

// ===== РЕНДЕР СТРАНИЦ (ПОЛНЫЕ ВЕРСИИ) =====
function renderMainPage() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <aside class="sidebar" aria-label="Список чатов">
            <nav class="sidebar__nav">
                <h2 class="sidebar__title">information</h2>
                <ul class="chat-list" role="list">
                    <li class="chat-list__item"><div class="chat chat--active">Имя1 <span>Онлайн</span></div></li>
                    <li class="chat-list__item"><div class="chat">Имя2 <span>Был 5 мин назад</span></div></li>
                    <li class="chat-list__item"><div class="chat">Имя3 <span>Онлайн</span></div></li>
                </ul>
            </nav>
        </aside>
        <main class="chat-area" id="main-content">
            <header class="chat-header"><h2>Имя 1</h2><p>онлайн</p></header>
            <section class="messages">
                <article class="message message--incoming"><div>сообщение1</div><time>10:30</time></article>
                <article class="message message--outgoing"><div>сообщение2</div><time>10:31</time></article>
            </section>
            <div class="input-area">
                <input type="text" id="messageInput" class="input-area__field" placeholder="Введите сообщение...">
                <button class="input-area__button" onclick="sendMessage()">Send</button>
            </div>
        </main>
    `;
}

function renderProfilePage() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <div class="profile-container" style="max-width: 500px; margin: 0 auto; background: var(--color-white); border-radius: 30px; padding: var(--spacing-lg); box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <h2 style="color: var(--color-primary); margin-bottom: var(--spacing-md);">Профиль</h2>
            <form id="profileForm">
                <div style="margin-bottom: var(--spacing-md);"><label>Имя:</label><input type="text" id="profileName" value="${escapeHtml(userProfile.name)}" style="width:100%; padding: var(--spacing-sm); border-radius:20px; border:1px solid var(--color-secondary);"></div>
                <div style="margin-bottom: var(--spacing-md);"><label>Email:</label><input type="email" id="profileEmail" value="${escapeHtml(userProfile.email)}" style="width:100%; padding: var(--spacing-sm); border-radius:20px; border:1px solid var(--color-secondary);"></div>
                <button type="submit" style="background-color: var(--color-primary); color: white; border: none; border-radius: 30px; padding: var(--spacing-sm) var(--spacing-md); cursor: pointer;">Сохранить изменения</button>
            </form>
        </div>
    `;
    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            userProfile.name = document.getElementById('profileName').value.trim() || 'Аноним';
            userProfile.email = document.getElementById('profileEmail').value.trim() || '';
            saveProfile(userProfile);
            alert('Данные сохранены!');
        });
    }
}

async function renderNewsPage() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <div class="news-container" style="max-width: 600px; margin: 0 auto; padding: var(--spacing-md);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md); flex-wrap: wrap; gap: 10px;">
                <h2 style="color: var(--color-primary);">Лента новостей</h2>
                <button id="createPostBtnNews" style="background-color: var(--color-primary); color: white; border: none; border-radius: 30px; padding: var(--spacing-sm) var(--spacing-md); cursor: pointer;">Создать пост</button>
            </div>
            <div style="display: flex; gap: 10px; margin-bottom: var(--spacing-md); flex-wrap: wrap;">
                <input type="text" id="searchInput" placeholder="Поиск по постам..." style="flex:1; padding: var(--spacing-sm); border-radius: 20px; border: 1px solid var(--color-secondary);">
                <select id="sortSelect" style="padding: var(--spacing-sm); border-radius: 20px;">
                    <option value="date-desc">Сначала новые</option>
                    <option value="date-asc">Сначала старые</option>
                    <option value="title-asc">По названию (А-Я)</option>
                    <option value="title-desc">По названию (Я-А)</option>
                </select>
            </div>
            <div id="feed" class="feed"></div>
            <div id="loaderNews" class="loader">Загрузка...</div>
        </div>
    `;

    feedContainer = document.getElementById('feed');
    loaderElement = document.getElementById('loaderNews');
    createPostBtn = document.getElementById('createPostBtnNews');

    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        currentPostPage = 0;
        refreshFeed();
    });
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        currentPostPage = 0;
        refreshFeed();
    });

    if (posts.length === 0) {
        await loadPostsFromAPI();
    }
    currentPostPage = 0;
    hasMore = true;
    await refreshFeed();

    // Защита от множественных обработчиков: клонируем кнопку
    if (createPostBtn) {
        const newBtn = createPostBtn.cloneNode(true);
        createPostBtn.parentNode.replaceChild(newBtn, createPostBtn);
        createPostBtn = newBtn;
        createPostBtn.addEventListener('click', () => {
            const draft = getDraft();
            document.getElementById('postContent').value = draft;
            document.getElementById('postModal').style.display = 'flex';
        });
    }

    enableInfiniteScroll();
}

// ===== БЕСКОНЕЧНАЯ ПРОКРУТКА =====
function enableInfiniteScroll() {
    if (scrollHandlerActive) return;
    const handleScroll = () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
            loadMorePosts();
        }
    };
    window.addEventListener('scroll', handleScroll);
    scrollHandlerActive = true;
    window.__scrollHandler = handleScroll;
}

function disableInfiniteScroll() {
    if (scrollHandlerActive && window.__scrollHandler) {
        window.removeEventListener('scroll', window.__scrollHandler);
        scrollHandlerActive = false;
    }
}

// ===== ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ =====
function switchPage(page) {
    document.querySelectorAll('.header__menu-link').forEach(link => link.classList.remove('active'));
    const activeLink = document.querySelector(`.header__menu-link[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');

    disableInfiniteScroll();

    const container = document.getElementById('app-container');
    if (page === 'main') container.classList.add('app');
    else container.classList.remove('app');

    switch (page) {
        case 'main': renderMainPage(); break;
        case 'profile': renderProfilePage(); break;
        case 'news': renderNewsPage(); break;
        default: renderMainPage();
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ НАВИГАЦИИ =====
function initNavigation() {
    const menuLinks = document.querySelectorAll('.header__menu-link');
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(link.getAttribute('data-page'));
        });
    });
    switchPage('main');
}

// ===== ИНИЦИАЛИЗАЦИЯ МОДАЛЬНЫХ ОКОН =====
function initModals() {
    // Модалка поста
    const postModal = document.getElementById('postModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelPostBtn = document.getElementById('cancelPostBtn');
    const submitPostBtn = document.getElementById('submitPostBtn');
    const postContent = document.getElementById('postContent');
    const draftIndicator = document.getElementById('draftIndicator');

    if (postModal && closeModalBtn) {
        closeModalBtn.addEventListener('click', () => postModal.style.display = 'none');
        cancelPostBtn.addEventListener('click', () => postModal.style.display = 'none');
        postModal.addEventListener('click', (e) => { if (e.target === postModal) postModal.style.display = 'none'; });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && postModal.style.display === 'flex') postModal.style.display = 'none'; });
    }

    // Обработчик создания/редактирования поста (общий)
    if (submitPostBtn && !submitPostBtn._listenerAdded) {
        submitPostBtn.addEventListener('click', async () => {
            const content = postContent.value.trim();
            if (!content) {
                alert('Введите текст поста');
                return;
            }
            if (isEditingPost && editingPostId) {
                await updateExistingPost(editingPostId, content);
            } else {
                await createNewPost(content);
            }
            postModal.style.display = 'none';
            postContent.value = '';
            clearDraft();
            if (draftIndicator) draftIndicator.innerText = '';
            isEditingPost = false;
            editingPostId = null;
            document.getElementById('postModalTitle').textContent = 'Создать новый пост';
        });
        submitPostBtn._listenerAdded = true;
    }

    // Автосохранение черновика
    if (postContent) {
        postContent.addEventListener('input', (e) => {
            const text = e.target.value;
            saveDraft(text);
            if (draftIndicator) {
                if (text) draftIndicator.innerText = 'Черновик сохранён';
                else draftIndicator.innerText = '';
            }
        });
    }

    // Модалка комментариев
    const commentsModal = document.getElementById('commentsModal');
    const closeCommentsBtn = document.getElementById('closeCommentsModalBtn');
    const addCommentBtn = document.getElementById('addCommentBtn');
    const newCommentText = document.getElementById('newCommentText');
    if (commentsModal && closeCommentsBtn) {
        closeCommentsBtn.addEventListener('click', () => commentsModal.style.display = 'none');
        commentsModal.addEventListener('click', (e) => { if (e.target === commentsModal) commentsModal.style.display = 'none'; });
        addCommentBtn.addEventListener('click', async () => {
            const text = newCommentText.value.trim();
            if (text && currentPostForComments) {
                await addCommentToPost(currentPostForComments.id, text);
                newCommentText.value = '';
            } else {
                alert('Введите текст комментария');
            }
        });
    }
    window.addEventListener('online', async () => {
    console.log('Соединение восстановлено, обрабатываем очередь');
    await processOfflineQueue();
});
}

// ===== ФУНКЦИЯ ОТПРАВКИ СООБЩЕНИЯ ДЛЯ ГЛАВНОЙ СТРАНИЦЫ =====
window.sendMessage = function() {
    const input = document.getElementById('messageInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const messages = document.querySelector('.messages');
    const newMsg = document.createElement('article');
    newMsg.className = 'message message--outgoing';
    newMsg.innerHTML = `<div>${escapeHtml(text)}</div><time>${new Date().toLocaleTimeString()}</time>`;
    messages.appendChild(newMsg);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;
};

// ===== ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ =====
document.addEventListener('DOMContentLoaded', async () => {
    initModals();
    initNavigation();
    await processOfflineQueue();
    window.addEventListener('online', async () => {
        console.log('Соединение восстановлено, обрабатываем очередь');
        await processOfflineQueue();
    });
});