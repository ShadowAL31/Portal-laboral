/**
 * ============================================================
 * GOOGLE APPS SCRIPT — Backend del Portal Laboral (v3)
 * ============================================================
 * INSTRUCCIONES DE VINCULACIÓN CON GOOGLE SHEETS:
 *
 * 1. Abra Google Sheets y cree una hoja nueva (o use la existente).
 * 2. Cree DOS pestañas con estos nombres exactos:
 *
 *    a) "Informacion Relevante para Trabajadores"
 *       Encabezados en la fila 1:
 *         A1: Codigo_Pais
 *         B1: Celular_Registrado
 *         C1: Codigo_Verificacion
 *         D1: ID_Empleado
 *         E1: Nombre_Completo
 *         F1: Cargo
 *         G1: Departamento
 *         H1: Estatus_Laboral
 *         I1: Suma_del_Cobro
 *         J1: Descuadre
 *         K1: Abono
 *         L1: Producto
 *         M1: Nequis_Pendiente
 *
 *    b) "Registro_Accesos_Log"
 *       Encabezados en la fila 1:
 *         A1: Timestamp
 *         B1: Fecha_Hora
 *         C1: Celular_Completo
 *         D1: Evento
 *         E1: Dispositivo
 *         F1: IP
 *         G1: Estatus
 *
 * 3. En el menú: Extensiones → Apps Script.
 * 4. Borre el contenido predeterminado y pegue este código.
 * 5. Ejecute una vez la función inicializarHojas para crear la estructura.
 * 6. Implementar → Nueva implementación → Tipo: "Aplicación web".
 *    - Ejecutar como: "Yo"
 *    - Acceso: "Cualquier persona" (o "Cualquier persona con cuenta
 *      Google" según política de la empresa)
 * 7. Copiar la URL generada y pegarla en js/mock-data.js en la constante
 *    APPS_SCRIPT_URL.
 * ============================================================
 */

const DATOS_SHEET_NAME = 'Informacion Relevante para Trabajadores';
const LOG_SHEET_NAME = 'Registro_Accesos_Log';

/**
 * GET — Consulta datos del trabajador por celular completo.
 * Uso: GET /exec?celular=+573001234567
 * Retorna JSON: { ok: true, trabajador: {...} } o { ok: false }
 */
function doGet(e) {
  try {
    const celular = (e && e.parameter && e.parameter.celular) || '';

    if (!celular) {
      return respuestaJSON({ ok: false, mensaje: 'Parámetro celular requerido' });
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = spreadsheet.getSheetByName(DATOS_SHEET_NAME);

    if (!hoja) {
      return respuestaJSON({ ok: false, mensaje: 'Pestaña de datos no encontrada' });
    }

    const datos = hoja.getDataRange().getValues();

    // Buscar la fila donde Codigo_Pais + Celular_Registrado = celular completo
    for (let i = 1; i < datos.length; i++) {
      const fila = datos[i];
      const codigoPais = String(fila[0] || '');
      const celularRegistrado = String(fila[1] || '');
      const celularCompleto = codigoPais + celularRegistrado;

      if (celularCompleto === celular) {
        return respuestaJSON({
          ok: true,
          trabajador: {
            codigoPais: fila[0],
            celular: fila[1],
            codigoVerificacion: fila[2],
            id: fila[3],
            nombre: fila[4],
            cargo: fila[5],
            departamento: fila[6],
            estatus: fila[7],
            sumaCobro: fila[8],
            descuadre: fila[9],
            abono: fila[10],
            producto: fila[11],
            nequisPendiente: fila[12]
          }
        });
      }
    }

    return respuestaJSON({ ok: false, mensaje: 'Trabajador no encontrado' });
  } catch (error) {
    return respuestaJSON({ ok: false, mensaje: 'Error: ' + error.message });
  }
}

/**
 * POST — Registra un evento de acceso en el log de auditoría.
 * Cuerpo (JSON): { timestamp, fechaHora, celular, evento, dispositivo, ip, estatus }
 */
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);

    if (!datos.celular || !datos.evento) {
      return respuestaJSON({ ok: false, mensaje: 'Datos incompletos' });
    }

    registrarAcceso(datos);

    return respuestaJSON({ ok: true, mensaje: 'Registro almacenado' });
  } catch (error) {
    return respuestaJSON({ ok: false, mensaje: 'Error: ' + error.message });
  }
}

/**
 * Inserta una fila en la pestaña de registro de accesos.
 */
function registrarAcceso(datos) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = spreadsheet.getSheetByName(LOG_SHEET_NAME);

  // Crear la pestaña si no existe
  if (!hoja) {
    hoja = spreadsheet.insertSheet(LOG_SHEET_NAME);
    hoja.appendRow(['Timestamp', 'Fecha_Hora', 'Celular_Completo', 'Evento', 'Dispositivo', 'IP', 'Estatus']);
    hoja.getRange(1, 1, 1, 7).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }

  hoja.appendRow([
    datos.timestamp || new Date().toISOString(),
    datos.fechaHora || new Date().toLocaleString('es-MX'),
    String(datos.celular),
    String(datos.evento),
    String(datos.dispositivo || 'N/A'),
    String(datos.ip || 'N/A'),
    String(datos.estatus || 'N/A')
  ]);
}

/**
 * Respuesta JSON con tipo de contenido apropiado.
 */
function respuestaJSON(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Utilidad: crear la estructura inicial de ambas hojas.
 * Ejecutar una sola vez desde el editor de Apps Script.
 */
function inicializarHojas() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // --- Pestaña de datos ---
  let hojaDatos = spreadsheet.getSheetByName(DATOS_SHEET_NAME);
  if (!hojaDatos) {
    hojaDatos = spreadsheet.insertSheet(DATOS_SHEET_NAME);
  }
  hojaDatos.clear();
  hojaDatos.appendRow([
    'Codigo_Pais', 'Celular_Registrado', 'Codigo_Verificacion',
    'ID_Empleado', 'Nombre_Completo', 'Cargo', 'Departamento',
    'Estatus_Laboral', 'Suma_del_Cobro', 'Descuadre', 'Abono',
    'Producto', 'Nequis_Pendiente'
  ]);
  hojaDatos.getRange(1, 1, 1, 13).setFontWeight('bold');
  hojaDatos.setFrozenRows(1);

  // --- Pestaña de log ---
  let hojaLog = spreadsheet.getSheetByName(LOG_SHEET_NAME);
  if (!hojaLog) {
    hojaLog = spreadsheet.insertSheet(LOG_SHEET_NAME);
  }
  hojaLog.clear();
  hojaLog.appendRow(['Timestamp', 'Fecha_Hora', 'Celular_Completo', 'Evento', 'Dispositivo', 'IP', 'Estatus']);
  hojaLog.getRange(1, 1, 1, 7).setFontWeight('bold');
  hojaLog.setFrozenRows(1);

  Logger.log('Hojas inicializadas correctamente.');
}
