// ===== ОБЩИЕ ДАННЫЕ =====
let userProfile = {
    name: 'Иван Иванов',
    email: 'ivan@example.com'
};

let posts = [];
let currentPostPage = 0;
const POSTS_PER_PAGE = 3;
let isLoading = false;
let hasMore = true;
let scrollHandlerActive = false;

// Для ленты
let feedContainer, loaderElement, createPostBtn;
let currentPostForComments = null;
let currentSort = 'date-desc'; // date-desc, date-asc, title-asc, title-desc
let searchQuery = '';

// Для редактирования поста
let isEditingPost = false;
let editingPostId = null;

// ===== РАБОТА С LOCALSTORAGE =====
function saveToLocalStorage() {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    localStorage.setItem('posts', JSON.stringify(posts));
}

function loadFromLocalStorage() {
    const savedProfile = localStorage.getItem('userProfile');
    const savedPosts = localStorage.getItem('posts');
    if (savedProfile) {
        userProfile = JSON.parse(savedProfile);
    }
    if (savedPosts) {
        posts = JSON.parse(savedPosts);
    } else {
        // Генерация тестовых постов, если нет сохранённых
        posts = generateInitialPosts();
        saveToLocalStorage();
    }
}

// Вспомогательные функции
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Генерация начальных постов
function generateInitialPosts() {
    const initialPosts = [];
    for (let i = 1; i <= 10; i++) {
        initialPosts.push({
            id: i,
            author: `Пользователь ${i}`,
            date: new Date(Date.now() - i * 3600000).toISOString(),
            content: `Это тестовый пост №${i}. Здесь может быть интересный текст о социальной сети.`,
            likes: Math.floor(Math.random() * 50),
            liked: false,
            comments: [
                { id: Date.now() + i, author: 'Анна', text: 'Отличный пост!', date: new Date().toISOString() },
                { id: Date.now() + i + 100, author: 'Петр', text: 'Согласен', date: new Date().toISOString() }
            ]
        });
    }
    return initialPosts;
}

