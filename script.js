const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ANCHO = canvas.width;    // 1600
const ALTO = canvas.height;   // 2560

// --- ZONAS DE JUEGO ---
const META_Y = 360; 
const SALIDA_Y = 2200; 

// --- NUEVOS CÓDIGOS NUMÉRICOS (4 DÍGITOS) ---
const CODIGOS_VALIDOS = [
    "1234", "5566", "7890", "2024", "9999", 
    "1111", "4321", "0000", "8888", "1357"
];

// --- ESTADOS Y VARIABLES ---
let estadoJuego = "BLOQUEADO"; // Nuevo estado inicial
let corredores = [];
let ganadorSecretoId = null;
let ganadorRealId = null;
let personajeElegidoId = null; 
let primerToqueActivado = false; 
let bloqueandoClics = false; 

const prefijosArchivos = ["uno", "dos", "tres"];
const imagenesSprites = {};

// --- VARIABLES SISTEMA DE ACTIVACIÓN ---
let codigoIntroducido = "";
let mensajeActivacion = "Teclee el código para activar el juego";
let colorMensaje = "#f1c40f"; // Amarillo
let botonesTeclado = [];
let mariposasFondoActivacion = [];

// --- CARGA DE ASSETS ---
let imgFondo = new Image();
imgFondo.src = "imagenes/fondo.webp";

let imgBotonJugar = new Image();
imgBotonJugar.src = "imagenes/boton_jugar.webp"; 

const audioInicio = new Audio('sonidos/elige.mp3'); 
audioInicio.preload = "auto";
const audioVictoriaAcierto = new Audio('sonidos/ganaste.mp3');
audioVictoriaAcierto.preload = "auto";
const audioVictoriaFallo = new Audio('sonidos/casi_ganas.mp3');
audioVictoriaFallo.preload = "auto";

// Reproducción segura de audio
function reproducirSonido(audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Audio esperando interacción."));
}

// Carga inicial de imágenes
function cargarImagenesJuego(alTerminar) {
    const acciones = ["espera", "carrera", "victoria"];
    let totalImagenes = (prefijosArchivos.length * acciones.length) + 1; 
    let imagenesCargadas = 0;

    function verificarCarga() {
        imagenesCargadas++;
        if (imagenesCargadas === totalImagenes) {
            alTerminar();
        }
    }

    imgFondo.onload = verificarCarga;
    imgFondo.onerror = () => { console.error("Falta fondo. Usando color."); verificarCarga(); };

    prefijosArchivos.forEach(prefijo => {
        imagenesSprites[prefijo] = {};
        acciones.forEach(accion => {
            const img = new Image();
            img.src = `imagenes/${prefijo}_${accion}.webp`; 
            img.onload = verificarCarga;
            img.onerror = () => { console.error(`Falta: ${prefijo}_${accion}`); verificarCarga(); };
            imagenesSprites[prefijo][accion] = img;
        });
    });
}

// --- LÓGICA SISTEMA DE ACTIVACIÓN (NUEVO) ---

function inicializarPantallaActivacion() {
    estadoJuego = "BLOQUEADO";
    codigoIntroducido = "";
    mensajeActivacion = "Teclee el código para activar el juego";
    colorMensaje = "#f1c40f"; // Amarillo original
    
    // Crear botones del teclado numérico
    const startX = ANCHO / 2 - 350;
    const startY = ALTO / 2 + 100;
    const gap = 40;
    const btnSize = 200;

    botonesTeclado = [];
    
    // Botones 1-9
    for (let i = 0; i < 9; i++) {
        botonesTeclado.push({
            txt: (i + 1).toString(),
            x: startX + (i % 3) * (btnSize + gap),
            y: startY + Math.floor(i / 3) * (btnSize + gap),
            w: btnSize,
            h: btnSize
        });
    }
    // Botón 0 (centrado abajo)
    botonesTeclado.push({
        txt: "0",
        x: startX + (1) * (btnSize + gap),
        y: startY + 3 * (btnSize + gap),
        w: btnSize,
        h: btnSize
    });
    // Botón Borrar (X)
    botonesTeclado.push({
        txt: "X",
        x: startX + (2) * (btnSize + gap),
        y: startY + 3 * (btnSize + gap),
        w: btnSize,
        h: btnSize,
        accion: "BORRAR"
    });

    // Crear mariposas decorativas de fondo
    mariposasFondoActivacion = [];
    for(let i=0; i<6; i++) {
        mariposasFondoActivacion.push({
            id: Math.floor(Math.random()*3),
            x: Math.random() * ANCHO,
            y: Math.random() * ALTO,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            f: 0,
            tf: 0
        });
    }
}

