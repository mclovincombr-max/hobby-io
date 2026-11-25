// =====================================================
// aberturas.js — mostra as aberturas NA PRÁTICA, no tabuleiro.
// Cada abertura vira um mini-tabuleiro com botões para
// avançar, voltar e tocar os lances, com uma explicação
// de cada jogada. As regras vêm do motor.js (o mesmo do jogo).
// =====================================================

const Aberturas = (function () {
  // Lances em notação portuguesa (C = cavalo, B = bispo, D = dama, T = torre).
  // "notas" tem uma explicação para cada lance, na mesma ordem.
  const DADOS = {
    italiana: {
      lances: "e4 e5 Cf3 Cc6 Bc4 Bc5",
      notas: [
        "As brancas ocupam o centro e abrem caminho para o bispo e para a dama.",
        "As pretas respondem do mesmo jeito e também brigam pelo centro.",
        "O cavalo sai de casa e já ataca o peão de e5.",
        "As pretas defendem o peão com o cavalo.",
        "O bispo aponta para f7, o ponto mais fraco das pretas.",
        "As pretas também desenvolvem o bispo e miram f2. Uma continuação muito comum."
      ]
    },
    siciliana: {
      lances: "e4 c5 Cf3 d6 d4 cxd4 Cxd4 Cf6 Cc3",
      notas: [
        "Começo igual ao de muitas aberturas: o peão vai para o centro.",
        "As pretas não copiam: atacam o centro pelo lado, de olho na casa d4.",
        "O cavalo sai de casa e prepara o avanço do peão de d4.",
        "O peão abre caminho para o bispo e protege a casa e5.",
        "As brancas abrem o centro. Agora vai ter troca!",
        "As pretas capturam, trocando um peão do lado por um peão do centro.",
        "O cavalo recaptura e fica muito bem posicionado no meio do tabuleiro.",
        "As pretas desenvolvem o cavalo e atacam o peão de e4.",
        "As brancas defendem o peão com o outro cavalo. A partida fica cheia de luta!"
      ]
    },
    gambito: {
      lances: "d4 d5 c4 e6 Cc3 Cf6",
      notas: [
        "Dessa vez o peão da dama abre o jogo.",
        "As pretas ocupam o centro com o mesmo peão.",
        "Aqui está o gambito: as brancas oferecem o peão de c4. Se as pretas capturarem (dxc4), as brancas recuperam o peão e ficam com mais espaço no centro.",
        "As pretas recusam a oferta e protegem o peão de d5.",
        "O cavalo sai de casa e reforça o controle do centro.",
        "As pretas desenvolvem o cavalo e também miram o centro."
      ]
    },
    espanhola: {
      lances: "e4 e5 Cf3 Cc6 Bb5 a6 Ba4 Cf6 O-O",
      notas: [
        "O peão vai para o centro.",
        "As pretas respondem com o mesmo lance.",
        "O cavalo ataca o peão de e5.",
        "O cavalo preto defende o peão.",
        "O bispo pressiona o cavalo que defende e5. Essa é a Ruy Lopez!",
        "As pretas perguntam ao bispo o que ele vai fazer.",
        "O bispo recua, mas continua apontando para o cavalo.",
        "As pretas desenvolvem o cavalo e atacam o peão de e4.",
        "Roque! O rei vai para um lugar seguro e a torre entra no jogo."
      ]
    },
    francesa: {
      lances: "e4 e6 d4 d5 Cc3 Cf6",
      notas: [
        "O peão vai para o centro.",
        "As pretas preparam o avanço do peão de d5, mas fecham a diagonal do bispo.",
        "As brancas ocupam o centro com dois peões.",
        "As pretas desafiam o centro branco. Esse é o ponto principal da Defesa Francesa.",
        "O cavalo defende o peão de e4.",
        "As pretas atacam o peão de e4 de novo, mantendo a posição sólida."
      ]
    },
    carokann: {
      lances: "e4 c6 d4 d5 Cc3 dxe4 Cxe4 Bf5",
      notas: [
        "O peão vai para o centro.",
        "As pretas preparam o peão de d5 sem fechar o bispo de casas claras.",
        "As brancas ocupam o centro com dois peões.",
        "As pretas desafiam o centro, como na Francesa.",
        "O cavalo defende o peão de e4.",
        "As pretas capturam o peão do centro.",
        "O cavalo recaptura e fica bem no meio do tabuleiro.",
        "Aqui está a vantagem da Caro-Kann: o bispo sai para f5, fora da corrente de peões. Muito confiável!"
      ]
    },
    pastor: {
      lances: "e4 e5 Dh5 Cc6 Bc4 Cf6 Dxf7#",
      notas: [
        "O peão vai para o centro e libera a dama e o bispo.",
        "As pretas respondem do mesmo jeito.",
        "A dama sai cedo, apontando para f7 e para o peão de e5.",
        "As pretas defendem o peão de e5 com o cavalo.",
        "O bispo também mira f7. Agora são duas peças atacando o mesmo ponto!",
        "Erro! As pretas atacam a dama, mas esqueceram de proteger f7.",
        "Xeque-mate! A dama captura em f7, protegida pelo bispo, e o rei não tem como escapar."
      ]
    },
    louco: {
      lances: "f3 e5 g4 Dh4#",
      notas: [
        "As brancas abrem o jogo com um lance que enfraquece o rei.",
        "As pretas ocupam o centro e abrem a diagonal da dama.",
        "Outro lance ruim: agora a diagonal do rei branco está totalmente aberta.",
        "Xeque-mate em 2 lances! A dama desce até h4 e o rei branco não tem para onde ir."
      ]
    }
  };

  // Descobre as jogadas legais que combinam com cada lance escrito
  function calcular(lances) {
    const estados = [Motor.estadoInicial()], movs = [], sans = [];
    const limpa = (s) => s.replace(/[+#]/g, "");
    for (const san of lances.split(" ")) {
      const e = estados[estados.length - 1];
      const m = Motor.legais(e).find((x) => limpa(Motor.notacao(e, x)) === limpa(san));
      if (!m) { console.warn("Lance não encontrado:", san); break; }
      sans.push(Motor.notacao(e, m));
      movs.push(m);
      estados.push(Motor.aplicar(e, m));
    }
    return { estados, movs, sans };
  }

  function montar(host, dados, aoFechar) {
    const { estados, movs, sans } = calcular(dados.lances);
    const total = movs.length;
    let idx = 0, timer = null;

    const raiz = document.createElement("div");
    raiz.className = "pratica" + (host.classList.contains("carta") ? " compacta" : "");
    raiz.innerHTML =
      '<div class="tabuleiro tabuleiro-aberturas" aria-label="Tabuleiro da abertura"></div>' +
      '<div class="pratica-lado">' +
        '<p class="pratica-nota" role="status" aria-live="polite"></p>' +
        '<div class="pratica-controles">' +
          '<button type="button" class="botao secundario" data-a="inicio" aria-label="Voltar ao início">⏮</button>' +
          '<button type="button" class="botao secundario" data-a="volta" aria-label="Lance anterior">◀</button>' +
          '<button type="button" class="botao" data-a="avanca">Próximo lance ▶</button>' +
          '<button type="button" class="botao secundario" data-a="toca">▶ Tocar</button>' +
        '</div>' +
        '<div class="pratica-lances" role="group" aria-label="Lances da abertura"></div>' +
      '</div>';
    host.appendChild(raiz);

    const tabEl = raiz.querySelector(".tabuleiro");
    const nota = raiz.querySelector(".pratica-nota");
    const lista = raiz.querySelector(".pratica-lances");
    const bVolta = raiz.querySelector('[data-a="volta"]');
    const bInicio = raiz.querySelector('[data-a="inicio"]');
    const bAvanca = raiz.querySelector('[data-a="avanca"]');
    const bToca = raiz.querySelector('[data-a="toca"]');
    const tela = Tabuleiro.criar(tabEl, () => {});

    // lista de lances clicáveis (1. e4 e5 ...)
    const chips = sans.map((san, i) => {
      if (i % 2 === 0) {
        const n = document.createElement("span");
        n.className = "n"; n.textContent = (i / 2 + 1) + ".";
        lista.appendChild(n);
      }
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = san;
      b.addEventListener("click", () => { parar(); ir(i + 1); });
      lista.appendChild(b);
      return b;
    });

    function rotulo(i) { // i = número do lance feito (1 = primeiro)
      return (Math.floor((i - 1) / 2) + 1) + ((i - 1) % 2 === 0 ? ". " : "... ") + sans[i - 1];
    }

    function ir(novo) {
      idx = Math.max(0, Math.min(total, novo));
      const e = estados[idx];
      const ult = idx > 0 ? [movs[idx - 1].de, movs[idx - 1].para] : null;
      const xeque = Motor.emXeque(e, e.vez) ? Motor.acharRei(e, e.vez) : undefined;
      tela.atualizar(e, { ultimo: ult, xeque, podeClicar: () => false });

      if (idx === 0) {
        nota.innerHTML = "Posição inicial. Aperte <strong>Próximo lance</strong> para ver a abertura acontecendo.";
      } else {
        nota.innerHTML = "<strong></strong><span></span>";
        nota.firstChild.textContent = rotulo(idx);
        nota.lastChild.textContent = dados.notas[idx - 1] || "";
      }
      chips.forEach((c, i) => {
        c.setAttribute("aria-pressed", i === idx - 1 ? "true" : "false");
      });
      bVolta.disabled = bInicio.disabled = idx === 0;
      bAvanca.disabled = idx === total;
      bAvanca.textContent = idx === 0 ? "Começar ▶" : "Próximo lance ▶";
    }

    function parar() {
      if (timer) { clearInterval(timer); timer = null; }
      bToca.textContent = "▶ Tocar";
    }
    function tocar() {
      if (timer) { parar(); return; }
      if (idx === total) ir(0);
      bToca.textContent = "⏸ Pausar";
      timer = setInterval(() => {
        if (idx >= total) { parar(); return; }
        ir(idx + 1);
        if (idx >= total) parar();
      }, 1700);
    }

    bInicio.addEventListener("click", () => { parar(); ir(0); });
    bVolta.addEventListener("click", () => { parar(); ir(idx - 1); });
    bAvanca.addEventListener("click", () => { parar(); ir(idx + 1); });
    bToca.addEventListener("click", tocar);
    raiz.addEventListener("keydown", (ev) => {
      if (ev.target.tagName === "INPUT") return;
      if (ev.key === "ArrowRight") { parar(); ir(idx + 1); ev.preventDefault(); }
      if (ev.key === "ArrowLeft") { parar(); ir(idx - 1); ev.preventDefault(); }
    });

    ir(0);
    return { parar };
  }

  // Liga cada bloco da página (data-abertura="...") ao seu tabuleiro
  function iniciar() {
    document.querySelectorAll("[data-abertura]").forEach((host) => {
      const dados = DADOS[host.dataset.abertura];
      if (!dados) return;
      const pratica = montar(host, dados);
      // ao fechar a sanfona, o "Tocar" para sozinho
      if (host.tagName === "DETAILS") {
        host.addEventListener("toggle", () => { if (!host.open) pratica.parar(); });
      }
    });
  }

  return { iniciar, DADOS, calcular };
})();

if (typeof module !== "undefined") module.exports = Aberturas;
else if (document.querySelector("[data-abertura]")) Aberturas.iniciar();
