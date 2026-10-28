const courses = [
  { name: 'Computer Science', category: 'Technology', duration: '4 years', eligibility: '12th · PCM', symbol: '⌘', description: 'Build the ideas, tools, and technology shaping our world.' },
  { name: 'Business Administration', category: 'Business', duration: '3 years', eligibility: '12th · Any stream', symbol: '↗', description: 'Learn to lead with clarity, creativity, and confidence.' },
  { name: 'Computer Applications', category: 'Technology', duration: '3 years', eligibility: '12th · Any stream', symbol: '⌘', description: 'Turn your curiosity about computers into practical skills.' },
  { name: 'Psychology', category: 'Social sciences', duration: '3 years', eligibility: '12th · Any stream', symbol: '◎', description: 'Understand people, behaviour, and what helps us thrive.' },
  { name: 'Commerce', category: 'Business', duration: '3 years', eligibility: '12th · Any stream', symbol: '◌', description: 'Explore finance, markets, and the language of business.' },
  { name: 'English & Communication', category: 'Humanities', duration: '3 years', eligibility: '12th · Any stream', symbol: '✳', description: 'Find your voice through stories, ideas, and expression.' }
];

const courseGrid = document.querySelector('#course-grid');
const courseSearch = document.querySelector('#course-search');
const courseCount = document.querySelector('#course-count');
const emptyState = document.querySelector('#empty-state');
const enquiryCourse = document.querySelector('#enquiry-course');
const courseSlug = (course) => course.name === 'English & Communication'
  ? 'english-communication'
  : course.name.toLowerCase().replaceAll(' ', '-');

function renderCourses(searchTerm = '') {
  const normalizedTerm = searchTerm.trim().toLowerCase();
  const matchingCourses = courses.filter((course) =>
    `${course.name} ${course.category} ${course.description}`.toLowerCase().includes(normalizedTerm)
  );

  courseGrid.innerHTML = matchingCourses.map((course) => `
    <article class="course-card">
      <div class="course-top"><span class="course-category">${course.category}</span><span class="course-symbol" aria-hidden="true">${course.symbol}</span></div>
      <h3>${course.name}</h3>
      <p>${course.description}</p>
      <div class="course-meta"><span>${course.duration}</span><span>${course.eligibility}</span></div>
      
      <a class="card-more" href="course.html?course=${courseSlug(course)}">View course details</a>
    </article>
  `).join('');

  courseCount.textContent = String(matchingCourses.length);
  emptyState.hidden = matchingCourses.length > 0;
}

courses.forEach((course) => {
  const option = document.createElement('option');
  option.value = course.name;
  option.textContent = course.name;
  enquiryCourse.append(option);
});

renderCourses();
courseSearch.addEventListener('input', (event) => renderCourses(event.target.value));

const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

function closeMenu() {
  mainNav.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
  document.body.classList.remove('menu-open');
}

menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
  mainNav.classList.toggle('is-open', !isOpen);
  document.body.classList.toggle('menu-open', !isOpen);
});

mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

const portalDialog = document.querySelector('#portal');
document.querySelectorAll('a[href="#portal"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    portalDialog.showModal();
    closeMenu();
  });
});
document.querySelector('.dialog-close').addEventListener('click', () => portalDialog.close());
document.querySelector('#close-portal').addEventListener('click', () => portalDialog.close());
portalDialog.addEventListener('click', (event) => {
  if (event.target === portalDialog) portalDialog.close();
});

const enquiryForm = document.querySelector('#enquiry-form');
const formFeedback = document.querySelector('#form-feedback');
enquiryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!enquiryForm.reportValidity()) return;

  const formData = new FormData(enquiryForm);
  const reference = `ENQ${new Date().getFullYear()}${Math.floor(10000 + Math.random() * 90000)}`;
  const enquiry = {
    reference,
    name: formData.get('name').trim(),
    email: formData.get('email').trim(),
    phone: formData.get('phone').trim(),
    course: formData.get('course'),
    submittedAt: new Date().toISOString()
  };

  try {
    const result = await window.admissionApi.request('/enquiries', { method: 'POST', body: JSON.stringify(enquiry) });
    formFeedback.textContent = `Thanks, ${enquiry.name.split(' ')[0]}! Your enquiry reference is ${result.reference}.`;
  } catch (error) {
    if (!error.message.includes('Failed to fetch')) {
      formFeedback.textContent = error.message;
      return;
    }
    const savedEnquiries = JSON.parse(localStorage.getItem('northfield-enquiries') || '[]');
    savedEnquiries.push(enquiry);
    localStorage.setItem('northfield-enquiries', JSON.stringify(savedEnquiries));
    formFeedback.textContent = `Demo enquiry saved in this browser. Start the API to save it to MongoDB. Reference: ${reference}.`;
  }
  enquiryForm.reset();
});
