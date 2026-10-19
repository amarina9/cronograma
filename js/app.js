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
const menuDia = document.getElementById('menuDia');
const inputModulo = document.getElementById('inputModulo');
const btnAnadirModulo = document.getElementById('btnAnadirModulo');
const listaModulos = document.getElementById('listaModulos');

// ---------- Constantes ----------
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
               'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const NOMBRES_DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Paleta de colores para módulos (se asignan en orden circular)
const PALETA_MODULOS = [
  '#bfdbfe', // azul
  '#fbcfe8', // rosa
  '#fde68a', // amarillo
  '#c7d2fe', // lavanda
  '#a7f3d0', // verde menta
  '#fed7aa', // naranja
  '#ddd6fe', // violeta
  '#fecaca'  // rojo suave
];

let contadorModulos = 0;

// Festivos guardados como "YYYY-MM-DD" en un Set (búsqueda rápida)
const festivos = new Set();

// ---------- Modelo de estado ----------
// Estado de cada día: clave "YYYY-MM-DD", valor uno de:
//   { tipo: 'no-lectivo' }
//   { tipo: 'practicas' }
//   { tipo: 'modulo', horas: { 1: 'mod-1', 2: 'mod-1', 3: 'mod-2', ... } }
// Si no hay entrada en el Map, el día es lectivo sin asignaciones.
const estadoDias = new Map();

// Lista de módulos del certificado
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

// ---------- Gestión de módulos ----------
btnAnadirModulo.addEventListener('click', function () {
  const nombre = inputModulo.value.trim();
  if (!nombre) return;

  if (modulos.some(function (m) { return m.nombre === nombre; })) {
    alert('Ya existe un módulo con ese nombre.');
    return;
  }

  const color = PALETA_MODULOS[contadorModulos % PALETA_MODULOS.length];
  contadorModulos++;

  modulos.push({
    id: 'mod-' + contadorModulos,
    nombre: nombre,
    color: color
  });

  inputModulo.value = '';
  renderizarModulos();
});

function renderizarModulos() {
  listaModulos.innerHTML = '';

  if (modulos.length === 0) {
    const li = document.createElement('li');
    li.className = 'sin-modulos';
    li.textContent = 'No hay módulos añadidos.';
    listaModulos.appendChild(li);
    return;
  }

  modulos.forEach(function (m) {
    const li = document.createElement('li');
    li.className = 'item-modulo';
    li.style.background = m.color;

    const span = document.createElement('span');
    span.textContent = m.nombre;
    li.appendChild(span);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '×';
    btn.title = 'Eliminar';
    btn.addEventListener('click', function () {
      eliminarModulo(m.id);
    });
    li.appendChild(btn);

    listaModulos.appendChild(li);
  });
}

