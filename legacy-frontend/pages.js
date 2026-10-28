const programList = [
  { slug: 'computer-science', name: 'Computer Science', category: 'Technology', duration: '4 years', eligibility: '12th · PCM', fee: '₹85,000 / year', symbol: '⌘', description: 'Build the ideas, tools, and technology shaping our world.', overview: 'Explore programming, software design, data, and the fundamentals behind modern computing. Learn through practical projects and build a foundation for careers in technology or further study.', careers: 'Software developer · Data analyst · IT specialist' },
  { slug: 'business-administration', name: 'Business Administration', category: 'Business', duration: '3 years', eligibility: '12th · Any stream', fee: '₹68,000 / year', symbol: '↗', description: 'Learn to lead with clarity, creativity, and confidence.', overview: 'Study how organizations work, make decisions, and create value. The program introduces management, marketing, accounting, and communication through practical business scenarios.', careers: 'Business associate · Marketing executive · Entrepreneur' },
  { slug: 'computer-applications', name: 'Computer Applications', category: 'Technology', duration: '3 years', eligibility: '12th · Any stream', fee: '₹62,000 / year', symbol: '⌘', description: 'Turn your curiosity about computers into practical skills.', overview: 'Build a practical understanding of software, databases, web technology, and problem solving. Develop the skills to support digital teams or continue into advanced computing study.', careers: 'Web developer · Application support · Junior programmer' },
  { slug: 'psychology', name: 'Psychology', category: 'Social sciences', duration: '3 years', eligibility: '12th · Any stream', fee: '₹58,000 / year', symbol: '◎', description: 'Understand people, behaviour, and what helps us thrive.', overview: 'Explore human behaviour, development, and the ways people think and learn. Study research methods and foundational psychological ideas with a focus on responsible, evidence-based understanding.', careers: 'Research assistant · HR associate · Further study in psychology' },
  { slug: 'commerce', name: 'Commerce', category: 'Business', duration: '3 years', eligibility: '12th · Any stream', fee: '₹54,000 / year', symbol: '◌', description: 'Explore finance, markets, and the language of business.', overview: 'Learn the fundamentals of accounting, economics, business law, and finance. Develop a clear view of how markets and organizations operate.', careers: 'Accounts assistant · Banking associate · Finance studies' },
  { slug: 'english-communication', name: 'English & Communication', category: 'Humanities', duration: '3 years', eligibility: '12th · Any stream', fee: '₹52,000 / year', symbol: '✳', description: 'Find your voice through stories, ideas, and expression.', overview: 'Read widely, write clearly, and study how language shapes culture and communication. Build skills useful in education, media, publishing, and many professional fields.', careers: 'Content associate · Publishing assistant · Further study' }
];

async function fillCourseSelects() {
  const selects = [...document.querySelectorAll('[data-course-select]')];
  if (!selects.length) return;
  let availableCourses = programList.map((program) => ({ name: program.name, slug: program.slug }));
  try {
    const apiCourses = await window.admissionApi.request('/courses');
    if (apiCourses.length) availableCourses = apiCourses;
  } catch (_error) {
    // Keep the static sample list usable when the API is not running.
  }
  selects.forEach((select) => {
    const chosen = new URLSearchParams(location.search).get('course');
    const chosenProgram = programList.find((program) => program.slug === chosen);
    availableCourses.forEach((course) => {
      const option = document.createElement('option');
      option.value = course.name;
      option.textContent = course.name;
      if (course._id) option.dataset.courseId = course._id;
      if (chosen === course.slug || chosen === course.name || chosen === course._id || chosenProgram?.name === course.name) option.selected = true;
      select.append(option);
    });
  });
}

function programCard(program) {
  return `<article class="course-card"><div class="course-top"><span class="course-category">${program.category}</span><span class="course-symbol" aria-hidden="true">${program.symbol}</span></div><h3>${program.name}</h3><p>${program.description}</p><div class="course-meta"><span>${program.duration}</span><span>${program.eligibility}</span></div><a class="card-more" href="course.html?course=${encodeURIComponent(program.slug)}">View course details</a></article>`;
}

