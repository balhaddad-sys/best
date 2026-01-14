/**
 * MedWard Master - Backend API
 * Google Apps Script Web App
 *
 * SETUP INSTRUCTIONS:
 * 1. Copy this code to script.google.com
 * 2. Add Script Property: OPENAI_API_KEY = your_openai_key
 * 3. Enable Drive API service
 * 4. Deploy as Web App (Execute as: Me, Access: Anyone)
 */

// Configuration
const CONFIG = {
  OPENAI_MODEL: 'gpt-4',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.7,
  DRIVE_FOLDER_NAME: 'MedWard Reports'
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
  return createCORSResponse({ status: 'MedWard Backend API is running' });
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
    let medicalText = data.text || '';
    const documentType = data.documentType || 'general';
    const username = data.username || 'Anonymous';

    // If image is provided, extract text using OCR
    if (data.image) {
      medicalText = performOCR(data.image);
      if (!medicalText) {
        return { success: false, error: 'OCR failed to extract text from image' };
      }
    }

    if (!medicalText || medicalText.trim().length === 0) {
      return { success: false, error: 'No medical text provided' };
    }

    // Get AI interpretation
    const interpretation = getAIInterpretation(medicalText, documentType);

    // Archive the report to Google Drive
    archiveReport(medicalText, interpretation, username, documentType);

    return {
      success: true,
      ...interpretation,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    Logger.log('Interpret error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Perform OCR on base64 image using Google Drive API
 */
function performOCR(base64Image) {
  try {
    // Remove data:image/...;base64, prefix if present
    const base64Data = base64Image.split(',')[1] || base64Image;

    // Decode base64 to blob
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      'image/png',
      'temp_image.png'
    );

    // Upload to Drive temporarily
    const file = Drive.Files.insert(
      { title: 'temp_ocr_' + new Date().getTime() },
      blob,
      { ocr: true, ocrLanguage: 'en' }
    );

    // Get the recognized text
    const doc = Drive.Files.get(file.id);
    const text = doc.description || '';

    // Delete temporary file
    Drive.Files.remove(file.id);

    return text;

  } catch (error) {
    Logger.log('OCR Error: ' + error.toString());
    return null;
  }
}

/**
 * Get AI interpretation using OpenAI API
 */
function getAIInterpretation(medicalText, documentType) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error('OpenAI API key not configured in Script Properties');
  }

  // Build the prompt based on document type
  const systemPrompt = buildSystemPrompt(documentType);
  const userPrompt = buildUserPrompt(medicalText, documentType);

  // Call OpenAI API
  const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      model: CONFIG.OPENAI_MODEL,
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

  // Parse the AI response
  const aiResponse = result.choices[0].message.content;
  return parseAIResponse(aiResponse);
}

/**
 * Build system prompt based on document type
 */
function buildSystemPrompt(documentType) {
  const basePrompt = `You are MedWard Master, an expert medical AI assistant specializing in clinical interpretation.
Your role is to analyze medical reports and provide clear, actionable insights for healthcare professionals.`;

  const typeSpecific = {
    'lab': 'Focus on laboratory values, reference ranges, and clinical significance of abnormalities.',
    'imaging': 'Emphasize radiological findings, anatomical locations, and clinical correlations.',
    'pathology': 'Highlight histological findings, cellular changes, and diagnostic implications.',
    'general': 'Provide comprehensive analysis of all clinical information presented.'
  };

  return basePrompt + '\n' + (typeSpecific[documentType] || typeSpecific['general']);
}

/**
 * Build user prompt for interpretation
 */
function buildUserPrompt(medicalText, documentType) {
  return `Please analyze this ${documentType} report and provide a structured interpretation in JSON format with the following sections:

{
  "interpretation": {
    "summary": "Brief overview in 2-3 sentences",
    "keyFindings": ["Finding 1", "Finding 2", "..."],
    "abnormalities": ["Abnormality 1 with values and significance", "..."],
    "normalFindings": ["Normal finding 1", "..."]
  },
  "clinicalPearls": ["Pearl 1", "Pearl 2", "..."],
  "potentialQuestions": ["Question 1 for patient", "Question 2", "..."],
  "presentation": {
    "patientFriendly": "Explanation in simple terms",
    "recommendations": ["Recommendation 1", "Recommendation 2", "..."]
  }
}

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
 * Test function for development
 */
function testInterpret() {
  const testData = {
    action: 'interpret',
    text: 'Hemoglobin: 10.2 g/dL (Low)\nWBC: 4.5 K/uL (Normal)\nPlatelets: 150 K/uL (Normal)',
    documentType: 'lab',
    username: 'TestUser'
  };

  const result = handleInterpret(testData);
  Logger.log(JSON.stringify(result, null, 2));
}
