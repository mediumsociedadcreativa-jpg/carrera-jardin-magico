const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ANCHO = canvas.width;    // 1600
const ALTO = canvas.height;   // 2560

// Ajustado exactamente a las zonas de tu fondo (Meta en las nubes / Salida en el pasto)
const META_Y = 360; 
const SALIDA_Y = 2200; // Un poco más arriba para que inicien perfectas sobre el pasto

let estadoJuego = "SELECCION"; 
let corredores = [];
let ganadorSecretoId = null;
let ganadorRealId = null;
let personajeElegidoId = null; 
let primerToqueActivado = false; 
let bloqueandoClics = false; 

const prefijosArchivos = ["uno", "dos", "tres"];
const imagenesSprites = {};

// Carga del Fondo Mágico (Cielo, nubes-flores y pasto)
let imgFondo = new Image();
imgFondo.src = "imagenes/fondo.webp";

// Imagen del botón
let imgBotonJugar = new Image();
imgBotonJugar.src = "imagenes/boton_jugar.webp"; 

// --- SISTEMA DE AUDIO ---
const audioInicio = new Audio('sonidos/elige.mp3'); 
const audioVictoriaAcierto = new Audio('sonidos/ganaste.mp3');
const audioVictoriaFallo = new Audio('sonidos/casi_ganas.mp3');

function reproducirSonido(audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Audio esperando interacción."));
}

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
    imgFondo.onerror = () => console.error("Falta: imagenes/fondo.webp");

    prefijosArchivos.forEach(prefijo => {
        imagenesSprites[prefijo] = {};
        acciones.forEach(accion => {
            const img = new Image();
            img.src = `imagenes/${prefijo}_${accion}.webp`; 
            img.onload = verificarCarga;
            img.onerror = () => console.error(`Falta: imagenes/${prefijo}_${accion}.webp`);
            imagenesSprites[prefijo][accion] = img;
        });
    });
}

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
            y: SALIDA_Y + 120, // Posición ideal de exhibición en el pasto
            anchoCuadro: 256,  // Tamaño óptimo para ver detalles de caras y alas
            altoCuadro: 256,   
            estado: "ESPERANDO",
            tiempoEnEstado: 0,
            velocidadBase: 7.5 + Math.random() * 1.5, 
            velocidadActual: 0,
            esGanadorAsignado: false,
            anguloBucle: 0,
            fotogramaActual: 0,
            tiempoAnimacion: 0,
            velocidadAnimacion: 0.10, // Un aleteo ligeramente más rápido y mágico
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
    
    // Al acercarse a las nubes-flores de la meta, se concentran en llegar
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
    if (rand < 0.45) {
        corredor.estado = "NORMAL";
    } else if (rand < 0.70) {
        corredor.estado = "BUCLE"; // Giros mágicos en el cielo
        corredor.anguloBucle = 0;
    } else if (rand < 0.88) {
        corredor.estado = "FUERA_DE_MARCO";
    } else {
        corredor.estado = "DESPISTE";
    }
}

function aplicarDramaYFrenos() {
    if (estadoJuego !== "CARRERA") return;

    let lider = corredores[0];
    for (let c of corredores) {
        if (c.y < lider.y) lider = c;
    }

    for (let c of corredores) {
        if (c.id === lider.id && !c.esGanadorAsignado && c.y < 1600) {
            c.velocidadActual = c.velocidadBase * 0.58; 
        } 
        else if (c.esGanadorAsignado && (c.y - lider.y > 250)) {
            c.velocidadActual = c.velocidadBase * 1.95; 
        } 
        else {
            c.velocidadActual = c.velocidadBase;
        }

        // Impulso final mágico hacia las flores
        if (c.esGanadorAsignado && c.y < 900) {
            c.velocidadActual = c.velocidadBase * 2.3;
        }
    }
}