// ===== ФУНКЦИИ ЛЕНТЫ =====
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

    // Кнопки редактирования/удаления показываем только для своих постов (автор "Вы") или для всех? Для демонстрации - для всех
    const isOwner = (post.author === userProfile.name);
    const editDeleteButtons = isOwner ? `
        <button class="post__edit-btn" data-edit-post>✏️ Редактировать</button>
        <button class="post__delete-btn" data-delete-post>🗑️ Удалить</button>
    ` : '';

    postElement.innerHTML = `
        <div class="post__header">
            <div class="post__avatar"></div>
            <div>
                <div class="post__author">${escapeHtml(post.author)}</div>
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
    likeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleLike(post.id);
    });

    // Комментарии
    const commentsBtn = postElement.querySelector('[data-comments-btn]');
    commentsBtn.addEventListener('click', () => {
        openCommentsModal(post);
    });

    // Редактирование
    const editBtn = postElement.querySelector('[data-edit-post]');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            openEditPostModal(post);
        });
    }

    // Удаление
    const deleteBtn = postElement.querySelector('[data-delete-post]');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('Удалить пост?')) {
                deletePost(post.id);
            }
        });
    }

    return postElement;
}

function toggleLike(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.liked = !post.liked;
        post.likes += post.liked ? 1 : -1;
        saveToLocalStorage();
        updateFeed();
    }
}

function deletePost(postId) {
    posts = posts.filter(p => p.id !== postId);
    saveToLocalStorage();
    // Сброс пагинации
    currentPostPage = 0;
    hasMore = true;
    updateFeed();
}

function openEditPostModal(post) {
    isEditingPost = true;
    editingPostId = post.id;
    const modal = document.getElementById('postModal');
    const titleElem = document.getElementById('postModalTitle');
    const textarea = document.getElementById('postContent');
    const submitBtn = document.getElementById('submitPostBtn');
    titleElem.textContent = 'Редактировать пост';
    textarea.value = post.content;
    document.getElementById('editPostId').value = post.id;
    modal.style.display = 'flex';
    // Временно меняем действие submitPostBtn
    submitBtn.onclick = () => {
        const newContent = textarea.value.trim();
        if (newContent) {
            const index = posts.findIndex(p => p.id === post.id);
            if (index !== -1) {
                posts[index].content = newContent;
                saveToLocalStorage();
                updateFeed();
                modal.style.display = 'none';
                textarea.value = '';
                isEditingPost = false;
                editingPostId = null;
                submitBtn.onclick = originalSubmitHandler; // восстанавливаем
                document.getElementById('postModalTitle').textContent = 'Создать новый пост';
            }
        } else {
            alert('Пост не может быть пустым');
        }
    };
}

// Оригинальный обработчик создания поста
function originalSubmitHandler() {
    const content = document.getElementById('postContent').value;
    if (createNewPost(content)) {
        document.getElementById('postModal').style.display = 'none';
        document.getElementById('postContent').value = '';
    } else {
        alert('Введите текст поста');
    }
}

function createNewPost(content) {
    if (!content || content.trim() === '') return false;
    const newPost = {
        id: Date.now(),
        author: userProfile.name,
        date: new Date().toISOString(),
        content: content.trim(),
        likes: 0,
        liked: false,
        comments: []
    };
    posts.unshift(newPost);
    saveToLocalStorage();
    currentPostPage = 0;
    hasMore = true;
    updateFeed();
    return true;
}

function updateFeed() {
    if (!feedContainer) return;
    const filtered = getFilteredAndSortedPosts();
    const visiblePosts = filtered.slice(0, (currentPostPage + 1) * POSTS_PER_PAGE);
    feedContainer.innerHTML = '';
    visiblePosts.forEach(post => {
        feedContainer.appendChild(renderPost(post));
    });
    if (visiblePosts.length >= filtered.length) {
        hasMore = false;
        if (loaderElement) loaderElement.style.display = 'none';
    } else {
        hasMore = true;
    }
}

function loadMorePosts() {
    if (isLoading || !hasMore) return;
    isLoading = true;
    if (loaderElement) loaderElement.style.display = 'block';

    setTimeout(() => {
        currentPostPage++;
        updateFeed();
        isLoading = false;
        if (loaderElement) loaderElement.style.display = 'none';
    }, 500);
}

// ===== КОММЕНТАРИИ (с редактированием и удалением) =====
function openCommentsModal(post) {
    currentPostForComments = post;
    const modal = document.getElementById('commentsModal');
    if (!modal) return;
    renderCommentsInModal(post);
    modal.style.display = 'flex';
}

function renderCommentsInModal(post) {
    const commentsContainer = document.getElementById('commentsList');
    if (!commentsContainer) return;
    commentsContainer.innerHTML = '';
    if (post.comments.length === 0) {
        commentsContainer.innerHTML = '<p>Нет комментариев. Будьте первым!</p>';
    } else {
        post.comments.forEach(comment => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment';
            commentDiv.style.marginBottom = '10px';
            commentDiv.style.borderBottom = '1px solid #eee';
            commentDiv.style.paddingBottom = '5px';
            commentDiv.innerHTML = `
                <div><strong>${escapeHtml(comment.author)}</strong> <small style="color:#666;">${new Date(comment.date).toLocaleString()}</small></div>
                <div>${escapeHtml(comment.text)}</div>
                <div style="margin-top: 5px;">
                    <button class="edit-comment-btn" data-comment-id="${comment.id}" style="background:none; border:none; color:var(--color-primary); cursor:pointer;">✏️ Редактировать</button>
                    <button class="delete-comment-btn" data-comment-id="${comment.id}" style="background:none; border:none; color:red; cursor:pointer;">🗑️ Удалить</button>
                </div>
            `;
            commentsContainer.appendChild(commentDiv);
        });
        // Добавляем обработчики для кнопок
        document.querySelectorAll('.edit-comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = parseInt(btn.dataset.commentId);
                const comment = post.comments.find(c => c.id === commentId);
                if (comment) {
                    const newText = prompt('Редактировать комментарий:', comment.text);
                    if (newText !== null && newText.trim() !== '') {
                        comment.text = newText.trim();
                        saveToLocalStorage();
                        renderCommentsInModal(post);
                        updateFeed(); // обновить счётчик комментариев
                    }
                }
            });
        });
        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = parseInt(btn.dataset.commentId);
                if (confirm('Удалить комментарий?')) {
                    post.comments = post.comments.filter(c => c.id !== commentId);
                    saveToLocalStorage();
                    renderCommentsInModal(post);
                    updateFeed();
                }
            });
        });
    }
}

function addCommentToPost(postId, commentText) {
    const post = posts.find(p => p.id === postId);
    if (post && commentText.trim()) {
        const newComment = {
            id: Date.now(),
            author: userProfile.name,
            text: commentText.trim(),
            date: new Date().toISOString()
        };
        post.comments.push(newComment);
        saveToLocalStorage();
        updateFeed();
        if (currentPostForComments && currentPostForComments.id === postId) {
            renderCommentsInModal(post);
        }
    }
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

// ===== РЕНДЕР СТРАНИЦ =====
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
            saveToLocalStorage();
            alert('Данные сохранены!');
        });
    }
}

function renderNewsPage() {
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

    // Поиск и сортировка
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        currentPostPage = 0;
        hasMore = true;
        updateFeed();
    });
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        currentPostPage = 0;
        hasMore = true;
        updateFeed();
    });

    if (posts.length === 0) loadFromLocalStorage();
    currentPostPage = 0;
    hasMore = true;
    updateFeed();

    if (createPostBtn) {
        createPostBtn.addEventListener('click', () => {
            isEditingPost = false;
            editingPostId = null;
            document.getElementById('postModalTitle').textContent = 'Создать новый пост';
            document.getElementById('postContent').value = '';
            document.getElementById('submitPostBtn').onclick = originalSubmitHandler;
            document.getElementById('postModal').style.display = 'flex';
        });
    }

    enableInfiniteScroll();
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

// ===== ИНИЦИАЛИЗАЦИЯ =====
function initNavigation() {
    document.querySelectorAll('.header__menu-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(link.getAttribute('data-page'));
        });
    });
    switchPage('main');
}

function initModals() {
    // Модалка поста
    const postModal = document.getElementById('postModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelPostBtn = document.getElementById('cancelPostBtn');
    if (postModal && closeModalBtn) {
        closeModalBtn.addEventListener('click', () => postModal.style.display = 'none');
        cancelPostBtn.addEventListener('click', () => postModal.style.display = 'none');
        postModal.addEventListener('click', (e) => { if (e.target === postModal) postModal.style.display = 'none'; });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && postModal.style.display === 'flex') postModal.style.display = 'none'; });
    }
    // Модалка комментариев
    const commentsModal = document.getElementById('commentsModal');
    const closeCommentsBtn = document.getElementById('closeCommentsModalBtn');
    const addCommentBtn = document.getElementById('addCommentBtn');
    const newCommentText = document.getElementById('newCommentText');
    if (commentsModal && closeCommentsBtn) {
        closeCommentsBtn.addEventListener('click', () => commentsModal.style.display = 'none');
        commentsModal.addEventListener('click', (e) => { if (e.target === commentsModal) commentsModal.style.display = 'none'; });
        addCommentBtn.addEventListener('click', () => {
            const text = newCommentText.value.trim();
            if (text && currentPostForComments) {
                addCommentToPost(currentPostForComments.id, text);
                newCommentText.value = '';
            } else alert('Введите текст комментария');
        });
    }
}

function sendMessage() {
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
}

// Загрузка данных из localStorage при старте
loadFromLocalStorage();

document.addEventListener('DOMContentLoaded', () => {
    initModals();
    initNavigation();
});