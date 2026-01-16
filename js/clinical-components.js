/**
 * MedWard Clinical Components v5.4 - Fixed Data Paths
 * Correctly accesses extractedText from rawResponse
 */

const ClinicalComponents = {
  
  labRanges: {
    glucose: { name: 'Glucose', min: 4.1, max: 5.6, unit: 'mmol/L', category: 'Metabolic' },
    urea: { name: 'Urea', min: 2.8, max: 7.2, unit: 'mmol/L', category: 'Renal Function' },
    creatinine: { name: 'Creatinine', min: 64, max: 104, unit: 'μmol/L', category: 'Renal Function' },
    sodium: { name: 'Sodium', min: 136, max: 146, unit: 'mmol/L', category: 'Electrolytes' },
    potassium: { name: 'Potassium', min: 3.5, max: 5.1, unit: 'mmol/L', category: 'Electrolytes' },
    chloride: { name: 'Chloride', min: 98, max: 107, unit: 'mmol/L', category: 'Electrolytes' },
    co2: { name: 'CO2', min: 22, max: 29, unit: 'mmol/L', category: 'Electrolytes' },
    calcium: { name: 'Calcium', min: 2.1, max: 2.6, unit: 'mmol/L', category: 'Electrolytes' },
    magnesium: { name: 'Magnesium', min: 0.73, max: 1.06, unit: 'mmol/L', category: 'Electrolytes' },
    phosphate: { name: 'Phosphate', min: 0.81, max: 1.45, unit: 'mmol/L', category: 'Electrolytes' },
    urate: { name: 'Urate', min: 208, max: 428, unit: 'μmol/L', category: 'Metabolic' },
    alt: { name: 'ALT', min: 0, max: 41, unit: 'IU/L', category: 'Liver Function', critical: 500 },
    ast: { name: 'AST', min: 0, max: 40, unit: 'IU/L', category: 'Liver Function', critical: 500 },
    ggt: { name: 'GGT', min: 8, max: 61, unit: 'IU/L', category: 'Liver Function' },
    alkphos: { name: 'Alk Phos', min: 40, max: 129, unit: 'IU/L', category: 'Liver Function' },
    tbilirubin: { name: 'T. Bilirubin', min: 5, max: 21, unit: 'μmol/L', category: 'Liver Function' },
    dbilirubin: { name: 'D. Bilirubin', min: 0, max: 3.4, unit: 'μmol/L', category: 'Liver Function' },
    albumin: { name: 'Albumin', min: 35, max: 52, unit: 'g/L', category: 'Liver Function' },
    protein: { name: 'T. Protein', min: 66, max: 83, unit: 'g/L', category: 'Liver Function' },
    wbc: { name: 'WBC', min: 4.5, max: 11.0, unit: '×10⁹/L', category: 'Hematology' },
    hemoglobin: { name: 'Hemoglobin', min: 130, max: 170, unit: 'g/L', category: 'Hematology' },
    platelets: { name: 'Platelets', min: 150, max: 400, unit: '×10⁹/L', category: 'Hematology' },
    pt: { name: 'PT', min: 9.6, max: 13.6, unit: 'sec', category: 'Coagulation' },
    inr: { name: 'INR', min: 0.85, max: 1.15, unit: '', category: 'Coagulation' },
    aptt: { name: 'APTT', min: 25, max: 37, unit: 'sec', category: 'Coagulation' },
    troponin: { name: 'Troponin', min: 0, max: 19.8, unit: 'ng/L', category: 'Cardiac Markers', critical: 50 },
    probnp: { name: 'NT-proBNP', min: 0, max: 125, unit: 'pg/ml', category: 'Cardiac Markers' },
    egfr: { name: 'eGFR', min: 60, max: 999, unit: 'mL/min', category: 'Renal Function' },
    aniongap: { name: 'Anion Gap', min: 8, max: 16, unit: 'mmol/L', category: 'Electrolytes' },
    ph: { name: 'pH', min: 7.35, max: 7.45, unit: '', category: 'Blood Gas' },
    pco2: { name: 'pCO2', min: 35, max: 45, unit: 'mmHg', category: 'Blood Gas' },
    hco3: { name: 'HCO3', min: 22, max: 26, unit: 'mmol/L', category: 'Blood Gas' },
    lactate: { name: 'Lactate', min: 0.5, max: 2.2, unit: 'mmol/L', category: 'Blood Gas', critical: 4 }
  },

  renderDetailedView(results) {
    const container = document.getElementById('detailed-view');
    if (!container) return;
    if (!results) { container.innerHTML = this.renderEmpty(); return; }

    this.injectStyles();
    
    // CORRECT DATA PATH - try multiple locations
    const extractedText = results.rawResponse?.extractedText || 
                          results.rawResponse?.rawResponse?.extractedText || 
                          results.extractedText || '';
    
    console.log('[MedWard v5.4] extractedText:', extractedText ? extractedText.length + ' chars' : 'NONE');
    
    const aggressiveLabValues = this.aggressiveLabExtraction(extractedText);
    const { clinicalFindings, aiLabValues } = this.separateAIInterpretation(results);
    const finalLabValues = this.mergeLabValues(aggressiveLabValues, aiLabValues);
    
    console.log('[MedWard v5.4] Labs found:', finalLabValues.length, 'Clinical:', clinicalFindings.length);
    
    let html = '<div class="elite-report">';
    
    const severity = this.determineSeverity(results, finalLabValues);
    const header = results.rawResponse?.interpretation?.header || 
                   results.rawResponse?.interpretation?.summary ||
                   results.diagnosis || results.summary || 'Clinical Analysis';
    html += this.renderSeverityHeader(severity, header);
    
    const summary = results.rawResponse?.interpretation?.summary || results.rawResponse?.summary || results.summary;
    if (summary) html += this.renderExecutiveSummary(summary);
    
    if (results.alerts && results.alerts.length > 0) html += this.renderCriticalAlerts(results.alerts);
    if (clinicalFindings.length > 0) html += this.renderClinicalFindings(clinicalFindings);
    if (finalLabValues.length > 0) html += this.renderLabValues(finalLabValues);
    
    const interp = results.rawResponse?.interpretation;
    if (interp?.value || interp?.action) html += this.renderClinicalInterpretation(interp);
    
    const recs = results.recommendations || results.rawResponse?.presentation?.recommendations || [];
    if (recs.length > 0) html += this.renderManagementPlan(recs);
    
    const pearl = results.clinicalPearl || (results.rawResponse?.clinicalPearls || [])[0];
    if (pearl) html += this.renderClinicalPearl(pearl);
    
    const patientExp = results.patientExplanation || results.rawResponse?.presentation?.patientFriendly;
    if (patientExp) html += this.renderPatientCommunication(patientExp);
    
    if (extractedText) html += this.renderExtractedData(extractedText);
    
    html += this.renderReportFooter();
    html += '</div>';
    
    container.innerHTML = html;
    this.setupInteractions(container);
  },

  aggressiveLabExtraction(text) {
    if (!text) return [];
    const labs = [];
    const foundLabs = new Set();
    const normalized = text.replace(/\s+/g, ' ');
    
    const patterns = [
      { key: 'glucose', regex: /gluc(?:ose)?\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'urea', regex: /\burea\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'creatinine', regex: /creat(?:inine)?\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'sodium', regex: /\b(?:na|sodium)\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'potassium', regex: /\b(?:k|potassium)\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'chloride', regex: /\b(?:cl|chloride)\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'co2', regex: /\bco2\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'calcium', regex: /\bca(?:lcium)?\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'magnesium', regex: /\bmg\s*\*?\s*[:\s]*(0\.\d+|\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'phosphate', regex: /phos(?:phate)?\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'urate', regex: /urate\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'alt', regex: /\balt\s*\*?\s*[:\s]*([>]?\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'ast', regex: /\bast\s*\*?\s*[:\s]*([>]?\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'ggt', regex: /\bggt\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'alkphos', regex: /alk\.?\s*phos\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'tbilirubin', regex: /t\.?\s*bil(?:irubin)?\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'dbilirubin', regex: /d\.?\s*bil(?:irubin)?\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'albumin', regex: /albumin\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'protein', regex: /t\.?\s*protein\s*\*?\s*[:\s]*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'wbc', regex: /\bwbc\s*[:\*]?\s*(\d+(?:\.\d+)?)/gi },
      { key: 'hemoglobin', regex: /\b(?:hb|hgb|hemoglobin)\s*[:\*]?\s*(\d+(?:\.\d+)?)/gi },
      { key: 'platelets', regex: /\b(?:plt|platelet)s?\s*[:\*]?\s*(\d+(?:\.\d+)?)/gi },
      { key: 'pt', regex: /\bpt\s+(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'inr', regex: /\b(?:pt\.?\s*)?inr\s*[:\*]?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'aptt', regex: /\baptt\s*[:\*]?\s*(\d+(?:\.\d+)?)/gi },
      { key: 'troponin', regex: /(?:hs\s*)?troponin\s*[I1]?\s*[:\*]?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      { key: 'probnp', regex: /(?:nt[- ]?)?pro\s*bnp\s*[:\*]?\s*(\d+(?:\.\d+)?)/gi },
      { key: 'egfr', regex: /egfr\s*[:\*]?\s*(\d+(?:\.\d+)?)/gi },
      { key: 'aniongap', regex: /anion\s*gap\s*[:\*]?\s*(\d+(?:\.\d+)?)/gi },
      { key: 'ph', regex: /\bph\s*[:\*]?\s*(7\.\d+)/gi },
      { key: 'pco2', regex: /pco2\s*[:\*]?\s*(\d+(?:\.\d+)?)/gi },
      { key: 'hco3', regex: /hco3\s*[:\*]?\s*(\d+(?:\.\d+)?)/gi },
      { key: 'lactate', regex: /\b(?:lac|lactate)\s*[:\*]?\s*(\d+(?:\.\d+)?)/gi }
    ];
    
    patterns.forEach(p => {
      let match;
      while ((match = p.regex.exec(normalized)) !== null) {
        if (foundLabs.has(p.key)) continue;
        const valueStr = match[1];
        const flag = match[2] ? match[2].toUpperCase() : null;
        const ref = this.labRanges[p.key];
        if (!ref) continue;
        
        let numericValue = parseFloat(valueStr.replace('>', ''));
        let status = 'normal';
        if (flag === 'HH' || (ref.critical && numericValue >= ref.critical)) status = 'critical';
        else if (flag === 'H' || numericValue > ref.max) status = 'high';
        else if (flag === 'LL' || flag === 'L' || numericValue < ref.min) status = 'low';
        
        foundLabs.add(p.key);
        labs.push({
          name: ref.name,
          value: valueStr + ' ' + ref.unit,
          reference: ref.min + '-' + ref.max + ' ' + ref.unit,
          status, statusLabel: status.charAt(0).toUpperCase() + status.slice(1),
          category: ref.category, isAbnormal: status !== 'normal'
        });
      }
    });
    return labs;
  },

  separateAIInterpretation(results) {
    const clinicalFindings = [];
    const aiLabValues = [];
    const abnormalities = results.rawResponse?.interpretation?.abnormalities || [];
    const clinicalKeywords = ['dyspnea','orthopnea','edema','pain','nausea','fever','cough','crackles','murmur','examination','history','diagnosis','nyha','bilateral','acute','chronic','decompensated','hypoxemia','congestion','failure','improvement','clinical'];
    
    abnormalities.forEach(item => {
      const text = typeof item === 'string' ? item : (item.finding || item.text || '');
      if (!text) return;
      const lower = text.toLowerCase();
      const clinicalScore = clinicalKeywords.filter(k => lower.includes(k)).length;
      if (clinicalScore >= 1 || !/\d/.test(text) || text.length > 80) {
        clinicalFindings.push({ finding: text, type: this.classifyClinicalFinding(text) });
      } else {
        aiLabValues.push({ name: text.split(':')[0] || text, value: text.split(':')[1] || '-', reference: '-', status: 'high', statusLabel: 'Abnormal', isAbnormal: true, category: 'Other' });
      }
    });
    
    (results.rawResponse?.interpretation?.keyFindings || []).forEach(item => {
      const text = typeof item === 'string' ? item : (item.finding || '');
      if (text) clinicalFindings.push({ finding: text, type: this.classifyClinicalFinding(text) });
    });
    
    (results.findings || []).forEach(f => {
      if (f.value && /\d/.test(f.value)) {
        aiLabValues.push({ name: f.name, value: f.value, reference: f.reference || '-', status: f.status?.toLowerCase() || 'normal', statusLabel: f.status || 'Normal', isAbnormal: !f.status?.toLowerCase().includes('normal'), category: 'Other' });
      }
    });
    
    return { clinicalFindings, aiLabValues };
  },

  mergeLabValues(aggressive, ai) {
    const merged = [...aggressive];
    const names = new Set(aggressive.map(l => l.name.toLowerCase()));
    ai.forEach(l => { if (!names.has(l.name.toLowerCase())) merged.push(l); });
    return merged;
  },

  classifyClinicalFinding(text) {
    const t = text.toLowerCase();
    if (t.includes('dyspnea') || t.includes('breath') || t.includes('pulmonary') || t.includes('spo2') || t.includes('crackle')) return 'respiratory';
    if (t.includes('cardiac') || t.includes('heart') || t.includes('nyha') || t.includes('edema') || t.includes('decompensated')) return 'cardiovascular';
    if (t.includes('abdom') || t.includes('hepat') || t.includes('liver') || t.includes('nausea') || t.includes('congestion')) return 'gastrointestinal';
    if (t.includes('renal') || t.includes('kidney') || t.includes('aki')) return 'renal';
    if (t.includes('exam') || t.includes('bilateral')) return 'examination';
    if (t.includes('impression') || t.includes('diagnosis')) return 'impression';
    if (t.includes('improvement') || t.includes('lasix')) return 'progress';
    return 'general';
  },

  determineSeverity(results, labs) {
    if (labs.some(l => l.status === 'critical')) return 'critical';
    if (labs.some(l => l.isAbnormal)) return 'abnormal';
    const t = JSON.stringify(results).toLowerCase();
    if (t.includes('critical') || t.includes('severe')) return 'critical';
    if (t.includes('abnormal') || t.includes('elevated')) return 'abnormal';
    return 'normal';
  },

  renderSeverityHeader(severity, header) {
    const icons = { critical: '⚠️', abnormal: '⚡', normal: '✓' };
    return `<div class="severity-header ${severity}"><div class="severity-badge">${icons[severity]} ${severity.toUpperCase()}</div><h2 class="severity-title">${this.esc(header)}</h2></div>`;
  },

  renderExecutiveSummary(summary) {
    return `<div class="exec-summary"><div class="section-label">📋 EXECUTIVE SUMMARY</div><p class="exec-summary-text">${this.esc(summary)}</p></div>`;
  },

  renderCriticalAlerts(alerts) {
    return `<div class="alert-section">${alerts.map(a => `<div class="elite-alert ${a.severity}"><div class="alert-body"><div class="alert-title">${this.esc(a.title)}</div><div class="alert-desc">${this.esc(a.text)}</div></div></div>`).join('')}</div>`;
  },

  renderClinicalFindings(findings) {
    const grouped = {};
    findings.forEach(f => { const t = f.type || 'general'; if (!grouped[t]) grouped[t] = []; grouped[t].push(f); });
    const cfg = {
      respiratory: { label: 'Respiratory', icon: '🫁', color: '#06b6d4' },
      cardiovascular: { label: 'Cardiovascular', icon: '❤️', color: '#ef4444' },
      gastrointestinal: { label: 'GI', icon: '🔶', color: '#f59e0b' },
      renal: { label: 'Renal', icon: '💧', color: '#3b82f6' },
      examination: { label: 'Exam', icon: '🩺', color: '#10b981' },
      impression: { label: 'Impression', icon: '📋', color: '#f43f5e' },
      progress: { label: 'Progress', icon: '📈', color: '#22c55e' },
      general: { label: 'General', icon: '📝', color: '#6b7280' }
    };
    const order = ['impression','cardiovascular','respiratory','renal','gastrointestinal','examination','progress','general'];
    let html = `<div class="clinical-findings-section"><div class="section-header-bar"><h3>🏥 Clinical Assessment</h3></div><div class="findings-grid">`;
    for (const type of order) {
      const items = grouped[type];
      if (!items) continue;
      const c = cfg[type] || cfg.general;
      html += `<div class="finding-category" style="border-left-color:${c.color}"><div class="finding-category-header"><span>${c.icon}</span><span style="color:${c.color}">${c.label}</span></div><ul class="finding-list">${items.map(i => `<li class="finding-item">• ${this.esc(i.finding)}</li>`).join('')}</ul></div>`;
    }
    html += '</div></div>';
    return html;
  },

  renderLabValues(labs) {
    if (!labs.length) return '';
    const cats = {};
    labs.forEach(l => { const c = l.category || 'Other'; if (!cats[c]) cats[c] = []; cats[c].push(l); });
    const colors = { 'Renal Function': '#3b82f6', 'Electrolytes': '#8b5cf6', 'Liver Function': '#f59e0b', 'Cardiac Markers': '#ef4444', 'Hematology': '#ec4899', 'Coagulation': '#14b8a6', 'Blood Gas': '#06b6d4', 'Metabolic': '#22c55e', 'Other': '#6b7280' };
    const order = ['Blood Gas','Cardiac Markers','Renal Function','Electrolytes','Liver Function','Hematology','Coagulation','Metabolic','Other'];
    let html = '';
    for (const cat of order) {
      const items = cats[cat];
      if (!items) continue;
      const col = colors[cat] || '#6b7280';
      const abn = items.filter(i => i.isAbnormal).length;
      html += `<div class="lab-category-section"><div class="lab-category-header" style="border-left:4px solid ${col}"><h3>${cat}</h3><span class="lab-count">${items.length} tests${abn ? ' · <span style="color:#fca5a5">' + abn + ' abnormal</span>' : ''}</span></div><table class="lab-table"><thead><tr><th>Parameter</th><th>Result</th><th>Reference</th><th>Status</th></tr></thead><tbody>${items.map(l => `<tr class="${l.isAbnormal ? 'abnormal-row' : ''}"><td>${this.esc(l.name)}</td><td class="lab-value ${l.status}">${this.esc(l.value)}</td><td class="lab-ref">${this.esc(l.reference)}</td><td><span class="lab-status ${l.status}">${l.status === 'high' || l.status === 'critical' ? '↑' : l.status === 'low' ? '↓' : '•'} ${this.esc(l.statusLabel)}</span></td></tr>`).join('')}</tbody></table></div>`;
    }
    return html;
  },

  renderClinicalInterpretation(interp) {
    return `<div class="interpretation-panel"><div class="interpretation-title">🔬 Clinical Interpretation</div>${interp.value ? `<div class="interpretation-content">${this.esc(interp.value)}</div>` : ''}${interp.action ? `<div class="interpretation-action"><strong>Action:</strong> ${this.esc(interp.action)}</div>` : ''}</div>`;
  },

  renderManagementPlan(recs) {
    return `<div class="management-section"><div class="management-header"><h3>✅ Management Plan</h3></div><div class="management-list">${recs.map((r, i) => `<div class="management-item ${i === 0 ? 'priority' : ''}"><span class="management-num">${i + 1}</span><span>${this.esc(typeof r === 'string' ? r : r.text)}</span></div>`).join('')}</div></div>`;
  },

  renderClinicalPearl(pearl) {
    return `<div class="pearl-section"><div class="pearl-label">💎 Clinical Pearl</div><p class="pearl-text">${this.esc(typeof pearl === 'string' ? pearl : JSON.stringify(pearl))}</p></div>`;
  },

  renderPatientCommunication(text) {
    return `<div class="patient-section"><div class="patient-header">👤 Patient Communication</div><p class="patient-text">${this.esc(text)}</p></div>`;
  },

  renderExtractedData(text) {
    return `<div class="extracted-section"><button class="extracted-trigger" onclick="this.nextElementSibling.classList.toggle('show');this.classList.toggle('open')">📄 Source OCR Data ▼</button><div class="extracted-content"><pre class="extracted-pre">${this.esc(text)}</pre></div></div>`;
  },

  renderReportFooter() {
    return `<div class="report-footer"><span>🛡️ MedWard Clinical Intelligence</span><span>${new Date().toLocaleString()}</span></div>`;
  },

  renderEmpty() {
    return '<div style="text-align:center;padding:3rem;color:rgba(255,255,255,0.4)"><p>📄 No Analysis Data</p><p style="font-size:0.8rem">Upload a medical report to begin</p></div>';
  },

  esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  },

  setupInteractions(container) {},

  renderWardView(results) {
    const container = document.getElementById('ward-view');
    if (!container) return;
    this.injectStyles();
    if (!results) { container.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:2rem;">No data</p>'; return; }
    
    const extractedText = results.rawResponse?.extractedText || '';
    const labs = this.aggressiveLabExtraction(extractedText);
    const { clinicalFindings } = this.separateAIInterpretation(results);
    const severity = this.determineSeverity(results, labs);
    const header = results.rawResponse?.interpretation?.header || results.diagnosis || 'Analysis';
    
    let html = `<div class="elite-report" style="padding:1rem">${this.renderSeverityHeader(severity, header)}`;
    
    if (clinicalFindings.length > 0) {
      html += `<div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:1rem;margin-bottom:1rem"><div style="font-size:0.7rem;font-weight:700;color:rgba(255,255,255,0.5);margin-bottom:0.5rem">KEY FINDINGS</div>${clinicalFindings.slice(0, 4).map(f => `<div style="padding:0.3rem 0;font-size:0.85rem;color:rgba(255,255,255,0.85)">• ${this.esc(f.finding.substring(0, 60))}</div>`).join('')}</div>`;
    }
    
    const abnormalLabs = labs.filter(l => l.isAbnormal);
    if (abnormalLabs.length > 0) {
      html += `<div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:1rem;margin-bottom:1rem"><div style="font-size:0.7rem;font-weight:700;color:#fca5a5;margin-bottom:0.5rem">ABNORMAL LABS (${abnormalLabs.length})</div>${abnormalLabs.slice(0, 6).map(l => `<div style="display:flex;justify-content:space-between;padding:0.3rem 0"><span style="color:rgba(255,255,255,0.9)">${this.esc(l.name)}</span><span style="font-family:monospace;color:#fca5a5;font-weight:600">${this.esc(l.value)}</span></div>`).join('')}</div>`;
    }
    
    const recs = results.recommendations || [];
    if (recs.length > 0) html += this.renderManagementPlan(recs.slice(0, 3));
    
    html += '</div>';
    container.innerHTML = html;
  },

  injectStyles() {
    if (document.getElementById('elite-styles-v54')) return;
    const s = document.createElement('style');
    s.id = 'elite-styles-v54';
    s.textContent = `
.elite-report{font-family:'Outfit',-apple-system,sans-serif;color:rgba(255,255,255,0.9);line-height:1.6}
.severity-header{padding:1.25rem 1.5rem;border-radius:14px;margin-bottom:1.25rem}
.severity-header.critical{background:linear-gradient(135deg,rgba(220,38,38,0.15),rgba(185,28,28,0.08));border:1px solid rgba(220,38,38,0.3);color:#fca5a5}
.severity-header.abnormal{background:linear-gradient(135deg,rgba(217,119,6,0.12),rgba(180,83,9,0.06));border:1px solid rgba(217,119,6,0.3);color:#fcd34d}
.severity-header.normal{background:linear-gradient(135deg,rgba(5,150,105,0.12),rgba(4,120,87,0.06));border:1px solid rgba(5,150,105,0.3);color:#6ee7b7}
.severity-badge{display:inline-flex;align-items:center;gap:0.4rem;padding:0.3rem 0.75rem;border-radius:100px;font-size:0.65rem;font-weight:700;text-transform:uppercase;margin-bottom:0.6rem}
.severity-header.critical .severity-badge{background:rgba(220,38,38,0.2)}
.severity-header.abnormal .severity-badge{background:rgba(217,119,6,0.2)}
.severity-header.normal .severity-badge{background:rgba(5,150,105,0.2)}
.severity-title{font-family:'Playfair Display',Georgia,serif;font-size:1.15rem;font-weight:600;margin:0}
.exec-summary{background:linear-gradient(180deg,rgba(30,58,95,0.3),rgba(30,58,95,0.1));border:1px solid rgba(96,165,250,0.15);border-radius:14px;padding:1.25rem;margin-bottom:1.25rem}
.section-label{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.5);margin-bottom:0.75rem}
.exec-summary-text{font-size:0.9rem;line-height:1.65;color:rgba(255,255,255,0.85)}
.alert-section{margin-bottom:1.25rem}
.elite-alert{display:flex;gap:0.875rem;padding:0.875rem 1rem;border-radius:10px;margin-bottom:0.5rem;border-left:3px solid}
.elite-alert.critical{background:rgba(220,38,38,0.08);border-left-color:#dc2626}
.elite-alert.warning{background:rgba(217,119,6,0.08);border-left-color:#d97706}
.alert-title{font-weight:600;font-size:0.85rem;color:#fca5a5;margin-bottom:0.1rem}
.alert-desc{font-size:0.8rem;color:rgba(255,255,255,0.7)}
.clinical-findings-section{background:rgba(15,23,42,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;margin-bottom:1.25rem}
.section-header-bar{padding:0.875rem 1.25rem;background:linear-gradient(180deg,rgba(255,255,255,0.03),transparent);border-bottom:1px solid rgba(255,255,255,0.06)}
.section-header-bar h3{font-family:'Playfair Display',Georgia,serif;font-size:1rem;font-weight:600;margin:0}
.findings-grid{padding:0.875rem;display:grid;gap:0.75rem}
.finding-category{background:rgba(0,0,0,0.2);border-radius:10px;padding:0.875rem;border-left:3px solid #6b7280}
.finding-category-header{display:flex;align-items:center;gap:0.4rem;margin-bottom:0.6rem;font-size:0.7rem;font-weight:700;text-transform:uppercase}
.finding-list{list-style:none;margin:0;padding:0}
.finding-item{padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.85rem;color:rgba(255,255,255,0.85)}
.lab-category-section{background:rgba(15,23,42,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;margin-bottom:1rem}
.lab-category-header{display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1.25rem;background:linear-gradient(180deg,rgba(255,255,255,0.03),transparent);border-bottom:1px solid rgba(255,255,255,0.06)}
.lab-category-header h3{font-family:'Playfair Display',Georgia,serif;font-size:0.95rem;font-weight:600;margin:0}
.lab-count{font-size:0.65rem;color:rgba(255,255,255,0.5)}
.lab-table{width:100%;border-collapse:collapse}
.lab-table thead th{padding:0.6rem 0.875rem;text-align:left;font-size:0.55rem;font-weight:700;text-transform:uppercase;color:rgba(255,255,255,0.4);background:rgba(0,0,0,0.2)}
.lab-table tbody tr{transition:background 0.15s}
.lab-table tbody tr:hover{background:rgba(255,255,255,0.02)}
.lab-table tbody tr.abnormal-row{background:rgba(239,68,68,0.04)}
.lab-table tbody td{padding:0.55rem 0.875rem;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.8rem}
.lab-value{font-family:'JetBrains Mono',monospace;font-weight:600}
.lab-value.high,.lab-value.critical{color:#fca5a5}
.lab-value.low{color:#93c5fd}
.lab-value.normal{color:#6ee7b7}
.lab-ref{font-size:0.65rem;color:rgba(255,255,255,0.4);font-family:monospace}
.lab-status{display:inline-flex;align-items:center;gap:0.2rem;padding:0.15rem 0.4rem;border-radius:5px;font-size:0.55rem;font-weight:600;text-transform:uppercase}
.lab-status.high,.lab-status.critical{background:rgba(220,38,38,0.15);color:#fca5a5}
.lab-status.low{background:rgba(59,130,246,0.15);color:#93c5fd}
.lab-status.normal{background:rgba(5,150,105,0.1);color:#6ee7b7}
.interpretation-panel{background:linear-gradient(135deg,rgba(139,92,246,0.08),rgba(109,40,217,0.04));border:1px solid rgba(139,92,246,0.2);border-radius:14px;padding:1.25rem;margin-bottom:1.25rem}
.interpretation-title{font-family:'Playfair Display',Georgia,serif;font-size:1rem;font-weight:600;color:#c4b5fd;margin-bottom:0.875rem}
.interpretation-content{font-size:0.85rem;line-height:1.6;color:rgba(255,255,255,0.8)}
.interpretation-action{margin-top:1rem;padding:0.875rem;background:rgba(139,92,246,0.1);border-radius:8px;font-size:0.8rem;color:rgba(255,255,255,0.85)}
.management-section{background:rgba(15,23,42,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;margin-bottom:1.25rem}
.management-header{padding:0.875rem 1.25rem;background:linear-gradient(180deg,rgba(255,255,255,0.03),transparent);border-bottom:1px solid rgba(255,255,255,0.06)}
.management-header h3{font-family:'Playfair Display',Georgia,serif;font-size:1rem;font-weight:600;margin:0}
.management-list{padding:0.4rem}
.management-item{display:flex;align-items:flex-start;gap:0.75rem;padding:0.75rem;border-radius:8px;margin-bottom:0.2rem}
.management-item:hover{background:rgba(255,255,255,0.02)}
.management-item.priority{background:rgba(220,38,38,0.06);border:1px solid rgba(220,38,38,0.12)}
.management-num{width:24px;height:24px;background:rgba(255,255,255,0.1);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:rgba(255,255,255,0.7);flex-shrink:0}
.management-item.priority .management-num{background:#dc2626;color:white}
.pearl-section{background:linear-gradient(135deg,rgba(251,191,36,0.08),rgba(245,158,11,0.04));border:1px solid rgba(251,191,36,0.2);border-radius:14px;padding:1rem;margin-bottom:1.25rem}
.pearl-label{font-size:0.65rem;font-weight:700;text-transform:uppercase;color:#fbbf24;margin-bottom:0.4rem}
.pearl-text{font-size:0.85rem;line-height:1.6;color:rgba(255,255,255,0.85);font-style:italic}
.patient-section{background:linear-gradient(135deg,rgba(6,182,212,0.08),rgba(8,145,178,0.04));border:1px solid rgba(6,182,212,0.2);border-radius:14px;padding:1.25rem;margin-bottom:1.25rem}
.patient-header{font-size:0.65rem;font-weight:600;text-transform:uppercase;color:#22d3ee;margin-bottom:0.75rem}
.patient-text{font-size:0.85rem;line-height:1.6;color:rgba(255,255,255,0.8)}
.extracted-section{border:1px solid rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;margin-bottom:1.25rem}
.extracted-trigger{width:100%;display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1rem;background:rgba(255,255,255,0.02);border:none;color:rgba(255,255,255,0.6);font-family:inherit;font-size:0.8rem;cursor:pointer}
.extracted-trigger:hover{background:rgba(255,255,255,0.04)}
.extracted-content{display:none;padding:0.875rem;background:rgba(0,0,0,0.2);border-top:1px solid rgba(255,255,255,0.06)}
.extracted-content.show{display:block}
.extracted-pre{font-family:monospace;font-size:0.65rem;line-height:1.5;color:rgba(255,255,255,0.6);white-space:pre-wrap;max-height:250px;overflow-y:auto;margin:0}
.report-footer{display:flex;align-items:center;justify-content:space-between;padding:0.875rem 0;border-top:1px solid rgba(255,255,255,0.06);margin-top:0.875rem;font-size:0.65rem;color:rgba(255,255,255,0.4)}
`;
    document.head.appendChild(s);
  }
};

if (typeof window !== 'undefined') window.ClinicalComponents = ClinicalComponents;
