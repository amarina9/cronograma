// =====================================================
// exportarExcel.js
// Generación del archivo .xlsx a partir del estado actual
// de la aplicación. Asume que app.js ya ha cargado.
// =====================================================

function exportarAExcel() {
  const nombre = document.getElementById('nombreCurso').value.trim();
  const inicioStr = document.getElementById('fechaInicio').value;
  const finStr = document.getElementById('fechaFin').value;
  const horasDia = parseInt(document.getElementById('horasDia').value, 10);
  const horario = document.getElementById('horario').value.trim();
  const horasPracticas = parseInt(document.getElementById('horasPracticas').value, 10) || 8;

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

  const hojaResumen = construirHojaResumen(nombre, inicio, fin, horasDia, horario, horasPracticas);
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
  const fusiones = [];

  const bordeFino = {
    top: { style: 'thin', color: { rgb: 'd1d5db' } },
    bottom: { style: 'thin', color: { rgb: 'd1d5db' } },
    left: { style: 'thin', color: { rgb: 'd1d5db' } },
    right: { style: 'thin', color: { rgb: 'd1d5db' } }
  };

  const bordeGruesoSeparador = { style: 'medium', color: { rgb: '6b7280' } };
  const bordeGruesoExtremo = { style: 'medium', color: { rgb: '1e3a8a' } };

  const estiloTituloMes = {
    font: { bold: true, sz: 14, color: { rgb: '1e3a8a' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'eff6ff' } },
    border: {
      top: bordeGruesoExtremo,
      bottom: bordeFino,
      left: bordeGruesoExtremo,
      right: bordeGruesoExtremo
    }
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
    fill: { fgColor: { rgb: rgbDeHex(COLOR_PRACTICAS) } }
  });

  const estiloTituloLeyenda = {
    font: { bold: true, sz: 12, color: { rgb: '1e3a8a' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  };

  function estiloEntradaLeyenda(colorHex) {
    return {
      font: { bold: true, color: { rgb: '111827' }, sz: 10 },
      alignment: { horizontal: 'left', vertical: 'center' },
      fill: { fgColor: { rgb: rgbDeHex(colorHex) } },
      border: bordeFino
    };
  }

  const entradasLeyenda = [];
  modulos.forEach(function (m) {
    entradasLeyenda.push({ color: m.color, texto: m.nombre });
  });
  entradasLeyenda.push({ color: COLOR_PRACTICAS, texto: 'Prácticas en empresa' });
  entradasLeyenda.push({ color: '#f3f4f6', texto: 'No lectivo' });
  entradasLeyenda.push({ color: '#f3f4f6', texto: 'Festivos' });
  entradasLeyenda.push({ color: '#fafafa', texto: 'Fuera de rango' });

  const meses = obtenerMesesEntre(inicio, fin);

  let filaActual = 0;
  let maxColumnas = 1;

  const MARGEN_LEYENDA = 1;
  const COLUMNAS_LEYENDA = 1;

  meses.forEach(function (mesInfo, indexMes) {
    const ultimoDiaDelMes = new Date(mesInfo.anio, mesInfo.mes + 1, 0).getDate();
    const columnasMes = 1 + ultimoDiaDelMes;

    const incluyeLeyenda = (indexMes === 0);
    const columnasTotalesMes = incluyeLeyenda
      ? columnasMes + MARGEN_LEYENDA + COLUMNAS_LEYENDA
      : columnasMes;

    if (columnasTotalesMes > maxColumnas) maxColumnas = columnasTotalesMes;

    if (indexMes > 0) {
      filas.push([]);
      filaActual++;
    }

    const filaInicioMes = filaActual;

    const filaTitulo = [];
    for (let c = 0; c < columnasMes; c++) {
      filaTitulo.push({ v: c === 0 ? capitalizar(MESES[mesInfo.mes]) + ' ' + mesInfo.anio : '', s: null });
    }

    if (incluyeLeyenda) {
      for (let m = 0; m < MARGEN_LEYENDA; m++) {
        filaTitulo.push({ v: '', s: null });
      }
      filaTitulo.push({ v: 'Leyenda', s: estiloTituloLeyenda });
    }

    filas.push(filaTitulo);
    fusiones.push({
      s: { r: filaActual, c: 0 },
      e: { r: filaActual, c: columnasMes - 1 }
    });
    filaTitulo[0].s = estiloTituloMes;
    filaActual++;

    const filaNombres = [{ v: '', s: null }];
    const filaNumeros = [{ v: '', s: null }];
    const datosPorColumna = [];

    for (let dia = 1; dia <= ultimoDiaDelMes; dia++) {
      const fecha = new Date(mesInfo.anio, mesInfo.mes, dia);
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

      if (diaSemana === 0) {
        estiloNombre = Object.assign({}, estiloNombre, {
          border: Object.assign({}, estiloNombre.border, {
            right: bordeGruesoSeparador
          })
        });
      }

      filaNombres.push({
        v: NOMBRES_DIAS_CORTOS[(diaSemana + 6) % 7],
        s: estiloNombre
      });

      const marcaFestivo = esFestivo ? ' *' : '';
      filaNumeros.push({
        v: String(dia) + marcaFestivo,
        s: estiloNombre
      });

      datosPorColumna.push({
        fecha: fecha,
        fechaStr: fechaStr,
        esFinde: esFinde,
        esFestivo: esFestivo,
        fueraDeRango: fueraDeRango,
        estado: estado,
        esDomingo: diaSemana === 0
      });
    }

    let indiceLeyenda = 0;

    if (incluyeLeyenda) {
      for (let m = 0; m < MARGEN_LEYENDA; m++) {
        filaNombres.push({ v: '', s: null });
      }
      if (indiceLeyenda < entradasLeyenda.length) {
        const e = entradasLeyenda[indiceLeyenda];
        filaNombres.push({ v: e.texto, s: estiloEntradaLeyenda(e.color) });
        indiceLeyenda++;
      } else {
        filaNombres.push({ v: '', s: null });
      }
    }

    if (incluyeLeyenda) {
      for (let m = 0; m < MARGEN_LEYENDA; m++) {
        filaNumeros.push({ v: '', s: null });
      }
      if (indiceLeyenda < entradasLeyenda.length) {
        const e = entradasLeyenda[indiceLeyenda];
        filaNumeros.push({ v: e.texto, s: estiloEntradaLeyenda(e.color) });
        indiceLeyenda++;
      } else {
        filaNumeros.push({ v: '', s: null });
      }
    }

    filas.push(filaNombres);
    filaActual++;
    filas.push(filaNumeros);
    filaActual++;

    for (let h = 1; h <= horasDia; h++) {
      const fila = [{ v: 'H' + h, s: estiloHoraLabel }];

      datosPorColumna.forEach(function (d) {
        let estilo = estiloCeldaBase;

        if (d.fueraDeRango) estilo = estiloCeldaFueraRango;
        else if (d.esFestivo) estilo = estiloCeldaFestivo;
        else if (d.esFinde) estilo = estiloCeldaFinde;
        else if (d.estado.tipo === 'no-lectivo') estilo = estiloCeldaNoLectivo;
        else if (d.estado.tipo === 'practicas') estilo = estiloCeldaPracticas;
        else if (d.estado.tipo === 'modulo' && d.estado.horas && d.estado.horas[h]) {
          const modId = d.estado.horas[h];
          const mod = modulos.find(function (m) { return m.id === modId; });
          if (mod) {
            estilo = Object.assign({}, estiloCeldaBase, {
              fill: { fgColor: { rgb: rgbDeHex(mod.color) } }
            });
          }
        }

        if (d.esDomingo) {
          estilo = Object.assign({}, estilo, {
            border: Object.assign({}, estilo.border, {
              right: bordeGruesoSeparador
            })
          });
        }

        fila.push({ v: '', s: estilo });
      });

      if (incluyeLeyenda) {
        for (let m = 0; m < MARGEN_LEYENDA; m++) {
          fila.push({ v: '', s: null });
        }
        if (indiceLeyenda < entradasLeyenda.length) {
          const e = entradasLeyenda[indiceLeyenda];
          fila.push({ v: e.texto, s: estiloEntradaLeyenda(e.color) });
          indiceLeyenda++;
        } else {
          fila.push({ v: '', s: null });
        }
      }

      filas.push(fila);
      filaActual++;
    }

    if (incluyeLeyenda) {
      while (indiceLeyenda < entradasLeyenda.length) {
        const fila = [];
        for (let c = 0; c < columnasMes + MARGEN_LEYENDA; c++) {
          fila.push({ v: '', s: null });
        }
        const e = entradasLeyenda[indiceLeyenda];
        fila.push({ v: e.texto, s: estiloEntradaLeyenda(e.color) });
        filas.push(fila);
        filaActual++;
        indiceLeyenda++;
      }
    }

    const filaFinMes = filaActual - 1;

    for (let r = filaInicioMes; r <= filaFinMes; r++) {
      if (!filas[r]) continue;

      const celdaIzq = filas[r][0];
      if (celdaIzq && typeof celdaIzq === 'object') {
        const base = celdaIzq.s || { border: bordeFino };
        celdaIzq.s = Object.assign({}, base, {
          border: Object.assign({}, base.border || bordeFino, {
            left: bordeGruesoExtremo
          })
        });
      }

      const celdaDer = filas[r][columnasMes - 1];
      if (celdaDer && typeof celdaDer === 'object') {
        const base = celdaDer.s || { border: bordeFino };
        celdaDer.s = Object.assign({}, base, {
          border: Object.assign({}, base.border || bordeFino, {
            right: bordeGruesoExtremo
          })
        });
      }

      if (r === filaInicioMes) {
        for (let c = 0; c < columnasMes; c++) {
          const celda = filas[r][c];
          if (celda && typeof celda === 'object') {
            const base = celda.s || {};
            celda.s = Object.assign({}, base, {
              border: Object.assign({}, base.border || bordeFino, {
                top: bordeGruesoExtremo
              })
            });
          }
        }
      }

      if (r === filaFinMes) {
        for (let c = 0; c < columnasMes; c++) {
          const celda = filas[r][c];
          if (celda && typeof celda === 'object') {
            const base = celda.s || {};
            celda.s = Object.assign({}, base, {
              border: Object.assign({}, base.border || bordeFino, {
                bottom: bordeGruesoExtremo
              })
            });
          }
        }
      }
    }
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

  if (fusiones.length > 0) {
    hoja['!merges'] = fusiones;
  }

  const anchos = [{ wch: 6 }];
  for (let i = 1; i < maxColumnas; i++) {
    if (i === maxColumnas - 1) {
      anchos.push({ wch: 32 });
    } else {
      anchos.push({ wch: 6 });
    }
  }
  hoja['!cols'] = anchos;

  return hoja;
}

function construirHojaResumen(nombre, inicio, fin, horasDia, horario, horasPracticas) {
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
  let totalHorasSinAsignar = 0;
  const horasPorModulo = new Map();

  dias.forEach(function (d) {
    totalDias++;
    if (d.esFinDeSemana) return;
    const fechaStr = aFormatoISO(d.fecha);
    const estado = obtenerEstadoDia(fechaStr);
    if (d.esFestivo || estado.tipo === 'no-lectivo') { totalNoLectivos++; return; }
    totalLectivos++;
    if (estado.tipo === 'practicas') { totalPracticas++; return; }
    if (estado.tipo === 'modulo') {
      for (let h = 1; h <= horasDia; h++) {
        const modId = estado.horas ? estado.horas[h] : null;
        if (modId) {
          horasPorModulo.set(modId, (horasPorModulo.get(modId) || 0) + 1);
        } else {
          totalHorasSinAsignar++;
        }
      }
      return;
    }
    // Día lectivo sin nada asignado
    totalHorasSinAsignar += horasDia;
  });

  const totalHorasModulos = modulos.reduce(function (acc, m) {
    return acc + (horasPorModulo.get(m.id) || 0);
  }, 0);

  const totalHorasPracticas = totalPracticas * horasPracticas;
  const totalHorasCurso = totalHorasModulos + totalHorasPracticas + totalHorasSinAsignar;

  // Construir texto de desglose para la fila del total
  let textoDesglose = '';
  const partes = [];
  partes.push(`${totalHorasModulos} h de módulos`);
  partes.push(`${totalHorasPracticas} h de prácticas`);
  if (totalHorasSinAsignar > 0) {
    partes.push(`${totalHorasSinAsignar} h sin asignar`);
  }
  textoDesglose = partes.join(' + ');

  // Estilos
  const bordeFino = {
    top: { style: 'thin', color: { rgb: 'd1d5db' } },
    bottom: { style: 'thin', color: { rgb: 'd1d5db' } },
    left: { style: 'thin', color: { rgb: 'd1d5db' } },
    right: { style: 'thin', color: { rgb: 'd1d5db' } }
  };

  const estiloTitulo = { font: { bold: true, sz: 14, color: { rgb: '1e3a8a' } } };
  const estiloCabCampo = {
    font: { bold: true },
    fill: { fgColor: { rgb: 'eff6ff' } },
    border: bordeFino
  };

  const estiloCabTabla = {
    font: { bold: true, color: { rgb: 'ffffff' } },
    fill: { fgColor: { rgb: '2563eb' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: bordeFino
  };

  const estiloCeldaModuloNombre = {
    font: { bold: true },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: bordeFino
  };

  const estiloCeldaHoras = {
    alignment: { horizontal: 'center', vertical: 'center' },
    border: bordeFino
  };

  const estiloCeldaProfesorVacia = {
    alignment: { horizontal: 'left', vertical: 'center' },
    border: bordeFino
  };

  const estiloAvisoProfesor = {
    font: { italic: true, color: { rgb: '9ca3af' }, sz: 9 },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: bordeFino
  };

  const estiloCeldaTotalLabel = {
    font: { bold: true, color: { rgb: '1e3a8a' } },
    fill: { fgColor: { rgb: 'eff6ff' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: bordeFino
  };

  const estiloCeldaTotalHoras = {
    font: { bold: true, color: { rgb: '1e3a8a' } },
    fill: { fgColor: { rgb: 'eff6ff' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: bordeFino
  };

  const estiloCeldaTotalVacia = {
    fill: { fgColor: { rgb: 'eff6ff' } },
    border: bordeFino
  };

  // Estilos del bloque destacado de horas totales
  const estiloTotalCursoLabel = {
    font: { bold: true, sz: 16, color: { rgb: 'ffffff' } },
    fill: { fgColor: { rgb: '1e3a8a' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '1e3a8a' } },
      bottom: { style: 'medium', color: { rgb: '1e3a8a' } },
      left: { style: 'medium', color: { rgb: '1e3a8a' } },
      right: { style: 'thin', color: { rgb: '1e3a8a' } }
    }
  };

  const estiloTotalCursoValor = {
    font: { bold: true, sz: 16, color: { rgb: 'ffffff' } },
    fill: { fgColor: { rgb: '1e3a8a' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '1e3a8a' } },
      bottom: { style: 'medium', color: { rgb: '1e3a8a' } },
      left: { style: 'thin', color: { rgb: '1e3a8a' } },
      right: { style: 'medium', color: { rgb: '1e3a8a' } }
    }
  };

  const estiloTotalCursoDesglose = {
    font: { italic: true, sz: 10, color: { rgb: '1e3a8a' } },
    fill: { fgColor: { rgb: 'eff6ff' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '1e3a8a' } },
      bottom: { style: 'medium', color: { rgb: '1e3a8a' } },
      left: { style: 'medium', color: { rgb: '1e3a8a' } },
      right: { style: 'medium', color: { rgb: '1e3a8a' } }
    }
  };

  // Construcción de filas
  const filas = [];

  // --- Bloque 1: datos del curso ---
  filas.push([{ v: 'Resumen del curso', s: estiloTitulo }]);
  filas.push([]);
  filas.push([{ v: 'Nombre', s: estiloCabCampo }, { v: nombre }]);
  filas.push([{ v: 'Fecha inicio', s: estiloCabCampo }, { v: formatearFecha(inicio) }]);
  filas.push([{ v: 'Fecha fin', s: estiloCabCampo }, { v: formatearFecha(fin) }]);
  filas.push([{ v: 'Horas al día', s: estiloCabCampo }, { v: horasDia }]);
  filas.push([{ v: 'Horario', s: estiloCabCampo }, { v: horario }]);
  filas.push([{ v: 'Fecha prueba de selección', s: estiloCabCampo }, { v: '' }]);
  filas.push([{ v: 'Hora prueba de selección', s: estiloCabCampo }, { v: '' }]);
  filas.push([]);

  // --- Bloque 2: HORAS TOTALES DEL CURSO (destacado) ---
  const filaTotalCursoIndex = filas.length;
  filas.push([
    { v: 'HORAS TOTALES DEL CURSO', s: estiloTotalCursoLabel },
    { v: totalHorasCurso + ' h', s: estiloTotalCursoValor }
  ]);
  filas.push([
    { v: textoDesglose, s: estiloTotalCursoDesglose },
    { v: '', s: Object.assign({}, estiloTotalCursoDesglose, { alignment: { horizontal: 'right', vertical: 'center' } }) }
  ]);
  // Fusionar la fila de desglose en las dos columnas
  const filaDesgloseIndex = filas.length - 1;
  filas[filaDesgloseIndex] = [
    { v: textoDesglose, s: estiloTotalCursoDesglose }
  ];

  filas.push([]);

  // --- Bloque 3: Totales ---
  filas.push([{ v: 'Totales', s: estiloTitulo }]);
  filas.push([{ v: 'Días naturales', s: estiloCabCampo }, { v: totalDias }]);
  filas.push([{ v: 'Días lectivos', s: estiloCabCampo }, { v: totalLectivos }]);
  filas.push([{ v: 'Días no lectivos', s: estiloCabCampo }, { v: totalNoLectivos }]);
  filas.push([{ v: 'Festivos', s: estiloCabCampo }, { v: totalFestivos }]);
  filas.push([{ v: 'Días de prácticas', s: estiloCabCampo }, { v: totalPracticas }]);
  filas.push([]);

  // --- Bloque 4: Horas por módulo ---
  filas.push([{ v: 'Horas por módulo', s: estiloTitulo }]);
  filas.push([
    { v: 'Módulo', s: estiloCabTabla },
    { v: 'Horas', s: estiloCabTabla },
    { v: 'Profesor', s: estiloCabTabla }
  ]);

  modulos.forEach(function (m, index) {
    const horas = horasPorModulo.get(m.id) || 0;

    const estiloNombreModulo = Object.assign({}, estiloCeldaModuloNombre, {
      fill: { fgColor: { rgb: rgbDeHex(m.color) } }
    });

    let celdaProfesor;
    if (index === 0) {
      celdaProfesor = { v: 'POR FAVOR RELLENAR LOS PROFESORES AQUÍ', s: estiloAvisoProfesor };
    } else {
      celdaProfesor = { v: '', s: estiloCeldaProfesorVacia };
    }

    filas.push([
      { v: m.nombre, s: estiloNombreModulo },
      { v: horas, s: estiloCeldaHoras },
      celdaProfesor
    ]);
  });

  if (modulos.length === 0) {
    filas.push([
      { v: '(Sin módulos definidos)', s: { font: { italic: true, color: { rgb: '9ca3af' } }, border: bordeFino } },
      { v: '', s: estiloCeldaHoras },
      { v: '', s: estiloCeldaProfesorVacia }
    ]);
  }

  // Fila de totales de módulos
  filas.push([
    { v: 'TOTAL HORAS', s: estiloCeldaTotalLabel },
    { v: totalHorasModulos, s: estiloCeldaTotalHoras },
    { v: '', s: estiloCeldaTotalVacia }
  ]);

  // --- Bloque 5: Horas en prácticas ---
  filas.push([]);
  filas.push([{ v: 'Horas en prácticas', s: estiloTitulo }]);
  filas.push([
    { v: 'Prácticas en empresa', s: estiloCabTabla },
    { v: 'Horas / día', s: estiloCabTabla },
    { v: 'Días', s: estiloCabTabla }
  ]);

  const estiloNombrePracticas = Object.assign({}, estiloCeldaModuloNombre, {
    fill: { fgColor: { rgb: rgbDeHex(COLOR_PRACTICAS) } }
  });

  const filaPracticasIndex = filas.length;
  filas.push([
    { v: 'Prácticas en empresa', s: estiloNombrePracticas },
    { v: horasPracticas, s: estiloCeldaHoras },
    { v: totalPracticas, s: estiloCeldaHoras }
  ]);

  const filaTotalPracticasIndex = filas.length;
  filas.push([
    { v: 'TOTAL HORAS', s: estiloCeldaTotalLabel },
    { v: '', s: estiloCeldaTotalVacia },
    { v: '', s: estiloCeldaTotalHoras }
  ]);

  // Construcción de la hoja
  const hoja = XLSX.utils.aoa_to_sheet(
    filas.map(function (fila) {
      return fila.map(function (celda) {
        if (celda === null || celda === undefined) return '';
        if (typeof celda === 'object' && 'v' in celda) return celda.v;
        return celda;
      });
    })
  );

  // Fórmula de Excel para el TOTAL de prácticas
  const filaExcelPracticas = filaPracticasIndex + 1;
  const filaExcelTotalPracticas = filaTotalPracticasIndex + 1;
  const formula = 'B' + filaExcelPracticas + '*C' + filaExcelPracticas;
  const direccionTotalPracticas = 'B' + filaExcelTotalPracticas;
  hoja[direccionTotalPracticas] = { t: 'n', f: formula, v: totalPracticas * horasPracticas };
  hoja[direccionTotalPracticas].s = estiloCeldaTotalHoras;
  // Aplicar estilos celda a celda
  filas.forEach(function (fila, r) {
    fila.forEach(function (celda, c) {
      if (celda === null || celda === undefined) return;
      if (typeof celda !== 'object' || !('s' in celda)) return;
      if (!celda.s) return;
      const direccion = XLSX.utils.encode_cell({ r: r, c: c });
      if (!hoja[direccion]) {
        hoja[direccion] = { v: celda.v || '', t: typeof celda.v === 'number' ? 'n' : 's' };
      }
      hoja[direccion].s = celda.s;
    });
  });

  // Fusiones: unir las dos columnas del bloque destacado
  hoja['!merges'] = [
    // Fila del título "HORAS TOTALES DEL CURSO": columnas A y B
    { s: { r: filaTotalCursoIndex, c: 0 }, e: { r: filaTotalCursoIndex, c: 1 } },
    // Fila del desglose: columnas A y B
    { s: { r: filaDesgloseIndex, c: 0 }, e: { r: filaDesgloseIndex, c: 1 } }
  ];

    // Forzar el estilo del total de prácticas (se sobrescribe en el bucle de estilos)
  hoja[direccionTotalPracticas] = {
    t: 'n',
    f: 'B' + filaExcelPracticas + '*C' + filaExcelPracticas,
    v: totalPracticas * horasPracticas,
    s: estiloCeldaTotalHoras
  };

  hoja['!cols'] = [{ wch: 32 }, { wch: 14 }, { wch: 42 }];
  return hoja;
}

function rgbDeHex(hex) {
  if (!hex) return 'ffffff';
  return hex.replace('#', '').toUpperCase();
}
