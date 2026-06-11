(() => {
  function notify(message) {
    if (typeof window.appNotify === 'function') return window.appNotify(message);
    const box = document.createElement('div');
    box.className = 'app-notice show';
    box.innerHTML = `<div class="app-notice-card">${escapeHtml(message || 'Aviso do aplicativo.')}</div>`;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3500);
  }

  function fmtScore(value, max) {
    const n = Number(value || 0);
    return `${Number.isInteger(n) ? n : n.toFixed(1)}/${max}`;
  }

  window.renderCorrection = function (corrections = []) {
    if (!Array.isArray(corrections) || !corrections.length) {
      notify('Ainda não encontrei a correção desta tentativa. Finalize novamente ou confira o log da IA.');
      return;
    }

    const html = corrections.map((c) => {
      if (c.kind === 'open') {
        const comment = c.comment || 'A IA não devolveu comentário para esta resposta.';
        const answer = c.answerText || 'Resposta não registrada.';
        return `
          <article class="correction-card">
            <span class="score-pill">Questão ${c.order} · Aberta · ${fmtScore(c.score, c.maxScore || 2)}</span>
            <p><b>Enunciado:</b> ${escapeHtml(c.prompt)}</p>
            <p><b>Sua resposta:</b> ${escapeHtml(answer)}</p>
            <p><b>Comentário da IA:</b> ${escapeHtml(comment)}</p>
          </article>
        `;
      }

      const selected = c.options?.find((o) => o.id === c.selectedOptionId)?.text || 'Não marcada';
      const correct = c.options?.find((o) => o.id === c.correctOptionId)?.text || 'Não encontrada';
      return `
        <article class="correction-card">
          <span class="score-pill">Questão ${c.order} · Fechada · ${c.isCorrect ? 'correta' : 'incorreta'}</span>
          <p><b>Enunciado:</b> ${escapeHtml(c.prompt)}</p>
          <p><b>Sua resposta:</b> ${escapeHtml(selected)}</p>
          <p><b>Resposta correta:</b> ${escapeHtml(correct)}</p>
        </article>
      `;
    }).join('');

    showModal(`
      <div class="correction-modal-head">
        <h2>Correção da tentativa</h2>
        <button class="icon-close" id="closeCorrectionModal" type="button" aria-label="Fechar">×</button>
      </div>
      <div class="correction-scroll">${html}</div>
    `);
    const card = document.querySelector('.modal-card');
    if (card) card.classList.add('correction-modal-card');
    document.getElementById('closeCorrectionModal').onclick = () => {
      if (card) card.classList.remove('correction-modal-card');
      closeModal();
    };
  };

  const oldShowResult = window.showResult;
  window.showResult = function (res) {
    oldShowResult(res);
    const result = res?.result || state.attempt?.result;
    if (result) state.lastResult = result;
    els.viewCorrectionBtn.textContent = 'Ver correção';
    els.viewCorrectionBtn.onclick = () => renderCorrection(state.lastResult?.corrections || result?.corrections || []);
    const openCorrections = (result?.corrections || []).filter((c) => c.kind === 'open');
    const corrected = openCorrections.filter((c) => c.comment && Number(c.score) > 0).length;
    if (openCorrections.length) {
      els.resultSummary.textContent = corrected
        ? `Tentativa finalizada. A IA corrigiu ${corrected}/${openCorrections.length} respostas abertas.`
        : 'Tentativa finalizada, mas a correção automática das abertas não retornou nota/comentário. Confira o botão de correção alternativa ou o painel de IA.';
    }
  };
})();
