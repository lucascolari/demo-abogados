/* =========================================================
   Estudio Jurídico Demo — Landing
   Interacciones de la página + Asistente legal simulado
   ========================================================= */

/* ---------- Menú móvil ---------- */
const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');
navToggle.addEventListener('click', () => {
  nav.classList.toggle('open');
  navToggle.classList.toggle('open');
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  navToggle.classList.remove('open');
}));

/* ---------- Header con sombra + botón volver arriba ---------- */
const header = document.getElementById('header');
const toTop = document.getElementById('toTop');
function onScroll() {
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 10);
  toTop.classList.toggle('show', y > 500);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---------- Revelado al hacer scroll ---------- */
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('visible'));
}

/* ---------- Contadores animados ---------- */
function animateCount(el) {
  const target = parseInt(el.dataset.target, 10) || 0;
  const suffix = el.dataset.suffix || '';
  const dur = 1400;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    const val = Math.round(target * eased);
    el.textContent = val.toLocaleString('es-AR') + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
const counters = document.querySelectorAll('.count');
if ('IntersectionObserver' in window) {
  const co = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { animateCount(e.target); co.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  counters.forEach(el => co.observe(el));
} else {
  counters.forEach(animateCount);
}

/* ---------- Formulario de contacto (simulado) ---------- */
const contactForm = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');
contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = contactForm.nombre.value.trim() || 'Cliente';
  contactForm.reset();
  formNote.textContent = `¡Gracias ${nombre}! Un abogado se comunicará con vos a la brevedad.`;
  formNote.classList.add('show');
  setTimeout(() => formNote.classList.remove('show'), 6000);
});

/* =========================================================
   ASISTENTE LEGAL
   ========================================================= */
const fab = document.getElementById('chatFab');
const chatWindow = document.getElementById('chatWindow');
const chatClose = document.getElementById('chatClose');
const chatBody = document.getElementById('chatBody');
const chatQuick = document.getElementById('chatQuick');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

let started = false;      // ya se envió el saludo inicial
let booking = null;       // estado del agendado: {step, area, nombre, telefono}

/* ----- Base de conocimiento por área ----- */
const AREAS = {
  laboral: {
    kw: ['despid', 'trabaj', 'laboral', 'indemniz', 'sueldo', 'salario', 'art', 'empleador', 'renunci', 'jefe', 'patron'],
    label: 'Derecho Laboral',
    reply: 'Entiendo, un tema laboral. 👔 Si te despidieron sin causa, en negro, o no te pagan lo que corresponde, es muy probable que tengas derecho a una <strong>indemnización</strong>. Estos reclamos tienen plazos, así que conviene actuar rápido. Un abogado puede revisar tu caso sin cargo.'
  },
  familia: {
    kw: ['divorci', 'familia', 'cuota', 'aliment', 'tenencia', 'hijo', 'custodia', 'visita', 'separ', 'esposo', 'esposa', 'pareja'],
    label: 'Familia y Divorcios',
    reply: 'Comprendo, son temas delicados. 👨‍👩‍👧 Ya sea un <strong>divorcio</strong>, la <strong>cuota alimentaria</strong> o la <strong>tenencia</strong> de los hijos, te acompañamos con respeto y buscando la mejor salida para vos y tu familia. Podemos orientarte en una consulta gratuita.'
  },
  accidentes: {
    kw: ['accidente', 'choque', 'transito', 'lesion', 'auto', 'moto', 'daño', 'seguro', 'golpe', 'atropell'],
    label: 'Accidentes y Daños',
    reply: 'Lamento lo del accidente. 🚗 Si sufriste un <strong>accidente de tránsito</strong> o un daño por culpa de un tercero, podés reclamar una indemnización por lesiones, gastos y daño moral. Lo importante: <strong>no pagás nada hasta ganar el caso</strong>. ¿Querés que un abogado lo evalúe?'
  },
  sucesiones: {
    kw: ['sucesi', 'herenci', 'heredero', 'testament', 'fallec', 'muri', 'difunto', 'bien', 'propiedad hered'],
    label: 'Sucesiones y Herencias',
    reply: 'Te acompañamos en eso. 📜 Tramitamos la <strong>sucesión</strong> de principio a fin para que los bienes pasen a nombre de los herederos sin complicaciones. Cada caso es distinto según los bienes y herederos. Podemos revisarlo juntos en una consulta.'
  },
  penal: {
    kw: ['penal', 'denuncia', 'delito', 'preso', 'detenido', 'causa', 'fiscal', 'querella', 'robo', 'estafa', 'amenaza'],
    label: 'Derecho Penal',
    reply: 'Entiendo, es un tema serio y confidencial. ⚖️ Ya sea una <strong>defensa penal</strong>, una <strong>denuncia</strong> o una querella, actuamos con rapidez y total reserva. En estos casos el tiempo es clave. Te conviene hablar con un abogado cuanto antes.'
  },
  civil: {
    kw: ['contrato', 'deuda', 'desalojo', 'alquiler', 'inquilino', 'comercial', 'cobr', 'pagaré', 'cheque', 'vecino', 'consorcio'],
    label: 'Civil y Comercial',
    reply: 'Claro. 🏢 En temas <strong>civiles y comerciales</strong> —contratos, deudas, desalojos o conflictos entre partes— protegemos tus intereses y buscamos la solución más conveniente. Contanos un poco más y un abogado lo revisa sin cargo.'
  }
};

