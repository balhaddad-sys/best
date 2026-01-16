/**
 * MedWard Clinical Components v5.0 - Comprehensive Edition
 * Full laboratory data with trends and cumulative reports
 * Professional medical institution styling
 */

const ClinicalComponents = {
  
  renderDetailedView(results) {
    const container = document.getElementById('detailed-view');
    if (!container) return;
    if (!results) { container.innerHTML = this.renderEmpty(); return; }

    this.injectStyles();
    let html = '<div class="elite-report">';
    
    // SEVERITY HEADER
    const severity = this.determineSeverity(results);
    html += this.renderSeverityHeader(severity, results);
    
    // EXECUTIVE SUMMARY
    if (results.summary || results.rawResponse?.interpretation?.summary) {
      html += this.renderExecutiveSummary(results);
    }
    
    // CRITICAL ALERTS
    if (results.alerts && results.alerts.length > 0) {
      html += this.renderCriticalAlerts(results.alerts);
    }
    
    // COMPREHENSIVE LABORATORY PANEL
    html += this.renderComprehensiveLabs(results);
    
    // CLINICAL INTERPRETATION
    if (results.rawResponse?.interpretation) {
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
    
    // EXTRACTED DATA
    if (results.rawResponse?.extractedText) {
      html += this.renderExtractedData(results.rawResponse.extractedText);
    }
    
    // FOOTER
    html += this.renderReportFooter();
    html += '</div>';
    
    container.innerHTML = html;
    this.setupInteractions(container);
  },

  /**
   * Render comprehensive lab panel with ALL values and trends
   */
  renderComprehensiveLabs(results) {
    // Get all lab data from various sources
    const labData = this.extractAllLabData(results);
    
    if (!labData || labData.length === 0) {
      // Fallback to abnormalities only
      const abnormalities = results.rawResponse?.interpretation?.abnormalities;
      if (abnormalities && abnormalities.length > 0) {
        return this.renderLaboratoryFindings(abnormalities);
      }
      return '';
    }
    
    // Group labs by category
    const categories = this.categorizeLabData(labData);
    
    let html = '';
    
    // Render each category
    for (const [category, labs] of Object.entries(categories)) {
      if (labs.length === 0) continue;
      html += this.renderLabCategory(category, labs);
    }
    
    return html;
  },

  /**
   * Extract all lab data from results
   */
  extractAllLabData(results) {
    const labs = [];
    const raw = results.rawResponse;
    
    // Try to get structured lab data if available
    if (raw?.labValues) {
      return raw.labValues;
    }
    
    // Parse from interpretation abnormalities and try to get all values
    if (raw?.interpretation?.abnormalities) {
      raw.interpretation.abnormalities.forEach(item => {
        const text = typeof item === 'string' ? item : (item.finding || item.text || '');
        const parsed = this.parseLabValue(text);
        parsed.isAbnormal = true;
        labs.push(parsed);
      });
    }
    
    // Parse from findings
    if (results.findings) {
      results.findings.forEach(f => {
        if (!labs.find(l => l.name.toLowerCase() === f.name.toLowerCase())) {
          labs.push({
            name: f.name,
            value: f.value,
            reference: f.reference || '-',
            status: f.status || 'normal',
            statusLabel: f.status || 'Normal',
            isAbnormal: f.status?.toLowerCase() !== 'normal'
          });
        }
      });
    }
    
    // Try to extract from extracted text using pattern matching
    if (raw?.extractedText) {
      const additionalLabs = this.parseLabsFromText(raw.extractedText);
      additionalLabs.forEach(lab => {
        if (!labs.find(l => l.name.toLowerCase() === lab.name.toLowerCase())) {
          labs.push(lab);
        }
      });
    }
    
    return labs;
  },

  /**
   * Parse labs from extracted text
   */
  parseLabsFromText(text) {
    const labs = [];
    const patterns = [
      // Pattern: "Name: value unit (reference)" or "Name value unit"
      /([A-Za-z\.\s]+?)\s*[:\*]?\s*(\d+(?:\.\d+)?)\s*([A-Za-z\/%\/×\^0-9]*)\s*(?:H|HH|L|LL)?\s*(?:\(([^)]+)\))?/gi,
    ];
    
    // Common lab names to look for
    const labNames = [
      'Glucose', 'Gluc', 'Urea', 'Creat', 'Creatinine', 'Na', 'Sodium', 'K', 'Potassium',
      'Cl', 'Chloride', 'CO2', 'Ca', 'Calcium', 'Phos', 'Phosphate', 'Mg', 'Magnesium',
      'T. Protein', 'Albumin', 'T. Bil', 'Bilirubin', 'D. Bil', 'Alk. Phos', 'GGT',
      'ALT', 'AST', 'eGFR', 'WBC', 'Hb', 'Plt', 'PT', 'INR', 'APTT',
      'Troponin', 'NT-proBNP', 'proBNP', 'Lactate', 'pH', 'pCO2', 'HCO3', 'Anion Gap'
    ];
    
    labNames.forEach(labName => {
      const regex = new RegExp(labName + '\\s*[:\\*]?\\s*([>]?\\d+(?:\\.\\d+)?)\\s*([A-Za-z\\/%\\/×\\^0-9]*)?\\s*(H|HH|L|LL)?', 'i');
      const match = text.match(regex);
      if (match) {
        const value = match[1] + (match[2] ? ' ' + match[2] : '');
        const flag = match[3];
        labs.push({
          name: labName,
          value: value.trim(),
          reference: '-',
          status: flag ? (flag.includes('L') ? 'low' : 'high') : 'normal',
          statusLabel: flag ? (flag.includes('L') ? 'Low' : 'High') : 'Normal',
          isAbnormal: !!flag
        });
      }
    });
    
    return labs;
  },

  /**
   * Categorize lab data
   */
  categorizeLabData(labs) {
    const categories = {
      'Renal Function': [],
      'Electrolytes': [],
      'Liver Function': [],
      'Cardiac Markers': [],
      'Hematology': [],
      'Coagulation': [],
      'Blood Gas': [],
      'Other': []
    };
    
    const categoryMap = {
      // Renal
      'urea': 'Renal Function', 'creat': 'Renal Function', 'creatinine': 'Renal Function',
      'egfr': 'Renal Function', 'bun': 'Renal Function',
      // Electrolytes
      'na': 'Electrolytes', 'sodium': 'Electrolytes', 'k': 'Electrolytes', 'potassium': 'Electrolytes',
      'cl': 'Electrolytes', 'chloride': 'Electrolytes', 'co2': 'Electrolytes', 'bicarbonate': 'Electrolytes',
      'ca': 'Electrolytes', 'calcium': 'Electrolytes', 'mg': 'Electrolytes', 'magnesium': 'Electrolytes',
      'phos': 'Electrolytes', 'phosphate': 'Electrolytes', 'anion': 'Electrolytes',
      // Liver
      'alt': 'Liver Function', 'ast': 'Liver Function', 'ggt': 'Liver Function',
      'alk': 'Liver Function', 'bil': 'Liver Function', 'bilirubin': 'Liver Function',
      'albumin': 'Liver Function', 'protein': 'Liver Function',
      // Cardiac
      'troponin': 'Cardiac Markers', 'trop': 'Cardiac Markers', 'bnp': 'Cardiac Markers',
      'probnp': 'Cardiac Markers', 'ck': 'Cardiac Markers',
      // Hematology
      'wbc': 'Hematology', 'hb': 'Hematology', 'hgb': 'Hematology', 'plt': 'Hematology',
      'platelet': 'Hematology', 'neutro': 'Hematology', 'rbc': 'Hematology', 'mcv': 'Hematology',
      // Coagulation
      'pt': 'Coagulation', 'inr': 'Coagulation', 'aptt': 'Coagulation', 'ptt': 'Coagulation',
      // Blood Gas
      'ph': 'Blood Gas', 'pco2': 'Blood Gas', 'po2': 'Blood Gas', 'hco3': 'Blood Gas',
      'lactate': 'Blood Gas', 'lac': 'Blood Gas', 'sao2': 'Blood Gas', 'fio2': 'Blood Gas'
    };
    
    labs.forEach(lab => {
      const nameLower = lab.name.toLowerCase();
      let assigned = false;
      
      for (const [key, category] of Object.entries(categoryMap)) {
        if (nameLower.includes(key)) {
          categories[category].push(lab);
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        categories['Other'].push(lab);
      }
    });
    
    return categories;
  },

  /**
   * Render a lab category section
   */
  renderLabCategory(category, labs) {
    const icons = {
      'Renal Function': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
      'Electrolytes': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
      'Liver Function': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/></svg>',
      'Cardiac Markers': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
      'Hematology': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>',
      'Coagulation': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
      'Blood Gas': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>',
      'Other': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    
    const colors = {
      'Renal Function': { bg: '#3b82f6', light: 'rgba(59, 130, 246, 0.15)' },
      'Electrolytes': { bg: '#8b5cf6', light: 'rgba(139, 92, 246, 0.15)' },
      'Liver Function': { bg: '#f59e0b', light: 'rgba(245, 158, 11, 0.15)' },
      'Cardiac Markers': { bg: '#ef4444', light: 'rgba(239, 68, 68, 0.15)' },
      'Hematology': { bg: '#ec4899', light: 'rgba(236, 72, 153, 0.15)' },
      'Coagulation': { bg: '#14b8a6', light: 'rgba(20, 184, 166, 0.15)' },
      'Blood Gas': { bg: '#06b6d4', light: 'rgba(6, 182, 212, 0.15)' },
      'Other': { bg: '#6b7280', light: 'rgba(107, 114, 128, 0.15)' }
    };
    
    const color = colors[category] || colors['Other'];
    const abnormalCount = labs.filter(l => l.isAbnormal).length;
    
    return `
      <div class="lab-category-section">
        <div class="lab-category-header" style="border-left: 4px solid ${color.bg};">
          <div class="lab-category-title">
            <div class="lab-category-icon" style="background: ${color.light}; color: ${color.bg};">
              ${icons[category] || icons['Other']}
            </div>
            <div>
              <h3>${category}</h3>
              <span class="lab-category-count">${labs.length} parameters${abnormalCount > 0 ? ` • <span style="color: #fca5a5;">${abnormalCount} abnormal</span>` : ''}</span>
            </div>
          </div>
        </div>
        <div class="lab-category-content">
          <table class="lab-table">
            <thead>
              <tr>
                <th style="width: 30%;">Parameter</th>
                <th style="width: 20%;">Result</th>
                <th style="width: 25%;">Reference</th>
                <th style="width: 15%;">Status</th>
                <th style="width: 10%;">Trend</th>
              </tr>
            </thead>
            <tbody>
              ${labs.map(lab => this.renderLabRow(lab)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /**
   * Render a single lab row
   */
  renderLabRow(lab) {
    const statusClass = this.getStatusClass(lab.status);
    const trend = lab.trend || lab.previousValue ? this.calculateTrend(lab) : null;
    
    return `
      <tr class="${lab.isAbnormal ? 'abnormal-row' : ''}">
        <td class="lab-name">${this.escapeHtml(lab.name)}</td>
        <td class="lab-value ${statusClass}">${this.escapeHtml(lab.value)}</td>
        <td class="lab-reference">${this.escapeHtml(lab.reference || '-')}</td>
        <td>
          <span class="lab-status ${statusClass}">
            ${statusClass === 'high' ? '↑' : statusClass === 'low' ? '↓' : '•'}
            ${this.escapeHtml(lab.statusLabel || lab.status || 'Normal')}
          </span>
        </td>
        <td class="lab-trend">
          ${trend ? `<span class="trend-indicator ${trend.direction}">${trend.icon}</span>` : '<span class="trend-stable">—</span>'}
        </td>
      </tr>
    `;
  },

  /**
   * Calculate trend from previous values
   */
  calculateTrend(lab) {
    if (lab.trend) {
      if (lab.trend === 'increasing' || lab.trend === 'up') {
        return { direction: 'up', icon: '↗' };
      } else if (lab.trend === 'decreasing' || lab.trend === 'down') {
        return { direction: 'down', icon: '↘' };
      }
    }
    
    if (lab.previousValue && lab.value) {
      const current = parseFloat(lab.value);
      const previous = parseFloat(lab.previousValue);
      if (!isNaN(current) && !isNaN(previous)) {
        if (current > previous * 1.05) return { direction: 'up', icon: '↗' };
        if (current < previous * 0.95) return { direction: 'down', icon: '↘' };
      }
    }
    
    return null;
  },

  /**
   * Render lab findings (fallback for abnormalities only)
   */
  renderLaboratoryFindings(abnormalities) {
    const items = abnormalities.map(item => {
      const text = typeof item === 'string' ? item : (item.finding || item.text || JSON.stringify(item));
      return this.parseLabValue(text);
    });
    
    return `
      <div class="lab-section">
        <div class="lab-header">
          <div class="lab-header-title">
            <div class="lab-header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <h3>Laboratory Findings</h3>
          </div>
          <span class="lab-count">${items.length} abnormal</span>
        </div>
        <table class="lab-table">
          <thead><tr><th>Parameter</th><th>Result</th><th>Reference</th><th>Status</th></tr></thead>
          <tbody>
            ${items.map(i => {
              const sc = this.getStatusClass(i.status);
              return `<tr class="abnormal-row"><td class="lab-name">${this.escapeHtml(i.name)}</td><td class="lab-value ${sc}">${this.escapeHtml(i.value)}</td><td class="lab-reference">${this.escapeHtml(i.reference)}</td><td><span class="lab-status ${sc}">${sc === 'high' ? '↑' : sc === 'low' ? '↓' : '•'} ${this.escapeHtml(i.statusLabel)}</span></td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  injectStyles() {
    if (document.getElementById('elite-styles-v5')) return;
    const s = document.createElement('style');
    s.id = 'elite-styles-v5';
    s.textContent = `
      .elite-report{font-family:'Outfit',-apple-system,BlinkMacSystemFont,sans-serif;color:rgba(255,255,255,0.9);line-height:1.6}
      
      /* Severity Header */
      .severity-header{position:relative;padding:1.5rem 1.75rem;border-radius:16px;margin-bottom:1.5rem;overflow:hidden}
      .severity-header::before{content:'';position:absolute;inset:0;opacity:0.03;background:repeating-linear-gradient(-45deg,transparent,transparent 10px,currentColor 10px,currentColor 11px)}
      .severity-header.critical{background:linear-gradient(135deg,rgba(220,38,38,0.15) 0%,rgba(185,28,28,0.08) 100%);border:1px solid rgba(220,38,38,0.3);color:#fca5a5}
      .severity-header.abnormal{background:linear-gradient(135deg,rgba(217,119,6,0.12) 0%,rgba(180,83,9,0.06) 100%);border:1px solid rgba(217,119,6,0.3);color:#fcd34d}
      .severity-header.normal{background:linear-gradient(135deg,rgba(5,150,105,0.12) 0%,rgba(4,120,87,0.06) 100%);border:1px solid rgba(5,150,105,0.3);color:#6ee7b7}
      .severity-badge{display:inline-flex;align-items:center;gap:0.5rem;padding:0.375rem 0.875rem;border-radius:100px;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.75rem}
      .severity-header.critical .severity-badge{background:rgba(220,38,38,0.2);color:#fca5a5;box-shadow:0 0 20px rgba(220,38,38,0.3);animation:pulse 2s ease-in-out infinite}
      .severity-header.abnormal .severity-badge{background:rgba(217,119,6,0.2);color:#fcd34d}
      .severity-header.normal .severity-badge{background:rgba(5,150,105,0.2);color:#6ee7b7}
      @keyframes pulse{0%,100%{box-shadow:0 0 20px rgba(220,38,38,0.3)}50%{box-shadow:0 0 30px rgba(220,38,38,0.5)}}
      .severity-title{font-family:'Playfair Display',Georgia,serif;font-size:1.375rem;font-weight:600;margin:0;line-height:1.3}
      
      /* Executive Summary */
      .exec-summary{background:linear-gradient(180deg,rgba(30,58,95,0.3) 0%,rgba(30,58,95,0.1) 100%);border:1px solid rgba(96,165,250,0.15);border-radius:16px;padding:1.5rem 1.75rem;margin-bottom:1.5rem;position:relative}
      .exec-summary::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#3b82f6 0%,#60a5fa 50%,#93c5fd 100%);border-radius:16px 16px 0 0}
      .section-label{display:flex;align-items:center;gap:0.5rem;font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:rgba(255,255,255,0.5);margin-bottom:0.875rem}
      .section-label svg{width:14px;height:14px;opacity:0.7}
      .exec-summary-text{font-size:1rem;line-height:1.75;color:rgba(255,255,255,0.85)}
      
      /* Alerts */
      .alert-section{margin-bottom:1.5rem}
      .elite-alert{display:flex;gap:1rem;padding:1rem 1.25rem;border-radius:12px;margin-bottom:0.625rem;position:relative;overflow:hidden}
      .elite-alert::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px}
      .elite-alert.critical{background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.2)}
      .elite-alert.critical::before{background:#dc2626;box-shadow:0 0 12px rgba(220,38,38,0.5)}
      .elite-alert.warning{background:rgba(217,119,6,0.08);border:1px solid rgba(217,119,6,0.2)}
      .elite-alert.warning::before{background:#d97706}
      .alert-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .elite-alert.critical .alert-icon{background:rgba(220,38,38,0.2);color:#fca5a5}
      .elite-alert.warning .alert-icon{background:rgba(217,119,6,0.2);color:#fcd34d}
      .alert-icon svg{width:18px;height:18px}
      .alert-body{flex:1;min-width:0}
      .alert-title{font-weight:600;font-size:0.9rem;margin-bottom:0.125rem}
      .elite-alert.critical .alert-title{color:#fca5a5}
      .elite-alert.warning .alert-title{color:#fcd34d}
      .alert-desc{font-size:0.85rem;color:rgba(255,255,255,0.7);line-height:1.5}
      
      /* Lab Category Sections */
      .lab-category-section{background:rgba(15,23,42,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden;margin-bottom:1.25rem}
      .lab-category-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;background:linear-gradient(180deg,rgba(255,255,255,0.03) 0%,transparent 100%);border-bottom:1px solid rgba(255,255,255,0.06)}
      .lab-category-title{display:flex;align-items:center;gap:0.75rem}
      .lab-category-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center}
      .lab-category-icon svg{width:20px;height:20px}
      .lab-category-title h3{font-family:'Playfair Display',Georgia,serif;font-size:1.05rem;font-weight:600;margin:0}
      .lab-category-count{font-size:0.75rem;color:rgba(255,255,255,0.5)}
      .lab-category-content{padding:0}
      
      /* Lab Table */
      .lab-section{background:rgba(15,23,42,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden;margin-bottom:1.5rem}
      .lab-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;background:linear-gradient(180deg,rgba(255,255,255,0.03) 0%,transparent 100%);border-bottom:1px solid rgba(255,255,255,0.06)}
      .lab-header-title{display:flex;align-items:center;gap:0.75rem}
      .lab-header-icon{width:40px;height:40px;background:linear-gradient(135deg,#f0c674 0%,#d4a843 100%);border-radius:10px;display:flex;align-items:center;justify-content:center}
      .lab-header-icon svg{width:20px;height:20px;color:#0a0a0f}
      .lab-header h3{font-family:'Playfair Display',Georgia,serif;font-size:1.125rem;font-weight:600;margin:0}
      .lab-count{font-size:0.75rem;color:rgba(255,255,255,0.5);background:rgba(255,255,255,0.05);padding:0.25rem 0.75rem;border-radius:100px}
      .lab-table{width:100%;border-collapse:collapse}
      .lab-table thead th{padding:0.75rem 1rem;text-align:left;font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.4);background:rgba(0,0,0,0.2);border-bottom:1px solid rgba(255,255,255,0.06)}
      .lab-table tbody tr{transition:background 0.2s ease}
      .lab-table tbody tr:hover{background:rgba(255,255,255,0.02)}
      .lab-table tbody tr.abnormal-row{background:rgba(239,68,68,0.03)}
      .lab-table tbody tr.abnormal-row:hover{background:rgba(239,68,68,0.06)}
      .lab-table tbody td{padding:0.75rem 1rem;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle;font-size:0.875rem}
      .lab-table tbody tr:last-child td{border-bottom:none}
      .lab-name{font-weight:500;color:rgba(255,255,255,0.9)}
      .lab-value{font-family:'JetBrains Mono',monospace;font-weight:600;font-size:0.9rem}
      .lab-value.high{color:#fca5a5}
      .lab-value.low{color:#93c5fd}
      .lab-value.normal{color:#6ee7b7}
      .lab-reference{font-size:0.75rem;color:rgba(255,255,255,0.4);font-family:monospace}
      .lab-status{display:inline-flex;align-items:center;gap:0.25rem;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.65rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em}
      .lab-status.high{background:rgba(220,38,38,0.15);color:#fca5a5}
      .lab-status.low{background:rgba(59,130,246,0.15);color:#93c5fd}
      .lab-status.normal{background:rgba(5,150,105,0.1);color:#6ee7b7}
      
      /* Trend indicators */
      .lab-trend{text-align:center}
      .trend-indicator{font-size:1rem;font-weight:700}
      .trend-indicator.up{color:#fca5a5}
      .trend-indicator.down{color:#6ee7b7}
      .trend-stable{color:rgba(255,255,255,0.3)}
      
      /* Interpretation Panel */
      .interpretation-panel{background:linear-gradient(135deg,rgba(139,92,246,0.08) 0%,rgba(109,40,217,0.04) 100%);border:1px solid rgba(139,92,246,0.2);border-radius:16px;padding:1.5rem 1.75rem;margin-bottom:1.5rem;position:relative}
      .interpretation-panel::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#8b5cf6 0%,#a78bfa 100%);border-radius:16px 16px 0 0}
      .interpretation-title{font-family:'Playfair Display',Georgia,serif;font-size:1.125rem;font-weight:600;color:#c4b5fd;margin-bottom:1rem;display:flex;align-items:center;gap:0.625rem}
      .interpretation-title svg{width:20px;height:20px;opacity:0.8}
      .interpretation-content{font-size:0.95rem;line-height:1.7;color:rgba(255,255,255,0.8)}
      .interpretation-action{margin-top:1.25rem;padding:1rem 1.25rem;background:rgba(139,92,246,0.1);border-radius:10px;border-left:3px solid #8b5cf6}
      .action-label{font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#a78bfa;margin-bottom:0.375rem}
      .action-text{font-size:0.9rem;color:rgba(255,255,255,0.85);line-height:1.5}
      
      /* Management Section */
      .management-section{background:rgba(15,23,42,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden;margin-bottom:1.5rem}
      .management-header{display:flex;align-items:center;gap:0.75rem;padding:1rem 1.5rem;background:linear-gradient(180deg,rgba(255,255,255,0.03) 0%,transparent 100%);border-bottom:1px solid rgba(255,255,255,0.06)}
      .management-icon{width:40px;height:40px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:10px;display:flex;align-items:center;justify-content:center}
      .management-icon svg{width:20px;height:20px;color:white}
      .management-header h3{font-family:'Playfair Display',Georgia,serif;font-size:1.125rem;font-weight:600;margin:0}
      .management-list{padding:0.5rem}
      .management-item{display:flex;align-items:flex-start;gap:1rem;padding:1rem 1.25rem;border-radius:10px;transition:all 0.2s ease;margin-bottom:0.25rem}
      .management-item:hover{background:rgba(255,255,255,0.02)}
      .management-item.priority{background:rgba(220,38,38,0.06);border:1px solid rgba(220,38,38,0.15)}
      .management-num{width:28px;height:28px;background:linear-gradient(135deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.05) 100%);border:1px solid rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:rgba(255,255,255,0.7);flex-shrink:0}
      .management-item.priority .management-num{background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);border-color:transparent;color:white;box-shadow:0 0 12px rgba(220,38,38,0.4)}
      .management-text{font-size:0.9rem;line-height:1.6;color:rgba(255,255,255,0.8);flex:1}
      
      /* Clinical Pearl */
      .pearl-section{background:linear-gradient(135deg,rgba(251,191,36,0.08) 0%,rgba(245,158,11,0.04) 100%);border:1px solid rgba(251,191,36,0.2);border-radius:16px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;position:relative}
      .pearl-section::before{content:'💎';position:absolute;top:-12px;left:1.5rem;font-size:1.25rem;background:var(--surface,#12121a);padding:0 0.5rem}
      .pearl-label{font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#fbbf24;margin-bottom:0.5rem}
      .pearl-text{font-size:0.95rem;line-height:1.7;color:rgba(255,255,255,0.85);font-style:italic}
      
      /* Patient Communication */
      .patient-section{background:linear-gradient(135deg,rgba(6,182,212,0.08) 0%,rgba(8,145,178,0.04) 100%);border:1px solid rgba(6,182,212,0.2);border-radius:16px;padding:1.5rem 1.75rem;margin-bottom:1.5rem}
      .patient-header{display:flex;align-items:center;gap:0.625rem;margin-bottom:0.875rem}
      .patient-icon{width:32px;height:32px;background:rgba(6,182,212,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#22d3ee}
      .patient-icon svg{width:16px;height:16px}
      .patient-label{font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#22d3ee}
      .patient-text{font-size:0.95rem;line-height:1.7;color:rgba(255,255,255,0.8)}
      
      /* Extracted Data */
      .extracted-section{border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;margin-bottom:1.5rem}
      .extracted-trigger{width:100%;display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;background:rgba(255,255,255,0.02);border:none;color:rgba(255,255,255,0.6);font-family:inherit;font-size:0.85rem;cursor:pointer;transition:all 0.2s ease}
      .extracted-trigger:hover{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.8)}
      .extracted-trigger svg{width:18px;height:18px;transition:transform 0.3s ease}
      .extracted-trigger.open svg{transform:rotate(180deg)}
      .extracted-content{display:none;padding:1rem 1.25rem;background:rgba(0,0,0,0.2);border-top:1px solid rgba(255,255,255,0.06)}
      .extracted-content.show{display:block}
      .extracted-pre{font-family:monospace;font-size:0.75rem;line-height:1.6;color:rgba(255,255,255,0.6);white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto;margin:0}
      
      /* Footer */
      .report-footer{display:flex;align-items:center;justify-content:space-between;padding:1rem 0;border-top:1px solid rgba(255,255,255,0.06);margin-top:1rem}
      .footer-brand{display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:rgba(255,255,255,0.4)}
      .footer-brand svg{width:16px;height:16px;opacity:0.5}
      .footer-timestamp{font-size:0.7rem;font-family:monospace;color:rgba(255,255,255,0.3)}
      
      /* Animations */
      @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      .elite-report>*{animation:fadeIn 0.4s ease forwards}
      .elite-report>*:nth-child(1){animation-delay:0s}
      .elite-report>*:nth-child(2){animation-delay:0.05s}
      .elite-report>*:nth-child(3){animation-delay:0.1s}
      .elite-report>*:nth-child(4){animation-delay:0.15s}
      .elite-report>*:nth-child(5){animation-delay:0.2s}
      .elite-report>*:nth-child(6){animation-delay:0.25s}
      .elite-report>*:nth-child(7){animation-delay:0.3s}
      .elite-report>*:nth-child(8){animation-delay:0.35s}
      .elite-report>*:nth-child(9){animation-delay:0.4s}
      .elite-report>*:nth-child(10){animation-delay:0.45s}
    `;
    document.head.appendChild(s);
  },

  determineSeverity(results) {
    const t = JSON.stringify(results).toLowerCase();
    if (t.includes('critical') || t.includes('emergency') || t.includes('immediate')) return 'critical';
    if (t.includes('abnormal') || t.includes('elevated') || t.includes('high') || t.includes('low')) return 'abnormal';
    return 'normal';
  },

  renderSeverityHeader(severity, results) {
    const icons = {
      critical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      abnormal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      normal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    };
    const header = results.rawResponse?.interpretation?.header || results.diagnosis || 'Analysis Complete';
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
    return `<div class="management-section"><div class="management-header"><div class="management-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><h3>Management Plan</h3></div><div class="management-list">${recommendations.map((r, i) => {const text = typeof r === 'string' ? r : (r.text || r); const priority = i === 0 || (typeof r === 'object' && r.urgent); return `<div class="management-item ${priority ? 'priority' : ''}"><span class="management-num">${i + 1}</span><span class="management-text">${this.escapeHtml(text)}</span></div>`;}).join('')}</div></div>`;
  },

  renderClinicalPearl(pearl) {
    return `<div class="pearl-section"><div class="pearl-label">Clinical Pearl</div><p class="pearl-text">${this.escapeHtml(pearl)}</p></div>`;
  },

  renderPatientCommunication(text) {
    return `<div class="patient-section"><div class="patient-header"><div class="patient-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><span class="patient-label">Patient Communication</span></div><p class="patient-text">${this.escapeHtml(text)}</p></div>`;
  },

  renderExtractedData(text) {
    return `<div class="extracted-section"><button class="extracted-trigger"><span>📄 Source Document Data</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button><div class="extracted-content"><pre class="extracted-pre">${this.escapeHtml(text)}</pre></div></div>`;
  },

  renderReportFooter() {
    return `<div class="report-footer"><div class="footer-brand"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7v10c0 5.5 3.8 9.7 10 11 6.2-1.3 10-5.5 10-11V7l-10-5z"/></svg>MedWard Clinical Intelligence</div><div class="footer-timestamp">Generated ${new Date().toLocaleString()}</div></div>`;
  },

  renderWardView(results) {
    const container = document.getElementById('ward-view');
    if (!container) return;
    this.injectStyles();
    if (!results) { container.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:3rem;">No data available</p>'; return; }

    const severity = this.determineSeverity(results);
    const abnormalities = results.rawResponse?.interpretation?.abnormalities || [];
    
    let html = `<div class="elite-report" style="padding:1rem;">${this.renderSeverityHeader(severity, results)}<div class="lab-section"><div class="lab-header"><div class="lab-header-title"><div class="lab-header-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/></svg></div><h3>Ward Summary</h3></div></div><div style="padding:1.25rem;"><div style="display:grid;gap:0.75rem;"><div style="display:flex;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:0.75rem;"><span style="width:120px;color:rgba(255,255,255,0.5);font-size:0.8rem;font-weight:600;">Diagnosis</span><span style="flex:1;color:rgba(255,255,255,0.9);">${this.escapeHtml(results.diagnosis || results.summary || 'Pending')}</span></div>${results.severity ? `<div style="display:flex;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:0.75rem;"><span style="width:120px;color:rgba(255,255,255,0.5);font-size:0.8rem;font-weight:600;">Severity</span><span style="flex:1;"><span class="lab-status ${severity}">${this.escapeHtml(results.severity)}</span></span></div>` : ''}${abnormalities.length > 0 ? `<div style="display:flex;padding-bottom:0.75rem;"><span style="width:120px;color:rgba(255,255,255,0.5);font-size:0.8rem;font-weight:600;">Key Labs</span><span style="flex:1;">${abnormalities.slice(0, 4).map(a => {const text = typeof a === 'string' ? a : (a.finding || a.text || ''); const p = this.parseLabValue(text); return `<div style="margin-bottom:0.375rem;"><span style="color:#fca5a5;">${this.escapeHtml(p.name)}</span>: <span style="font-family:monospace;color:#f0c674;">${this.escapeHtml(p.value)}</span></div>`;}).join('')}</span></div>` : ''}</div></div></div>`;
    
    if (results.recommendations && results.recommendations.length > 0) {
      html += `<div class="management-section"><div class="management-header"><div class="management-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><h3>Plan</h3></div><div class="management-list">${results.recommendations.slice(0, 4).map((r, i) => {const text = typeof r === 'string' ? r : (r.text || r); return `<div class="management-item ${i === 0 ? 'priority' : ''}"><span class="management-num">${i + 1}</span><span class="management-text">${this.escapeHtml(text)}</span></div>`;}).join('')}</div></div>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
  },

  parseLabValue(text) {
    if (!text) return { name: 'Unknown', value: '-', reference: '-', status: 'abnormal', statusLabel: 'Abnormal' };
    
    let name = text, value = '-', reference = '-', status = 'abnormal', statusLabel = 'Abnormal';
    
    const refMatch = text.match(/\(([^)]+)\)/);
    if (refMatch) {
      reference = refMatch[1];
      const refLower = reference.toLowerCase();
      if (refLower.includes('markedly') || refLower.includes('critical') || refLower.includes('severe')) { status = 'high'; statusLabel = 'Critical'; }
      else if (refLower.includes('elevated') || refLower.includes('high') || refLower.includes('>')) { status = 'high'; statusLabel = 'Elevated'; }
      else if (refLower.includes('low') || refLower.includes('decreased') || refLower.includes('<')) { status = 'low'; statusLabel = 'Low'; }
    }
    
    const valueMatch = text.match(/^([A-Za-z\s\.\-\/]+?)\s*[:\*]?\s*([>]?\d+(?:\.\d+)?)\s*([A-Za-z\/%\/×\^0-9]*)/i);
    if (valueMatch) {
      name = valueMatch[1].trim();
      value = valueMatch[2] + (valueMatch[3] ? ' ' + valueMatch[3] : '');
    } else {
      const parenIndex = text.indexOf('(');
      if (parenIndex > 0) name = text.substring(0, parenIndex).trim();
    }
    
    if (text.includes(' H)') || text.includes(' HH') || text.includes(' H ') || text.includes(' H"') || text.match(/\sH$/)) { status = 'high'; if (statusLabel === 'Abnormal') statusLabel = 'High'; }
    else if (text.includes(' L)') || text.includes(' LL') || text.includes(' L ') || text.includes(' L"') || text.match(/\sL$/)) { status = 'low'; if (statusLabel === 'Abnormal') statusLabel = 'Low'; }
    
    return { name, value, reference, status, statusLabel };
  },

  getStatusClass(status) {
    if (!status) return 'normal';
    const s = String(status).toLowerCase();
    if (s.includes('critical') || s.includes('high') || s.includes('elevated') || s.includes('markedly') || s === 'h' || s === 'hh') return 'high';
    if (s.includes('low') || s.includes('decreased') || s === 'l' || s === 'll') return 'low';
    if (s.includes('abnormal')) return 'high';
    return 'normal';
  },

  renderEmpty() {
    return `<div style="text-align:center;padding:4rem 2rem;color:rgba(255,255,255,0.4);"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom:1.5rem;opacity:0.3;"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg><p style="font-size:1rem;margin-bottom:0.5rem;">No Analysis Data</p><p style="font-size:0.85rem;opacity:0.7;">Upload a medical report to begin</p></div>`;
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
  }
};

if (typeof window !== 'undefined') window.ClinicalComponents = ClinicalComponents;
