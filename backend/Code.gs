/**
 * MedWard Master - Backend API (Enhanced with Vision AI)
 * Google Apps Script Web App
 *
 * SETUP INSTRUCTIONS:
 * 1. Copy this code to script.google.com
 * 2. Add Script Properties:
 *    - OPENAI_API_KEY = your_openai_key (for GPT-4 and GPT-4 Vision)
 *    - ANTHROPIC_API_KEY = your_anthropic_key (for Claude Vision)
 *    - AI_PROVIDER = 'claude' or 'openai' (optional, defaults to claude)
 * 3. Deploy as Web App (Execute as: Me, Access: Anyone)
 *
 * Note: Drive API is no longer required (removed basic OCR)
 */

// Configuration
const CONFIG = {
  OPENAI_TEXT_MODEL: 'gpt-4',
  OPENAI_VISION_MODEL: 'gpt-4-vision-preview',
  CLAUDE_MODEL: 'claude-3-5-sonnet-20241022',
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.7,
  DRIVE_FOLDER_NAME: 'MedWard Reports',
  DEFAULT_PROVIDER: 'claude' // 'claude' or 'openai'
};

/**
 * Main entry point for POST requests
 * Handles CORS by accepting text/plain content type
 */
function doPost(e) {
  try {
    // Parse the request
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;

    // Route to appropriate handler
    let response;
    switch(action) {
      case 'login':
        response = handleLogin(requestData);
        break;
      case 'interpret':
        response = handleInterpret(requestData);
        break;
      default:
        response = { success: false, error: 'Unknown action' };
    }

    // Return JSON response with CORS headers
    return createCORSResponse(response);

  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return createCORSResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
function doGet(e) {
  return createCORSResponse({
    status: 'MedWard Backend API is running',
    version: '2.0.0',
    features: ['Claude Vision', 'GPT-4 Vision', 'Advanced OCR']
  });
}

/**
 * Create response with CORS headers
 */
function createCORSResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Handle login requests
 */
function handleLogin(data) {
  const username = data.username || 'Guest';

  // Simple authentication (enhance with real auth in production)
  if (username.length > 0) {
    return {
      success: true,
      token: generateToken(),
      user: {
        username: username,
        role: 'doctor',
        timestamp: new Date().toISOString()
      }
    };
  }

  return { success: false, error: 'Invalid username' };
}

/**
 * Handle medical report interpretation requests
 */
function handleInterpret(data) {
  try {
    const documentType = data.documentType || 'general';
    const username = data.username || 'Anonymous';
    const provider = data.provider || getPreferredProvider();

    let medicalText = data.text || '';
    let visionAnalysis = null;

    // If image is provided, use Vision AI for extraction and analysis
    if (data.image) {
      Logger.log('Processing image with Vision AI...');
      visionAnalysis = analyzeImageWithVisionAI(data.image, documentType, provider);

      if (!visionAnalysis || !visionAnalysis.extractedText) {
        return { success: false, error: 'Vision AI failed to analyze image' };
      }

      medicalText = visionAnalysis.extractedText;
    }

    if (!medicalText || medicalText.trim().length === 0) {
      return { success: false, error: 'No medical text provided or extracted' };
    }

    // Get comprehensive AI interpretation
    const interpretation = getAIInterpretation(medicalText, documentType, provider);

    // If vision analysis provided initial insights, merge them
    if (visionAnalysis && visionAnalysis.initialInsights) {
      interpretation.visionInsights = visionAnalysis.initialInsights;
    }

    // Archive the report to Google Drive
    archiveReport(medicalText, interpretation, username, documentType);

    return {
      success: true,
      provider: provider,
      ...interpretation,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    Logger.log('Interpret error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get preferred AI provider from Script Properties or use default
 */
function getPreferredProvider() {
  const provider = PropertiesService.getScriptProperties().getProperty('AI_PROVIDER');
  return provider || CONFIG.DEFAULT_PROVIDER;
}

/**
 * Clean and validate base64 image data
 */
function cleanBase64Data(base64String) {
  try {
    let cleanData = base64String;

    // Remove data URL prefix if present (data:image/...;base64,)
    if (cleanData.includes(',')) {
      cleanData = cleanData.split(',')[1];
    }

    // Remove all whitespace, newlines, and other non-base64 characters
    cleanData = cleanData.replace(/[\s\n\r]/g, '');

    // Validate it's proper base64 (contains only valid base64 characters)
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanData)) {
      throw new Error('Invalid base64 characters detected');
    }

    // Check minimum length (should be at least a few hundred characters for an image)
    if (cleanData.length < 100) {
      throw new Error('Base64 data too short to be a valid image');
    }

    Logger.log(`Base64 data cleaned: ${cleanData.length} characters`);
    return cleanData;

  } catch (error) {
    Logger.log('Base64 cleaning error: ' + error.toString());
    throw error;
  }
}

/**
 * Analyze medical image using Vision AI (Claude or GPT-4 Vision)
 */
function analyzeImageWithVisionAI(base64Image, documentType, provider) {
  try {
    // Clean and validate base64 data
    const base64Data = cleanBase64Data(base64Image);
    const mediaType = getMediaTypeFromBase64(base64Image);

    Logger.log(`Using ${provider} Vision API for image analysis`);
    Logger.log(`Media type: ${mediaType}`);

    if (provider === 'claude') {
      return analyzeImageWithClaude(base64Data, mediaType, documentType);
    } else {
      return analyzeImageWithOpenAIVision(base64Image, documentType);
    }

  } catch (error) {
    Logger.log('Vision AI error: ' + error.toString());

    // Try fallback to other provider
    const fallbackProvider = provider === 'claude' ? 'openai' : 'claude';
    Logger.log(`Attempting fallback to ${fallbackProvider}`);

    try {
      if (fallbackProvider === 'claude') {
        const base64Data = cleanBase64Data(base64Image);
        const mediaType = getMediaTypeFromBase64(base64Image);
        return analyzeImageWithClaude(base64Data, mediaType, documentType);
      } else {
        return analyzeImageWithOpenAIVision(base64Image, documentType);
      }
    } catch (fallbackError) {
      Logger.log('Fallback also failed: ' + fallbackError.toString());
      throw new Error('Both vision providers failed: ' + error.toString() + ' | Fallback: ' + fallbackError.toString());
    }
  }
}

/**
 * Analyze image using Claude Vision API (Anthropic)
 */
function analyzeImageWithClaude(base64Data, mediaType, documentType) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');

  if (!apiKey) {
    throw new Error('Anthropic API key not configured in Script Properties');
  }

  // Validate inputs
  if (!base64Data || base64Data.length < 100) {
    throw new Error('Invalid or empty base64 data provided');
  }

  Logger.log(`Claude Vision request - Media type: ${mediaType}, Data length: ${base64Data.length}, Doc type: ${documentType}`);

  const prompt = buildVisionPrompt(documentType);

  const requestPayload = {
    model: CONFIG.CLAUDE_MODEL,
    max_tokens: CONFIG.MAX_TOKENS,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data
          }
        },
        {
          type: 'text',
          text: prompt
        }
      ]
    }]
  };

  try {
    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      payload: JSON.stringify(requestPayload),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log(`Claude API response code: ${responseCode}`);

    if (responseCode !== 200) {
      Logger.log(`Claude API error response: ${responseText}`);
      throw new Error(`Claude API HTTP ${responseCode}: ${responseText}`);
    }

    const result = JSON.parse(responseText);

    if (result.error) {
      throw new Error('Claude API Error: ' + JSON.stringify(result.error));
    }

    if (!result.content || !result.content[0] || !result.content[0].text) {
      throw new Error('Invalid response format from Claude API');
    }

    // Extract the text content from Claude's response
    const extractedText = result.content[0].text;
    Logger.log(`Successfully extracted ${extractedText.length} characters from image`);

    return {
      extractedText: extractedText,
      initialInsights: `Analyzed with Claude Vision (${CONFIG.CLAUDE_MODEL})`,
      provider: 'claude'
    };

  } catch (error) {
    Logger.log('Claude Vision detailed error: ' + error.toString());
    throw error;
  }
}

