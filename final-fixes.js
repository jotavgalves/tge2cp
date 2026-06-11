(() => {
  let noticeTimer = null;

  function ensureNotice() {
    let box = document.getElementById('appNotice');
    if (!box) {
      box = document.createElement('div');
      box.id = 'appNotice';
      box.className = 'app-notice';
      box.innerHTML = '<div class="app-notice-card" id="appNoticeText"></div>';
      document.body.appendChild(box);
    }
    return box;
  }

  function notify(message) {
    const box = ensureNotice();
    const text = document.getElementById('appNoticeText');
    text.textContent = String(message || 'Aviso do aplicativo.');
    box.classList.add('show');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => box.classList.remove('show'), 3400);
  }

  window.appNotify = notify;
  window.alert = notify;

  function syncSwitchButton() {
    const btn = document.getElementById('switchEntryHero');
    if (!btn) return;
    btn.innerHTML = '<span>↵</span>';
    btn.title = 'Trocar entrada';
    btn.setAttribute('aria-label', 'Trocar entrada');
  }

  const previousShowDashboard = window.showDashboard;
  window.showDashboard = function () {
    previousShowDashboard();
    syncSwitchButton();
    if (state.mode === 'guest') {
      state.chatOpen = false;
      els.chatWindow.classList.add('hidden');
      els.chatWindow.classList.remove('chat-visible');
      loadUnread();
    }
  };

  const previousEnsure = window.ensureSwitchButton;
  if (typeof previousEnsure === 'function') {
    window.ensureSwitchButton = function () {
      const btn = previousEnsure();
      syncSwitchButton();
      return btn;
    };
  }

  window.loadOpenAnswers = async function (userId) {
    try {
      const res = await api(`/api/ranking/open-answers?userId=${encodeURIComponent(userId)}`);
      const html = (res.items || []).map((x, i) => `
        <article class="correction-card open-card-spaced">
          <strong>${i + 1}. ${escapeHtml(x.displayName)} — ${x.score}/${x.maxScore}</strong>
          <p><b>Pergunta:</b> ${escapeHtml(x.prompt)}</p>
          <p><b>Resposta:</b> ${escapeHtml(x.answerText)}</p>
          <p><b>Comentário:</b> ${escapeHtml(x.comment || 'Sem comentário.')}</p>
        </article>
      `).join('') || '<p class="muted">Nenhuma resposta aberta encontrada.</p>';

      showModal(`
        <div class="modal-head-row">
          <h2></h2>
          <button class="icon-close" id="closeOpenTop" type="button" aria-label="Fechar">×</button>
        </div>
        <div class="open-answers-scroll">${html}</div>
      `);
      const card = document.querySelector('.modal-card');
      if (card) card.classList.add('answers-modal');
      document.getElementById('closeOpenTop').onclick = () => {
        if (card) card.classList.remove('answers-modal');
        closeModal();
      };
    } catch (e) {
      notify(friendlyError(e));
    }
  };

  let nextBusy = false;
  els.nextQuestionBtn.onclick = async () => {
    if (nextBusy) return;
    nextBusy = true;
    els.nextQuestionBtn.disabled = true;
    try {
      const q = currentQuestion();
      if (!q) return;
      if (!q.locked) {
        if (q.kind === 'closed' && !q.selectedOptionId) {
          notify('Marque uma alternativa para continuar.');
          return;
        }
        if (q.kind === 'open' && !normalizeName(els.openAnswer.value)) {
          notify('Digite sua resposta para continuar.');
          return;
        }
        await lockCurrentQuestion();
      }
      if (state.current < state.attempt.questions.length - 1) {
        state.current++;
        render();
      } else {
        await finishAttempt();
      }
    } catch (e) {
      notify(friendlyError(e));
    } finally {
      nextBusy = false;
      els.nextQuestionBtn.disabled = false;
    }
  };

  els.chatButton.onclick = () => {
    if (state.mode !== 'guest') return;
    state.chatOpen = !state.chatOpen;
    if (state.chatOpen) {
      els.chatWindow.classList.remove('hidden');
      requestAnimationFrame(() => els.chatWindow.classList.add('chat-visible'));
      loadChat();
      setTimeout(() => els.chatInput?.focus(), 180);
    } else {
      els.chatWindow.classList.remove('chat-visible');
      setTimeout(() => els.chatWindow.classList.add('hidden'), 180);
    }
  };

  els.closeChatBtn.onclick = () => {
    state.chatOpen = false;
    els.chatWindow.classList.remove('chat-visible');
    setTimeout(() => els.chatWindow.classList.add('hidden'), 180);
  };

  syncSwitchButton();
})();
