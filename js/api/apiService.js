import { API_BASE_URL, MAX_REAL_ID } from './config.js';


async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options
    };
    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        if (response.status === 204) return null;
        return await response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}


export async function fetchPosts(limit = 30) {
    return request(`/posts?_limit=${limit}`);
}

export async function fetchPostById(id) {
    return request(`/posts/${id}`);
}

export async function createPost(post) {
    return request('/posts', {
        method: 'POST',
        body: JSON.stringify(post)
    });
}

export async function updatePost(id, post) {
    if (id > MAX_REAL_ID) {
        console.warn(`updatePost: ID ${id} превышает максимальный реальный ID, запрос пропущен`);
        return null;
    }
    return request(`/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(post)
    });
}

export async function deletePost(id) {
    if (id > MAX_REAL_ID) {
        console.warn(`deletePost: ID ${id} превышает максимальный реальный ID, запрос пропущен`);
        return null;
    }
    return request(`/posts/${id}`, { method: 'DELETE' });
}


export async function fetchCommentsByPost(postId) {
    return request(`/posts/${postId}/comments`);
}

export async function createComment(comment) {
    return request('/comments', {
        method: 'POST',
        body: JSON.stringify(comment)
    });
}

export async function updateComment(id, comment) {
    if (id > 500) {
        console.warn(`updateComment: ID ${id} пропущен`);
        return null;
    }
    return request(`/comments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(comment)
    });
}

export async function deleteComment(id) {
    if (id > 500) {
        console.warn(`deleteComment: ID ${id} пропущен`);
        return null;
    }
    return request(`/comments/${id}`, { method: 'DELETE' });
}