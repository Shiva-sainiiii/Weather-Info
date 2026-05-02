/* ================================================================
   WeatherLens — Professional Weather Dashboard
   Architecture: Module-pattern with Config, State, DOM, UI layers
   Author: Enhanced for Shiva Saini's Portfolio
   ================================================================ */

'use strict';

/* ─── Configuration ──────────────────────────────────────────── */
const CONFIG = Object.freeze({
  API_KEY:         '0a19b8f1a7ee4f6284064244252711',
  BASE_URL:        'https://api.weatherapi.com/v1',
  FORECAST_DAYS:   3,
  HOURLY_COUNT:    6,
  MAX_RECENT:      5,
  STORAGE_KEY:     'wl_recent_v2',
  RAIN_DROPS:      90,
  STAR_COUNT:      65,
  PARTICLE_COUNT:  55,

  /* Condition code buckets (WeatherAPI codes) */
  CONDITIONS: {
    SUNNY:   [1000],
    CLOUDY:  [1003, 1006, 1009, 1030, 1135, 1147],
    RAIN:    [1063, 1150, 1153, 1168, 1171, 1180, 1183,
              1186, 1189, 1192, 1195, 1198, 1201, 1240, 1243, 1246],
    SNOW:    [1066, 1114, 1117, 1204, 1207, 1210, 1213,
              1216, 1219, 1222, 1225, 1255, 1258],
    THUNDER: [1087, 1273, 1276, 1279, 1282],
  },
});

/* ─── App State ──────────────────────────────────────────────── */
const state = {
  unit:          'c',    // 'c' | 'f'
  data:          null,   // last successful API response
  recentSearches: loadRecents(),
};

function loadRecents() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

/* ─── DOM Cache ──────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const DOM = {
  cityInput:    $('city'),
  searchBtn:    $('btn'),
  clearBtn:     $('clear-btn'),
  geoBtn:       $('geo-btn'),
  unitC:        $('unit-c'),
  unitF:        $('unit-f'),
  dashboard:    $('weather-content'),
  loadingState: $('loading-state'),
  errorState:   $('error-state'),
  errorMsg:     $('error-msg'),
  emptyState:   $('empty-state'),
  recents:      $('recent-searches'),
  retryBtn:     $('retry-btn'),
  rainContainer:$('rain-container'),
  starsLayer:   $('stars-layer'),
};

/* ─── UI State Machine ───────────────────────────────────────── */
const UI = {
  showLoading() {
    this._hideAll();
    DOM.loadingState.classList.remove('hidden');
  },
  showError(msg) {
    this._hideAll();
    DOM.errorMsg.textContent = msg;
    DOM.errorState.classList.remove('hidden');
  },
  showEmpty() {
    this._hideAll();
    DOM.emptyState.classList.remove('hidden');
  },
  showDashboard() {
    this._hideAll();
    // Re-trigger animation by replacing element clone trick
    DOM.dashboard.classList.remove('hidden');
    void DOM.dashboard.offsetWidth; // reflow
  },
  _hideAll() {
    [DOM.loadingState, DOM.errorState, DOM.emptyState, DOM.dashboard]
      .forEach(el => el.classList.add('hidden'));
  },
};

/* ─── Particles ──────────────────────────────────────────────── */
function initParticles() {
  if (typeof particlesJS === 'undefined') return;
  particlesJS('particles-js', {
    particles: {
      number:      { value: CONFIG.PARTICLE_COUNT, density: { enable: true, value_area: 1000 } },
      color:       { value: '#06b6d4' },
      shape:       { type: 'circle' },
      opacity:     { value: 0.18, random: true, anim: { enable: true, speed: 0.6, opacity_min: 0.04 } },
      size:        { value: 2, random: true },
      line_linked: { enable: true, distance: 140, color: '#06b6d4', opacity: 0.08, width: 1 },
      move:        { enable: true, speed: 1.0, direction: 'none', random: true, out_mode: 'out' },
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: { enable: true, mode: 'grab' },
        onclick: { enable: true, mode: 'push' },
      },
      modes: {
        grab:  { distance: 170, line_linked: { opacity: 0.25 } },
        push:  { particles_nb: 2 },
      },
    },
    retina_detect: true,
  });
}

