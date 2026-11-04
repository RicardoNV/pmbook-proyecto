// ==================================================
// Mascotas / Fichas privadas por usuario en Supabase
// ==================================================
import { setMapPhoto } from './map.js';

const fields = ['name', 'breed', 'age', 'sex', 'weight', 'size', 'color', 'owner', 'collar'];
const columns = `id,${fields.join(',')},created_at`;
const fallback = new URL('../favicon.svg', import.meta.url).href;

export async function initializePet(onChange) {
  const $ = selector => document.querySelector(selector);
  const form = $('#pet-form');
  const dialog = $('#pet-dialog');
  const deletion = $('#delete-pet-dialog');
  const selector = $('#pet-selector');
  const feedback = $('#pet-feedback');
  const message = $('#pet-form-message');
  let client, user, selected, editingId, stagedPhoto;
  let pets = [];
  let currentPhoto = null;
  let busy = false;
  let photoPending = false;
  let ready = false;
  let photoVersion = 0;
  let selectionVersion = 0;
  const switcher = $('#pet-switcher-list');
  const switcherToggle = $('#pet-switcher-toggle');
  const photos = new Map();

  // Selector inferior / Fotos bajo demanda y cache durante esta pagina.
  function closeSwitcher(focus = false) {
    for (const button of switcher.querySelectorAll('button')) button._photoObserver?.disconnect();
    switcher.hidden = true;
    switcherToggle.setAttribute('aria-expanded', 'false');
    if (focus) switcherToggle.focus();
  }

  switcherToggle.addEventListener('click', () => {
    if (!switcher.hidden) { closeSwitcher(); return; }
    switcher.replaceChildren();
    for (const pet of pets) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pet-switcher-option';
      button.setAttribute('aria-pressed', String(pet.id === selected?.id));
      const image = document.createElement('img');
      image.alt = '';
      image.src = photos.get(pet.id) || fallback;
      const name = document.createElement('span');
      name.textContent = pet.name;
      button.append(image, name);
      button.addEventListener('click', () => { closeSwitcher(true); selectPet(pet.id); });
      switcher.append(button);
      // Solo cargamos miniaturas que entran en la zona visible del desplegable.
      const observer = new IntersectionObserver(async entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        if (!photos.has(pet.id)) {
          const { data, error } = await client.from('pets').select('photo_data').eq('id', pet.id).single();
          if (error) return;
          photos.set(pet.id, data.photo_data);
        }
        image.src = photos.get(pet.id) || fallback;
      }, { root: switcher });
      observer.observe(button);
      button._photoObserver = observer;
    }
    switcher.hidden = false;
    switcherToggle.setAttribute('aria-expanded', 'true');
    switcher.querySelector('[aria-pressed="true"]')?.focus();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.pet-switcher')) closeSwitcher();
  });
  $('.pet-switcher').addEventListener('keydown', event => {
    if (switcher.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); closeSwitcher(true);
    } else if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const options = [...switcher.querySelectorAll('button')];
      const index = options.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : (index + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length;
      options[next]?.focus();
    }
  });
  $('.pet-switcher').addEventListener('focusout', event => {
    if (!event.currentTarget.contains(event.relatedTarget)) closeSwitcher();
  });
  window.addEventListener('hashchange', () => closeSwitcher());

  function controls() {
    for (const id of ['#add-pet', '#restore-pet']) $(id).disabled = busy || !ready || !user;
    for (const id of ['#edit-pet', '#delete-pet']) $(id).disabled = busy || !selected || !user;
    selector.disabled = busy || !pets.length;
    switcherToggle.disabled = busy || !pets.length || !user;
    for (const element of form.elements) element.disabled = busy;
    form.querySelector('[type="submit"]').disabled = busy || photoPending;
    $('#confirm-delete-pet').disabled = busy;
    $('#cancel-delete-pet').disabled = busy;
  }

  function setPhoto(photo) {
    currentPhoto = photo;
    setMapPhoto(photo);
    for (const image of document.querySelectorAll('[data-pet-image]')) {
      image.src = photo || fallback;
      image.alt = selected ? `Fotografía de ${selected.name}` : '';
      image.hidden = !selected;
    }
  }

  function render() {
    $('#pet-profile').hidden = !selected;
    $('#pet-empty').hidden = !ready || Boolean(selected);
    selector.replaceChildren();
    for (const pet of pets) selector.add(new Option(pet.name, pet.id));
    if (!pets.length) selector.add(new Option('Sin mascotas', ''));
    selector.value = selected?.id || '';
    for (const node of document.querySelectorAll('[data-pet-name]')) node.textContent = selected?.name || 'Sin mascota';
    $('#dashboard-pet-summary').textContent = selected
      ? `Perro ${selected.size.toLowerCase()} · ${selected.collar.replace(/^Demo /, '')}`
      : 'Agrega una mascota desde Datos de la mascota.';
    if (selected) {
      const values = { ...selected, collar: selected.collar.replace(/^Demo /, ''), age: `${selected.age} años`, weight: `${selected.weight} kg` };
      for (const node of document.querySelectorAll('[data-profile]')) node.textContent = values[node.dataset.profile];
      $('#pet-breed-summary').textContent = `${selected.breed} · ${selected.sex}`;
    }
    controls();
    onChange(selected || null);
  }

  function explain(error) {
    if (['42P01', 'PGRST205'].includes(error?.code)) return 'Falta activar la tabla de mascotas en Supabase. Ejecuta el SQL de instalación y reintenta.';
    if (error?.code === '42501') return 'No tienes permiso para esta operación. Vuelve a iniciar sesión.';
    if (error?.code === '23505') return 'La solicitud ya existe. Cierra el formulario y pulsa Reintentar carga para comprobarla.';
    return 'No se pudo completar la operación. Revisa tu conexión y vuelve a intentar. Tus datos escritos se conservan.';
  }

  async function selectPet(id) {
    closeSwitcher();
    const version = ++selectionVersion;
    selected = pets.find(pet => pet.id === id) || null;
    setPhoto(null);
    render();
    if (!selected || !user) return;
    const { data, error } = await client.from('pets').select('photo_data').eq('id', id).single();
    if (version !== selectionVersion) return;
    if (error) feedback.textContent = 'No se pudo cargar la foto. Vuelve a seleccionar la mascota para reintentar.';
    else { photos.set(id, data.photo_data); setPhoto(data.photo_data); }
  }

  async function loadPets() {
    busy = true;
    controls();
    feedback.textContent = 'Cargando tus mascotas…';
    try {
      const all = [];
      // Paginacion / No descargamos fotografias al listar las mascotas.
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await client.from('pets').select(columns).order('created_at').order('id').range(offset, offset + 99);
        if (error) throw error;
        all.push(...data);
        if (data.length < 100) break;
      }
      pets = all;
      ready = true;
      feedback.textContent = '';
      await selectPet(pets.find(pet => pet.id === selected?.id)?.id || pets[0]?.id);
      $('#retry-pets').hidden = true;
    } catch (error) {
      feedback.textContent = explain(error);
      $('#retry-pets').hidden = false;
      location.hash = '#mascota';
    } finally { busy = false; controls(); }
    if (ready && !pets.length) {
      location.hash = '#mascota';
      setTimeout(() => openForm(false), 0);
    }
  }

  function preview(photo) {
    $('#pet-photo-preview').hidden = !photo;
    if (photo) $('#pet-photo-preview').src = photo;
    else $('#pet-photo-preview').removeAttribute('src');
  }

  function openForm(edit) {
    if (!user || busy || dialog.open) return;
    form.reset();
    message.textContent = '';
    editingId = edit ? selected.id : crypto.randomUUID();
    form.dataset.mode = edit ? 'edit' : 'create';
    stagedPhoto = undefined;
    preview(edit ? currentPhoto : null);
    for (const field of fields) {
      const input = form.elements.namedItem(field);
      input.setCustomValidity('');
      if (edit) input.value = selected[field];
    }
    if (!edit) form.elements.namedItem('owner').value = user.user_metadata?.full_name || '';
    $('#pet-form-title').textContent = edit ? 'Editar mascota' : 'Crear mascota';
    $('#pet-form-description').textContent = 'Completa su ficha. Podrás editarla cuando lo necesites.';
    dialog.showModal();
    $('#pet-input-name').focus();
  }

  $('#add-pet').addEventListener('click', () => openForm(false));
  $('#restore-pet').addEventListener('click', () => openForm(false));
  $('#edit-pet').addEventListener('click', () => openForm(true));
  $('#retry-pets').addEventListener('click', () => { if (!busy) loadPets(); });
  selector.addEventListener('change', () => { feedback.textContent = ''; selectPet(selector.value); });
  for (const id of ['#close-pet-form', '#cancel-pet-form']) $(id).addEventListener('click', () => { if (!busy) dialog.close(); });
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => {
    photoVersion++;
    photoPending = false;
    preview(null);
    form.reset();
    controls();
    (selected ? $('#edit-pet') : $('#add-pet')).focus();
  });
  form.addEventListener('input', event => event.target.setCustomValidity?.(''));

  // Foto / Se reduce antes de enviar, sin conservar metadatos originales.
  $('#pet-input-photo').addEventListener('change', async event => {
    const version = ++photoVersion;
    const file = event.target.files[0];
    if (!file) return;
    photoPending = true;
    controls();
    message.textContent = 'Preparando fotografía…';
    try {
      const photo = await compressPhoto(file);
      if (version !== photoVersion) return;
      stagedPhoto = photo;
      preview(photo);
      message.textContent = '';
    } catch (error) {
      if (version !== photoVersion) return;
      event.target.value = '';
      message.textContent = error.message;
    } finally {
      if (version === photoVersion) { photoPending = false; controls(); }
    }
  });
  $('#remove-pet-photo').addEventListener('click', () => {
    photoVersion++;
    photoPending = false;
    stagedPhoto = null;
    $('#pet-input-photo').value = '';
    preview(null);
    message.textContent = '';
    controls();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || photoPending || !user) return;
    const values = {};
    for (const field of fields) {
      const input = form.elements.namedItem(field);
      values[field] = input.value.trim();
      input.setCustomValidity(values[field] ? '' : 'Completa este campo.');
    }
    if (!form.reportValidity()) return;
    values.age = Number(values.age);
    values.weight = Number(values.weight);
    if (stagedPhoto !== undefined) values.photo_data = stagedPhoto;
    busy = true;
    controls();
    message.textContent = 'Guardando mascota…';
    try {
      const query = form.dataset.mode === 'edit'
        ? client.from('pets').update(values).eq('id', editingId)
        : client.from('pets').insert({ ...values, id: editingId, user_id: user.id });
      const { data, error } = await query.select(columns).single();
      if (error) throw error;
      pets = [...pets.filter(pet => pet.id !== data.id), data];
      ready = true;
      await selectPet(data.id);
      busy = false;
      dialog.close();
      feedback.textContent = 'Mascota guardada en tu cuenta.';
    } catch (error) {
      message.textContent = explain(error);
      $('#retry-pets').hidden = false;
    } finally { busy = false; controls(); }
  });

  // Eliminacion / Ficha y foto se borran en una sola transaccion.
  $('#delete-pet').addEventListener('click', () => {
    if (!selected || busy) return;
    $('#delete-pet-title').textContent = `Eliminar a ${selected.name}`;
    deletion.showModal();
    $('#cancel-delete-pet').focus();
  });
  $('#cancel-delete-pet').addEventListener('click', () => { if (!busy) deletion.close(); });
  deletion.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  $('#confirm-delete-pet').addEventListener('click', async () => {
    if (busy || !selected || !user) return;
    busy = true;
    controls();
    const id = selected.id;
    try {
      const { error } = await client.from('pets').delete().eq('id', id);
      if (error) throw error;
      pets = pets.filter(pet => pet.id !== id);
      await selectPet(pets[0]?.id);
      deletion.close();
      feedback.textContent = 'Mascota y fotografía eliminadas permanentemente.';
      busy = false;
      if (!pets.length) openForm(false);
    } catch (error) {
      deletion.close();
      feedback.textContent = explain(error);
    } finally { busy = false; controls(); }
  });

  setPhoto(null);
  render();
  try {
    ({ supabase: client } = await import('./supabase.js'));
    const { data, error } = await client.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') throw error;
    user = data.user;
    client.auth.onAuthStateChange((event, session) => {
      // El cierre confirmado ya navega desde session.js; evitamos dos redirecciones.
      const closingHere = document.querySelector('#confirm-logout')?.disabled;
      if ((event === 'SIGNED_OUT' && user && !closingHere) || (event === 'SIGNED_IN' && session.user.id !== user?.id)) location.replace('./login.html');
    });
    if (!user) {
      ready = true;
      feedback.textContent = 'Inicia sesión para crear y consultar tus mascotas.';
      render();
      return;
    }
    await loadPets();
  } catch {
    feedback.textContent = 'No se pudo verificar tu cuenta. Recarga la página o vuelve a iniciar sesión.';
    location.hash = '#mascota';
  }
}

async function compressPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw new Error('Elige una imagen JPEG, PNG o WebP de hasta 10 MB.');
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const photo = canvas.toDataURL('image/jpeg', 0.78);
    if (photo.length > 350000) throw new Error('La imagen tiene demasiado detalle. Selecciona una fotografía más pequeña.');
    return photo;
  } catch (error) {
    throw new Error(error.message?.includes('detalle') ? error.message : 'No se pudo leer la imagen. Selecciona otro archivo.');
  } finally { bitmap?.close(); }
}
