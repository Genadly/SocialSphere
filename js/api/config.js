// Конфигурация для различных API (согласно заданию, картинка 5)
export const API_CONFIG = {
  weather: {
    url: 'https://api.openweathermap.org/data/2.5',
    apiKey: import.meta.env?.VITE_WEATHER_API_KEY || '92e7571341a216c3af3b83562672134b', // замените на реальный ключ при тестировании
    endpoints: {
      current: '/weather',
      forecast: '/forecast',
    },
  },
  // можно добавить другие API
};

// Фолбэк данные при недоступности API
export const FALLBACK_DATA = {
  weather: {
    temp: 20,
    description: 'Ясно',
    city: 'Минск',
    humidity: 65,
    windSpeed: 3,
    icon: '01d',
  },
};