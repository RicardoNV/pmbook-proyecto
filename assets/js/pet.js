// ==================================================
// Datos de ejemplo / Solo se mantienen en memoria
// ==================================================

const examplePet = {
  name: 'Max',
  breed: 'Beagle',
  age: 3,
  sex: 'Macho',
  weight: 14,
  color: 'Tricolor',
  owner: 'Ana López',
  collar: 'SC-001',
};

export function initializePet(onChange) {
  const dialog = document.querySelector('#pet-dialog');
  const form = document.querySelector('#pet-form');
  const deleteDialog = document.querySelector('#delete-pet-dialog');
  const feedback = document.querySelector('#pet-feedback');
  let pet = { ...examplePet };

  // Presentacion / textContent evita interpretar los datos como HTML.
  function renderPet() {
    document.querySelector('#pet-profile').hidden = !pet;
    document.querySelector('#pet-empty').hidden = Boolean(pet);

    for (const element of document.querySelectorAll('[data-pet-name]')) {
      element.textContent = pet?.name ?? 'Sin mascota';
    }

    for (const image of document.querySelectorAll('[data-pet-image]')) {
      image.hidden = !pet;
    }

    document.querySelector('#dashboard-pet-summary').textContent = pet
      ? `Perro mediano · Collar ${pet.collar}`
      : 'Restaura el perfil desde Datos de la mascota.';

    if (pet) {
      const values = {
        ...pet,
        age: `${pet.age} ${pet.age === 1 ? 'año' : 'años'}`,
        weight: `${new Intl.NumberFormat('es-MX').format(pet.weight)} kg`,
      };

      for (const element of document.querySelectorAll('[data-profile]')) {
        element.textContent = values[element.dataset.profile];
      }

      document.querySelector('#pet-breed-summary').textContent = `${pet.breed} · ${pet.sex}`;
    }

    onChange(pet);
  }

  // Edicion / Precarga los valores actuales antes de abrir el dialog.
  document.querySelector('#edit-pet').addEventListener('click', () => {
    if (!pet) return;

    for (const [field, value] of Object.entries(pet)) {
      const input = form.elements.namedItem(field);
      input.value = value;
      input.setCustomValidity('');
    }

    dialog.showModal();
    document.querySelector('#pet-input-name').focus();
  });

  for (const id of ['#close-pet-form', '#cancel-pet-form']) {
    document.querySelector(id).addEventListener('click', () => dialog.close());
  }

  dialog.addEventListener('close', () => document.querySelector('#edit-pet').focus());

  // Validacion / Los campos de texto no aceptan unicamente espacios.
  form.addEventListener('input', (event) => {
    event.target.setCustomValidity('');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));

    for (const [field, value] of Object.entries(values)) {
      values[field] = value.trim();
      form.elements.namedItem(field).setCustomValidity(values[field] ? '' : 'Completa este campo.');
    }

    if (!form.reportValidity()) return;

    pet = { ...values, age: Number(values.age), weight: Number(values.weight) };
    renderPet();
    dialog.close();
    feedback.textContent = 'Datos de la mascota actualizados en esta sesión.';
  });

  // Eliminacion provisional / Requiere confirmar dentro de otro dialog.
  document.querySelector('#delete-pet').addEventListener('click', () => {
    deleteDialog.showModal();
    document.querySelector('#cancel-delete-pet').focus();
  });

  document.querySelector('#cancel-delete-pet').addEventListener('click', () => deleteDialog.close());

  document.querySelector('#confirm-delete-pet').addEventListener('click', () => {
    pet = null;
    renderPet();
    deleteDialog.close();
    feedback.textContent = 'Mascota y lecturas eliminadas de esta sesión.';
  });

  deleteDialog.addEventListener('close', () => {
    document.querySelector(pet ? '#delete-pet' : '#restore-pet').focus();
  });

  // Restauracion / Recupera el perfil inicial y sus lecturas de ejemplo.
  document.querySelector('#restore-pet').addEventListener('click', () => {
    pet = { ...examplePet };
    renderPet();
    feedback.textContent = 'Mascota de ejemplo restaurada.';
    document.querySelector('#edit-pet').focus();
  });

  renderPet();
}
