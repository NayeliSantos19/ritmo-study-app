// Modo inmersivo: el mismo temporizador, con menos distracciones.
const inmersivo = $('immersive-toggle');
let enfoqueAnterior;
function cambiarInmersivo(abrir) {
 if (abrir) enfoqueAnterior=document.activeElement;
 document.body.classList.toggle('immersive',abrir);
 inmersivo.textContent=abrir?'↙ Volver a mi espacio · Esc':'↗ Entrar en modo inmersivo';
 inmersivo.setAttribute('aria-pressed',String(abrir));
 if (abrir) inmersivo.focus(); else enfoqueAnterior?.focus();
}
inmersivo.onclick=()=>cambiarInmersivo(!document.body.classList.contains('immersive'));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('immersive')&&!$('modal').open)cambiarInmersivo(false);});
// La recomendación es una regla sencilla, no una predicción de IA.
document.querySelectorAll('[data-mood]').forEach(b=>{
 const elegirAnimo=b.onclick;
 b.onclick=()=>{
  elegirAnimo();
  const recomendada={suave:25,listo:45,cansado:15}[b.dataset.mood];
  const texto=` Te sugerimos ${recomendada} minutos; tú eliges.`;
  if (!activo && restante===duracion*60 && !completado) {
   document.querySelector(`[data-duration="${recomendada}"]`).click();
   $('mood-message').textContent+=` Preparé ${recomendada} minutos para ti. Puedes cambiarlos.`;
  } else $('mood-message').textContent+=texto;
 };
});
