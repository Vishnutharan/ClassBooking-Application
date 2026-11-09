// Integration checks against the local API. Creates clearly labelled test accounts.
const assert = require('node:assert/strict');
const base = process.env.API_URL || 'http://localhost:5197/api';
const stamp = Date.now();
let checks = 0;
async function request(path, method = 'GET', body, token, expected = 200) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  assert.equal(response.status, expected, `${method} ${path}: ${text.slice(0, 500)}`);
  checks++;
  return text ? JSON.parse(text) : null;
}
async function register(role, suffix) {
  return request('/auth/register', 'POST', {
    email: `workflow-${stamp}-${suffix}@example.test`, password: 'Workflow-test-472!',
    fullName: `Workflow Test ${suffix}`, role
  });
}
(async () => {
  await request('/auth/register', 'POST', { email: `admin-${stamp}@example.test`, password: 'Workflow-test-472!', fullName: 'Test Admin', role: 'Admin' }, null, 400);
  await request('/admin/users', 'GET', undefined, null, 401);
  await request('/payments/admin', 'GET', undefined, null, 401);
  await request('/payments/teacher', 'GET', undefined, null, 401);
  const teacher = await register('Teacher', 'teacher');
  const student = await register('Student', 'student');
  const stranger = await register('Student', 'stranger');
  await request('/auth/change-password', 'POST', { currentPassword: 'wrong-password', newPassword: 'Workflow-test-573!' }, student.token, 401);
  await request('/auth/change-password', 'POST', { currentPassword: 'Workflow-test-472!', newPassword: 'Workflow-test-573!' }, student.token, 204);
  await request('/auth/login', 'POST', { email: student.user.email, password: 'Workflow-test-573!' });
  const profile = await request('/teacher/profile', 'GET', undefined, teacher.token);
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const slot = await request('/teacher/availability/slots', 'POST', { date, startTime: '10:00', endTime: '11:00' }, teacher.token);
  const payload = { teacherId: profile.id, date, startTime: '10:00', endTime: '11:00', subject: 'Mathematics', mode: 'ONLINE', classType: 'OneTime' };
  const booking = await request('/bookings', 'POST', payload, student.token);
  assert.equal(booking.success, true);
  await request('/bookings', 'POST', payload, stranger.token, 400);
  await request(`/bookings/${booking.id}`, 'GET', undefined, stranger.token, 403);
  await request(`/bookings/${booking.id}/cancel`, 'POST', {}, stranger.token, 403);
  await request(`/bookings/${booking.id}/confirm`, 'POST', {}, student.token, 403);
  await request(`/bookings/${booking.id}/confirm`, 'POST', {}, teacher.token);
  await request(`/bookings/${booking.id}/complete`, 'POST', {}, teacher.token, 400);
  await request(`/bookings/${booking.id}/cancel`, 'POST', { reason: 'Automated workflow check' }, student.token);
  await request(`/bookings/${booking.id}/confirm`, 'POST', {}, teacher.token, 400);
  await request(`/teacher/availability/slots/${slot.id}`, 'DELETE', undefined, teacher.token);
  const progress = await request('/students/progress-report', 'GET', undefined, student.token);
  assert.deepEqual(progress.subjectsProgress, []);
  await request('/students/profile', 'GET', undefined, student.token);
  await request('/students/summary', 'GET', undefined, student.token);
  await request('/payments/student', 'GET', undefined, student.token);
  await request('/timetable', 'GET', undefined, student.token);
  await request('/resources/student', 'GET', undefined, student.token);
  await request('/auth/deactivate-account', 'POST', { currentPassword: 'Workflow-test-472!' }, stranger.token, 204);
  await request('/students/profile', 'GET', undefined, stranger.token, 401);
  console.log(`PASS: ${checks} API checks (authentication and account actions, booking permissions/lifecycle, progress, payments, timetable, resources).`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
