class ApiService {
  constructor(baseURL, apiKey = null) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  // GET запрос с авторизацией через параметр api_key
  async get(endpoint, params = {}) {
    try {
      const queryParams = new URLSearchParams({
        ...params,
        ...(this.apiKey && { appid: this.apiKey }),
      }).toString();

      const url = `${this.baseURL}${endpoint}?${queryParams}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('GET request failed:', error);
      throw error;
    }
  }

  // POST запрос
  async post(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('POST request failed:', error);
      throw error;
    }
  }

  // Универсальный метод для различных API
  async fetchFromAPI(endpoint, options = {}) {
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...defaultOptions,
        ...options,
      });
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}

export default ApiService;