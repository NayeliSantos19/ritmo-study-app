// El reloj usa una hora límite para seguir contando aunque la pestaña esté en segundo plano.
let duracion = 25, restante = duracion * 60, limite = 0, activo = false, completado = false;
const focusCard = document.querySelector('.focus');
const moods = {
 suave: ['Encuentra tu punto de enfoque.', 'Una sola tarea. Un ritmo que puedas mantener.'],
 listo: ['Transforma tu energía en progreso.', 'Tienes impulso. Elige algo que te dé curiosidad.'],
 cansado: ['Hoy, un pequeño paso es suficiente.', 'Baja la intensidad. Tu progreso también puede ser suave.']
};
function reloj() {
 if (activo) restante = Math.max(0, Math.ceil((limite-Date.now())/1000));
 $('timer').textContent = `${String(Math.floor(restante/60)).padStart(2,'0')}:${String(restante%60).padStart(2,'0')}`;
 document.title = activo ? `${$('timer').textContent} · Tu ratito de enfoque` : 'Ritmo · Tu espacio de estudio';
 if (activo && restante === 0) {
  activo = false; completado = true; focusCard.classList.remove('running');
  $('timer-start').textContent = '↻ Otra sesión'; $('timer-save').hidden = false;
  $('focus-message').textContent = 'Lo hiciste. Respira, estírate y reconoce este pequeño logro.';
  avisar('¡Qué bien! Tu ratito de enfoque está completo.'); celebrar();
 }
}
function reiniciar() {
 activo = false; completado = false; restante = duracion*60;
 focusCard.classList.remove('running'); $('timer-start').textContent='▶ Empezar';
 $('timer-save').hidden=true; $('focus-message').textContent='Elige un ratito. El primer paso puede ser pequeño.'; reloj();
}
document.querySelectorAll('[data-duration]').forEach(b => b.onclick=()=>{
 if ((activo || restante < duracion*60) && !completado && !confirm('¿Cambiar la duración y reiniciar este temporizador?')) return;
 duracion=Number(b.dataset.duration); document.querySelectorAll('[data-duration]').forEach(x=>{const selected=x===b;x.classList.toggle('selected',selected);x.setAttribute('aria-pressed',String(selected));}); reiniciar();
});
$('timer-start').onclick=()=>{
 if (activo) { restante=Math.max(0,Math.ceil((limite-Date.now())/1000)); activo=false;focusCard.classList.remove('running');$('timer-start').textContent='▶ Continuar';$('focus-message').textContent='Tómate un respiro. Seguimos cuando quieras.'; }
 else { if (completado) reiniciar();limite=Date.now()+restante*1000;activo=true;focusCard.classList.add('running');$('timer-start').textContent='Ⅱ Pausar';$('focus-message').textContent='Una pestaña menos. Una idea a la vez. Este momento es tuyo.'; }
 reloj();
};
$('timer-reset').onclick=()=>{if((activo||restante<duracion*60)&&!completado&&!confirm('¿Reiniciar tu temporizador?'))return;reiniciar();};
$('timer-save').onclick=()=>{if(!completado)return;$('nueva').click();$('minutos').value=duracion;$('notas').value='Completé un ratito de enfoque con Ritmo.';};
document.querySelectorAll('[data-mood]').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('[data-mood]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});
 const mensaje=moods[b.dataset.mood];$('saludo').textContent=mensaje[0];$('mood-message').textContent=mensaje[1];
});
function celebrar() {
 if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
 const capa=document.createElement('div');capa.className='celebration';capa.setAttribute('aria-hidden','true');
 for(let i=0;i<28;i++){const pieza=document.createElement('span');pieza.className='confetti';pieza.style.setProperty('--x',`${Math.random()*100}%`);pieza.style.setProperty('--delay',`${Math.random()*.5}s`);pieza.style.setProperty('--color',['#bb8861','#c8b36f','#91a47b','#e6ba9b'][i%4]);capa.append(pieza);}
 document.body.append(capa);setTimeout(()=>capa.remove(),3000);
}
const registrarSesion=$('formulario').onsubmit;
$('formulario').onsubmit=e=>{const antes=estado.sesiones.length;registrarSesion(e);if(estado.sesiones.length>antes){celebrar();if(completado)reiniciar();}};
setInterval(reloj,250);document.addEventListener('visibilitychange',reloj);reloj();
