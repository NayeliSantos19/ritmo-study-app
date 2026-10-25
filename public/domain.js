export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function weekDays(offset = 0, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    return dateKey(day);
  });
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  return (
    Number.isFinite(+d) && dateKey(d) === value && value >= '2000-01-01' && value <= '2100-12-31'
  );
}
export function validateSession(input) {
  if (!input || typeof input !== 'object') throw new Error('La sesión no tiene un formato válido.');
  const text = (key, max, required) => {
    if (typeof input[key] !== 'string') throw new Error(`Revisa el campo ${key}.`);
    const value = input[key].trim();
    if ((required && !value) || value.length > max)
      throw new Error('Revisa el tema, la materia y las notas.');
    return value;
  };
  const tema = text('tema', 120, true),
    materia = text('materia', 60, true),
    notas = text('notas', 1000, false);
  if (!validDate(input.fecha)) throw new Error('Elige una fecha válida entre 2000 y 2100.');
  if (typeof input.hora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.hora))
    throw new Error('Elige una hora válida.');
  if (!Number.isInteger(input.minutos) || input.minutos < 1 || input.minutos > 1440)
    throw new Error('La duración debe estar entre 1 y 1440 minutos.');
  if (!['planned', 'completed'].includes(input.estado))
    throw new Error('Selecciona un estado válido.');
  if (
    input.estado === 'planned' &&
    Number(input.hora.slice(0, 2)) * 60 + Number(input.hora.slice(3)) + input.minutos > 1440
  )
    throw new Error(
      'La sesión planificada debe terminar el mismo día. Divídela en dos sesiones si cruza la medianoche.',
    );
  if (input.estado === 'completed' && input.fecha > dateKey())
    throw new Error('Una sesión futura debe estar planificada, no completada.');
  return {
    tema,
    materia,
    notas,
    fecha: input.fecha,
    hora: input.hora,
    minutos: input.minutos,
    estado: input.estado,
  };
}
export function normalizeImport(value) {
  if (!value || !Array.isArray(value.sesiones) || value.sesiones.length > 2000)
    throw new Error('El archivo debe contener hasta 2000 sesiones de Ritmo.');
  if (!Number.isInteger(value.meta) || value.meta < 1 || value.meta > 10080)
    throw new Error('La meta del archivo no es válida.');
  const ids = new Set();
  const sesiones = value.sesiones.map((s) => {
    if (typeof s?.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(s.id) || ids.has(s.id))
      throw new Error('El archivo contiene identificadores duplicados o no válidos.');
    ids.add(s.id);
    return {
      id: s.id,
      ...validateSession({
        ...s,
        notas: s.notas ?? '',
        hora: s.hora ?? '12:00',
        estado: s.estado ?? 'completed',
      }),
    };
  });
  return { sesiones, meta: value.meta };
}
export function summary(sessions, days) {
  const selected = sessions.filter((s) => s.estado === 'completed' && days.includes(s.fecha));
  return { minutes: selected.reduce((sum, s) => sum + s.minutos, 0), count: selected.length };
}
export function demoData(now = new Date()) {
  const days = weekDays(0, now),
    past = weekDays(-1, now);
  const subjects = ['Matemáticas', 'Inglés', 'Biología', 'Historia'];
  const entries = [
    [0, '09:00', 45, 0, 'Repaso de funciones'],
    [0, '11:00', 25, 3, 'Revolución Francesa'],
    [1, '10:00', 30, 1, 'Vocabulario cotidiano'],
    [1, '15:00', 40, 2, 'La célula'],
    [2, '11:00', 45, 0, 'Ecuaciones'],
    [2, '17:00', 30, 3, 'Lectura y apuntes'],
    [3, '09:00', 30, 1, 'Comprensión lectora'],
    [3, '15:00', 40, 2, 'Genética'],
    [4, '11:00', 25, 3, 'Línea del tiempo'],
    [4, '16:00', 45, 0, 'Ejercicios prácticos'],
    [5, '10:00', 40, 2, 'Ecosistemas'],
    [5, '17:00', 30, 1, 'Expresión escrita'],
    [6, '15:00', 25, 3, 'Repaso semanal'],
  ];
  return {
    meta: 300,
    sesiones: [
      ...entries.map(([day, hora, minutos, subject, tema], i) => ({
        id: `demo-${i}`,
        fecha: days[day],
        hora,
        minutos,
        materia: subjects[subject],
        tema,
        notas: '',
        estado: days[day] < dateKey(now) ? 'completed' : 'planned',
      })),
      {
        id: 'demo-past-1',
        fecha: past[3],
        hora: '09:00',
        minutos: 45,
        materia: 'Matemáticas',
        tema: 'Derivadas: regla de la cadena',
        notas: '',
        estado: 'completed',
      },
      {
        id: 'demo-past-2',
        fecha: past[2],
        hora: '17:00',
        minutos: 25,
        materia: 'Historia',
        tema: 'La Revolución Francesa',
        notas: '',
        estado: 'completed',
      },
    ],
  };
}
