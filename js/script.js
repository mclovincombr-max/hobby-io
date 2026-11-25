// =====================================================
// script.js — o site em geral:
// tabuleiro de demonstração do topo, menu e escolha de cor
// =====================================================

// ===== Dados das peças =====
// ("︎" faz o navegador mostrar o símbolo como letra, e não como emoji)
const PECAS = {
  K: { nome: "Rei",    glifo: "♚︎", texto: "anda uma casa em qualquer direção." },
  Q: { nome: "Dama",   glifo: "♛︎", texto: "anda quantas casas quiser em linha reta ou na diagonal." },
  R: { nome: "Torre",  glifo: "♜︎", texto: "anda em linha reta na horizontal ou vertical." },
  B: { nome: "Bispo",  glifo: "♝︎", texto: "anda na diagonal." },
  N: { nome: "Cavalo", glifo: "♞︎", texto: "anda em L e pula as outras peças." },
  P: { nome: "Peão",   glifo: "♟︎", texto: "anda para frente e captura na diagonal." }
};

// Posição inicial: maiúscula = branca, minúscula = preta, "." = vazia
const INICIAL = [
  "rnbqkbnr",
  "pppppppp",
  "........",
  "........",
  "........",
  "........",
  "PPPPPPPP",
  "RNBQKBNR"
];

const tabuleiro = document.getElementById("tabuleiro");
const info = document.getElementById("infoPeca");
let selecionada = null; // guarda {l, c} da peça escolhida

// ===== Movimentos (simplificado: só mostra casas vazias) =====
function calcularDestinos(tipo, cor, l, c) {
  const destinos = [];
  const dentro = (a, b) => a >= 0 && a < 8 && b >= 0 && b < 8;
  const deslizar = (dirs) => {
    for (const [dl, dc] of dirs) {
      let a = l + dl, b = c + dc;
      while (dentro(a, b)) {
        if (INICIAL[a][b] !== ".") break; // para ao encontrar outra peça
        destinos.push([a, b]);
        a += dl; b += dc;
      }
    }
  };
  const saltar = (lista) => {
    for (const [dl, dc] of lista) {
      const a = l + dl, b = c + dc;
      if (dentro(a, b) && INICIAL[a][b] === ".") destinos.push([a, b]);
    }
  };
  const reta = [[1,0],[-1,0],[0,1],[0,-1]];
  const diag = [[1,1],[1,-1],[-1,1],[-1,-1]];
  if (tipo === "R") deslizar(reta);
  if (tipo === "B") deslizar(diag);
  if (tipo === "Q") deslizar(reta.concat(diag));
  if (tipo === "K") saltar(reta.concat(diag));
  if (tipo === "N") saltar([[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]);
  if (tipo === "P") {
    const passo = cor === "branca" ? -1 : 1;
    const inicio = cor === "branca" ? 6 : 1;
    saltar([[passo, 0]]);
    if (l === inicio && INICIAL[l + passo][c] === ".") saltar([[passo * 2, 0]]);
  }
  return destinos;
}

// ===== Desenhar o tabuleiro =====
function desenhar() {
  tabuleiro.innerHTML = "";
  let destinos = [];
  if (selecionada) {
    const letra = INICIAL[selecionada.l][selecionada.c];
    const cor = letra === letra.toUpperCase() ? "branca" : "preta";
    destinos = calcularDestinos(letra.toUpperCase(), cor, selecionada.l, selecionada.c);
  }

  for (let l = 0; l < 8; l++) {
    for (let c = 0; c < 8; c++) {
      const letra = INICIAL[l][c];
      const casa = document.createElement("button");
      casa.type = "button";
      casa.className = "casa " + ((l + c) % 2 === 0 ? "clara" : "escura");

      if (letra !== ".") {
        const tipo = letra.toUpperCase();
        const cor = letra === tipo ? "branca" : "preta";
        casa.classList.add(cor);
        casa.textContent = PECAS[tipo].glifo;
        casa.setAttribute("aria-label", PECAS[tipo].nome + " " + cor);
      } else {
        casa.setAttribute("aria-label", "Casa vazia");
      }
      if (selecionada && selecionada.l === l && selecionada.c === c) casa.classList.add("selecionada");
      if (destinos.some(([a, b]) => a === l && b === c)) casa.classList.add("destino");

      casa.addEventListener("click", () => clicarCasa(l, c));
      tabuleiro.appendChild(casa);
    }
  }
}

function clicarCasa(l, c) {
  const letra = INICIAL[l][c];
  if (letra === ".") {
    selecionada = null;
    info.textContent = "Nenhuma peça selecionada.";
  } else {
    selecionada = { l, c };
    const p = PECAS[letra.toUpperCase()];
    info.textContent = p.nome + ": " + p.texto;
  }
  desenhar();
}

// ===== Menu do celular =====
const botao = document.getElementById("menuBotao");
const menu = document.getElementById("menu");
botao.addEventListener("click", () => {
  const aberto = menu.classList.toggle("aberto");
  botao.setAttribute("aria-expanded", aberto);
});
menu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    menu.classList.remove("aberto");
    botao.setAttribute("aria-expanded", "false");
  })
);