/* ─── Background Effects ─────────────────────────────────────── */
function createStars(count = CONFIG.STAR_COUNT) {
  DOM.starsLayer.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2 + 0.8;
    Object.assign(star.style, {
      width:                `${size}px`,
      height:               `${size}px`,
      top:                  `${Math.random() * 100}%`,
      left:                 `${Math.random() * 100}%`,
      animationDuration:    `${(Math.random() * 3 + 2).toFixed(1)}s`,
      animationDelay:       `${(Math.random() * 3).toFixed(1)}s`,
      opacity:              (Math.random() * 0.4 + 0.1).toFixed(2),
    });
    DOM.starsLayer.appendChild(star);
  }
}

function createRain(count = CONFIG.RAIN_DROPS) {
  DOM.rainContainer.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const drop = document.createElement('div');
    drop.className = 'rain-drop';
    Object.assign(drop.style, {
      left:             `${Math.random() * 100}%`,
      height:           `${(Math.random() * 60 + 20).toFixed(0)}px`,
      animationDuration:`${(Math.random() * 0.7 + 0.5).toFixed(2)}s`,
      animationDelay:   `${(Math.random() * 2).toFixed(2)}s`,
      opacity:          (Math.random() * 0.35 + 0.1).toFixed(2),
    });
    DOM.rainContainer.appendChild(drop);
  }
}

const ALL_WEATHER_CLASSES = [
  'weather-sunny','weather-cloudy','weather-rain',
  'weather-snow','weather-thunder','weather-night','weather-default',
];

function setWeatherTheme(conditionCode, isDay) {
  document.body.classList.remove(...ALL_WEATHER_CLASSES);
  DOM.rainContainer.innerHTML = '';

  if (!isDay) {
    document.body.classList.add('weather-night');
    createStars(90);
    return;
  }

  const { SUNNY, CLOUDY, RAIN, SNOW, THUNDER } = CONFIG.CONDITIONS;

  if (SUNNY.includes(conditionCode)) {
    document.body.classList.add('weather-sunny');
  } else if (CLOUDY.includes(conditionCode)) {
    document.body.classList.add('weather-cloudy');
  } else if (RAIN.includes(conditionCode)) {
    document.body.classList.add('weather-rain');
    createRain();
  } else if (SNOW.includes(conditionCode)) {
    document.body.classList.add('weather-snow');
    createStars(50);
  } else if (THUNDER.includes(conditionCode)) {
    document.body.classList.add('weather-thunder');
  } else {
    document.body.classList.add('weather-default');
  }
}

/* ─── Unit Helpers ───────────────────────────────────────────── */
function toDisplay(celsius) {
  return state.unit === 'f'
    ? Math.round(celsius * 9 / 5 + 32)
    : Math.round(celsius);
}

function unitStr() {
  return state.unit === 'f' ? '°F' : '°C';
}

/* ─── UV Label ───────────────────────────────────────────────── */
function uvInfo(index) {
  if (index <= 2)  return { label: 'Low',       color: '#34d399' };
  if (index <= 5)  return { label: 'Moderate',  color: '#fde047' };
  if (index <= 7)  return { label: 'High',      color: '#fb923c' };
  if (index <= 10) return { label: 'Very High', color: '#f87171' };
  return              { label: 'Extreme',    color: '#c084fc' };
}

/* ─── Recent Searches ────────────────────────────────────────── */
const Recents = {
  push(city) {
    const cleaned = city.trim();
    state.recentSearches = [
      cleaned,
      ...state.recentSearches.filter(c => c.toLowerCase() !== cleaned.toLowerCase()),
    ].slice(0, CONFIG.MAX_RECENT);

    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.recentSearches));
    } catch { /* storage quota exceeded — silently ignore */ }

    this.render();
  },

  render() {
    DOM.recents.innerHTML = '';
    state.recentSearches.forEach(city => {
      const btn = document.createElement('button');
      btn.className = 'recent-tag';
      btn.innerHTML = `<i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>${city}`;
      btn.setAttribute('aria-label', `Search ${city}`);
      btn.addEventListener('click', () => {
        DOM.cityInput.value = city;
        fetchAndRender(city);
      });
      DOM.recents.appendChild(btn);
    });
  },
};

