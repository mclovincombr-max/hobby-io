// =====================================================
// jogo.js — partida entre DOIS jogadores no mesmo aparelho
// (as regras vêm do motor.js e o desenho do tabuleiro.js)
// =====================================================

(function () {
  const BRANCAS = Motor.BRANCAS;
  const PRETAS = Motor.PRETAS;
  const oposta = Motor.oposta;
  const $ = (id) => document.getElementById(id);

  const CHAVE_SALVA = "xadrez-amigos-v1"; // nome usado para guardar no navegador

  const el = {
    tab: $("tabuleiroJogo"), status: $("statusJogo"),
    topo: $("jogadorTopo"), base: $("jogadorBase"),
    nome: [$("nome0"), $("nome1")], pontos: [$("pontos0"), $("pontos1")], tag: [$("tag0"), $("tag1")],
    empates: $("pontosEmpate"), zerar: $("zerarPlacar"),
    relogio: $("relogio"), girarAuto: $("girarAuto"), alternar: $("alternar"),
    nova: $("novaPartida"), desfazer: $("desfazer"), girar: $("girar"),
    trocar: $("trocarCores"), empatar: $("empatar"), desistir: $("desistir"),
    lances: $("listaLances"),
    caixa: $("caixa"), caixaTitulo: $("caixaTitulo"), caixaTexto: $("caixaTexto"), caixaBotoes: $("caixaBotoes")
  };
  if (!el.tab) return;

  // ---------- Configurações e placar (ficam salvos no navegador) ----------
  const cfg = {
    nomes: ["Jogador 1", "Jogador 2"],
    vitorias: [0, 0],
    empates: 0,
    brancas: 0,          // qual jogador (0 ou 1) está de brancas
    alternar: true,      // trocar as cores a cada partida
    girarAuto: false,    // virar o tabuleiro a cada jogada
    relogio: 0,          // minutos por jogador (0 = sem relógio)
    viradoManual: false  // o botão "Girar"
  };

  // ---------- A partida em andamento ----------
  let historico = [];     // lista de posições: [inicial, depois do lance 1, ...]
  let lances = [];        // { mov, san, tempos } de cada lance feito
  let chaves = [];        // identificador de cada posição (para achar repetições)
  let selecionada = -1;   // casa da peça escolhida
  let fim = null;         // null enquanto joga; depois { tipo, vencedor, pontuou }
  let tempos = { brancas: 0, pretas: 0 };  // milissegundos que sobram
  let timer = null;
  let ultimoTick = 0;
  let corDaBarra = { topo: PRETAS, base: BRANCAS };

  const atual = () => historico[historico.length - 1];
  const indiceDoJogador = (cor) => (cor === BRANCAS ? cfg.brancas : 1 - cfg.brancas);
  function nomeDe(cor) {
    const i = indiceDoJogador(cor);
    return (cfg.nomes[i] || "").trim() || "Jogador " + (i + 1);
  }

  // ---------- Caixa de perguntas ----------
  // Mostra uma pergunta com botões e devolve (em uma Promise) o "valor" do botão clicado.
  function perguntar(titulo, texto, opcoes) {
    return new Promise((resolve) => {
      el.caixaTitulo.textContent = titulo;
      el.caixaTexto.textContent = texto;
      el.caixaBotoes.innerHTML = "";
      let resposta = null;
      opcoes.forEach((o) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "botao " + (o.classe || "");
        b.textContent = o.rotulo;
        b.addEventListener("click", () => { resposta = o.valor; el.caixa.close(); });
        el.caixaBotoes.appendChild(b);
      });
      el.caixa.addEventListener("close", () => resolve(resposta), { once: true });
      el.caixa.showModal();
    });
  }

  // ---------- Guardar e carregar ----------
  function salvar() {
    try {
      const partida = {
        movs: lances.map((l) => ({
          de: l.mov.de, para: l.mov.para, promo: l.mov.promo || null,
          tb: l.tempos.brancas, tp: l.tempos.pretas
        })),
        tempos,
        fim
      };
      localStorage.setItem(CHAVE_SALVA, JSON.stringify({ cfg, partida }));
    } catch (erro) { /* sem localStorage: tudo bem, só não salva */ }
  }

  function novaPosicao() {
    historico = [Motor.estadoInicial()];
    lances = [];
    chaves = [Motor.chave(historico[0])];
    selecionada = -1;
    fim = null;
    tempos = { brancas: cfg.relogio * 60000, pretas: cfg.relogio * 60000 };
  }

  // Lê o que estava salvo. Devolve true se conseguiu recuperar a partida.
  function carregar() {
    let dados = null;
    try { dados = JSON.parse(localStorage.getItem(CHAVE_SALVA) || "null"); } catch (erro) { return false; }
    if (!dados || !dados.cfg) return false;

    const c = dados.cfg;
    if (Array.isArray(c.nomes)) cfg.nomes = [String(c.nomes[0] || "").slice(0, 14), String(c.nomes[1] || "").slice(0, 14)];
    if (Array.isArray(c.vitorias)) cfg.vitorias = [Number(c.vitorias[0]) || 0, Number(c.vitorias[1]) || 0];
    cfg.empates = Number(c.empates) || 0;
    cfg.brancas = c.brancas === 1 ? 1 : 0;
    cfg.alternar = c.alternar !== false;
    cfg.girarAuto = !!c.girarAuto;
    cfg.viradoManual = !!c.viradoManual;
    cfg.relogio = [0, 3, 5, 10, 15].includes(Number(c.relogio)) ? Number(c.relogio) : 0;

    const p = dados.partida;
    if (!p || !Array.isArray(p.movs)) return false;
    novaPosicao();
    for (const m of p.movs) {
      const e = atual();
      const mov = Motor.legais(e).find((x) => x.de === m.de && x.para === m.para && (x.promo || null) === (m.promo || null));
      if (!mov) { novaPosicao(); return false; } // dado estranho: começa do zero
      lances.push({ mov, san: Motor.notacao(e, mov), tempos: { brancas: Number(m.tb) || 0, pretas: Number(m.tp) || 0 } });
      const novo = Motor.aplicar(e, mov);
      historico.push(novo);
      chaves.push(Motor.chave(novo));
    }
    if (p.tempos) tempos = { brancas: Number(p.tempos.brancas) || 0, pretas: Number(p.tempos.pretas) || 0 };
    if (p.fim && p.fim.tipo) fim = { tipo: p.fim.tipo, vencedor: p.fim.vencedor || null, pontuou: p.fim.pontuou || null };
    return true;
  }

  // ---------- Relógio ----------
  function formatar(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  function pararRelogio() { clearInterval(timer); timer = null; }
  function iniciarRelogio() {
    pararRelogio();
    if (!cfg.relogio || fim || lances.length === 0) return; // só começa depois do 1º lance
    ultimoTick = Date.now();
    timer = setInterval(tick, 250);
  }
  function tick() {
    if (fim) { pararRelogio(); return; }
    const agora = Date.now();
    const cor = atual().vez;
    tempos[cor] -= agora - ultimoTick;
    ultimoTick = agora;
    if (tempos[cor] <= 0) {
      tempos[cor] = 0;
      terminar({ tipo: "tempo", vencedor: oposta(cor) });
      return;
    }
    desenharRelogios();
  }
  function desenharRelogios() {
    [[el.topo, corDaBarra.topo], [el.base, corDaBarra.base]].forEach(([barra, cor]) => {
      const r = barra.querySelector(".jr");
      r.hidden = !cfg.relogio;
      r.textContent = formatar(tempos[cor]);
      r.classList.toggle("acabando", cfg.relogio > 0 && tempos[cor] <= 10000);
    });
  }

  // ---------- Desenhar tudo ----------
  const quadro = Tabuleiro.criar(el.tab, clicar);

  function virado() { return cfg.viradoManual !== (cfg.girarAuto && atual().vez === PRETAS); }

  function textoStatus() {
    const e = atual();
    if (fim) {
      const venc = fim.vencedor ? nomeDe(fim.vencedor) : "";
      switch (fim.tipo) {
        case "mate": return "Xeque-mate! " + venc + " venceu a partida. 🏆";
        case "tempo": return "Acabou o tempo! " + venc + " venceu.";
        case "desistencia": return nomeDe(oposta(fim.vencedor)) + " desistiu. " + venc + " venceu.";
        case "acordo": return "Empate por acordo. 🤝";
        case "afogamento": return "Empate por afogamento: o rei não está em xeque, mas não há nenhum lance possível.";
        case "material": return "Empate: não sobraram peças suficientes para dar mate.";
        case "repeticao": return "Empate: a mesma posição apareceu 3 vezes.";
        case "cinquenta": return "Empate pela regra dos 50 lances (sem captura e sem mover peão).";
      }
    }
    const quem = nomeDe(e.vez) + (e.vez === BRANCAS ? " (brancas)" : " (pretas)");
    return Motor.emXeque(e, e.vez) ? "Xeque! Vez de " + quem + "." : "Vez de " + quem + ".";
  }

  function desenharJogador(barra, cor) {
    const e = atual();
    barra.querySelector(".ficha").className = "ficha " + (cor === BRANCAS ? "branca" : "preta");
    barra.querySelector(".jnome").textContent = nomeDe(cor);
    const vantagem = Motor.material(e, cor) - Motor.material(e, oposta(cor));
    barra.querySelector(".jv").textContent = vantagem > 0 ? "+" + vantagem : "";

    // peças do adversário que este jogador já capturou
    const capturadas = [];
    lances.forEach((l, k) => {
      const quemJogou = k % 2 === 0 ? BRANCAS : PRETAS; // as brancas fazem o 1º lance
      if (l.mov.captura && quemJogou === cor) capturadas.push(l.mov.captura);
    });
    capturadas.sort((a, b) => Motor.VALOR[b] - Motor.VALOR[a]);
    const caixa = barra.querySelector(".jc");
    caixa.textContent = "";
    capturadas.forEach((t) => {
      const s = document.createElement("span");
      s.className = "cap " + (cor === BRANCAS ? "preta" : "branca");
      s.textContent = Tabuleiro.GLIFOS[t];
      caixa.appendChild(s);
    });
    barra.classList.toggle("vez", !fim && e.vez === cor);
  }

  function desenhar() {
    const e = atual();
    const girado = virado();
    const ultimo = lances.length ? lances[lances.length - 1].mov : null;
    const emXeque = Motor.emXeque(e, e.vez);
    const dessa = selecionada >= 0 ? Motor.legais(e).filter((m) => m.de === selecionada) : [];

    quadro.atualizar(e, {
      selecionada,
      destinos: dessa,
      ultimo: ultimo ? [ultimo.de, ultimo.para] : null,
      xeque: emXeque ? Motor.acharRei(e, e.vez) : -1,
      virado: girado,
      podeClicar: (i) => !fim && ((e.tab[i] && e.tab[i].cor === e.vez) || dessa.some((m) => m.para === i))
    });

    corDaBarra = { topo: girado ? BRANCAS : PRETAS, base: girado ? PRETAS : BRANCAS };
    desenharJogador(el.topo, corDaBarra.topo);
    desenharJogador(el.base, corDaBarra.base);
    desenharRelogios();

    el.status.textContent = textoStatus();
    el.status.className = "status" + (fim ? " fim" : emXeque ? " xeque" : "");

    // nomes, cores e placar
    for (let i = 0; i < 2; i++) {
      const cor = cfg.brancas === i ? BRANCAS : PRETAS;
      el.tag[i].textContent = cor === BRANCAS ? "♔ brancas" : "♚ pretas";
      el.tag[i].className = "cor-tag " + (cor === BRANCAS ? "branca" : "preta");
      el.pontos[i].textContent = cfg.vitorias[i];
    }
    el.empates.textContent = cfg.empates;

    // lista de lances
    el.lances.innerHTML = "";
    for (let k = 0; k < lances.length; k += 2) {
      const li = document.createElement("li");
      const n = document.createElement("span");
      n.className = "n";
      n.textContent = k / 2 + 1 + ".";
      const a = document.createElement("span");
      a.className = "lance" + (k === lances.length - 1 ? " atual" : "");
      a.textContent = lances[k].san;
      const b = document.createElement("span");
      b.className = "lance" + (k + 1 === lances.length - 1 ? " atual" : "");
      b.textContent = lances[k + 1] ? lances[k + 1].san : "";
      li.append(n, a, b);
      el.lances.appendChild(li);
    }
    el.lances.scrollTop = el.lances.scrollHeight;

    // botões que dependem do momento da partida
    el.desfazer.disabled = lances.length === 0 && !fim;
    el.trocar.disabled = lances.length > 0 || !!fim;
    el.empatar.disabled = !!fim;
    el.desistir.disabled = !!fim;
    el.relogio.disabled = lances.length > 0;
  }

  // ---------- Jogar ----------
  function clicar(i) {
    if (fim) return;
    const e = atual();
    if (selecionada >= 0) {
      const candidatos = Motor.legais(e).filter((m) => m.de === selecionada && m.para === i);
      if (candidatos.length) { jogar(candidatos); return; }
    }
    const p = e.tab[i];
    selecionada = p && p.cor === e.vez && i !== selecionada ? i : -1;
    desenhar();
  }

  async function jogar(candidatos) {
    let mov = candidatos[0];
    if (candidatos.length > 1) { // são 4 lances de promoção: pergunta em qual peça vira
      const nomes = { Q: "Dama", R: "Torre", B: "Bispo", N: "Cavalo" };
      const escolha = await perguntar(
        "Promoção!", "Seu peão chegou ao fim do tabuleiro. Em qual peça ele vira?",
        ["Q", "R", "B", "N"].map((t) => ({ rotulo: Tabuleiro.GLIFOS[t] + " " + nomes[t], valor: t }))
      );
      if (!escolha) return; // cancelou: o peão continua onde estava
      mov = candidatos.find((m) => m.promo === escolha);
    }
    executar(mov);
  }

  function executar(mov) {
    if (timer) tick();   // desconta o tempo gasto antes de registrar o lance
    if (fim) return;     // (o tempo pode ter acabado agora)
    const e = atual();
    const san = Motor.notacao(e, mov);
    const novo = Motor.aplicar(e, mov);
    lances.push({ mov, san, tempos: { brancas: tempos.brancas, pretas: tempos.pretas } });
    historico.push(novo);
    chaves.push(Motor.chave(novo));
    selecionada = -1;

    const s = Motor.situacao(novo, chaves);
    if (s.fim) { terminar(s); return; }
    if (cfg.relogio) iniciarRelogio();
    salvar();
    desenhar();
  }

  function terminar(s) {
    if (fim) return;
    pararRelogio();
    let pontuou = "empate";
    if (s.vencedor) {
      const idx = indiceDoJogador(s.vencedor);
      cfg.vitorias[idx]++;
      pontuou = String(idx);
    } else {
      cfg.empates++;
    }
    fim = { tipo: s.tipo, vencedor: s.vencedor || null, pontuou };
    selecionada = -1;
    salvar();
    desenhar();
  }

  function tirarPontuacao() {
    if (!fim) return;
    if (fim.pontuou === "empate") cfg.empates = Math.max(0, cfg.empates - 1);
    else if (fim.pontuou === "0" || fim.pontuou === "1") {
      const i = Number(fim.pontuou);
      cfg.vitorias[i] = Math.max(0, cfg.vitorias[i] - 1);
    }
  }

  function desfazer() {
    if (!lances.length && !fim) return;
    let remover = true;
    if (fim) {
      // desistência e empate combinado só "reabrem" a partida, sem apagar nenhum lance
      remover = !["desistencia", "acordo"].includes(fim.tipo) && lances.length > 0;
      tirarPontuacao();
      fim = null;
    }
    if (remover) {
      const l = lances.pop();
      historico.pop();
      chaves.pop();
      tempos = { brancas: l.tempos.brancas, pretas: l.tempos.pretas };
    }
    selecionada = -1;
    if (cfg.relogio && lances.length) iniciarRelogio(); else pararRelogio();
    salvar();
    desenhar();
  }

  async function novaPartida() {
    if (lances.length && !fim) {
      const ok = await perguntar("Nova partida?", "A partida atual ainda não terminou. Quer mesmo começar outra?", [
        { rotulo: "Sim, nova partida", valor: true },
        { rotulo: "Continuar jogando", valor: false, classe: "secundario" }
      ]);
      if (!ok) return;
    }
    if (cfg.alternar && (lances.length || fim)) cfg.brancas = 1 - cfg.brancas; // troca as cores
    pararRelogio();
    novaPosicao();
    salvar();
    desenhar();
  }

  async function desistir() {
    if (fim) return;
    const quem = await perguntar("Quem desiste?", "Escolha quem está entregando a partida.", [
      { rotulo: nomeDe(BRANCAS) + " (brancas)", valor: BRANCAS },
      { rotulo: nomeDe(PRETAS) + " (pretas)", valor: PRETAS },
      { rotulo: "Cancelar", valor: null, classe: "secundario" }
    ]);
    if (quem) terminar({ tipo: "desistencia", vencedor: oposta(quem) });
  }

  async function empatar() {
    if (fim) return;
    const ok = await perguntar("Empate?", "Os dois jogadores concordam em empatar a partida?", [
      { rotulo: "Sim, empatar", valor: true },
      { rotulo: "Não", valor: false, classe: "secundario" }
    ]);
    if (ok) terminar({ tipo: "acordo", vencedor: null });
  }

  async function zerarPlacar() {
    const ok = await perguntar("Zerar o placar?", "As vitórias e os empates voltam para 0. A partida atual continua.", [
      { rotulo: "Sim, zerar", valor: true },
      { rotulo: "Cancelar", valor: false, classe: "secundario" }
    ]);
    if (!ok) return;
    cfg.vitorias = [0, 0];
    cfg.empates = 0;
    if (fim) fim.pontuou = null;
    salvar();
    desenhar();
  }

  // ---------- Ligar os botões ----------
  for (let i = 0; i < 2; i++) {
    el.nome[i].addEventListener("input", () => {
      cfg.nomes[i] = el.nome[i].value.slice(0, 14);
      salvar();
      desenhar();
    });
  }
  el.relogio.addEventListener("change", () => {
    cfg.relogio = Number(el.relogio.value);
    tempos = { brancas: cfg.relogio * 60000, pretas: cfg.relogio * 60000 };
    salvar();
    desenhar();
  });
  el.girarAuto.addEventListener("change", () => { cfg.girarAuto = el.girarAuto.checked; salvar(); desenhar(); });
  el.alternar.addEventListener("change", () => { cfg.alternar = el.alternar.checked; salvar(); });
  el.girar.addEventListener("click", () => { cfg.viradoManual = !cfg.viradoManual; salvar(); desenhar(); });
  el.trocar.addEventListener("click", () => { cfg.brancas = 1 - cfg.brancas; salvar(); desenhar(); });
  el.nova.addEventListener("click", novaPartida);
  el.desfazer.addEventListener("click", desfazer);
  el.desistir.addEventListener("click", desistir);
  el.empatar.addEventListener("click", empatar);
  el.zerar.addEventListener("click", zerarPlacar);

  // ---------- Começar ----------
  if (!carregar()) novaPosicao();
  for (let i = 0; i < 2; i++) el.nome[i].value = cfg.nomes[i];
  el.relogio.value = String(cfg.relogio);
  el.girarAuto.checked = cfg.girarAuto;
  el.alternar.checked = cfg.alternar;
  desenhar();
  if (cfg.relogio && lances.length && !fim) iniciarRelogio();
})();
