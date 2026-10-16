// ---------- Datos de prueba (¡QUITAR EN PRODUCCIÓN!) ----------
const MODO_PRUEBA = true;

const DATOS_PRUEBA = {
  nombre: 'Curso de prueba',
  inicio: '2026-01-15',
  fin: '2026-02-10',
  horasDia: 6,
  horario: '15:00 a 21:00',
  festivos: ['2026-01-20', '2026-02-03']
};

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

// ---------- Modelo de estado ----------
// Estado de cada día: clave "YYYY-MM-DD", valor { tipo, moduloId? }
// tipo puede ser: 'lectivo', 'no-lectivo', 'modulo', 'practicas'
const estadoDias = new Map();

// Lista de módulos del certificado (se rellenará en la fase 3.3 desde el formulario)
// Cada módulo: { id, nombre, color }
const modulos = [];

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

  const totalFestivos = dias.filter(d => d.esFestivo).length;

  let totalDias = 0;
  let totalLectivos = 0;
  let totalNoLectivos = 0;
  let totalPracticas = 0;
  let totalModulo = 0;
  let totalSesiones = 0;

  dias.forEach(function (d) {
    totalDias++;
    if (d.esFinDeSemana) return;

    const estado = obtenerEstadoDia(aFormatoISO(d.fecha));
    if (d.esFestivo || estado.tipo === 'no-lectivo') {
      totalNoLectivos++;
    } else if (estado.tipo === 'practicas') {
      totalPracticas++;
      totalLectivos++;
      totalSesiones += horasDia;
    } else if (estado.tipo === 'modulo') {
      totalModulo++;
      totalLectivos++;
      totalSesiones += horasDia;
    } else {
      totalLectivos++;
      totalSesiones += horasDia;
    }
  });

  let html = `
    <div class="resumen">
      <strong>${escapeHtml(nombre)}</strong><br>
      Del ${formatearFecha(inicio)} al ${formatearFecha(fin)}<br>
      ${totalDias} días naturales · <strong>${totalLectivos} días lectivos</strong>
      ${totalNoLectivos > 0 ? ` · ${totalNoLectivos} no lectivo${totalNoLectivos > 1 ? 's' : ''}` : ''}
      ${totalFestivos > 0 ? ` · ${totalFestivos} festivo${totalFestivos > 1 ? 's' : ''}` : ''}<br>
      ${horasDia} horas al día (${escapeHtml(horario)}) · <strong>${totalSesiones} sesiones totales</strong>
      ${totalModulo > 0 ? `<br>${totalModulo} día${totalModulo > 1 ? 's' : ''} de módulo` : ''}
      ${totalPracticas > 0 ? `<br>${totalPracticas} día${totalPracticas > 1 ? 's' : ''} de prácticas` : ''}
    </div>
  `;

  html += generarVistaCalendario(inicio, fin, horasDia);

  resultado.innerHTML = html;
}

// ---------- Vista de calendario ----------

function generarVistaCalendario(inicio, fin, horasDia) {
  const meses = obtenerMesesEntre(inicio, fin);

  let html = '<div class="calendario">';

  meses.forEach(function (mesInfo) {
    html += `<div class="mes-bloque">`;
    html += `<h3 class="mes-titulo">${capitalizar(MESES[mesInfo.mes])} ${mesInfo.anio}</h3>`;

    const semanasDelMes = obtenerSemanasDelMes(mesInfo.anio, mesInfo.mes);
    semanasDelMes.forEach(function (semana) {
      html += generarBloqueSemana(semana, inicio, fin, horasDia);
    });

    html += '</div>';
  });

  html += '</div>';
  return html;
}

function obtenerMesesEntre(inicio, fin) {
  const meses = [];
  let anio = inicio.getFullYear();
  let mes = inicio.getMonth();

  while (anio < fin.getFullYear() || (anio === fin.getFullYear() && mes <= fin.getMonth())) {
    meses.push({ anio: anio, mes: mes });
    mes++;
    if (mes > 11) {
      mes = 0;
      anio++;
    }
  }

  return meses;
}