/* ─── API Layer ──────────────────────────────────────────────── */
async function fetchWeather(query) {
  const endpoint = `${CONFIG.BASE_URL}/forecast.json` +
    `?key=${CONFIG.API_KEY}&q=${encodeURIComponent(query)}` +
    `&days=${CONFIG.FORECAST_DAYS}&aqi=no`;

  const response = await fetch(endpoint);

  if (!response.ok && response.status !== 400) {
    throw new Error(`Network error (${response.status}). Please try again.`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

/* ─── Render Pipeline ────────────────────────────────────────── */
function renderDashboard(data) {
  const { location, current, forecast } = data;
  const today = forecast.forecastday[0];
  const isDay  = current.is_day === 1;

  // Dynamic background
  setWeatherTheme(current.condition.code, isDay);

  // Location & time
  $('location-name').textContent = `${location.name}, ${location.country}`;
  const localDT = new Date(location.localtime);
  $('location-time').textContent =
    localDT.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) +
    ' · ' + localDT.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Condition
  $('condition-chip').textContent = current.condition.text;
  const icon = $('current-icon');
  icon.src = `https:${current.condition.icon}`;
  icon.alt = current.condition.text;

  // Temperature
  $('current-temp').textContent      = toDisplay(current.temp_c);
  $('temp-unit-label').textContent   = unitStr();
  $('feels-like').textContent        = `${toDisplay(current.feelslike_c)}${unitStr()}`;
  $('temp-max').textContent          = `${toDisplay(today.day.maxtemp_c)}${unitStr()}`;
  $('temp-min').textContent          = `${toDisplay(today.day.mintemp_c)}${unitStr()}`;

  // Humidity with animated bar
  $('humidity').textContent          = `${current.humidity}%`;
  const bar = $('humidity-bar');
  bar.style.width = '0%';
  requestAnimationFrame(() => {
    bar.style.width = `${current.humidity}%`;
  });

  // Wind
  $('wind').textContent    = `${current.wind_kph} km/h`;
  $('wind-dir').textContent = `Direction: ${current.wind_dir}`;

  // UV
  const uv = uvInfo(current.uv);
  $('uv-index').textContent  = current.uv;
  const uvLabel = $('uv-label');
  uvLabel.textContent        = uv.label;
  uvLabel.style.color        = uv.color;

  // Visibility & Pressure
  $('visibility').textContent = `${current.vis_km} km`;
  $('pressure').textContent   = `${current.pressure_mb} mb`;

  // Sunrise / Sunset
  $('sunrise').textContent = `↑ ${today.astro.sunrise}`;
  $('sunset').textContent  = `↓ ${today.astro.sunset}`;

  // Hourly & Forecast
  renderHourly(today.hour);
  renderForecast(forecast.forecastday);
}

function renderHourly(hours) {
  const container = $('hourly-list');
  container.innerHTML = '';

  const now = new Date();
  const currentHour = now.getHours();
  let rendered = 0;

  for (let i = 0; i < hours.length && rendered < CONFIG.HOURLY_COUNT; i++) {
    const hour = hours[i];
    const hourDate = new Date(hour.time);
    const h = hourDate.getHours();
    if (h < currentHour) continue;

    const isNow = h === currentHour;
    const label = isNow
      ? 'Now'
      : hourDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });

    const el = document.createElement('div');
    el.className = `hourly-item${isNow ? ' is-now' : ''}`;
    el.innerHTML = `
      <span class="hour-label">${label}</span>
      <img src="https:${hour.condition.icon}" alt="${hour.condition.text}" loading="lazy" width="36" height="36">
      <span class="hour-temp">${toDisplay(hour.temp_c)}${unitStr()}</span>
      <span class="hour-rain">
        <i class="fa-solid fa-droplet" aria-hidden="true"></i>${hour.chance_of_rain}%
      </span>
    `;
    container.appendChild(el);
    rendered++;
  }

  // Fill remaining slots if near end of day
  if (rendered === 0) {
    container.innerHTML = '<p style="color:var(--text-3);font-size:13px;padding:10px">No upcoming hourly data.</p>';
  }
}

