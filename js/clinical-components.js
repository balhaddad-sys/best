/**
 * MedWard Master - Clinical Components
 * Clean, practical medical report rendering
 */

const ClinicalComponents = {
  
  /**
   * Render the detailed analysis view
   */
  renderDetailedView(data) {
    const container = document.getElementById('results-content');
    if (!container) return;
    
    let html = '';
    
    // 1. Summary Box (always at top - most important)
    if (data.summary) {
      html += `
        <div class="summary-box">
          <div class="summary-label">Clinical Summary</div>
          <div class="summary-text">${this.escapeHtml(data.summary)}</div>
        </div>
      `;
    }
    
    // 2. Urgent Alerts (critical items that need immediate attention)
    if (data.alerts && data.alerts.length > 0) {
      data.alerts.forEach(alert => {
        const severity = alert.severity || 'warning';
        html += `
          <div class="alert-banner ${severity}">
            <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <div class="alert-content">
              <div class="alert-title">${this.escapeHtml(alert.title)}</div>
              <div class="alert-text">${this.escapeHtml(alert.text)}</div>
            </div>
          </div>
        `;
      });
    }
    
    // 3. Key Findings Table (compact, scannable)
    if (data.findings && data.findings.length > 0) {
      html += `
        <div class="section-header">
          <svg class="section-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>
          </svg>
          <span class="section-title">Key Findings</span>
        </div>
        <table class="findings-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Value</th>
              <th>Reference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      data.findings.forEach(finding => {
        const statusClass = this.getStatusClass(finding.status);
        html += `
          <tr>
            <td class="param-name">${this.escapeHtml(finding.name)}</td>
            <td class="param-value">${this.escapeHtml(finding.value)}</td>
            <td>${this.escapeHtml(finding.reference || '-')}</td>
            <td><span class="param-status ${statusClass}">${this.escapeHtml(finding.status)}</span></td>
          </tr>
        `;
      });
      
      html += `
          </tbody>
        </table>
      `;
    }
    
    // 4. Clinical Pearl (single, most important insight)
    if (data.clinicalPearl) {
      html += `
        <div class="pearls-section">
          <div class="pearls-title">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"/>
            </svg>
            Clinical Pearl
          </div>
          <div class="pearls-text">${this.escapeHtml(data.clinicalPearl)}</div>
        </div>
      `;
    }
    
    // 5. Recommendations (numbered, prioritized)
    if (data.recommendations && data.recommendations.length > 0) {
      html += `
        <div class="section-header">
          <svg class="section-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <span class="section-title">Recommendations</span>
        </div>
        <div class="recommendations">
      `;
      
      data.recommendations.forEach((rec, index) => {
        const isUrgent = rec.urgent || index === 0;
        const text = typeof rec === 'string' ? rec : rec.text;
        html += `
          <div class="rec-item">
            <span class="rec-number ${isUrgent ? 'urgent' : ''}">${index + 1}</span>
            <span class="rec-text">${this.escapeHtml(text)}</span>
          </div>
        `;
      });
      
      html += `</div>`;
    }
    
    // 6. Patient Explanation (lay terms)
    if (data.patientExplanation) {
      html += `
        <div class="patient-box">
          <div class="patient-title">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
            </svg>
            Patient Explanation
          </div>
          <div class="patient-text">${this.escapeHtml(data.patientExplanation)}</div>
        </div>
      `;
    }
    
    // 7. Discussion Points (collapsed by default - less important)
    if (data.discussionPoints && data.discussionPoints.length > 0) {
      html += `
        <button class="discussion-toggle" onclick="this.nextElementSibling.classList.toggle('show')">
          <span>Discussion Points (${data.discussionPoints.length})</span>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
        <div class="discussion-content">
      `;
      
      data.discussionPoints.forEach(point => {
        html += `<div class="discussion-item">${this.escapeHtml(point)}</div>`;
      });
      
      html += `</div>`;
    }
    
    container.innerHTML = html;
  },
  
  /**
   * Render the ward presentation view (compact for quick reference)
   */
  renderWardView(data) {
    const container = document.getElementById('ward-content');
    if (!container) return;
    
    let html = '';
    
    // Diagnosis Card
    html += `
      <div class="ward-card">
        <div class="ward-header">Assessment</div>
        <div class="ward-body">
          <div class="ward-row">
            <span class="ward-label">Diagnosis</span>
            <span class="ward-value">${this.escapeHtml(data.diagnosis || data.summary || 'Pending')}</span>
          </div>
          ${data.severity ? `
          <div class="ward-row">
            <span class="ward-label">Severity</span>
            <span class="ward-value">${this.escapeHtml(data.severity)}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    
    // Key Labs Card
    if (data.findings && data.findings.length > 0) {
      const abnormalFindings = data.findings.filter(f => f.status !== 'Normal' && f.status !== 'normal');
      if (abnormalFindings.length > 0) {
        html += `
          <div class="ward-card">
            <div class="ward-header">Abnormal Values</div>
            <div class="ward-body">
        `;
        
        abnormalFindings.slice(0, 5).forEach(finding => {
          html += `
            <div class="ward-row">
              <span class="ward-label">${this.escapeHtml(finding.name)}</span>
              <span class="ward-value"><strong>${this.escapeHtml(finding.value)}</strong> (${this.escapeHtml(finding.status)})</span>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      }
    }
    
    // Plan Card
    if (data.recommendations && data.recommendations.length > 0) {
      html += `
        <div class="ward-card">
          <div class="ward-header">Plan</div>
          <div class="ward-body">
      `;
      
      data.recommendations.slice(0, 4).forEach((rec, index) => {
        const text = typeof rec === 'string' ? rec : rec.text;
        html += `
          <div class="ward-row">
            <span class="ward-label">${index + 1}.</span>
            <span class="ward-value">${this.escapeHtml(text)}</span>
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    }
    
    container.innerHTML = html;
  },
  
  /**
   * Get CSS class for status
   */
  getStatusClass(status) {
    if (!status) return 'status-normal';
    const s = status.toLowerCase();
    if (s.includes('high') || s.includes('critical') || s.includes('elevated')) return 'status-high';
    if (s.includes('low') || s.includes('decreased')) return 'status-low';
    return 'status-normal';
  },
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  /**
   * Parse AI response into structured data
   */
  parseAnalysisResponse(response) {
    // This handles both structured JSON responses and text responses
    if (typeof response === 'object') {
      return response;
    }
    
    // Parse text response into structured format
    const data = {
      summary: '',
      alerts: [],
      findings: [],
      clinicalPearl: '',
      recommendations: [],
      patientExplanation: '',
      discussionPoints: [],
      diagnosis: '',
      severity: ''
    };
    
    // Extract sections from text
    const text = response.toString();
    
    // Simple extraction logic - can be enhanced based on AI output format
    const sections = text.split(/\n\n+/);
    
    if (sections.length > 0) {
      data.summary = sections[0].replace(/^(Summary|Clinical Summary):?\s*/i, '').trim();
    }
    
    return data;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClinicalComponents;
}
