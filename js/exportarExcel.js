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

  // Estilos generales
  const bordeFino = {
    top: { style: 'thin', color: { rgb: 'd1d5db' } },
    bottom: { style: 'thin', color: { rgb: 'd1d5db' } },
    left: { style: 'thin', color: { rgb: 'd1d5db' } },
    right: { style: 'thin', color: { rgb: 'd1d5db' } }
  };

  const estiloTitulo = { font: { bold: true, sz: 14, color: { rgb: '1e3a8a' } } };
  const estiloCabCampo = { font: { bold: true }, fill: { fgColor: { rgb: 'eff6ff' } }, border: bordeFino };

  // Estilos de la tabla de módulos
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

  // Construcción de filas
  const filas = [];

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

  // Tabla de horas por módulo
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

    // La primera fila de módulos lleva el aviso; las demás, celda vacía
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

  // Si no hay módulos, mostramos una fila vacía para que se vea la tabla
  if (modulos.length === 0) {
    filas.push([
      { v: '(Sin módulos definidos)', s: { font: { italic: true, color: { rgb: '9ca3af' } }, border: bordeFino } },
      { v: '', s: estiloCeldaHoras },
      { v: '', s: estiloCeldaProfesorVacia }
    ]);
  }

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

  hoja['!cols'] = [{ wch: 32 }, { wch: 10 }, { wch: 42 }];
  return hoja;
}

function rgbDeHex(hex) {
  if (!hex) return 'ffffff';
  return hex.replace('#', '').toUpperCase();
}
