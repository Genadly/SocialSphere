// Можно использовать для текущего состояния сессии, например, текущий пост
export function setSessionItem(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
}

export function getSessionItem(key) {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
}

export function removeSessionItem(key) {
    sessionStorage.removeItem(key);
}