const QUICK_TOPICS = [
  { txt: 'Me despidieron', area: 'laboral' },
  { txt: 'Divorcio', area: 'familia' },
  { txt: 'Tuve un accidente', area: 'accidentes' },
  { txt: 'Sucesión / herencia', area: 'sucesiones' },
];

/* ----- Helpers de UI ----- */
function scrollDown() { chatBody.scrollTop = chatBody.scrollHeight; }

function addMsg(text, who = 'bot') {
  const div = document.createElement('div');
  div.className = 'msg msg-' + who;
  div.innerHTML = text;
  chatBody.appendChild(div);
  scrollDown();
}

function showTyping() {
  const t = document.createElement('div');
  t.className = 'typing';
  t.id = 'typing';
  t.innerHTML = '<span></span><span></span><span></span>';
  chatBody.appendChild(t);
  scrollDown();
}
function hideTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}

/* Envía un mensaje del bot con demora realista */
function botSay(text, delay = 900) {
  showTyping();
  return new Promise(resolve => {
    setTimeout(() => {
      hideTyping();
      addMsg(text, 'bot');
      resolve();
    }, delay);
  });
}

function setQuickTopics() {
  chatQuick.innerHTML = '';
  QUICK_TOPICS.forEach(t => {
    const b = document.createElement('button');
    b.textContent = t.txt;
    b.addEventListener('click', () => { handleUserText(t.txt); });
    chatQuick.appendChild(b);
  });
}
function clearQuick() { chatQuick.innerHTML = ''; }

/* ----- Detección de área por palabras clave ----- */
function detectArea(text) {
  const t = text.toLowerCase();
  for (const key in AREAS) {
    if (AREAS[key].kw.some(k => t.includes(k))) return key;
  }
  return null;
}

/* ----- Flujo de agendado ----- */
async function startBooking(area) {
  booking = { step: 'nombre', area: area || null, nombre: '', telefono: '' };
  clearQuick();
  await botSay('Para agendar tu <strong>consulta gratuita</strong>, ¿me decís tu nombre y apellido?', 700);
}

async function handleBooking(text) {
  // El cliente escribió en vez de tocar "Sí/No" tras detectar el área
  if (booking.step === 'ask') {
    const t = text.toLowerCase();
    if (/(no|solo|sólo|despu|luego|nada)/.test(t)) {
      booking = null;
      clearQuick();
      await botSay('¡Sin problema! 😊 Si más adelante querés avanzar, acá estamos las 24 horas. ¿Te puedo ayudar con algo más?', 800);
      setTimeout(setQuickTopics, 300);
      return;
    }
    // cualquier otra cosa la tomamos como "sí, avancemos"
    await startBooking(booking.area);
    return;
  }
  if (booking.step === 'nombre') {
    booking.nombre = text.trim();
    booking.step = 'telefono';
    await botSay(`Gracias, ${booking.nombre.split(' ')[0]}. 📱 ¿A qué teléfono te podemos contactar?`, 700);
    return;
  }
  if (booking.step === 'telefono') {
    booking.telefono = text.trim();
    booking.step = 'done';
    await botSay('Perfecto, estoy agendando tu consulta...', 800);
    const area = booking.area ? AREAS[booking.area].label : 'tu consulta';
    await botSay(
      `✅ <strong>¡Listo, ${booking.nombre.split(' ')[0]}!</strong><br>` +
      `Agendé tu consulta gratuita sobre <strong>${area}</strong>.<br>` +
      `Un abogado te va a contactar al <strong>${booking.telefono}</strong> dentro de las próximas horas.<br><br>` +
      `¿Hay algo más en lo que te pueda ayudar mientras tanto?`, 1100);
    booking = null;
    setTimeout(setQuickTopics, 400);
    return;
  }
}

