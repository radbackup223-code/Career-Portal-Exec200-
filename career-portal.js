const APPLICATION_SUBMIT_API_URL =
  'https://default7ee94446539448c794e9e1f52d4e0c.43.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/29/workflows/f0ae6a838d3e421f8f44572205de99de/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=BPX7pLqbleRzPlowoWntnu87UBbu7lVYAeehv1MBUM0';

const JOB_POSTINGS_API_URL =
  'https://default7ee94446539448c794e9e1f52d4e0c.43.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/25/workflows/38a111fc38bd4df7b761c957e5345181/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=D4cwXFEmHCsUwJ5OOqQCj8OreP_kAPrAUaRw5qs1MJI';

const APPLICATION_FIELD_LABELS = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone number',
  candidatelocation: 'Candidate location',
  currentJobTitle: 'Current job title',
  yearsOfExperience: 'Years of experience',
  highestQualification: 'Highest qualification',
  currentEmployer: 'Current employer',
  expectedSalary: 'Expected salary',
  availability: 'Availability',
  postingID: 'Posting ID',
  resume: 'Resume',
};

const APPLICATION_FORMAT_ERROR_MESSAGE =
  'The application data was not in the required format. Please check each field and try again.';

const JOB_FIELD_MAP = {
  id: ['id', 'Id', 'JobId', 'postingID', 'PostingID'],
  title: ['title', 'Title', 'JobTitle', 'jobTitle'],
  dept: ['dept', 'Department', 'Team', 'department'],
  location: ['location', 'Location', 'City'],
  locationType: ['locationType', 'LocationType', 'WorkplaceType', 'workArrangement', 'WorkArrangement'],
  employmentType: ['employmentType', 'EmploymentType', 'JobType'],
  reqCode: ['reqCode', 'ReqCode', 'RequisitionId', 'postingID', 'PostingID'],
  salaryMin: ['salaryMin', 'SalaryMin', 'PayRangeMin', 'minimumSalary', 'MinimumSalary'],
  salaryMax: ['salaryMax', 'SalaryMax', 'PayRangeMax', 'maximumSalary', 'MaximumSalary'],
  salaryHidden: ['salaryHidden', 'SalaryHidden', 'HideSalary'],
  skillsHidden: ['skillsHidden', 'SkillsHidden'],
  description: ['description', 'Description', 'JobDescription', 'jobDescription'],
  responsibilities: ['responsibilities', 'Responsibilities'],
  requirements: ['requirements', 'Requirements', 'Qualifications'],
  skills: ['skills', 'Skills', 'requiredSkills', 'RequiredSkills'],
};

const TYPE_TONE = { 'Full-time': 'b-green', Contract: 'b-amber', Internship: 'b-blue', 'Part-time': 'b-gray' };

let JOBS = [];
let els = {};

