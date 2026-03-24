// ===== ОБЩИЕ ДАННЫЕ =====
// Данные пользователя для профиля
let userProfile = {
    name: 'Иван Иванов',
    email: 'ivan@example.com'
};

// Данные для ленты
let posts = [];
let currentPostPage = 0;
const POSTS_PER_PAGE = 3;
let isLoading = false;
let hasMore = true;
let scrollHandlerActive = false;

// Элементы, используемые на странице ленты
let feedContainer, loaderElement, createPostBtn;
let currentPostForComments = null; // для комментариев

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
                { author: 'Анна', text: 'Отличный пост!', date: new Date().toISOString() },
                { author: 'Петр', text: 'Согласен', date: new Date().toISOString() }
            ]
        });
    }
    return initialPosts;
}

// ===== ФУНКЦИИ ЛЕНТЫ =====
function renderPost(post) {
    const postElement = document.createElement('article');
    postElement.className = 'post';
    postElement.dataset.id = post.id;

    const likedClass = post.liked ? 'liked' : '';
    const likeIcon = post.liked ? '❤️' : '🤍';

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
        </div>
    `;

    // Обработчик лайка
    const likeBtn = postElement.querySelector('[data-like-btn]');
    likeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleLike(post.id);
    });

    // Обработчик кнопки "Комментарии"
    const commentsBtn = postElement.querySelector('[data-comments-btn]');
    commentsBtn.addEventListener('click', () => {
        openCommentsModal(post);
    });

    return postElement;
}

function toggleLike(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.liked = !post.liked;
        post.likes += post.liked ? 1 : -1;
        updateFeed();
    }
}

function updateFeed() {
    if (!feedContainer) return;
    const visiblePosts = posts.slice(0, (currentPostPage + 1) * POSTS_PER_PAGE);
    feedContainer.innerHTML = '';
    visiblePosts.forEach(post => {
        feedContainer.appendChild(renderPost(post));
    });
    if (visiblePosts.length >= posts.length) {
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

function createNewPost(content) {
    if (!content || content.trim() === '') {
        alert('Пост не может быть пустым');
        return false;
    }
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
    currentPostPage = 0;
    hasMore = true;
    updateFeed();
    return true;
}

function addCommentToPost(postId, commentText) {
    const post = posts.find(p => p.id === postId);
    if (post && commentText.trim()) {
        post.comments.push({
            author: userProfile.name,
            text: commentText.trim(),
            date: new Date().toISOString()
        });
        // Обновляем ленту, чтобы обновить счётчик комментариев
        updateFeed();
        // Если модальное окно открыто для этого поста, обновляем его содержимое
        if (currentPostForComments && currentPostForComments.id === postId) {
            renderCommentsInModal(post);
        }
    }
}

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
            commentDiv.innerHTML = `
                <strong>${escapeHtml(comment.author)}</strong>:
                <span>${escapeHtml(comment.text)}</span>
                <small style="color: #666; margin-left: 10px;">${new Date(comment.date).toLocaleTimeString()}</small>
            `;
            commentsContainer.appendChild(commentDiv);
        });
    }
}

// ===== УПРАВЛЕНИЕ ПРОКРУТКОЙ =====
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
                    <li class="chat-list__item">
                        <div class="chat chat--active" itemprop="employee" itemscope itemtype="https://schema.org/Person">
                            <span class="chat__name" itemprop="name">Имя1</span>
                            <span class="chat__status" itemprop="jobTitle">Онлайн</span>
                        </div>
                    </li>
                    <li class="chat-list__item">
                        <div class="chat" itemprop="employee" itemscope itemtype="https://schema.org/Person">
                            <span class="chat__name" itemprop="name">Имя2</span>
                            <span class="chat__status" itemprop="jobTitle">Был 5 мин назад</span>
                        </div>
                    </li>
                    <li class="chat-list__item">
                        <div class="chat" itemprop="employee" itemscope itemtype="https://schema.org/Person">
                            <span class="chat__name" itemprop="name">Имя3</span>
                            <span class="chat__status" itemprop="jobTitle">Онлайн</span>
                        </div>
                    </li>
                </ul>
            </nav>
        </aside>
        <main class="chat-area" id="main-content">
            <header class="chat-header">
                <h2 class="chat-header__title" itemprop="employee" itemscope itemtype="https://schema.org/Person">
                    <span itemprop="name">Имя 1</span>
                </h2>
                <p class="chat-header__status">онлайн</p>
            </header>
            <section class="messages" aria-label="Сообщения в чате">
                <h3 class="visually-hidden">История сообщений</h3>
                <article class="message message--incoming">
                    <div class="message__content">сообщение1</div>
                    <time class="message__time">10:30</time>
                </article>
                <article class="message message--outgoing">
                    <div class="message__content">сообщение2</div>
                    <time class="message__time">10:31</time>
                </article>
            </section>
            <div class="input-area">
                <label for="messageInput" class="visually-hidden">Введите сообщение</label>
                <input type="text" 
                    id="messageInput" 
                    class="input-area__field" 
                    placeholder="Введите сообщение..." 
                    aria-label="Текст сообщения">
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
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-xs);">Имя:</label>
                    <input type="text" id="profileName" value="${escapeHtml(userProfile.name)}" style="width: 100%; padding: var(--spacing-sm); border-radius: 20px; border: 1px solid var(--color-secondary);">
                </div>
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-xs);">Email:</label>
                    <input type="email" id="profileEmail" value="${escapeHtml(userProfile.email)}" style="width: 100%; padding: var(--spacing-sm); border-radius: 20px; border: 1px solid var(--color-secondary);">
                </div>
                <button type="submit" style="background-color: var(--color-primary); color: white; border: none; border-radius: 30px; padding: var(--spacing-sm) var(--spacing-md); cursor: pointer;">Сохранить изменения</button>
            </form>
        </div>
    `;

    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('profileName');
            const emailInput = document.getElementById('profileEmail');
            userProfile.name = nameInput.value.trim() || 'Аноним';
            userProfile.email = emailInput.value.trim() || '';
            alert('Данные сохранены!');
        });
    }
}

