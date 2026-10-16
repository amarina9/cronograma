// ---------- Referencias al DOM ----------
const formulario = document.getElementById('formulario');
const mensajeError = document.getElementById('mensajeError');
const resultado = document.getElementById('resultado');
const inputFestivo = document.getElementById('inputFestivo');
const btnAnadirFestivo = document.getElementById('btnAnadirFestivo');
const listaFestivos = document.getElementById('listaFestivos');

// ---------- Constantes ----------
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
               'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const NOMBRES_DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Festivos guardados como "YYYY-MM-DD" en un Set (búsqueda rápida)
const festivos = new Set();

// ---------- Gestión de festivos ----------
btnAnadirFestivo.addEventListener('click', function () {
  const valor = inputFestivo.value;
  if (!valor) return;

  if (festivos.has(valor)) {
    alert('Esa fecha ya está en la lista de festivos.');
    return;
  }

  festivos.add(valor);
  inputFestivo.value = '';
  renderizarFestivos();
});

function renderizarFestivos() {
  listaFestivos.innerHTML = '';

  if (festivos.size === 0) {
    const li = document.createElement('li');
    li.className = 'sin-festivos';
    li.textContent = 'No hay festivos añadidos.';
    listaFestivos.appendChild(li);
    return;
  }

  const ordenados = Array.from(festivos).sort();

  ordenados.forEach(function (fechaStr) {
    const li = document.createElement('li');
    li.appendChild(document.createTextNode(formatearFechaStr(fechaStr)));

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '×';
    btn.title = 'Eliminar';
    btn.addEventListener('click', function () {
      festivos.delete(fechaStr);
      renderizarFestivos();
    });

    li.appendChild(btn);
    listaFestivos.appendChild(li);
  });
}

// ---------- Generación del cronograma ----------
formulario.addEventListener('submit', function (e) {
  e.preventDefault();
  mensajeError.textContent = '';
  resultado.innerHTML = '';

  const nombre = document.getElementById('nombreCurso').value.trim();
  const inicioStr = document.getElementById('fechaInicio').value;
  const finStr = document.getElementById('fechaFin').value;
  const horasDia = parseInt(document.getElementById('horasDia').value, 10);
  const horario = document.getElementById('horario').value.trim();

  if (!nombre || !inicioStr || !finStr || !horario) {
    mensajeError.textContent = 'Rellena todos los campos.';
    return;
  }

  if (!horasDia || horasDia < 1 || horasDia > 12) {
    mensajeError.textContent = 'Las horas al día deben estar entre 1 y 12.';
    return;
  }

  const inicio = new Date(inicioStr + 'T00:00:00');
  const fin = new Date(finStr + 'T00:00:00');

  if (fin < inicio) {
    mensajeError.textContent = 'La fecha de fin no puede ser anterior a la de inicio.';
    return;
  }

  generarCronograma(nombre, inicio, fin, horasDia, horario);
});