function dibujarPantallaActivacion() {
    // Fondo Negro absoluto
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, ANCHO, ALTO);

    // Dibujar mariposas de fondo difuminadas
    ctx.globalAlpha = 0.3; // Muy sutiles
    mariposasFondoActivacion.forEach(m => {
        // Actualizar posición sutil
        m.x += m.vx; m.y += m.vy;
        if(m.x < 0 || m.x > ANCHO) m.vx *= -1;
        if(m.y < 0 || m.y > ALTO) m.vy *= -1;
        
        // Animación fotogramas
        m.tf += 0.016;
        if(m.tf > 0.15) { m.tf = 0; m.f = (m.f + 1) % 3; }

        const prefijo = prefijosArchivos[m.id];
        const img = imagenesSprites[prefijo]["espera"];
        if(img && img.complete) {
            ctx.drawImage(img, m.f * 256, 0, 256, 256, m.x - 128, m.y - 128, 256, 256);
        }
    });
    ctx.globalAlpha = 1.0; // Reset opacidad

    // Título / Mensaje
    ctx.fillStyle = colorMensaje;
    ctx.font = "bold 70px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(mensajeActivacion, ANCHO / 2, ALTO / 2 - 400);

    // Visualización del código (puntos o números)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 120px 'Courier New', monospace";
    let displayCod = "";
    for(let i=0; i<4; i++) {
        displayCod += (codigoIntroducido.length > i) ? codigoIntroducido[i] : "_";
        displayCod += " ";
    }
    ctx.fillText(displayCod.trim(), ANCHO / 2, ALTO / 2 - 150);

    // Dibujar Teclado Visual
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    botonesTeclado.forEach(btn => {
        // Estilo botón (Borde amarillo, fondo negro)
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 6;
        ctx.fillStyle = "#111111"; // Fondo ligeramente gris para efecto presión
        
        // Esquinas redondeadas sutiles
        roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 20, true, true);

        // Texto del botón
        ctx.fillStyle = (btn.accion === "BORRAR") ? "#e74c3c" : "#f1c40f"; // Rojo si es borrar
        ctx.font = "bold 90px 'Courier New', monospace";
        ctx.fillText(btn.txt, btn.x + btn.w / 2, btn.y + btn.h / 2 + 10);
    });
    ctx.textBaseline = "alphabetic"; // Reset
}

function procesarClickActivacion(x, y) {
    for (let btn of botonesTeclado) {
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            
            // Feedback visual rápido (opcional, necesitaría redibujar)
            
            if (btn.accion === "BORRAR") {
                codigoIntroducido = codigoIntroducido.slice(0, -1);
            } else if (codigoIntroducido.length < 4) {
                codigoIntroducido += btn.txt;
            }

            // Comprobar si se ha completado el código
            if (codigoIntroducido.length === 4) {
                verificarCodigo();
            }
            break; // Click procesado
        }
    }
}

function verificarCodigo() {
    if (CODIGOS_VALIDOS.includes(codigoIntroducido)) {
        // ÉXITO
        mensajeActivacion = "¡CÓDIGO CORRECTO!";
        colorMensaje = "#2ecc71"; // Verde
        localStorage.setItem('jardin_magico_registrado', 'true');
        
        // Pequeña pausa para mostrar el éxito antes de iniciar
        setTimeout(() => {
            prepararSeleccion();
        }, 800);
    } else {
        // FALLO
        mensajeActivacion = "CÓDIGO INCORRECTO. REINTENTE.";
        colorMensaje = "#e74c3c"; // Rojo
        codigoIntroducido = ""; // Reset código
        
        // Volver al amarillo después de 1.5s
        setTimeout(() => {
            if(estadoJuego === "BLOQUEADO") {
                mensajeActivacion = "Teclee el código para activar el juego";
                colorMensaje = "#f1c40f";
            }
        }, 1500);
    }
}

