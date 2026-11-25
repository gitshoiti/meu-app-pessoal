/* =========================================================
   Meu App — app pessoal (PWA) sem dependências.
   Dados ficam salvos apenas no aparelho (localStorage).
   ========================================================= */

const STORE_KEY = "meuapp:v1";
const NOTIFIED_KEY = "meuapp:notified";

const $ = (sel, el = document) => el.querySelector(sel);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------------- Dados ---------------- */
function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed();
}
function saveDB() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch {}
}
function seed() {
  // Dados de exemplo para testar a estrutura (pode apagar à vontade).
  const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return toISODate(x); };
  return {
    tasks: [
      { id: uid(), title: "Comprar mantimentos", due: d(0), done: false },
      { id: uid(), title: "Ligar para o banco", due: d(1), done: false },
      { id: uid(), title: "Organizar documentos", due: "", done: true },
    ],
    events: [
      { id: uid(), title: "Reunião de trabalho", date: d(1), time: "10:00", place: "Online", alertMin: 30 },
      { id: uid(), title: "Aniversário da Ana", date: d(5), time: "19:00", place: "", alertMin: 1440 },
    ],
    bills: [
      { id: uid(), name: "Conta de luz", amount: 189.9, due: d(2), paid: false, alertDays: 1 },
      { id: uid(), name: "Internet", amount: 119.0, due: d(8), paid: false, alertDays: 2 },
      { id: uid(), name: "Cartão de crédito", amount: 1430.55, due: d(-3), paid: true, alertDays: 3 },
    ],
    health: [
      { id: uid(), type: "Consulta", title: "Dermatologista", date: d(10), time: "14:30", notes: "Levar exames anteriores", alertMin: 120 },
      { id: uid(), type: "Medicamento", title: "Vitamina D", date: "", time: "08:00", notes: "1 cápsula por dia" },
      { id: uid(), type: "Exame", title: "Hemograma completo", date: d(-20), time: "", notes: "Resultado normal" },
    ],
  };
}
let db = loadDB();

/* ---------------- Datas ---------------- */
function toISODate(d) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function parseLocal(date, time = "09:00") {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "09:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}
function fmtDate(date, time) {
  if (!date) return time ? `todo dia às ${time}` : "sem data";
  const dt = parseLocal(date, time);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(dt).setHours(0, 0, 0, 0) - today) / 86400000);
  const rel = diff === 0 ? "Hoje" : diff === 1 ? "Amanhã" : diff === -1 ? "Ontem"
    : dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  return time ? `${rel} · ${time}` : rel;
}
const daysUntil = date => {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((parseLocal(date, "00:00") - t) / 86400000);
};
const money = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ---------------- Seções ---------------- */
const SECTIONS = {
  tarefas:    { title: "Afazeres",   emoji: "✅", cls: "c-tasks",   key: "tasks" },
  agenda:     { title: "Minha Agenda", emoji: "📅", cls: "c-agenda",  key: "events" },
  financeiro: { title: "Financeiro", emoji: "💰", cls: "c-finance", key: "bills" },
  medica:     { title: "Médico",     emoji: "🩺", cls: "c-health",  key: "health" },
};

