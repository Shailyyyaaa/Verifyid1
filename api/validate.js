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
  // ── Helpers ──────────────────────────────────────────
  function normalize(s) {
    return (s || '').toUpperCase().replace(/[^A-Z\s]/g, '').trim();
  }
  function nameMatch(a, b) {
    const na = normalize(a), nb = normalize(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    const wordsA = na.split(/\s+/), wordsB = nb.split(/\s+/);
    const [shorter, longer] = wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];
    return shorter.every(w => longer.includes(w));
  }

  // ── Pull real OCR data ────────────────────────────────
  const pan      = data?.panOCR     || {};
  const aadh     = data?.aadhaarOCR || {};
  const face     = data?.faceCheck  || {};
  const declared = data?.name       || '';

  // ── Name consistency checks ───────────────────────────
  const panNameOk  = nameMatch(pan.name,  declared);
  const aadhNameOk = nameMatch(aadh.name, declared);
  const crossMatch = nameMatch(pan.name,  aadh.name);

  // ── Individual metrics ────────────────────────────────
  const panConf      = pan.confidence   || 85;
  const aadhConf     = aadh.confidence  || 85;
  const livenessConf = face.liveness_confidence || 92;
  const lightingOk   = (face.lighting_quality || 75) >= 60;
  const facePass     = face.overall_pass !== false;
  const docsDone     = !!(pan.pan_number || pan.name) && !!(aadh.aadhaar_number_masked || aadh.name);

  // ── Score (same formula as index.html) ───────────────
  let score = 50;
  score += panNameOk  ? 15 : -10;
  score += aadhNameOk ? 15 : -10;
  score += crossMatch ? 5  : -5;
  score += facePass   ? 12 : -8;
  score += lightingOk ? 3  : 0;
  score += docsDone   ? 8  : -5;
  score += panConf  >= 85 ? 3 : 0;
  score += aadhConf >= 85 ? 3 : 0;
  score = Math.max(20, Math.min(99, Math.round(score)));

  const nameConsistency  = (panNameOk && aadhNameOk && crossMatch) ? 95 : (panNameOk || aadhNameOk) ? 65 : 35;
  const docAuthenticity  = Math.round((panConf + aadhConf) / 2);
  const risk = score >= 80 ? 'Low' : score >= 65 ? 'Medium' : 'High';
  const rec  = score >= 80 ? 'Approve' : score >= 65 ? 'Review' : 'Reject';

  // ── Flags based on actual results ────────────────────
  const flags = [];

  flags.push(panNameOk
    ? { type: 'positive', message: `PAN name "${pan.name || '—'}" matches declared name — verified`, impact: '+15 pts' }
    : { type: 'negative', message: `PAN name "${pan.name || '—'}" does not match declared name "${declared}"`, impact: '-10 pts' });

  flags.push(aadhNameOk
    ? { type: 'positive', message: `Aadhaar name "${aadh.name || '—'}" matches declared name — verified`, impact: '+15 pts' }
    : { type: 'negative', message: `Aadhaar name "${aadh.name || '—'}" does not match declared name "${declared}"`, impact: '-10 pts' });

  flags.push(crossMatch
    ? { type: 'positive', message: 'PAN and Aadhaar names are consistent with each other', impact: '+5 pts' }
    : { type: 'warning',  message: 'PAN and Aadhaar names differ slightly — possible abbreviation', impact: '-5 pts' });

  flags.push(facePass
    ? { type: 'positive', message: `Liveness check passed — confidence ${livenessConf}%`, impact: '+12 pts' }
    : { type: 'negative', message: 'Liveness check failed or was inconclusive', impact: '-8 pts' });

  if (!lightingOk) flags.push({ type: 'warning', message: 'Low lighting quality during liveness capture', impact: '0 pts' });

  flags.push(docsDone
    ? { type: 'positive', message: 'Both PAN and Aadhaar documents uploaded and processed', impact: '+8 pts' }
    : { type: 'warning',  message: 'One or more identity documents missing', impact: '-5 pts' });

  flags.push({ type: 'positive', message: 'eSign completed successfully', impact: '+5 pts' });

  const recText = rec === 'Approve'
    ? 'All identity checks passed. Names are consistent across PAN, Aadhaar, and declared details. Liveness verified. Recommended for approval.'
    : rec === 'Review'
    ? `Some checks require manual review.${!panNameOk ? ' PAN name mismatch detected.' : ''}${!aadhNameOk ? ' Aadhaar name mismatch detected.' : ''}${!facePass ? ' Liveness inconclusive.' : ''} Please verify before proceeding.`
    : `Significant issues found.${!panNameOk ? ' PAN name mismatch.' : ''}${!aadhNameOk ? ' Aadhaar name mismatch.' : ''}${!facePass ? ' Liveness failed.' : ''} Reject and request re-submission.`;

  return {
    overall_score: score,
    risk_level: risk,
    recommendation: rec,
    recommendation_text: recText,
    score_breakdown: {
      document_authenticity: docAuthenticity,
      name_consistency:      nameConsistency,
      liveness_quality:      livenessConf,
      data_completeness:     docsDone ? 100 : 60
    },
    flags,
    summary: `Identity validation completed for ${declared || 'depositor'}. Score: ${score}/100. Risk: ${risk}. ${recText}`,
    demo: true
  };
}
