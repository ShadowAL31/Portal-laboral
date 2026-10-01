/**
 * ============================================================
 * PORTAL LABORAL — Lógica de la aplicación (v4 - Local)
 * ============================================================
 * Autenticación simplificada usando un archivo JSON local.
 *
 * Flujo:
 *   1. El trabajador selecciona el prefijo de país.
 *   2. Ingresa su número de celular (sin prefijo).
 *   3. Ingresa el Código de Verificación (OTP).
 *   4. El sistema lee 'js/usuarios.json' y valida:
 *      a) Busca "codigoPais" + "celular" = celular completo.
 *      b) Si NO existe → "Número no registrado o código de verificación incorrecto".
 *      c) Si existe → verifica "codigoVerificacion".
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

    /**
     * Carga los usuarios desde el archivo JSON local.
     * Debe llamarse al inicializar la aplicación.
     */
    async function cargarUsuarios() {
        try {
            const respuesta = await fetch('usuarios.json');

            if (!respuesta.ok) {
                throw new Error(`Error HTTP: ${respuesta.status}`);
            }

            usuarios = await respuesta.json();
            console.log(`[Auth] ${usuarios.length} usuarios cargados desde usuarios.json`);
        } catch (error) {
            console.error('[Auth] Error al cargar usuarios.json:', error);
            mostrarError('Error al cargar la base de datos de usuarios. Verifique que el archivo js/usuarios.json exista.');
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
        $('data-suma-cobro').textContent = t.sumaCobro || '—';
        $('data-descuadre').textContent = t.descuadre || '—';
        $('data-abono').textContent = t.abono || '—';
        $('data-producto').textContent = t.producto || '—';
        $('data-nequis').textContent = t.nequisPendiente || '—';

        // Estatus con insignia de color
        const estatusEl = $('data-estatus');
        const etiquetas = { activo: 'Activo', inactivo: 'Inactivo', licencia: 'Licencia' };
        estatusEl.className = `status-badge ${t.estatus || ''}`;
        estatusEl.innerHTML = `<span class="status-dot"></span>${etiquetas[t.estatus] || t.estatus || '—'}`;

        mostrarVista('data');
    }

    /* ============================================================
       EVENTOS
       ============================================================ */

    function inicializar() {
        // Año del pie de página
        $('year').textContent = new Date().getFullYear();

        // Cargar usuarios desde JSON local
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
