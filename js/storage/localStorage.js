
const DRAFT_KEY = 'draft_post';
const OFFLINE_QUEUE_KEY = 'offline_posts_queue';
const POSTS_CACHE_KEY = 'posts_cache';
const PROFILE_KEY = 'user_profile';


export function saveDraft(content) {
    if (content && content.trim()) {
        localStorage.setItem(DRAFT_KEY, content);
    } else {
        localStorage.removeItem(DRAFT_KEY);
    }
}

export function getDraft() {
    return localStorage.getItem(DRAFT_KEY) || '';
}

export function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
}


export function getOfflineQueue() {
    const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
}

export function addToOfflineQueue(item) {
    const queue = getOfflineQueue();
    queue.push({
        id: Date.now(),
        ...item,
        timestamp: new Date().toISOString(),
        retries: 0
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromOfflineQueue(queueId) {
    let queue = getOfflineQueue();
    queue = queue.filter(item => item.id !== queueId);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue() {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
}


export function cachePosts(posts) {
    localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(posts));
}

export function getCachedPosts() {
    const cached = localStorage.getItem(POSTS_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
}


export function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getProfile() {
    const profile = localStorage.getItem(PROFILE_KEY);
    return profile ? JSON.parse(profile) : { name: 'Иван Иванов', email: 'ivan@example.com' };
}