---
name: Ritmo
description: La semana académica como espacio de planificación personal.
colors:
  background: "#f7f8fa"
  surface: "#ffffff"
  ink: "#203b52"
  muted: "#52667b"
  line: "#e3e9ef"
  primary: "#ba482c"
  primary-hover: "#9d3820"
  primary-display: "#c45134"
  sage: "#e1ece3"
  blue: "#e1edfb"
  peach: "#f6e7d9"
  focus: "#336e9d"
  action-text: "#9d3f28"
  nav-active: "#f3e9e5"
  nav-active-ink: "#973c27"
  nav-background: "#f4f6f9"
  control-hover: "#e9edf2"
  secondary-background: "#eef2f6"
  secondary-hover: "#e0e7ef"
  subject-sage: "#e0ece2"
  subject-sage-stripe: "#58835e"
  subject-blue: "#deebfb"
  subject-blue-stripe: "#4778a7"
  subject-peach: "#f6e6d8"
  subject-peach-stripe: "#a56840"
  subject-lavender: "#ebe6f4"
  subject-lavender-stripe: "#78649b"
  event-ink: "#193e32"
  completed-background: "#edf0f3"
  completed-ink: "#4c6172"
  completed-stripe: "#91a1ad"
  progress-track: "#e9edf1"
  progress-fill: "#729c77"
  next-session: "#f0f5f1"
  next-session-ink: "#415d70"
  calendar-header: "#fcfdfe"
  calendar-grid: "#edf0f4"
  calendar-hover: "#f0f5f8"
  hour-label: "#596f85"
  table-background: "#f0f3f7"
  table-ink: "#40576c"
  field-border: "#b5c2ce"
  placeholder: "#617286"
  danger: "#a52e27"
  notice-background: "#f9e9de"
  notice-ink: "#873718"
  duration-background: "#faf0eb"
  duration-ink: "#943e27"
  duration-border: "#ae5037"
typography:
  display:
    fontFamily: "Martel Sans, Source Sans, Segoe UI, sans-serif"
    fontSize: "clamp(27px, 2.5vw, 38px)"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Source Sans, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  brand:
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.04em"
  headline:
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.3
  subtitle:
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.3
  section-title:
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  card-title:
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.4
  small-title:
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.4
  focus-action:
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.35
  summary:
    fontSize: "15px"
    lineHeight: 1.5
  label:
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
  metadata:
    fontSize: "13px"
    lineHeight: 1.5
  event:
    fontSize: "12px"
    lineHeight: 1.25
  caption:
    fontSize: "11px"
    lineHeight: 1.5
  mobile-hour:
    fontSize: "10px"
    lineHeight: 1.5
  timer:
    fontSize: "56px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  immersive-timer:
    fontSize: "clamp(75px, 14vw, 125px)"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
rounded:
  event: "4px"
  chip: "5px"
  field: "6px"
  control: "7px"
  progress: "8px"
  panel: "9px"
  dialog: "14px"
  dot: "50%"
spacing:
  micro: "4px"
  tight: "6px"
  small: "8px"
  compact: "10px"
  control: "12px"
  medium: "16px"
  card: "18px"
  section: "20px"
  large: "24px"
  dialog: "26px"
  wide: "28px"
  roomy: "32px"
  immersive: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-display:
    backgroundColor: "{colors.primary-display}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
  button-secondary:
    backgroundColor: "{colors.secondary-background}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-text:
    textColor: "{colors.action-text}"
    padding: "8px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  nav-active:
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.nav-active-ink}"
    rounded: "{rounded.field}"
    padding: "13px 18px"
  duration-selected:
    backgroundColor: "{colors.duration-background}"
    textColor: "{colors.duration-ink}"
    rounded: "{rounded.chip}"
    padding: "5px 8px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "18px 16px"
  event:
    backgroundColor: "{colors.subject-sage}"
    textColor: "{colors.event-ink}"
    rounded: "{rounded.event}"
    padding: "5px 7px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System: Ritmo

## Overview

**Creative North Star: "El horario académico personal"**

Una superficie clara y precisa para planificar el estudio. El texto petrol organiza la lectura, la terracota señala acciones y los colores suaves identifican materias sin competir con sus nombres. La retícula, las líneas finas y la tipografía compacta hacen legible una herramienta de uso diario.

La identidad se apoya en herramientas nativas, iconos SVG de trazo y una interfaz en español. El horario aprobado informa el lenguaje visual; su composición específica pertenece a la ficha de superficie, no a todas las pantallas.

**Key Characteristics:**
- Superficies claras con bordes finos.
- Jerarquía compacta y datos legibles.
- Color de materia acompañado por texto.
- Movimiento breve con alternativa reducida.

## Colors

El campo frío, el texto petrol y la acción terracota conviven con materias en tonos suaves. El frontmatter registra los valores normativos.

### Primary
- **Terracota de acción:** botones principales, con hover más oscuro.
- **Terracota de exhibición:** cabecera y temporizador en escritorio amplio, con etiqueta blanca.
- **Terracota de enlace y selección:** enlaces discretos, navegación activa y duración elegida.

