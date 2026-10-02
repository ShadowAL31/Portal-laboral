/**
 * ============================================================
 * PORTAL LABORAL — Lógica de la aplicación (v5 - Google Sheets)
 * ============================================================
 * Autenticación simplificada usando Google Sheets como fuente de datos.
 *
 * Flujo:
 *   1. El trabajador selecciona el prefijo de país.
 *   2. Ingresa su número de celular (sin prefijo).
 *   3. Ingresa el Código de Verificación (OTP).
 *   4. El sistema lee la hoja de cálculo vía Google Apps Script y valida:
 *      a) Busca "Codigo Pais" + "Celular Registrado" = celular completo.
 *      b) Si NO existe → "Número no registrado o código de verificación incorrecto".
 *      c) Si existe → verifica "Codigo Verificacion".
 *      d) Si NO coincide → "Número no registrado o código de verificación incorrecto".
 *      e) Si coincide → muestra datos (solo lectura).
 * ============================================================
 */

(function () {
    'use strict';

    /* ---------- Estado en memoria ---------- */
    let usuarios = [];
    let estado = {
        celularCompleto: null,
        trabajador: null
    };

    /* ---------- Referencias DOM ---------- */
    const $ = (id) => document.getElementById(id);

    const vistas = {
        login: $('view-login'),
        data: $('view-data')
    };

    const formLogin = $('form-login');
    const selectPais = $('select-pais');
    const inputCelular = $('input-celular');
    const inputOtp = $('input-otp');
    const errorLogin = $('error-login');

    /* ============================================================
       UTILIDADES
       ============================================================ */

    /** Formatea el número celular (sin prefijo) a dígitos legibles */
    function formatearCelular(valor) {
        const digitos = valor.replace(/\D/g, '').slice(0, 11);
        if (digitos.length <= 3) return digitos;
        if (digitos.length <= 6) return `${digitos.slice(0, 3)} ${digitos.slice(3)}`;
        if (digitos.length <= 10) return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
        return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6, 10)} ${digitos.slice(10)}`;
    }

    /** Muestra una notificación toast */
    function mostrarToast(mensaje, tipo = 'info', duracion = 4000) {
        const contenedor = $('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${tipo}`;
        toast.textContent = mensaje;
        contenedor.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hide');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }, duracion);
    }

    /** Muestra un error en el formulario */
    function mostrarError(mensaje) {
        errorLogin.textContent = mensaje;
        errorLogin.classList.add('visible');
    }

    /** Limpia el error del formulario */
    function limpiarError() {
        errorLogin.textContent = '';
        errorLogin.classList.remove('visible');
    }

    /** Cambia la vista activa */
    function mostrarVista(nombre) {
        Object.values(vistas).forEach(v => v.classList.remove('active'));
        vistas[nombre].classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /** Activa/desactiva estado de carga en un botón */
    function setCargando(boton, cargando) {
        const label = boton.querySelector('.btn-label');
        const spinner = boton.querySelector('.btn-spinner');
        boton.disabled = cargando;
        if (label) label.hidden = cargando;
        if (spinner) spinner.hidden = !cargando;
    }

    /* ============================================================
       CARGA DE USUARIOS
       ============================================================ */

    /** URL del Google Apps Script que devuelve los datos de la hoja */
    const API_URL = 'https://script.google.com/macros/s/AKfycbwjL8iucmWqsuwB8XGzYucWG49uwqEGcLzaVAgeY1yyR4m5dl-SKk4IKtYj9WJt-0-A/exec';

    /**
     * Mapea los nombres de columna de Google Sheets a los campos internos.
     * Columnas de la hoja → campos de la app
     */
    const MAPEO_CAMPOS = {
        'ID Empleado': 'id',
        'Nombre Completo': 'nombre',
        'Codigo Pais': 'codigoPais',
        'Celular Registrado': 'celular',
        'Codigo Verificacion': 'codigoVerificacion',
        'Cargo': 'cargo',
        'Departamento': 'departamento',
        'Estatus Laboral': 'estatus',
        'Suma del Cobro': 'sumaCobro',
        'Descuadre': 'descuadre',
        'Abono': 'abono',
        'Producto': 'producto',
        'Nequis Pendiente': 'nequisPendiente'
    };

    /**
     * Convierte un registro de Google Sheets (con nombres de columna)
     * al formato de campo interno de la aplicación.
     */
    function mapearRegistro(registro) {
        const resultado = {};
        for (const [columna, campo] of Object.entries(MAPEO_CAMPOS)) {
            resultado[campo] = registro[columna] !== undefined ? registro[columna] : '';
        }
        return resultado;
    }

    /**
     * Mapea los registros diarios de un trabajador.
     */
    function mapearDatosDiarios(datosDiarios) {
        if (!Array.isArray(datosDiarios)) return [];
        return datosDiarios.map(function(registro) {
            return {
                dia: registro['Día'] || '',
                sumaCobro: registro['Suma del Cobro'] || '',
                descuadre: registro['Descuadre'] || '',
                abono: registro['Abono'] || '',
                producto: registro['Producto'] || '',
                nequisPendiente: registro['Nequis Pendiente'] || '',
                totalSemanal: registro['Total Semanal'] || ''
            };
        });
    }

    /**
     * Carga los usuarios desde Google Sheets vía Google Apps Script.
     * Debe llamarse al inicializar la aplicación.
     */
    async function cargarUsuarios() {
        try {
            const respuesta = await fetch(API_URL);

            if (!respuesta.ok) {
                throw new Error(`Error HTTP: ${respuesta.status}`);
            }

            const datos = await respuesta.json();
            usuarios = datos.map(function(registro) {
                const usuario = mapearRegistro(registro);
                usuario.datosDiarios = mapearDatosDiarios(registro.datosDiarios);
                return usuario;
            });
            console.log(`[Auth] ${usuarios.length} usuarios cargados desde Google Sheets`);
        } catch (error) {
            console.error('[Auth] Error al cargar datos desde Google Sheets:', error);
            mostrarError('Error al cargar la base de datos de usuarios. Verifique su conexión a internet.');
            $('btn-login').disabled = true;
        }
    }

    /* ============================================================
       AUTENTICACIÓN
       ============================================================ */

    /**
     * Busca un usuario por celular completo (prefijo + número).
     */
    function buscarUsuario(celularCompleto) {
        return usuarios.find(u => {
            const celularRegistrado = u.codigoPais + u.celular;
            return celularRegistrado === celularCompleto;
        }) || null;
    }

    /**
     * Lógica principal de autenticación.
     */
    async function manejarLogin(event) {
        event.preventDefault();
        limpiarError();

        // Verificar que los usuarios estén cargados
        if (!usuarios || usuarios.length === 0) {
            mostrarError('La base de datos de usuarios no está cargada. Recargue la página.');
            return;
        }

        const prefijo = selectPais.value;
        const numeroRaw = inputCelular.value.trim();
        const numeroDigitos = numeroRaw.replace(/\D/g, '');
        const otpIngresado = inputOtp.value.trim();

        // Validaciones básicas de campos
        if (!numeroDigitos) {
            mostrarError('Ingrese su número de celular.');
            inputCelular.focus();
            return;
        }
        if (numeroDigitos.length < 7 || numeroDigitos.length > 11) {
            mostrarError('El número debe contener entre 7 y 11 dígitos.');
            inputCelular.focus();
            return;
        }
        if (!otpIngresado) {
            mostrarError('Ingrese el código de verificación.');
            inputOtp.focus();
            return;
        }
        if (otpIngresado.length !== 6) {
            mostrarError('El código de verificación debe tener 6 dígitos.');
            inputOtp.focus();
            return;
        }

        // Construir celular completo
        const celularCompleto = prefijo + numeroDigitos;

        const btn = $('btn-login');
        setCargando(btn, true);

        // Simular pequeña latencia
        await new Promise(resolve => setTimeout(resolve, 500));

        // 1) Buscar al usuario
        const usuario = buscarUsuario(celularCompleto);

        // 2) Verificar existencia y OTP
        if (!usuario || String(usuario.codigoVerificacion) !== otpIngresado) {
            setCargando(btn, false);
            mostrarError('Número no registrado o código de verificación incorrecto');
            return;
        }

        // 3) Autenticación exitosa
        estado.celularCompleto = celularCompleto;
        estado.trabajador = usuario;

        setCargando(btn, false);
        mostrarDatosTrabajador();
        mostrarToast('Bienvenido/a. Mostrando su información laboral.', 'success');
    }

    /* ============================================================
       VISTA DE DATOS (SOLO LECTURA)
       ============================================================ */

    function mostrarDatosTrabajador() {
        const t = estado.trabajador;
        if (!t) return;

        $('data-id').textContent = t.id || '—';
        $('data-nombre').textContent = t.nombre || '—';
        $('data-cargo').textContent = t.cargo || '—';
        $('data-departamento').textContent = t.departamento || '—';

        // Estatus con insignia de color
        const estatusEl = $('data-estatus');
        const etiquetas = { activo: 'Activo', inactivo: 'Inactivo', licencia: 'Licencia' };
        estatusEl.className = `status-badge ${t.estatus || ''}`;
        estatusEl.innerHTML = `<span class="status-dot"></span>${etiquetas[t.estatus] || t.estatus || '—'}`;

        // Mostrar tabla de datos diarios
        mostrarTablaDiaria(t.datosDiarios);

        // Configurar selector de días
        configurarSelectorDias(t.datosDiarios);

        mostrarVista('data');
    }

    /**
     * Configura el selector de días interactivo.
     */
    function configurarSelectorDias(datosDiarios) {
        const daySelector = $('day-selector');
        if (!daySelector) return;

        const dayBtns = daySelector.querySelectorAll('.day-btn');
        dayBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // Desactivar todos los botones
                dayBtns.forEach(b => b.classList.remove('active'));
                // Activar el botón seleccionado
                this.classList.add('active');
                // Mostrar detalle del día
                const dia = this.getAttribute('data-dia');
                mostrarDetalleDia(dia, datosDiarios);
            });
        });
    }

    /**
     * Muestra la tarjeta de detalle del día seleccionado.
     */
    function mostrarDetalleDia(dia, datosDiarios) {
        const card = $('day-detail-card');
        const title = $('day-detail-title');
        const grid = $('day-detail-grid');

        if (!card || !title || !grid) return;

        title.textContent = dia;

        const datosDia = datosDiarios.find(d => d.dia === dia);

        if (!datosDia) {
            grid.innerHTML = '<p class="day-placeholder">No hay datos para este día</p>';
            return;
        }

        grid.innerHTML = `
            <div class="detail-item">
                <span class="detail-label">Suma del Cobro</span>
                <span class="detail-value">${datosDia.sumaCobro || '—'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Descuadre</span>
                <span class="detail-value">${datosDia.descuadre || '—'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Abono</span>
                <span class="detail-value">${datosDia.abono || '—'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Producto</span>
                <span class="detail-value">${datosDia.producto || '—'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Nequis Pendiente</span>
                <span class="detail-value">${datosDia.nequisPendiente || '—'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Total Semanal</span>
                <span class="detail-value detail-total">${datosDia.totalSemanal || '—'}</span>
            </div>
        `;
    }

    /**
     * Muestra la tabla de datos diarios (Lunes a Domingo).
     */
    function mostrarTablaDiaria(datosDiarios) {
        const tbody = $('datos-diarios-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!datosDiarios || datosDiarios.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="7" class="no-data">No hay datos diarios disponibles</td>`;
            tbody.appendChild(tr);
            return;
        }

        datosDiarios.forEach(function(dia) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="dia-nombre">${dia.dia || '—'}</td>
                <td>${dia.sumaCobro || '—'}</td>
                <td>${dia.descuadre || '—'}</td>
                <td>${dia.abono || '—'}</td>
                <td>${dia.producto || '—'}</td>
                <td>${dia.nequisPendiente || '—'}</td>
                <td class="total-semanal">${dia.totalSemanal || '—'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    /* ============================================================
       EVENTOS
       ============================================================ */

    function inicializar() {
        // Año del pie de página
        $('year').textContent = new Date().getFullYear();

        // Cargar usuarios desde Google Sheets
        cargarUsuarios();

        // Formulario de login
        formLogin.addEventListener('submit', manejarLogin);

        // Formato automático del celular
        inputCelular.addEventListener('input', (e) => {
            const cursor = e.target.selectionStart;
            const anterior = e.target.value;
            e.target.value = formatearCelular(e.target.value);
            const diff = e.target.value.length - anterior.length;
            e.target.setSelectionRange(cursor + diff, cursor + diff);
        });

        // Limpiar error al escribir
        inputCelular.addEventListener('input', limpiarError);
        inputOtp.addEventListener('input', limpiarError);

        // Cerrar sesión
        $('btn-logout').addEventListener('click', () => {
            estado = { celularCompleto: null, trabajador: null };
            inputCelular.value = '';
            inputOtp.value = '';
            limpiarError();
            mostrarVista('login');
            mostrarToast('Sesión finalizada correctamente.', 'info');
        });

        // Prevenir edición en la tabla de datos
        document.querySelectorAll('.data-table td').forEach(celda => {
            celda.setAttribute('contenteditable', 'false');
            celda.addEventListener('contextmenu', e => e.preventDefault());
        });
    }

    document.addEventListener('DOMContentLoaded', inicializar);
})();