/* ---------------- Roteador ---------------- */
const view = $("#view");
function route() {
  const name = (location.hash.replace(/^#\/?/, "") || "home").split("?")[0];
  const sec = SECTIONS[name];
  $("#backBtn").hidden = !sec;
  $("#title").textContent = sec ? sec.title : saudacao();
  document.querySelectorAll(".fab").forEach(f => f.remove());
  ({ home: renderHome, tarefas: renderTasks, agenda: renderAgenda, financeiro: renderFinance, medica: renderHealth }[name] || renderHome)();
  window.scrollTo(0, 0);
}
function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia ☀️" : h < 18 ? "Boa tarde 👋" : "Boa noite 🌙";
}
$("#backBtn").onclick = () => (location.hash = "");
window.addEventListener("hashchange", route);

/* ---------------- Home ---------------- */
function renderHome() {
  const pendTasks = db.tasks.filter(t => !t.done).length;
  const nextEvent = db.events
    .filter(e => parseLocal(e.date, e.time) >= new Date())
    .sort((a, b) => parseLocal(a.date, a.time) - parseLocal(b.date, b.time))[0];
  const openBills = db.bills.filter(b => !b.paid);
  const totalOpen = openBills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const nextHealth = db.health
    .filter(h => h.date && parseLocal(h.date, h.time) >= new Date())
    .sort((a, b) => parseLocal(a.date, a.time) - parseLocal(b.date, b.time))[0];

  view.innerHTML = `
    ${installHint()}
    <label class="search">
      <span>🔎</span>
      <input id="q" type="search" placeholder="Buscar em todas as seções…" autocomplete="off" enterkeyhint="search" />
    </label>
    <div id="results"></div>
    <div id="cards" class="grid">
      ${card("tarefas", pendTasks ? `${pendTasks} pendente${pendTasks > 1 ? "s" : ""}` : "Tudo em dia")}
      ${card("agenda", nextEvent ? `${esc(nextEvent.title)} · ${fmtDate(nextEvent.date, nextEvent.time)}` : "Nada agendado")}
      ${card("financeiro", openBills.length ? `${openBills.length} a pagar · ${money(totalOpen)}` : "Nenhuma conta aberta")}
      ${card("medica", nextHealth ? `${esc(nextHealth.title)} · ${fmtDate(nextHealth.date, nextHealth.time)}` : `${db.health.length} registro(s)`)}
    </div>
    <div class="section-label">Próximos alertas</div>
    <div class="list">${upcomingAlerts().slice(0, 4).map(a => `
      <a class="item" href="#${a.section}" style="text-decoration:none;color:inherit">
        <div class="body"><div class="t">${esc(a.title)}</div><div class="s">${esc(a.body)}</div></div>
        <span class="tag">${a.at.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${a.at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
      </a>`).join("") || `<div class="empty">Nenhum alerta programado</div>`}
    </div>`;

  const q = $("#q");
  q.addEventListener("input", () => renderSearch(q.value));
}
function card(sec, sub) {
  const s = SECTIONS[sec];
  return `<a class="card ${s.cls}" href="#${sec}">
    <div class="emoji">${s.emoji}</div>
    <div><h3>${s.title}</h3><p>${sub}</p></div>
  </a>`;
}
function installHint() {
  const standalone = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  if (standalone) return "";
  return `<div class="hint">📲 <b>Dica:</b> no Safari, toque em <b>Compartilhar</b> ⬆️ → <b>Adicionar à Tela de Início</b> para usar como app e receber notificações.</div>`;
}

/* ---------------- Busca global ---------------- */
function searchIndex() {
  return [
    ...db.tasks.map(t => ({ sec: "tarefas", title: t.title, sub: t.due ? fmtDate(t.due) : (t.done ? "Concluída" : "Pendente") })),
    ...db.events.map(e => ({ sec: "agenda", title: e.title, sub: `${fmtDate(e.date, e.time)}${e.place ? " · " + e.place : ""}` })),
    ...db.bills.map(b => ({ sec: "financeiro", title: b.name, sub: `${money(b.amount)} · vence ${fmtDate(b.due)}${b.paid ? " · paga" : ""}` })),
    ...db.health.map(h => ({ sec: "medica", title: h.title, sub: `${h.type} · ${fmtDate(h.date, h.time)}${h.notes ? " · " + h.notes : ""}` })),
  ];
}
const norm = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function highlight(text, q) {
  const i = norm(text).indexOf(norm(q));
  if (!q || i < 0) return esc(text);
  return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
}
function renderSearch(q) {
  const box = $("#results"), cards = $("#cards");
  q = q.trim();
  if (!q) { box.innerHTML = ""; cards.hidden = false; return; }
  cards.hidden = true;
  const nq = norm(q);
  const hits = searchIndex().filter(r => norm(r.title + " " + r.sub + " " + SECTIONS[r.sec].title).includes(nq));
  box.innerHTML = `<div class="list" style="margin-bottom:16px">${hits.map(r => `
    <a class="item" href="#${r.sec}" style="text-decoration:none;color:inherit">
      <div class="emoji" style="font-size:20px">${SECTIONS[r.sec].emoji}</div>
      <div class="body">
        <div class="t">${highlight(r.title, q)}</div>
        <div class="s">${highlight(r.sub, q)}</div>
        <div class="result-sec">${SECTIONS[r.sec].title}</div>
      </div>
    </a>`).join("") || `<div class="empty">Nada encontrado para “${esc(q)}”</div>`}</div>`;
}

/* ---------------- Afazeres ---------------- */
function renderTasks() {
  const list = [...db.tasks].sort((a, b) => a.done - b.done || (a.due || "9").localeCompare(b.due || "9"));
  view.innerHTML = `<div class="list">${list.map(t => {
    const late = t.due && !t.done && daysUntil(t.due) < 0;
    return `<div class="item ${t.done ? "done" : ""}">
      <input type="checkbox" class="check" data-toggle="${t.id}" ${t.done ? "checked" : ""} aria-label="Concluir" />
      <div class="body"><div class="t">${esc(t.title)}</div>${t.due ? `<div class="s">${fmtDate(t.due)}</div>` : ""}</div>
      ${late ? `<span class="tag late">Atrasada</span>` : ""}
      <button class="mini" data-del="${t.id}" aria-label="Apagar">🗑</button>
    </div>`;
  }).join("") || `<div class="empty">Nenhum afazer. Toque em + para adicionar.</div>`}</div>`;

  view.onclick = e => {
    const tg = e.target.closest("[data-toggle]"), del = e.target.closest("[data-del]");
    if (tg) { const t = db.tasks.find(x => x.id === tg.dataset.toggle); t.done = tg.checked; saveDB(); renderTasks(); }
    if (del) removeItem("tasks", del.dataset.del, renderTasks);
  };
  fab(() => openSheet("Novo afazer", [
    { name: "title", label: "O que fazer?", required: true },
    { name: "due", label: "Data (opcional)", type: "date" },
  ], v => { db.tasks.push({ id: uid(), title: v.title, due: v.due, done: false }); saveDB(); renderTasks(); }));
}

/* ---------------- Agenda ---------------- */
const ALERT_OPTS = [["0", "Na hora"], ["10", "10 min antes"], ["30", "30 min antes"], ["60", "1 hora antes"], ["120", "2 horas antes"], ["1440", "1 dia antes"], ["-1", "Sem alerta"]];
function renderAgenda() {
  const now = new Date();
  const sorted = [...db.events].sort((a, b) => parseLocal(a.date, a.time) - parseLocal(b.date, b.time));
  const future = sorted.filter(e => parseLocal(e.date, e.time) >= new Date(now - 3600e3));
  const past = sorted.filter(e => !future.includes(e)).reverse();
  const row = e => `<div class="item">
      <div class="body"><div class="t">${esc(e.title)}</div>
      <div class="s">${fmtDate(e.date, e.time)}${e.place ? " · 📍 " + esc(e.place) : ""}</div></div>
      ${e.alertMin >= 0 ? `<span class="tag">🔔 ${ALERT_OPTS.find(o => +o[0] === +e.alertMin)?.[1] ?? ""}</span>` : ""}
      <button class="mini" data-ics="${e.id}" aria-label="Adicionar ao Calendário">📆</button>
      <button class="mini" data-del="${e.id}" aria-label="Apagar">🗑</button>
    </div>`;
  view.innerHTML = `
    <div class="row-actions"><button class="btn" id="icsAll">📆 Enviar tudo ao Calendário do iPhone</button></div>
    <div class="list">${future.map(row).join("") || `<div class="empty">Sem compromissos futuros.</div>`}</div>
    ${past.length ? `<div class="section-label">Anteriores</div><div class="list">${past.map(row).join("")}</div>` : ""}`;
  $("#icsAll").onclick = () => exportICS(db.events.map(eventToICS), "agenda.ics");
  view.onclick = e => {
    const del = e.target.closest("[data-del]"), ics = e.target.closest("[data-ics]");
    if (del) removeItem("events", del.dataset.del, renderAgenda);
    if (ics) { const ev = db.events.find(x => x.id === ics.dataset.ics); exportICS([eventToICS(ev)], "evento.ics"); }
  };
  fab(() => openSheet("Novo compromisso", [
    { name: "title", label: "Título", required: true },
    { row: [{ name: "date", label: "Data", type: "date", required: true, value: toISODate(new Date()) },
            { name: "time", label: "Hora", type: "time", required: true, value: "09:00" }] },
    { name: "place", label: "Local (opcional)" },
    { name: "alertMin", label: "Alerta", type: "select", options: ALERT_OPTS, value: "30" },
  ], v => { db.events.push({ id: uid(), ...v, alertMin: +v.alertMin }); saveDB(); renderAgenda(); }));
}

/* ---------------- Financeiro ---------------- */
function renderFinance() {
  const open = db.bills.filter(b => !b.paid).sort((a, b) => a.due.localeCompare(b.due));
  const paid = db.bills.filter(b => b.paid).sort((a, b) => b.due.localeCompare(a.due));
  const total = open.reduce((s, b) => s + Number(b.amount || 0), 0);
  const late = open.filter(b => daysUntil(b.due) < 0).length;
  const row = b => {
    const d = daysUntil(b.due);
    const tag = b.paid ? `<span class="tag ok">Paga</span>`
      : d < 0 ? `<span class="tag late">Vencida</span>`
      : `<span class="tag">${d === 0 ? "Vence hoje" : `em ${d}d`}</span>`;
    return `<div class="item ${b.paid ? "done" : ""}">
      <input type="checkbox" class="check" data-toggle="${b.id}" ${b.paid ? "checked" : ""} aria-label="Marcar como paga" />
      <div class="body"><div class="t">${esc(b.name)}</div><div class="s">${money(b.amount)} · vence ${fmtDate(b.due)}</div></div>
      ${tag}
      <button class="mini" data-ics="${b.id}" aria-label="Adicionar ao Calendário">📆</button>
      <button class="mini" data-del="${b.id}" aria-label="Apagar">🗑</button>
    </div>`;
  };
  view.innerHTML = `
    <div class="summary">
      <div><b>${money(total)}</b><span>em aberto</span></div>
      <div><b>${open.length}</b><span>a pagar</span></div>
      <div><b style="color:${late ? "var(--danger)" : "inherit"}">${late}</b><span>vencidas</span></div>
    </div>
    <div class="row-actions"><button class="btn" id="icsAll">📆 Lembretes no Calendário do iPhone</button></div>
    <div class="list">${open.map(row).join("") || `<div class="empty">Nenhuma conta em aberto 🎉</div>`}</div>
    ${paid.length ? `<div class="section-label">Pagas</div><div class="list">${paid.map(row).join("")}</div>` : ""}`;
  $("#icsAll").onclick = () => exportICS(open.map(billToICS), "contas.ics");
  view.onclick = e => {
    const tg = e.target.closest("[data-toggle]"), del = e.target.closest("[data-del]"), ics = e.target.closest("[data-ics]");
    if (tg) { const b = db.bills.find(x => x.id === tg.dataset.toggle); b.paid = tg.checked; saveDB(); renderFinance(); }
    if (del) removeItem("bills", del.dataset.del, renderFinance);
    if (ics) exportICS([billToICS(db.bills.find(x => x.id === ics.dataset.ics))], "conta.ics");
  };
  fab(() => openSheet("Nova conta a pagar", [
    { name: "name", label: "Descrição", required: true },
    { row: [{ name: "amount", label: "Valor (R$)", type: "number", step: "0.01", inputmode: "decimal", required: true },
            { name: "due", label: "Vencimento", type: "date", required: true, value: toISODate(new Date()) }] },
    { name: "alertDays", label: "Avisar", type: "select", value: "1",
      options: [["0", "No dia (9h)"], ["1", "1 dia antes"], ["2", "2 dias antes"], ["3", "3 dias antes"], ["7", "1 semana antes"], ["-1", "Sem alerta"]] },
  ], v => { db.bills.push({ id: uid(), name: v.name, amount: parseFloat(String(v.amount).replace(",", ".")), due: v.due, paid: false, alertDays: +v.alertDays }); saveDB(); renderFinance(); }));
}

/* ---------------- Médico ---------------- */
const HEALTH_TYPES = ["Consulta", "Exame", "Medicamento", "Vacina", "Anotação"];
function renderHealth() {
  const groups = HEALTH_TYPES.map(type => [type, db.health.filter(h => h.type === type)]).filter(g => g[1].length);
  view.innerHTML = groups.map(([type, items]) => `
    <div class="section-label">${type}s</div>
    <div class="list">${items.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(h => `
      <div class="item">
        <div class="body">
          <div class="t">${esc(h.title)}</div>
          <div class="s">${fmtDate(h.date, h.time)}${h.notes ? " · " + esc(h.notes) : ""}</div>
        </div>
        ${h.date ? `<button class="mini" data-ics="${h.id}" aria-label="Adicionar ao Calendário">📆</button>` : ""}
        <button class="mini" data-del="${h.id}" aria-label="Apagar">🗑</button>
      </div>`).join("")}
    </div>`).join("") || `<div class="empty">Nenhum registro médico. Toque em + para adicionar.</div>`;
  view.onclick = e => {
    const del = e.target.closest("[data-del]"), ics = e.target.closest("[data-ics]");
    if (del) removeItem("health", del.dataset.del, renderHealth);
    if (ics) { const h = db.health.find(x => x.id === ics.dataset.ics); exportICS([eventToICS({ ...h, title: `${h.type}: ${h.title}`, place: h.notes })], "saude.ics"); }
  };
  fab(() => openSheet("Novo registro médico", [
    { name: "type", label: "Tipo", type: "select", options: HEALTH_TYPES.map(t => [t, t]), value: "Consulta" },
    { name: "title", label: "Título (médico, exame, remédio…)", required: true },
    { row: [{ name: "date", label: "Data", type: "date" }, { name: "time", label: "Hora", type: "time" }] },
    { name: "alertMin", label: "Alerta (se tiver data)", type: "select", options: ALERT_OPTS, value: "120" },
    { name: "notes", label: "Observações", type: "textarea" },
  ], v => { db.health.push({ id: uid(), ...v, alertMin: +v.alertMin }); saveDB(); renderHealth(); }));
}

/* ---------------- Utilitários de UI ---------------- */
function fab(onClick) {
  const b = document.createElement("button");
  b.className = "fab"; b.textContent = "+"; b.setAttribute("aria-label", "Adicionar");
  b.onclick = onClick;
  document.body.appendChild(b);
}
function removeItem(key, id, rerender) {
  // Apaga na hora e oferece "Desfazer" (mais rápido que uma caixa de confirmação).
  const idx = db[key].findIndex(x => x.id === id);
  if (idx < 0) return;
  const [removed] = db[key].splice(idx, 1);
  saveDB(); rerender();
  toast("Item apagado", "Desfazer", () => { db[key].splice(idx, 0, removed); saveDB(); rerender(); });
}
function toast(msg, actionLabel, onAction, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  if (actionLabel) {
    const b = document.createElement("button");
    b.className = "toast-action"; b.textContent = actionLabel;
    b.onclick = () => { t.classList.remove("show"); onAction(); };
    t.appendChild(b);
    ms = 4500;
  }
  t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms);
}

const sheet = $("#sheet");
let sheetSubmit = null;
function fieldHTML(f) {
  if (f.row) return `<div class="field-row">${f.row.map(fieldHTML).join("")}</div>`;
  const attrs = `name="${f.name}" id="f_${f.name}" ${f.required ? "required" : ""} ${f.step ? `step="${f.step}"` : ""} ${f.inputmode ? `inputmode="${f.inputmode}"` : ""}`;
  let input;
  if (f.type === "select") input = `<select ${attrs}>${f.options.map(([v, l]) => `<option value="${v}" ${String(f.value) === v ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  else if (f.type === "textarea") input = `<textarea ${attrs}></textarea>`;
  else input = `<input type="${f.type || "text"}" ${attrs} value="${esc(f.value || "")}" />`;
  return `<div class="field"><label for="f_${f.name}">${f.label}</label>${input}</div>`;
}
function openSheet(title, fields, onSubmit) {
  $("#sheetTitle").textContent = title;
  $("#sheetFields").innerHTML = fields.map(fieldHTML).join("");
  sheetSubmit = onSubmit;
  sheet.showModal();
  setTimeout(() => sheet.querySelector("input:not([type=date]):not([type=time]), textarea")?.focus(), 50);
}
$("#sheetCancel").onclick = () => sheet.close();
$("#sheetForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = Object.fromEntries(new FormData(e.target).entries());
  sheet.close();
  sheetSubmit?.(v);
  toast("Salvo ✓");
  checkAlerts();
});

/* =========================================================
   Alertas / Notificações
   ========================================================= */
function allAlerts() {
  const out = [];
  for (const e of db.events) {
    if (e.alertMin < 0 || !e.date) continue;
    const start = parseLocal(e.date, e.time);
    out.push({ id: `ev:${e.id}:${e.date}${e.time}:${e.alertMin}`, section: "agenda", at: new Date(start - e.alertMin * 60e3), start,
      title: `📅 ${e.title}`, body: `${fmtDate(e.date, e.time)}${e.place ? " · " + e.place : ""}` });
  }
  for (const b of db.bills) {
    if (b.paid || b.alertDays < 0) continue;
    const due = parseLocal(b.due, "09:00");
    out.push({ id: `bill:${b.id}:${b.due}:${b.alertDays}`, section: "financeiro", at: new Date(due - b.alertDays * 86400e3), start: new Date(+due + 86400e3),
      title: `💰 Conta a pagar: ${b.name}`, body: `${money(b.amount)} · vence ${fmtDate(b.due)}` });
  }
  for (const h of db.health) {
    if (!h.date || !(h.alertMin >= 0)) continue;
    const start = parseLocal(h.date, h.time || "09:00");
    out.push({ id: `hl:${h.id}:${h.date}${h.time}:${h.alertMin}`, section: "medica", at: new Date(start - h.alertMin * 60e3), start,
      title: `🩺 ${h.type}: ${h.title}`, body: fmtDate(h.date, h.time) });
  }
  for (const t of db.tasks) {
    if (t.done || !t.due) continue;
    const at = parseLocal(t.due, "09:00");
    out.push({ id: `tk:${t.id}:${t.due}`, section: "tarefas", at, start: new Date(+at + 86400e3),
      title: `✅ Afazer de hoje`, body: t.title });
  }
  return out;
}
function upcomingAlerts() {
  const now = new Date();
  return allAlerts().filter(a => a.at > now).sort((a, b) => a.at - b.at);
}
function getNotified() { try { return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]")); } catch { return new Set(); } }
function setNotified(s) { try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...s].slice(-500))); } catch {} }

