/**
 * RoutineMaster • Multi-Calendar Routine & Habit Engine
 * Zero servers, 100% offline, hardware-level phone alarms (RFC 5545 VALARM)
 */

(function () {
  'use strict';

  // ==========================================
  // STORAGE KEYS & CONSTANTS
  // ==========================================
  const STORAGE_KEYS = {
    CALENDARS: 'rm_calendars_v1',
    ROUTINES: 'rm_routines_v1',
    COMPLETED: 'rm_completed_dates_v1',
    VISIBLE_LAYERS: 'rm_visible_layers_v1',
    SETTINGS: 'rm_settings_v1'
  };

  const CURATED_COLORS = [
    '#6366F1', // Indigo
    '#F97316', // Coral Orange
    '#10B981', // Mint Emerald
    '#EC4899', // Rose Pink
    '#F59E0B', // Amber Gold
    '#8B5CF6', // Violet
    '#06B6D4', // Cyan
    '#14B8A6', // Teal
    '#E11D48', // Crimson
    '#84CC16', // Lime Green
    '#3B82F6', // Sky Blue
    '#D946EF'  // Fuchsia
  ];

  const CURATED_EMOJIS = ['🏋️', '🏃', '💼', '🧖', '🎂', '💊', '📚', '🎸', '🐶', '🌿', '🧹', '🚗', '🧘', '☕'];

  // ==========================================
  // INITIAL DEFAULT DATA (If empty)
  // ==========================================
  const DEFAULT_CALENDARS = [
    { id: 'cal_work', name: 'Work Days', icon: '💼', color: '#6366F1', defaultTime: '08:30' },
    { id: 'cal_gym', name: 'Gym Days', icon: '🏋️', color: '#F97316', defaultTime: '17:30' },
    { id: 'cal_running', name: 'Running', icon: '🏃', color: '#10B981', defaultTime: '07:00' },
    { id: 'cal_hair', name: 'Hair & Face', icon: '🧖', color: '#EC4899', defaultTime: '21:00' },
    { id: 'cal_birthdays', name: 'Birthdays', icon: '🎂', color: '#F59E0B', defaultTime: '10:00' }
  ];

  function getSampleRoutines() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');

    // Helper to format offset dates
    function dateOffset(days) {
      const target = new Date(today);
      target.setDate(today.getDate() + days);
      return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    }

    return [
      {
        id: 'rt_sample_1',
        calendarId: 'cal_work',
        title: 'Morning Shift',
        date: dateOffset(0),
        time: '08:30',
        repeat: 'none',
        alarm: '15m',
        notes: 'Shift handover & weekly sync'
      },
      {
        id: 'rt_sample_2',
        calendarId: 'cal_gym',
        title: 'Push Workout (Chest & Triceps)',
        date: dateOffset(0),
        time: '17:30',
        repeat: 'interval:2',
        alarm: '30m',
        notes: 'Bench press, incline dumbbells, lateral raises'
      },
      {
        id: 'rt_sample_3',
        calendarId: 'cal_hair',
        title: 'Rosemary Scalp Treatment & Retinol',
        date: dateOffset(0),
        time: '21:00',
        repeat: 'interval:3',
        alarm: '15m',
        notes: 'Massage scalp for 5 min, wash with sulfate-free shampoo'
      },
      {
        id: 'rt_sample_4',
        calendarId: 'cal_running',
        title: '5km Morning Recovery Run',
        date: dateOffset(1),
        time: '07:00',
        repeat: 'weekly',
        alarm: '15m',
        notes: 'Easy pace zone 2'
      },
      {
        id: 'rt_sample_5',
        calendarId: 'cal_birthdays',
        title: "Sarah's Birthday 🎈",
        date: dateOffset(3),
        time: '10:00',
        repeat: 'yearly',
        alarm: '1d',
        notes: 'Turning 26 • Call & send surprise gift!'
      },
      {
        id: 'rt_sample_6',
        calendarId: 'cal_hair',
        title: 'Deep Conditioning Hair Mask',
        date: dateOffset(4),
        time: '20:30',
        repeat: 'interval:4',
        alarm: '1h',
        notes: 'Leave mask on for 30 minutes with warm towel'
      },
      {
        id: 'rt_sample_7',
        calendarId: 'cal_gym',
        title: 'Pull Workout (Back & Biceps)',
        date: dateOffset(2),
        time: '18:00',
        repeat: 'interval:2',
        alarm: '15m',
        notes: 'Pull-ups, barbell rows, hammer curls'
      },
      {
        id: 'rt_sample_8',
        calendarId: 'cal_work',
        title: 'On-Call Shift Block',
        date: dateOffset(2),
        endDate: dateOffset(4),
        time: '08:00',
        repeat: 'none',
        alarm: '30m',
        notes: '3-day rotation: Primary engineer on-call coverage (multi-day event)'
      }
    ];
  }

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const loadedCalendars = load(STORAGE_KEYS.CALENDARS, DEFAULT_CALENDARS);
  const state = {
    calendars: loadedCalendars,
    routines: load(STORAGE_KEYS.ROUTINES, getSampleRoutines()),
    completed: load(STORAGE_KEYS.COMPLETED, {}), // { 'routineId_YYYY-MM-DD': true }
    visibleLayers: load(STORAGE_KEYS.VISIBLE_LAYERS, loadedCalendars.map(c => c.id)),
    activeFilter: 'global', // 'global' or calendarId
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(), // 0 - 11
    selectedDate: formatDate(new Date()) // 'YYYY-MM-DD'
  };

  // Ensure all calendars exist in visibleLayers if newly added
  state.calendars.forEach(c => {
    if (!state.visibleLayers.includes(c.id)) {
      state.visibleLayers.push(c.id);
    }
  });

  function saveState() {
    save(STORAGE_KEYS.CALENDARS, state.calendars);
    save(STORAGE_KEYS.ROUTINES, state.routines);
    save(STORAGE_KEYS.COMPLETED, state.completed);
    save(STORAGE_KEYS.VISIBLE_LAYERS, state.visibleLayers);
  }

  function load(key, fallback) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch (e) {
      console.warn('Storage read error:', e);
      return fallback;
    }
  }

  function save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error('Storage write error:', e);
    }
  }

  // ==========================================
  // DATE UTILITIES
  // ==========================================
  function formatDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateString(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ==========================================
  // RECURRENCE & MULTI-DAY EVALUATION
  // ==========================================
  /**
   * Determines if a routine falls on a given date string (YYYY-MM-DD)
   */
  function doesRoutineOccurOnDate(routine, targetDateStr) {
    const origin = parseDateString(routine.date);
    const target = parseDateString(targetDateStr);

    // 1. Multi-day span check (Start Date to End Date)
    if (routine.endDate && routine.endDate >= routine.date) {
      const end = parseDateString(routine.endDate);
      if (target >= origin && target <= end) {
        return true;
      }
    }

    // If target date is before origin date, it doesn't occur
    if (target < origin && routine.repeat !== 'yearly') return false;

    if (routine.date === targetDateStr) return true;
    if (!routine.repeat || routine.repeat === 'none') return false;

    const diffDays = Math.round((target - origin) / (1000 * 60 * 60 * 24));

    if (routine.repeat === 'daily') {
      return diffDays >= 0;
    }

    if (routine.repeat.startsWith('interval:')) {
      const interval = parseInt(routine.repeat.split(':')[1], 10);
      return diffDays >= 0 && diffDays % interval === 0;
    }

    if (routine.repeat === 'weekly') {
      return diffDays >= 0 && diffDays % 7 === 0;
    }

    if (routine.repeat === 'biweekly') {
      return diffDays >= 0 && diffDays % 14 === 0;
    }

    if (routine.repeat === 'monthly') {
      return target.getDate() === origin.getDate();
    }

    if (routine.repeat === 'yearly') {
      return target.getMonth() === origin.getMonth() && target.getDate() === origin.getDate();
    }

    return false;
  }

  function getMultiDayInfo(routine, targetDateStr) {
    if (!routine.endDate || routine.endDate <= routine.date) return null;
    const start = parseDateString(routine.date);
    const end = parseDateString(routine.endDate);
    const current = parseDateString(targetDateStr);

    if (current < start || current > end) return null;

    const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const dayIndex = Math.round((current - start) / (1000 * 60 * 60 * 24)) + 1;

    return {
      isMultiDay: true,
      totalDays,
      dayIndex,
      isStart: dayIndex === 1,
      isEnd: dayIndex === totalDays
    };
  }

  function formatDateShort(d) {
    return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
  }

  // ==========================================
  // DOM REFERENCES
  // ==========================================
  const el = {
    monthDisplay: document.getElementById('current-month-display'),
    yearDisplay: document.getElementById('current-year-display'),
    prevMonthBtn: document.getElementById('prev-month-btn'),
    nextMonthBtn: document.getElementById('next-month-btn'),
    todayBtn: document.getElementById('today-btn'),
    calendarRibbon: document.getElementById('calendar-ribbon'),
    addCalendarTypeBtn: document.getElementById('add-calendar-type-btn'),
    daysGrid: document.getElementById('days-grid'),
    filterStatusLabel: document.getElementById('active-filter-label'),
    openLayerFilterBtn: document.getElementById('open-layer-filter-btn'),
    deckDayBadge: document.getElementById('deck-day-badge'),
    deckDateTitle: document.getElementById('deck-date-title'),
    routinesList: document.getElementById('routines-list'),
    addRoutineBtn: document.getElementById('add-routine-btn'),
    syncAlarmsBtn: document.getElementById('sync-alarms-btn'),
    settingsMenuBtn: document.getElementById('settings-menu-btn'),
    toast: document.getElementById('toast'),

    // Modals
    layerFilterModal: document.getElementById('layer-filter-modal'),
    layerTogglesList: document.getElementById('layer-toggles-list'),
    layerActiveCountText: document.getElementById('layer-active-count-text'),
    filterSelectAllBtn: document.getElementById('filter-select-all-btn'),
    filterDeselectAllBtn: document.getElementById('filter-deselect-all-btn'),

    eventDetailsModal: document.getElementById('event-details-modal'),
    detailsCategoryPill: document.getElementById('details-category-pill'),
    detailsCatEmoji: document.getElementById('details-cat-emoji'),
    detailsCatName: document.getElementById('details-cat-name'),
    detailsEventTitle: document.getElementById('details-event-title'),
    detailsDateTime: document.getElementById('details-date-time'),
    detailsRecurrence: document.getElementById('details-recurrence'),
    detailsAlarmInfo: document.getElementById('details-alarm-info'),
    detailsStatusBadge: document.getElementById('details-status-badge'),
    detailsNotesContent: document.getElementById('details-notes-content'),
    detailsToggleDoneBtn: document.getElementById('details-toggle-done-btn'),
    detailsDoneBtnText: document.getElementById('details-done-btn-text'),
    detailsEditBtn: document.getElementById('details-edit-btn'),

    routineModal: document.getElementById('routine-modal'),
    routineForm: document.getElementById('routine-form'),
    routineModalTitle: document.getElementById('routine-modal-title'),
    routineCalendarSelect: document.getElementById('routine-calendar-select'),
    routineDateInput: document.getElementById('routine-date-input'),
    routineEndDateInput: document.getElementById('routine-end-date-input'),
    multiDayPreviewBadge: document.getElementById('multi-day-preview-badge'),
    multiDayCountText: document.getElementById('multi-day-count-text'),
    deleteRoutineBtn: document.getElementById('delete-routine-btn'),

    calendarTypeModal: document.getElementById('calendar-type-modal'),
    calendarTypeForm: document.getElementById('calendar-type-form'),
    calModalTitle: document.getElementById('cal-modal-title'),
    calNameInput: document.getElementById('cal-name-input'),
    livePreviewPill: document.getElementById('live-preview-pill'),
    previewEmoji: document.getElementById('preview-emoji'),
    previewText: document.getElementById('preview-text'),
    emojiPickerGrid: document.getElementById('emoji-picker-grid'),
    customEmojiInput: document.getElementById('custom-emoji-input'),
    colorPaletteGrid: document.getElementById('color-palette-grid'),
    selectedCalColor: document.getElementById('selected-cal-color'),
    calDefaultTime: document.getElementById('cal-default-time'),
    deleteCalendarBtn: document.getElementById('delete-calendar-btn'),

    syncModal: document.getElementById('sync-modal'),
    syncCalendarTarget: document.getElementById('sync-calendar-target'),
    exportIcsBtn: document.getElementById('export-ics-btn'),

    settingsModal: document.getElementById('settings-modal'),
    enableWebNotifyBtn: document.getElementById('enable-web-notify-btn'),
    exportJsonBtn: document.getElementById('export-json-btn'),
    importJsonFile: document.getElementById('import-json-file'),
    resetDataBtn: document.getElementById('reset-data-btn')
  };

  // ==========================================
  // INITIALIZATION
  // ==========================================
  function init() {
    renderCalendarRibbon();
    renderMonthMatrix();
    renderDayDeck();
    initColorAndEmojiPickers();
    bindEvents();
    checkNotificationStatus();
  }

  // ==========================================
  // CALENDAR RIBBON (Top Layer Selector)
  // ==========================================
  function renderCalendarRibbon() {
    el.calendarRibbon.innerHTML = '';

    // 1. "Global" master lens pill
    const globalChip = document.createElement('div');
    const isGlobal = state.activeFilter === 'global';
    const totalCals = state.calendars.length;
    const activeLayersCount = state.visibleLayers.length;
    const layerCountSuffix = (isGlobal && activeLayersCount < totalCals) ? ` (${activeLayersCount}/${totalCals})` : '';

    globalChip.className = `layer-chip ${isGlobal ? 'active' : ''}`;
    globalChip.innerHTML = `
      <span class="chip-dot" style="background: linear-gradient(135deg, #6366f1, #ec4899);"></span>
      <span>🌐 Global${layerCountSuffix}</span>
      <span class="chip-options-trigger" title="Layer Filter Matrix">⚡</span>
    `;

    globalChip.addEventListener('click', (e) => {
      if (e.target.classList.contains('chip-options-trigger')) {
        e.stopPropagation();
        openLayerFilterModal();
      } else {
        if (state.activeFilter === 'global') {
          openLayerFilterModal();
        } else {
          state.activeFilter = 'global';
          updateFilterDisplay();
        }
      }
    });
    el.calendarRibbon.appendChild(globalChip);

    // 2. Individual user calendars
    state.calendars.forEach(cal => {
      const chip = document.createElement('div');
      const isActive = state.activeFilter === cal.id;
      chip.className = `layer-chip ${isActive ? 'active' : ''}`;
      
      // Dynamic styles when active
      if (isActive) {
        chip.style.setProperty('--chip-active-bg', `${cal.color}26`);
        chip.style.setProperty('--chip-active-border', cal.color);
        chip.style.setProperty('--chip-active-text', '#ffffff');
        chip.style.setProperty('--chip-active-glow', `${cal.color}40`);
      }

      chip.innerHTML = `
        <span>${cal.icon}</span>
        <span>${escapeHtml(cal.name)}</span>
        <span class="chip-options-trigger" title="Edit Calendar">⚙️</span>
      `;

      // Tap pill body to filter
      chip.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip-options-trigger')) {
          e.stopPropagation();
          openEditCalendarModal(cal.id);
        } else {
          state.activeFilter = cal.id;
          updateFilterDisplay();
        }
      });

      el.calendarRibbon.appendChild(chip);
    });

    // Populate select dropdowns in modals
    populateCalendarDropdowns();
  }

  function updateFilterDisplay() {
    renderCalendarRibbon();
    renderMonthMatrix();
    renderDayDeck();

    if (state.activeFilter === 'global') {
      const total = state.calendars.length;
      const visible = state.visibleLayers.length;
      if (visible === total) {
        el.filterStatusLabel.textContent = `Showing All Calendars (${total} active)`;
      } else {
        el.filterStatusLabel.textContent = `Global Matrix: ${visible} of ${total} layers active`;
      }
      el.openLayerFilterBtn.classList.remove('hidden');
    } else {
      const cal = state.calendars.find(c => c.id === state.activeFilter);
      el.filterStatusLabel.textContent = cal ? `Filtered to: ${cal.icon} ${cal.name}` : 'Showing routines';
      el.openLayerFilterBtn.classList.add('hidden');
    }
  }

  function populateCalendarDropdowns() {
    // 1. Routine category select
    el.routineCalendarSelect.innerHTML = state.calendars.map(c => 
      `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`
    ).join('');

    // 2. Sync target select
    el.syncCalendarTarget.innerHTML = `
      <option value="all">🌟 All Active Calendars (Combined)</option>
      ${state.calendars.map(c => `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)} Only</option>`).join('')}
    `;
  }

  // ==========================================
  // MONTH CALENDAR MATRIX GENERATOR
  // ==========================================
  function renderMonthMatrix() {
    const year = state.viewYear;
    const month = state.viewMonth;

    el.monthDisplay.textContent = MONTH_NAMES[month];
    el.yearDisplay.textContent = year;

    el.daysGrid.innerHTML = '';

    // First day of month (0 = Sun, 1 = Mon ... 6 = Sat)
    const firstDay = new Date(year, month, 1);
    let startDayOfWeek = firstDay.getDay(); // 0 is Sunday
    // Convert to Monday = 0, Sunday = 6
    startDayOfWeek = (startDayOfWeek === 0) ? 6 : startDayOfWeek - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayStr = formatDate(new Date());

    // 1. Trailing days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const cell = document.createElement('div');
      cell.className = 'day-cell other-month';
      cell.innerHTML = `<span class="day-number">${dayNum}</span>`;
      el.daysGrid.appendChild(cell);
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cell = document.createElement('div');
      cell.className = 'day-cell';
      cell.dataset.date = dateStr;

      if (dateStr === todayStr) cell.classList.add('today');
      if (dateStr === state.selectedDate) cell.classList.add('selected');

      // Find routines occurring on this day
      const dayRoutines = state.routines.filter(rt => {
        if (state.activeFilter === 'global') {
          if (state.visibleLayers && !state.visibleLayers.includes(rt.calendarId)) return false;
        } else {
          if (rt.calendarId !== state.activeFilter) return false;
        }
        return doesRoutineOccurOnDate(rt, dateStr);
      });

      // Event chips & title markup
      let eventsHtml = '';
      if (dayRoutines.length > 0) {
        eventsHtml += '<div class="day-events-wrapper">';

        if (dayRoutines.length === 1) {
          // Exactly 1 event: show one long event title (can wrap up to 2 lines)
          const rt = dayRoutines[0];
          const completionKey = `${rt.id}_${dateStr}`;
          const isCompleted = !!state.completed[completionKey];
          const cal = state.calendars.find(c => c.id === rt.calendarId) || { color: '#6366F1' };
          const multi = getMultiDayInfo(rt, dateStr);
          const multiClass = multi ? `multi-day ${multi.isStart ? 'range-start' : ''} ${multi.isEnd ? 'range-end' : ''}` : '';
          const titleText = multi ? `${escapeHtml(rt.title)} (${multi.dayIndex}/${multi.totalDays})` : escapeHtml(rt.title);

          eventsHtml += `
            <div class="day-event-chip single-event ${isCompleted ? 'completed' : ''} ${multiClass}" 
                 data-rt-id="${rt.id}"
                 style="--chip-bg:${cal.color}22; --chip-color:${cal.color}; --chip-border:${cal.color}55;"
                 title="${escapeHtml(rt.title)}">
              ${titleText}
            </div>
          `;
        } else {
          // 2 or 3 events: show 2 or 3 titles (compact single line, ellipsis if long)
          const maxVisible = 3;
          dayRoutines.slice(0, maxVisible).forEach(rt => {
            const completionKey = `${rt.id}_${dateStr}`;
            const isCompleted = !!state.completed[completionKey];
            const cal = state.calendars.find(c => c.id === rt.calendarId) || { color: '#6366F1' };
            const multi = getMultiDayInfo(rt, dateStr);
            const multiClass = multi ? `multi-day ${multi.isStart ? 'range-start' : ''} ${multi.isEnd ? 'range-end' : ''}` : '';
            const titleText = multi ? `${escapeHtml(rt.title)} (${multi.dayIndex}/${multi.totalDays})` : escapeHtml(rt.title);

            eventsHtml += `
              <div class="day-event-chip multi-event ${isCompleted ? 'completed' : ''} ${multiClass}" 
                   data-rt-id="${rt.id}"
                   style="--chip-bg:${cal.color}22; --chip-color:${cal.color}; --chip-border:${cal.color}55;"
                   title="${escapeHtml(rt.title)}">
                ${titleText}
              </div>
            `;
          });

          if (dayRoutines.length > maxVisible) {
            eventsHtml += `<div class="day-overflow-more">+${dayRoutines.length - maxVisible} more</div>`;
          }
        }

        eventsHtml += '</div>';
      }

      cell.innerHTML = `
        <span class="day-number">${day}</span>
        ${eventsHtml}
      `;

      // Tap on event chip opens details sheet directly
      cell.querySelectorAll('.day-event-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          const rtId = chip.dataset.rtId;
          const rt = state.routines.find(r => r.id === rtId);
          if (rt) {
            state.selectedDate = dateStr;
            document.querySelectorAll('.day-cell.selected').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            renderDayDeck();
            openEventDetailsModal(rt, dateStr);
          }
        });
      });

      cell.addEventListener('click', () => {
        state.selectedDate = dateStr;
        document.querySelectorAll('.day-cell.selected').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        renderDayDeck();
      });

      el.daysGrid.appendChild(cell);
    }

    // 3. Leading days for next month to complete 35 or 42 grid
    const totalCells = startDayOfWeek + daysInMonth;
    const remainingCells = (totalCells % 7 === 0) ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
      const cell = document.createElement('div');
      cell.className = 'day-cell other-month';
      cell.innerHTML = `<span class="day-number">${day}</span>`;
      el.daysGrid.appendChild(cell);
    }
  }

  // ==========================================
  // TACTILE DAY AGENDA DECK
  // ==========================================
  function renderDayDeck() {
    const selected = parseDateString(state.selectedDate);
    const todayStr = formatDate(new Date());

    // Header badge & title
    if (state.selectedDate === todayStr) {
      el.deckDayBadge.textContent = 'Today';
      el.deckDayBadge.style.color = 'var(--accent-primary)';
    } else {
      const dayDiff = Math.round((selected - new Date(todayStr)) / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) el.deckDayBadge.textContent = 'Tomorrow';
      else if (dayDiff === -1) el.deckDayBadge.textContent = 'Yesterday';
      else el.deckDayBadge.textContent = DAY_NAMES[selected.getDay()];
      el.deckDayBadge.style.color = 'var(--text-muted)';
    }

    el.deckDateTitle.textContent = `${DAY_NAMES[selected.getDay()]}, ${MONTH_NAMES[selected.getMonth()]} ${selected.getDate()}`;

    // Get matching routines
    const dayRoutines = state.routines.filter(rt => {
      if (state.activeFilter === 'global') {
        if (state.visibleLayers && !state.visibleLayers.includes(rt.calendarId)) return false;
      } else {
        if (rt.calendarId !== state.activeFilter) return false;
      }
      return doesRoutineOccurOnDate(rt, state.selectedDate);
    });

    if (dayRoutines.length === 0) {
      el.routinesList.innerHTML = `
        <div class="empty-routines-state">
          <span class="empty-icon">☕</span>
          <p>No routines scheduled for this day</p>
          <span style="font-size:0.75rem; color:var(--text-muted);">Tap "+ Add Routine" above to create one</span>
        </div>
      `;
      return;
    }

    el.routinesList.innerHTML = '';

    dayRoutines.forEach(rt => {
      const cal = state.calendars.find(c => c.id === rt.calendarId) || {
        name: 'General',
        icon: '📌',
        color: '#6366f1'
      };

      const completionKey = `${rt.id}_${state.selectedDate}`;
      const isCompleted = !!state.completed[completionKey];

      const card = document.createElement('div');
      card.className = `routine-card ${isCompleted ? 'completed' : ''}`;
      card.style.setProperty('--card-accent', cal.color);

      const multi = getMultiDayInfo(rt, state.selectedDate);
      const multiBadge = multi ? `<span>• 📅 Day ${multi.dayIndex}/${multi.totalDays}</span>` : '';

      card.innerHTML = `
        <div class="routine-left" title="Tap to View Details">
          <span class="routine-emoji-tag">${cal.icon}</span>
          <div class="routine-details">
            <div class="routine-meta-line" style="color: ${cal.color};">
              <span>${escapeHtml(cal.name)}</span>
              ${multiBadge}
              ${rt.time ? `<span>• ${rt.time}</span>` : ''}
              ${rt.alarm && rt.alarm !== 'none' ? `<span>• 🔔 ${rt.alarm}</span>` : ''}
            </div>
            <div class="routine-title">${escapeHtml(rt.title)}</div>
            ${rt.notes ? `<div class="routine-notes">${escapeHtml(rt.notes)}</div>` : ''}
          </div>
        </div>
        <button class="routine-check-btn" title="Mark Done" aria-label="Toggle Complete">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      `;

      // Checkbox action
      const checkBtn = card.querySelector('.routine-check-btn');
      checkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleRoutineCompletion(completionKey);
      });

      // Card body opens rich details sheet (notes, steps, alarm info)
      const leftPart = card.querySelector('.routine-left');
      leftPart.addEventListener('click', () => {
        openEventDetailsModal(rt, state.selectedDate);
      });

      el.routinesList.appendChild(card);
    });
  }

  function toggleRoutineCompletion(key) {
    state.completed[key] = !state.completed[key];
    saveState();
    renderMonthMatrix();
    renderDayDeck();
    showToast(state.completed[key] ? 'Routine completed! 🎉' : 'Marked as uncompleted');
  }

  // ==========================================
  // EVENT DETAILS SHEET (View Notes, Steps & Details)
  // ==========================================
  function openEventDetailsModal(routine, dateStr) {
    const cal = state.calendars.find(c => c.id === routine.calendarId) || {
      name: 'Routine',
      icon: '📌',
      color: '#6366F1'
    };

    // Category Pill styling
    el.detailsCategoryPill.style.setProperty('--det-cat-bg', `${cal.color}25`);
    el.detailsCategoryPill.style.setProperty('--det-cat-color', cal.color);
    el.detailsCategoryPill.style.setProperty('--det-cat-border', `${cal.color}60`);
    el.detailsCatEmoji.textContent = cal.icon;
    el.detailsCatName.textContent = cal.name;

    // Title
    el.detailsEventTitle.textContent = routine.title;

    // Date & Time (Handles single day and multi-day spans)
    const timeStr = routine.time || cal.defaultTime || 'Any time';
    const multi = getMultiDayInfo(routine, dateStr);
    if (multi) {
      const s = parseDateString(routine.date);
      const e = parseDateString(routine.endDate);
      el.detailsDateTime.textContent = `${formatDateShort(s)} - ${formatDateShort(e)} (${multi.totalDays} Days • Day ${multi.dayIndex} of ${multi.totalDays}) • ${timeStr}`;
    } else {
      const parsed = parseDateString(dateStr);
      const dayName = DAY_NAMES[parsed.getDay()];
      const monthName = MONTH_NAMES[parsed.getMonth()];
      el.detailsDateTime.textContent = `${dayName}, ${monthName} ${parsed.getDate()} • ${timeStr}`;
    }

    // Recurrence
    let repText = 'One-time only';
    if (routine.repeat === 'daily') repText = 'Every day';
    else if (routine.repeat === 'weekly') repText = 'Every week';
    else if (routine.repeat === 'biweekly') repText = 'Every 2 weeks';
    else if (routine.repeat === 'monthly') repText = 'Monthly';
    else if (routine.repeat === 'yearly') repText = 'Yearly (Annual Milestone)';
    else if (routine.repeat && routine.repeat.startsWith('interval:')) {
      repText = `Every ${routine.repeat.split(':')[1]} days`;
    }
    el.detailsRecurrence.textContent = repText;

    // Hardware Alarm
    if (routine.alarm && routine.alarm !== 'none') {
      let alarmDesc = routine.alarm;
      if (routine.alarm === 'exact') alarmDesc = 'At routine time';
      else if (routine.alarm === '15m') alarmDesc = '15 minutes before';
      else if (routine.alarm === '30m') alarmDesc = '30 minutes before';
      else if (routine.alarm === '1h') alarmDesc = '1 hour before';
      else if (routine.alarm === '1d') alarmDesc = '1 day before (09:00 AM)';
      el.detailsAlarmInfo.textContent = `🔔 ${alarmDesc}`;
    } else {
      el.detailsAlarmInfo.textContent = 'No alarm set';
    }

    // Status & Toggle Button
    const completionKey = `${routine.id}_${dateStr}`;
    const isCompleted = !!state.completed[completionKey];
    el.detailsStatusBadge.textContent = isCompleted ? 'Completed ✅' : 'Pending ⏳';
    el.detailsStatusBadge.style.color = isCompleted ? 'var(--accent-success)' : 'var(--text-muted)';
    el.detailsDoneBtnText.textContent = isCompleted ? 'Mark as Incomplete ↺' : 'Mark Completed ✅';

    // Notes
    if (routine.notes && routine.notes.trim()) {
      el.detailsNotesContent.textContent = routine.notes;
    } else {
      el.detailsNotesContent.innerHTML = '<span style="color:var(--text-muted); font-style:italic;">No additional notes or steps added.</span>';
    }

    // Wire action buttons
    el.detailsToggleDoneBtn.onclick = () => {
      toggleRoutineCompletion(completionKey);
      openEventDetailsModal(routine, dateStr); // Refresh details modal
    };

    el.detailsEditBtn.onclick = () => {
      closeModal(el.eventDetailsModal);
      openEditRoutineModal(routine);
    };

    openModal(el.eventDetailsModal);
  }

  // ==========================================
  // ROUTINE MODAL (Add / Edit)
  // ==========================================
  function openAddRoutineModal() {
    el.routineForm.reset();
    document.getElementById('routine-id').value = '';
    el.routineDateInput.value = state.selectedDate;
    el.routineEndDateInput.value = '';
    updateMultiDayBadge();
    el.routineModalTitle.textContent = `Schedule on ${state.selectedDate}`;
    el.deleteRoutineBtn.classList.add('hidden');

    // Default to active calendar if one is filtered
    if (state.activeFilter !== 'global') {
      el.routineCalendarSelect.value = state.activeFilter;
    }

    openModal(el.routineModal);
  }

  function openEditRoutineModal(rt) {
    document.getElementById('routine-id').value = rt.id;
    el.routineDateInput.value = rt.date;
    el.routineEndDateInput.value = rt.endDate || '';
    updateMultiDayBadge();
    el.routineCalendarSelect.value = rt.calendarId;
    document.getElementById('routine-title-input').value = rt.title;
    document.getElementById('routine-time-input').value = rt.time || '09:00';
    document.getElementById('routine-repeat-select').value = rt.repeat || 'none';
    document.getElementById('routine-alarm-select').value = rt.alarm || '15m';
    document.getElementById('routine-notes-input').value = rt.notes || '';

    el.routineModalTitle.textContent = 'Edit Routine';
    el.deleteRoutineBtn.classList.remove('hidden');
    openModal(el.routineModal);
  }

  function updateMultiDayBadge() {
    const start = el.routineDateInput.value;
    const end = el.routineEndDateInput.value;
    if (start && end && end > start) {
      const s = parseDateString(start);
      const e = parseDateString(end);
      const days = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
      el.multiDayCountText.textContent = `${days} days (${formatDateShort(s)} to ${formatDateShort(e)})`;
      el.multiDayPreviewBadge.classList.remove('hidden');
    } else {
      el.multiDayPreviewBadge.classList.add('hidden');
    }
  }

  el.routineForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('routine-id').value || `rt_${Date.now()}`;
    const date = el.routineDateInput.value || state.selectedDate;
    const endDate = el.routineEndDateInput.value ? el.routineEndDateInput.value : null;

    if (endDate && endDate < date) {
      showToast('End date cannot be earlier than start date');
      return;
    }

    const calendarId = el.routineCalendarSelect.value;
    const title = document.getElementById('routine-title-input').value.trim();
    const time = document.getElementById('routine-time-input').value;
    const repeat = document.getElementById('routine-repeat-select').value;
    const alarm = document.getElementById('routine-alarm-select').value;
    const notes = document.getElementById('routine-notes-input').value.trim();

    const existingIndex = state.routines.findIndex(r => r.id === id);
    const routineData = { id, calendarId, title, date, endDate, time, repeat, alarm, notes };

    if (existingIndex >= 0) {
      state.routines[existingIndex] = routineData;
      showToast('Routine updated');
    } else {
      state.routines.push(routineData);
      showToast(endDate ? 'Multi-day event scheduled! 📅' : 'Routine scheduled! 📅');
    }

    saveState();
    closeModal(el.routineModal);
    renderMonthMatrix();
    renderDayDeck();
  });

  el.deleteRoutineBtn.addEventListener('click', () => {
    const id = document.getElementById('routine-id').value;
    if (confirm('Are you sure you want to delete this routine?')) {
      state.routines = state.routines.filter(r => r.id !== id);
      saveState();
      closeModal(el.routineModal);
      renderMonthMatrix();
      renderDayDeck();
      showToast('Routine deleted');
    }
  });

  // ==========================================
  // CALENDAR TYPE MANAGEMENT (Create / Edit / Delete)
  // ==========================================
  function openAddCalendarModal() {
    el.calendarTypeForm.reset();
    document.getElementById('edit-calendar-id').value = '';
    el.calModalTitle.textContent = 'New Calendar Type';
    el.deleteCalendarBtn.classList.add('hidden');
    
    // Default selection
    setSelectedColor(CURATED_COLORS[0]);
    setSelectedEmoji('🌿');
    el.previewText.textContent = 'My Routine';
    el.calDefaultTime.value = '09:00';

    openModal(el.calendarTypeModal);
  }

  function openEditCalendarModal(calId) {
    const cal = state.calendars.find(c => c.id === calId);
    if (!cal) return;

    document.getElementById('edit-calendar-id').value = cal.id;
    el.calModalTitle.textContent = `Edit ${cal.name}`;
    el.calNameInput.value = cal.name;
    el.calDefaultTime.value = cal.defaultTime || '09:00';

    setSelectedColor(cal.color);
    setSelectedEmoji(cal.icon);
    el.previewText.textContent = cal.name;

    el.deleteCalendarBtn.classList.remove('hidden');
    openModal(el.calendarTypeModal);
  }

  function initColorAndEmojiPickers() {
    // 1. Color Palette
    el.colorPaletteGrid.innerHTML = '';
    CURATED_COLORS.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.addEventListener('click', () => setSelectedColor(color));
      el.colorPaletteGrid.appendChild(swatch);
    });

    // 2. Emoji Selector
    el.emojiPickerGrid.innerHTML = '';
    CURATED_EMOJIS.forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-choice-btn';
      btn.textContent = emoji;
      btn.addEventListener('click', () => setSelectedEmoji(emoji));
      el.emojiPickerGrid.appendChild(btn);
    });

    // Custom emoji input
    el.customEmojiInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) setSelectedEmoji(val, true);
    });

    // Name input live preview
    el.calNameInput.addEventListener('input', (e) => {
      el.previewText.textContent = e.target.value.trim() || 'My Routine';
    });
  }

  function setSelectedColor(color) {
    el.selectedCalColor.value = color;
    document.querySelectorAll('.color-swatch').forEach(sw => {
      sw.classList.toggle('selected', sw.dataset.color === color);
    });
    el.livePreviewPill.style.backgroundColor = color;
    el.livePreviewPill.style.boxShadow = `0 4px 14px ${color}50`;
  }

  function setSelectedEmoji(emoji, isCustom = false) {
    el.previewEmoji.textContent = emoji;
    if (!isCustom) {
      el.customEmojiInput.value = '';
      document.querySelectorAll('.emoji-choice-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.textContent === emoji);
      });
    }
  }

  // ==========================================
  // LAYER FILTER MATRIX (Global Mode Multi-Layer Toggle)
  // ==========================================
  function openLayerFilterModal() {
    if (state.activeFilter !== 'global') {
      state.activeFilter = 'global';
      updateFilterDisplay();
    }
    renderLayerFilterList();
    openModal(el.layerFilterModal);
  }

  function renderLayerFilterList() {
    el.layerTogglesList.innerHTML = '';
    const total = state.calendars.length;
    const activeCount = state.visibleLayers.length;
    el.layerActiveCountText.textContent = `${activeCount} of ${total} visible`;

    state.calendars.forEach(cal => {
      const isChecked = state.visibleLayers.includes(cal.id);
      const eventCount = state.routines.filter(r => r.calendarId === cal.id).length;

      const row = document.createElement('div');
      row.className = `layer-toggle-row ${isChecked ? 'active-layer' : 'disabled-layer'}`;
      row.style.setProperty('--layer-color', cal.color);
      row.style.setProperty('--layer-glow', `${cal.color}40`);

      row.innerHTML = `
        <div class="layer-toggle-left">
          <div class="layer-custom-checkbox">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span class="layer-toggle-emoji">${cal.icon}</span>
          <div class="layer-toggle-info">
            <span class="layer-toggle-name">${escapeHtml(cal.name)}</span>
            <span class="layer-toggle-status">${isChecked ? `${eventCount} events scheduled` : '(temporarily hidden)'}</span>
          </div>
        </div>
        <span class="layer-color-dot-indicator" style="background-color: ${cal.color};"></span>
      `;

      row.addEventListener('click', () => {
        toggleLayerVisibility(cal.id);
      });

      el.layerTogglesList.appendChild(row);
    });
  }

  function toggleLayerVisibility(calId) {
    if (state.visibleLayers.includes(calId)) {
      state.visibleLayers = state.visibleLayers.filter(id => id !== calId);
    } else {
      state.visibleLayers.push(calId);
    }
    saveState();
    renderLayerFilterList();
    updateFilterDisplay();
  }

  el.calendarTypeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-calendar-id').value || `cal_${Date.now()}`;
    const name = el.calNameInput.value.trim();
    const icon = el.previewEmoji.textContent || '📌';
    const color = el.selectedCalColor.value || '#6366F1';
    const defaultTime = el.calDefaultTime.value || '09:00';

    const existingIdx = state.calendars.findIndex(c => c.id === id);
    if (existingIdx >= 0) {
      state.calendars[existingIdx] = { id, name, icon, color, defaultTime };
      showToast(`Updated "${name}"`);
    } else {
      state.calendars.push({ id, name, icon, color, defaultTime });
      if (!state.visibleLayers.includes(id)) {
        state.visibleLayers.push(id);
      }
      showToast(`Created "${name}" calendar!`);
    }

    saveState();
    closeModal(el.calendarTypeModal);
    renderCalendarRibbon();
    renderMonthMatrix();
    renderDayDeck();
  });

  el.deleteCalendarBtn.addEventListener('click', () => {
    const id = document.getElementById('edit-calendar-id').value;
    const cal = state.calendars.find(c => c.id === id);
    if (!cal) return;

    const count = state.routines.filter(r => r.calendarId === id).length;
    const msg = count > 0 
      ? `Delete "${cal.name}" and all ${count} scheduled routines?`
      : `Delete "${cal.name}" calendar?`;

    if (confirm(msg)) {
      state.calendars = state.calendars.filter(c => c.id !== id);
      state.routines = state.routines.filter(r => r.calendarId !== id);
      state.visibleLayers = state.visibleLayers.filter(lid => lid !== id);
      if (state.activeFilter === id) state.activeFilter = 'global';

      saveState();
      closeModal(el.calendarTypeModal);
      renderCalendarRibbon();
      renderMonthMatrix();
      renderDayDeck();
      showToast(`Deleted ${cal.name}`);
    }
  });

  // ==========================================
  // HARDWARE PHONE ALARM ENGINE (RFC 5545 VALARM)
  // ==========================================
  function generateIcsCalendar(targetCalendarId) {
    let routinesToExport = state.routines;

    if (targetCalendarId && targetCalendarId !== 'all') {
      routinesToExport = state.routines.filter(r => r.calendarId === targetCalendarId);
    }

    if (routinesToExport.length === 0) {
      showToast('No routines to export for this calendar');
      return null;
    }

    const pad = (n) => String(n).padStart(2, '0');
    const nowUtc = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RoutineMaster Mobile//Routine Alarms//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:RoutineMaster Alarms',
      'X-WR-TIMEZONE:UTC'
    ];

    routinesToExport.forEach(rt => {
      const cal = state.calendars.find(c => c.id === rt.calendarId) || { name: 'Routine', icon: '⏰' };
      const [year, month, day] = rt.date.split('-').map(Number);
      const [hour, min] = (rt.time || cal.defaultTime || '09:00').split(':').map(Number);

      let dtStart, dtEnd;
      if (rt.endDate && rt.endDate > rt.date) {
        const [eYear, eMonth, eDay] = rt.endDate.split('-').map(Number);
        dtStart = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(min)}00`;
        dtEnd = `${eYear}${pad(eMonth)}${pad(eDay)}T${pad(hour)}${pad(min)}00`;
      } else {
        dtStart = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(min)}00`;
        const endHour = (min + 30 >= 60) ? (hour + 1) % 24 : hour;
        const endMin = (min + 30) % 60;
        dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(endMin)}00`;
      }

      // VALARM Trigger Calculation
      let triggerString = '-PT15M'; // default 15 minutes before
      if (rt.alarm === 'exact') triggerString = 'PT0S';
      else if (rt.alarm === '30m') triggerString = '-PT30M';
      else if (rt.alarm === '1h') triggerString = '-PT1H';
      else if (rt.alarm === '1d') triggerString = '-P1D';

      // RRULE
      let rrule = '';
      if (rt.repeat === 'daily') rrule = 'RRULE:FREQ=DAILY';
      else if (rt.repeat === 'weekly') rrule = 'RRULE:FREQ=WEEKLY';
      else if (rt.repeat === 'biweekly') rrule = 'RRULE:FREQ=WEEKLY;INTERVAL=2';
      else if (rt.repeat === 'monthly') rrule = 'RRULE:FREQ=MONTHLY';
      else if (rt.repeat === 'yearly') rrule = 'RRULE:FREQ=YEARLY';
      else if (rt.repeat && rt.repeat.startsWith('interval:')) {
        const interval = rt.repeat.split(':')[1];
        rrule = `RRULE:FREQ=DAILY;INTERVAL=${interval}`;
      }

      ics.push('BEGIN:VEVENT');
      ics.push(`UID:${rt.id}_${Date.now()}@routinemaster.app`);
      ics.push(`DTSTAMP:${nowUtc}`);
      ics.push(`DTSTART:${dtStart}`);
      ics.push(`DTEND:${dtEnd}`);
      ics.push(`SUMMARY:${cal.icon} ${rt.title}`);
      if (rt.notes) ics.push(`DESCRIPTION:${rt.notes.replace(/\n/g, '\\n')}`);
      if (rrule) ics.push(rrule);

      // Embedded Hardware System Alarm
      if (rt.alarm !== 'none') {
        ics.push('BEGIN:VALARM');
        ics.push('ACTION:DISPLAY');
        ics.push(`DESCRIPTION:Routine: ${cal.icon} ${rt.title}`);
        ics.push(`TRIGGER:${triggerString}`);
        ics.push('END:VALARM');
      }

      ics.push('END:VEVENT');
    });

    ics.push('END:VCALENDAR');
    return ics.join('\r\n');
  }

  function downloadIcsAlarms() {
    const target = el.syncCalendarTarget.value;
    const icsContent = generateIcsCalendar(target);
    if (!icsContent) return;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `routinemaster_alarms_${formatDate(new Date())}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    closeModal(el.syncModal);
    showToast('Alarms file downloaded! Open it to add to Phone Calendar 📲');
  }

  // ==========================================
  // IN-BROWSER NOTIFICATION API (Companion)
  // ==========================================
  function checkNotificationStatus() {
    if (!('Notification' in window)) {
      el.enableWebNotifyBtn.textContent = 'Unsupported';
      el.enableWebNotifyBtn.disabled = true;
      return;
    }
    if (Notification.permission === 'granted') {
      el.enableWebNotifyBtn.textContent = 'Active ✓';
      el.enableWebNotifyBtn.style.color = 'var(--accent-success)';
      el.enableWebNotifyBtn.disabled = true;
    } else {
      el.enableWebNotifyBtn.textContent = 'Enable';
    }
  }

  el.enableWebNotifyBtn.addEventListener('click', async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      checkNotificationStatus();
      new Notification('RoutineMaster Ready! 🔔', {
        body: 'You will receive quick in-browser routine alerts.',
        icon: 'icons/icon-192.png'
      });
      showToast('Notifications enabled!');
    }
  });

  // ==========================================
  // BACKUP & RESTORE (JSON)
  // ==========================================
  el.exportJsonBtn.addEventListener('click', () => {
    const backupData = {
      version: 1,
      exportDate: new Date().toISOString(),
      calendars: state.calendars,
      routines: state.routines,
      completed: state.completed
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `routinemaster_backup_${formatDate(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Backup saved!');
  });

  el.importJsonFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.calendars && data.routines) {
          state.calendars = data.calendars;
          state.routines = data.routines;
          state.completed = data.completed || {};
          saveState();
          renderCalendarRibbon();
          renderMonthMatrix();
          renderDayDeck();
          closeModal(el.settingsModal);
          showToast('Data imported successfully! ✨');
        } else {
          alert('Invalid backup file format');
        }
      } catch (err) {
        alert('Failed to read file: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  el.resetDataBtn.addEventListener('click', () => {
    if (confirm('Reset all routines and calendars to initial sample data?')) {
      state.calendars = DEFAULT_CALENDARS;
      state.routines = getSampleRoutines();
      state.completed = {};
      state.visibleLayers = DEFAULT_CALENDARS.map(c => c.id);
      saveState();
      renderCalendarRibbon();
      renderMonthMatrix();
      renderDayDeck();
      closeModal(el.settingsModal);
      showToast('Reset to default sample data');
    }
  });

  // ==========================================
  // EVENT LISTENERS & NAVIGATION
  // ==========================================
  function bindEvents() {
    // Month navigation
    el.prevMonthBtn.addEventListener('click', () => {
      if (state.viewMonth === 0) {
        state.viewMonth = 11;
        state.viewYear--;
      } else {
        state.viewMonth--;
      }
      renderMonthMatrix();
    });

    el.nextMonthBtn.addEventListener('click', () => {
      if (state.viewMonth === 11) {
        state.viewMonth = 0;
        state.viewYear++;
      } else {
        state.viewMonth++;
      }
      renderMonthMatrix();
    });

    el.todayBtn.addEventListener('click', () => {
      const now = new Date();
      state.viewYear = now.getFullYear();
      state.viewMonth = now.getMonth();
      state.selectedDate = formatDate(now);
      renderMonthMatrix();
      renderDayDeck();
    });

    // Modals triggers
    el.addRoutineBtn.addEventListener('click', openAddRoutineModal);
    el.addCalendarTypeBtn.addEventListener('click', openAddCalendarModal);
    el.openLayerFilterBtn.addEventListener('click', openLayerFilterModal);
    el.syncAlarmsBtn.addEventListener('click', () => openModal(el.syncModal));
    el.settingsMenuBtn.addEventListener('click', () => openModal(el.settingsModal));
    el.exportIcsBtn.addEventListener('click', downloadIcsAlarms);

    // Layer Filter Matrix buttons
    el.filterSelectAllBtn.addEventListener('click', () => {
      state.visibleLayers = state.calendars.map(c => c.id);
      saveState();
      renderLayerFilterList();
      updateFilterDisplay();
      showToast('All layers visible');
    });

    el.filterDeselectAllBtn.addEventListener('click', () => {
      state.visibleLayers = [];
      saveState();
      renderLayerFilterList();
      updateFilterDisplay();
      showToast('All layers hidden');
    });

    // Live multi-day preview calculation in form
    el.routineDateInput.addEventListener('input', updateMultiDayBadge);
    el.routineDateInput.addEventListener('change', updateMultiDayBadge);
    el.routineEndDateInput.addEventListener('input', updateMultiDayBadge);
    el.routineEndDateInput.addEventListener('change', updateMultiDayBadge);

    // Modal closing (buttons with data-close and backdrop clicks)
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        closeModal(document.getElementById(modalId));
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });
  }

  // ==========================================
  // MODAL HELPERS
  // ==========================================
  function openModal(modalEl) {
    modalEl.classList.add('open');
    modalEl.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modalEl) {
    modalEl.classList.remove('open');
    modalEl.setAttribute('aria-hidden', 'true');
  }

  // ==========================================
  // TOAST FEEDBACK
  // ==========================================
  let toastTimer = null;
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    el.toast.textContent = msg;
    el.toast.classList.remove('hidden');
    toastTimer = setTimeout(() => {
      el.toast.classList.add('hidden');
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  // Kickoff
  init();

  // Register PWA Service Worker for offline support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('SW registration skipped:', err);
      });
    });
  }
})();