function eliminarModulo(id) {
  const idx = modulos.findIndex(function (m) { return m.id === id; });
  if (idx === -1) return;
  modulos.splice(idx, 1);

  estadoDias.forEach(function (estado, fechaStr) {
    if (estado.tipo === 'modulo' && estado.horas) {
      let quitarAlguno = false;
      Object.keys(estado.horas).forEach(function (h) {
        if (estado.horas[h] === id) {
          delete estado.horas[h];
          quitarAlguno = true;
        }
      });
      if (quitarAlguno && Object.keys(estado.horas).length === 0) {
        estadoDias.delete(fechaStr);
      }
    }
  });

  renderizarModulos();
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
  let totalSesiones = 0;

  const horasPorModulo = new Map();

  dias.forEach(function (d) {
    totalDias++;
    if (d.esFinDeSemana) return;

    const fechaStr = aFormatoISO(d.fecha);
    const estado = obtenerEstadoDia(fechaStr);

    if (d.esFestivo || estado.tipo === 'no-lectivo') {
      totalNoLectivos++;
      return;
    }

    totalLectivos++;

    if (estado.tipo === 'practicas') {
      totalPracticas++;
      totalSesiones += horasDia;
      return;
    }

    if (estado.tipo === 'modulo') {
      let horasAsignadasEsteDia = 0;
      for (let h = 1; h <= horasDia; h++) {
        const modId = estado.horas ? estado.horas[h] : null;
        if (modId) {
          horasPorModulo.set(modId, (horasPorModulo.get(modId) || 0) + 1);
          horasAsignadasEsteDia++;
        }
      }
      totalSesiones += horasAsignadasEsteDia;
      return;
    }

    totalSesiones += horasDia;
  });

  let html = `
    <div class="resumen">
      <strong>${escapeHtml(nombre)}</strong><br>
      Del ${formatearFecha(inicio)} al ${formatearFecha(fin)}<br>
      ${totalDias} días naturales · <strong>${totalLectivos} días lectivos</strong>
      ${totalNoLectivos > 0 ? ` · ${totalNoLectivos} no lectivo${totalNoLectivos > 1 ? 's' : ''}` : ''}
      ${totalFestivos > 0 ? ` · ${totalFestivos} festivo${totalFestivos > 1 ? 's' : ''}` : ''}<br>
      ${horasDia} horas al día (${escapeHtml(horario)}) · <strong>${totalSesiones} sesiones totales</strong>
      ${totalPracticas > 0 ? `<br>${totalPracticas} día${totalPracticas > 1 ? 's' : ''} de prácticas (${totalPracticas * horasDia}h)` : ''}
      ${modulos.length > 0 ? `
        <div class="resumen-modulos">
          ${modulos.map(function (m) {
            const horas = horasPorModulo.get(m.id) || 0;
            return `<span class="chip-modulo" style="background:${m.color}">${escapeHtml(m.nombre)}: ${horas}h</span>`;
          }).join('')}
        </div>
      ` : ''}
    </div>
  `;

  html += generarVistaCalendario(inicio, fin, horasDia);

  html += `
    <div class="barra-acciones">
      <button type="button" class="btn-exportar" id="btnExportarExcel">Exportar a Excel</button>
    </div>
  `;

  resultado.innerHTML = html;

  const btnExportar = document.getElementById('btnExportarExcel');
  if (btnExportar) {
    btnExportar.addEventListener('click', exportarAExcel);
  }
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
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  const diasEnMes = ultimoDia.getDate();

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
    if (d.estado.tipo === 'no-lectivo') clases.push('estado-no-lectivo');

    const marcaFestivo = d.esFestivo ? ' *' : '';
    html += `<th class="${clases.join(' ')}" data-fecha="${d.fechaStr}">`;
    html += `<div class="nombre-dia">${NOMBRES_DIAS_CORTOS[(d.diaSemana + 6) % 7]}</div>`;
    html += `<div class="num-dia">${d.fecha.getDate()}${marcaFestivo}</div>`;
    html += `</th>`;
  });
  html += '</tr></thead>';

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

      let estiloExtraCelda = '';

      if (d.estado.tipo === 'no-lectivo') {
        clases.push('estado-no-lectivo');
      } else if (d.estado.tipo === 'practicas') {
        clases.push('estado-practicas');
      } else if (d.estado.tipo === 'modulo') {
        clases.push('estado-modulo');
        const moduloId = d.estado.horas ? d.estado.horas[h] : null;
        if (moduloId) {
          const mod = modulos.find(function (m) { return m.id === moduloId; });
          if (mod) estiloExtraCelda = ` style="background:${mod.color}"`;
        }
      }

      html += `<td class="${clases.join(' ')}" data-fecha="${d.fechaStr}" data-hora="${h}"${estiloExtraCelda}></td>`;
    });
    html += '</tr>';
  }
  html += '</tbody></table>';

  return html;
}