// ===== Escolha da cor do site =====
// O tema fica guardado no navegador (localStorage), então continua na próxima visita.
const botoesTema = document.querySelectorAll(".tema-bolinha");

function aplicarTema(nome) {
  document.documentElement.setAttribute("data-tema", nome);
  botoesTema.forEach((b) => b.setAttribute("aria-pressed", b.dataset.tema === nome ? "true" : "false"));
}

let temaAtual = "roxo";
try { temaAtual = localStorage.getItem("xadrez-tema") || "roxo"; } catch (erro) {}
aplicarTema(temaAtual);

botoesTema.forEach((b) =>
  b.addEventListener("click", () => {
    aplicarTema(b.dataset.tema);
    try { localStorage.setItem("xadrez-tema", b.dataset.tema); } catch (erro) {}
  })
);

// ===== Rodapé =====
document.getElementById("ano").textContent = new Date().getFullYear();

// (só desenha se o tabuleiro existir na página)
if (tabuleiro) desenhar();

// =====================================================
// Capricho: aparecer ao rolar + navegação numerada
// =====================================================

// ===== Elementos que "sobem" quando aparecem na tela =====
(function () {
  const alvos = document.querySelectorAll(
    ".secao h2, .intro, .subtitulo, .carta, details, .jogo, .desafio, " +
    ".perfil-dados div, .jornada li, .sobre, .foto.larga, .dicas-lista li"
  );
  alvos.forEach((el) => {
    el.classList.add("revelar");
    // atraso escalonado entre irmãos (cartas de uma mesma grade entram em sequência)
    const irmaos = Array.from(el.parentElement.children).filter((x) => x.classList.contains("revelar") || x === el);
    el.style.setProperty("--i", Math.min(irmaos.indexOf(el), 6));
  });

  if (!("IntersectionObserver" in window)) {
    alvos.forEach((el) => el.classList.add("visivel"));
    return;
  }
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visivel");
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
  alvos.forEach((el) => obs.observe(el));
})();

// ===== Navegação numerada (1, 2, 3...) e cor que muda com a seção =====
(function () {
  const links = document.querySelectorAll("#dock a");
  const secoes = Array.from(document.querySelectorAll("main > section"));
  if (!links.length || !secoes.length) return;

  function ativar(secao) {
    links.forEach((a) => {
      const ligado = a.dataset.alvo === secao.id;
      a.classList.toggle("ativo", ligado);
      if (ligado) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    // a cor da seção vira a cor do topo, do logo e da navegação
    const cor = getComputedStyle(secao).getPropertyValue("--sec").trim();
    if (cor) document.documentElement.style.setProperty("--cor-atual", cor);
  }

  if (!("IntersectionObserver" in window)) { ativar(secoes[0]); return; }
  const vigia = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => { if (e.isIntersecting) ativar(e.target); });
  }, { rootMargin: "-45% 0px -50% 0px" }); // vale a seção que cruza o meio da tela
  secoes.forEach((s) => vigia.observe(s));
  ativar(secoes[0]);

  // se o tema do site mudar, recalcula a cor da seção atual
  document.querySelectorAll(".tema-bolinha").forEach((b) =>
    b.addEventListener("click", () => {
      const atual = secoes.find((s) => document.querySelector("#dock a.ativo")?.dataset.alvo === s.id);
      if (atual) setTimeout(() => ativar(atual), 30);
    })
  );
})();
