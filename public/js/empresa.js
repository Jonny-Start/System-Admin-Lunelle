document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('company-form');
  const inputName = document.getElementById('company-name');
  const inputSector = document.getElementById('company-sector');
  const inputAddress = document.getElementById('company-address');
  const btnSave = document.getElementById('btn-save-company');
  
  const logoNameDisplay = document.getElementById('logo-name-display');
  const logoIcon = document.getElementById('logo-icon');
  const logoImg = document.getElementById('logo-img');
  const btnUpdateLogo = document.getElementById('btn-update-logo');
  const logoInput = document.getElementById('logo-input');

  let currentLogoFile = null;

  // Cargar datos de la empresa
  async function loadCompanyData() {
    try {
      const res = await fetch('/api/company/me');
      const data = await res.json();
      
      if (data.success) {
        const company = data.data;
        inputName.value = company.name || '';
        inputSector.value = company.sector || '';
        inputAddress.value = company.address || '';
        logoNameDisplay.textContent = company.name || 'Empresa';

        if (company.logoFileId) {
          logoImg.src = `/api/drive-image/${company.logoFileId}`;
          logoImg.classList.remove('hidden');
          logoIcon.classList.add('hidden');
        } else {
          logoImg.classList.add('hidden');
          logoIcon.classList.remove('hidden');
        }
      } else {
        showToast('Error al cargar datos de la empresa', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Error de conexión', 'error');
    }
  }

  // Manejar click en actualizar logo
  btnUpdateLogo.addEventListener('click', () => {
    logoInput.click();
  });

  // Manejar selección de archivo
  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      currentLogoFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        logoImg.src = e.target.result;
        logoImg.classList.remove('hidden');
        logoIcon.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  // Guardar cambios
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Verificar permisos
    if (window.userRole && !['Super Admin', 'Administrador'].includes(window.userRole)) {
      showToast('No tienes permisos para modificar la empresa', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('name', inputName.value);
    formData.append('sector', inputSector.value);
    formData.append('address', inputAddress.value);
    
    if (currentLogoFile) {
      formData.append('logo', currentLogoFile);
    }

    // Estado de carga
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Guardando...';
    btnSave.disabled = true;

    try {
      const res = await fetch('/api/company/me', {
        method: 'PUT',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        showToast('Datos de la empresa actualizados', 'success');
        logoNameDisplay.textContent = data.data.name;
        currentLogoFile = null; // resetear archivo
      } else {
        showToast(data.error || 'Error al guardar', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Error de conexión', 'error');
    } finally {
      btnSave.innerHTML = originalText;
      btnSave.disabled = false;
    }
  });

  // Iniciar
  loadCompanyData();
});