function renderNewsPage() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <div class="news-container" style="max-width: 600px; margin: 0 auto; padding: var(--spacing-md);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                <h2 style="color: var(--color-primary);">Лента новостей</h2>
                <button id="createPostBtnNews" style="background-color: var(--color-primary); color: white; border: none; border-radius: 30px; padding: var(--spacing-sm) var(--spacing-md); cursor: pointer;">Создать пост</button>
            </div>
            <div id="feed" class="feed"></div>
            <div id="loaderNews" class="loader">Загрузка...</div>
        </div>
    `;

    feedContainer = document.getElementById('feed');
    loaderElement = document.getElementById('loaderNews');
    createPostBtn = document.getElementById('createPostBtnNews');

    // Инициализируем данные, если их ещё нет
    if (posts.length === 0) {
        posts = generateInitialPosts();
    }
    currentPostPage = 0;
    hasMore = true;
    updateFeed();

    if (createPostBtn) {
        createPostBtn.addEventListener('click', () => {
            const modal = document.getElementById('postModal');
            if (modal) modal.style.display = 'flex';
        });
    }

    // Включаем бесконечную прокрутку
    enableInfiniteScroll();
}

// ===== ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ =====
function switchPage(page) {
    // Обновляем активный класс в меню
    document.querySelectorAll('.header__menu-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`.header__menu-link[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Отключаем бесконечную прокрутку, если она активна
    disableInfiniteScroll();

    // Управляем классом контейнера
    const container = document.getElementById('app-container');
    if (page === 'main') {
        container.classList.add('app');   // для главной страницы оставляем сетку
    } else {
        container.classList.remove('app'); // для остальных убираем сетку
    }

    // Рендерим нужную страницу
    switch (page) {
        case 'main':
            renderMainPage();
            break;
        case 'profile':
            renderProfilePage();
            break;
        case 'news':
            renderNewsPage();
            break;
        default:
            renderMainPage();
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
function initNavigation() {
    const menuLinks = document.querySelectorAll('.header__menu-link');
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (page) switchPage(page);
        });
    });

    // Активная страница по умолчанию
    const defaultPage = 'main';
    const defaultLink = document.querySelector(`.header__menu-link[data-page="${defaultPage}"]`);
    if (defaultLink) defaultLink.classList.add('active');
    switchPage(defaultPage);
}

function initModals() {
    // Модалка для создания поста
    const postModal = document.getElementById('postModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelPostBtn = document.getElementById('cancelPostBtn');
    const submitPostBtn = document.getElementById('submitPostBtn');
    const postContent = document.getElementById('postContent');

    if (postModal && closeModalBtn) {
        closeModalBtn.addEventListener('click', () => postModal.style.display = 'none');
        cancelPostBtn.addEventListener('click', () => postModal.style.display = 'none');
        submitPostBtn.addEventListener('click', () => {
            const content = postContent.value;
            if (createNewPost(content)) {
                postModal.style.display = 'none';
                postContent.value = '';
            }
        });
        // Закрытие по клику на фон
        postModal.addEventListener('click', (e) => {
            if (e.target === postModal) postModal.style.display = 'none';
        });
        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && postModal.style.display === 'flex') {
                postModal.style.display = 'none';
            }
        });
    }

    // Модалка для комментариев
    const commentsModal = document.getElementById('commentsModal');
    const closeCommentsBtn = document.getElementById('closeCommentsModalBtn');
    const addCommentBtn = document.getElementById('addCommentBtn');
    const newCommentText = document.getElementById('newCommentText');

    if (commentsModal && closeCommentsBtn) {
        closeCommentsBtn.addEventListener('click', () => commentsModal.style.display = 'none');
        commentsModal.addEventListener('click', (e) => {
            if (e.target === commentsModal) commentsModal.style.display = 'none';
        });
        addCommentBtn.addEventListener('click', () => {
            const text = newCommentText.value.trim();
            if (text && currentPostForComments) {
                addCommentToPost(currentPostForComments.id, text);
                newCommentText.value = '';
            } else {
                alert('Введите текст комментария');
            }
        });
    }
}

// Функция sendMessage уже существует (для главной страницы)
function sendMessage() {
    const input = document.getElementById('messageInput');
    const messageText = input.value.trim();
    if (messageText === '') return;

    const messagesContainer = document.querySelector('.messages');
    const newMessage = document.createElement('article');
    newMessage.className = 'message message--outgoing';
    newMessage.innerHTML = `
        <div class="message__content">${escapeHtml(messageText)}</div>
        <time class="message__time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
    `;
    messagesContainer.appendChild(newMessage);
    input.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', () => {
    initModals();
    initNavigation();
});