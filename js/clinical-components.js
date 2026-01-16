/**
 * MedWard Clinical Components v5.3 - Aggressive Lab Extraction
 * Extracts lab values directly from extractedText when AI interpretation is incomplete
 * Professional medical institution styling
 */

const ClinicalComponents = {
  
  // Reference ranges for known labs
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
    probnp: { name: 'NT-proBNP', min: 0, max: 900, unit: 'pg/ml', category: 'Cardiac Markers' },
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
    
    // AGGRESSIVE LAB EXTRACTION from extractedText
    const extractedText = results.rawResponse?.extractedText || '';
    const aggressiveLabValues = this.aggressiveLabExtraction(extractedText);
    
    // Separate AI interpretations into clinical findings vs lab values
    const { clinicalFindings, aiLabValues } = this.separateAIInterpretation(results);
    
    // Merge: prefer aggressive extraction, supplement with AI values
    const finalLabValues = this.mergeLabValues(aggressiveLabValues, aiLabValues);
    
    let html = '<div class="elite-report">';
    
    // SEVERITY HEADER
    const severity = this.determineSeverity(results, finalLabValues);
    html += this.renderSeverityHeader(severity, results);
    
    // EXECUTIVE SUMMARY
    if (results.summary || results.rawResponse?.interpretation?.summary) {
      html += this.renderExecutiveSummary(results);
    }
    
    // CRITICAL ALERTS
    if (results.alerts && results.alerts.length > 0) {
      html += this.renderCriticalAlerts(results.alerts);
    }
    
    // CLINICAL FINDINGS
    if (clinicalFindings.length > 0) {
      html += this.renderClinicalFindings(clinicalFindings);
    }
    
    // LABORATORY VALUES
    if (finalLabValues.length > 0) {
      html += this.renderLabValues(finalLabValues);
    }
    
    // CLINICAL INTERPRETATION
    if (results.rawResponse?.interpretation?.value || results.rawResponse?.interpretation?.action) {
      html += this.renderClinicalInterpretation(results.rawResponse.interpretation);
    }
    
    // MANAGEMENT RECOMMENDATIONS
    if (results.recommendations && results.recommendations.length > 0) {
      html += this.renderManagementPlan(results.recommendations);
    }
    
    // CLINICAL PEARLS
    if (results.clinicalPearl) {
      html += this.renderClinicalPearl(results.clinicalPearl);
    }
    
    // PATIENT COMMUNICATION
    const patientExp = results.patientExplanation || results.rawResponse?.interpretation?.patientFriendly;
    if (patientExp) {
      html += this.renderPatientCommunication(patientExp);
    }
    
    // EXTRACTED DATA (collapsible)
    if (extractedText) {
      html += this.renderExtractedData(extractedText);
    }
    
    // FOOTER
    html += this.renderReportFooter();
    html += '</div>';
    
    container.innerHTML = html;
    this.setupInteractions(container);
  },

  /**
   * AGGRESSIVE lab extraction from raw OCR text
   * This is the KEY function that extracts labs even when AI fails
   */
  aggressiveLabExtraction(text) {
    if (!text) return [];
    
    const labs = [];
    const foundLabs = new Set();
    
    // Normalize text
    const normalized = text.replace(/\s+/g, ' ');
    
    // Define extraction patterns - VERY specific for lab reports
    const patterns = [
      // Pattern: "Gluc * 11.6 H" or "Gluc* 11.6 H"
      { key: 'glucose', regex: /gluc(?:ose)?\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Urea
      { key: 'urea', regex: /\burea\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Creatinine - "Creat * 186" or "Creatinine 160"
      { key: 'creatinine', regex: /creat(?:inine)?\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Sodium - "Na * 132" or "Sodium 132"
      { key: 'sodium', regex: /\b(?:na|sodium)\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Potassium - "K * 7.15"
      { key: 'potassium', regex: /\b(?:k|potassium)\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Chloride
      { key: 'chloride', regex: /\b(?:cl|chloride)\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // CO2
      { key: 'co2', regex: /\bco2\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Calcium - "Ca * 2.44" 
      { key: 'calcium', regex: /\bca(?:lcium)?\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Magnesium - "Mg * 0.93"
      { key: 'magnesium', regex: /\bmg\s*\*?\s*(0\.\d+|\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Phosphate - "Phos * 2.07"
      { key: 'phosphate', regex: /phos(?:phate)?\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Urate - "Urate * 754"
      { key: 'urate', regex: /urate\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // ALT - "ALT * >500" or "ALT >500 H"
      { key: 'alt', regex: /\balt\s*\*?\s*([>]?\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // AST - "AST * >1000"
      { key: 'ast', regex: /\bast\s*\*?\s*([>]?\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // GGT
      { key: 'ggt', regex: /\bggt\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Alk Phos
      { key: 'alkphos', regex: /alk\.?\s*phos\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // T. Bil - "T. Bil * 24.5"
      { key: 'tbilirubin', regex: /t\.?\s*bil(?:irubin)?\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // D. Bil
      { key: 'dbilirubin', regex: /d\.?\s*bil(?:irubin)?\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Albumin
      { key: 'albumin', regex: /albumin\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // T. Protein
      { key: 'protein', regex: /t\.?\s*protein\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // WBC
      { key: 'wbc', regex: /\bwbc\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Hemoglobin - "Hb 130"
      { key: 'hemoglobin', regex: /\b(?:hb|hgb|hemoglobin)\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Platelets - "Plt 189"
      { key: 'platelets', regex: /\b(?:plt|platelet)\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // PT
      { key: 'pt', regex: /\bpt\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?(?:\s*sec)?/gi },
      // INR
      { key: 'inr', regex: /\binr\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // APTT
      { key: 'aptt', regex: /\baptt\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Troponin - "Troponin I 30.70" or "HS Troponin I 42.20 HH"
      { key: 'troponin', regex: /(?:hs\s*)?troponin\s*[I]?\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // NT-proBNP - "NT proBNP 3703"
      { key: 'probnp', regex: /(?:nt[- ]?)?probnp\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // eGFR
      { key: 'egfr', regex: /egfr\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // Anion Gap
      { key: 'aniongap', regex: /anion\s*gap\s*\*?\s*(\d+(?:\.\d+)?)\s*(H|HH|L|LL)?/gi },
      // pH - "ph:7.26" or "ph 7.31"
      { key: 'ph', regex: /\bph\s*[:\*]?\s*(7\.\d+)/gi },
      // pCO2
      { key: 'pco2', regex: /pco2\s*[:\*]?\s*(\d+(?:\.\d+)?)/gi },
      // HCO3
      { key: 'hco3', regex: /hco3\s*[:\*]?\s*(\d+(?:\.\d+)?)/gi },
      // Lactate - "lac :9" or "lactate 9"
      { key: 'lactate', regex: /\b(?:lac|lactate)\s*[:\*]?\s*(\d+(?:\.\d+)?)/gi }
    ];
    
    // Extract using patterns
    patterns.forEach(p => {
      let match;
      while ((match = p.regex.exec(normalized)) !== null) {
        if (foundLabs.has(p.key)) continue; // Skip if already found
        
        const valueStr = match[1];
        const flag = match[2] ? match[2].toUpperCase() : null;
        const ref = this.labRanges[p.key];
        
        if (!ref) continue;
        
        // Parse value (handle >500 format)
        let value = valueStr.startsWith('>') ? valueStr : parseFloat(valueStr);
        let displayValue = typeof value === 'string' ? value : value.toString();
        let numericValue = typeof value === 'string' ? parseFloat(value.replace('>', '')) : value;
        
        // Determine status
        let status = 'normal';
        if (flag === 'HH' || (ref.critical && numericValue >= ref.critical)) {
          status = 'critical';
        } else if (flag === 'H' || numericValue > ref.max) {
          status = 'high';
        } else if (flag === 'LL' || flag === 'L' || numericValue < ref.min) {
          status = 'low';
        }
        
        foundLabs.add(p.key);
        labs.push({
          key: p.key,
          name: ref.name,
          value: displayValue + (ref.unit ? ' ' + ref.unit : ''),
          rawValue: numericValue,
          reference: `${ref.min}-${ref.max} ${ref.unit}`,
          status: status,
          statusLabel: status === 'critical' ? 'Critical' : status.charAt(0).toUpperCase() + status.slice(1),
          category: ref.category,
          isAbnormal: status !== 'normal'
        });
      }
    });
    
    return labs;
  },

  /**
   * Separate AI interpretation into clinical findings vs attempted lab values
   */
  separateAIInterpretation(results) {
    const clinicalFindings = [];
    const aiLabValues = [];
    
    const abnormalities = results.rawResponse?.interpretation?.abnormalities || [];
    
    // Clinical keywords that indicate it's NOT a lab value
    const clinicalKeywords = [
      'dyspnea', 'orthopnea', 'pnd', 'edema', 'pain', 'discomfort', 'nausea', 'vomiting',
      'fever', 'cough', 'wheeze', 'crackles', 'murmur', 'jvp', 'hepatomegaly', 'ascites',
      'confusion', 'weakness', 'fatigue', 'examination', 'physical', 'inspection',
      'history', 'presenting', 'complaint', 'symptom', 'sign', 'diagnosis', 'impression',
      'nyha', 'class', 'grade', 'bilateral', 'unilateral', 'acute', 'chronic',
      'decompensated', 'secondary to', 'due to', 'consistent with', 'intervention',
      'hypoxemia', 'hypoxia', 'hypotension', 'hypertension', 'tachycardia',
      'congestion', 'overload', 'failure', 'improvement', 'after lasix', 'clinical'
    ];
    
    abnormalities.forEach(item => {
      const text = typeof item === 'string' ? item : (item.finding || item.text || '');
      if (!text) return;
      
      const lower = text.toLowerCase();
      
      // Check if it's clinical (contains clinical keywords OR no number)
      const hasNumber = /\d+(\.\d+)?/.test(text);
      const clinicalScore = clinicalKeywords.filter(k => lower.includes(k)).length;
      
      if (clinicalScore >= 1 || !hasNumber || text.length > 80) {
        clinicalFindings.push({
          finding: text,
          type: this.classifyClinicalFinding(text)
        });
      } else {
        // Try to parse as lab value
        const parsed = this.parseLabFromAI(text);
        if (parsed && parsed.value !== '-') {
          aiLabValues.push(parsed);
        } else {
          clinicalFindings.push({
            finding: text,
            type: 'general'
          });
        }
      }
    });
    
    // Also check results.findings
    if (results.findings) {
      results.findings.forEach(f => {
        if (f.value && f.value !== '-' && /\d/.test(f.value)) {
          aiLabValues.push({
            name: f.name,
            value: f.value,
            reference: f.reference || '-',
            status: f.status || 'normal',
            statusLabel: f.status || 'Normal',
            isAbnormal: f.status?.toLowerCase() !== 'normal',
            category: 'Other'
          });
        } else if (f.name) {
          clinicalFindings.push({
            finding: f.name + (f.value && f.value !== '-' ? ': ' + f.value : ''),
            type: this.classifyClinicalFinding(f.name)
          });
        }
      });
    }
    
    return { clinicalFindings, aiLabValues };
  },

  /**
   * Parse a potential lab value from AI text
   */
  parseLabFromAI(text) {
    // Try to extract: "AST 966 HH" or "Creatinine 160 (elevated)"
    const match = text.match(/^([A-Za-z][A-Za-z\s\.\-\/]*?)\s*[:\*]?\s*([>]?\d+(?:\.\d+)?)\s*([A-Za-z\/\%]*)?/i);
    if (match) {
      return {
        name: match[1].trim(),
        value: match[2] + (match[3] ? ' ' + match[3] : ''),
        reference: '-',
        status: text.includes('H') ? 'high' : text.includes('L') ? 'low' : 'normal',
        statusLabel: text.includes('HH') ? 'Critical' : text.includes('H') ? 'High' : text.includes('L') ? 'Low' : 'Normal',
        isAbnormal: /H|L/i.test(text),
        category: 'Other'
      };
    }
    return null;
  },

  /**
   * Merge aggressive extraction with AI values (prefer aggressive)
   */
  mergeLabValues(aggressive, ai) {
    const merged = [...aggressive];
    const existingNames = new Set(aggressive.map(l => l.name.toLowerCase()));
    
    ai.forEach(lab => {
      if (!existingNames.has(lab.name.toLowerCase())) {
        merged.push(lab);
      }
    });
    
    return merged;
  },

  /**
   * Classify clinical finding type
   */
  classifyClinicalFinding(text) {
    const t = text.toLowerCase();
    if (t.includes('dyspnea') || t.includes('breath') || t.includes('resp') || t.includes('pulmonary') || t.includes('spo2') || t.includes('hypox') || t.includes('crackle')) return 'respiratory';
    if (t.includes('cardiac') || t.includes('heart') || t.includes('nyha') || t.includes('edema') || t.includes('jvp') || t.includes('murmur') || t.includes('bp') || t.includes('decompensated')) return 'cardiovascular';
    if (t.includes('abdom') || t.includes('hepat') || t.includes('liver') || t.includes('nausea') || t.includes('oral') || t.includes('appetite') || t.includes('congestion')) return 'gastrointestinal';
    if (t.includes('neuro') || t.includes('conscious') || t.includes('gcs') || t.includes('orient')) return 'neurological';
    if (t.includes('renal') || t.includes('kidney') || t.includes('aki') || t.includes('ckd')) return 'renal';
    if (t.includes('exam') || t.includes('physical') || t.includes('bilateral') || t.includes('pitting')) return 'examination';
    if (t.includes('impression') || t.includes('diagnosis') || t.includes('assessment')) return 'impression';
    if (t.includes('improvement') || t.includes('lasix') || t.includes('clinical')) return 'progress';
    return 'general';
  },

  /**
   * Render clinical findings
   */
  renderClinicalFindings(findings) {
    const grouped = {};
    findings.forEach(f => {
      const type = f.type || 'general';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(f);
    });
    
    const typeConfig = {
      respiratory: { label: 'Respiratory', icon: '🫁', color: '#06b6d4' },
      cardiovascular: { label: 'Cardiovascular', icon: '❤️', color: '#ef4444' },
      gastrointestinal: { label: 'Gastrointestinal', icon: '🔶', color: '#f59e0b' },
      neurological: { label: 'Neurological', icon: '🧠', color: '#8b5cf6' },
      renal: { label: 'Renal', icon: '💧', color: '#3b82f6' },
      examination: { label: 'Physical Exam', icon: '🩺', color: '#10b981' },
      impression: { label: 'Impression', icon: '📋', color: '#f43f5e' },
      progress: { label: 'Progress', icon: '📈', color: '#22c55e' },
      general: { label: 'General', icon: '📝', color: '#6b7280' }
    };
    
    const order = ['impression', 'cardiovascular', 'respiratory', 'renal', 'gastrointestinal', 'neurological', 'examination', 'progress', 'general'];
    
    let html = `<div class="clinical-findings-section"><div class="section-header-bar"><div class="section-header-icon gold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 14l2 2 4-4"/></svg></div><div><h3>Clinical Assessment</h3><span class="section-subtitle">${findings.length} findings</span></div></div><div class="findings-grid">`;
    
    for (const type of order) {
      const items = grouped[type];
      if (!items || items.length === 0) continue;
      const cfg = typeConfig[type];
      html += `<div class="finding-category" style="border-left-color:${cfg.color};"><div class="finding-category-header"><span class="finding-category-icon">${cfg.icon}</span><span class="finding-category-label" style="color:${cfg.color};">${cfg.label}</span></div><ul class="finding-list">${items.map(i => `<li class="finding-item"><span class="finding-bullet" style="background:${cfg.color};"></span><div class="finding-content"><span class="finding-text">${this.escapeHtml(i.finding)}</span></div></li>`).join('')}</ul></div>`;
    }
    
    html += '</div></div>';
    return html;
  },

  /**
   * Render laboratory values
   */
  renderLabValues(labs) {
    if (labs.length === 0) return '';
    
    // Group by category
    const categories = {};
    labs.forEach(lab => {
      const cat = lab.category || 'Other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(lab);
    });
    
    const colors = {
      'Renal Function': { bg: '#3b82f6', light: 'rgba(59,130,246,0.15)' },
      'Electrolytes': { bg: '#8b5cf6', light: 'rgba(139,92,246,0.15)' },
      'Liver Function': { bg: '#f59e0b', light: 'rgba(245,158,11,0.15)' },
      'Cardiac Markers': { bg: '#ef4444', light: 'rgba(239,68,68,0.15)' },
      'Hematology': { bg: '#ec4899', light: 'rgba(236,72,153,0.15)' },
      'Coagulation': { bg: '#14b8a6', light: 'rgba(20,184,166,0.15)' },
      'Blood Gas': { bg: '#06b6d4', light: 'rgba(6,182,212,0.15)' },
      'Metabolic': { bg: '#22c55e', light: 'rgba(34,197,94,0.15)' },
      'Other': { bg: '#6b7280', light: 'rgba(107,114,128,0.15)' }
    };
    
    const order = ['Blood Gas', 'Cardiac Markers', 'Renal Function', 'Electrolytes', 'Liver Function', 'Hematology', 'Coagulation', 'Metabolic', 'Other'];
    let html = '';
    
    for (const cat of order) {
      const items = categories[cat];
      if (!items || items.length === 0) continue;
      
      const col = colors[cat] || colors['Other'];
      const abnormal = items.filter(i => i.isAbnormal).length;
      
      html += `<div class="lab-category-section"><div class="lab-category-header" style="border-left:4px solid ${col.bg};"><div class="lab-category-title"><div class="lab-category-icon" style="background:${col.light};color:${col.bg};"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div><div><h3>${cat}</h3><span class="lab-category-count">${items.length} tests${abnormal > 0 ? ` · <span class="abnormal-count">${abnormal} abnormal</span>` : ''}</span></div></div></div><table class="lab-table"><thead><tr><th>Parameter</th><th>Result</th><th>Reference</th><th>Status</th></tr></thead><tbody>${items.map(lab => {const sc = lab.status === 'critical' ? 'critical' : lab.status; return `<tr class="${lab.isAbnormal ? 'abnormal-row' : ''}"><td class="lab-name">${this.escapeHtml(lab.name)}</td><td class="lab-value ${sc}">${this.escapeHtml(lab.value)}</td><td class="lab-reference">${this.escapeHtml(lab.reference)}</td><td><span class="lab-status ${sc}">${sc === 'critical' || sc === 'high' ? '↑' : sc === 'low' ? '↓' : '•'} ${this.escapeHtml(lab.statusLabel)}</span></td></tr>`;}).join('')}</tbody></table></div>`;
    }
    
    return html;
  },

  determineSeverity(results, labs) {
    // Check labs for critical values
    const hasCritical = labs.some(l => l.status === 'critical');
    if (hasCritical) return 'critical';
    
    const hasAbnormal = labs.some(l => l.isAbnormal);
    const t = JSON.stringify(results).toLowerCase();
    if (t.includes('critical') || t.includes('emergency') || t.includes('severe')) return 'critical';
    if (hasAbnormal || t.includes('abnormal') || t.includes('elevated') || t.includes('decompensated')) return 'abnormal';
    return 'normal';
  },

  renderSeverityHeader(severity, results) {
    const icons = { critical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', abnormal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>', normal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' };
    const header = results.rawResponse?.interpretation?.header || results.diagnosis || 'Clinical Analysis';
    return `<div class="severity-header ${severity}"><div class="severity-badge">${icons[severity]} ${severity.toUpperCase()}</div><h2 class="severity-title">${this.escapeHtml(header)}</h2></div>`;
  },

  renderExecutiveSummary(results) {
    const summary = results.rawResponse?.interpretation?.summary || results.summary;
    return `<div class="exec-summary"><div class="section-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Executive Summary</div><p class="exec-summary-text">${this.escapeHtml(summary)}</p></div>`;
  },

  renderCriticalAlerts(alerts) {
    return `<div class="alert-section">${alerts.map(a => `<div class="elite-alert ${a.severity === 'critical' ? 'critical' : 'warning'}"><div class="alert-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${a.severity === 'critical' ? '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}</svg></div><div class="alert-body"><div class="alert-title">${this.escapeHtml(a.title || 'Alert')}</div><div class="alert-desc">${this.escapeHtml(a.text || '')}</div></div></div>`).join('')}</div>`;
  },

  renderClinicalInterpretation(interpretation) {
    const value = interpretation.value || '';
    const action = interpretation.action || '';
    if (!value && !action) return '';
    return `<div class="interpretation-panel"><div class="interpretation-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Clinical Interpretation</div>${value ? `<div class="interpretation-content">${this.escapeHtml(value)}</div>` : ''}${action ? `<div class="interpretation-action"><div class="action-label">Recommended Action</div><div class="action-text">${this.escapeHtml(action)}</div></div>` : ''}</div>`;
  },

  renderManagementPlan(recommendations) {
    return `<div class="management-section"><div class="management-header"><div class="management-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><h3>Management Plan</h3></div><div class="management-list">${recommendations.map((r, i) => {const text = typeof r === 'string' ? r : (r.text || r); return `<div class="management-item ${i === 0 ? 'priority' : ''}"><span class="management-num">${i + 1}</span><span class="management-text">${this.escapeHtml(text)}</span></div>`;}).join('')}</div></div>`;
  },

  renderClinicalPearl(pearl) {
    return `<div class="pearl-section"><div class="pearl-label">Clinical Pearl</div><p class="pearl-text">${this.escapeHtml(pearl)}</p></div>`;
  },

  renderPatientCommunication(text) {
    return `<div class="patient-section"><div class="patient-header"><div class="patient-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><span class="patient-label">Patient Communication</span></div><p class="patient-text">${this.escapeHtml(text)}</p></div>`;
  },

  renderExtractedData(text) {
    return `<div class="extracted-section"><button class="extracted-trigger"><span>📄 Source OCR Data</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button><div class="extracted-content"><pre class="extracted-pre">${this.escapeHtml(text)}</pre></div></div>`;
  },

  renderReportFooter() {
    return `<div class="report-footer"><div class="footer-brand"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7v10c0 5.5 3.8 9.7 10 11 6.2-1.3 10-5.5 10-11V7l-10-5z"/></svg>MedWard Clinical Intelligence</div><div class="footer-timestamp">${new Date().toLocaleString()}</div></div>`;
  },

  renderWardView(results) {
    const container = document.getElementById('ward-view');
    if (!container) return;
    this.injectStyles();
    if (!results) { container.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:2rem;">No data</p>'; return; }
    
    const extractedText = results.rawResponse?.extractedText || '';
    const labs = this.aggressiveLabExtraction(extractedText);
    const { clinicalFindings } = this.separateAIInterpretation(results);
    const severity = this.determineSeverity(results, labs);
    
    let html = `<div class="elite-report" style="padding:0.875rem;">${this.renderSeverityHeader(severity, results)}`;
    
    if (clinicalFindings.length > 0) {
      html += `<div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:0.875rem;margin-bottom:0.875rem;"><div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.5);margin-bottom:0.6rem;">Key Findings</div>${clinicalFindings.slice(0, 4).map(f => `<div style="padding:0.35rem 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.8rem;color:rgba(255,255,255,0.85);">• ${this.escapeHtml(f.finding.length > 60 ? f.finding.substring(0, 60) + '...' : f.finding)}</div>`).join('')}</div>`;
    }
    
    const abnormalLabs = labs.filter(l => l.isAbnormal);
    if (abnormalLabs.length > 0) {
      html += `<div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:0.875rem;margin-bottom:0.875rem;"><div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#fca5a5;margin-bottom:0.6rem;">Abnormal Labs (${abnormalLabs.length})</div>${abnormalLabs.slice(0, 6).map(l => `<div style="display:flex;justify-content:space-between;padding:0.35rem 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:rgba(255,255,255,0.9);font-size:0.8rem;">${this.escapeHtml(l.name)}</span><span style="font-family:monospace;color:#fca5a5;font-weight:600;font-size:0.8rem;">${this.escapeHtml(l.value)}</span></div>`).join('')}</div>`;
    }
    
    if (results.recommendations && results.recommendations.length > 0) {
      html += this.renderManagementPlan(results.recommendations.slice(0, 3));
    }
    
    html += '</div>';
    container.innerHTML = html;
  },

  renderEmpty() {
    return `<div style="text-align:center;padding:3rem 1.5rem;color:rgba(255,255,255,0.4);"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom:1.25rem;opacity:0.3;"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg><p style="font-size:0.95rem;margin-bottom:0.4rem;">No Analysis Data</p><p style="font-size:0.8rem;opacity:0.7;">Upload a medical report to begin</p></div>`;
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  setupInteractions(container) {
    container.querySelectorAll('.extracted-trigger').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const content = trigger.nextElementSibling;
        trigger.classList.toggle('open', !content.classList.contains('show'));
        content.classList.toggle('show');
      });
    });
  },

  injectStyles() {
    if (document.getElementById('elite-styles-v53')) return;
    const s = document.createElement('style');
    s.id = 'elite-styles-v53';
    s.textContent = `.elite-report{font-family:'Outfit',-apple-system,BlinkMacSystemFont,sans-serif;color:rgba(255,255,255,0.9);line-height:1.6}.severity-header{position:relative;padding:1.25rem 1.5rem;border-radius:14px;margin-bottom:1.25rem;overflow:hidden}.severity-header::before{content:'';position:absolute;inset:0;opacity:0.03;background:repeating-linear-gradient(-45deg,transparent,transparent 10px,currentColor 10px,currentColor 11px)}.severity-header.critical{background:linear-gradient(135deg,rgba(220,38,38,0.15) 0%,rgba(185,28,28,0.08) 100%);border:1px solid rgba(220,38,38,0.3);color:#fca5a5}.severity-header.abnormal{background:linear-gradient(135deg,rgba(217,119,6,0.12) 0%,rgba(180,83,9,0.06) 100%);border:1px solid rgba(217,119,6,0.3);color:#fcd34d}.severity-header.normal{background:linear-gradient(135deg,rgba(5,150,105,0.12) 0%,rgba(4,120,87,0.06) 100%);border:1px solid rgba(5,150,105,0.3);color:#6ee7b7}.severity-badge{display:inline-flex;align-items:center;gap:0.4rem;padding:0.3rem 0.75rem;border-radius:100px;font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.6rem}.severity-header.critical .severity-badge{background:rgba(220,38,38,0.2);color:#fca5a5;animation:pulse 2s ease-in-out infinite}.severity-header.abnormal .severity-badge{background:rgba(217,119,6,0.2);color:#fcd34d}.severity-header.normal .severity-badge{background:rgba(5,150,105,0.2);color:#6ee7b7}@keyframes pulse{0%,100%{box-shadow:0 0 15px rgba(220,38,38,0.3)}50%{box-shadow:0 0 25px rgba(220,38,38,0.5)}}.severity-title{font-family:'Playfair Display',Georgia,serif;font-size:1.15rem;font-weight:600;margin:0;line-height:1.3}.exec-summary{background:linear-gradient(180deg,rgba(30,58,95,0.3) 0%,rgba(30,58,95,0.1) 100%);border:1px solid rgba(96,165,250,0.15);border-radius:14px;padding:1.25rem 1.5rem;margin-bottom:1.25rem;position:relative}.exec-summary::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#3b82f6 0%,#93c5fd 100%);border-radius:14px 14px 0 0}.section-label{display:flex;align-items:center;gap:0.4rem;font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.5);margin-bottom:0.75rem}.section-label svg{width:13px;height:13px;opacity:0.7}.exec-summary-text{font-size:0.9rem;line-height:1.65;color:rgba(255,255,255,0.85)}.alert-section{margin-bottom:1.25rem}.elite-alert{display:flex;gap:0.875rem;padding:0.875rem 1rem;border-radius:10px;margin-bottom:0.5rem;position:relative;overflow:hidden}.elite-alert::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px}.elite-alert.critical{background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.2)}.elite-alert.critical::before{background:#dc2626}.elite-alert.warning{background:rgba(217,119,6,0.08);border:1px solid rgba(217,119,6,0.2)}.elite-alert.warning::before{background:#d97706}.alert-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.elite-alert.critical .alert-icon{background:rgba(220,38,38,0.2);color:#fca5a5}.elite-alert.warning .alert-icon{background:rgba(217,119,6,0.2);color:#fcd34d}.alert-icon svg{width:16px;height:16px}.alert-body{flex:1;min-width:0}.alert-title{font-weight:600;font-size:0.85rem;margin-bottom:0.1rem}.elite-alert.critical .alert-title{color:#fca5a5}.elite-alert.warning .alert-title{color:#fcd34d}.alert-desc{font-size:0.8rem;color:rgba(255,255,255,0.7);line-height:1.4}.clinical-findings-section{background:rgba(15,23,42,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;margin-bottom:1.25rem}.section-header-bar{display:flex;align-items:center;gap:0.65rem;padding:0.875rem 1.25rem;background:linear-gradient(180deg,rgba(255,255,255,0.03) 0%,transparent 100%);border-bottom:1px solid rgba(255,255,255,0.06)}.section-header-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center}.section-header-icon.gold{background:linear-gradient(135deg,#f0c674 0%,#d4a843 100%)}.section-header-icon svg{width:18px;height:18px;color:#0a0a0f}.section-header-bar h3{font-family:'Playfair Display',Georgia,serif;font-size:1rem;font-weight:600;margin:0}.section-subtitle{font-size:0.7rem;color:rgba(255,255,255,0.5)}.findings-grid{padding:0.875rem;display:grid;gap:0.75rem}.finding-category{background:rgba(0,0,0,0.2);border-radius:10px;padding:0.875rem;border-left:3px solid #6b7280}.finding-category-header{display:flex;align-items:center;gap:0.4rem;margin-bottom:0.6rem}.finding-category-icon{font-size:0.9rem}.finding-category-label{font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em}.finding-list{list-style:none;margin:0;padding:0}.finding-item{display:flex;align-items:flex-start;gap:0.6rem;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)}.finding-item:last-child{border-bottom:none}.finding-bullet{width:5px;height:5px;border-radius:50%;margin-top:0.45rem;flex-shrink:0}.finding-content{flex:1}.finding-text{font-size:0.85rem;color:rgba(255,255,255,0.85);line-height:1.45}.lab-category-section{background:rgba(15,23,42,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;margin-bottom:1rem}.lab-category-header{display:flex;align-items:center;padding:0.875rem 1.25rem;background:linear-gradient(180deg,rgba(255,255,255,0.03) 0%,transparent 100%);border-bottom:1px solid rgba(255,255,255,0.06)}.lab-category-title{display:flex;align-items:center;gap:0.65rem}.lab-category-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center}.lab-category-icon svg{width:18px;height:18px}.lab-category-title h3{font-family:'Playfair Display',Georgia,serif;font-size:0.95rem;font-weight:600;margin:0}.lab-category-count{font-size:0.65rem;color:rgba(255,255,255,0.5)}.abnormal-count{color:#fca5a5}.lab-table{width:100%;border-collapse:collapse}.lab-table thead th{padding:0.6rem 0.875rem;text-align:left;font-size:0.55rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.4);background:rgba(0,0,0,0.2);border-bottom:1px solid rgba(255,255,255,0.06)}.lab-table tbody tr{transition:background 0.15s ease}.lab-table tbody tr:hover{background:rgba(255,255,255,0.02)}.lab-table tbody tr.abnormal-row{background:rgba(239,68,68,0.04)}.lab-table tbody tr.abnormal-row:hover{background:rgba(239,68,68,0.07)}.lab-table tbody td{padding:0.55rem 0.875rem;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.8rem}.lab-table tbody tr:last-child td{border-bottom:none}.lab-name{font-weight:500;color:rgba(255,255,255,0.9)}.lab-value{font-family:'JetBrains Mono',monospace;font-weight:600;font-size:0.8rem}.lab-value.high,.lab-value.critical{color:#fca5a5}.lab-value.low{color:#93c5fd}.lab-value.normal{color:#6ee7b7}.lab-reference{font-size:0.65rem;color:rgba(255,255,255,0.4);font-family:monospace}.lab-status{display:inline-flex;align-items:center;gap:0.2rem;padding:0.15rem 0.4rem;border-radius:5px;font-size:0.55rem;font-weight:600;text-transform:uppercase}.lab-status.high,.lab-status.critical{background:rgba(220,38,38,0.15);color:#fca5a5}.lab-status.low{background:rgba(59,130,246,0.15);color:#93c5fd}.lab-status.normal{background:rgba(5,150,105,0.1);color:#6ee7b7}.interpretation-panel{background:linear-gradient(135deg,rgba(139,92,246,0.08) 0%,rgba(109,40,217,0.04) 100%);border:1px solid rgba(139,92,246,0.2);border-radius:14px;padding:1.25rem 1.5rem;margin-bottom:1.25rem;position:relative}.interpretation-panel::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#8b5cf6 0%,#a78bfa 100%);border-radius:14px 14px 0 0}.interpretation-title{font-family:'Playfair Display',Georgia,serif;font-size:1rem;font-weight:600;color:#c4b5fd;margin-bottom:0.875rem;display:flex;align-items:center;gap:0.5rem}.interpretation-title svg{width:18px;height:18px;opacity:0.8}.interpretation-content{font-size:0.85rem;line-height:1.6;color:rgba(255,255,255,0.8)}.interpretation-action{margin-top:1rem;padding:0.875rem 1rem;background:rgba(139,92,246,0.1);border-radius:8px;border-left:3px solid #8b5cf6}.action-label{font-size:0.55rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#a78bfa;margin-bottom:0.3rem}.action-text{font-size:0.8rem;color:rgba(255,255,255,0.85);line-height:1.45}.management-section{background:rgba(15,23,42,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;margin-bottom:1.25rem}.management-header{display:flex;align-items:center;gap:0.65rem;padding:0.875rem 1.25rem;background:linear-gradient(180deg,rgba(255,255,255,0.03) 0%,transparent 100%);border-bottom:1px solid rgba(255,255,255,0.06)}.management-icon{width:36px;height:36px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:9px;display:flex;align-items:center;justify-content:center}.management-icon svg{width:18px;height:18px;color:white}.management-header h3{font-family:'Playfair Display',Georgia,serif;font-size:1rem;font-weight:600;margin:0}.management-list{padding:0.4rem}.management-item{display:flex;align-items:flex-start;gap:0.75rem;padding:0.75rem 0.875rem;border-radius:8px;transition:all 0.15s ease;margin-bottom:0.2rem}.management-item:hover{background:rgba(255,255,255,0.02)}.management-item.priority{background:rgba(220,38,38,0.06);border:1px solid rgba(220,38,38,0.12)}.management-num{width:24px;height:24px;background:linear-gradient(135deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.05) 100%);border:1px solid rgba(255,255,255,0.1);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:rgba(255,255,255,0.7);flex-shrink:0}.management-item.priority .management-num{background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);border-color:transparent;color:white}.management-text{font-size:0.8rem;line-height:1.45;color:rgba(255,255,255,0.8);flex:1}.pearl-section{background:linear-gradient(135deg,rgba(251,191,36,0.08) 0%,rgba(245,158,11,0.04) 100%);border:1px solid rgba(251,191,36,0.2);border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;position:relative}.pearl-section::before{content:'💎';position:absolute;top:-10px;left:1.25rem;font-size:1.1rem;background:var(--surface,#12121a);padding:0 0.4rem}.pearl-label{font-size:0.55rem;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#fbbf24;margin-bottom:0.4rem}.pearl-text{font-size:0.85rem;line-height:1.6;color:rgba(255,255,255,0.85);font-style:italic}.patient-section{background:linear-gradient(135deg,rgba(6,182,212,0.08) 0%,rgba(8,145,178,0.04) 100%);border:1px solid rgba(6,182,212,0.2);border-radius:14px;padding:1.25rem 1.5rem;margin-bottom:1.25rem}.patient-header{display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem}.patient-icon{width:28px;height:28px;background:rgba(6,182,212,0.2);border-radius:7px;display:flex;align-items:center;justify-content:center;color:#22d3ee}.patient-icon svg{width:14px;height:14px}.patient-label{font-size:0.65rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#22d3ee}.patient-text{font-size:0.85rem;line-height:1.6;color:rgba(255,255,255,0.8)}.extracted-section{border:1px solid rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;margin-bottom:1.25rem}.extracted-trigger{width:100%;display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1rem;background:rgba(255,255,255,0.02);border:none;color:rgba(255,255,255,0.6);font-family:inherit;font-size:0.8rem;cursor:pointer;transition:all 0.15s ease}.extracted-trigger:hover{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.8)}.extracted-trigger svg{width:16px;height:16px;transition:transform 0.25s ease}.extracted-trigger.open svg{transform:rotate(180deg)}.extracted-content{display:none;padding:0.875rem 1rem;background:rgba(0,0,0,0.2);border-top:1px solid rgba(255,255,255,0.06)}.extracted-content.show{display:block}.extracted-pre{font-family:monospace;font-size:0.65rem;line-height:1.5;color:rgba(255,255,255,0.6);white-space:pre-wrap;word-break:break-word;max-height:250px;overflow-y:auto;margin:0}.report-footer{display:flex;align-items:center;justify-content:space-between;padding:0.875rem 0;border-top:1px solid rgba(255,255,255,0.06);margin-top:0.875rem}.footer-brand{display:flex;align-items:center;gap:0.4rem;font-size:0.65rem;color:rgba(255,255,255,0.4)}.footer-brand svg{width:14px;height:14px;opacity:0.5}.footer-timestamp{font-size:0.6rem;font-family:monospace;color:rgba(255,255,255,0.3)}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.elite-report>*{animation:fadeIn 0.35s ease forwards}.elite-report>*:nth-child(1){animation-delay:0s}.elite-report>*:nth-child(2){animation-delay:0.04s}.elite-report>*:nth-child(3){animation-delay:0.08s}.elite-report>*:nth-child(4){animation-delay:0.12s}.elite-report>*:nth-child(5){animation-delay:0.16s}.elite-report>*:nth-child(6){animation-delay:0.2s}.elite-report>*:nth-child(7){animation-delay:0.24s}`;
    document.head.appendChild(s);
  }
};

if (typeof window !== 'undefined') window.ClinicalComponents = ClinicalComponents;
