const API_URL = window.location.port === '5000' ? `${window.location.origin}/api` : 'http://localhost:5000/api';
const ADMIN_TOKEN_KEY = 'northfield-admin-token';
const ADMIN_USER_KEY = 'northfield-admin-user';
const loginScreen = document.querySelector('#login-screen');
const adminApp = document.querySelector('#admin-app');
const loginForm = document.querySelector('#admin-login-form');
const loginFeedback = document.querySelector('#login-feedback');
const globalFeedback = document.querySelector('#global-feedback');
let currentApplications = [];
let currentCourses = [];

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function getAdminToken() { return localStorage.getItem(ADMIN_TOKEN_KEY); }

async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (getAdminToken()) headers.Authorization = `Bearer ${getAdminToken()}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) showLogin();
    throw new Error(data.message || `Request failed (${response.status}).`);
  }
  return data;
}

function showMessage(message, isError = false) {
  globalFeedback.textContent = message;
  globalFeedback.classList.toggle('is-error', isError);
  if (message) window.setTimeout(() => {
    if (globalFeedback.textContent === message) globalFeedback.textContent = '';
  }, 5000);
}

function showLogin() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  adminApp.hidden = true;
  loginScreen.hidden = false;
}

function showApp() {
  loginScreen.hidden = true;
  adminApp.hidden = false;
  const user = JSON.parse(localStorage.getItem(ADMIN_USER_KEY) || '{}');
  document.querySelector('#admin-name').textContent = user.name || 'Administrator';
  document.querySelector('#profile-avatar').textContent = (user.name || 'A').charAt(0).toUpperCase();
  refreshData();
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

function statusBadge(status) {
  const className = `status-${String(status).toLowerCase().replaceAll(' ', '-')}`;
  return `<span class="status-badge ${escapeHTML(className)}">${escapeHTML(status)}</span>`;
}

function showApplicationDetails(application) {
  const student = application.student || {};
  const personal = application.personalDetails || {};
  const academic = application.academicDetails || {};
  const phone = student.phone || '';
  const email = student.email || '';
  const dialablePhone = phone.replace(/[^\d+]/g, '');
  const detailRows = [
    ['Full name', personal.name || student.name],
    ['Mobile number', phone],
    ['Email address', email],
    ['Date of birth', formatDate(personal.dateOfBirth)],
    ['Address', personal.address],
    ['Course', application.course?.name],
    ['Course code', application.course?.code],
    ['Qualification', academic.qualification],
    ['Passing year', academic.passingYear],
    ['Application number', application.applicationNumber],
    ['Submitted', formatDate(application.submittedAt)],
    ['Status', application.status]
  ];
  const content = document.querySelector('#application-detail-content');
  content.innerHTML = `<div class="application-detail-contact">${dialablePhone ? `<a class="primary-button" href="tel:${escapeHTML(dialablePhone)}">Call student</a>` : ''}${email ? `<a class="outline-button" href="mailto:${escapeHTML(email)}">Email student</a>` : ''}</div><dl class="application-detail-grid">${detailRows.map(([label, value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value || '—')}</dd></div>`).join('')}</dl>`;
  document.querySelector('#application-detail-dialog').showModal();
}

function setView(viewName) {
  document.querySelectorAll('.view-section').forEach((section) => section.classList.toggle('is-visible', section.id === `view-${viewName}`));
  document.querySelectorAll('.side-link').forEach((button) => button.classList.toggle('is-active', button.dataset.view === viewName));
  const sectionNames = { overview: 'Overview', applications: 'Applications', enquiries: 'Enquiries', courses: 'Courses' };
  document.querySelector('#topbar-section').textContent = sectionNames[viewName] || 'Overview';
  document.querySelector('#sidebar').classList.remove('is-open');
  if (viewName === 'applications') loadApplications();
  if (viewName === 'enquiries') loadEnquiries();
  if (viewName === 'courses') loadCourses();
}

async function getApplicationTotals() {
  const [all, submitted, review] = await Promise.all([
    apiRequest('/applications?limit=1'),
    apiRequest('/applications?status=Submitted&limit=1'),
    apiRequest('/applications?status=Under%20Review&limit=1')
  ]);
  return { total: all.total, pending: submitted.total + review.total };
}

async function refreshData() {
  try {
    const [appTotals, enquiryPage, courses, latest] = await Promise.all([
      getApplicationTotals(),
      apiRequest('/enquiries?limit=1'),
      apiRequest('/courses'),
      apiRequest('/applications?limit=5')
    ]);
    currentCourses = courses;
    document.querySelector('#stat-applications').textContent = appTotals.total;
    document.querySelector('#stat-pending').textContent = appTotals.pending;
    document.querySelector('#stat-enquiries').textContent = enquiryPage.total;
    document.querySelector('#stat-courses').textContent = courses.length;
    document.querySelector('#pending-badge').textContent = appTotals.pending;
    renderRecentApplications(latest.items);
    renderCourseCards(courses);
  } catch (error) {
    showMessage(error.message.includes('Failed to fetch') ? 'Can’t reach the API. Start the server and MongoDB, then refresh.' : error.message, true);
  }
}

function renderRecentApplications(applications) {
  const tbody = document.querySelector('#recent-applications');
  if (!applications.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-message">No applications have been submitted yet.</td></tr>';
    return;
  }
  tbody.innerHTML = applications.map((application) => `<tr><td><span class="cell-primary">${escapeHTML(application.student?.name || application.personalDetails?.name)}</span><span class="cell-secondary">${escapeHTML(application.applicationNumber)}</span></td><td>${escapeHTML(application.course?.name || '—')}</td><td>${formatDate(application.submittedAt)}</td><td>${statusBadge(application.status)}</td></tr>`).join('');
}

async function loadApplications() {
  const filter = document.querySelector('#application-filter').value;
  const query = new URLSearchParams({ limit: '50' });
  if (filter) query.set('status', filter);
  try {
    const result = await apiRequest(`/applications?${query}`);
    currentApplications = result.items;
    document.querySelector('#application-caption').textContent = `${result.total} application${result.total === 1 ? '' : 's'} · latest 50 shown`;
    document.querySelector('#applications-empty').hidden = result.items.length > 0;
    document.querySelector('#applications-table').innerHTML = result.items.map((application) => {
      const id = escapeHTML(application._id);
      return `<tr><td><span class="cell-primary">${escapeHTML(application.applicationNumber)}</span></td><td><span class="cell-primary">${escapeHTML(application.student?.name || application.personalDetails?.name)}</span><span class="cell-secondary">${escapeHTML(application.student?.email || '')}</span></td><td>${escapeHTML(application.course?.name || '—')}</td><td>${formatDate(application.submittedAt)}</td><td>${statusBadge(application.status)}</td><td><div class="row-controls"><select aria-label="New status for ${escapeHTML(application.applicationNumber)}" data-status-for="${id}"><option ${application.status === 'Under Review' ? 'selected' : ''}>Under Review</option><option ${application.status === 'Approved' ? 'selected' : ''}>Approved</option><option ${application.status === 'Rejected' ? 'selected' : ''}>Rejected</option><option ${application.status === 'Admission Confirmed' ? 'selected' : ''}>Admission Confirmed</option></select><button class="small-button" data-update-application="${id}">Save</button></div></td><td><button class="small-button" data-view-application="${id}">View details</button></td></tr>`;
    }).join('');
  } catch (error) { showMessage(error.message, true); }
}

async function updateApplicationStatus(button) {
  const id = button.dataset.updateApplication;
  const select = document.querySelector(`[data-status-for="${CSS.escape(id)}"]`);
  const nextStatus = select.value;
  const internalNote = window.prompt('Optional internal review note (only staff can see it):', '');
  if (internalNote === null) return;
  const publicNote = window.prompt('Optional update visible in the application status history:', '');
  if (publicNote === null) return;
  button.disabled = true;
  try {
    await apiRequest(`/applications/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus, note: internalNote, publicNote })
    });
    showMessage(`Application status updated to ${nextStatus}.`);
    await Promise.all([loadApplications(), refreshData()]);
  } catch (error) { showMessage(error.message, true); }
  finally { button.disabled = false; }
}

async function loadEnquiries() {
  try {
    const result = await apiRequest('/enquiries?limit=50');
    document.querySelector('#enquiry-caption').textContent = `${result.total} enquiry${result.total === 1 ? '' : 'ies'} · latest 50 shown`;
    document.querySelector('#enquiries-empty').hidden = result.items.length > 0;
    document.querySelector('#enquiries-table').innerHTML = result.items.map((enquiry) => `<tr><td><span class="cell-primary">${escapeHTML(enquiry.name)}</span><span class="cell-secondary">${escapeHTML(enquiry.email)} · ${escapeHTML(enquiry.phone)}</span></td><td>${escapeHTML(enquiry.course)}</td><td title="${escapeHTML(enquiry.message || '')}">${escapeHTML((enquiry.message || '—').slice(0, 55))}${(enquiry.message || '').length > 55 ? '…' : ''}</td><td>${formatDate(enquiry.createdAt)}</td><td><div class="row-controls"><select aria-label="Follow-up state for ${escapeHTML(enquiry.name)}" data-state-for="${escapeHTML(enquiry._id)}"><option value="new" ${enquiry.state === 'new' ? 'selected' : ''}>New</option><option value="contacted" ${enquiry.state === 'contacted' ? 'selected' : ''}>Contacted</option><option value="closed" ${enquiry.state === 'closed' ? 'selected' : ''}>Closed</option></select><button class="small-button" data-update-enquiry="${escapeHTML(enquiry._id)}">Save</button></div></td></tr>`).join('');
  } catch (error) { showMessage(error.message, true); }
}

async function updateEnquiryState(button) {
  const id = button.dataset.updateEnquiry;
  const select = document.querySelector(`[data-state-for="${CSS.escape(id)}"]`);
  button.disabled = true;
  try {
    await apiRequest(`/enquiries/${encodeURIComponent(id)}/state`, { method: 'PATCH', body: JSON.stringify({ state: select.value }) });
    showMessage('Enquiry follow-up state saved.');
    await loadEnquiries();
    await refreshData();
  } catch (error) { showMessage(error.message, true); }
  finally { button.disabled = false; }
}

async function loadCourses() {
  try {
    currentCourses = await apiRequest('/courses');
    document.querySelector('#stat-courses').textContent = currentCourses.length;
    renderCourseCards(currentCourses);
  } catch (error) { showMessage(error.message, true); }
}

function renderCourseCards(courses) {
  const grid = document.querySelector('#course-admin-grid');
  const empty = document.querySelector('#courses-empty');
  if (!grid || !empty) return;
  empty.hidden = courses.length > 0;
  grid.innerHTML = courses.map((course) => `<article class="course-admin-card"><div class="course-admin-top"><span>${escapeHTML(course.category)}</span><span>${escapeHTML(course.code || '—')}</span></div><h2>${escapeHTML(course.name)}</h2><p>${escapeHTML(course.description)}</p><div class="course-admin-meta"><span>${escapeHTML(course.duration)} · ${escapeHTML(course.eligibility)}</span><strong>₹${Number(course.annualFee).toLocaleString('en-IN')}/yr</strong></div><div class="course-admin-actions"><button data-edit-course="${escapeHTML(course._id)}">Edit details</button><button class="archive" data-archive-course="${escapeHTML(course._id)}">Archive</button></div></article>`).join('');
}

function openCourseDialog(course = null) {
  const dialog = document.querySelector('#course-dialog');
  const form = document.querySelector('#course-form');
  form.reset();
  form.elements.courseId.value = course?._id || '';
  document.querySelector('#course-dialog-title').textContent = course ? 'Edit course' : 'Add a course';
  if (course) Object.entries(course).forEach(([key, value]) => {
    if (form.elements.namedItem(key)) form.elements.namedItem(key).value = value;
  });
  dialog.showModal();
}

async function saveCourse(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  const id = data.courseId;
  delete data.courseId;
  data.annualFee = Number(data.annualFee);
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await apiRequest(id ? `/courses/${encodeURIComponent(id)}` : '/courses', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(data)
    });
    document.querySelector('#course-dialog').close();
    showMessage(id ? 'Course details updated.' : 'Course added to the catalogue.');
    await refreshData();
  } catch (error) { showMessage(error.message, true); }
  finally { button.disabled = false; }
}

async function archiveCourse(button) {
  const course = currentCourses.find((item) => item._id === button.dataset.archiveCourse);
  if (!course || !window.confirm(`Archive ${course.name}? It will no longer appear in the student course list.`)) return;
  button.disabled = true;
  try {
    await apiRequest(`/courses/${encodeURIComponent(course._id)}`, { method: 'DELETE' });
    showMessage(`${course.name} archived.`);
    await refreshData();
  } catch (error) { showMessage(error.message, true); }
  finally { button.disabled = false; }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;
  const feedback = loginFeedback;
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  feedback.textContent = '';
  try {
    const result = await apiRequest('/auth/admin/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(loginForm))) });
    localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(result.user));
    loginForm.reset();
    showApp();
  } catch (error) {
    feedback.textContent = error.message.includes('Failed to fetch') ? 'Could not reach the API. Open http://localhost:5000/admin/ with npm run dev running, or use Live Server with CLIENT_ORIGIN configured.' : error.message;
  } finally { button.disabled = false; }
});

document.querySelectorAll('.side-link').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.go)));
document.querySelectorAll('[data-refresh]').forEach((button) => button.addEventListener('click', refreshData));
document.querySelector('#application-filter').addEventListener('change', loadApplications);
document.querySelector('#applications-table').addEventListener('click', (event) => {
  const detailsButton = event.target.closest('[data-view-application]');
  const updateButton = event.target.closest('[data-update-application]');
  if (detailsButton) {
    const application = currentApplications.find((item) => item._id === detailsButton.dataset.viewApplication);
    if (application) showApplicationDetails(application);
  }
  if (updateButton) updateApplicationStatus(updateButton);
});
document.querySelector('[data-close-application-detail]').addEventListener('click', () => document.querySelector('#application-detail-dialog').close());
document.querySelector('#enquiries-table').addEventListener('click', (event) => {
  const button = event.target.closest('[data-update-enquiry]');
  if (button) updateEnquiryState(button);
});
document.querySelector('#add-course-button').addEventListener('click', () => openCourseDialog());
document.querySelector('#course-admin-grid').addEventListener('click', (event) => {
  const edit = event.target.closest('[data-edit-course]');
  const archive = event.target.closest('[data-archive-course]');
  if (edit) openCourseDialog(currentCourses.find((course) => course._id === edit.dataset.editCourse));
  if (archive) archiveCourse(archive);
});
document.querySelector('#course-form').addEventListener('submit', saveCourse);
document.querySelector('.dialog-close').addEventListener('click', () => document.querySelector('#course-dialog').close());
document.querySelector('.dialog-cancel').addEventListener('click', () => document.querySelector('#course-dialog').close());
document.querySelector('#logout-button').addEventListener('click', showLogin);
document.querySelector('#mobile-menu').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('is-open'));

if (getAdminToken()) showApp();