### Secondary
- **Salvia, azul, melocotón y lavanda de materia:** parejas reales de fondo y trazo del catálogo JavaScript. Los fondos CSS salvia, azul y melocotón conservan sus valores de reserva, distintos de las parejas generadas.
- **Verde de progreso:** relleno de barra; próxima sesión usa una salvia más clara.

### Neutral
- **Papel frío y blanco:** fondo general y paneles.
- **Petrol y gris azulado:** texto principal y secundario, con variantes para tablas, horarios y sesiones completadas.
- **Líneas frías:** límites de panel y retícula horaria.
- **Azul de foco y rojo de error:** estados funcionales separados de la identificación por materia.

**The Text With Color Rule.** El color de materia o estado siempre acompaña una etiqueta comprensible.

## Typography

**Display Font:** Martel Sans, con Source Sans y sans-serif de reserva.
**Body Font:** Source Sans, con Segoe UI y sans-serif de reserva.

Ambas familias están alojadas en el proyecto. Martel Sans aporta peso al título y la marca; Source Sans sostiene controles, datos y lectura.

### Hierarchy
- **Display:** título adaptable y marca de tamaño independiente.
- **Headline / title:** diálogos, secciones y tarjetas usan los escalones reales de 24 a 18px.
- **Body:** lectura base; introducciones limitadas a 65ch y páginas públicas a 70ch.
- **Label / metadata / caption:** escalones compactos para formularios, tablas y calendario.
- **Timer:** cifras tabulares; la vista inmersiva amplía la misma jerarquía.

Los escalones son roles observados, no una escala geométrica obligatoria. En móvil el título principal pasa a 27px y la marca a 28px; el temporizador inmersivo usa 90px.

## Layout

Navegación lateral adaptable entre 185 y 237px. Contenido con máximo de 1900px y márgenes compactos. La superficie semanal combina área flexible y panel de 264px; desde 1600px este llega a 280px y hasta 1300px baja a 235px.

Hasta 1000px el panel se coloca debajo. Hasta 700px la navegación pasa arriba y los bloques se apilan. El calendario mantiene desplazamiento interno: mínimo de 670px en escritorio y 720px en móvil. Las tablas estrechas también tienen scroll propio.

La retícula semanal tiene siete días y eje horario. La hora ocupa 46px, escala con el viewport en escritorio amplio y pasa a 50px en móvil. Los espacios del frontmatter se combinan según densidad, sin imponer una cuadrícula artificial.

## Elevation & Depth

Paneles planos con bordes finos y capas tonales. Elevación reservada a sesiones bajo el puntero, diálogos y notificaciones; las sombras exactas viven en el sidecar. El fondo del diálogo oscurece la vista sin cristal.

**The Quiet Surface Rule.** Mantener los contenedores ordinarios planos; reservar la sombra a interacción y superposición.

El cambio de semana usa recorte lateral y opacidad durante 280ms; las sesiones transicionan su sombra durante 180ms. Movimiento reducido elimina animaciones y transiciones y desactiva desplazamiento suave.

## Shapes

Esquinas pequeñas y claras: eventos, duración, campos, botones y paneles tienen radios propios. Diálogos más suaves e indicadores de materia circulares. No generalizar un radio único. Los iconos SVG usan trazo de 1.75, extremos y uniones redondos, normalmente en un cuadro de 22px.

## Components

### Buttons
Controles firmes y compactos. Primario terracota con texto blanco, secundario gris frío con texto petrol y enlace subrayado. Relleno primario de 12px por 20px y altura mínima de 46px, adaptados por contexto. Botones de icono transparentes con hover tonal. Foco general: contorno azul de 3px separado 4px; deshabilitado con opacidad 0.6.

### Chips
Duraciones: botones con borde; selección con fondo terracota claro, texto y borde propios. Etiquetas de materia: nombre y punto circular.

### Cards / Containers
Panel blanco, borde fino y esquina de panel; enfoque con relleno de 18px por 16px. Próxima sesión con fondo salvia claro. Resúmenes, tablas y calendario comparten familia con densidad específica.

### Inputs / Fields
Fondo blanco, borde azul grisáceo, esquina de campo, relleno de 10px por 12px y altura mínima de 44px. Etiquetas visibles, placeholder secundario y errores rojos. Foco general. Diálogos conservan tareas de edición.

### Navigation
Enlaces petrol con icono de trazo. Hover gris frío; página activa terracota pálida con texto más oscuro y peso 600. Fila superior compacta en móvil.

### Session Tile
Botón con materia, duración y estado, trazo lateral de color, esquina pequeña y truncamiento dentro de la celda. Completadas grises con estado escrito; solapadas comparten ancho por carriles. Nombre accesible con fecha y hora.

## Do's and Don'ts

### Do:
- Do conservar el texto petrol y las superficies claras.
- Do acompañar colores de materia y estados con etiquetas legibles.
- Do conservar foco visible y respetar movimiento reducido.
- Do mantener el desplazamiento de calendarios y tablas dentro de sus contenedores.

### Don't:
- Don't reintroducir el orbe, los gradientes ni el mundo violeta anterior.
- Don't convertir texto ni controles en imágenes.
- Don't presentar datos ilustrativos como actividad personal.
