// Локальное хранилище лайков (так как API не поддерживает)
let likesStorage = JSON.parse(localStorage.getItem('post_likes') || '{}');

export function getPostLikes(postId) {
    return likesStorage[postId] || 0;
}

export function setPostLikes(postId, count) {
    likesStorage[postId] = count;
    localStorage.setItem('post_likes', JSON.stringify(likesStorage));
}

export function toggleLike(postId, currentLiked) {
    let likes = getPostLikes(postId);
    if (currentLiked) {
        likes--;
    } else {
        likes++;
    }
    setPostLikes(postId, likes);
    return { likes, liked: !currentLiked };
}

// Преобразование поста из API в формат UI
export function parsePost(apiPost, localLikes = {}) {
    return {
        id: apiPost.id,
        author: apiPost.userId ? `Пользователь ${apiPost.userId}` : 'Аноним',
        date: new Date().toISOString(),
        content: `${apiPost.title}\n${apiPost.body}`,
        likes: getPostLikes(apiPost.id),
        liked: false,
        comments: []
    };
}

// Парсинг комментариев
export function parseComment(apiComment) {
    return {
        id: apiComment.id,
        author: apiComment.name || 'Гость',
        text: apiComment.body,
        date: new Date().toISOString()
    };
}