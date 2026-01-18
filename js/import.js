/**
 * MedWard Enterprise - Import Module
 */

var MedWard = MedWard || {};

MedWard.Import = {
  imageBase64: null,
  patients: [],
  processing: false,
  
  open() {
    const { $, openModal } = MedWard.Utils;
    this.imageBase64 = null;
    this.patients = [];
    this.processing = false;
    
    $('importUpload').style.display = 'block';
    $('importPreview').style.display = 'none';
    $('importLoading').style.display = 'none';
    $('importResults').style.display = 'none';
    $('importError').style.display = 'none';
    $('importBtn').disabled = true;
    $('importFile').value = '';
    
    openModal('importModal');
  },
  
  reset() {
    const { $ } = MedWard.Utils;
    this.imageBase64 = null;
    this.patients = [];
    
    $('importUpload').style.display = 'block';
    $('importPreview').style.display = 'none';
    $('importLoading').style.display = 'none';
    $('importResults').style.display = 'none';
    $('importError').style.display = 'none';
    $('importBtn').disabled = true;
  },
  
  handleFile(file) {
    const { $ } = MedWard.Utils;
    
    MedWard.Utils.compressImage(file, MedWard.CONFIG.MAX_IMAGE_SIZE, (dataUrl) => {
      this.imageBase64 = dataUrl;
      $('importImg').src = dataUrl;
      $('importUpload').style.display = 'none';
      $('importPreview').style.display = 'block';
    });
  },
  
  async analyze() {
    const { $, toast } = MedWard.Utils;
    
    if (!this.imageBase64 || this.processing) return;
    
    this.processing = true;
    $('importPreview').style.display = 'none';
    $('importLoading').style.display = 'block';
    
    try {
      const response = await fetch(MedWard.Storage.state.settings.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'extractPatients',
          image: this.imageBase64
        })
      });
      
      const data = await response.json();
      
      this.processing = false;
      $('importLoading').style.display = 'none';
      
      if (data.error) {
        this.showError(data.error);
        return;
      }
      
      let pts = data.patients || [];
      
      // Try parsing extractedText if no patients array
      if (!pts.length && data.extractedText) {
        try {
          const match = data.extractedText.match(/\[[\s\S]*\]/);
          if (match) pts = JSON.parse(match[0]);
        } catch (e) {}
      }
      
      if (!pts.length) {
        this.showError('No patients found in the image. Try a clearer screenshot.');
        return;
      }
      
      // Normalize patients
      const user = MedWard.Storage.state.currentUser;
      this.patients = pts.map((p, i) => ({
        id: Date.now() + i,
        name: (p.name || 'Unknown').trim(),
        room: (p.room || p.bed || '—').trim(),
        diagnosis: (p.diagnosis || p.condition || 'Pending').trim(),
        status: this.normalizeStatus(p.status),
        doctor: p.doctor || (user ? user.name : 'Unassigned')
      })).filter(p => p.name && p.name !== 'Unknown');
      
      if (!this.patients.length) {
        this.showError('No valid patient data found.');
        return;
      }
      
      this.showResults();
      
    } catch (error) {
      this.processing = false;
      $('importLoading').style.display = 'none';
      this.showError('Connection failed. Check your internet connection.');
    }
  },
  
  normalizeStatus(status) {
    if (!status) return 'active';
    const s = String(status).toLowerCase();
    if (s.match(/critical|icu|urgent|emergency/)) return 'critical';
    if (s.match(/chronic|stable|routine/)) return 'chronic';
    return 'active';
  },
  
  showError(message) {
    const { $ } = MedWard.Utils;
    $('importError').style.display = 'block';
    $('importErrorMsg').textContent = message;
  },
  
  showResults() {
    const { $, initials, escapeHtml, toast } = MedWard.Utils;
    
    $('importResults').style.display = 'block';
    $('importCount').textContent = this.patients.length;
    
    let html = '';
    this.patients.slice(0, 8).forEach(p => {
      html += `
        <div class="import-patient ${p.status === 'critical' ? 'critical' : ''}">
          <div style="width:32px;height:32px;background:linear-gradient(135deg,var(--gold),var(--teal));border-radius:8px;display:grid;place-items:center;font-weight:600;font-size:0.75rem;color:var(--bg)">${initials(p.name)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:0.85rem">${escapeHtml(p.name)}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">Room ${escapeHtml(p.room)}</div>
          </div>
        </div>`;
    });
    
    if (this.patients.length > 8) {
      html += `<div style="text-align:center;padding:8px;font-size:0.8rem;color:var(--text-muted)">+${this.patients.length - 8} more</div>`;
    }
    
    $('importList').innerHTML = html;
    $('importBtn').disabled = false;
    toast(`Found ${this.patients.length} patients!`);
  },
  
  confirm() {
    const { closeModal, toast } = MedWard.Utils;
    
    if (!this.patients.length) return;
    
    let added = 0;
    this.patients.forEach(p => {
      const exists = MedWard.Storage.state.patients.some(
        ep => ep.name.toLowerCase() === p.name.toLowerCase()
      );
      if (!exists) {
        MedWard.Storage.addPatient(p);
        added++;
      }
    });
    
    MedWard.Patients.render();
    closeModal('importModal');
    toast(`Imported ${added} patients!`);
  }
};