async function notify(title, body, section) {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  const opts = { body, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: title, data: { url: `#${section || ""}` } };
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) { await reg.showNotification(title, opts); return true; }
  } catch {}
  try { new Notification(title, opts); return true; } catch { return false; }
}

// Verifica alertas que já venceram e ainda não foram avisados.
async function checkAlerts() {
  const now = new Date();
  const sent = getNotified();
  const due = allAlerts().filter(a => a.at <= now && a.start > now && !sent.has(a.id));
  for (const a of due) {
    const ok = await notify(a.title, a.body, a.section);
    if (!ok) toast(`${a.title} — ${a.body}`);
    sent.add(a.id);
  }
  setNotified(sent);
  updateBadge();
}
function updateBadge() {
  const n = db.bills.filter(b => !b.paid && daysUntil(b.due) <= 0).length + db.tasks.filter(t => !t.done && t.due && daysUntil(t.due) <= 0).length;
  try { n ? navigator.setAppBadge?.(n) : navigator.clearAppBadge?.(); } catch {}
}

$("#bellBtn").onclick = async () => {
  const standalone = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (!("Notification" in window)) {
    return toast(isIOS && !standalone
      ? "No iPhone, as notificações só funcionam com o app adicionado à Tela de Início e aberto pelo ícone."
      : "Este navegador não permite notificações aqui.", null, null, 5000);
  }
  try { if (Notification.permission === "default") await Notification.requestPermission(); } catch {}
  if (Notification.permission === "granted") {
    await notify("🔔 Notificações ativadas", "Você receberá alertas da agenda, contas e saúde.", "");
    toast("Notificações ativadas ✓");
    checkAlerts();
  } else {
    toast("Notificações bloqueadas. Ative em Ajustes → Notificações → Meu App.", null, null, 5000);
  }
};

