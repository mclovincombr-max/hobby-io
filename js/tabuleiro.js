// =====================================================
// tabuleiro.js — desenha um tabuleiro na tela
// É usado pelo jogo com amigo e pelos desafios de mate.
// =====================================================

const Tabuleiro = (function () {
  // "︎" força o navegador a mostrar o símbolo como letra (e não como emoji)
  const GLIFOS = { K: "♚︎", Q: "♛︎", R: "♜︎", B: "♝︎", N: "♞︎", P: "♟︎" };
  const NOMES = {
    K: { nome: "rei", fem: false }, Q: { nome: "dama", fem: true }, R: { nome: "torre", fem: true },
    B: { nome: "bispo", fem: false }, N: { nome: "cavalo", fem: false }, P: { nome: "peão", fem: false }
  };

  function descricao(i, p) {
    const casa = Motor.nomeCasa(i);
    if (!p) return casa + ", vazia";
    const info = NOMES[p.t];
    const cor = p.cor === Motor.BRANCAS ? (info.fem ? "branca" : "branco") : (info.fem ? "preta" : "preto");
    return casa + ", " + info.nome + " " + cor;
  }

  // Cria as 64 casas dentro do elemento "el".
  // aoClicar(indiceDaCasa) é chamado quando alguém clica numa casa.
  function criar(el, aoClicar) {
    el.innerHTML = "";
    const casas = [];
    for (let i = 0; i < 64; i++) {
      const botao = document.createElement("button");
      botao.type = "button";
      const peca = document.createElement("span");
      peca.className = "peca";
      const coordLinha = document.createElement("span");
      coordLinha.className = "coord coord-linha";
      const coordColuna = document.createElement("span");
      coordColuna.className = "coord coord-coluna";
      botao.append(peca, coordLinha, coordColuna);
      botao.addEventListener("click", () => aoClicar(i));
      el.appendChild(botao);
      casas.push({ botao, peca, coordLinha, coordColuna });
    }
    let viradoAntes = null;

    // Atualiza o desenho para mostrar o "estado".
    // opcoes: selecionada, destinos (lista de jogadas), ultimo ([de, para]),
    //         xeque (índice do rei em xeque), virado (true = pretas embaixo),
    //         podeClicar (função: a casa é interativa?)
    function atualizar(estado, opcoes) {
      const op = opcoes || {};
      const virado = !!op.virado;
      const destinos = new Map((op.destinos || []).map((m) => [m.para, m]));

      if (virado !== viradoAntes) {
        // muda a ordem das casas no HTML para girar o tabuleiro
        for (let k = 0; k < 64; k++) el.appendChild(casas[virado ? 63 - k : k].botao);
        viradoAntes = virado;
      }

      for (let i = 0; i < 64; i++) {
        const { botao, peca, coordLinha, coordColuna } = casas[i];
        const p = estado.tab[i];
        const l = Motor.linha(i), c = Motor.coluna(i);
        const vl = virado ? 7 - l : l, vc = virado ? 7 - c : c; // posição que aparece na tela

        let classes = "casa " + ((l + c) % 2 === 0 ? "clara" : "escura");
        if (p) classes += p.cor === Motor.BRANCAS ? " branca" : " preta";
        if (op.selecionada === i) classes += " selecionada";
        if (destinos.has(i)) classes += destinos.get(i).captura ? " destino captura" : " destino";
        if (op.ultimo && (op.ultimo[0] === i || op.ultimo[1] === i)) classes += " ultimo";
        if (op.xeque === i) classes += " xeque";
        botao.className = classes;

        peca.textContent = p ? GLIFOS[p.t] : "";
        coordColuna.textContent = vl === 7 ? "abcdefgh"[c] : "";
        coordLinha.textContent = vc === 0 ? String(8 - l) : "";
        botao.setAttribute("aria-label", descricao(i, p));
        botao.setAttribute("aria-pressed", op.selecionada === i ? "true" : "false");
        // só as casas "úteis" entram na navegação por teclado (Tab)
        botao.tabIndex = op.podeClicar && op.podeClicar(i) ? 0 : -1;
      }
    }

    return { atualizar };
  }

  return { criar, GLIFOS, NOMES };
})();
