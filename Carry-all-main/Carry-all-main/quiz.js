const SCRIPT_URL = "https://script.google.com/macros/library/d/1lRDkX_JEoFUBeG79UoPAxrsKfQjgGzjpNEC1tBkWIg04l6U4tdv88uBe/7";
const CLASSROOM_LINK = "https://classroom.google.com/c/MTQ4MzIyMzI3Nzla/m/Nzg1NTgyOTE4NDIx/details";

// Voice setup for text-to-speech
const synth = window.speechSynthesis;
let voices = [];
synth.onvoiceschanged = () => { voices = synth.getVoices(); };

function speakText(btn) {
  let text = '';
  if (btn.dataset.text) {
    text = btn.dataset.text;
  } else {
    const p = btn.closest('p');
    if (p) {
      text = Array.from(p.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent.trim())
        .join(' ');
    } else {
      const lbl = btn.closest('label');
      text = Array.from(lbl.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent.trim())
        .filter(t => t.length)
        .join(' ');
    }
  }
  if (!voices.length) voices = synth.getVoices();
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = voices.find(v => v.name === 'Google UK English Female')
             || voices.find(v => /Natural/.test(v.name))
             || voices[0];
  synth.speak(utt);
}

function showResultPopup(url) {
  const overlay = document.getElementById('resultPopup');
  const link = document.getElementById('popupClassroomLink');
  if (link) link.href = url || '#';
  if (overlay) overlay.classList.add('active');
}

function showSubmittedPopup(url) {
  const overlay = document.getElementById('submittedPopup');
  const btn = document.getElementById('submittedOkBtn');
  if (!overlay || !btn) { showResultPopup(url); return; }
  overlay.classList.add('active');
  btn.onclick = () => {
    overlay.classList.remove('active');
    showResultPopup(url);
  };
}

function askForName() {
  return new Promise(resolve => {
    const overlay = document.getElementById('namePopup');
    const input = document.getElementById('studentName');
    const btn = document.getElementById('submitNameBtn');
    if (!overlay || !input || !btn) { resolve(''); return; }
    overlay.classList.add('active');
    btn.onclick = () => {
      const name = input.value.trim();
      if (!name) return;
      overlay.classList.remove('active');
      resolve(name);
    };
  });
}

function shuffleQuizAnswers() {
  document.querySelectorAll('form.quiz li').forEach(li => {
    const labels = Array.from(li.querySelectorAll('label'));
    if (labels.length <= 1) return;
    li.querySelectorAll('br').forEach(br => br.remove());
    labels.forEach(l => l.remove());
    for (let i = labels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [labels[i], labels[j]] = [labels[j], labels[i]];
    }
    labels.forEach((label, idx) => {
      li.appendChild(label);
      if (idx < labels.length - 1) li.appendChild(document.createElement('br'));
    });
  });
}

function initQuizFeatures() {
  shuffleQuizAnswers();
  const closeBtn = document.querySelector('#resultPopup .close-popup');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('resultPopup').classList.remove('active');
    });
  }
  // Ensure all quiz question buttons have an aria-label
  document.querySelectorAll('form.quiz li > p button').forEach(btn => {
    if (!btn.hasAttribute('aria-label')) {
      btn.setAttribute('aria-label', 'Read question aloud');
    }
  });
  // Add audio buttons after each quiz answer if missing
  document.querySelectorAll('form.quiz label').forEach(label => {
    if (!label.querySelector('button')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '🔊';
      const answerText = label.textContent.trim();
      btn.setAttribute('aria-label', 'Read answer ' + answerText);
      btn.addEventListener('click', e => { e.preventDefault(); speakText(btn); });
      label.appendChild(document.createTextNode(' '));
      label.appendChild(btn);
    }
  });
}

function submitQuiz(btn, quizType) {
  const form = btn.closest('form');
  const fieldset = form.querySelector('fieldset');
  let correct = 0, total = 0;
  const results = [];
  const answerKey = window.answers || {};
  fieldset.querySelectorAll('li').forEach((li) => {
    const radios = li.querySelectorAll('input[type=radio]');
    let userCorrect = false;
    radios.forEach(radio => {
      if (radio.checked) {
        if (radio.getAttribute('data-correct') === 'true') {
          userCorrect = true;
        } else {
          const key = radio.name;
          if (answerKey[key] && answerKey[key] === radio.value) {
            userCorrect = true;
          }
        }
      }
      // Reset label
      radio.parentElement.removeAttribute('data-result');
    });
    total += 1;
    // Mark right/wrong visually
    radios.forEach(radio => {
      if (radio.checked) {
        radio.parentElement.setAttribute('data-result', userCorrect ? "right" : "wrong");
      }
    });
    if (userCorrect) correct += 1;
    results.push({
      question: li.querySelector('p').textContent,
      answer: Array.from(radios).find(r => r.checked)?.value || ''
    });
  });
  // Show feedback
  let msg = `You got ${correct} out of ${total} correct.`;
  form.querySelector('.quiz-msg').textContent = msg;

  askForName().then(name => {
    let quizNumber = '';
    if (/^[MSA]\d+/i.test(quizType)) {
      quizNumber = quizType.toUpperCase();
    } else {
      const numMatch = quizType.match(/Week\s*(\d+)/i);
      const prefix = /Support/i.test(quizType)
        ? 'S'
        : /Advanced/i.test(quizType)
        ? 'A'
        : 'M';
      quizNumber = prefix + (numMatch ? String(numMatch[1]).padStart(3, '0') : '');
    }
    fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quizType,
        quizNumber,
        quiz: results,
        score: correct + "/" + total,
        studentName: name,
        timestamp: new Date().toISOString()
      })
    }).then(() => {
      showSubmittedPopup(CLASSROOM_LINK);
    });
  });
}

function submitAdvancedQuiz(btn, quizType) {
  const form = btn.closest('form');
  const textareas = form.querySelectorAll('textarea');
  const responses = [];
  textareas.forEach((ta) => {
    responses.push({
      question: ta.closest('li').querySelector('p').textContent,
      answer: ta.value.trim()
    });
  });

  const studentName = prompt('Please enter your name to submit your answers:');
  if (!studentName) return;

  form.querySelector('.quiz-msg').textContent =
    'Responses submitted. Your teacher will review them.';

  let quizNumber = '';
  if (/^[MSA]\d+/i.test(quizType)) {
    quizNumber = quizType.toUpperCase();
  } else {
    const numMatch = quizType.match(/Week\s*(\d+)/i);
    const prefix = /Support/i.test(quizType)
      ? 'S'
      : /Advanced/i.test(quizType)
      ? 'A'
      : 'M';
    quizNumber = prefix + (numMatch ? String(numMatch[1]).padStart(3, '0') : '');
  }
  fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quizType,
      quizNumber,
      studentName: studentName.trim(),
      responses,
      timestamp: new Date().toISOString()
    })
  }).then(() => {
    showSubmittedPopup(CLASSROOM_LINK);
  });
}
