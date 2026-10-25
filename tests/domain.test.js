import test from 'node:test';
import assert from 'node:assert/strict';
import {
  weekDays,
  normalizeImport,
  validateSession,
  summary,
  validDate,
} from '../public/domain.js';
const session = {
  id: 'old-1',
  tema: 'Funciones',
  materia: 'Matemáticas',
  fecha: '2025-03-01',
  hora: '09:00',
  minutos: 25,
  notas: '',
  estado: 'completed',
};
test('week boundaries use Monday through Sunday across month/year changes', () => {
  assert.deepEqual(weekDays(0, new Date(2026, 0, 1, 12)), [
    '2025-12-29',
    '2025-12-30',
    '2025-12-31',
    '2026-01-01',
    '2026-01-02',
    '2026-01-03',
    '2026-01-04',
  ]);
  assert.equal(weekDays(0, new Date(2026, 9, 25, 12))[0], '2026-10-19');
});
test('reject normalized impossible dates, fractional duration and blank subjects', () => {
  assert.equal(validDate('2025-02-30'), false);
  assert.throws(() => validateSession({ ...session, minutos: 1.5 }));
  assert.throws(() => validateSession({ ...session, materia: '  ' }));
  assert.throws(() => validateSession({ ...session, fecha: '2099-01-01', estado: 'completed' }));
  assert.throws(() => validateSession({ ...session, hora: '24:00' }));
});
test('legacy exports migrate and invalid imports are rejected as a whole', () => {
  const { hora, estado, ...old } = session;
  const imported = normalizeImport({ meta: 300, sesiones: [old] });
  assert.equal(imported.sesiones[0].hora, '12:00');
  assert.equal(imported.sesiones[0].estado, 'completed');
  assert.throws(() =>
    normalizeImport({ meta: 300, sesiones: [session, { ...session, minutos: 0 }] }),
  );
  assert.throws(() => normalizeImport({ meta: 300, sesiones: [session, session] }));
});
test('planned sessions do not inflate progress and other weeks are excluded', () => {
  assert.deepEqual(
    summary(
      [
        session,
        { ...session, id: 'p', estado: 'planned' },
        { ...session, id: 'other', fecha: '2025-02-01' },
      ],
      ['2025-03-01'],
    ),
    { minutes: 25, count: 1 },
  );
});
