# Memorias del Proyecto — Portal Laboral Consulta de Estatus

> Documento de memoria para continuidad de desarrollo. Fecha: Octubre 2026.

---

## 1. Visión General

Portal web de consulta de estatus laboral para trabajadores. Autenticación por celular + OTP. Vista de solo lectura. Los datos provienen de Google Sheets en tiempo real.

---

## 2. Estructura del Proyecto

```
consulta-estatus/
├── index.html              # Estructura principal (2 vistas: login, datos)
├── css/
│   └── styles.css          # Estilos corporativos responsivos
├── js/
│   └── app.js              # Lógica de autenticación + selector de días
├── apps-script/            # Código fuente del Google Apps Script
│   └── Code.gs             # (ver sección 5)
├── usuarios.json           # ELIMINADO — ya no se usa
└── Memorias.md             # Este archivo
```

---

## 3. Fuentes de Datos

### Google Sheets
- **URL:** https://docs.google.com/spreadsheets/d/19rqs-MrRi6M_iP2vgK5ZWYEwxBV7mt3UERDY-FJ1JcA/edit
- **Pestaña 1 (original):** Información base + autenticación
- **Pestaña 2 ("Datos Diarios"):** Desglose Lunes a Domingo

### Pestaña 1 — Información Base
| Columna | Campo interno |
|---------|---------------|
| ID Empleado | id |
| Nombre Completo | nombre |
| Codigo Pais | codigoPais |
| Celular Registrado | celular |
| Codigo Verificacion | codigoVerificacion |
| Cargo | cargo |
| Departamento | departamento |
| Estatus Laboral | estatus |
| Suma del Cobro | sumaCobro |
| Descuadre | descuadre |
| Abono | abono |
| Producto | producto |
| Nequis Pendiente | nequisPendiente |

### Pestaña 2 — Datos Diarios
Mismas columnas base + columna "Día" (Lunes a Domingo) + "Total Semanal".
7 filas por trabajador (una por día).

---

## 4. Google Apps Script

### URL del Web App desplegado
```
https://script.google.com/macros/s/AKfycbwjL8iucmWqsuwB8XGzYucWG49uwqEGcLzaVAgeY1yyR4m5dl-SKk4IKtYj9WJt-0-A/exec
```

### Funcionamiento
- `doGet()` lee la pestaña original (autenticación) + pestaña "Datos Diarios"
- Combina ambos en un solo JSON: cada trabajador tiene sus datos base + array `datosDiarios`
- Desplegado como Web App con acceso "Cualquier persona"

### Código actual del doGet()
```javascript
function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Leer pestaña original (autenticación + datos base)
  var hojaOriginal = ss.getSheets()[0];
  var datosOriginales = hojaOriginal.getDataRange().getValues();
  var headersOriginales = datosOriginales[0];
  var filasOriginales = datosOriginales.slice(1);
  
  // Leer pestaña "Datos Diarios"
  var hojaDiarios = ss.getSheetByName('Datos Diarios');
  var datosDiarios = hojaDiarios.getDataRange().getValues();
  var headersDiarios = datosDiarios[0];
  var filasDiarios = datosDiarios.slice(1);
  
  // Crear mapa de datos diarios por trabajador
  var diariosPorTrabajador = {};
  filasDiarios.forEach(function(fila) {
    var registro = {};
    headersDiarios.forEach(function(h, i) {
      registro[h] = fila[i];
    });
    var id = registro['ID Empleado'];
    if (!diariosPorTrabajador[id]) {
      diariosPorTrabajador[id] = [];
    }
    diariosPorTrabajador[id].push(registro);
  });
  
  // Combinar: por cada trabajador original, agregar sus datos diarios
  var resultado = filasOriginales.map(function(fila) {
    var registro = {};
    headersOriginales.forEach(function(h, i) {
      registro[h] = fila[i];
    });
    var id = registro['ID Empleado'];
    registro['datosDiarios'] = diariosPorTrabajador[id] || [];
    return registro;
  });
  
  return ContentService
    .createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Scripts auxiliares (ya ejecutados, no necesarios de nuevo)
- `crearPestana()` — Creó la pestaña "Datos Diarios"
- `llenarDatosDiarios()` — Llenó la pestaña con 7 filas por trabajador

---

## 5. Lógica de la App (app.js)

### Flujo de autenticación
1. Usuario ingresa: Prefijo (+57) + Celular (3004990158) + OTP (123456)
2. App construye: "+57" + "3004990158" = "+573004990158"
3. Busca en datos cargados desde Google Sheets
4. Si NO coincide → "Número no registrado o código de verificación incorrecto"
5. Si coincide → muestra datos (solo lectura)

### Estructura de datos en la app
```javascript
usuario = {
    id: "EMP-001",
    nombre: "Andres Leal",
    codigoPais: "+57",
    celular: "3004990158",
    codigoVerificacion: "123456",
    cargo: "Cobrador",
    departamento: "Atlantico",
    estatus: "activo",
    datosDiarios: [
        { dia: "Lunes", sumaCobro: "1956", descuadre: "25", abono: "-7", producto: "1", nequisPendiente: "No", totalSemanal: "" },
        { dia: "Martes", ... },
        ...
    ]
}
```

### Selector de días interactivo
- 7 botones (Lunes a Domingo)
- Al hacer clic en un día → muestra tarjeta de detalle con datos específicos
- La tabla semanal completa sigue disponible debajo

---

## 6. Usuarios de Prueba

| País | Celular | OTP | Nombre | Estatus |
|------|---------|-----|--------|---------|
| +57 🇨🇴 | 3004990158 | 123456 | Andres Leal | Activo |
| +58 🇻🇪 | 4141234567 | 5678 | Maria Gomez | Activo |
| +52 🇲🇽 | 5512345678 | 9012 | Carlos Ruiz | Activo |
| +1 🇺🇸 | 2025550123 | 3456 | Ana Smith | Activo |
| +34 🇪🇸 | 600123456 | 7890 | Luis Garcia | Inactivo |

---

## 7. Puesta en Marcha

```bash
# Desde el directorio del proyecto
python -m http.server 8080
# Abrir http://localhost:8080
```

---

## 8. Decisiones de Diseño

- **v4 → v5:** Se migró de JSON local a Google Sheets en tiempo real
- **CORS:** Google Sheets no permite fetch directo desde navegador → se usa Google Apps Script como proxy
- **Estructura diaria:** Se creó pestaña separada "Datos Diarios" en lugar de modificar la original (para no romper la autenticación)
- **Selector de días:** Se implementó con botones interactivos + tarjeta de detalle desplegable

---

## 9. Pendientes / Ideas Futuras

- [ ] Fórmula de Total Semanal automática en Google Sheets
- [ ] Formato de moneda para valores numéricos ($1,956 en lugar de 1956)
- [ ] Más países en el selector de prefijos
- [ ] Límite de intentos de login
- [ ] Exportar datos a PDF
- [ ] Notificaciones o alertas
- [ ] Modo oscuro
- [ ] Mejorar validación de OTP (ej: que no sea 123456)

---

## 10. Notas Técnicas

- El `js/usuarios.json` fue eliminado — ya no se usa
- El `usuarios.json` en raíz también fue eliminado
- La app requiere conexión a internet para funcionar (fetch a Google Sheets)
- El Google Apps Script debe mantenerse desplegado y activo
- Si se modifica el Apps Script, hay que crear nueva versión (la URL no cambia)
