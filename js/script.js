// Функция для добавления сообщения в чат
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

// Вспомогательная функция для защиты от XSS
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Рендер главной страницы (исходный чат)
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

// Рендер страницы-заглушки для других разделов
function renderPlaceholderPage(title, message) {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <div class="page-placeholder" style="
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 400px;
            background-color: var(--color-white);
            border-radius: 30px;
            margin: var(--spacing-md);
            padding: var(--spacing-xl);
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        ">
            <h2 style="color: var(--color-primary); margin-bottom: var(--spacing-md);">${title}</h2>
            <p style="color: var(--color-text);">${message}</p>
        </div>
    `;
}

// Переключение страниц
function switchPage(page) {
    // Обновляем активный класс в меню
    document.querySelectorAll('.header__menu-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`.header__menu-link[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Рендерим нужную страницу
    switch (page) {
        case 'main':
            renderMainPage();
            break;
        case 'profile':
            renderPlaceholderPage('Профиль', 'Здесь будет информация о пользователе.');
            break;
        case 'messages':
            renderPlaceholderPage('Сообщения', 'Здесь будет список диалогов.');
            break;
        case 'settings':
            renderPlaceholderPage('Настройки', 'Здесь будут настройки аккаунта.');
            break;
        default:
            renderMainPage();
    }
}

// Инициализация навигации
function initNavigation() {
    const menuLinks = document.querySelectorAll('.header__menu-link');
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (page) switchPage(page);
        });
    });

    // Устанавливаем активной главную страницу при загрузке
    const defaultPage = 'main';
    const defaultLink = document.querySelector(`.header__menu-link[data-page="${defaultPage}"]`);
    if (defaultLink) defaultLink.classList.add('active');
    switchPage(defaultPage);
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
});