// ---------- Interacción con el calendario ----------
resultado.addEventListener('click', function (e) {
  const cabecera = e.target.closest('th.col-dia');
  if (cabecera) {
    if (cabecera.classList.contains('celda-fuera-mes')) return;
    if (cabecera.classList.contains('fuera-rango')) return;
    if (cabecera.classList.contains('finde')) return;
    if (cabecera.classList.contains('festivo')) return;

    const fechaStr = cabecera.dataset.fecha;
    if (!fechaStr) return;
    abrirMenuDia(fechaStr, cabecera);
    return;
  }

  const celda = e.target.closest('td.celda-sesion');
  if (celda) {
    if (celda.classList.contains('celda-fuera-mes')) return;
    if (celda.classList.contains('fuera-rango')) return;
    if (celda.classList.contains('finde')) return;
    if (celda.classList.contains('festivo')) return;

    const fechaStr = celda.dataset.fecha;
    const hora = parseInt(celda.dataset.hora, 10);
    if (!fechaStr || !hora) return;

    const estado = obtenerEstadoDia(fechaStr);
    if (estado.tipo === 'no-lectivo' || estado.tipo === 'practicas') return;

    abrirMenuHora(fechaStr, hora, celda);
    return;
  }
});

document.addEventListener('click', function (e) {
  if (menuDia.classList.contains('oculto')) return;
  if (menuDia.contains(e.target)) return;
  if (e.target.closest('th.col-dia')) return;
  if (e.target.closest('td.celda-sesion')) return;
  cerrarMenuDia();
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') cerrarMenuDia();
});

// ---------- Menú de estado del día ----------
function abrirMenuDia(fechaStr, cabecera) {
  const estadoActual = obtenerEstadoDia(fechaStr);

  let html = '';

  const opcionesBase = [
    { tipo: 'lectivo', etiqueta: 'Lectivo (por defecto)' },
    { tipo: 'no-lectivo', etiqueta: 'No lectivo' },
    { tipo: 'practicas', etiqueta: 'Prácticas en empresa' }
  ];

  opcionesBase.forEach(function (op) {
    const activo = op.tipo === estadoActual.tipo ? ' activo' : '';
    html += `<button type="button" class="menu-opcion${activo}" data-tipo="${op.tipo}">${op.etiqueta}</button>`;
  });

  if (modulos.length > 0) {
    html += `<div class="menu-separador">Módulos (todo el día)</div>`;
    modulos.forEach(function (m) {
      let activo = '';
      if (estadoActual.tipo === 'modulo' && estadoActual.horas) {
        const horasDiaActual = parseInt(document.getElementById('horasDia').value, 10);
        let todas = true;
        for (let h = 1; h <= horasDiaActual; h++) {
          if (estadoActual.horas[h] !== m.id) { todas = false; break; }
        }
        if (todas) activo = ' activo';
      }
      html += `<button type="button" class="menu-opcion${activo}" data-tipo="modulo" data-modulo-id="${m.id}">
        <span class="menu-color" style="background:${m.color}"></span>${escapeHtml(m.nombre)}
      </button>`;
    });
  }

  menuDia.innerHTML = html;

  const rect = cabecera.getBoundingClientRect();
  menuDia.classList.remove('oculto');
  menuDia.style.top = (window.scrollY + rect.bottom + 4) + 'px';
  menuDia.style.left = (window.scrollX + rect.left) + 'px';

  menuDia.querySelectorAll('.menu-opcion').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const tipo = btn.dataset.tipo;
      const moduloId = btn.dataset.moduloId;
      const horasDiaActual = parseInt(document.getElementById('horasDia').value, 10);
      aplicarEstadoDia(fechaStr, tipo, moduloId, horasDiaActual);
      cerrarMenuDia();
    });
  });
}

// ---------- Menú por hora ----------
function abrirMenuHora(fechaStr, hora, celda) {
  const moduloActual = obtenerModuloEnHora(fechaStr, hora);

  let html = '';

  const activoSinClase = (moduloActual === null) ? ' activo' : '';
  html += `<button type="button" class="menu-opcion${activoSinClase}" data-tipo="libre">Sin clase</button>`;

  if (modulos.length > 0) {
    html += `<div class="menu-separador">Módulos</div>`;
    modulos.forEach(function (m) {
      const activo = (moduloActual === m.id) ? ' activo' : '';
      html += `<button type="button" class="menu-opcion${activo}" data-tipo="modulo" data-modulo-id="${m.id}">
        <span class="menu-color" style="background:${m.color}"></span>${escapeHtml(m.nombre)}
      </button>`;
    });
  }

  menuDia.innerHTML = html;

  const rect = celda.getBoundingClientRect();
  menuDia.classList.remove('oculto');
  menuDia.style.top = (window.scrollY + rect.bottom + 4) + 'px';
  menuDia.style.left = (window.scrollX + rect.left) + 'px';

  menuDia.querySelectorAll('.menu-opcion').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const tipo = btn.dataset.tipo;
      const moduloId = btn.dataset.moduloId;
      aplicarEstadoHora(fechaStr, hora, tipo, moduloId);
      cerrarMenuDia();
    });
  });
}