function initializeCourseListing() {
  const grid = document.querySelector('#all-course-grid');
  if (!grid) return;
  const search = document.querySelector('#all-course-search');
  const count = document.querySelector('#all-course-count');
  const empty = document.querySelector('#all-empty');
  const render = () => {
    const term = search.value.trim().toLowerCase();
    const matched = programList.filter((program) => `${program.name} ${program.category} ${program.description}`.toLowerCase().includes(term));
    grid.innerHTML = matched.map(programCard).join('');
    count.textContent = String(matched.length);
    empty.hidden = matched.length > 0;
  };
  search.addEventListener('input', render);
  render();
}

function initializeCourseDetail() {
  const container = document.querySelector('#course-detail');
  if (!container) return;
  const slug = new URLSearchParams(location.search).get('course');
  const program = programList.find((item) => item.slug === slug);
  if (!program) {
    container.innerHTML = `<section class="inner-hero"><div class="section-kicker">COURSE NOT FOUND</div><h1>Let’s find another <em>path.</em></h1><p>That course link may be out of date. Browse the current sample programs instead.</p><a class="button button-dark" href="courses.html">Browse courses <span>↗</span></a></section>`;
    return;
  }
  document.title = `${program.name} — Northfield College`;
  container.innerHTML = `<section class="inner-hero course-detail-hero"><a class="back-link" href="courses.html">← All courses</a><div class="section-kicker">${program.category.toUpperCase()}</div><h1>${program.name.split(' ').slice(0, -1).join(' ')} <em>${program.name.split(' ').slice(-1)}</em></h1><p>${program.description}</p><a class="button button-dark" href="apply.html?course=${program.slug}">Apply for this course <span>↗</span></a></section><section class="section-pad detail-content"><div><div class="section-kicker">ABOUT THIS COURSE</div><h2>Learn with <em>purpose.</em></h2><p>${program.overview}</p><h3>Where it can take you</h3><p>${program.careers}</p></div><aside class="course-facts"><h3>Course at a glance</h3><dl><div><dt>Duration</dt><dd>${program.duration}</dd></div><div><dt>Eligibility</dt><dd>${program.eligibility}</dd></div><div><dt>Indicative fee</dt><dd>${program.fee}</dd></div><div><dt>Academic year</dt><dd>2026–27</dd></div></dl><small>Sample figures for project demonstration. Confirm official details with the college.</small><a class="button button-dark" href="apply.html?course=${program.slug}">Apply now <span>↗</span></a></aside></section>`;
}

function saveRecord(key, record) {
  const records = JSON.parse(localStorage.getItem(key) || '[]');
  records.push(record);
  localStorage.setItem(key, JSON.stringify(records));
}

function initializeForms() {
  const enquiry = document.querySelector('#standalone-enquiry');
  if (enquiry) enquiry.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!enquiry.reportValidity()) return;
    const data = new FormData(enquiry);
    const record = { reference: `ENQ${new Date().getFullYear()}${Math.floor(10000 + Math.random() * 90000)}`, name: data.get('name').trim(), email: data.get('email').trim(), phone: data.get('phone').trim(), course: data.get('course'), message: data.get('message').trim(), submittedAt: new Date().toISOString() };
    const feedback = enquiry.querySelector('[data-feedback]');
    try {
      const result = await window.admissionApi.request('/enquiries', { method: 'POST', body: JSON.stringify(record) });
      feedback.textContent = `Thanks, ${record.name.split(' ')[0]}. Your enquiry reference is ${result.reference}.`;
    } catch (error) {
      if (!error.message.includes('Failed to fetch')) {
        feedback.textContent = error.message;
        return;
      }
      record.reference = `ENQ${new Date().getFullYear()}${Math.floor(10000 + Math.random() * 90000)}`;
      saveRecord('northfield-enquiries', record);
      feedback.textContent = `Demo enquiry saved in this browser. Reference: ${record.reference}. Start the API to save it to MongoDB.`;
    }
    enquiry.reset();
  });

  const application = document.querySelector('#application-form');
  if (application) {
    const user = window.admissionApi.user();
    if (!window.admissionApi.token()) {
      const next = `apply.html${location.search}`;
      location.replace(`account.html?next=${encodeURIComponent(next)}`);
      return;
    }
    const summary = document.querySelector('#student-account-summary');
    if (summary && user) {
      summary.className = 'account-summary-visible';
      summary.textContent = `Signed in as ${user.name} · ${user.email}`;
      application.elements.name.value = user.name || '';
    }
    application.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!application.reportValidity()) return;
    const data = new FormData(application);
    const selectedCourse = application.elements.course.selectedOptions[0];
    const button = application.querySelector('button[type="submit"]');
    const feedback = application.querySelector('[data-feedback]');
    button.disabled = true;
    try {
      if (!selectedCourse.dataset.courseId) throw new Error('Course records are not in the database yet. Run npm run seed-courses, then reload this page.');
      const record = await window.admissionApi.request('/applications', {
        method: 'POST',
        body: JSON.stringify({
          courseId: selectedCourse.dataset.courseId,
          personalDetails: { name: data.get('name').trim(), dateOfBirth: data.get('dob'), address: data.get('address').trim() },
          academicDetails: { qualification: data.get('qualification'), passingYear: Number(data.get('passingYear')) }
        })
      });
      application.innerHTML = `<div class="success-panel"><span class="success-check">✓</span><div class="section-kicker">APPLICATION RECEIVED</div><h2>You’ve taken the <em>first step.</em></h2><p>Your application has been saved to the college database.</p><div class="reference-box"><small>APPLICATION NUMBER</small><strong>${record.applicationNumber}</strong></div><p>Save this number to track the application status.</p><a class="button button-dark" href="portal.html?application=${record.applicationNumber}">Track application <span>↗</span></a></div>`;
    } catch (error) {
      feedback.textContent = error.message.includes('Failed to fetch')
        ? 'Could not reach the API. Start the server, connect MongoDB, and reload the form.'
        : error.message;
    } finally {
      button.disabled = false;
    }
    });
  }
}

