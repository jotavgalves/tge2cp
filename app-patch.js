const originalRender = render;
const originalShowDashboard = showDashboard;

function ensureSwitchButton() {
  const hero = document.querySelector('.hero');
  if (!hero) return null;
  let btn = document.getElementById('switchEntryHero');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'switchEntryHero';
    btn.className = 'switch-entry hidden';
    btn.type = 'button';
    btn.title = 'Trocar entrada';
    btn.setAttribute('aria-label', 'Trocar entrada');
    btn.innerHTML = '<span>⇄</span>';
    btn.onclick = switchEntry;
    hero.appendChild(btn);
  }
  return btn;
}

function switchEntry() {
  localStorage.removeItem('tge_guest_session');
  state.mode = null;
  state.user = null;
  state.token = null;
  state.attempt = null;
  state.current = 0;
  state.startedAt = null;
  clearInterval(state.timer);
  hideGuestFeatures();
  closeModal();
  clearPanels();
  els.simulator.classList.add('hidden');
  els.home.classList.remove('hidden');
  const btn = ensureSwitchButton();
  if (btn) btn.classList.add('hidden');
}

showDashboard = function () {
  originalShowDashboard();
  const btn = ensureSwitchButton();
  if (btn) btn.classList.remove('hidden');
  const title = els.resultPanel.querySelector('h2');
  if (title) title.textContent = state.user?.displayName || 'Painel';
  els.resultSummary.innerHTML = 'Tudo fica nesta tela: iniciar simulado, acompanhar ranking e conversar no fórum quando estiver como convidado.';
  if (state.mode === 'guest') {
    els.rankingPanel.classList.remove('hidden');
    els.chatWindow.classList.remove('hidden');
    state.chatOpen = true;
    loadChat(true);
  }
};

render = function () {
  originalRender();
  const q = currentQuestion();
  if (!q) return;
  const total = state.attempt?.questions?.length || 20;
  const type = q.kind === 'open' ? 'Aberta' : 'Fechada';
  els.questionText.innerHTML = `<span class="question-pill">Questão ${state.current + 1}/${total} · ${type}</span>${escapeHtml(q.prompt)}`;
};

loadOpenAnswers = async function (userId) {
  try {
    const res = await api(`/api/ranking/open-answers?userId=${encodeURIComponent(userId)}`);
    const html = (res.items || []).map((x, i) => `
      <article class="correction-card open-card-spaced">
        <strong>${i + 1}. ${escapeHtml(x.displayName)} — ${x.score}/${x.maxScore}</strong>
        <p><b>Pergunta:</b> ${escapeHtml(x.prompt)}</p>
        <p><b>Resposta:</b> ${escapeHtml(x.answerText)}</p>
        <p><b>Comentário:</b> ${escapeHtml(x.comment || 'Sem comentário.')}</p>
      </article>
    `).join('') || '<p>Nenhuma resposta aberta encontrada.</p>';

    showModal(`
      <div class="modal-head-row">
        <h2>Respostas abertas</h2>
        <button class="icon-close" id="closeOpenTop" type="button" aria-label="Fechar">×</button>
      </div>
      <div class="open-answers-scroll">${html}</div>
      <div class="modal-actions"><button class="btn primary" id="closeOpen">Fechar</button></div>
    `);
    document.getElementById('closeOpen').onclick = closeModal;
    document.getElementById('closeOpenTop').onclick = closeModal;
  } catch (e) {
    alert(friendlyError(e));
  }
};

ensureSwitchButton();
