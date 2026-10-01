# Portal Laboral — Consulta de Estatus (v4 - Local)

Prototipo web de consulta de estatus laboral para trabajadores, con autenticación por celular + OTP validado contra un archivo JSON local (`js/usuarios.json`), vista de **solo lectura**.

---

## Estructura del proyecto

```
consulta-estatus/
├── index.html              # Estructura principal (2 vistas: login, datos)
├── css/
│   └── styles.css          # Estilos corporativos responsivos
├── js/
│   ├── usuarios.json       # Base de datos local de usuarios autorizados
│   └── app.js              # Lógica de autenticación
└── README.md
```

---

## Puesta en marcha rápida

### Opción 1: Abrir directamente (puede no funcionar en todos los navegadores)
Abra `index.html` en su navegador.

### Opción 2: Usar un servidor local (recomendado)
Desde la terminal en el directorio del proyecto:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .
```

Luego abra `http://localhost:8000` en su navegador.

> **Nota:** Algunos navegadores bloquean `fetch()` con `file://` por seguridad. Use un servidor local para garantizar el funcionamiento.

---

## Credenciales de prueba

| País | Celular | Código OTP | Estatus |
|------|---------|-------------|---------|
| 🇨🇴 Colombia | 300 123 4567 | 483920 | Activo |
| 🇨🇴 Colombia | 310 987 6543 | 729104 | Activo |
| 🇨🇴 Colombia | 320 555 1234 | 156837 | Licencia |
| 🇨🇴 Colombia | 315 888 9900 | 903461 | Inactivo |
| 🇻🇪 Venezuela | 412 123 45678 | 648215 | Activo |

---

## Gestión de usuarios

Para agregar, modificar o eliminar usuarios, edite el archivo `js/usuarios.json`:

```json
[
    {
        "codigoPais": "+57",
        "celular": "3001234567",
        "codigoVerificacion": "483920",
        "id": "EMP-001",
        "nombre": "María Fernanda López García",
        "cargo": "Analista de Recursos Humanos",
        "departamento": "Gestión de Personal",
        "estatus": "activo",
        "sumaCobro": "$2,450,000",
        "descuadre": "$0",
        "abono": "$150,000",
        "producto": "Nómina Mensual",
        "nequisPendiente": "No"
    }
]
```

---

## Lógica de autenticación

```
Usuario ingresa: Prefijo (+57) + Celular (3001234567) + OTP (483920)
                                    ↓
Sistema construye: "+57" + "3001234567" = "+573001234567"
                                    ↓
Busca en js/usuarios.json
                                    ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
            NO coincide              Sí coincide
                    ↓                       ↓
    "Número no registrado         Verifica "codigoVerificacion"
     o código de verificación          ↓
     incorrecto"              ┌─────────┴─────────┐
                                ↓               ↓
                           NO coincide     Sí coincide
                                ↓               ↓
                        "Número no         Muestra datos
                         registrado o        (solo lectura)
                         código de
                         verificación
                          incorrecto"
```

---

## Notas de seguridad

- **Solo lectura**: la tabla de datos no permite edición.
- **Validación en dos pasos**: celular + OTP deben coincidir exactamente.
- **Sin dependencias externas**: todo funciona localmente con el archivo JSON.

---

## Personalización

- **Agregar usuarios**: edite `js/usuarios.json`.
- **Cambiar colores institucionales**: modifique las variables CSS en `:root` dentro de `css/styles.css`.
- **Agregar países**: agregue opciones al `<select id="select-pais">` en `index.html`.
