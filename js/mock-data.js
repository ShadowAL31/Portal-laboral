/**
 * ============================================================
 * CONFIGURACIÓN — Portal Laboral (v3)
 * ============================================================
 * La aplicación lee los datos directamente desde la pestaña
 * "Informacion Relevante para Trabajadores" de Google Sheets.
 *
 * IMPORTANTE: Debe configurar la URL del Apps Script desplegado.
 * Sin esta URL, la aplicación no puede funcionar.
 *
 * Para obtener la URL:
 *   1. Abra su Google Sheet
 *   2. Extensiones → Apps Script
 *   3. Implementar → Nueva implementación → Aplicación web
 *   4. Copiar la URL generada y pegarla abajo
 * ============================================================
 */

/**
 * URL del Google Apps Script desplegado.
 * Reemplazar con la URL real generada al implementar.
 * Ejemplo: "https://script.google.com/macros/s/AKfycb.../exec"
 */
const APPS_SCRIPT_URL = "https://docs.google.com/spreadsheets/d/19rqs-MrRi6M_iP2vgK5ZWYEwxBV7mt3UERDY-FJ1JcA/edit?gid=0#gid=0";

/** Nombre de la pestaña de datos en Google Sheets */
const DATOS_SHEET_NAME = "Informacion Relevante para Trabajadores";

/** Nombre de la pestaña de registro en Google Sheets */
const LOG_SHEET_NAME = "Registro_Accesos_Log";