/* =========================================================
   Exportar para o Calendário do iPhone (.ics)
   Os alarmes do Calendário tocam mesmo com o app fechado.
   ========================================================= */
const icsDate = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = s => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, m => "\\" + m);
function eventToICS(e) {
  const start = parseLocal(e.date, e.time || "09:00");
  return { uid: e.id, start, end: new Date(+start + 3600e3), title: e.title, location: e.place, alarmMin: e.alertMin >= 0 ? e.alertMin : null };
}
function billToICS(b) {
  const start = parseLocal(b.due, "09:00");
  return { uid: b.id, start, end: new Date(+start + 1800e3), title: `💰 Pagar: ${b.name} (${money(b.amount)})`, alarmMin: b.alertDays >= 0 ? b.alertDays * 1440 : 0 };
}
async function exportICS(items, filename) {
  if (!items.length) return toast("Nada para exportar");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MeuApp//PT-BR", "CALSCALE:GREGORIAN"];
  for (const it of items) {
    lines.push("BEGIN:VEVENT", `UID:${it.uid}@meuapp`, `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(it.start)}`, `DTEND:${icsDate(it.end)}`, `SUMMARY:${icsText(it.title)}`);
    if (it.location) lines.push(`LOCATION:${icsText(it.location)}`);
    if (it.alarmMin != null) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(it.title)}`, `TRIGGER:-PT${it.alarmMin}M`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const file = new File([blob], filename, { type: "text/calendar" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Adicionar ao Calendário" }); return; } catch (err) { if (err.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------------- Inicialização ---------------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) { checkAlerts(); route(); } });
setInterval(checkAlerts, 30e3);
saveDB();
route();
checkAlerts();