// Helper para dibujar rectángulos redondeados
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === 'undefined') radius = 5;
    if (typeof radius === 'number') radius = {tl: radius, tr: radius, br: radius, bl: radius};
    else {
        var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (var side in defaultRadius) radius[side] = radius[side] || defaultRadius[side];
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}


// --- LÓGICA DE JUEGO ORIGINAL (ADAPTADA) ---

function prepararSeleccion() {
    estadoJuego = "SELECCION";
    ganadorRealId = null;
    personajeElegidoId = null; 
    bloqueandoClics = false; 
    corredores = [];
    
    for (let i = 0; i < 3; i++) {
        corredores.push({
            id: i,
            prefijo: prefijosArchivos[i],
            x: 300 + (i * 500), 
            y: SALIDA_Y + 120,
            anchoCuadro: 256,   
            altoCuadro: 256,   
            estado: "ESPERANDO",
            tiempoEnEstado: 0,
            velocidadBase: 7.5 + Math.random() * 1.5, 
            velocidadActual: 0,
            esGanadorAsignado: false,
            anguloBucle: 0,
            fotogramaActual: 0,
            tiempoAnimacion: 0,
            velocidadAnimacion: 0.10,
            saltoY: 0 
        });
    }
}

function iniciarCarrera(idElegido) {
    personajeElegidoId = idElegido;
    estadoJuego = "CARRERA";
    ganadorSecretoId = Math.floor(Math.random() * 3);

    corredores.forEach(c => {
        c.estado = "NORMAL";
        c.y = SALIDA_Y; 
        c.tiempoEnEstado = 0;
        c.esGanadorAsignado = (c.id === ganadorSecretoId);
    });
}

function cambiarEstadoAleatorio(corredor) {
    corredor.tiempoEnEstado = 0;
    
    if (corredor.y < 900) {
        if (corredor.esGanadorAsignado) {
            corredor.estado = "NORMAL";
            return;
        } else {
            corredor.estado = Math.random() < 0.5 ? "BUCLE" : "DESPISTE"; 
            return;
        }
    }

    const rand = Math.random();
    if (rand < 0.45) corredor.estado = "NORMAL";
    else if (rand < 0.70) { corredor.estado = "BUCLE"; corredor.anguloBucle = 0; }
    else if (rand < 0.88) corredor.estado = "FUERA_DE_MARCO";
    else corredor.estado = "DESPISTE";
}

function aplicarDramaYFrenos() {
    if (estadoJuego !== "CARRERA") return;

    let lider = corredores[0];
    for (let c of corredores) { if (c.y < lider.y) lider = c; }

    for (let c of corredores) {
        if (c.id === lider.id && !c.esGanadorAsignado && c.y < 1600) {
            c.velocidadActual = c.velocidadBase * 0.58; 
        } 
        else if (c.esGanadorAsignado && (c.y - lider.y > 250)) {
            c.velocidadActual = c.velocidadBase * 1.95; 
        } 
        else c.velocidadActual = c.velocidadBase;

        if (c.esGanadorAsignado && c.y < 900) c.velocidadActual = c.velocidadBase * 2.3;
    }
}