function cerrarMenuDia() {
  menuDia.classList.add('oculto');
  menuDia.innerHTML = '';
}

function aplicarEstadoDia(fechaStr, tipo, moduloId, horasDia) {
  if (tipo === 'lectivo') {
    estadoDias.delete(fechaStr);
  } else if (tipo === 'no-lectivo') {
    estadoDias.set(fechaStr, { tipo: 'no-lectivo' });
  } else if (tipo === 'practicas') {
    estadoDias.set(fechaStr, { tipo: 'practicas' });
  } else if (tipo === 'modulo') {
    const horas = {};
    for (let h = 1; h <= horasDia; h++) {
      horas[h] = moduloId;
    }
    estadoDias.set(fechaStr, { tipo: 'modulo', horas: horas });
  }

  const nombre = document.getElementById('nombreCurso').value.trim();
  const inicioStr = document.getElementById('fechaInicio').value;
  const finStr = document.getElementById('fechaFin').value;
  const horasDiaActual = parseInt(document.getElementById('horasDia').value, 10);
  const horario = document.getElementById('horario').value.trim();

  if (!nombre || !inicioStr || !finStr || !horario || !horasDiaActual) return;

  const inicio = new Date(inicioStr + 'T00:00:00');
  const fin = new Date(finStr + 'T00:00:00');

  generarCronograma(nombre, inicio, fin, horasDiaActual, horario);
}

function aplicarEstadoHora(fechaStr, hora, tipo, moduloId) {
  const estadoActual = estadoDias.get(fechaStr);
  let horas = {};

  if (estadoActual && estadoActual.tipo === 'modulo' && estadoActual.horas) {
    horas = Object.assign({}, estadoActual.horas);
  }

  if (tipo === 'libre') {
    delete horas[hora];
  } else if (tipo === 'modulo') {
    horas[hora] = moduloId;
  }

  if (Object.keys(horas).length === 0) {
    estadoDias.delete(fechaStr);
  } else {
    estadoDias.set(fechaStr, { tipo: 'modulo', horas: horas });
  }

  const nombre = document.getElementById('nombreCurso').value.trim();
  const inicioStr = document.getElementById('fechaInicio').value;
  const finStr = document.getElementById('fechaFin').value;
  const horasDiaActual = parseInt(document.getElementById('horasDia').value, 10);
  const horario = document.getElementById('horario').value.trim();

  if (!nombre || !inicioStr || !finStr || !horario || !horasDiaActual) return;

  const inicio = new Date(inicioStr + 'T00:00:00');
  const fin = new Date(finStr + 'T00:00:00');

  generarCronograma(nombre, inicio, fin, horasDiaActual, horario);
}

// ---------- Estado de días ----------
function obtenerEstadoDia(fechaStr) {
  return estadoDias.get(fechaStr) || { tipo: 'lectivo' };
}

function obtenerModuloEnHora(fechaStr, hora) {
  const estado = estadoDias.get(fechaStr);
  if (!estado || estado.tipo !== 'modulo') return null;
  if (!estado.horas) return null;
  return estado.horas[hora] || null;
}