/* ----- Motor principal ----- */
async function handleUserText(text) {
  if (!text.trim()) return;
  addMsg(text, 'user');
  clearQuick();

  // Si estamos en medio de un agendado, seguimos ese flujo
  if (booking) { await handleBooking(text); return; }

  const t = text.toLowerCase();

  // ¿Quiere agendar directamente?
  if (/(agend|turno|cita|reuni|consulta|hablar con|abogado|contact)/.test(t) && !detectArea(t)) {
    await botSay('¡Genial! Te ayudo a coordinar una consulta con uno de nuestros abogados. 👇', 700);
    await startBooking(null);
    return;
  }

  // ¿Saludo?
  if (/^(hola|buenas|buen d|buenos|hey|holis|ola)\b/.test(t)) {
    await botSay('¡Hola! 👋 Contame brevemente qué te pasó y te oriento. Por ejemplo: un despido, un divorcio, un accidente, una herencia...', 700);
    setQuickTopics();
    return;
  }

  // ¿Gracias / despedida?
  if (/(gracias|graci|listo|nada m|no,? gracias|perfecto|ok)/.test(t)) {
    await botSay('¡Un gusto haberte ayudado! 🙌 Recordá que la primera consulta es sin cargo. Cuando quieras, agendá y un abogado te contacta. ¡Que estés bien!', 800);
    return;
  }

  // Detectar área legal
  const area = detectArea(t);
  if (area) {
    await botSay(AREAS[area].reply, 1100);
    booking = { step: 'ask', area };
    clearQuick();
    await botSay('¿Querés que coordine una <strong>consulta gratuita</strong> con un abogado para tu caso?', 700);
    // ofrecer sí/no como quick replies
    chatQuick.innerHTML = '';
    const yes = document.createElement('button');
    yes.textContent = 'Sí, agendar consulta';
    yes.addEventListener('click', async () => { clearQuick(); addMsg('Sí, agendar consulta', 'user'); await startBooking(area); });
    const no = document.createElement('button');
    no.textContent = 'Solo quería consultar';
    no.addEventListener('click', async () => { clearQuick(); addMsg('Solo quería consultar', 'user'); booking = null; await botSay('¡Sin problema! 😊 Si más adelante querés avanzar, acá estamos las 24 horas. ¿Te puedo ayudar con algo más?', 800); setTimeout(setQuickTopics, 300); });
    chatQuick.appendChild(yes);
    chatQuick.appendChild(no);
    return;
  }

  // Sin coincidencia
  await botSay('Entiendo. Para orientarte mejor, ¿tu tema es <strong>laboral</strong> (despido), de <strong>familia</strong> (divorcio, cuota), un <strong>accidente</strong>, una <strong>herencia</strong>, algo <strong>penal</strong> o <strong>civil/comercial</strong>? También puedo agendarte una consulta gratis directamente.', 900);
  setQuickTopics();
}

/* ----- Abrir / cerrar ----- */
async function openChat() {
  chatWindow.classList.add('open');
  chatWindow.setAttribute('aria-hidden', 'false');
  fab.style.display = 'none';
  chatInput.focus();
  if (!started) {
    started = true;
    await botSay('👋 ¡Hola! Soy el asistente del <strong>Estudio Jurídico Demo</strong>. Estoy disponible las 24 horas.', 600);
    await botSay('Contame en qué te puedo ayudar y te oriento al instante. 👇', 700);
    setQuickTopics();
  }
}
function closeChat() {
  chatWindow.classList.remove('open');
  chatWindow.setAttribute('aria-hidden', 'true');
  fab.style.display = 'flex';
}

fab.addEventListener('click', openChat);
chatClose.addEventListener('click', closeChat);
document.querySelectorAll('[data-open-chat]').forEach(b => b.addEventListener('click', openChat));

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value;
  chatInput.value = '';
  handleUserText(text);
});