function initializeTracking() {
  const form = document.querySelector('#track-form');
  if (!form) return;
  const result = document.querySelector('#tracking-result');
  const requested = new URLSearchParams(location.search).get('application');
  if (requested) form.elements.applicationNumber.value = requested;
  const track = async (number) => {
    if (window.admissionApi.token()) {
      try {
        const application = await window.admissionApi.request(`/applications/number/${encodeURIComponent(number.trim())}`);
        const submitted = application.submittedAt || application.createdAt;
        result.innerHTML = `<article class="application-result"><div class="result-top"><div><small>APPLICATION NUMBER</small><h2>${application.applicationNumber}</h2></div><span class="status-pill">${application.status}</span></div><div class="result-grid"><div><small>APPLICANT</small><strong>${application.personalDetails.name}</strong></div><div><small>COURSE</small><strong>${application.course.name}</strong></div><div><small>SUBMITTED</small><strong>${new Date(submitted).toLocaleDateString('en-IN')}</strong></div></div><div class="timeline"><span class="timeline-done">✓</span><div><strong>${application.status}</strong><small>Your application is saved in the college database.</small></div></div></article>`;
        return;
      } catch (error) {
        if (!error.message.includes('Failed to fetch')) {
          result.innerHTML = `<div class="notice-box"><strong>Could not find that application</strong><p>${error.message}</p></div>`;
          return;
        }
      }
    }
    const applications = JSON.parse(localStorage.getItem('northfield-applications') || '[]');
    const application = applications.find((item) => item.applicationNumber.toLowerCase() === number.trim().toLowerCase());
    if (!application) {
      result.innerHTML = `<div class="notice-box"><strong>No application found</strong><p>Check the number and sign in with the account that submitted it. Local demo records are only in this browser.</p></div>`;
      return;
    }
    result.innerHTML = `<article class="application-result"><div class="result-top"><div><small>APPLICATION NUMBER</small><h2>${application.applicationNumber}</h2></div><span class="status-pill">${application.status}</span></div><div class="result-grid"><div><small>APPLICANT</small><strong>${application.name}</strong></div><div><small>COURSE</small><strong>${application.course}</strong></div><div><small>SUBMITTED</small><strong>${new Date(application.submittedAt).toLocaleDateString('en-IN')}</strong></div></div><div class="timeline"><span class="timeline-done">✓</span><div><strong>Application submitted</strong><small>Your application is saved and awaiting review.</small></div></div><a class="text-link" href="courses.html">Explore other courses ↗</a></article>`;
  };
  if (requested) track(requested);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    track(form.elements.applicationNumber.value);
  });
}

function initializeMobileNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
    document.body.classList.toggle('menu-open', !open);
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }));
}

fillCourseSelects();
initializeCourseListing();
initializeCourseDetail();
initializeForms();
initializeTracking();
initializeMobileNavigation();