function obtenerSemanasDelMes(anio, mes) {
  // Devuelve un array de semanas. Cada semana es un array de 7 posiciones,
  // cada posición es null (día fuera del mes) o un objeto { fecha }.
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  const diasEnMes = ultimoDia.getDate();

  // getDay(): 0=domingo. Queremos 0=lunes.
  const diaSemanaPrimerDia = primerDia.getDay();
  const offsetInicio = (diaSemanaPrimerDia === 0) ? 6 : diaSemanaPrimerDia - 1;

  const totalCeldas = offsetInicio + diasEnMes;
  const totalSemanas = Math.ceil(totalCeldas / 7);

  const semanas = [];
  let contadorDia = 1;

  for (let s = 0; s < totalSemanas; s++) {
    const semana = [];
    for (let col = 0; col < 7; col++) {
      const indiceGlobal = s * 7 + col;
      if (indiceGlobal < offsetInicio || contadorDia > diasEnMes) {
        semana.push(null);
      } else {
        semana.push({ fecha: new Date(anio, mes, contadorDia) });
        contadorDia++;
      }
    }
    semanas.push(semana);
  }

  return semanas;
}

function generarBloqueSemana(semana, inicio, fin, horasDia) {
  const dias = semana.map(function (entrada) {
    if (entrada === null) return null;

    const fecha = entrada.fecha;
    const diaSemana = fecha.getDay();
    const fechaStr = aFormatoISO(fecha);
    const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
    const esFestivo = festivos.has(fechaStr);
    const fueraDeRango = fecha < inicio || fecha > fin;
    const estado = obtenerEstadoDia(fechaStr);

    return {
      fecha: fecha,
      fechaStr: fechaStr,
      diaSemana: diaSemana,
      esFinDeSemana: esFinDeSemana,
      esFestivo: esFestivo,
      fueraDeRango: fueraDeRango,
      estado: estado
    };
  });

  let html = '<table class="calendario-tabla">';

  // Cabecera
  html += '<thead><tr>';
  html += '<th class="col-hora"></th>';
  dias.forEach(function (d) {
    if (d === null) {
      html += `<th class="col-dia celda-fuera-mes"></th>`;
      return;
    }

    const clases = ['col-dia'];
    if (d.fueraDeRango) clases.push('fuera-rango');
    if (d.esFinDeSemana) clases.push('finde');
    if (d.esFestivo) clases.push('festivo');
    clases.push('estado-' + d.estado.tipo);

    const marcaFestivo = d.esFestivo ? ' *' : '';
    html += `<th class="${clases.join(' ')}" data-fecha="${d.fechaStr}">`;
    html += `<div class="nombre-dia">${NOMBRES_DIAS_CORTOS[(d.diaSemana + 6) % 7]}</div>`;
    html += `<div class="num-dia">${d.fecha.getDate()}${marcaFestivo}</div>`;
    html += `</th>`;
  });
  html += '</tr></thead>';

  // Filas de horas
  html += '<tbody>';
  for (let h = 1; h <= horasDia; h++) {
    html += '<tr>';
    html += `<td class="col-hora">H${h}</td>`;

    dias.forEach(function (d) {
      if (d === null) {
        html += `<td class="celda-sesion celda-fuera-mes"></td>`;
        return;
      }

      const clases = ['celda-sesion'];
      if (d.fueraDeRango) clases.push('fuera-rango');
      else if (d.esFestivo) clases.push('festivo');
      else if (d.esFinDeSemana) clases.push('finde');
      else clases.push('lectivo');
      clases.push('estado-' + d.estado.tipo);

      html += `<td class="${clases.join(' ')}" data-fecha="${d.fechaStr}"></td>`;
    });
    html += '</tr>';
  }
  html += '</tbody></table>';

  return html;
}

// ---------- Estado de días ----------
function obtenerEstadoDia(fechaStr) {
  // Si no hay estado guardado, el día es lectivo por defecto
  return estadoDias.get(fechaStr) || { tipo: 'lectivo' };
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
aplicarDatosPrueba();
renderizarFestivos();

function aplicarDatosPrueba() {
  if (!MODO_PRUEBA) return;

  document.getElementById('nombreCurso').value = DATOS_PRUEBA.nombre;
  document.getElementById('fechaInicio').value = DATOS_PRUEBA.inicio;
  document.getElementById('fechaFin').value = DATOS_PRUEBA.fin;
  document.getElementById('horasDia').value = DATOS_PRUEBA.horasDia;
  document.getElementById('horario').value = DATOS_PRUEBA.horario;

  DATOS_PRUEBA.festivos.forEach(function (f) {
    festivos.add(f);
  });
}