function esc(value) {
  const str = value == null ? '' : String(value);
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function pick(obj, keys, fallback) {
  if (!obj) return fallback;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function toArray(value) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim()) {
    return value.split(/\r?\n|[;,]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return /^(true|yes|1)$/i.test(value.trim());
  return !!value;
}

function slugify(text) {
  return (
    String(text || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'role'
  );
}

function formatSalary(job) {
  if (job.salaryHidden || !job.salaryMin || !job.salaryMax) return null;
  return `$${Math.round(job.salaryMin / 1000)}k-$${Math.round(job.salaryMax / 1000)}k`;
}

function getApplicationFieldFromError(responseText) {
  const normalizedText = String(responseText || '').toLowerCase();
  const field = Object.keys(APPLICATION_FIELD_LABELS).find((key) => {
    return new RegExp(`(?:^|[^a-z])${key.toLowerCase()}(?:$|[^a-z])`).test(normalizedText);
  });

  return field ? APPLICATION_FIELD_LABELS[field] : '';
}

function emptyForm() {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '+234 ',
    candidateLocation: '',
    currentJobTitle: '',
    yearsOfExperience: '',
    highestQualification: '',
    currentEmployer: '',
    expectedSalary: '',
    availability: '',
    postingID: '',
    resumeName: '',
    resumeBase64: '',
    resumeContentType: '',
    answers: {},
  };
}

function normalizeJob(raw, index) {
  raw = raw || {};
  const title = pick(raw, JOB_FIELD_MAP.title, 'Untitled role');
  const id = String(pick(raw, JOB_FIELD_MAP.id, `${slugify(title)}-${index}`));
  const salaryMin = pick(raw, JOB_FIELD_MAP.salaryMin, null);
  const salaryMax = pick(raw, JOB_FIELD_MAP.salaryMax, null);

  return {
    id,
    title,
    dept: pick(raw, JOB_FIELD_MAP.dept, 'General'),
    location: pick(raw, JOB_FIELD_MAP.location, 'Remote'),
    locationType: pick(raw, JOB_FIELD_MAP.locationType, 'Remote'),
    employmentType: pick(raw, JOB_FIELD_MAP.employmentType, 'Full-time'),
    reqCode: pick(raw, JOB_FIELD_MAP.reqCode, id),
    salaryMin: salaryMin !== null && salaryMin !== '' ? Number(salaryMin) : null,
    salaryMax: salaryMax !== null && salaryMax !== '' ? Number(salaryMax) : null,
    salaryHidden: toBool(pick(raw, JOB_FIELD_MAP.salaryHidden, false)),
    skillsHidden: toBool(pick(raw, JOB_FIELD_MAP.skillsHidden, false)),
    description: pick(raw, JOB_FIELD_MAP.description, ''),
    responsibilities: toArray(pick(raw, JOB_FIELD_MAP.responsibilities, [])),
    requirements: toArray(pick(raw, JOB_FIELD_MAP.requirements, [])),
    skills: toArray(pick(raw, JOB_FIELD_MAP.skills, [])),
    screeningQuestions: Array.isArray(raw.screeningQuestions) ? raw.screeningQuestions : [],
  };
}

async function fetchJobs() {
  const res = await fetch(JOB_POSTINGS_API_URL, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Job postings request failed (${res.status}).`);

  const data = await res.json();
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data.value)
    ? data.value
    : Array.isArray(data.jobs)
    ? data.jobs
    : Array.isArray(data.Jobs)
    ? data.Jobs
    : [];

  return list.map(normalizeJob);
}

async function submitApplication(job, form) {
  const payload = {
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone,
    candidatelocation: form.candidateLocation,
    currentJobTitle: form.currentJobTitle,
    yearsOfExperience: form.yearsOfExperience,
    highestQualification: form.highestQualification,
    currentEmployer: form.currentEmployer,
    expectedSalary: form.expectedSalary,
    availability: form.availability,
    postingID: form.postingID || job.reqCode || job.id,
    resume: {
      fileName: form.resumeName || '',
      contentType: form.resumeContentType || '',
      content: form.resumeBase64 || '',
    },
  };

  const res = await fetch(APPLICATION_SUBMIT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let responseText = '';
    try {
      responseText = await res.text();
    } catch {
    }

    const formatError = /format|invalid|malformed|validation|bad gateway/i.test(responseText);
    if (formatError || res.status === 400 || res.status === 422 || res.status === 502) {
      const field = getApplicationFieldFromError(responseText);
      throw new Error(field ? `${field} contains a value the application service cannot accept. Please check it and try again.` : APPLICATION_FORMAT_ERROR_MESSAGE);
    }

    throw new Error(`Application submission failed (${res.status}).`);
  }
  try {
    return await res.json();
  } catch {
    return {};
  }
}

const state = {
  query: '',
  dept: 'All',
  loc: 'All',
  type: 'All',
  activeJobId: null,
  modalView: 'details',
  applied: new Set(),
  touched: false,
  jobsLoading: true,
  jobsError: null,
  submitLoading: false,
  submitError: null,
  form: emptyForm(),
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  els = {
    query: document.getElementById('f-query'),
    dept: document.getElementById('f-dept'),
    loc: document.getElementById('f-loc'),
    type: document.getElementById('f-type'),
    clearBtn: document.getElementById('clear-filters'),
    resultCount: document.getElementById('result-count'),
    jobList: document.getElementById('job-list'),
    modalOverlay: document.getElementById('job-modal'),
    modalContent: document.getElementById('modal-content'),
  };

  bindStaticEvents();
  populateFilterOptions();
  await loadJobs();
}

async function loadJobs() {
  state.jobsLoading = true;
  state.jobsError = null;
  renderLoadingJobs();

  try {
    JOBS = await fetchJobs();
    state.jobsLoading = false;
    populateFilterOptions();
    render();
  } catch (err) {
    console.error('Failed to load job postings:', err);
    state.jobsLoading = false;
    state.jobsError = (err && err.message) || 'Something went wrong loading open roles.';
    renderJobsError();
  }
}

function departments() {
  return Array.from(new Set(JOBS.map((j) => j.dept)));
}
function locationOptions() {
  return Array.from(new Set(JOBS.map((j) => j.locationType).filter(Boolean)));
}
function employmentTypes() {
  return Array.from(new Set(JOBS.map((j) => j.employmentType)));
}

function populateFilterOptions() {
  els.dept.innerHTML =
    '<option value="All">All departments</option>' +
    departments().map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
  els.loc.innerHTML =
    '<option value="All">All locations</option>' +
    locationOptions().map((l) => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
  els.type.innerHTML =
    '<option value="All">All types</option>' +
    employmentTypes().map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
}

function bindStaticEvents() {
  els.query.addEventListener('input', (e) => { state.query = e.target.value; render(); });
  els.dept.addEventListener('change', (e) => { state.dept = e.target.value; render(); });
  els.loc.addEventListener('change', (e) => { state.loc = e.target.value; render(); });
  els.type.addEventListener('change', (e) => { state.type = e.target.value; render(); });
  els.clearBtn.addEventListener('click', resetFilters);

  els.jobList.addEventListener('click', onJobListClick);

  els.modalOverlay.addEventListener('click', (e) => {
    if (e.target === els.modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.modalOverlay.classList.contains('show')) closeModal();
  });
}

function resetFilters() {
  state.query = '';
  state.dept = 'All';
  state.loc = 'All';
  state.type = 'All';
  els.query.value = '';
  els.dept.value = 'All';
  els.loc.value = 'All';
  els.type.value = 'All';
  render();
}

function getFilteredJobs() {
  const q = state.query.trim().toLowerCase();
  return JOBS.filter(
    (j) =>
      (state.dept === 'All' || j.dept === state.dept) &&
      (state.loc === 'All' || j.locationType === state.loc) &&
      (state.type === 'All' || j.employmentType === state.type) &&
      (q === '' || j.title.toLowerCase().includes(q))
  );
}

function render() {
  const filtered = getFilteredJobs();
  const hasFilters = state.dept !== 'All' || state.loc !== 'All' || state.type !== 'All' || state.query.trim() !== '';
  els.clearBtn.classList.toggle('hidden', !hasFilters);
  els.resultCount.textContent = `Showing ${filtered.length} of ${JOBS.length} open role${JOBS.length !== 1 ? 's' : ''}`;
  renderJobList(filtered);
}

function renderLoadingJobs() {
  els.resultCount.textContent = '';
  els.clearBtn.classList.add('hidden');
  els.jobList.innerHTML = `
    <div class="empty-state">
      <p class="empty-title">Loading open roles…</p>
      <p class="empty-sub">Fetching the latest postings.</p>
    </div>`;
}

function renderJobsError() {
  els.resultCount.textContent = '';
  els.clearBtn.classList.add('hidden');
  els.jobList.innerHTML = `
    <div class="empty-state">
      <p class="empty-title">We couldn't load open roles right now.</p>
      <p class="empty-sub">${esc(state.jobsError)}</p>
      <button type="button" class="btn gray" id="jobs-retry">Retry</button>
    </div>`;
  document.getElementById('jobs-retry').addEventListener('click', loadJobs);
}

function renderJobList(filtered) {
  if (filtered.length === 0) {
    const noJobsAtAll = JOBS.length === 0;
    els.jobList.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">${noJobsAtAll ? 'Currently there are no available jobs, please check again later.' : 'No roles match those filters.'}</p>
        <p class="empty-sub">${noJobsAtAll ? 'New postings show up here automatically — check back soon.' : 'Try widening your search.'}</p>
        ${noJobsAtAll ? '' : '<button type="button" class="btn gray" id="empty-reset">Reset filters</button>'}
      </div>`;
    const resetBtn = document.getElementById('empty-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    return;
  }

  els.jobList.innerHTML = filtered.map((job, i) => jobRowHtml(job, i === filtered.length - 1)).join('');
}

function jobRowHtml(job, isLast) {
  const salary = formatSalary(job);
  const isApplied = state.applied.has(job.id);
  const badge = job.employmentType !== 'Full-time'
    ? `<span class="badge ${TYPE_TONE[job.employmentType] || 'b-gray'}">${esc(job.employmentType)}</span>`
    : '';
  const metaBits = [job.dept, job.location];
  if (salary) metaBits.push(salary);

  const cta = isApplied
    ? '<span class="badge b-green">Applied</span>'
    : `<button type="button" class="btn-primary job-row-cta" data-action="open" data-job-id="${esc(job.id)}">View &amp; apply</button>`;

  return `
    <div class="job-row${isLast ? ' no-border' : ''}" data-job-id="${esc(job.id)}">
      <div class="job-row-main">
        <div class="job-row-title-line">
          <h3 class="job-row-title">${esc(job.title)}</h3>${badge}
        </div>
        <div class="job-row-meta">${metaBits.map(esc).join(' · ')}</div>
      </div>
      ${cta}
    </div>`;
}

function onJobListClick(e) {
  const btn = e.target.closest('[data-action="open"]');
  if (btn) openModal(btn.dataset.jobId);
}

function getActiveJob() {
  return JOBS.find((j) => j.id === state.activeJobId);
}

function openModal(jobId) {
  const job = JOBS.find((j) => j.id === jobId);
  state.activeJobId = jobId;
  state.modalView = 'details';
  state.touched = false;
  state.submitLoading = false;
  state.submitError = null;
  state.form = emptyForm();
  state.form.postingID = job ? (job.reqCode || job.id) : '';
  els.modalOverlay.classList.add('show');
  renderModal();
}

function closeModal() {
  els.modalOverlay.classList.remove('show');
  state.activeJobId = null;
}

function renderModal() {
  const job = getActiveJob();
  if (!job) return;

  if (state.modalView === 'success') {
    els.modalContent.innerHTML = successHtml(job);
    document.getElementById('back-to-roles').addEventListener('click', closeModal);
    return;
  }

  const salary = formatSalary(job);
  const header = `
    <div class="modal-header">
      <div>
        <div class="modal-header-tags">
          <span class="badge ${TYPE_TONE[job.employmentType] || 'b-gray'}">${esc(job.employmentType)}</span>
          <span class="modal-req">${esc(job.reqCode)}</span>
        </div>
        <h2 class="modal-title">${esc(job.title)}</h2>
        <div class="modal-subline">${[job.dept, job.location, salary].filter(Boolean).map(esc).join(' · ')}</div>
      </div>
    </div>`;

  const body = state.modalView === 'details' ? detailsHtml(job) : applyHtml(job);
  els.modalContent.innerHTML = header + body;
  bindModalEvents(job);
}

function sectionHeadingHtml(label) {
  return `<div class="section-heading"><span class="section-heading-bar"></span><h3>${esc(label)}</h3></div>`;
}

function detailsHtml(job) {
  const skillsBlock = !job.skillsHidden && job.skills.length
    ? `<div>${sectionHeadingHtml('Relevant skills')}
        <div class="skill-badges">${job.skills.map((s) => `<span class="badge b-gray">${esc(s)}</span>`).join('')}</div>
      </div>`
    : '';

  const responsibilitiesBlock = job.responsibilities.length
    ? `<div>${sectionHeadingHtml("What you'll do")}
        <ul class="bullet-list">${job.responsibilities.map((r) => `<li><span class="bullet">•</span>${esc(r)}</li>`).join('')}</ul>
      </div>`
    : '';

  const requirementsBlock = job.requirements.length
    ? `<div>${sectionHeadingHtml("What we're looking for")}
        <ul class="bullet-list">${job.requirements.map((r) => `<li><span class="bullet">•</span>${esc(r)}</li>`).join('')}</ul>
      </div>`
    : '';

  return `
    <div class="modal-body">
      <p class="modal-description">${esc(job.description)}</p>
      ${responsibilitiesBlock}
      ${requirementsBlock}
      ${skillsBlock}
      <div class="modal-actions"><button type="button" class="btn" id="apply-now">Apply now</button></div>
    </div>`;
}

function screeningQuestionsHtml(job) {
  if (!job.screeningQuestions || job.screeningQuestions.length === 0) return '';
  return `
    <div class="form-row">
      ${sectionHeadingHtml('Screening questions')}
      ${job.screeningQuestions.map((q) => `
        <div class="form-row" style="margin-top:12px">
          <label>${esc(q.label || q.text || q.question || '')}${q.required ? ' *' : ''}</label>
          <input type="text" class="screening-input" data-question-id="${esc(String(q.id))}" value="${esc(state.form.answers[q.id] || '')}">
        </div>`).join('')}
    </div>`;
}

function formatNigerianPhone(rawValue) {
  const digits = String(rawValue || '').replace(/\D/g, '');
  const normalized = digits.replace(/^234/, '').replace(/^0/, '').slice(0, 10);

  if (!normalized) return '+234 ';

  const groups = [];
  if (normalized.length > 0) groups.push(normalized.slice(0, 3));
  if (normalized.length > 3) groups.push(normalized.slice(3, 6));
  if (normalized.length > 6) groups.push(normalized.slice(6, 10));

  return `+234 ${groups.join(' ')}`;
}

function applyHtml(job) {
  const f = state.form;
  const touched = state.touched;
  const firstNameOk = f.firstName.trim().length > 1;
  const lastNameOk = f.lastName.trim().length > 1;
  const emailOk = /\S+@\S+\.\S+/.test(f.email);
  const phoneOk = f.phone.trim().length > 4;
  const locationOk = f.candidateLocation.trim().length > 1;
  const titleOk = f.currentJobTitle.trim().length > 1;
  const expOk = f.yearsOfExperience.trim().length > 0;
  const qualOk = f.highestQualification.trim().length > 1;
  const employerOk = f.currentEmployer.trim().length > 1;
  const salaryOk = f.expectedSalary.trim().length > 0;
  const availabilityOk = f.availability.trim().length > 0;
  const resumeOk = f.resumeName.trim().length > 0 && f.resumeBase64.trim().length > 0;

  return `
    <form class="modal-body" id="apply-form">
      <button type="button" class="link-btn" id="back-to-details" style="margin-bottom:16px;display:block">← Back to details</button>
      ${state.submitError ? `<p class="hint" style="color:var(--danger);margin:0 0 12px">${esc(state.submitError)}</p>` : ''}
      <div class="form-grid">
        <div class="form-row">
          <label>First name *</label>
          <input type="text" id="f-first-name" value="${esc(f.firstName)}" style="${touched && !firstNameOk ? 'border-color:var(--danger)' : ''}">
          ${touched && !firstNameOk ? '<p class="hint" style="color:var(--danger)">Enter your first name.</p>' : ''}
        </div>
        <div class="form-row">
          <label>Last name *</label>
          <input type="text" id="f-last-name" value="${esc(f.lastName)}" style="${touched && !lastNameOk ? 'border-color:var(--danger)' : ''}">
          ${touched && !lastNameOk ? '<p class="hint" style="color:var(--danger)">Enter your last name.</p>' : ''}
        </div>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label>Email *</label>
          <input type="email" id="f-email" value="${esc(f.email)}" style="${touched && !emailOk ? 'border-color:var(--danger)' : ''}">
          ${touched && !emailOk ? '<p class="hint" style="color:var(--danger)">Enter a valid email.</p>' : ''}
        </div>
        <div class="form-row">
          <label>Phone number *</label>
          <input type="tel" id="f-phone" value="${esc(f.phone || '+234 ')}" style="${touched && !phoneOk ? 'border-color:var(--danger)' : ''}" placeholder="eg. +234 xxx xxx xxxx">
          ${touched && !phoneOk ? '<p class="hint" style="color:var(--danger)">Enter a valid phone number.</p>' : ''}
        </div>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label>Candidate location *</label>
          <input type="text" id="f-candidate-location" value="${esc(f.candidateLocation)}" style="${touched && !locationOk ? 'border-color:var(--danger)' : ''}" placeholder="City, State / Country">
          ${touched && !locationOk ? '<p class="hint" style="color:var(--danger)">Enter your location.</p>' : ''}
        </div>
        <div class="form-row">
          <label>Current job title *</label>
          <input type="text" id="f-current-job-title" value="${esc(f.currentJobTitle)}" style="${touched && !titleOk ? 'border-color:var(--danger)' : ''}">
          ${touched && !titleOk ? '<p class="hint" style="color:var(--danger)">Enter your current job title.</p>' : ''}
        </div>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label>Years of experience *</label>
          <input type="text" id="f-years-experience" value="${esc(f.yearsOfExperience)}" style="${touched && !expOk ? 'border-color:var(--danger)' : ''}" placeholder="e.g. 5 years">
          ${touched && !expOk ? '<p class="hint" style="color:var(--danger)">Enter your experience.</p>' : ''}
        </div>
        <div class="form-row">
          <label>Highest qualification *</label>
          <select id="f-highest-qualification" style="${touched && !qualOk ? 'border-color:var(--danger)' : ''}">
            <option value="">Select qualification</option>
            <option value="High School Diploma" ${f.highestQualification === 'High School Diploma' ? 'selected' : ''}>High School Diploma</option>
            <option value="Associate Degree" ${f.highestQualification === 'Associate Degree' ? 'selected' : ''}>Associate Degree</option>
            <option value="Bachelor's Degree" ${f.highestQualification === "Bachelor's Degree" ? 'selected' : ''}>Bachelor's Degree</option>
            <option value="Master's Degree" ${f.highestQualification === "Master's Degree" ? 'selected' : ''}>Master's Degree</option>
            <option value="Doctorate / PhD" ${f.highestQualification === 'Doctorate / PhD' ? 'selected' : ''}>Doctorate / PhD</option>
            <option value="Professional Certification" ${f.highestQualification === 'Professional Certification' ? 'selected' : ''}>Professional Certification</option>
            <option value="Other" ${f.highestQualification === 'Other' ? 'selected' : ''}>Other</option>
          </select>
          ${touched && !qualOk ? '<p class="hint" style="color:var(--danger)">Select your highest qualification.</p>' : ''}
        </div>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label>Current employer *</label>
          <input type="text" id="f-current-employer" value="${esc(f.currentEmployer)}" style="${touched && !employerOk ? 'border-color:var(--danger)' : ''}">
          ${touched && !employerOk ? '<p class="hint" style="color:var(--danger)">Enter your current employer.</p>' : ''}
        </div>
        <div class="form-row">
          <label>Expected salary *</label>
          <input type="text" id="f-expected-salary" value="${esc(f.expectedSalary)}" style="${touched && !salaryOk ? 'border-color:var(--danger)' : ''}" placeholder="$80,000">
          ${touched && !salaryOk ? '<p class="hint" style="color:var(--danger)">Enter your expected salary.</p>' : ''}
        </div>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label>Availability *</label>
          <select id="f-availability" style="${touched && !availabilityOk ? 'border-color:var(--danger)' : ''}">
            <option value="">Select availability</option>
            <option value="Immediately" ${f.availability === 'Immediately' ? 'selected' : ''}>Immediately</option>
            <option value="Within 2 weeks" ${f.availability === 'Within 2 weeks' ? 'selected' : ''}>Within 2 weeks</option>
            <option value="Within 1 month" ${f.availability === 'Within 1 month' ? 'selected' : ''}>Within 1 month</option>
            <option value="More than 1 month" ${f.availability === 'More than 1 month' ? 'selected' : ''}>More than 1 month</option>
          </select>
          ${touched && !availabilityOk ? '<p class="hint" style="color:var(--danger)">Select your availability.</p>' : ''}
        </div>
        <div class="form-row">
          <label>Posting ID</label>
          <input type="text" id="f-posting-id" value="${esc(f.postingID || job.reqCode || job.id)}" readonly>
        </div>
      </div>
      <div class="form-row">
        <label>CV *</label>
        <div class="resume-row">
          <label class="btn ghost small file-btn">Choose file
            <input type="file" id="f-resume" accept=".pdf,.doc,.docx" class="hidden">
          </label>
          <span class="resume-filename">${f.resumeName ? esc(f.resumeName) : 'PDF, DOC, or DOCX'}</span>
        </div>
        ${touched && !resumeOk ? '<p class="hint" style="color:var(--danger)">Upload your CV to continue.</p>' : ''}
      </div>
      ${screeningQuestionsHtml(job)}
      <div class="modal-actions">
        <button type="submit" class="btn" ${state.submitLoading ? 'disabled' : ''}>${state.submitLoading ? 'Submitting…' : 'Submit application'}</button>
      </div>
    </form>`;
}

function successHtml(job) {
  const firstName = state.form.firstName || 'there';
  return `
    <div class="success-view">
      <div class="success-check"><span>✓</span></div>
      <h2 class="success-title">Application Submitted</h2>
      <p class="success-text">Thanks, ${esc(firstName)} — your application for <strong>${esc(job.title)}</strong> is in. We've sent a confirmation to <strong>${esc(state.form.email)}</strong>.</p>
      <button type="button" class="btn ghost" id="back-to-roles" style="margin-top:24px">Back to open roles</button>
    </div>`;
}

function bindModalEvents(job) {
  const modalCloseBtn = document.getElementById('modal-close');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  if (state.modalView === 'details') {
    document.getElementById('apply-now').addEventListener('click', () => {
      state.modalView = 'apply';
      renderModal();
    });
    return;
  }

  document.getElementById('back-to-details').addEventListener('click', () => {
    state.modalView = 'details';
    renderModal();
  });

  document.getElementById('f-first-name').addEventListener('input', (e) => { state.form.firstName = e.target.value; });
  document.getElementById('f-last-name').addEventListener('input', (e) => { state.form.lastName = e.target.value; });
  document.getElementById('f-email').addEventListener('input', (e) => { state.form.email = e.target.value; });
  const phoneInput = document.getElementById('f-phone');
  phoneInput.addEventListener('input', (e) => {
    const formattedValue = formatNigerianPhone(e.target.value);
    state.form.phone = formattedValue;
    e.target.value = formattedValue;
  });
  document.getElementById('f-candidate-location').addEventListener('input', (e) => { state.form.candidateLocation = e.target.value; });
  document.getElementById('f-current-job-title').addEventListener('input', (e) => { state.form.currentJobTitle = e.target.value; });
  document.getElementById('f-years-experience').addEventListener('input', (e) => { state.form.yearsOfExperience = e.target.value; });
  document.getElementById('f-highest-qualification').addEventListener('change', (e) => { state.form.highestQualification = e.target.value; });
  document.getElementById('f-current-employer').addEventListener('input', (e) => { state.form.currentEmployer = e.target.value; });
  document.getElementById('f-expected-salary').addEventListener('input', (e) => { state.form.expectedSalary = e.target.value; });
  document.getElementById('f-availability').addEventListener('change', (e) => { state.form.availability = e.target.value; });
  document.getElementById('f-posting-id').addEventListener('input', (e) => { state.form.postingID = e.target.value; });

  document.querySelectorAll('.screening-input').forEach((input) => {
    input.addEventListener('input', (e) => {
      state.form.answers[e.target.dataset.questionId] = e.target.value;
    });
    input.addEventListener('change', (e) => {
      state.form.answers[e.target.dataset.questionId] = e.target.value;
    });
  });

  const resumeInput = document.getElementById('f-resume');
  if (resumeInput) {
    resumeInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) {
        state.form.resumeName = '';
        state.form.resumeBase64 = '';
        state.form.resumeContentType = '';
        renderModal();
        return;
      }

      state.form.resumeName = file.name;
      state.form.resumeContentType = file.type;
      renderModal();

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result || '';
        const commaIdx = result.indexOf(',');
        state.form.resumeBase64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : result;
      };
      reader.readAsDataURL(file);
    });
  }

  const form = document.getElementById('apply-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    state.touched = true;

    const formValues = state.form;
    const firstNameOk = formValues.firstName.trim().length > 1;
    const lastNameOk = formValues.lastName.trim().length > 1;
    const emailOk = /\S+@\S+\.\S+/.test(formValues.email);
    const phoneOk = formValues.phone.trim().length > 4;
    const locationOk = formValues.candidateLocation.trim().length > 1;
    const titleOk = formValues.currentJobTitle.trim().length > 1;
    const expOk = formValues.yearsOfExperience.trim().length > 0;
    const qualOk = formValues.highestQualification.trim().length > 1;
    const employerOk = formValues.currentEmployer.trim().length > 1;
    const salaryOk = formValues.expectedSalary.trim().length > 0;
    const availabilityOk = formValues.availability.trim().length > 0;
    const resumeOk = formValues.resumeName.trim().length > 0 && formValues.resumeBase64.trim().length > 0;
    const postingIdOk = (formValues.postingID || job.reqCode || job.id).trim().length > 0;
    const screeningOk = (job.screeningQuestions || [])
      .filter((q) => q.required)
      .every((q) => !!state.form.answers[q.id]);

    if (!(firstNameOk && lastNameOk && emailOk && phoneOk && locationOk && titleOk && expOk && qualOk && employerOk && salaryOk && availabilityOk && resumeOk && postingIdOk && screeningOk)) {
      renderModal();
      return;
    }

    state.submitLoading = true;
    state.submitError = null;
    renderModal();

    try {
      await submitApplication(job, state.form);
      state.submitLoading = false;
      state.applied.add(job.id);
      state.modalView = 'success';
      renderModal();
      render();
    } catch (err) {
      console.error('Failed to submit application:', err);
      state.submitLoading = false;
      state.submitError = (err && err.message) || 'Something went wrong submitting your application. Please try again.';
      renderModal();
    }
  });
}