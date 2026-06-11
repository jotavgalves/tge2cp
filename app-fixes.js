(() => {
  function safe(el, fn) { if (el) fn(el); }

  window.openEntry = function (kind) {
    if (kind === 'visitor') {
      hideGuestFeatures();
      showModal(`
        <div class="login-shell">
          <div class="login-kicker">Entrada rápida</div>
          <h2>Visitante</h2>
          <p>Informe um nome para iniciar sua revisão sem login.</p>
          <div class="field"><label>Nome</label><input id="visitorName" autocomplete="name" placeholder="Digite seu nome"></div>
          <div class="modal-actions login-actions">
            <button class="btn" id="visitorBack">Voltar</button>
            <button class="btn primary" id="visitorGo">Entrar</button>
          </div>
        </div>
      `);
      const go = () => {
        const name = normalizeName(document.getElementById('visitorName').value);
        if (name.length < 2) return alert('Digite um nome com pelo menos 2 letras.');
        state.mode = 'visitor';
        state.user = { displayName: name };
        state.token = null;
        localStorage.setItem('tge_visitor_name', name);
        closeModal();
        showDashboard();
      };
      document.getElementById('visitorBack').onclick = closeModal;
      document.getElementById('visitorGo').onclick = go;
      enter('visitorName', go);
      const old = localStorage.getItem('tge_visitor_name');
      if (old) document.getElementById('visitorName').value = old;
      document.getElementById('visitorName').focus();
    }

    if (kind === 'guest') {
      showModal(`
        <div class="login-shell">
          <div class="login-kicker">Acesso com login</div>
          <h2>Convidado</h2>
          <p>Entre com o usuário e a senha liberados para a turma.</p>
          <div class="field"><label>Nome</label><input id="guestName" autocomplete="username" placeholder="Ex.: João"></div>
          <div class="field"><label>Senha</label><input id="guestPass" type="password" autocomplete="current-password" placeholder="Sua senha"></div>
          <div class="modal-actions login-actions">
            <button class="btn" id="guestBack">Voltar</button>
            <button class="btn primary" id="guestGo">Entrar</button>
          </div>
        </div>
      `);
      document.getElementById('guestBack').onclick = closeModal;
      document.getElementById('guestGo').onclick = guestLogin;
      enter('guestName', guestLogin);
      enter('guestPass', guestLogin);
      document.getElementById('guestName').focus();
    }
  };

  document.querySelectorAll('[data-entry]').forEach((btn) => {
    btn.onclick = () => window.openEntry(btn.dataset.entry);
  });

  const previousShowDashboard = window.showDashboard;
  window.showDashboard = function () {
    previousShowDashboard();
    if (state.mode === 'guest') {
      state.chatOpen = false;
      els.chatWindow.classList.add('hidden');
      els.chatWindow.classList.remove('chat-visible');
      loadUnread();
    }
  };

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
          <h2>Respostas abertas</h2>
          <button class="icon-close" id="closeOpenTop" type="button" aria-label="Fechar">×</button>
        </div>
        <div class="open-answers-scroll">${html}</div>
      `);
      document.getElementById('closeOpenTop').onclick = closeModal;
    } catch (e) {
      alert(friendlyError(e));
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
        if (q.kind === 'closed' && !q.selectedOptionId) return alert('Marque uma alternativa para continuar.');
        if (q.kind === 'open' && !normalizeName(els.openAnswer.value)) return alert('Digite sua resposta para continuar.');
        await lockCurrentQuestion();
      }
      if (state.current < state.attempt.questions.length - 1) {
        state.current++;
        render();
      } else {
        await finishAttempt();
      }
    } catch (e) {
      alert(friendlyError(e));
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
      safe(els.chatInput, el => setTimeout(() => el.focus(), 180));
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
})();
