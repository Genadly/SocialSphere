// Парсинг JSON с обработкой ошибок
export const parseJSON = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parsing error:', error);
    return null;
  }
};

// Форматирование даты
export const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Неверная дата';
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Ошибка даты';
  }
};

// Ограничение текста с учётом слов
export const truncateText = (text, maxLength, useWordBoundary = true) => {
  if (!text || text.length <= maxLength) return text;
  let truncated = text.substr(0, maxLength);
  if (useWordBoundary) {
    truncated = truncated.substr(0, Math.min(truncated.length, truncated.lastIndexOf(' ')));
  }
  return truncated + '...';
};

// Создание DOM элемента из шаблона
export const createElementFromData = (data, template) => {
  try {
    let html = template;
    Object.keys(data).forEach((key) => {
      const placeholder = `{{${key}}}`;
      const value = data[key] || '';
      html = html.replace(new RegExp(placeholder, 'g'), value);
    });
    const templateElement = document.createElement('template');
    templateElement.innerHTML = html.trim();
    return templateElement.content.firstElementChild;
  } catch (error) {
    console.error('Error creating element from template:', error);
    return document.createElement('div');
  }
};

// Форматирование чисел
export const formatNumber = (number, options = {}) => {
  const defaults = { minimumFractionDigits: 0, maximumFractionDigits: 2 };
  return new Intl.NumberFormat('ru-RU', { ...defaults, ...options }).format(number);
};

// Форматирование валюты
export const formatCurrency = (amount, currency = 'RUB') => {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(amount);
};

// Построение строки запроса из объекта
export const buildQueryString = (params) => {
  const searchParams = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    if (params[key] !== null && params[key] !== undefined) {
      searchParams.append(key, params[key]);
    }
  });
  return searchParams.toString();
};

// Безопасное получение вложенного свойства
export const getNestedValue = (obj, path, defaultValue = null) => {
  try {
    const value = path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    console.error('Error getting nested value:', error);
    return defaultValue;
  }
};

// Фильтрация массива объектов
export const filterData = (data, filters) => {
  return data.filter(item => {
    return Object.keys(filters).every(key => {
      const filterValue = filters[key];
      const itemValue = item[key];
      if (filterValue === '' || filterValue === null || filterValue === undefined) return true;
      if (typeof filterValue === 'string') {
        return itemValue.toString().toLowerCase().includes(filterValue.toLowerCase());
      }
      return itemValue === filterValue;
    });
  });
};

// Сортировка массива объектов
export const sortData = (data, key, direction = 'asc') => {
  return [...data].sort((a, b) => {
    let aValue = a[key];
    let bValue = b[key];
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// Генерация уникального ID
export const generateId = (prefix = '') => {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Проверка типов
export const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
export const isArray = (value) => Array.isArray(value);
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};