function actualizarFisica(c, dt) {
    c.tiempoAnimacion += dt;
    if (c.tiempoAnimacion >= c.velocidadAnimacion) {
        c.tiempoAnimacion = 0;
        c.fotogramaActual = (c.fotogramaActual + 1) % 3; 
    }

    if (estadoJuego === "SELECCION") {
        c.saltoY = Math.abs(Math.sin(Date.now() * 0.0035 + c.id * 1.5)) * -25;
        return;
    }

    if (estadoJuego !== "CARRERA") return;

    c.tiempoEnEstado += dt;
    if (c.tiempoEnEstado > 1.2 + Math.random() * 1.0) cambiarEstadoAleatorio(c);

    switch (c.estado) {
        case "NORMAL":
            c.y -= c.velocidadActual;
            c.x += Math.sin(Date.now() * 0.005 + c.id) * 12;
            break;
        case "BUCLE":
            c.anguloBucle += 0.20;
            c.y -= c.velocidadActual * 0.12;
            c.x += Math.sin(c.anguloBucle) * 20; 
            break;
        case "DESPISTE":
            c.x += (Math.random() - 0.5) * 10;
            break;
        case "FUERA_DE_MARCO":
            if (c.tiempoEnEstado < 0.8) {
                c.x += c.id === 0 ? -30 : 30; 
                c.y -= c.velocidadActual * 0.3;
            } else {
                c.x += c.id === 0 ? 46 : -46; 
                c.y -= c.velocidadActual * 2.5; 
                if (c.x > 150 && c.x < ANCHO - 150) {
                    c.estado = "NORMAL";
                    c.tiempoEnEstado = 0;
                }
            }
            break;
    }

    // Límites
    if (c.y < 1200) {
        const margenVisible = 180;
        if (c.x < margenVisible) c.x += 18;
        else if (c.x > ANCHO - margenVisible) c.x -= 18;
    }

    // Meta
    if (c.y <= META_Y) {
        estadoJuego = "VICTORIA";
        ganadorRealId = c.id;
        audioInicio.pause();
        audioInicio.currentTime = 0;
        if (ganadorRealId === personajeElegidoId) reproducirSonido(audioVictoriaAcierto);
        else reproducirSonido(audioVictoriaFallo);
    }
}

function dibujarEstrella(x, y, radioExterno, radioInterno, puntas) {
    let rotacion = Math.PI / 2 * 3;
    let cx = x; let cy = y;
    let paso = Math.PI / puntas;
    ctx.beginPath();
    ctx.moveTo(cx, cy - radioExterno);
    for (let i = 0; i < puntas; i++) {
        x = cx + Math.cos(rotacion) * radioExterno;
        y = cy + Math.sin(rotacion) * radioExterno;
        ctx.lineTo(x, y);
        rotacion += paso;
        x = cx + Math.cos(rotacion) * radioInterno;
        y = cy + Math.sin(rotacion) * radioInterno;
        ctx.lineTo(x, y);
        rotacion += paso;
    }
    ctx.lineTo(cx, cy - radioExterno);
    ctx.closePath();
    ctx.lineWidth = 10; ctx.strokeStyle = '#d35400'; ctx.stroke();
    ctx.fillStyle = '#f1c40f'; ctx.fill();
}

function dibujarCorredor(c) {
    let tipoImagen = "carrera"; 
    if (estadoJuego === "SELECCION") tipoImagen = "espera";
    else if (estadoJuego === "VICTORIA") tipoImagen = (c.id === ganadorRealId) ? "victoria" : "espera";

    const imagenHoja = imagenesSprites[c.prefijo][tipoImagen];
    if(!imagenHoja || !imagenHoja.complete) return; // Seguridad

    const origenX = c.fotogramaActual * c.anchoCuadro;
    let posicionYVisual = c.y + (estadoJuego === "SELECCION" ? c.saltoY : 0);

    ctx.drawImage(
        imagenHoja,
        origenX, 0, c.anchoCuadro, c.altoCuadro, 
        c.x - c.anchoCuadro / 2, posicionYVisual - c.altoCuadro / 2, c.anchoCuadro, c.altoCuadro 
    );

    if (estadoJuego !== "BLOQUEADO" && c.id === personajeElegidoId) {
        dibujarEstrella(c.x, posicionYVisual - 170, 45, 20, 5);
    }
}

