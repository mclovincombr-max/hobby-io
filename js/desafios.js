// =====================================================
// desafios.js — "Mate em 1": ache o lance que dá xeque-mate
// =====================================================

(function () {
  const $ = (id) => document.getElementById(id);
  const CHAVE_SALVA = "xadrez-desafios-v1";

  // Cada desafio é uma posição escrita em FEN (um texto que descreve o tabuleiro).
  // Para criar o seu: monte a posição no Lichess, copie o FEN e cole aqui.
  // As brancas sempre jogam.
  const DESAFIOS = [
    {
      titulo: "Mate do corredor",
      fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
      dica: "O rei preto está preso atrás dos próprios peões. Qual peça consegue chegar até a última linha?"
    },
    {
      titulo: "Mate do Pastor",
      fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
      dica: "A dama e o bispo estão mirando a mesma casa fraca: f7."
    },
    {
      titulo: "Mate sufocado",
      fen: "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1",
      dica: "O rei preto está cercado pelas próprias peças. Só um cavalo consegue dar esse xeque."
    },
    {
      titulo: "Mate com duas torres",
      fen: "7k/R7/8/8/8/8/8/1R4K1 w - - 0 1",
      dica: "Uma torre já controla a linha 7. Use a outra para dar o xeque na linha 8."
    }
  ];

  const el = {
    tab: $("tabuleiroDesafio"), escolha: $("desafioEscolha"), titulo: $("desafioTitulo"),
    status: $("desafioStatus"), progresso: $("desafioProgresso"),
    dica: $("desafioDica"), solucao: $("desafioSolucao"), reiniciar: $("desafioReiniciar")
  };
  if (!el.tab) return;

  let indice = 0;
  let estado = null;
  let selecionada = -1;
  let destinosSolucao = [];  // usado quando a pessoa pede para ver a solução
  let resolvido = false;
  let ultimo = null;
  const resolvidos = new Set();

  try {
    const salvos = JSON.parse(localStorage.getItem(CHAVE_SALVA) || "[]");
    if (Array.isArray(salvos)) salvos.forEach((n) => { if (n >= 0 && n < DESAFIOS.length) resolvidos.add(n); });
  } catch (erro) {}
  function salvar() {
    try { localStorage.setItem(CHAVE_SALVA, JSON.stringify([...resolvidos])); } catch (erro) {}
  }

  const eMate = (e, m) => {
    const n = Motor.aplicar(e, m);
    return Motor.emXeque(n, n.vez) && Motor.legais(n).length === 0;
  };
  const solucoes = () => Motor.legais(estado).filter((m) => eMate(estado, m));

  function mensagem(texto, classe) {
    el.status.textContent = texto;
    el.status.className = "status" + (classe ? " " + classe : "");
  }

  const quadro = Tabuleiro.criar(el.tab, clicar);

  function desenhar() {
    let destinos = [];
    if (destinosSolucao.length) destinos = destinosSolucao;
    else if (selecionada >= 0) destinos = Motor.legais(estado).filter((m) => m.de === selecionada);
    quadro.atualizar(estado, {
      selecionada, destinos, ultimo,
      xeque: resolvido ? Motor.acharRei(estado, estado.vez) : -1,
      virado: false,
      podeClicar: (i) => !resolvido && ((estado.tab[i] && estado.tab[i].cor === estado.vez) || destinos.some((m) => m.para === i))
    });

    el.titulo.textContent = "Desafio " + (indice + 1) + ": " + DESAFIOS[indice].titulo;
    [...el.escolha.children].forEach((b, i) => {
      b.setAttribute("aria-pressed", i === indice ? "true" : "false");
      b.classList.toggle("feito", resolvidos.has(i));
    });
    el.progresso.textContent = "Resolvidos: " + resolvidos.size + " de " + DESAFIOS.length +
      (resolvidos.size === DESAFIOS.length ? " 🎉 Você completou todos!" : "");
    el.dica.disabled = resolvido;
    el.solucao.disabled = resolvido;
  }

  function escolher(i) {
    indice = i;
    estado = Motor.lerFEN(DESAFIOS[i].fen);
    selecionada = -1;
    destinosSolucao = [];
    resolvido = false;
    ultimo = null;
    mensagem("As brancas jogam e dão xeque-mate em 1 lance.");
    desenhar();
  }

  function clicar(i) {
    if (resolvido) return;
    destinosSolucao = [];
    if (selecionada >= 0) {
      const mov = Motor.legais(estado).find((m) => m.de === selecionada && m.para === i);
      if (mov) { tentar(mov); return; }
    }
    const p = estado.tab[i];
    selecionada = p && p.cor === estado.vez && i !== selecionada ? i : -1;
    desenhar();
  }

  function tentar(mov) {
    const san = Motor.notacao(estado, mov);
    selecionada = -1;
    if (eMate(estado, mov)) {
      estado = Motor.aplicar(estado, mov);
      ultimo = [mov.de, mov.para];
      resolvido = true;
      resolvidos.add(indice);
      salvar();
      mensagem("Xeque-mate com " + san + "! Muito bem! 🏆", "fim");
    } else {
      mensagem("O lance " + san + " não dá mate. Tente outro!", "xeque");
    }
    desenhar();
  }

  // ----- botões -----
  DESAFIOS.forEach((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = "Desafio " + (i + 1);
    b.addEventListener("click", () => escolher(i));
    el.escolha.appendChild(b);
  });

  el.dica.addEventListener("click", () => mensagem("💡 " + DESAFIOS[indice].dica));
  el.solucao.addEventListener("click", () => {
    const lista = solucoes();
    if (!lista.length) return;
    selecionada = lista[0].de;
    destinosSolucao = lista.filter((m) => m.de === lista[0].de);
    mensagem("Solução: " + lista.map((m) => Motor.notacao(estado, m)).join(" ou ") + ". Tente fazer esse lance!");
    desenhar();
  });
  el.reiniciar.addEventListener("click", () => escolher(indice));

  escolher(0);
})();