/**
 * Analyze image using GPT-4 Vision API
 */
function analyzeImageWithOpenAIVision(base64Image, documentType) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error('OpenAI API key not configured in Script Properties');
  }

  const prompt = buildVisionPrompt(documentType);

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      model: CONFIG.OPENAI_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: base64Image,
              detail: 'high'
            }
          }
        ]
      }],
      max_tokens: CONFIG.MAX_TOKENS
    }),
    muteHttpExceptions: true
  });

  const result = JSON.parse(response.getContentText());

  if (result.error) {
    throw new Error('OpenAI Vision API Error: ' + result.error.message);
  }

  const extractedText = result.choices[0].message.content;

  return {
    extractedText: extractedText,
    initialInsights: `Analyzed with GPT-4 Vision (${CONFIG.OPENAI_VISION_MODEL})`,
    provider: 'openai'
  };
}

/**
 * Build vision-specific prompt for image analysis
 */
function buildVisionPrompt(documentType) {
  const typeSpecific = {
    'lab': 'laboratory test results, including all test names, values, units, and reference ranges',
    'imaging': 'medical imaging report, including findings, impressions, technique, and clinical correlations',
    'pathology': 'pathology report, including specimen description, microscopic findings, and diagnosis',
    'general': 'medical document, extracting all relevant clinical information'
  };

  const docDescription = typeSpecific[documentType] || typeSpecific['general'];

  return `You are analyzing a medical ${docDescription}.

Please perform these tasks:

1. EXTRACT ALL TEXT: Extract all visible text from the image with high accuracy. Include:
   - All test names and values
   - All reference ranges and units
   - All headings and labels
   - All dates, patient info, and identifiers
   - All findings and impressions
   - Maintain the original structure and formatting as much as possible

2. ORGANIZE THE TEXT: Present the extracted text in a clear, structured format that preserves:
   - Hierarchical relationships
   - Section headers
   - List structures
   - Tabular data (if present)

3. QUALITY CHECK: Ensure you've captured:
   - All numerical values accurately
   - All medical terminology correctly
   - All units of measurement
   - All flags or abnormal indicators

Please provide the complete extracted text now. Be thorough and accurate.`;
}

