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
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Fecha</th>
          <th>Día</th>
          <th>Tipo</th>
        </tr>
      </thead>
      <tbody>
  `;

  dias.forEach((d, i) => {
    let clase = '';
    let tipo = 'Lectivo';

    if (d.esFestivo) {
      clase = 'festivo';
      tipo = 'Festivo';
    } else if (d.esFinDeSemana) {
      clase = 'fin-de-semana';
      tipo = 'Fin de semana';
    }

    html += `
      <tr class="${clase}">
        <td>${i + 1}</td>
        <td>${formatearFecha(d.fecha)}</td>
        <td>${DIAS_SEMANA[d.diaSemana]}</td>
        <td>${tipo}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  resultado.innerHTML = html;
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

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// ---------- Inicialización ----------
renderizarFestivos();