// ---------- Exportación a Excel ----------
function exportarAExcel() {
  const nombre = document.getElementById('nombreCurso').value.trim();
  const inicioStr = document.getElementById('fechaInicio').value;
  const finStr = document.getElementById('fechaFin').value;
  const horasDia = parseInt(document.getElementById('horasDia').value, 10);
  const horario = document.getElementById('horario').value.trim();

  if (!nombre || !inicioStr || !finStr || !horasDia) {
    alert('Genera primero el cronograma.');
    return;
  }

  if (typeof XLSX === 'undefined') {
    alert('La librería de Excel no se ha cargado. Recarga la página.');
    return;
  }

  const inicio = new Date(inicioStr + 'T00:00:00');
  const fin = new Date(finStr + 'T00:00:00');

  const libro = XLSX.utils.book_new();

  const hojaCronograma = construirHojaCronograma(inicio, fin, horasDia);
  XLSX.utils.book_append_sheet(libro, hojaCronograma, 'Cronograma');

  const hojaResumen = construirHojaResumen(nombre, inicio, fin, horasDia, horario);
  XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');

  const nombreLimpio = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'curso';

  XLSX.writeFile(libro, `cronograma-${nombreLimpio}.xlsx`);
}

function construirHojaCronograma(inicio, fin, horasDia) {
  const filas = [];
  const anchos = [{ wch: 6 }];
  for (let i = 0; i < 7; i++) anchos.push({ wch: 8 });

  const bordeFino = {
    top: { style: 'thin', color: { rgb: 'd1d5db' } },
    bottom: { style: 'thin', color: { rgb: 'd1d5db' } },
    left: { style: 'thin', color: { rgb: 'd1d5db' } },
    right: { style: 'thin', color: { rgb: 'd1d5db' } }
  };

  const estiloTituloMes = {
    font: { bold: true, sz: 13, color: { rgb: '1e3a8a' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: { top: { style: 'thin', color: { rgb: '1e3a8a' } } }
  };

  const estiloCabeceraDia = {
    font: { bold: true, color: { rgb: '1e3a8a' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'eff6ff' } },
    border: bordeFino
  };

  const estiloCabeceraFinde = {
    font: { bold: true, color: { rgb: '6b7280' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'f3f4f6' } },
    border: bordeFino
  };

  const estiloCabeceraFestivo = {
    font: { bold: true, color: { rgb: '374151' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'f3f4f6' } },
    border: bordeFino
  };

  const estiloCabeceraFueraRango = {
    font: { color: { rgb: '9ca3af' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'fafafa' } },
    border: bordeFino
  };

  const estiloHoraLabel = {
    font: { bold: true, color: { rgb: '374151' }, sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'f3f4f6' } },
    border: bordeFino
  };

  const estiloCeldaBase = {
    alignment: { horizontal: 'center', vertical: 'center' },
    border: bordeFino
  };

  const estiloCeldaFinde = Object.assign({}, estiloCeldaBase, {
    fill: { fgColor: { rgb: 'f3f4f6' } }
  });

  const estiloCeldaFestivo = Object.assign({}, estiloCeldaBase, {
    fill: { fgColor: { rgb: 'f3f4f6' } }
  });

  const estiloCeldaFueraRango = Object.assign({}, estiloCeldaBase, {
    fill: { fgColor: { rgb: 'fafafa' } }
  });

  const estiloCeldaNoLectivo = Object.assign({}, estiloCeldaBase, {
    fill: { fgColor: { rgb: 'f3f4f6' } }
  });

  const estiloCeldaPracticas = Object.assign({}, estiloCeldaBase, {
    fill: { fgColor: { rgb: 'd1fae5' } }
  });

  const meses = obtenerMesesEntre(inicio, fin);

  meses.forEach(function (mesInfo, indexMes) {
    if (indexMes > 0) filas.push([{ v: '', s: null }]);

    filas.push([
      { v: capitalizar(MESES[mesInfo.mes]) + ' ' + mesInfo.anio, s: estiloTituloMes },
      { v: '', s: null }, { v: '', s: null }, { v: '', s: null },
      { v: '', s: null }, { v: '', s: null }, { v: '', s: null }, { v: '', s: null }
    ]);

    const semanas = obtenerSemanasDelMes(mesInfo.anio, mesInfo.mes);
    semanas.forEach(function (semana) {
      const filaNombres = [{ v: '', s: null }];
      const filaNumeros = [{ v: '', s: null }];

      semana.forEach(function (entrada) {
        if (entrada === null) {
          filaNombres.push({ v: '', s: null });
          filaNumeros.push({ v: '', s: null });
          return;
        }

        const fecha = entrada.fecha;
        const diaSemana = fecha.getDay();
        const fechaStr = aFormatoISO(fecha);
        const esFinde = diaSemana === 0 || diaSemana === 6;
        const esFestivo = festivos.has(fechaStr);
        const fueraDeRango = fecha < inicio || fecha > fin;
        const estado = obtenerEstadoDia(fechaStr);

        let estiloNombre = estiloCabeceraDia;
        if (fueraDeRango) estiloNombre = estiloCabeceraFueraRango;
        else if (esFestivo) estiloNombre = estiloCabeceraFestivo;
        else if (esFinde) estiloNombre = estiloCabeceraFinde;
        else if (estado.tipo === 'no-lectivo') estiloNombre = estiloCabeceraFinde;

        filaNombres.push({
          v: NOMBRES_DIAS_CORTOS[(diaSemana + 6) % 7],
          s: estiloNombre
        });

        const marcaFestivo = esFestivo ? ' *' : '';
        filaNumeros.push({
          v: String(fecha.getDate()) + marcaFestivo,
          s: estiloNombre
        });
      });

      filas.push(filaNombres);
      filas.push(filaNumeros);

      for (let h = 1; h <= horasDia; h++) {
        const fila = [{ v: 'H' + h, s: estiloHoraLabel }];

        semana.forEach(function (entrada) {
          if (entrada === null) {
            fila.push({ v: '', s: null });
            return;
          }

          const fecha = entrada.fecha;
          const diaSemana = fecha.getDay();
          const fechaStr = aFormatoISO(fecha);
          const esFinde = diaSemana === 0 || diaSemana === 6;
          const esFestivo = festivos.has(fechaStr);
          const fueraDeRango = fecha < inicio || fecha > fin;
          const estado = obtenerEstadoDia(fechaStr);

          if (fueraDeRango) { fila.push({ v: '', s: estiloCeldaFueraRango }); return; }
          if (esFestivo) { fila.push({ v: '', s: estiloCeldaFestivo }); return; }
          if (esFinde) { fila.push({ v: '', s: estiloCeldaFinde }); return; }
          if (estado.tipo === 'no-lectivo') { fila.push({ v: '', s: estiloCeldaNoLectivo }); return; }
          if (estado.tipo === 'practicas') { fila.push({ v: '', s: estiloCeldaPracticas }); return; }
          if (estado.tipo === 'modulo' && estado.horas) {
            const modId = estado.horas[h];
            if (modId) {
              const mod = modulos.find(function (m) { return m.id === modId; });
              if (mod) {
                const estiloCeldaModulo = Object.assign({}, estiloCeldaBase, {
                  fill: { fgColor: { rgb: rgbDeHex(mod.color) } }
                });
                fila.push({ v: '', s: estiloCeldaModulo });
                return;
              }
            }
          }
          fila.push({ v: '', s: estiloCeldaBase });
        });

        filas.push(fila);
      }
    });
  });

  const hoja = XLSX.utils.aoa_to_sheet(
    filas.map(function (fila) {
      return fila.map(function (celda) {
        if (celda === null || celda === undefined) return '';
        if (typeof celda === 'object' && 'v' in celda) return celda.v;
        return celda;
      });
    })
  );

  filas.forEach(function (fila, r) {
    fila.forEach(function (celda, c) {
      if (celda === null || celda === undefined) return;
      if (typeof celda !== 'object' || !('s' in celda)) return;
      if (!celda.s) return;

      const direccion = XLSX.utils.encode_cell({ r: r, c: c });
      if (!hoja[direccion]) {
        hoja[direccion] = { v: celda.v || '', t: 's' };
      }
      hoja[direccion].s = celda.s;
    });
  });

  hoja['!cols'] = anchos;
  return hoja;
}

function construirHojaResumen(nombre, inicio, fin, horasDia, horario) {
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
  let totalSesiones = 0;
  const horasPorModulo = new Map();

  dias.forEach(function (d) {
    totalDias++;
    if (d.esFinDeSemana) return;
    const fechaStr = aFormatoISO(d.fecha);
    const estado = obtenerEstadoDia(fechaStr);
    if (d.esFestivo || estado.tipo === 'no-lectivo') { totalNoLectivos++; return; }
    totalLectivos++;
    if (estado.tipo === 'practicas') { totalPracticas++; totalSesiones += horasDia; return; }
    if (estado.tipo === 'modulo') {
      let horasEsteDia = 0;
      for (let h = 1; h <= horasDia; h++) {
        const modId = estado.horas ? estado.horas[h] : null;
        if (modId) {
          horasPorModulo.set(modId, (horasPorModulo.get(modId) || 0) + 1);
          horasEsteDia++;
        }
      }
      totalSesiones += horasEsteDia;
      return;
    }
    totalSesiones += horasDia;
  });

  const filas = [];
  const estiloTitulo = { font: { bold: true, sz: 14, color: { rgb: '1e3a8a' } } };
  const estiloCabCampo = { font: { bold: true }, fill: { fgColor: { rgb: 'eff6ff' } } };

  filas.push([{ v: 'Resumen del curso', s: estiloTitulo }]);
  filas.push([]);
  filas.push([{ v: 'Nombre', s: estiloCabCampo }, { v: nombre }]);
  filas.push([{ v: 'Fecha inicio', s: estiloCabCampo }, { v: formatearFecha(inicio) }]);
  filas.push([{ v: 'Fecha fin', s: estiloCabCampo }, { v: formatearFecha(fin) }]);
  filas.push([{ v: 'Horas al día', s: estiloCabCampo }, { v: horasDia }]);
  filas.push([{ v: 'Horario', s: estiloCabCampo }, { v: horario }]);
  filas.push([]);
  filas.push([{ v: 'Totales', s: estiloTitulo }]);
  filas.push([{ v: 'Días naturales', s: estiloCabCampo }, { v: totalDias }]);
  filas.push([{ v: 'Días lectivos', s: estiloCabCampo }, { v: totalLectivos }]);
  filas.push([{ v: 'Días no lectivos', s: estiloCabCampo }, { v: totalNoLectivos }]);
  filas.push([{ v: 'Festivos', s: estiloCabCampo }, { v: totalFestivos }]);
  filas.push([{ v: 'Días de prácticas', s: estiloCabCampo }, { v: totalPracticas }]);
  filas.push([{ v: 'Sesiones totales', s: estiloCabCampo }, { v: totalSesiones }]);
  filas.push([]);
  filas.push([{ v: 'Horas por módulo', s: estiloTitulo }]);

  modulos.forEach(function (m) {
    const horas = horasPorModulo.get(m.id) || 0;
    const estiloModulo = {
      fill: { fgColor: { rgb: rgbDeHex(m.color) } },
      font: { bold: true }
    };
    filas.push([
      { v: m.nombre, s: estiloModulo },
      { v: horas + ' h' }
    ]);
  });

  const hoja = XLSX.utils.aoa_to_sheet(
    filas.map(function (fila) {
      return fila.map(function (celda) {
        if (celda === null || celda === undefined) return '';
        if (typeof celda === 'object' && 'v' in celda) return celda.v;
        return celda;
      });
    })
  );

  filas.forEach(function (fila, r) {
    fila.forEach(function (celda, c) {
      if (celda === null || celda === undefined) return;
      if (typeof celda !== 'object' || !('s' in celda)) return;
      if (!celda.s) return;
      const direccion = XLSX.utils.encode_cell({ r: r, c: c });
      if (!hoja[direccion]) {
        hoja[direccion] = { v: celda.v || '', t: 's' };
      }
      hoja[direccion].s = celda.s;
    });
  });

  hoja['!cols'] = [{ wch: 22 }, { wch: 30 }];
  return hoja;
}

function rgbDeHex(hex) {
  if (!hex) return 'ffffff';
  return hex.replace('#', '').toUpperCase();
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
renderizarModulos();

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
