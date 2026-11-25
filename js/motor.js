// =====================================================
// motor.js — as REGRAS do xadrez (só lógica, nada de tela)
// Aqui ficam: jogadas legais, xeque, xeque-mate, roque,
// en passant, promoção e os tipos de empate.
// =====================================================
//
// Como o tabuleiro é guardado:
//   - uma lista com 64 casas (índice 0 = a8, índice 63 = h1)
//   - cada casa é null (vazia) ou { t: "Q", cor: "brancas" }
//   - t = tipo da peça: K rei, Q dama, R torre, B bispo, N cavalo, P peão
//   - linha = índice >> 3 (0 = linha 8 do tabuleiro, 7 = linha 1)
//   - coluna = índice & 7 (0 = coluna a, 7 = coluna h)

const Motor = (function () {
  const BRANCAS = "brancas";
  const PRETAS = "pretas";
  const oposta = (cor) => (cor === BRANCAS ? PRETAS : BRANCAS);
  const linha = (i) => i >> 3;
  const coluna = (i) => i & 7;
  const nomeCasa = (i) => "abcdefgh"[coluna(i)] + (8 - linha(i)); // ex.: 52 -> "e2"
  const dentro = (l, c) => l >= 0 && l < 8 && c >= 0 && c < 8;

  // Valor de cada peça (usado para mostrar a vantagem de material)
  const VALOR = { K: 0, Q: 9, R: 5, B: 3, N: 3, P: 1 };

  const DIR_RETA = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DIR_DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const DIR_TODAS = DIR_RETA.concat(DIR_DIAG);
  const SALTOS_CAVALO = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];

  // Quais casas, quando mexidas, tiram o direito de roque
  const DIREITOS = [[60, "KQ"], [4, "kq"], [63, "K"], [56, "Q"], [7, "k"], [0, "q"]];

  // Letras das peças na notação em português
  const LETRAS = { K: "R", Q: "D", R: "T", B: "B", N: "C", P: "" };

  const FEN_INICIAL = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  // ---------- Criar uma posição a partir de um texto (FEN) ----------
  function lerFEN(fen) {
    const [pos, vez, roques, ep, meio, num] = fen.split(" ");
    const tab = new Array(64).fill(null);
    let i = 0;
    for (const ch of pos) {
      if (ch === "/") continue;
      if (ch >= "1" && ch <= "8") { i += Number(ch); continue; }
      const t = ch.toUpperCase();
      tab[i++] = { t, cor: ch === t ? BRANCAS : PRETAS };
    }
    return {
      tab,
      vez: vez === "b" ? PRETAS : BRANCAS,
      roques: !roques || roques === "-" ? "" : roques,
      enPassant: ep && ep !== "-" ? "abcdefgh".indexOf(ep[0]) + (8 - Number(ep[1])) * 8 : -1,
      meio: Number(meio || 0),   // lances desde a última captura ou movimento de peão
      num: Number(num || 1)      // número do lance
    };
  }

  const estadoInicial = () => lerFEN(FEN_INICIAL);

  // ---------- A casa "alvo" está sendo atacada por alguma peça de "porCor"? ----------
  function atacada(e, alvo, porCor) {
    const l = linha(alvo), c = coluna(alvo), tab = e.tab;

    // peões (o peão branco ataca "para cima", então ele está uma linha abaixo)
    const dl = porCor === BRANCAS ? 1 : -1;
    for (const dc of [-1, 1]) {
      const a = l + dl, b = c + dc;
      if (dentro(a, b)) {
        const p = tab[a * 8 + b];
        if (p && p.cor === porCor && p.t === "P") return true;
      }
    }
    // cavalos
    for (const [x, y] of SALTOS_CAVALO) {
      const a = l + x, b = c + y;
      if (dentro(a, b)) {
        const p = tab[a * 8 + b];
        if (p && p.cor === porCor && p.t === "N") return true;
      }
    }
    // rei
    for (const [x, y] of DIR_TODAS) {
      const a = l + x, b = c + y;
      if (dentro(a, b)) {
        const p = tab[a * 8 + b];
        if (p && p.cor === porCor && p.t === "K") return true;
      }
    }
    // torre / dama (linhas retas) e bispo / dama (diagonais)
    const deslizantes = [[DIR_RETA, "R"], [DIR_DIAG, "B"]];
    for (const [dirs, tipo] of deslizantes) {
      for (const [x, y] of dirs) {
        let a = l + x, b = c + y;
        while (dentro(a, b)) {
          const p = tab[a * 8 + b];
          if (p) {
            if (p.cor === porCor && (p.t === tipo || p.t === "Q")) return true;
            break; // achou uma peça no caminho: para de olhar nessa direção
          }
          a += x; b += y;
        }
      }
    }
    return false;
  }

  function acharRei(e, cor) {
    for (let i = 0; i < 64; i++) {
      const p = e.tab[i];
      if (p && p.t === "K" && p.cor === cor) return i;
    }
    return -1;
  }

  const emXeque = (e, cor) => atacada(e, acharRei(e, cor), oposta(cor));

  // ---------- Todas as jogadas "quase" legais (ainda não olhou se deixa o rei em xeque) ----------
  function gerarPseudo(e) {
    const cor = e.vez, op = oposta(cor), tab = e.tab, lista = [];

    const adicionar = (de, para, extra) =>
      lista.push(Object.assign({ de, para, peca: tab[de].t, captura: null }, extra));

    // peão que chega na última linha vira Dama, Torre, Bispo ou Cavalo
    const adicionarPeao = (de, para, promove, extra) => {
      if (promove) for (const t of ["Q", "R", "B", "N"]) adicionar(de, para, Object.assign({ promo: t }, extra));
      else adicionar(de, para, extra);
    };

    for (let de = 0; de < 64; de++) {
      const p = tab[de];
      if (!p || p.cor !== cor) continue;
      const l = linha(de), c = coluna(de);

      if (p.t === "P") {
        const dir = cor === BRANCAS ? -1 : 1;
        const inicio = cor === BRANCAS ? 6 : 1;
        const ultima = cor === BRANCAS ? 0 : 7;
        const l1 = l + dir;
        const frente = l1 * 8 + c;
        if (!tab[frente]) {
          adicionarPeao(de, frente, l1 === ultima, {});
          const frente2 = (l + 2 * dir) * 8 + c;
          if (l === inicio && !tab[frente2]) adicionar(de, frente2, { duplo: true });
        }
        for (const dc of [-1, 1]) {
          const b = c + dc;
          if (b < 0 || b > 7) continue;
          const alvo = l1 * 8 + b;
          const q = tab[alvo];
          if (q && q.cor === op) adicionarPeao(de, alvo, l1 === ultima, { captura: q.t });
          else if (alvo === e.enPassant) adicionar(de, alvo, { captura: "P", enPassant: true });
        }
      } else if (p.t === "N" || p.t === "K") {
        const saltos = p.t === "N" ? SALTOS_CAVALO : DIR_TODAS;
        for (const [x, y] of saltos) {
          const a = l + x, b = c + y;
          if (!dentro(a, b)) continue;
          const q = tab[a * 8 + b];
          if (!q) adicionar(de, a * 8 + b, {});
          else if (q.cor === op) adicionar(de, a * 8 + b, { captura: q.t });
        }
        // roque
        if (p.t === "K" && de === (cor === BRANCAS ? 60 : 4) && !atacada(e, de, op)) {
          const reiLado = cor === BRANCAS ? "K" : "k";
          const damaLado = cor === BRANCAS ? "Q" : "q";
          const eTorre = (i) => tab[i] && tab[i].t === "R" && tab[i].cor === cor;
          if (e.roques.includes(reiLado) && !tab[de + 1] && !tab[de + 2] && eTorre(de + 3) &&
              !atacada(e, de + 1, op) && !atacada(e, de + 2, op)) {
            adicionar(de, de + 2, { roque: "K" });
          }
          if (e.roques.includes(damaLado) && !tab[de - 1] && !tab[de - 2] && !tab[de - 3] && eTorre(de - 4) &&
              !atacada(e, de - 1, op) && !atacada(e, de - 2, op)) {
            adicionar(de, de - 2, { roque: "Q" });
          }
        }
      } else {
        const dirs = p.t === "R" ? DIR_RETA : p.t === "B" ? DIR_DIAG : DIR_TODAS;
        for (const [x, y] of dirs) {
          let a = l + x, b = c + y;
          while (dentro(a, b)) {
            const q = tab[a * 8 + b];
            if (!q) adicionar(de, a * 8 + b, {});
            else {
              if (q.cor === op) adicionar(de, a * 8 + b, { captura: q.t });
              break;
            }
            a += x; b += y;
          }
        }
      }
    }
    return lista;
  }

  // ---------- Faz a jogada e devolve uma NOVA posição (a antiga não muda) ----------
  function aplicar(e, m) {
    const tab = e.tab.slice();
    const p = tab[m.de];
    tab[m.de] = null;
    if (m.enPassant) tab[linha(m.de) * 8 + coluna(m.para)] = null; // o peão capturado fica "ao lado"
    tab[m.para] = m.promo ? { t: m.promo, cor: p.cor } : p;
    if (m.roque === "K") { tab[m.para - 1] = tab[m.para + 1]; tab[m.para + 1] = null; } // torre pula o rei
    if (m.roque === "Q") { tab[m.para + 1] = tab[m.para - 2]; tab[m.para - 2] = null; }

    let roques = e.roques;
    for (const [casa, flags] of DIREITOS) {
      if (m.de === casa || m.para === casa) {
        roques = roques.split("").filter((f) => !flags.includes(f)).join("");
      }
    }
    return {
      tab,
      vez: oposta(e.vez),
      roques,
      enPassant: m.duplo ? (m.de + m.para) / 2 : -1,
      meio: p.t === "P" || m.captura ? 0 : e.meio + 1,
      num: e.vez === PRETAS ? e.num + 1 : e.num
    };
  }

  // ---------- Jogadas legais (as que não deixam o próprio rei em xeque) ----------
  function gerarLegais(e) {
    return gerarPseudo(e).filter((m) => !emXeque(aplicar(e, m), e.vez));
  }
  const cache = new WeakMap(); // guarda o resultado para não recalcular à toa
  function legais(e) {
    if (!cache.has(e)) cache.set(e, gerarLegais(e));
    return cache.get(e);
  }

  // ---------- Notação do lance em português (ex.: Cf3, exd5, O-O, Dxf7#) ----------
  function notacao(e, m) {
    let s;
    if (m.roque) {
      s = m.roque === "K" ? "O-O" : "O-O-O";
    } else if (m.peca === "P") {
      s = (m.captura ? "abcdefgh"[coluna(m.de)] + "x" : "") + nomeCasa(m.para);
      if (m.promo) s += "=" + LETRAS[m.promo];
    } else {
      s = LETRAS[m.peca];
      // se duas peças iguais podem ir para a mesma casa, diz de onde saiu
      const iguais = legais(e).filter((o) => o.peca === m.peca && o.para === m.para && o.de !== m.de);
      if (iguais.length) {
        const mesmaColuna = iguais.some((o) => coluna(o.de) === coluna(m.de));
        const mesmaLinha = iguais.some((o) => linha(o.de) === linha(m.de));
        if (!mesmaColuna) s += "abcdefgh"[coluna(m.de)];
        else if (!mesmaLinha) s += String(8 - linha(m.de));
        else s += nomeCasa(m.de);
      }
      if (m.captura) s += "x";
      s += nomeCasa(m.para);
    }
    const depois = aplicar(e, m);
    if (emXeque(depois, depois.vez)) s += legais(depois).length === 0 ? "#" : "+";
    return s;
  }

  // ---------- Identificador da posição (para detectar repetição) ----------
  function chave(e) {
    let s = "";
    for (let i = 0; i < 64; i++) {
      const p = e.tab[i];
      s += p ? (p.cor === BRANCAS ? p.t : p.t.toLowerCase()) : ".";
    }
    const ep = e.enPassant >= 0 && legais(e).some((m) => m.enPassant) ? e.enPassant : -1;
    return s + e.vez[0] + e.roques + ep;
  }

  // ---------- Sobrou material suficiente para dar mate? ----------
  function materialInsuficiente(e) {
    const outras = [];
    for (let i = 0; i < 64; i++) {
      const p = e.tab[i];
      if (p && p.t !== "K") outras.push({ t: p.t, i });
    }
    if (outras.length === 0) return true;                                       // rei contra rei
    if (outras.length === 1 && (outras[0].t === "B" || outras[0].t === "N")) return true; // rei + bispo/cavalo
    if (outras.every((o) => o.t === "B")) {                                     // só bispos da mesma cor de casa
      return new Set(outras.map((o) => (linha(o.i) + coluna(o.i)) % 2)).size === 1;
    }
    return false;
  }

  // ---------- Como está a partida? ----------
  // "chaves" é a lista de posições já vistas (inclui a atual).
  function situacao(e, chaves) {
    const emCheque = emXeque(e, e.vez);
    if (legais(e).length === 0) {
      return emCheque
        ? { fim: true, tipo: "mate", vencedor: oposta(e.vez), xeque: true }
        : { fim: true, tipo: "afogamento", vencedor: null, xeque: false };
    }
    if (materialInsuficiente(e)) return { fim: true, tipo: "material", vencedor: null, xeque: emCheque };
    const atual = chaves[chaves.length - 1];
    if (chaves.filter((k) => k === atual).length >= 3) return { fim: true, tipo: "repeticao", vencedor: null, xeque: emCheque };
    if (e.meio >= 100) return { fim: true, tipo: "cinquenta", vencedor: null, xeque: emCheque };
    return { fim: false, xeque: emCheque };
  }

  // Soma o valor das peças de uma cor (sem o rei)
  function material(e, cor) {
    let total = 0;
    for (const p of e.tab) if (p && p.cor === cor) total += VALOR[p.t];
    return total;
  }

  // Conta quantas posições existem após N lances (serve só para TESTAR o motor)
  function perft(e, profundidade) {
    if (profundidade === 0) return 1;
    const lista = gerarLegais(e);
    if (profundidade === 1) return lista.length;
    let total = 0;
    for (const m of lista) total += perft(aplicar(e, m), profundidade - 1);
    return total;
  }

  return {
    BRANCAS, PRETAS, VALOR, FEN_INICIAL,
    oposta, linha, coluna, nomeCasa,
    lerFEN, estadoInicial, legais, aplicar, emXeque, acharRei,
    notacao, chave, situacao, material, materialInsuficiente, perft
  };
})();

// Permite testar no Node (no navegador esta linha é ignorada)
if (typeof module !== "undefined") module.exports = Motor;