/**
 * Get media type from base64 string
 */
function getMediaTypeFromBase64(base64String) {
  try {
    if (base64String.startsWith('data:')) {
      const match = base64String.match(/data:([^;,]+)/);
      if (match && match[1]) {
        const mediaType = match[1].trim().toLowerCase();

        // Validate it's a supported image format for Claude
        const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (supportedTypes.includes(mediaType)) {
          return mediaType;
        }

        // Handle jpg/jpeg variations
        if (mediaType.includes('jpg') || mediaType.includes('jpeg')) {
          return 'image/jpeg';
        }
      }
    }

    // Try to detect from magic numbers if we have the data
    // PNG starts with iVBOR, JPEG with /9j/, GIF with R0lG
    if (base64String.includes(',')) {
      const dataStart = base64String.split(',')[1].substring(0, 10);
      if (dataStart.startsWith('iVBOR')) return 'image/png';
      if (dataStart.startsWith('/9j/')) return 'image/jpeg';
      if (dataStart.startsWith('R0lG')) return 'image/gif';
    } else {
      // Check cleaned base64 data
      if (base64String.startsWith('iVBOR')) return 'image/png';
      if (base64String.startsWith('/9j/')) return 'image/jpeg';
      if (base64String.startsWith('R0lG')) return 'image/gif';
    }

    // Default to JPEG for medical images (most common)
    Logger.log('Could not detect media type, defaulting to image/jpeg');
    return 'image/jpeg';

  } catch (error) {
    Logger.log('Media type detection error: ' + error.toString());
    return 'image/jpeg';
  }
}

/**
 * Get AI interpretation using preferred provider
 */
function getAIInterpretation(medicalText, documentType, provider) {
  if (provider === 'claude') {
    return getClaudeInterpretation(medicalText, documentType);
  } else {
    return getOpenAIInterpretation(medicalText, documentType);
  }
}

/**
 * Get interpretation using Claude API
 */
function getClaudeInterpretation(medicalText, documentType) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');

  if (!apiKey) {
    throw new Error('Anthropic API key not configured in Script Properties');
  }

  const systemPrompt = buildSystemPrompt(documentType);
  const userPrompt = buildUserPrompt(medicalText, documentType);

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      model: CONFIG.CLAUDE_MODEL,
      max_tokens: CONFIG.MAX_TOKENS,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    }),
    muteHttpExceptions: true
  });

  const result = JSON.parse(response.getContentText());

  if (result.error) {
    throw new Error('Claude API Error: ' + JSON.stringify(result.error));
  }

  const aiResponse = result.content[0].text;
  return parseAIResponse(aiResponse);
}

/**
 * Get interpretation using OpenAI API
 */
function getOpenAIInterpretation(medicalText, documentType) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error('OpenAI API key not configured in Script Properties');
  }

  const systemPrompt = buildSystemPrompt(documentType);
  const userPrompt = buildUserPrompt(medicalText, documentType);

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      model: CONFIG.OPENAI_TEXT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: CONFIG.MAX_TOKENS,
      temperature: CONFIG.TEMPERATURE
    }),
    muteHttpExceptions: true
  });

  const result = JSON.parse(response.getContentText());

  if (result.error) {
    throw new Error('OpenAI API Error: ' + result.error.message);
  }

  const aiResponse = result.choices[0].message.content;
  return parseAIResponse(aiResponse);
}

/**
 * Build system prompt based on document type
 */
