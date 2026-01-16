/**
 * MedWard Patient Manager
 * Handles Google Sheets integration for ward patient management
 */

(function() {
  'use strict';

  // Configuration - SET YOUR DEPLOYED URL HERE
  const PATIENT_API_URL = window.MEDWARD_PATIENT_API_URL || '';

  // State
  let patients = [];
  let wards = [];
  let doctors = [];
  let currentFilter = { ward: '', doctor: '', status: '' };
  let editingPatient = null;

  // DOM Elements
  let elements = {};

  // Initialize
  function init() {
    elements = {
      patientsGrid: document.getElementById('patients-grid'),
      wardFilter: document.getElementById('ward-filter'),
      doctorFilter: document.getElementById('doctor-filter'),
      statusFilter: document.getElementById('status-filter'),
      addPatientBtn: document.getElementById('add-patient-btn'),
      refreshBtn: document.getElementById('refresh-patients-btn'),
      patientModal: document.getElementById('patient-modal'),
      patientForm: document.getElementById('patient-form'),
      patientModalTitle: document.getElementById('patient-modal-title'),
      patientModalClose: document.getElementById('patient-modal-close'),
      cancelPatientBtn: document.getElementById('cancel-patient-btn'),
      patientRowIndex: document.getElementById('patient-row-index'),
      patientWard: document.getElementById('patient-ward'),
      patientRoom: document.getElementById('patient-room'),
      patientName: document.getElementById('patient-name'),
      patientDiagnosis: document.getElementById('patient-diagnosis'),
      patientDoctor: document.getElementById('patient-doctor'),
      patientStatus: document.getElementById('patient-status'),
      patientsTab: document.getElementById('patients-tab'),
      dashboardTab: document.getElementById('dashboard-tab')
    };

    setupEventListeners();
  }

  function setupEventListeners() {
    // Tab switching
    if (elements.patientsTab) {
      elements.patientsTab.addEventListener('click', () => {
        showPatientsSection();
        loadAllData();
      });
    }

    if (elements.dashboardTab) {
      elements.dashboardTab.addEventListener('click', () => {
        showDashboardSection();
      });
    }

    // Filters
    if (elements.wardFilter) {
      elements.wardFilter.addEventListener('change', applyFilters);
    }
    if (elements.doctorFilter) {
      elements.doctorFilter.addEventListener('change', applyFilters);
    }
    if (elements.statusFilter) {
      elements.statusFilter.addEventListener('change', applyFilters);
    }

    // Buttons
    if (elements.addPatientBtn) {
      elements.addPatientBtn.addEventListener('click', () => openPatientModal());
    }
    if (elements.refreshBtn) {
      elements.refreshBtn.addEventListener('click', loadAllData);
    }

    // Modal
    if (elements.patientModalClose) {
      elements.patientModalClose.addEventListener('click', closePatientModal);
    }
    if (elements.cancelPatientBtn) {
      elements.cancelPatientBtn.addEventListener('click', closePatientModal);
    }
    if (elements.patientModal) {
      elements.patientModal.addEventListener('click', (e) => {
        if (e.target === elements.patientModal) closePatientModal();
      });
    }

    // Form submission
    if (elements.patientForm) {
      elements.patientForm.addEventListener('submit', handleSavePatient);
    }
  }

  // API Functions
  async function apiCall(action, data = {}) {
    if (!PATIENT_API_URL) {
      console.error('Patient API URL not configured');
      showToast('Patient API not configured. Please add your Google Apps Script URL.', 'error');
      return null;
    }

    try {
      const response = await fetch(PATIENT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, ...data })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'API call failed');
      }

      return result;
    } catch (error) {
      console.error('API Error:', error);
      showToast('Error: ' + error.message, 'error');
      return null;
    }
  }

  // Data Loading
  async function loadAllData() {
    showLoading(true);

    await Promise.all([
      loadWards(),
      loadDoctors(),
      loadPatients()
    ]);

    showLoading(false);
  }

  async function loadPatients() {
    const result = await apiCall('getPatients', currentFilter);
    if (result) {
      patients = result.patients;
      renderPatients();
    }
  }

  async function loadWards() {
    const result = await apiCall('getWards');
    if (result) {
      wards = result.wards;
      populateWardDropdowns();
    }
  }

  async function loadDoctors() {
    const result = await apiCall('getDoctors');
    if (result) {
      doctors = result.doctors;
      populateDoctorDropdowns();
    }
  }

  // Rendering
  function renderPatients() {
    if (!elements.patientsGrid) return;

    if (patients.length === 0) {
      elements.patientsGrid.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem; opacity: 0.5;">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          <p>No patients found</p>
          <p style="font-size: 0.85rem; margin-top: 0.5rem;">Try adjusting your filters or add a new patient</p>
        </div>
      `;
      return;
    }

    // Group by ward
    const byWard = {};
    patients.forEach(p => {
      if (!byWard[p.ward]) byWard[p.ward] = [];
      byWard[p.ward].push(p);
    });

    let html = '';

    Object.keys(byWard).sort().forEach(ward => {
      html += `<div class="ward-section" style="grid-column: 1 / -1;">
        <h3 style="color: var(--accent-gold); margin: 1rem 0 0.75rem; font-size: 1rem;">${ward}</h3>
      </div>`;

      byWard[ward].forEach(patient => {
        html += renderPatientCard(patient);
      });
    });

    elements.patientsGrid.innerHTML = html;

    // Add event listeners to cards
    document.querySelectorAll('.edit-patient-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rowIndex = parseInt(btn.dataset.row);
        const patient = patients.find(p => p.rowIndex === rowIndex);
        if (patient) openPatientModal(patient);
      });
    });

    document.querySelectorAll('.delete-patient-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rowIndex = parseInt(btn.dataset.row);
        const patient = patients.find(p => p.rowIndex === rowIndex);
        if (patient) confirmDeletePatient(patient);
      });
    });
  }

  function renderPatientCard(patient) {
    const statusClass = patient.status.toLowerCase().includes('chronic') && !patient.status.toLowerCase().includes('non')
      ? 'chronic'
      : 'non-chronic';

    return `
      <div class="patient-card">
        <div class="patient-card-header">
          <div>
            <div class="patient-name">${escapeHtml(patient.patientName)}</div>
            ${patient.roomBed ? `<div class="patient-room">Room ${escapeHtml(patient.roomBed)}</div>` : ''}
          </div>
          <div class="patient-ward">${escapeHtml(patient.ward)}</div>
        </div>

        ${patient.diagnosis ? `<div class="patient-diagnosis">${escapeHtml(patient.diagnosis)}</div>` : ''}

        <div class="patient-meta">
          <div class="patient-doctor">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            ${patient.assignedDoctor ? escapeHtml(patient.assignedDoctor) : 'Unassigned'}
          </div>
          <span class="patient-status ${statusClass}">${escapeHtml(patient.status)}</span>
        </div>

        <div class="patient-actions">
          <button class="btn btn-secondary edit-patient-btn" data-row="${patient.rowIndex}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
          <button class="btn btn-danger delete-patient-btn" data-row="${patient.rowIndex}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Remove
          </button>
        </div>
      </div>
    `;
  }

  function populateWardDropdowns() {
    const options = '<option value="">All Wards</option>' +
      wards.map(w => `<option value="${escapeHtml(w)}">${escapeHtml(w)}</option>`).join('');

    if (elements.wardFilter) {
      elements.wardFilter.innerHTML = options;
    }

    if (elements.patientWard) {
      elements.patientWard.innerHTML = wards.map(w =>
        `<option value="${escapeHtml(w)}">${escapeHtml(w)}</option>`
      ).join('');
    }
  }

  function populateDoctorDropdowns() {
    const filterOptions = '<option value="">All Doctors</option>' +
      doctors.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');

    const formOptions = '<option value="">Select Doctor</option>' +
      doctors.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');

    if (elements.doctorFilter) {
      elements.doctorFilter.innerHTML = filterOptions;
    }

    if (elements.patientDoctor) {
      elements.patientDoctor.innerHTML = formOptions;
    }
  }

  // Filters
  function applyFilters() {
    currentFilter = {
      ward: elements.wardFilter?.value || '',
      doctor: elements.doctorFilter?.value || '',
      status: elements.statusFilter?.value || ''
    };
    loadPatients();
  }

  // Modal Functions
  function openPatientModal(patient = null) {
    editingPatient = patient;

    if (elements.patientModalTitle) {
      elements.patientModalTitle.textContent = patient ? 'Edit Patient' : 'Add New Patient';
    }

    // Reset form
    if (elements.patientForm) {
      elements.patientForm.reset();
    }

    // Fill form if editing
    if (patient) {
      if (elements.patientRowIndex) elements.patientRowIndex.value = patient.rowIndex;
      if (elements.patientWard) elements.patientWard.value = patient.ward;
      if (elements.patientRoom) elements.patientRoom.value = patient.roomBed || '';
      if (elements.patientName) elements.patientName.value = patient.patientName;
      if (elements.patientDiagnosis) elements.patientDiagnosis.value = patient.diagnosis || '';
      if (elements.patientDoctor) elements.patientDoctor.value = patient.assignedDoctor || '';
      if (elements.patientStatus) elements.patientStatus.value = patient.status || 'Non-Chronic';
    }

    if (elements.patientModal) {
      elements.patientModal.classList.add('active');
    }
  }

  function closePatientModal() {
    if (elements.patientModal) {
      elements.patientModal.classList.remove('active');
    }
    editingPatient = null;
  }

  // CRUD Operations
  async function handleSavePatient(e) {
    e.preventDefault();

    const data = {
      ward: elements.patientWard?.value,
      roomBed: elements.patientRoom?.value,
      patientName: elements.patientName?.value,
      diagnosis: elements.patientDiagnosis?.value,
      assignedDoctor: elements.patientDoctor?.value,
      status: elements.patientStatus?.value
    };

    let result;

    if (editingPatient) {
      // Update existing
      data.rowIndex = editingPatient.rowIndex;
      result = await apiCall('updatePatient', data);
    } else {
      // Add new
      result = await apiCall('addPatient', data);
    }

    if (result) {
      showToast(editingPatient ? 'Patient updated!' : 'Patient added!', 'success');
      closePatientModal();
      loadPatients();
    }
  }

  function confirmDeletePatient(patient) {
    if (confirm(`Remove ${patient.patientName} from the ward list?`)) {
      deletePatient(patient);
    }
  }

  async function deletePatient(patient) {
    const result = await apiCall('deletePatient', { rowIndex: patient.rowIndex });

    if (result) {
      showToast('Patient removed', 'success');
      loadPatients();
    }
  }

  // UI Helpers
  function showPatientsSection() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const patientsScreen = document.getElementById('patients-screen');
    if (patientsScreen) {
      patientsScreen.classList.add('active');
    }

    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    if (elements.patientsTab) {
      elements.patientsTab.classList.add('active');
    }
  }

  function showDashboardSection() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const dashboardScreen = document.getElementById('dashboard-screen');
    if (dashboardScreen) {
      dashboardScreen.classList.add('active');
    }

    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    if (elements.dashboardTab) {
      elements.dashboardTab.classList.add('active');
    }
  }

  function showLoading(show) {
    if (elements.patientsGrid && show) {
      elements.patientsGrid.innerHTML = '<p class="loading-text">Loading patients...</p>';
    }
  }

  function showToast(message, type = 'success') {
    // Use existing toast function if available
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose to global scope
  window.PatientManager = {
    loadPatients,
    openPatientModal,
    refresh: loadAllData
  };

})();
