// Estado: las sesiones y la meta se guardan únicamente en este navegador.
const $ = id => document.getElementById(id);
const key = 'ritmo-v1';
let estado = { sesiones: [], meta: 300 };
try { const guardado = JSON.parse(localStorage.getItem(key)); if (guardado && Array.isArray(guardado.sesiones) && Number(guardado.meta)>0) estado = guardado; } catch { /* Un almacenamiento vacío no impide usar la app. */ }
const fechaLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function avisar(texto) { $('aviso').textContent=texto; $('aviso').style.display='block'; clearTimeout(avisar.timer); avisar.timer=setTimeout(()=> $('aviso').style.display='none',3500); }
function guardar() { try { localStorage.setItem(key,JSON.stringify(estado)); return true; } catch { avisar('No se pudo guardar. Exporta tus datos antes de cerrar.'); return false; } }
function semana() { const lunes=new Date(); lunes.setHours(0,0,0,0); lunes.setDate(lunes.getDate()-((lunes.getDay()+6)%7)); return Array.from({length:7},(_,i)=>{const d=new Date(lunes); d.setDate(d.getDate()+i);return {fecha:fechaLocal(d),dia:['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][i]};}); }
function render() {
 const total=estado.sesiones.reduce((a,s)=>a+s.minutos,0);
 $('tiempo').textContent=total>=60?`${Math.floor(total/60)} h ${total%60} min`:`${total} min`;
 $('cantidad').textContent=estado.sesiones.length; $('dias').textContent=new Set(estado.sesiones.map(s=>s.fecha)).size;
 const datos=semana().map(d=>({...d,min:estado.sesiones.filter(s=>s.fecha===d.fecha).reduce((a,s)=>a+s.minutos,0)}));
 const max=Math.max(60,...datos.map(d=>d.min));
 $('grafico').innerHTML=datos.map(d=>`<div class="chart-col ${d.fecha===fechaLocal()?'today':''}"><b>${d.min?d.min+' min':'—'}</b><div class="bar" style="height:${Math.max(3,d.min/max*110)}px"></div><span>${d.dia}</span></div>`).join('');
 const semanal=datos.reduce((a,d)=>a+d.min,0);$('avance').innerHTML=`${semanal} <small>/ ${estado.meta} min</small>`;$('barra').max=estado.meta;$('barra').value=semanal;$('meta').value=estado.meta;
 $('mensajeMeta').textContent=semanal>=estado.meta?'¡Meta cumplida! Celebra tu constancia.':`${Math.round(semanal/estado.meta*100)}% de tu meta · ${estado.meta-semanal} minutos por descubrir`;
 const busqueda=$('buscar').value.trim().toLocaleLowerCase('es');
 const sesiones=estado.sesiones.filter(s=>(s.tema+' '+s.materia).toLocaleLowerCase('es').includes(busqueda)).sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.id.localeCompare(a.id));
 $('lista').innerHTML=sesiones.length?sesiones.map(s=>`<article class="session"><div class="subject-icon">▤</div><div class="session-text"><h3>${escapeHTML(s.tema)}</h3><p>${escapeHTML(s.materia)} · ${new Date(s.fecha+'T12:00:00').toLocaleDateString('es',{day:'numeric',month:'short',year:'numeric'})}</p>${s.notas?`<p class="note">${escapeHTML(s.notas)}</p>`:''}</div><strong>${s.minutos} min</strong><button class="delete" data-id="${escapeHTML(s.id)}" aria-label="Eliminar sesión: ${escapeHTML(s.tema)}">×</button></article>`).join(''):`<div class="empty"><span>◒</span><h3>${busqueda?'Sin coincidencias':'Tu próxima sesión es el comienzo'}</h3><p>${busqueda?'Prueba con otro tema o materia.':'Pulsa «Nueva sesión» y registra lo que aprendiste.'}</p></div>`;
}
$('hoy').textContent=new Date().toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'});
$('nueva').onclick=()=>{$('fecha').value=fechaLocal();$('fecha').max=fechaLocal();$('modal').showModal();};
$('cerrar').onclick=()=>$('modal').close();
$('formulario').onsubmit=e=>{e.preventDefault();const tema=$('tema').value.trim(),materia=$('materia').value.trim(),minutos=Number($('minutos').value),fecha=$('fecha').value;if(!tema||!materia||!Number.isInteger(minutos)||minutos<1||minutos>1440||fecha>fechaLocal())return avisar('Revisa el tema, la materia, la fecha y los minutos.');estado.sesiones.push({id:crypto.randomUUID(),tema,materia,minutos,fecha,notas:$('notas').value.trim()});const ok=guardar();render();$('formulario').reset();$('modal').close();if(ok)avisar('Sesión guardada. Un paso más.');};
$('guardarMeta').onclick=()=>{const meta=Number($('meta').value);if(!Number.isInteger(meta)||meta<1||meta>10080)return avisar('Escribe una meta entre 1 y 10080 minutos.');estado.meta=meta;const ok=guardar();render();if(ok)avisar('Meta semanal actualizada.');};
$('buscar').oninput=render;
$('lista').onclick=e=>{const boton=e.target.closest('[data-id]');if(!boton)return;if(!confirm('¿Eliminar esta sesión? Esta acción no se puede deshacer.'))return;estado.sesiones=estado.sesiones.filter(s=>s.id!==boton.dataset.id);guardar();render();};
$('exportar').onclick=()=>{const blob=new Blob([JSON.stringify(estado,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ritmo-${fechaLocal()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
render();
