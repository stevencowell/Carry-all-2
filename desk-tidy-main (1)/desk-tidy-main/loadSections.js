const sections = [
  'program',
  'syllabus',
  'assessment',
  'project-unit',
  'main-theory',
  'support-activities',
  'advanced-activities'
];

const weekCounts = {
  'main-theory': 10,
  'support-activities': 10,
  'advanced-activities': 10
};

function loadSections() {
  return Promise.all(sections.map(id => {
    return fetch('sections/' + id + '.html')
      .then(resp => resp.text())
      .then(html => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
      });
  }));
}

async function loadWeeks() {
  async function fetchWeekSequential(section, count) {
    const container = document.getElementById(section + '-weeks');
    if (!container) return;
    for (let i = 1; i <= count; i++) {
      const resp = await fetch(`sections/${section}/week${i}.html`);
      const html = await resp.text();
      const div = document.createElement('div');
      div.innerHTML = html;
      container.appendChild(div);
    }
  }

  const promises = [];
  for (const [section, count] of Object.entries(weekCounts)) {
    promises.push(fetchWeekSequential(section, count));
  }
  return Promise.all(promises);
}

document.addEventListener('DOMContentLoaded', () => {
  loadSections()
    .then(loadWeeks)
    .then(() => {
      if (typeof initPage === 'function') initPage();
      if (typeof initQuizFeatures === 'function') initQuizFeatures();
    });
});
