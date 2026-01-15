/**
 * MedWard Master - Clinical UI Components
 * Professional ward round display components
 */

'use strict';

// ==================== Vitals Strip Component ====================

/**
 * VitalsStrip - Displays patient vitals with trend indicators and alerts
 *
 * @param {Object} vitals - Vitals data
 * @param {Object} vitals.temperature - { value, trend, unit }
 * @param {Object} vitals.heartRate - { value, trend }
 * @param {Object} vitals.bloodPressure - { systolic, diastolic, trend }
 * @param {Object} vitals.respiratoryRate - { value, trend }
 * @param {Object} vitals.spO2 - { value, support, trend }
 * @returns {string} HTML string
 */
function renderVitalsStrip(vitals) {
  if (!vitals) {
    return '<div class="vitals-strip"><span class="text-muted">⏳ Vitals pending</span></div>';
  }

  const temp = vitals.temperature || {};
  const hr = vitals.heartRate || {};
  const bp = vitals.bloodPressure || {};
  const rr = vitals.respiratoryRate || {};
  const spo2 = vitals.spO2 || {};

  // Determine abnormal status for each vital
  const tempStatus = getVitalStatus('temp', temp.value);
  const hrStatus = getVitalStatus('hr', hr.value);
  const bpStatus = getVitalStatus('bp', bp.systolic, bp.diastolic);
  const rrStatus = getVitalStatus('rr', rr.value);
  const spo2Status = getVitalStatus('spo2', spo2.value);

  return `
    <div class="vitals-strip card">
      <div class="grid-vitals">
        <div class="vital-item ${tempStatus}">
          <div class="vital-label">T</div>
          <div class="vital-value ${getTrendClass(temp.trend)}">
            ${temp.value || '--'}${temp.unit || '°C'}
          </div>
        </div>

        <div class="vital-item ${hrStatus}">
          <div class="vital-label">HR</div>
          <div class="vital-value ${getTrendClass(hr.trend)}">
            ${hr.value || '--'}
          </div>
        </div>

        <div class="vital-item ${bpStatus}">
          <div class="vital-label">BP</div>
          <div class="vital-value ${getTrendClass(bp.trend)}">
            ${bp.systolic || '--'}/${bp.diastolic || '--'}
          </div>
        </div>

        <div class="vital-item ${rrStatus}">
          <div class="vital-label">RR</div>
          <div class="vital-value ${getTrendClass(rr.trend)}">
            ${rr.value || '--'}
          </div>
        </div>

        <div class="vital-item ${spo2Status}">
          <div class="vital-label">SpO₂</div>
          <div class="vital-value ${getTrendClass(spo2.trend)}">
            ${spo2.value || '--'}%${spo2.support ? ` (${spo2.support})` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Determine vital status based on value
 */
function getVitalStatus(type, value, value2) {
  if (value === null || value === undefined) return '';

  switch (type) {
    case 'temp':
      if (value > 38.0 || value < 36.0) return 'status-warning';
      if (value > 39.0 || value < 35.0) return 'status-critical';
      return 'status-stable';

    case 'hr':
      if ((value > 100 && value <= 120) || (value < 60 && value >= 50)) return 'status-warning';
      if (value > 120 || value < 50) return 'status-critical';
      return 'status-stable';

    case 'bp':
      const systolic = value;
      const diastolic = value2;
      if (systolic > 180 || systolic < 90 || diastolic > 110 || diastolic < 60) return 'status-critical';
      if (systolic > 160 || systolic < 100 || diastolic > 100 || diastolic < 65) return 'status-warning';
      return 'status-stable';

    case 'rr':
      if ((value > 24 && value <= 30) || (value < 12 && value >= 10)) return 'status-warning';
      if (value > 30 || value < 10) return 'status-critical';
      return 'status-stable';

    case 'spo2':
      if (value < 90) return 'status-critical';
      if (value < 94) return 'status-warning';
      return 'status-stable';

    default:
      return '';
  }
}

/**
 * Get trend CSS class
 */
function getTrendClass(trend) {
  if (!trend) return 'trend-stable';

  const t = trend.toLowerCase();
  if (t === 'up' || t === 'increasing' || t === '↑') return 'trend-up';
  if (t === 'down' || t === 'decreasing' || t === '↓') return 'trend-down';
  return 'trend-stable';
}

// ==================== Problem Card Component ====================

/**
 * ProblemCard - Displays a single clinical problem with assessment and plan
 *
 * @param {Object} problem - Problem data
 * @param {string} problem.title - Problem title
 * @param {string} problem.priority - 'critical' | 'high' | 'medium' | 'low'
 * @param {boolean} problem.isAcute - Is this an acute problem?
 * @param {string} problem.assessment - Clinical assessment
 * @param {Array} problem.plan - Action items
 * @param {string} problem.history - Historical context
 * @returns {string} HTML string
 */
function renderProblemCard(problem, index) {
  const priorityClass = `priority-${problem.priority || 'medium'}`;
  const priorityIcon = getPriorityIcon(problem.priority);
  const priorityLabel = (problem.priority || 'medium').toUpperCase();

  return `
    <div class="problem-card card ${priorityClass}">
      <div class="problem-header flex-between mb-3">
        <div class="flex-start">
          <span class="priority-icon">${priorityIcon}</span>
          <h4 class="tier-2">${index}. ${problem.title || 'Untitled Problem'}</h4>
        </div>
        <span class="priority-badge status-${problem.priority || 'info'}">${priorityLabel}</span>
      </div>

      ${problem.assessment ? `
        <div class="problem-assessment tier-3 mb-3">
          <strong>Assessment:</strong> ${problem.assessment}
        </div>
      ` : ''}

      ${problem.plan && problem.plan.length > 0 ? `
        <div class="problem-plan mb-3">
          <strong class="tier-2">Plan:</strong>
          <ul class="plan-list">
            ${problem.plan.map(item => `
              <li class="plan-item tier-3">
                <span class="checkbox"></span>
                ${typeof item === 'string' ? item : item.action || item.text}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${problem.history ? `
        <div class="problem-history tier-3 text-muted">
          <em>${problem.history}</em>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Get priority icon
 */
function getPriorityIcon(priority) {
  switch (priority) {
    case 'critical': return '⚡';
    case 'high': return '⚠';
    case 'medium': return '●';
    case 'low': return '○';
    default: return '●';
  }
}

// ==================== Problem List Component ====================

/**
 * ProblemList - Renders sorted list of problems
 *
 * @param {Array} problems - Array of problem objects
 * @returns {string} HTML string
 */
function renderProblemList(problems) {
  if (!problems || problems.length === 0) {
    return '<div class="no-problems text-muted tier-3">No active problems documented</div>';
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedProblems = [...problems].sort((a, b) => {
    const priorityA = priorityOrder[a.priority] ?? 2;
    const priorityB = priorityOrder[b.priority] ?? 2;
    return priorityA - priorityB;
  });

  return `
    <div class="problem-list section">
      <h3 class="section-title tier-1 mb-4">Active Problems</h3>
      ${sortedProblems.map((problem, idx) => renderProblemCard(problem, idx + 1)).join('')}
    </div>
  `;
}

// ==================== Escalation Panel Component ====================

/**
 * EscalationPanel - Displays escalation triggers (always visible)
 *
 * @param {Array} triggers - Array of { condition, response }
 * @returns {string} HTML string
 */
function renderEscalationPanel(triggers) {
  if (!triggers || triggers.length === 0) {
    return '';
  }

  return `
    <div class="escalation-panel section">
      <h3 class="tier-1 flex-start">
        <span>⛔</span>
        <span>Escalate If:</span>
      </h3>
      <ul class="escalation-list">
        ${triggers.map(trigger => `
          <li class="escalation-item tier-3">
            <strong>${trigger.condition || trigger.watchFor || trigger.text}</strong>
            ${trigger.response ? ` → ${trigger.response}` : ''}
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

// ==================== Patient Header Component ====================

/**
 * PatientHeader - Displays patient identification and status
 *
 * @param {Object} patient - Patient data
 * @param {string} patient.bed - Bed number
 * @param {number} patient.dayOfAdmission - Day number
 * @param {string} patient.primaryDiagnosis - Main diagnosis
 * @param {string} patient.status - 'critical' | 'unstable' | 'stable'
 * @returns {string} HTML string
 */
function renderPatientHeader(patient) {
  const hasUrgentFlags = patient.status === 'critical' || patient.status === 'unstable';

  return `
    ${hasUrgentFlags ? '<div class="urgent-banner">⚠ URGENT ATTENTION REQUIRED</div>' : ''}
    <div class="patient-header card ${hasUrgentFlags ? 'urgent' : ''}">
      <div class="patient-info flex-between">
        <div class="patient-details">
          <span class="patient-bed tier-1">Bed ${patient.bed || '?'}</span>
          <span class="patient-separator">│</span>
          <span class="patient-day tier-2">Day ${patient.dayOfAdmission || '?'}</span>
          <span class="patient-separator">│</span>
          <span class="patient-diagnosis tier-2">${patient.primaryDiagnosis || 'Diagnosis pending'}</span>
        </div>
        <div class="patient-status status-${patient.status || 'info'}">
          ${(patient.status || 'stable').toUpperCase()}
        </div>
      </div>
    </div>
  `;
}

// ==================== Ward Round Summary Component ====================

/**
 * WardRoundSummary - Complete ward round display
 *
 * @param {Object} data - Complete patient data
 * @returns {string} HTML string
 */
function renderWardRoundSummary(data) {
  return `
    <div class="ward-summary-container">
      ${renderPatientHeader(data.patient || {})}
      ${renderVitalsStrip(data.vitals)}
      ${renderProblemList(data.problems || [])}
      ${renderEscalationPanel(data.escalationTriggers || data.watchFor || [])}

      <div class="summary-footer tier-3 text-muted mt-6">
        <div class="flex-between">
          <span>Generated: ${new Date(data.metadata?.generatedAt || Date.now()).toLocaleString()}</span>
          <span>Ward: ${data.metadata?.ward || 'General'}</span>
          <span>Page 1/1</span>
        </div>
      </div>
    </div>
  `;
}

// ==================== Integration with Neural System ====================

/**
 * Convert neural system output to ward round format
 */
function convertNeuralToWardRound(neuralResult, parsedData) {
  // Extract patient info from parsed data
  const patient = {
    bed: 'TBD',  // Would come from EMR integration
    dayOfAdmission: 1,  // Would come from admission date
    primaryDiagnosis: parsedData?.type || 'Lab Review',
    status: hasUrgentFindings(parsedData) ? 'critical' : 'stable'
  };

  // Build vitals from parsed lab data (if available)
  const vitals = extractVitalsFromLabs(parsedData);

  // Convert neural problems to problem format
  const problems = (neuralResult.problems || []).map(p => ({
    title: p.title,
    priority: mapSeverityToPriority(p.severity),
    isAcute: true,
    assessment: p.details || p.interpretation || '',
    plan: Array.isArray(p.action) ? p.action : [p.action],
    history: ''
  }));

  // Extract escalation triggers from watchFor
  const escalationTriggers = (neuralResult.watchFor || []).map(item => ({
    condition: item,
    response: 'Notify senior physician immediately'
  }));

  return {
    patient,
    vitals,
    problems,
    escalationTriggers,
    metadata: {
      generatedAt: Date.now(),
      ward: 'General Medicine',
      author: 'Neural System'
    }
  };
}

/**
 * Check if parsed data has urgent findings
 */
function hasUrgentFindings(parsedData) {
  if (!parsedData || !parsedData.tests) return false;

  return parsedData.tests.some(test =>
    test.severity === 'critical' ||
    test.status === 'critical'
  );
}

/**
 * Extract vitals from lab data (if present)
 */
function extractVitalsFromLabs(parsedData) {
  // This would extract vitals if they're in the lab report
  // For now, return null (vitals would come from separate source)
  return null;
}

/**
 * Map severity to priority
 */
function mapSeverityToPriority(severity) {
  const map = {
    'critical': 'critical',
    'severe': 'critical',
    'high': 'high',
    'abnormal': 'high',
    'moderate': 'medium',
    'mild': 'low',
    'normal': 'low'
  };

  return map[severity?.toLowerCase()] || 'medium';
}

// ==================== Exports ====================

if (typeof window !== 'undefined') {
  window.ClinicalComponents = {
    renderVitalsStrip,
    renderProblemCard,
    renderProblemList,
    renderEscalationPanel,
    renderPatientHeader,
    renderWardRoundSummary,
    convertNeuralToWardRound
  };
}