// --- LOOP PRINCIPAL ---
function loop() {
    ctx.clearRect(0, 0, ANCHO, ALTO);

    if (estadoJuego === "BLOQUEADO") {
        dibujarPantallaActivacion();
    } else {
        // Render Juego Normal
        if(imgFondo.complete) ctx.drawImage(imgFondo, 0, 0, ANCHO, ALTO);
        else { ctx.fillStyle = "#c0e5f4"; ctx.fillRect(0,0,ANCHO, ALTO); } // Fondo emergencia

        aplicarDramaYFrenos();
        
        corredores.forEach(c => {
            actualizarFisica(c, 0.016); 
            dibujarCorredor(c);
        });

        const btnAncho = 400;
        const btnAlto = 400;

        if (!primerToqueActivado && estadoJuego === "SELECCION") {
            if(imgBotonJugar.complete) ctx.drawImage(imgBotonJugar, ANCHO / 2 - btnAncho / 2, ALTO / 2 - btnAlto / 2, btnAncho, btnAlto);
        }

        if (estadoJuego === "VICTORIA") {
            if(imgBotonJugar.complete) ctx.drawImage(imgBotonJugar, ANCHO / 2 - btnAncho / 2, ALTO / 2 - btnAlto / 2 + 350, btnAncho, btnAlto);
        }
    }

    requestAnimationFrame(loop);
}

// --- MANEJO DE ENTRADA (TOUCH/MOUSE) ADAPTADO ---
canvas.addEventListener("click", manejaInteraccion);
// Soporte touch explícito para mejor respuesta en móviles
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault(); // Previene comportamiento default del navegador
    const touch = e.touches[0];
    manejaInteraccion(touch);
}, {passive: false});

function manejaInteraccion(evento) {
    const dimensionesRect = canvas.getBoundingClientRect();
    const escalaX = ANCHO / dimensionesRect.width;
    const escalaY = ALTO / dimensionesRect.height;
    
    const xPresionada = (evento.clientX - dimensionesRect.left) * escalaX;
    const yPresionada = (evento.clientY - dimensionesRect.top) * escalaY;

    if (estadoJuego === "BLOQUEADO") {
        procesarClickActivacion(xPresionada, yPresionada);
        return;
    }

    if (estadoJuego === "SELECCION") {
        if (bloqueandoClics) return; 

        if (!primerToqueActivado) {
            primerToqueActivado = true;
            reproducirSonido(audioInicio);
            return; 
        }

        for (let c of corredores) {
            // Check box de selección un poco más grande para facilitar toque
            if (xPresionada >= c.x - 200 && xPresionada <= c.x + 200 &&
                yPresionada >= c.y - 200 && yPresionada <= c.y + 200) {
                
                bloqueandoClics = true; 
                personajeElegidoId = c.id; 
                
                setTimeout(() => {
                    audioInicio.pause();
                    audioInicio.currentTime = 0;
                    iniciarCarrera(c.id);
                }, 550); 
                
                break;
            }
        }

    } else if (estadoJuego === "VICTORIA") {
        const btnAncho = 400;
        const btnAlto = 400;
        const btnX = ANCHO / 2 - btnAncho / 2;
        const btnY = ALTO / 2 - btnAlto / 2 + 350; 

        if (xPresionada >= btnX && xPresionada <= btnX + btnAncho &&
            yPresionada >= btnY && yPresionada <= btnY + btnAlto) {
            
            audioVictoriaAcierto.pause();
            audioVictoriaFallo.pause();
            prepararSeleccion(); 
            reproducirSonido(audioInicio);
        }
    }
}

// --- ARRANQUE ---
function verificarAccesoYArrancar() {
    const usuarioRegistrado = localStorage.getItem('jardin_magico_registrado');

    if (!usuarioRegistrado) {
        inicializarPantallaActivacion(); // Estado BLOQUEADO
    } else {
        console.log("Usuario validado.");
        prepararSeleccion(); // Estado SELECCION
    }
    loop(); // Arrancar loop siempre
}

// Arrancar proceso al cargar assets
cargarImagenesJuego(() => {
    verificarAccesoYArrancar();
});