function generarCronograma(nombre, inicio, fin, horasDia, horario) {
  const dias = [];
  let cursor = new Date(inicio);

  while (cursor <= fin) {
    const diaSemana = cursor.getDay();
    const fechaStr = aFormatoISO(cursor);
    const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
    const esFestivo = festivos.has(fechaStr);

    dias.push({
      fecha: new Date(cursor),
      diaSemana: diaSemana,
      esFinDeSemana: esFinDeSemana,
      esFestivo: esFestivo
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  const totalDias = dias.length;
  const totalLectivos = dias.filter(d => !d.esFinDeSemana && !d.esFestivo).length;
  const totalFestivos = dias.filter(d => d.esFestivo).length;
  const totalSesiones = totalLectivos * horasDia;

  let html = `
    <div class="resumen">
      <strong>${escapeHtml(nombre)}</strong><br>
      Del ${formatearFecha(inicio)} al ${formatearFecha(fin)}<br>
      ${totalDias} días naturales · <strong>${totalLectivos} días lectivos</strong>
      ${totalFestivos > 0 ? ` · ${totalFestivos} festivo${totalFestivos > 1 ? 's' : ''}` : ''}<br>
      ${horasDia} horas al día (${escapeHtml(horario)}) · <strong>${totalSesiones} sesiones totales</strong>
    </div>
  `;

  html += generarVistaCalendario(inicio, fin, horasDia);

  resultado.innerHTML = html;
}

// ---------- Vista de calendario ----------

function generarVistaCalendario(inicio, fin, horasDia) {
  const semanas = obtenerSemanasEntre(inicio, fin);

  let html = '<div class="calendario">';
  let mesActual = null;

  semanas.forEach(function (semana) {
    const mesClave = semana.anio * 12 + semana.mes;

    if (mesClave !== mesActual) {
      if (mesActual !== null) html += '</div>';
      html += `<div class="mes-bloque">`;
      html += `<h3 class="mes-titulo">${capitalizar(MESES[semana.mes])} ${semana.anio}</h3>`;
      mesActual = mesClave;
    }

    html += generarBloqueSemana(semana, inicio, fin, horasDia);
  });

  if (mesActual !== null) html += '</div>';

  html += '</div>';
  return html;
}

function obtenerSemanasEntre(inicio, fin) {
  const primerLunes = new Date(inicio);
  const diaSemanaInicio = primerLunes.getDay();
  const offsetInicio = (diaSemanaInicio === 0) ? 6 : diaSemanaInicio - 1;
  primerLunes.setDate(primerLunes.getDate() - offsetInicio);

  const semanas = [];
  let cursor = new Date(primerLunes);

  while (cursor <= fin) {
    const jueves = new Date(cursor);
    jueves.setDate(jueves.getDate() + 3);

    semanas.push({
      lunes: new Date(cursor),
      anio: jueves.getFullYear(),
      mes: jueves.getMonth()
    });

    cursor.setDate(cursor.getDate() + 7);
  }

  return semanas;
}

function generarBloqueSemana(semana, inicio, fin, horasDia) {
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(semana.lunes);
    fecha.setDate(fecha.getDate() + i);

    const diaSemana = fecha.getDay();
    const fechaStr = aFormatoISO(fecha);
    const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
    const esFestivo = festivos.has(fechaStr);
    const fueraDeRango = fecha < inicio || fecha > fin;

    dias.push({
      fecha: fecha,
      diaSemana: diaSemana,
      esFinDeSemana: esFinDeSemana,
      esFestivo: esFestivo,
      fueraDeRango: fueraDeRango
    });
  }

  let html = '<table class="calendario-tabla">';

  // Cabecera: nombre del día + número
  html += '<thead><tr>';
  html += '<th class="col-hora"></th>';
  dias.forEach(function (d) {
    const clases = ['col-dia'];
    if (d.fueraDeRango) clases.push('fuera-rango');
    if (d.esFinDeSemana) clases.push('finde');
    if (d.esFestivo) clases.push('festivo');
    html += `<th class="${clases.join(' ')}">`;
    html += `<div class="nombre-dia">${NOMBRES_DIAS_CORTOS[(d.diaSemana + 6) % 7]}</div>`;
    html += `<div class="num-dia">${d.fecha.getDate()}</div>`;
    html += `</th>`;
  });
  html += '</tr></thead>';

  // Filas de horas
  html += '<tbody>';
  for (let h = 1; h <= horasDia; h++) {
    html += '<tr>';
    html += `<td class="col-hora">H${h}</td>`;

    dias.forEach(function (d) {
      const clases = ['celda-sesion'];
      if (d.fueraDeRango) clases.push('fuera-rango');
      else if (d.esFestivo) clases.push('festivo');
      else if (d.esFinDeSemana) clases.push('finde');
      else clases.push('lectivo');

      html += `<td class="${clases.join(' ')}"></td>`;
    });
    html += '</tr>';
  }
  html += '</tbody></table>';

  return html;
}

// ---------- Utilidades de fecha ----------
function aFormatoISO(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatearFecha(fecha) {
  const d = fecha.getDate();
  const m = MESES[fecha.getMonth()];
  const y = fecha.getFullYear();
  return `${d} de ${m} de ${y}`;
}

function formatearFechaStr(fechaStr) {
  const fecha = new Date(fechaStr + 'T00:00:00');
  return formatearFecha(fecha);
}

// ---------- Utilidades varias ----------
function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// ---------- Inicialización ----------
renderizarFestivos();
