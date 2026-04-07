class LocalStorageService {
  constructor() {
    this.storage = window.localStorage;
    this.initializeStorage();
  }

  initializeStorage() {
    // Исправлено: заменяем getItem на get
    if (!this.get('app_settings')) {
      this.set('app_settings', {
        theme: 'light',
        language: 'ru',
        cacheDuration: 3600000, // 1 час
      });
    }
  }

  // Сохранение данных с временной меткой
  set(key, value) {
    try {
      const item = {
        value: value,
        timestamp: new Date().getTime(),
      };
      this.storage.setItem(key, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  // Получение данных с проверкой актуальности
  get(key, defaultValue = null, maxAge = null) {
    try {
      const item = this.storage.getItem(key);
      if (!item) return defaultValue;
      const parsedItem = JSON.parse(item);
      
      if (maxAge && new Date().getTime() - parsedItem.timestamp > maxAge) {
        this.remove(key);
        return defaultValue;
      }
      return parsedItem.value;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  }

  remove(key) {
    try {
      this.storage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }
}

export default LocalStorageService;