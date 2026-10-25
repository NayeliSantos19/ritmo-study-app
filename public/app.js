import {
  dateKey,
  weekDays,
  normalizeImport,
  validateSession,
  demoData,
  summary,
} from './domain.js';
import { icon, fillIcons } from './icons.js';
const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const localKey = 'ritmo-v2';
let data = demoData(),
  user = null,
  mode = 'demo',
  offset = 0,
  view = 'semana',
  authMode = 'login',
  pendingFocus = null;
let localAvailable = true;
try {
  const stored = localStorage.getItem(localKey);
  if (stored) {
    data = normalizeImport(JSON.parse(stored));
    mode = 'local';
  }
} catch {
  localAvailable = false;
}
fillIcons();
const palette = [
  { bg: '#e0ece2', color: '#58835e' },
  { bg: '#deebfb', color: '#4778a7' },
  { bg: '#f6e6d8', color: '#a56840' },
  { bg: '#ebe6f4', color: '#78649b' },
];
function subjectColor(subject) {
  let hash = 0;
  for (const c of subject) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}
function colorStyle(subject) {
  const c = subjectColor(subject);
  return `--event-bg:${c.bg};--event-color:${c.color}`;
}
const formatDate = (date, options = {}) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    ...options,
  });
const duration = (min) =>
  min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`;
function notify(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(notify.timeout);
  notify.timeout = setTimeout(() => ($('toast').hidden = true), 5500);
}
async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Ritmo-Request': '1' },
    ...options,
  });
  const body = await response
    .json()
    .catch(() => ({ error: 'El servidor no devolvió una respuesta válida.' }));
  if (!response.ok) {
    if (response.status === 401 && user) {
      user = null;
      mode = 'demo';
      data = demoData();
      render();
    }
    throw new Error(body.error || 'No pudimos completar la acción. Inténtalo de nuevo.');
  }
  return body;
}
function writeLocal(next) {
  try {
    localStorage.setItem(localKey, JSON.stringify(next));
  } catch {
    throw new Error('No se pudo guardar en este navegador. Libera espacio o exporta tus datos.');
  }
}
async function persist(next, remote) {
  if (mode === 'account') {
    await remote();
  } else {
    if (mode === 'demo')
      next = { ...next, sesiones: next.sesiones.filter((s) => !s.id.startsWith('demo-')) };
    writeLocal(next);
    mode = 'local';
  }
  data = next;
  render();
}
function setBusy(button, busy) {
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
}
function showDialog(id) {
  $(id).showModal();
}
document
  .querySelectorAll('[data-close]')
  .forEach((b) => (b.onclick = () => $(b.dataset.close).close()));
function render() {
  const days = weekDays(offset),
    stats = summary(data.sesiones, days);
  $('study-time').textContent = duration(stats.minutes);
  $('session-count').textContent = stats.count;
  $('goal-number').textContent = `${data.meta} min`;
  $('goal-percent').textContent = `${Math.round((stats.minutes / data.meta) * 100)}%`;
  $('summary-progress').max = data.meta;
  $('summary-progress').value = stats.minutes;
  $('weekly-goal').value = data.meta;
  $('storage-status').textContent =
    mode === 'demo'
      ? 'Vista previa · datos de ejemplo'
      : mode === 'account'
        ? 'Guardado en tu cuenta'
        : 'Guardado en este navegador';
  $('account-button').querySelector('span:last-child').textContent = user
    ? 'Mi cuenta'
    : 'Iniciar sesión';
  $('account-heading').textContent = user ? 'Tu cuenta' : 'Tu espacio personal';
  $('account-explanation').textContent = user
    ? `Sesión iniciada como ${user.email}. Tus sesiones se guardan en el servidor.`
    : 'Crea una cuenta para guardar tu estudio y consultarlo desde otros dispositivos.';
  $('settings-account').textContent = user ? 'Cerrar sesión' : 'Crear cuenta o iniciar sesión';
  $('local-mode').hidden = !!user || mode === 'local';
  $('upload-local-button').hidden = !user || !localAvailable || !readLocal();
  try {
    $('migrate-button').hidden = !localStorage.getItem('ritmo-v1');
  } catch {
    $('migrate-button').hidden = true;
  }
  $('week-label').textContent =
    `${formatDate(days[0])} – ${formatDate(days[6], { year: 'numeric' })}`;
  const sorted = [...data.sesiones].sort((a, b) =>
    (b.fecha + b.hora).localeCompare(a.fecha + a.hora),
  );
  $('recent-sessions').innerHTML = sessionTable(
    sorted.filter((s) => s.estado === 'completed').slice(0, 3),
  );
  renderSessionList();
  renderCalendar(days);
  renderNext();
  renderSubjects();
  $('subjects').innerHTML = [...new Set(data.sesiones.map((s) => s.materia))]
    .sort()
    .map((s) => `<option value="${esc(s)}"></option>`)
    .join('');
}
function renderCalendar(days) {
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  // The entire day is represented. Hours outside the default window appear when sessions need them.
  const weekSessions = data.sesiones.filter((s) => days.includes(s.fecha));
  const start = Math.min(9, ...weekSessions.map((s) => Number(s.hora.slice(0, 2))));
  const end = Math.min(
    24,
    Math.max(
      21,
      ...weekSessions.map((s) =>
        Math.ceil((Number(s.hora.slice(0, 2)) * 60 + Number(s.hora.slice(3)) + s.minutos) / 60),
      ),
    ),
  );
  const hours = Array.from({ length: end - start }, (_, i) => start + i);
  const hourPx =
    window.innerWidth <= 700
      ? 50
      : window.innerWidth >= 1301
        ? Math.min(46, (window.innerWidth * 46) / 1536)
        : 46;
  let html =
    '<div class="calendar-corner" aria-hidden="true"></div>' +
    days
      .map(
        (date, i) =>
          `<div class="day-heading ${date === dateKey() ? 'is-today' : ''}"><time datetime="${date}">${dayNames[i]}</time><span>${Number(date.slice(-2))}</span></div>`,
      )
      .join('');
  html += `<div class="hours" style="height:${hours.length * hourPx}px">${hours.map((h, i) => `<span class="hour-label" style="--i:${i}">${String(h).padStart(2, '0')}:00</span>`).join('')}</div>`;
  days.forEach((date) => {
    const entries = weekSessions
      .filter((s) => s.fecha === date)
      .sort((a, b) => a.hora.localeCompare(b.hora));
    // Connected overlap groups get stable side-by-side lanes instead of covering one another.
    const groups = [];
    for (const s of entries) {
      const t = Number(s.hora.slice(0, 2)) * 60 + Number(s.hora.slice(3));
      let g = groups.at(-1);
      if (!g || t >= g.end) {
        g = { end: 0, items: [], lanes: [] };
        groups.push(g);
      }
      let lane = g.lanes.findIndex((end) => end <= t);
      if (lane < 0) lane = g.lanes.length;
      g.lanes[lane] = t + s.minutos;
      g.end = Math.max(g.end, t + s.minutos);
      g.items.push({ s, t, lane });
    }
    html += `<div class="day-column" style="height:${hours.length * hourPx}px">${hours.map((h) => `<button class="time-slot" data-slot-date="${date}" data-slot-hour="${h}" aria-label="Planificar el ${formatDate(date)} a las ${h}:00"></button>`).join('')}`;
    for (const g of groups)
      for (const { s, t, lane } of g.items) {
        const columns = g.lanes.length;
        const top = ((t - start * 60) / 60) * hourPx;
        const height = Math.max(33, (Math.min(s.minutos, 1440 - t) / 60) * hourPx);
        html += `<button class="event ${s.estado === 'completed' ? 'completed' : ''}" data-edit="${esc(s.id)}" style="${colorStyle(s.materia)};--top:${top}px;--height:${height}px;left:calc(${(lane * 100) / columns}% + 3px);width:calc(${100 / columns}% - 6px)" aria-label="${esc(s.materia)}, ${esc(s.tema)}, ${s.hora}, ${s.minutos} minutos, ${s.estado === 'completed' ? 'completada' : 'planificada'}"><strong>${esc(s.materia)}</strong><small>${s.minutos} min${s.estado === 'completed' ? ' · ✓' : ''}</small></button>`;
      }
    html += '</div>';
  });
  $('calendar-grid').innerHTML = html;
}
function sessionTable(sessions) {
  if (!sessions.length)
    return '<div class="empty"><strong>Un espacio para lo que aprendas.</strong>Registra una sesión para empezar a ver tu progreso.</div>';
  return `<table><thead><tr><th scope="col">Tema</th><th scope="col">Materia</th><th scope="col">Duración</th><th scope="col">Fecha</th><th scope="col"><span class="muted">Editar</span></th></tr></thead><tbody>${sessions.map((s) => `<tr><td>${esc(s.tema)}${s.estado === 'planned' ? '<br><small class="muted">Planificada</small>' : ''}</td><td><span class="subject-tag" style="${colorStyle(s.materia)}">${esc(s.materia)}</span></td><td>${s.minutos} min</td><td>${formatDate(s.fecha)} · ${s.hora}</td><td><button class="icon-button" data-edit="${esc(s.id)}" aria-label="Editar ${esc(s.tema)}">${icon('edit')}</button></td></tr>`).join('')}</tbody></table>`;
}
function renderSessionList() {
  const query = $('search').value.trim().toLocaleLowerCase('es');
  const sessions = data.sesiones
    .filter((s) => (s.tema + ' ' + s.materia).toLocaleLowerCase('es').includes(query))
    .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  $('all-sessions').innerHTML = sessions.length
    ? sessionTable(sessions)
    : `<div class="empty"><strong>${query ? 'Sin coincidencias' : 'Tu recorrido empieza aquí.'}</strong>${query ? 'Prueba con otro tema o materia.' : 'Planifica o registra tu primera sesión.'}</div>`;
}
function nextPlanned() {
  return (
    [...data.sesiones]
      .filter((s) => s.estado === 'planned')
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
      .find((s) => s.fecha >= dateKey()) || null
  );
}
function renderNext() {
  const s = nextPlanned();
  $('next-session').innerHTML = s
    ? `<h3>${esc(s.materia)}</h3><p>${esc(s.tema)}</p><div class="detail">${icon('calendar')}<span>${s.fecha === dateKey() ? 'Hoy' : formatDate(s.fecha)} · ${s.hora}</span></div><div class="detail">${icon('clock')}<span>${s.minutos} min</span></div><div class="detail">${icon('note')}<span>${s.notas ? esc(s.notas.slice(0, 80)) : 'Una tarea, a tu ritmo.'}</span></div>`
    : '<h3>Un espacio para aprender</h3><p>Planifica tu próxima sesión y empieza con una sola tarea.</p><button class="text-button" data-new>Planificar mi primera sesión</button>';
}
function renderSubjects() {
  const names = [...new Set(data.sesiones.map((s) => s.materia))].sort();
  const totals = names.map((name) =>
    data.sesiones
      .filter((s) => s.materia === name && s.estado === 'completed')
      .reduce((sum, s) => sum + s.minutos, 0),
  );
  const max = Math.max(1, ...totals);
  $('subject-list').innerHTML = names.length
    ? names
        .map(
          (name, i) =>
            `<article class="subject-row"><div><h2><span class="subject-tag" style="${colorStyle(name)}">${esc(name)}</span></h2><p>${data.sesiones.filter((s) => s.materia === name).length} sesiones registradas o planificadas</p></div><progress max="${max}" value="${totals[i]}" aria-label="Tiempo completado en ${esc(name)}"></progress><strong>${duration(totals[i])}</strong></article>`,
        )
        .join('')
    : '<div class="empty"><strong>Cada materia tiene su espacio.</strong>Añade una materia al planificar tu primera sesión.</div>';
}
const routes = {
  semana: ['Tu semana, a tu ritmo.', 'Organiza el estudio. Haz espacio para avanzar.'],
  sesiones: ['Lo que vas aprendiendo.', 'Tus sesiones, tus notas y cada paso que cuenta.'],
  materias: ['Cada materia, su espacio.', 'Descubre dónde estás poniendo tu tiempo.'],
  ajustes: ['Hazlo a tu medida.', 'Tu meta, tus datos y tu espacio personal.'],
};
function navigate() {
  view = location.hash.slice(1);
  if (!routes[view]) view = 'semana';
  for (const key of Object.keys(routes)) $(`view-${key}`).hidden = key !== view;
  document.querySelectorAll('[data-view]').forEach((a) => {
    if (a.dataset.view === view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('page-title').textContent = routes[view][0];
  $('page-description').textContent = routes[view][1];
  if (!timer.active)
    document.title = `${{ semana: 'Tu semana', sesiones: 'Mis sesiones', materias: 'Materias', ajustes: 'Ajustes' }[view]} · Ritmo`;
}
function openSession(session = null, date = dateKey(), hour = '15:00', completed = false) {
  $('session-form').reset();
  $('session-error').textContent = '';
  $('session-id').value = session?.id || '';
  $('session-dialog-title').textContent = session
    ? 'Editar sesión'
    : completed
      ? 'Registrar sesión'
      : 'Planificar sesión';
  $('topic').value = session?.tema || '';
  $('subject').value = session?.materia || '';
  $('date').value = session?.fecha || date;
  $('time').value = session?.hora || hour;
  $('minutes').value = session?.minutos || 25;
  $('notes').value = session?.notas || '';
  $('session-status').value = session?.estado || (completed ? 'completed' : 'planned');
  $('delete-session').hidden = !session;
  showDialog('session-dialog');
}
document.addEventListener('click', (e) => {
  const edit = e.target.closest('[data-edit]');
  if (edit) {
    const s = data.sesiones.find((s) => s.id === edit.dataset.edit);
    if (s) openSession(s);
    return;
  }
  const slot = e.target.closest('[data-slot-date]');
  if (slot)
    openSession(
      null,
      slot.dataset.slotDate,
      `${String(slot.dataset.slotHour).padStart(2, '0')}:00`,
    );
  if (e.target.closest('[data-new]')) openSession();
});
$('plan-button').onclick = () => openSession();
$('quick-record').onclick = $('record-button').onclick = () =>
  openSession(null, dateKey(), '15:00', true);
$('session-form').onsubmit = async (e) => {
  e.preventDefault();
  const button = $('save-session');
  setBusy(button, true);
  try {
    const oldId = $('session-id').value;
    const session = {
      id: (mode === 'demo' ? null : oldId) || crypto.randomUUID(),
      ...validateSession({
        tema: $('topic').value,
        materia: $('subject').value,
        fecha: $('date').value,
        hora: $('time').value,
        minutos: Number($('minutes').value),
        notas: $('notes').value,
        estado: $('session-status').value,
      }),
    };
    const next = {
      ...data,
      sesiones: [...data.sesiones.filter((s) => s.id !== session.id), session],
    };
    await persist(next, () =>
      api(`/sessions${oldId ? '/' + encodeURIComponent(oldId) : ''}`, {
        method: oldId ? 'PUT' : 'POST',
        body: JSON.stringify(session),
      }),
    );
    $('session-dialog').close();
    if (timer.completed && session.estado === 'completed') resetTimer();
    notify('Sesión guardada. Un paso más.');
  } catch (error) {
    $('session-error').textContent = error.message;
  } finally {
    setBusy(button, false);
  }
};
async function confirmAction(title, copy, action = 'Eliminar') {
  $('confirm-heading').textContent = title;
  $('confirm-copy').textContent = copy;
  $('confirm-dialog').querySelector('[value=confirm]').textContent = action;
  showDialog('confirm-dialog');
  return new Promise((resolve) =>
    $('confirm-dialog').addEventListener(
      'close',
      () => resolve($('confirm-dialog').returnValue === 'confirm'),
      { once: true },
    ),
  );
}
$('delete-session').onclick = async () => {
  if (
    !(await confirmAction(
      '¿Eliminar esta sesión?',
      'Se eliminará de tu espacio. Esta acción no se puede deshacer.',
    ))
  )
    return;
  const id = $('session-id').value;
  try {
    await persist({ ...data, sesiones: data.sesiones.filter((s) => s.id !== id) }, () =>
      api(`/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    );
    $('session-dialog').close();
    notify('Sesión eliminada.');
  } catch (error) {
    $('session-error').textContent = error.message;
  }
};
$('previous-week').onclick = () => changeWeek(-1);
$('next-week').onclick = () => changeWeek(1);
$('today-button').onclick = () => {
  offset = 0;
  render();
};
function changeWeek(amount) {
  offset += amount;
  render();
  $('calendar-grid').classList.remove('week-enter');
  requestAnimationFrame(() => $('calendar-grid').classList.add('week-enter'));
}
$('search').oninput = renderSessionList;
window.addEventListener('hashchange', navigate);
$('goal-shortcut').onclick = () => {
  location.hash = 'ajustes';
  setTimeout(() => $('weekly-goal').focus(), 50);
};
$('goal-form').onsubmit = async (e) => {
  e.preventDefault();
  const button = e.submitter;
  setBusy(button, true);
  try {
    const meta = Number($('weekly-goal').value);
    if (!Number.isInteger(meta) || meta < 1 || meta > 10080)
      throw new Error('Escribe una meta entre 1 y 10080 minutos.');
    await persist({ ...data, meta }, () =>
      api('/goal', { method: 'PUT', body: JSON.stringify({ meta }) }),
    );
    notify('Tu meta semanal está actualizada.');
  } catch (error) {
    notify(error.message);
  } finally {
    setBusy(button, false);
  }
};
$('export-button').onclick = () => {
  const payload = {
    ...data,
    version: 2,
    exportedAt: new Date().toISOString(),
    example: mode === 'demo',
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `ritmo-${dateKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify(mode === 'demo' ? 'Exportaste los datos de ejemplo.' : 'Copia de seguridad exportada.');
};
async function importData(value) {
  const parsed = normalizeImport(value);
  if (
    !(await confirmAction(
      '¿Importar esta copia?',
      `Se añadirán ${parsed.sesiones.length} sesiones sin duplicar identificadores. La meta cambiará a ${parsed.meta} minutos.`,
      'Importar',
    ))
  )
    return;
  const keep = mode === 'demo' ? [] : data.sesiones;
  const ids = new Set(keep.map((s) => s.id));
  const added = parsed.sesiones.filter((s) => !ids.has(s.id));
  await persist({ sesiones: [...keep, ...added], meta: parsed.meta }, () =>
    api('/import', { method: 'POST', body: JSON.stringify(parsed) }),
  );
  notify(`Importación completada: ${added.length} sesiones añadidas.`);
}
$('import-file').onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2_000_000) throw new Error('La copia debe ocupar menos de 2 MB.');
    await importData(JSON.parse(await file.text()));
  } catch (error) {
    notify(error instanceof SyntaxError ? 'El archivo no contiene JSON válido.' : error.message);
  } finally {
    e.target.value = '';
  }
};
$('migrate-button').onclick = async () => {
  try {
    await importData(JSON.parse(localStorage.getItem('ritmo-v1')));
  } catch (error) {
    notify(error.message);
  }
};
function readLocal() {
  try {
    const raw = localStorage.getItem(localKey);
    return raw ? normalizeImport(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
$('upload-local-button').onclick = async () => {
  try {
    const local = readLocal();
    if (local) await importData(local);
  } catch (error) {
    notify(error.message);
  }
};
$('local-mode').onclick = async () => {
  try {
    const next = { sesiones: [], meta: 300 };
    writeLocal(next);
    data = next;
    mode = 'local';
    render();
    notify('Tu espacio local está listo. Planifica tu primera sesión.');
  } catch (error) {
    notify(error.message);
  }
};
function openAuth() {
  if (user) {
    location.hash = 'ajustes';
    return;
  }
  authMode = 'login';
  updateAuth();
  showDialog('account-dialog');
}
function updateAuth() {
  const register = authMode === 'register';
  $('auth-heading').textContent = register ? 'Un espacio que es tuyo.' : 'Vuelve a tu ritmo.';
  $('auth-description').textContent = register
    ? 'Guarda tu estudio y continúa desde otro dispositivo.'
    : 'Inicia sesión para continuar con tu semana.';
  $('auth-submit').textContent = register ? 'Crear mi cuenta' : 'Iniciar sesión';
  $('auth-switch').textContent = register
    ? 'Ya tengo cuenta. Iniciar sesión'
    : '¿Es tu primera vez? Crear cuenta';
  $('password').autocomplete = register ? 'new-password' : 'current-password';
  $('password').minLength = register ? 12 : 1;
  $('auth-error').textContent = '';
}
$('account-button').onclick = openAuth;
$('auth-switch').onclick = () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  updateAuth();
};
$('settings-account').onclick = async () => {
  if (!user) return openAuth();
  try {
    await api('/auth/logout', { method: 'POST', body: '{}' });
    user = null;
    data = readLocal() || demoData();
    mode = readLocal() ? 'local' : 'demo';
    resetTimer();
    render();
    notify('Sesión cerrada.');
  } catch (error) {
    notify(error.message);
  }
};
$('auth-form').onsubmit = async (e) => {
  e.preventDefault();
  setBusy($('auth-submit'), true);
  try {
    const result = await api(`/auth/${authMode}`, {
      method: 'POST',
      body: JSON.stringify({ email: $('email').value, password: $('password').value }),
    });
    user = result.user;
    const resultData = await api('/state');
    data = normalizeImport(resultData);
    mode = 'account';
    $('password').value = '';
    $('account-dialog').close();
    resetTimer();
    render();
    notify(
      readLocal()
        ? 'Sesión iniciada. Puedes copiar tus sesiones locales desde Ajustes.'
        : 'Tu espacio está listo.',
    );
  } catch (error) {
    $('auth-error').textContent = error.message;
  } finally {
    setBusy($('auth-submit'), false);
  }
};
// Persist the deadline, not elapsed ticks: background tabs and reloads remain accurate.
let timer = { duration: 25, remaining: 1500, deadline: 0, active: false, completed: false };
const timerKey = () => `ritmo-timer-${user?.id || 'local'}`;
function saveTimer() {
  try {
    sessionStorage.setItem(timerKey(), JSON.stringify(timer));
  } catch {
    /* Timer still works without browser storage. */
  }
}
function restoreTimer() {
  timer = { duration: 25, remaining: 1500, deadline: 0, active: false, completed: false };
  pendingFocus = null;
  try {
    const t = JSON.parse(sessionStorage.getItem(timerKey()));
    if (
      t &&
      Number.isInteger(t.duration) &&
      t.duration >= 1 &&
      t.duration <= 1440 &&
      Number.isFinite(t.remaining) &&
      Number.isFinite(t.deadline) &&
      typeof t.active === 'boolean' &&
      typeof t.completed === 'boolean'
    )
      timer = t;
  } catch {}
  tick();
}
function resetTimer() {
  timer = {
    duration: timer.duration,
    remaining: timer.duration * 60,
    deadline: 0,
    active: false,
    completed: false,
  };
  pendingFocus = null;
  saveTimer();
  tick();
}
function tick() {
  if (timer.active) {
    timer.remaining = Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000));
    if (timer.remaining === 0) {
      timer.active = false;
      timer.completed = true;
      saveTimer();
      notify('Sesión de enfoque terminada. Registra lo que aprendiste.');
    }
  }
  const display = `${String(Math.floor(timer.remaining / 60)).padStart(2, '0')}:${String(timer.remaining % 60).padStart(2, '0')}`;
  $('timer').textContent = display;
  $('timer-start').innerHTML =
    icon(timer.active ? 'pause' : 'play') +
    `<span>${timer.active ? 'Pausar' : timer.completed ? 'Otra sesión' : timer.remaining < timer.duration * 60 ? 'Continuar' : 'Empezar enfoque'}</span>`;
  $('timer-message').textContent = timer.completed
    ? 'Lo hiciste. Respira y registra tu esfuerzo.'
    : timer.active
      ? 'Este momento es para una sola tarea.'
      : 'Una tarea. Un momento para avanzar.';
  $('timer-save').hidden = !timer.completed;
  document
    .querySelectorAll('[data-duration]')
    .forEach((b) =>
      b.setAttribute('aria-pressed', String(Number(b.dataset.duration) === timer.duration)),
    );
  if (timer.active) document.title = `${display} · Enfoque · Ritmo`;
  else
    document.title = `${{ semana: 'Tu semana', sesiones: 'Mis sesiones', materias: 'Materias', ajustes: 'Ajustes' }[view]} · Ritmo`;
}
$('timer-start').onclick = () => {
  if (timer.active) {
    timer.remaining = Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000));
    timer.active = false;
  } else {
    if (timer.completed) resetTimer();
    if (timer.remaining === timer.duration * 60) {
      pendingFocus = nextPlanned();
    }
    timer.deadline = Date.now() + timer.remaining * 1000;
    timer.active = true;
  }
  saveTimer();
  tick();
};
$('timer-reset').onclick = async () => {
  if (
    (timer.active || timer.remaining < timer.duration * 60) &&
    !timer.completed &&
    !(await confirmAction(
      '¿Reiniciar el temporizador?',
      'Se perderá el tiempo de esta cuenta atrás. Tus sesiones guardadas no cambian.',
      'Reiniciar',
    ))
  )
    return;
  resetTimer();
};
document.querySelectorAll('[data-duration]').forEach(
  (b) =>
    (b.onclick = async () => {
      if (
        (timer.active || timer.remaining < timer.duration * 60) &&
        !timer.completed &&
        !(await confirmAction(
          '¿Cambiar la duración?',
          'El temporizador se reiniciará con la nueva duración.',
          'Cambiar',
        ))
      )
        return;
      timer.duration = Number(b.dataset.duration);
      resetTimer();
    }),
);
$('timer-save').onclick = () => {
  const s = pendingFocus ? data.sesiones.find((s) => s.id === pendingFocus.id) : null;
  openSession(s || null, dateKey(), '15:00', true);
  $('session-status').value = 'completed';
  $('date').value = dateKey();
  $('minutes').value = timer.duration;
  if (!$('notes').value) $('notes').value = 'Sesión de enfoque completada con Ritmo.';
};
let previousFocus;
function immersive(open) {
  if (open) {
    previousFocus = document.activeElement;
    location.hash = 'semana';
  }
  document.body.classList.toggle('immersive', open);
  $('immersive-button').textContent = open ? 'Volver a mi semana · Esc' : 'Modo enfoque';
  $('immersive-button').setAttribute('aria-pressed', String(open));
  if (open) $('immersive-button').focus();
  else previousFocus?.focus();
}
$('immersive-button').onclick = () => immersive(!document.body.classList.contains('immersive'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.querySelector('dialog[open]')) immersive(false);
});
document.addEventListener('visibilitychange', () => {
  tick();
  if (!document.hidden && mode === 'account') refreshAccount();
});
async function refreshAccount() {
  try {
    const result = await api('/state');
    data = normalizeImport(result);
    render();
    $('app-error').hidden = true;
  } catch (error) {
    $('app-error').textContent = `No pudimos actualizar tus datos: ${error.message}`;
    $('app-error').hidden = false;
  }
}
let lastDay = dateKey();
setInterval(() => {
  tick();
  if (dateKey() !== lastDay) {
    lastDay = dateKey();
    if (mode === 'demo') data = demoData();
    render();
  }
}, 1000);
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renderCalendar(weekDays(offset)), 100);
});
navigate();
render();
restoreTimer();
try {
  const result = await api('/auth/me');
  if (result.user) {
    const accountData = normalizeImport(await api('/state'));
    user = result.user;
    mode = 'account';
    data = accountData;
    restoreTimer();
    render();
  }
} catch (error) {
  $('app-error').textContent =
    'No pudimos conectar con el servidor. Puedes explorar la vista previa; vuelve a intentarlo para iniciar sesión.';
  $('app-error').hidden = false;
}
if (!localAvailable)
  notify('No se pudieron leer los datos locales. Puedes iniciar sesión o importar una copia.');