function renderForecast(days) {
  const container = $('forecast-list');
  container.innerHTML = '';

  days.forEach((day, i) => {
    const date = new Date(day.date + 'T12:00:00');
    const label = i === 0
      ? 'Today'
      : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const card = document.createElement('div');
    card.className = `forecast-card${i === 0 ? ' today' : ''}`;
    card.innerHTML = `
      <span class="forecast-day">${label}</span>
      <img src="https:${day.day.condition.icon}" alt="${day.day.condition.text}" loading="lazy" width="48" height="48">
      <span class="forecast-cond">${day.day.condition.text}</span>
      <div class="forecast-temps">
        <span class="f-max">${toDisplay(day.day.maxtemp_c)}${unitStr()}</span>
        <span class="f-min">/ ${toDisplay(day.day.mintemp_c)}${unitStr()}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

/* ─── Main Fetch & Render ────────────────────────────────────── */
async function fetchAndRender(queryOverride) {
  const city = (queryOverride || DOM.cityInput.value).trim();
  if (!city) return;

  // Easter egg
  const easterEgg = ['parul','chiku','pratibha','shiva ki lugai','chillgozi'];
  if (easterEgg.includes(city.toLowerCase())) {
    showEasterEgg();
    return;
  }

  UI.showLoading();

  try {
    const data = await fetchWeather(city);
    state.data = data;
    renderDashboard(data);
    Recents.push(data.location.name);
    UI.showDashboard();
  } catch (err) {
    UI.showError(err.message || 'Something went wrong. Please try again.');
  }
}

/* ─── Unit Toggle ────────────────────────────────────────────── */
function setUnit(unit) {
  state.unit = unit;
  DOM.unitC.classList.toggle('active', unit === 'c');
  DOM.unitF.classList.toggle('active', unit === 'f');
  DOM.unitC.setAttribute('aria-pressed', unit === 'c');
  DOM.unitF.setAttribute('aria-pressed', unit === 'f');

  if (state.data) {
    renderDashboard(state.data);
    UI.showDashboard();
  }
}

/* ─── Geolocation ────────────────────────────────────────────── */
function handleGeo() {
  if (!navigator.geolocation) {
    UI.showError('Geolocation is not supported by your browser.');
    return;
  }

  DOM.geoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>';
  DOM.geoBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      DOM.cityInput.value = '';
      updateClearBtn();
      await fetchAndRender(`${coords.latitude},${coords.longitude}`);
      DOM.geoBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i>';
      DOM.geoBtn.disabled = false;
    },
    () => {
      UI.showError('Location access denied. Please search manually.');
      DOM.geoBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i>';
      DOM.geoBtn.disabled = false;
    },
    { timeout: 10_000 }
  );
}

/* ─── Easter Egg ─────────────────────────────────────────────── */
function showEasterEgg() {
  document.body.classList.remove(...ALL_WEATHER_CLASSES);
  document.body.classList.add('weather-sunny');
  UI._hideAll();

  const el = DOM.emptyState;
  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="state-icon pulse-icon" style="font-size:44px;background:rgba(251,113,133,.1);border-color:rgba(251,113,133,.25)">🔥</div>
    <h2 style="color:#fb7185;font-size:42px;font-family:var(--ff-display);letter-spacing:2px">9999°C</h2>
    <p>Always Hotty — Shiva ki HeartBeat 🔥❤️</p>
  `;
}

/* ─── Clear Button Helper ────────────────────────────────────── */
function updateClearBtn() {
  DOM.clearBtn.classList.toggle('visible', DOM.cityInput.value.length > 0);
}

/* ─── Event Listeners ────────────────────────────────────────── */
function setupEvents() {
  // Search
  DOM.searchBtn.addEventListener('click', () => fetchAndRender());

  DOM.cityInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') fetchAndRender();
  });

  // Clear
  DOM.cityInput.addEventListener('input', updateClearBtn);
  DOM.clearBtn.addEventListener('click', () => {
    DOM.cityInput.value = '';
    updateClearBtn();
    DOM.cityInput.focus();
  });

  // Geo
  DOM.geoBtn.addEventListener('click', handleGeo);

  // Unit toggle
  DOM.unitC.addEventListener('click', () => setUnit('c'));
  DOM.unitF.addEventListener('click', () => setUnit('f'));

  // Retry
  DOM.retryBtn.addEventListener('click', () => {
    const city = DOM.cityInput.value.trim();
    if (city) fetchAndRender(city);
    else UI.showEmpty();
  });
}

/* ─── Bootstrap ──────────────────────────────────────────────── */
function init() {
  initParticles();
  createStars();
  setupEvents();
  Recents.render();
  UI.showEmpty();

  // Keyboard shortcut: Ctrl/Cmd + K focuses search
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      DOM.cityInput.focus();
    }
  });
}

init();
