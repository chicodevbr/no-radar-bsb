// No Radar BSB: lê eventos.json (gerado pela Pheme toda segunda) e monta a agenda com filtros.
// Sem build: as datas vêm em ISO com o fuso daqui (-03:00), e o dia e a hora saem do próprio texto.

const CATEGORIAS = {
  musica: "Música", teatro: "Teatro", danca: "Dança", cinema: "Cinema", literatura: "Literatura",
  exposicao: "Exposição", festival: "Festival", cultura_popular: "Cultura popular",
  infantil: "Infantil", outro: "Outros",
};
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto",
  "setembro", "outubro", "novembro", "dezembro"];
const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "em", "com",
  "para", "por", "no", "na", "nos", "nas", "um", "uma"]);
const DIAS_NOVO = 7;

const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

const dia = (iso) => (iso ? iso.slice(0, 10) : null);
const hora = (iso) => {
  const h = iso ? iso.slice(11, 16) : "";
  if (!h || h === "00:00") return "";
  return h.endsWith(":00") ? `${+h.slice(0, 2)}h` : `${+h.slice(0, 2)}h${h.slice(3)}`;
};
const ddmm = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const somaDias = (d, n) => {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const diaDaSemana = (d) => SEMANA[new Date(`${d}T12:00:00Z`).getUTCDay()];

// Título em caixa normal, mesmo quando a fonte manda tudo em maiúsculas
function caixaNormal(titulo) {
  if (!/[A-ZÀ-Ú]/.test(titulo) || titulo !== titulo.toUpperCase()) return titulo;
  return titulo.toLowerCase().split(" ").map((p, i) =>
    i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function preco(e) {
  if (e.gratuito) return "gratuito";
  const reais = (v) => `R$ ${Number.isInteger(v) ? v : v.toFixed(2).replace(".", ",")}`;
  if (e.preco_min != null) {
    if (e.preco_max != null && e.preco_max !== e.preco_min) return `a partir de ${reais(e.preco_min)}`;
    return reais(e.preco_min);
  }
  if (e.link_ingresso || e.status === "ingressos_a_venda") return "ingressos à venda";
  return "entrada a confirmar";
}

// A próxima data do evento a partir de hoje (sessões extras contam), e se está em cartaz
function situar(e) {
  const inicio = dia(e.inicio);
  const fim = dia(e.fim);
  if (!inicio) return { tipo: "sem_data" };
  if (fim && fim > inicio && inicio <= hoje) return { tipo: "cartaz", ate: fim };
  const datas = [e.inicio, ...e.datas_extra].filter((d) => dia(d) >= hoje).sort();
  const proxima = datas[0] || e.inicio;
  return { tipo: "dia", dia: dia(proxima), iso: proxima, extras: datas.length - 1, ate: fim && fim > dia(proxima) ? fim : null };
}

let dados = null;
const form = document.getElementById("filtros");
const agenda = document.getElementById("agenda");
const contagem = document.getElementById("contagem");
const atalhos = document.getElementById("atalhos");
const tpl = document.getElementById("tpl-card");

function preencherOpcoes(eventos) {
  const cats = [...new Set(eventos.map((e) => e.categoria))].sort((a, b) =>
    (CATEGORIAS[a] || a).localeCompare(CATEGORIAS[b] || b, "pt"));
  const ras = [...new Set(eventos.flatMap((e) => e.ras))].sort((a, b) => a.localeCompare(b, "pt"));
  for (const c of cats) form.categoria.add(new Option(CATEGORIAS[c] || c, c));
  for (const r of ras) form.ra.add(new Option(r, r));
}

function filtrosDaUrl() {
  const p = new URLSearchParams(location.search);
  if (p.get("periodo")) form.querySelector(`[name=periodo][value="${CSS.escape(p.get("periodo"))}"]`)?.click();
  for (const nome of ["q", "categoria", "ra"]) if (p.get(nome)) form[nome].value = p.get(nome);
  form.gratuito.checked = p.get("gratuito") === "1";
}

function filtrosNaUrl(f) {
  const p = new URLSearchParams();
  if (f.periodo !== "tudo") p.set("periodo", f.periodo);
  for (const nome of ["q", "categoria", "ra"]) if (f[nome]) p.set(nome, f[nome]);
  if (f.gratuito) p.set("gratuito", "1");
  const busca = p.toString();
  // o #atalho fica: o link de "Em cartaz" ou "Fique de olho" pode ser compartilhado
  history.replaceState(null, "", (busca ? `?${busca}` : location.pathname) + location.hash);
}

function lerFiltros() {
  return {
    periodo: form.periodo.value,
    q: form.q.value.trim(),
    categoria: form.categoria.value,
    ra: form.ra.value,
    gratuito: form.gratuito.checked,
  };
}

const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function passa(e, s, f) {
  if (f.categoria && e.categoria !== f.categoria) return false;
  if (f.ra && !e.ras.includes(f.ra)) return false;
  if (f.gratuito && !e.gratuito) return false;
  if (f.q) {
    const texto = semAcento([e.titulo, e.local || "", ...e.ras, CATEGORIAS[e.categoria] || ""].join(" "));
    if (!semAcento(f.q).split(/\s+/).every((p) => texto.includes(p))) return false;
  }
  if (f.periodo !== "tudo") {
    const limite = f.periodo === "hoje" ? hoje : somaDias(hoje, 6);
    if (s.tipo === "sem_data") return true; // "Fique de olho" aparece em qualquer período
    if (s.tipo === "dia" && (s.dia > limite && !(s.ate && s.dia <= limite))) return false;
  }
  return true;
}

function card(e, s) {
  const no = tpl.content.firstElementChild.cloneNode(true);
  if (e.status === "cancelado") no.classList.add("cancelado");

  const quando = no.querySelector(".quando");
  if (s.tipo === "dia") {
    no.querySelector(".dia").textContent = ddmm(s.dia);
    no.querySelector(".hora").textContent = [diaDaSemana(s.dia), hora(s.iso)].filter(Boolean).join(" · ");
  } else if (s.tipo === "cartaz") {
    no.querySelector(".dia").textContent = ddmm(s.ate);
    no.querySelector(".hora").textContent = "até";
  } else {
    quando.querySelector(".dia").textContent = "—";
    no.querySelector(".hora").textContent = "sem data";
  }

  const etiquetas = no.querySelector(".etiquetas");
  const etiqueta = (texto, classe = "") => {
    const span = document.createElement("span");
    span.className = `etiqueta ${classe}`.trim();
    span.textContent = texto;
    etiquetas.append(span);
  };
  if (dia(e.primeira_deteccao) >= somaDias(hoje, -DIAS_NOVO + 1)) etiqueta("Novo", "novo");
  etiqueta(CATEGORIAS[e.categoria] || e.categoria);
  if (e.status === "previsto_fomento") etiqueta("Saiu no Diário");
  if (e.status === "cancelado") etiqueta("Cancelado", "alerta");
  if (e.status === "adiado") etiqueta("Adiado", "alerta");
  if (e.status === "esgotado") etiqueta("Esgotado", "alerta");

  const titulo = document.createElement("a");
  titulo.href = `evento/${encodeURIComponent(e.id)}/`;
  titulo.textContent = caixaNormal(e.titulo);
  no.querySelector(".titulo").append(titulo);

  const meta = [];
  if (e.local) meta.push(e.local);
  if (e.ras.length) meta.push(e.ras.join(", "));
  meta.push(preco(e));
  if (s.tipo === "dia" && s.ate) meta.push(`até ${ddmm(s.ate)}`);
  if (s.tipo === "dia" && s.extras > 0) meta.push(`+${s.extras} ${s.extras === 1 ? "data" : "datas"}`);
  if (e.classificacao_etaria) meta.push(e.classificacao_etaria);
  no.querySelector(".meta").textContent = meta.join(" · ");
  if (e.resumo) {
    const resumo = document.createElement("p");
    resumo.className = "resumo";
    resumo.textContent = e.resumo;
    no.querySelector(".meta").after(resumo);
  }

  const links = no.querySelector(".links");
  const link = (texto, href) => {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = texto;
    a.rel = "noopener";
    links.append(a);
  };
  if (e.link_ingresso) link("Ingressos", e.link_ingresso);
  const vistas = new Set();
  for (const fonte of e.fontes) {
    if (vistas.has(fonte.nome)) continue;
    vistas.add(fonte.nome);
    link(`via ${fonte.nome}`, fonte.url);
  }
  return no;
}

function grupo(titulo, nota, itens, id) {
  const sec = document.createElement("section");
  sec.className = "grupo";
  if (id) sec.id = id;
  const h2 = document.createElement("h2");
  h2.innerHTML = titulo;
  sec.append(h2);
  if (nota) {
    const p = document.createElement("p");
    p.className = "nota";
    p.textContent = nota;
    sec.append(p);
  }
  for (const [e, s] of itens) sec.append(card(e, s));
  return sec;
}

function tituloDoDia(d) {
  const rotulo = d === hoje ? "Hoje" : d === somaDias(hoje, 1) ? "Amanhã" : diaDaSemana(d);
  return `${rotulo} · <b>${ddmm(d)}</b>`;
}

function desenhar() {
  const f = lerFiltros();
  filtrosNaUrl(f);
  const itens = dados.eventos.map((e) => [e, situar(e)]).filter(([e, s]) => passa(e, s, f));

  const porDia = new Map();
  const cartaz = [];
  const semData = [];
  for (const item of itens) {
    const s = item[1];
    if (s.tipo === "cartaz") cartaz.push(item);
    else if (s.tipo === "sem_data") semData.push(item);
    else {
      if (!porDia.has(s.dia)) porDia.set(s.dia, []);
      porDia.get(s.dia).push(item);
    }
  }

  agenda.replaceChildren();
  let mes = null;
  for (const d of [...porDia.keys()].sort()) {
    const m = d.slice(0, 7);
    if (m !== mes && m !== hoje.slice(0, 7)) {
      const h = document.createElement("p");
      h.className = "mes";
      h.textContent = `${MESES[+d.slice(5, 7) - 1]} de ${d.slice(0, 4)}`;
      agenda.append(h);
    }
    mes = m;
    const lista = porDia.get(d).sort(([a, sa], [b, sb]) => (sa.iso || "").localeCompare(sb.iso || "") || a.titulo.localeCompare(b.titulo, "pt"));
    agenda.append(grupo(tituloDoDia(d), null, lista));
  }
  if (cartaz.length) {
    cartaz.sort(([, a], [, b]) => a.ate.localeCompare(b.ate));
    agenda.append(grupo("Em <b>cartaz</b>", "Exposições, mostras e temporadas que já começaram.", cartaz, "em-cartaz"));
  }
  if (semData.length) {
    // os projetos do Diário primeiro, depois o que já foi anunciado sem data
    const doDiario = (e) => (e.status === "previsto_fomento" ? 0 : 1);
    semData.sort(([a], [b]) => doDiario(a) - doDiario(b) || a.titulo.localeCompare(b.titulo, "pt"));
    agenda.append(grupo("Fique de <b>olho</b>", "Projetos aprovados no Diário Oficial do DF e eventos já anunciados, ainda sem data marcada.", semData, "fique-de-olho"));
  }

  // Em cartaz e Fique de olho vêm depois de todos os dias: os atalhos levam direto a eles
  atalhos.replaceChildren();
  for (const [rotulo, id, lista] of [["Em cartaz", "em-cartaz", cartaz], ["Fique de olho", "fique-de-olho", semData]]) {
    if (!lista.length) continue;
    const a = document.createElement("a");
    a.href = `#${id}`;
    a.innerHTML = `${rotulo} <b>${lista.length}</b>`;
    atalhos.append(a);
  }
  atalhos.hidden = !atalhos.childElementCount;

  const n = itens.length;
  contagem.textContent = n ? `${n} ${n === 1 ? "evento" : "eventos"}` : "";
  if (!n) {
    const p = document.createElement("p");
    p.className = "vazio";
    p.textContent = "Nada no radar com esses filtros. Tente outro período ou outra região.";
    agenda.append(p);
  }
}

async function iniciar() {
  try {
    const resposta = await fetch("eventos.json", { cache: "no-cache" });
    if (!resposta.ok) throw new Error(resposta.status);
    dados = await resposta.json();
  } catch {
    contagem.textContent = "Não foi possível carregar a agenda agora. Tente de novo em instantes.";
    return;
  }
  const gerado = new Date(dados.gerado_em);
  document.getElementById("atualizado").textContent =
    `Atualizado em ${gerado.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`;
  preencherOpcoes(dados.eventos);
  filtrosDaUrl();
  form.addEventListener("input", desenhar);
  form.addEventListener("submit", (ev) => ev.preventDefault());
  desenhar();
  // a agenda é desenhada depois do carregamento: o navegador não achou a âncora do link
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

iniciar();
