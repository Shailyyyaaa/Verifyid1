// VerifyID — AI Validation API
// Vercel Serverless Function

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const DEMO_MODE = !process.env.ANTHROPIC_API_KEY || process.env.DEMO_MODE === 'true';

  try {
    const { action, data } = req.body;

    if (action === 'ocr_pan') {
      if (DEMO_MODE) return res.json(demoPANResult());
      return res.json(await realOCR(data.image, 'pan'));
    }

    if (action === 'ocr_aadhaar') {
      if (DEMO_MODE) return res.json(demoAadhaarResult());
      return res.json(await realOCR(data.image, 'aadhaar'));
    }

    if (action === 'face_check') {
      if (DEMO_MODE) return res.json(demoFaceResult());
      return res.json(await realFaceCheck(data.image));
    }

    if (action === 'validate_report') {
      if (DEMO_MODE) return res.json(demoValidationReport(data));
      return res.json(await realValidationReport(data));
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}

// ─── REAL AI FUNCTIONS ────────────────────────────────────────────────────────

async function callClaude(messages, system = '', maxTokens = 1000) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: maxTokens,
      system,
      messages
    })
  });
  const result = await response.json();
  return result.content[0].text;
}

async function realOCR(base64Image, docType) {
  const system = `You are an OCR and identity document analysis expert. Extract information accurately from identity documents. Always respond with valid JSON only, no markdown.`;

  const prompt = docType === 'pan'
    ? `Extract the following from this PAN card image and return as JSON:
       { "name": "", "pan_number": "", "dob": "", "father_name": "", "confidence": 0-100, "clarity": 0-100, "is_valid_pan": true/false }`
    : `Extract the following from this Aadhaar card image and return as JSON:
       { "name": "", "aadhaar_number_masked": "", "dob": "", "gender": "", "address": "", "confidence": 0-100, "clarity": 0-100, "is_valid_aadhaar": true/false }`;

  const messages = [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
      { type: 'text', text: prompt }
    ]
  }];

  const raw = await callClaude(messages, system, 500);
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return docType === 'pan' ? demoPANResult() : demoAadhaarResult();
  }
}

async function realFaceCheck(base64Image) {
  const system = `You are a facial analysis and liveness detection expert. Analyze selfie images for identity verification. Always respond with valid JSON only.`;

  const prompt = `Analyze this selfie/webcam image for identity verification and return as JSON:
  {
    "face_detected": true/false,
    "face_count": 0,
    "liveness_confidence": 0-100,
    "lighting_quality": 0-100,
    "image_clarity": 0-100,
    "glasses_detected": true/false,
    "mask_detected": true/false,
    "spoof_detected": true/false,
    "overall_pass": true/false,
    "notes": ""
  }`;

  const messages = [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
      { type: 'text', text: prompt }
    ]
  }];

  const raw = await callClaude(messages, system, 400);
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return demoFaceResult();
  }
}

async function realValidationReport(data) {
  const system = `You are an identity verification expert for financial institutions. Analyze identity validation data and generate a comprehensive risk assessment report. Always respond with valid JSON only.`;

  const prompt = `Generate a validation report for this identity verification submission:

Depositor: ${data.name}
Account: ${data.accountNumber}
Claim Amount: ₹${data.claimAmount}

PAN OCR Result: ${JSON.stringify(data.panOCR)}
Aadhaar OCR Result: ${JSON.stringify(data.aadhaarOCR)}
Face Check Result: ${JSON.stringify(data.faceCheck)}
Name entered by user: ${data.enteredName || 'N/A'}
PAN entered: ${data.enteredPAN || 'N/A'}
Aadhaar entered: ${data.enteredAadhaar || 'N/A'}

Return a JSON report:
{
  "overall_score": 0-100,
  "risk_level": "Low/Medium/High",
  "recommendation": "Approve/Review/Reject",
  "recommendation_text": "",
  "score_breakdown": {
    "document_authenticity": 0-100,
    "name_consistency": 0-100,
    "liveness_quality": 0-100,
    "data_completeness": 0-100
  },
  "flags": [{ "type": "positive/warning/negative", "message": "", "impact": "" }],
  "summary": ""
}`;

  const messages = [{ role: 'user', content: prompt }];
  const raw = await callClaude(messages, system, 800);
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return demoValidationReport(data);
  }
}

// ─── DEMO MODE RESPONSES ──────────────────────────────────────────────────────

function demoPANResult() {
  return {
    name: "RAHUL KUMAR SHARMA",
    pan_number: "ABCRS1234F",
    dob: "15/08/1985",
    father_name: "KUMAR SHARMA",
    confidence: 91,
    clarity: 89,
    is_valid_pan: true,
    demo: true
  };
}

function demoAadhaarResult() {
  return {
    name: "RAHUL SHARMA",
    aadhaar_number_masked: "XXXX XXXX 2036",
    dob: "15/08/1985",
    gender: "Male",
    address: "123, Sample Street, Mumbai - 400001",
    confidence: 87,
    clarity: 84,
    is_valid_aadhaar: true,
    demo: true
  };
}

function demoFaceResult() {
  return {
    face_detected: true,
    face_count: 1,
    liveness_confidence: 94,
    lighting_quality: 78,
    image_clarity: 85,
    glasses_detected: false,
    mask_detected: false,
    spoof_detected: false,
    overall_pass: true,
    notes: "Clear frontal face detected. Good lighting conditions.",
    demo: true
  };
}

function demoValidationReport(data) {
  const amount = data?.claimAmount || 0;
  const score = amount > 450000 ? 67 : amount > 300000 ? 78 : 88;
  const risk = score < 70 ? 'High' : score < 80 ? 'Medium' : 'Low';
  const rec = score < 60 ? 'Reject' : score < 75 ? 'Review' : 'Approve';

  return {
    overall_score: score,
    risk_level: risk,
    recommendation: rec,
    recommendation_text: rec === 'Approve'
      ? 'All identity checks passed. Documents are consistent and liveness verified.'
      : rec === 'Review'
      ? 'Minor inconsistencies detected. Manual review recommended before approval.'
      : 'Significant mismatches found. Reject and request re-submission with correct documents.',
    score_breakdown: {
      document_authenticity: score + 8,
      name_consistency: score - 10,
      liveness_quality: 94,
      data_completeness: 100
    },
    flags: [
      { type: score < 75 ? 'negative' : 'positive', message: score < 75 ? 'Aadhaar OCR name mismatch with declared name' : 'Name consistent across all documents', impact: score < 75 ? '-22 pts' : '+15 pts' },
      { type: 'positive', message: 'Liveness passed with high confidence (94%)', impact: '+20 pts' },
      { type: score < 80 ? 'warning' : 'positive', message: score < 80 ? 'PAN name partial match — review required' : 'PAN details fully verified', impact: score < 80 ? '-8 pts' : '+12 pts' },
      { type: 'positive', message: 'Both Aadhaar & PAN documents uploaded', impact: '+8 pts' },
      { type: 'positive', message: 'eSign completed successfully', impact: '+5 pts' }
    ],
    summary: `Identity validation completed for ${data?.name || 'depositor'}. Overall risk assessed as ${risk}. ${rec === 'Approve' ? 'Recommended for approval and settlement.' : rec === 'Review' ? 'Manual review required before proceeding.' : 'Submission should be rejected pending document correction.'}`,
    demo: true
  };
}