function actualizarFisica(c, dt) {
    c.tiempoAnimacion += dt;
    if (c.tiempoAnimacion >= c.velocidadAnimacion) {
        c.tiempoAnimacion = 0;
        c.fotogramaActual = (c.fotogramaActual + 1) % 3; 
    }

    if (estadoJuego === "SELECCION") {
        // Efecto flotante suave sobre el pasto
        c.saltoY = Math.abs(Math.sin(Date.now() * 0.0035 + c.id * 1.5)) * -25;
        return;
    }

    if (estadoJuego !== "CARRERA") return;

    c.tiempoEnEstado += dt;

    if (c.tiempoEnEstado > 1.2 + Math.random() * 1.0) {
        cambiarEstadoAleatorio(c);
    }

    switch (c.estado) {
        case "NORMAL":
            c.y -= c.velocidadActual;
            c.x += Math.sin(Date.now() * 0.005 + c.id) * 12; // Vaiven sutil de vuelo
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

    // Límites laterales del cielo utilizable
    if (c.y < 1200) {
        const margenVisible = 180;
        if (c.x < margenVisible) c.x += 18;
        else if (c.x > ANCHO - margenVisible) c.x -= 18;
    }

    // Llegada a las nubes-flores de la meta
    if (c.y <= META_Y) {
        estadoJuego = "VICTORIA";
        ganadorRealId = c.id;
 
        audioInicio.pause();
        audioInicio.currentTime = 0;

        if (ganadorRealId === personajeElegidoId) {
            reproducirSonido(audioVictoriaAcierto);
        } else {
            reproducirSonido(audioVictoriaFallo);
        }
    }
}

function dibujarEstrella(x, y, radioExterno, radioInterno, puntas) {
    let rotacion = Math.PI / 2 * 3;
    let cx = x;
    let cy = y;
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
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#d35400';
    ctx.stroke();
    ctx.fillStyle = '#f1c40f';
    ctx.fill();
}

function dibujarCorredor(c) {
    let tipoImagen = "carrera"; 
    if (estadoJuego === "SELECCION") {
        tipoImagen = "espera";
    } else if (estadoJuego === "VICTORIA") {
        tipoImagen = (c.id === ganadorRealId) ? "victoria" : "espera";
    }

    const imagenHoja = imagenesSprites[c.prefijo][tipoImagen];
    const origenX = c.fotogramaActual * c.anchoCuadro;
    let posicionYVisual = c.y + (estadoJuego === "SELECCION" ? c.saltoY : 0);

    ctx.drawImage(
        imagenHoja,
        origenX, 0, c.anchoCuadro, c.altoCuadro, 
        c.x - c.anchoCuadro / 2, posicionYVisual - c.altoCuadro / 2, c.anchoCuadro, c.altoCuadro 
    );

    if (c.id === personajeElegidoId) {
        dibujarEstrella(c.x, posicionYVisual - 170, 45, 20, 5);
    }
}

function loop() {
    ctx.clearRect(0, 0, ANCHO, ALTO);

    // Render del fondo responsivo
    ctx.drawImage(imgFondo, 0, 0, ANCHO, ALTO);

    aplicarDramaYFrenos();
    
    corredores.forEach(c => {
        actualizarFisica(c, 0.016); 
        dibujarCorredor(c);
    });

    const btnAncho = 400;
    const btnAlto = 400;

    if (!primerToqueActivado && estadoJuego === "SELECCION") {
        ctx.drawImage(imgBotonJugar, ANCHO / 2 - btnAncho / 2, ALTO / 2 - btnAlto / 2, btnAncho, btnAlto);
    }

    if (estadoJuego === "VICTORIA") {
        ctx.drawImage(imgBotonJugar, ANCHO / 2 - btnAncho / 2, ALTO / 2 - btnAlto / 2 + 350, btnAncho, btnAlto);
    }

    requestAnimationFrame(loop);
}

canvas.addEventListener("click", (evento) => {
    const dimensionesRect = canvas.getBoundingClientRect();
    const xPresionada = (evento.clientX - dimensionesRect.left) * (ANCHO / dimensionesRect.width);
    const yPresionada = (evento.clientY - dimensionesRect.top) * (ALTO / dimensionesRect.height);

    if (estadoJuego === "SELECCION") {
        if (bloqueandoClics) return; 

        if (!primerToqueActivado) {
            primerToqueActivado = true;
            reproducirSonido(audioInicio);
            return; 
        }

        for (let c of corredores) {
            if (xPresionada >= c.x - 128 && xPresionada <= c.x + 128 &&
                yPresionada >= c.y - 128 && yPresionada <= c.y + 128) {
                
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
});

// --- LÓGICA DE CONTROL DE ACCESO ÚNICO CON 10 CÓDIGOS (NUEVO Y CORREGIDO) ---
const CODIGOS_VALIDOS = [
    "JARDIN01", "MARIPOSA02", "MAGICO03", "FLOR04", "HADASECRETA", 
    "CARRERA06", "ORUGA07", "NÉCTAR08", "ALAS09", "VICTORIA10"
];

function verificarAccesoYArrancar() {
    const usuarioRegistrado = localStorage.getItem('jardin_magico_registrado');

    if (!usuarioRegistrado) {
        pedirCodigoAcceso();
    } else {
        console.log("Usuario validado anteriormente.");
        prepararSeleccion();
        loop();
    }
}

function pedirCodigoAcceso() {
    let codigoInput = prompt("Por favor, introduce tu código de acceso para registrar tu instalación:");
    
    if (codigoInput === null || codigoInput.trim() === "") {
        alert("Código requerido para activar el juego.");
        pedirCodigoAcceso();
        return;
    }

    // Convertimos a mayúsculas para evitar problemas si escriben en minúsculas
    let codigoLimpio = codigoInput.trim().toUpperCase();

    if (CODIGOS_VALIDOS.includes(codigoLimpio)) { 
        alert("¡Código correcto! Configurando el juego para uso sin conexión...");
        localStorage.setItem('jardin_magico_registrado', 'true');
        
        prepararSeleccion();
        loop();
    } else {
        alert("Código incorrecto. Inténtalo de nuevo.");
        pedirCodigoAcceso(); 
    }
}

// Inicialización corregida (sin llaves huérfanas al final)
cargarImagenesJuego(() => {
    verificarAccesoYArrancar();
});