function buildSystemPrompt(documentType) {
  const basePrompt = `You are MedWard Master, an expert medical AI assistant specializing in clinical interpretation.
Your role is to analyze medical reports and provide clear, actionable insights for healthcare professionals.

You have advanced training in:
- Clinical pathology and laboratory medicine
- Medical imaging interpretation
- Pathology and histopathology
- Differential diagnosis
- Clinical correlations`;

  const typeSpecific = {
    'lab': 'Focus on laboratory values, reference ranges, clinical significance of abnormalities, and potential underlying conditions.',
    'imaging': 'Emphasize radiological findings, anatomical locations, clinical correlations, and recommended follow-up.',
    'pathology': 'Highlight histological findings, cellular changes, diagnostic implications, and staging information.',
    'general': 'Provide comprehensive analysis of all clinical information presented with appropriate clinical context.'
  };

  return basePrompt + '\n\n' + (typeSpecific[documentType] || typeSpecific['general']);
}

/**
 * Build user prompt for interpretation
 */
function buildUserPrompt(medicalText, documentType) {
  return `Please analyze this ${documentType} report and provide a structured interpretation in JSON format with the following sections:

{
  "interpretation": {
    "summary": "Brief clinical overview in 2-3 sentences highlighting the most important findings",
    "keyFindings": ["Finding 1 with clinical significance", "Finding 2 with clinical significance", "..."],
    "abnormalities": ["Abnormality 1 with values, severity, and clinical implications", "..."],
    "normalFindings": ["Normal finding 1", "Normal finding 2", "..."]
  },
  "clinicalPearls": ["Clinical pearl 1 relevant to these findings", "Pearl 2", "..."],
  "potentialQuestions": ["Question 1 to ask the patient", "Question 2 about symptoms or history", "..."],
  "presentation": {
    "patientFriendly": "Clear explanation in simple, non-medical terms that a patient can understand",
    "recommendations": ["Recommendation 1 for follow-up or further testing", "Recommendation 2", "..."]
  }
}

Important:
- Be precise with numerical values and reference ranges
- Highlight any critical or urgent findings
- Consider differential diagnoses where appropriate
- Provide actionable clinical recommendations
- Use evidence-based clinical reasoning

Medical Report:
${medicalText}`;
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(aiResponse) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: return as plain text interpretation
    return {
      interpretation: {
        summary: aiResponse.substring(0, 500),
        keyFindings: [aiResponse],
        abnormalities: [],
        normalFindings: []
      },
      clinicalPearls: [],
      potentialQuestions: [],
      presentation: {
        patientFriendly: aiResponse,
        recommendations: []
      }
    };
  } catch (error) {
    Logger.log('Parse error: ' + error.toString());
    throw new Error('Failed to parse AI response');
  }
}

/**
 * Archive report to Google Drive
 */
function archiveReport(medicalText, interpretation, username, documentType) {
  try {
    // Get or create the MedWard Reports folder
    const folder = getOrCreateFolder(CONFIG.DRIVE_FOLDER_NAME);

    // Create report document
    const timestamp = new Date().toISOString();
    const fileName = `MedWard_Report_${documentType}_${timestamp}.txt`;

    const reportContent = `
MedWard Master - Medical Report Archive
========================================
Date: ${timestamp}
User: ${username}
Document Type: ${documentType}
AI Provider: ${interpretation.provider || 'N/A'}

ORIGINAL TEXT:
${medicalText}

INTERPRETATION:
${JSON.stringify(interpretation, null, 2)}
`;

    // Save to Drive
    const file = DriveApp.getFolderById(folder.getId()).createFile(
      fileName,
      reportContent,
      'text/plain'
    );

    Logger.log('Report archived: ' + file.getUrl());

  } catch (error) {
    Logger.log('Archive error: ' + error.toString());
    // Don't fail the main request if archiving fails
  }
}

/**
 * Get or create folder in Google Drive
 */
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(folderName);
}

/**
 * Generate simple authentication token
 */
function generateToken() {
  return Utilities.base64Encode(
    Utilities.getUuid() + ':' + new Date().getTime()
  );
}

/**
 * Test function for text interpretation
 */
function testInterpret() {
  const testData = {
    action: 'interpret',
    text: 'Hemoglobin: 10.2 g/dL (Low, Reference: 13.5-17.5)\nWBC: 4.5 K/uL (Normal, Reference: 4.0-11.0)\nPlatelets: 150 K/uL (Normal, Reference: 150-400)',
    documentType: 'lab',
    username: 'TestUser'
  };

  const result = handleInterpret(testData);
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Test function for image interpretation (requires base64 image)
 */
function testImageInterpret() {
  // Note: Replace with actual base64 image data for testing
  const testData = {
    action: 'interpret',
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
    documentType: 'lab',
    username: 'TestUser',
    provider: 'claude' // or 'openai'
  };

  const result = handleInterpret(testData);
  Logger.log(JSON.stringify(result, null, 2));
}
