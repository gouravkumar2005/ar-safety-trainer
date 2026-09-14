// Minimal i18n. Two languages are filled in for real (en, hi). The PS also
// requires Santali — that's added as a locked option because machine
// translation for Santali (esp. in Ol Chiki script) is unreliable enough
// that shipping guessed strings would do more harm than good. Get real
// Santali copy from a native speaker/translator and drop it into
// STRINGS.sat — the toggle below will pick it up automatically.

export const STRINGS = {
  en: {
    appName: 'AR Safety Trainer',
    tagline: 'Jharkhand Mines & Manufacturing',
    modules: 'Training Modules',
    startTraining: 'Start Training',
    comingSoon: 'Model not loaded yet',
    viewInAR: 'View in your space (AR)',
    rotateHint: 'Drag to rotate • Pinch to zoom',
    hotspotsHint: 'Tap the glowing points to learn about each hazard',
    takeQuiz: 'Take Assessment',
    ppeGalleryBtn: 'Explore each item in detail',
    ppeGalleryHeading: 'PPE Items',
    ppeGallerySubheading: 'Tap an item to see it up close, in 3D.',
    // Generic versions — src/screens/itemGallery.js uses these for any
    // module's gallery (PPE Compliance or Machinery Safety); the two
    // ppeGallery* keys above stay for backward compatibility, unused now.
    itemGallerySubheading: 'Tap an item to see it up close, in 3D.',
    tourBtn: '🎮 Play as a Guided Tour',
    tourSwipeHint: 'Swipe, or tap Next, to continue',
    tourStep: 'Step',
    tourPrev: 'Previous',
    tourFinishBtn: 'Finish',
    tourCompleteTitlePpe: '✅ Fully Equipped!',
    tourCompleteBodyPpe: 'You now know what each piece of protective gear does and why it matters.',
    tourCompleteTitleMachinery: '✅ That’s the Full Process!',
    tourCompleteBodyMachinery: 'You’ve walked through how this machine operates and where each hazard is.',
    question: 'Question',
    submit: 'Submit',
    next: 'Next',
    yourScore: 'Your score',
    pass: 'PASS',
    fail: 'FAIL — Review the module and try again',
    passThreshold: 'Pass mark: 70%',
    getCertificate: 'Get Certificate',
    retryQuiz: 'Retry Assessment',
    backToModules: 'Back to modules',
    workerName: 'Worker name',
    workerId: 'Worker / Employee ID',
    generateCert: 'Generate Certificate',
    certTitle: 'Safety Training Certificate',
    certIssued: 'Issued',
    certModule: 'Module',
    certScore: 'Score',
    certLedgerEntry: 'Ledger entry',
    certScanNote: 'Scan to verify authenticity',
    certCopyJson: 'Copy certificate data',
    certCopied: 'Copied!',
    certGoVerify: 'Open verifier',
    demoSignatureNote:
      "Signed with this device's own private key, which never leaves it, and chained to every certificate issued before it on this device — tampering with this or any past certificate here is detectable. This does not yet prove anything across devices; use the verifier on this same device, or the admin dashboard's import, to confirm full chain integrity.",
    offlineReady: 'Offline ready — this module works underground / no signal',
    langToggle: 'हिंदी',
    verify: 'Verify',
    verifyHeading: 'Verify a Certificate',
    verifySubheading: "Paste the certificate data encoded in a worker's QR code.",
    verifyPasteLabel: 'Certificate data',
    verifyBtn: 'Check',
    verifyParseError: "Couldn't read that as certificate data — check you pasted the full text.",
    verifyResultValid: 'VALID',
    verifyResultValidDetail: 'Signature and content match — this certificate has not been altered.',
    verifyResultTampered: 'TAMPERED',
    verifyResultTamperedDetail: "This certificate's content does not match its signature. Do not accept it.",
    verifyChainIntact: 'Chain intact on this device — {n} entries verified, nothing altered.',
    verifyChainBroken: 'Chain broken at entry #{n} on this device — data was altered after issuance.',
    verifyUnknownDevice:
      "Signature is valid, but this device has no record of this certificate to confirm its place in the training history. Expected when verifying on a different device — use the admin dashboard to cross-check against the issuing device's export.",
    adminHeading: 'Compliance Dashboard',
    adminSubheading: "No live sync yet (offline-first prototype) — export a worker's data on their device, then import it here to review.",
    adminExportBtn: "Export this device's data",
    adminExportHint: 'Run this on the worker/trainee’s device, then share the downloaded file with the admin.',
    adminImportLabel: 'Import an exported file',
    adminNoData: 'No file imported yet.',
    adminWorker: 'Worker',
    adminModuleResults: 'Module results',
    adminCertificates: 'Certificates issued',
    adminVerifyBtn: 'Verify ledger integrity',
    adminIntegrityValid: 'All {n} entries intact — no tampering detected.',
    adminIntegrityBroken: 'Tampering detected at entry #{n}.',
    adminImportError: "Couldn't read that file as an exported data file.",

    // Accessibility / voice narration
    textSizeBtn: 'Text size',
    soundToggleBtn: 'Sound effects on/off',
    listenBtn: '🔊 Listen',
    stopBtn: '⏹ Stop',
    optionLabel: 'Option',
    optionCorrectSuffix: '— ✓ correct answer',
    optionIncorrectSuffix: '— ✗ your answer, incorrect',
    answerCorrectAnnounce: 'Correct!',
    answerIncorrectAnnounce: 'Incorrect.',
    voiceUnavailableNote: "Voice narration isn't available in this language on this device.",

    // e-Shram UAN (honest field, not a live government check — see certUanNote)
    workerUan: 'e-Shram UAN (optional)',
    uanFieldHint: 'Your Universal Account Number from the e-Shram portal, if you have one.',
    certUanLabel: 'e-Shram UAN',
    certUanNote: 'Entered by the worker; not verified against the e-Shram database.',

    // NSQF metadata (indicative mapping, not an official accreditation — see nsqfDisclaimerNote)
    certNsqfLabel: 'NSQF Level',
    nsqfDisclaimerNote:
      'This module has been internally mapped to an indicative NSQF level and competency area by the training provider for reference only. This is NOT an NSDC/NSQF-accredited qualification, and no official recognition under the National Skills Qualification Framework has been granted for this certificate.',

    // DigiLocker (honestly disabled — see digilockerNote)
    digilockerBtn: 'Save to DigiLocker',
    digilockerStatusBadge: 'Pending official onboarding',
    digilockerNote:
      "This certificate isn't yet issued through DigiLocker. That requires this training program to be officially onboarded as a registered DigiLocker issuer by the sponsoring government department — not something this app can enable on its own.",

    // Grievance / feedback channel
    grievanceNavLink: 'Report a concern',
    grievanceHeading: 'Report a Concern',
    grievanceSubheading: "Report a hazard, a problem with the training content, or anything else. You don't have to give your name.",
    grievanceCategoryLabel: 'Category',
    grievanceModuleLabel: 'Related module (optional)',
    grievanceModuleNone: 'Not related to a specific module',
    grievanceDescLabel: 'What happened?',
    grievanceAnonHint: 'Your name, ID, and contact are all optional — you can submit this anonymously.',
    grievanceContactLabel: 'Contact (optional, for follow-up)',
    grievanceSubmitBtn: 'Submit report',
    grievanceSubmittedTitle: 'Report submitted',
    grievanceSubmittedDetail: 'This has been recorded and is visible to compliance officers on the admin dashboard.',
    grievanceRefLabel: 'Reference number',

    // Admin: aggregate MIS view
    adminAggregateHeading: 'Aggregate Overview (MIS)',
    adminAggregateImportLabel: 'Import multiple exported files for aggregate stats',
    adminPassRateHeading: 'Pass rates by module',
    adminMostMissedHeading: 'Most-missed quiz questions',
    adminCoverageHeading: 'Worker coverage (this batch)',
    adminCoverageFormat: '{n} worker(s) in this imported batch',
    adminPassRateFormat: '{passes}/{attempts} attempts passed ({rate}%)',
    adminMissedFormat: '{count}× missed — {question}',
    adminExcludedFilesNote: 'Excluded from stats (failed integrity check): {n} file(s).',
    adminGrievancesHeading: 'Reported concerns',
    adminNoGrievances: 'None reported.',
    adminAuditReportBtn: 'Generate audit report',

    // Audit report body (utils/auditReport.js)
    auditReportTitle: 'AR Safety Trainer — Ledger Audit Report',
    auditReportGeneratedOn: 'Generated on',
    auditReportDeviceFingerprint: 'Issuing device fingerprint',
    auditReportWorker: 'Worker',
    auditReportEntries: 'Ledger entries (chronological)',
    auditReportIntegrity: 'Integrity check',
    auditReportIntegrityPass: 'PASSED — {n} entries verified intact, no tampering detected.',
    auditReportIntegrityFail: 'FAILED — chain broken at entry #{n}. Data was altered after issuance.',
    auditReportScopeNote:
      'This report is suitable for internal review or an RTI-style disclosure request. It reflects data recorded on and exported by a single worker’s device, and is not a substitute for centralized government record-keeping.',
    auditStatusPass: 'PASSED',
    auditStatusFail: 'FAILED',
    auditEntryQuiz: '#{seq} ({time}): Quiz completed — {module} — {score}/{total} — {status}',
    auditEntryCert: '#{seq} ({time}): Certificate issued — {module} — {name} ({id}) — {score}/{total}',
    auditEntryGrievance: '#{seq} ({time}): Concern reported — category: {category}{moduleSuffix}',
    auditEntryUnknown: '#{seq} ({time}): {type}',

    // Emergency Response — voice-triaged first aid + honest camera assist
    emergencyHeading: 'Emergency Response',
    emergencySubheading: "Tell me what happened, or pick from the list below. This does not diagnose from camera — you say or choose the injury, and it guides you through it.",
    emergencyMicBtn: '🎤 Tell me what happened',
    emergencyMicListening: 'Listening…',
    emergencyMicUnsupported: "Voice input isn't available on this device — use the list below instead.",
    emergencyMicNoMatch: "Didn't catch a clear match — please pick from the list below.",
    emergencyGridHeading: 'Or choose directly',
    emergencyBackToHub: '← Back to Emergency Response',
    emergencyStepOf: 'Step {n} of {total}',
    emergencyCameraAssistBtn: '📷 Start camera assist (rate check)',
    emergencyCameraAssistHeading: 'CPR Rate — Camera Assist',
    emergencyCameraAssistNote:
      'This only tracks your hand motion to estimate compressions per minute — it does not diagnose any injury or replace the guide steps. Depth shown is relative, not an exact measurement.',
    emergencyCameraPermissionDenied: "Camera isn't available or permission was denied. The guide above still works fully without it — pace yourself to about 100-120 compressions per minute.",
    emergencyCameraRateLabel: 'Estimated rate',
    emergencyCameraRateUnit: 'compressions/min',
    emergencyCameraLowConfidence: "Can't see your hand clearly — move closer / improve lighting.",
    emergencyCameraTargetBand: 'Target: 100-120/min',
    emergencyCameraStartBtn: 'Start',
    emergencyCameraStopBtn: 'Stop',
    emergencyPoseAssistBtn: '📷 Show me on camera',
    emergencyPoseAssistNote: 'This only points to where on the body, based on the injury you already told it — it never guesses what happened.',
    emergencyGuideNotFound: "That guide isn't available.",
    emergencyCompleteBody: "You've been through every step. Keep helping until trained medical help arrives — you can reopen this guide any time.",
  },
  hi: {
    appName: 'एआर सेफ्टी ट्रेनर',
    tagline: 'झारखंड खनन एवं विनिर्माण',
    modules: 'प्रशिक्षण मॉड्यूल',
    startTraining: 'प्रशिक्षण शुरू करें',
    comingSoon: 'मॉडल अभी लोड नहीं हुआ',
    viewInAR: 'अपने स्थान में देखें (AR)',
    rotateHint: 'घुमाने के लिए खींचें • ज़ूम के लिए पिंच करें',
    hotspotsHint: 'प्रत्येक खतरे के बारे में जानने के लिए चमकते बिंदुओं को दबाएँ',
    takeQuiz: 'मूल्यांकन लें',
    ppeGalleryBtn: 'हर वस्तु को विस्तार से देखें',
    ppeGalleryHeading: 'PPE वस्तुएँ',
    ppeGallerySubheading: 'किसी वस्तु को नज़दीक से 3D में देखने के लिए टैप करें।',
    itemGallerySubheading: 'किसी वस्तु को नज़दीक से 3D में देखने के लिए टैप करें।',
    tourBtn: '🎮 गाइडेड टूर की तरह खेलें',
    tourSwipeHint: 'जारी रखने के लिए स्वाइप करें, या Next दबाएँ',
    tourStep: 'चरण',
    tourPrev: 'पिछला',
    tourFinishBtn: 'समाप्त करें',
    tourCompleteTitlePpe: '✅ पूरी तरह सुसज्जित!',
    tourCompleteBodyPpe: 'अब आप जानते हैं कि हर सुरक्षा उपकरण क्या करता है और वह क्यों ज़रूरी है।',
    tourCompleteTitleMachinery: '✅ यही पूरी प्रक्रिया है!',
    tourCompleteBodyMachinery: 'आपने देख लिया कि यह मशीन कैसे काम करती है और हर खतरा कहाँ है।',
    question: 'प्रश्न',
    submit: 'जमा करें',
    next: 'अगला',
    yourScore: 'आपका स्कोर',
    pass: 'उत्तीर्ण',
    fail: 'अनुत्तीर्ण — मॉड्यूल दोबारा देखें और पुनः प्रयास करें',
    passThreshold: 'उत्तीर्ण अंक: 70%',
    getCertificate: 'प्रमाणपत्र प्राप्त करें',
    retryQuiz: 'पुनः मूल्यांकन करें',
    backToModules: 'मॉड्यूल पर वापस जाएँ',
    workerName: 'कर्मचारी का नाम',
    workerId: 'कर्मचारी / पहचान संख्या',
    generateCert: 'प्रमाणपत्र बनाएँ',
    certTitle: 'सुरक्षा प्रशिक्षण प्रमाणपत्र',
    certIssued: 'जारी किया गया',
    certModule: 'मॉड्यूल',
    certScore: 'स्कोर',
    certLedgerEntry: 'लेजर एंट्री',
    certScanNote: 'प्रामाणिकता जांचने के लिए स्कैन करें',
    certCopyJson: 'प्रमाणपत्र डेटा कॉपी करें',
    certCopied: 'कॉपी हो गया!',
    certGoVerify: 'सत्यापक खोलें',
    demoSignatureNote:
      'इस डिवाइस की अपनी निजी कुंजी से हस्ताक्षरित, जो कभी इससे बाहर नहीं जाती, और इस डिवाइस पर जारी हर पिछले प्रमाणपत्र से जुड़ी हुई है — इसमें या किसी भी पिछले प्रमाणपत्र में छेड़छाड़ पकड़ी जा सकती है। यह अभी डिवाइस के पार कुछ साबित नहीं करता; पूरी चेन की अखंडता जांचने के लिए इसी डिवाइस पर सत्यापक, या एडमिन डैशबोर्ड का इम्पोर्ट इस्तेमाल करें।',
    offlineReady: 'ऑफ़लाइन उपलब्ध — यह मॉड्यूल भूमिगत/बिना नेटवर्क भी काम करता है',
    langToggle: 'English',
    verify: 'सत्यापन',
    verifyHeading: 'प्रमाणपत्र सत्यापित करें',
    verifySubheading: 'कर्मचारी के QR कोड में मौजूद प्रमाणपत्र डेटा यहाँ पेस्ट करें।',
    verifyPasteLabel: 'प्रमाणपत्र डेटा',
    verifyBtn: 'जांचें',
    verifyParseError: 'इसे प्रमाणपत्र डेटा के रूप में नहीं पढ़ पाया — जांचें कि पूरा टेक्स्ट पेस्ट हुआ है।',
    verifyResultValid: 'मान्य',
    verifyResultValidDetail: 'हस्ताक्षर और सामग्री मेल खाती है — इस प्रमाणपत्र में कोई बदलाव नहीं हुआ है।',
    verifyResultTampered: 'छेड़छाड़ हुई',
    verifyResultTamperedDetail: 'इस प्रमाणपत्र की सामग्री उसके हस्ताक्षर से मेल नहीं खाती। इसे स्वीकार न करें।',
    verifyChainIntact: 'इस डिवाइस पर चेन बरकरार है — {n} एंट्री सत्यापित, कोई बदलाव नहीं।',
    verifyChainBroken: 'इस डिवाइस पर एंट्री #{n} पर चेन टूटी हुई है — जारी होने के बाद डेटा बदला गया।',
    verifyUnknownDevice:
      'हस्ताक्षर मान्य है, लेकिन इस डिवाइस के पास इस प्रमाणपत्र का कोई रिकॉर्ड नहीं है जिससे प्रशिक्षण इतिहास में इसका स्थान पुष्टि हो सके। किसी अन्य डिवाइस पर सत्यापन करते समय यह सामान्य है — जारी करने वाले डिवाइस के एक्सपोर्ट से जांचने के लिए एडमिन डैशबोर्ड का उपयोग करें।',
    adminHeading: 'अनुपालन डैशबोर्ड',
    adminSubheading: 'अभी लाइव सिंक नहीं है (ऑफ़लाइन-फर्स्ट प्रोटोटाइप) — कर्मचारी के डिवाइस पर डेटा एक्सपोर्ट करें, फिर समीक्षा के लिए यहाँ इम्पोर्ट करें।',
    adminExportBtn: 'इस डिवाइस का डेटा एक्सपोर्ट करें',
    adminExportHint: 'इसे कर्मचारी/प्रशिक्षु के डिवाइस पर चलाएँ, फिर डाउनलोड की गई फ़ाइल एडमिन के साथ साझा करें।',
    adminImportLabel: 'एक्सपोर्ट की गई फ़ाइल इम्पोर्ट करें',
    adminNoData: 'अभी तक कोई फ़ाइल इम्पोर्ट नहीं हुई।',
    adminWorker: 'कर्मचारी',
    adminModuleResults: 'मॉड्यूल परिणाम',
    adminCertificates: 'जारी किए गए प्रमाणपत्र',
    adminVerifyBtn: 'लेजर अखंडता जांचें',
    adminIntegrityValid: 'सभी {n} एंट्री बरकरार — कोई छेड़छाड़ नहीं मिली।',
    adminIntegrityBroken: 'एंट्री #{n} पर छेड़छाड़ पाई गई।',
    adminImportError: 'इस फ़ाइल को एक्सपोर्ट की गई डेटा फ़ाइल के रूप में नहीं पढ़ पाया।',

    // सुगम्यता / वॉइस नैरेशन
    textSizeBtn: 'टेक्स्ट आकार',
    soundToggleBtn: 'साउंड इफ़ेक्ट चालू/बंद',
    listenBtn: '🔊 सुनें',
    stopBtn: '⏹ रोकें',
    optionLabel: 'विकल्प',
    optionCorrectSuffix: '— ✓ सही उत्तर',
    optionIncorrectSuffix: '— ✗ आपका उत्तर, गलत',
    answerCorrectAnnounce: 'सही!',
    answerIncorrectAnnounce: 'गलत।',
    voiceUnavailableNote: 'इस डिवाइस पर इस भाषा में वॉइस नैरेशन उपलब्ध नहीं है।',

    // e-Shram UAN
    workerUan: 'e-श्रम UAN (वैकल्पिक)',
    uanFieldHint: 'e-श्रम पोर्टल से आपका यूनिवर्सल अकाउंट नंबर, अगर आपके पास है।',
    certUanLabel: 'e-श्रम UAN',
    certUanNote: 'कर्मचारी द्वारा दर्ज किया गया; e-श्रम डेटाबेस से सत्यापित नहीं।',

    // NSQF
    certNsqfLabel: 'NSQF स्तर',
    nsqfDisclaimerNote:
      'इस मॉड्यूल को प्रशिक्षण प्रदाता द्वारा केवल संदर्भ के लिए एक संकेतात्मक NSQF स्तर और दक्षता क्षेत्र से आंतरिक रूप से मैप किया गया है। यह NSDC/NSQF-मान्यता प्राप्त योग्यता नहीं है, और इस प्रमाणपत्र को नेशनल स्किल्स क्वालिफिकेशन फ्रेमवर्क के तहत कोई आधिकारिक मान्यता नहीं दी गई है।',

    // DigiLocker
    digilockerBtn: 'DigiLocker में सहेजें',
    digilockerStatusBadge: 'आधिकारिक ऑनबोर्डिंग लंबित',
    digilockerNote:
      'यह प्रमाणपत्र अभी DigiLocker के माध्यम से जारी नहीं हुआ है। इसके लिए प्रायोजक सरकारी विभाग द्वारा इस प्रशिक्षण कार्यक्रम को एक पंजीकृत DigiLocker जारीकर्ता के रूप में आधिकारिक तौर पर ऑनबोर्ड किया जाना ज़रूरी है — यह ऐप अपने आप इसे सक्षम नहीं कर सकता।',

    // शिकायत/फीडबैक चैनल
    grievanceNavLink: 'चिंता दर्ज करें',
    grievanceHeading: 'चिंता दर्ज करें',
    grievanceSubheading: 'किसी खतरे, प्रशिक्षण सामग्री की समस्या, या किसी अन्य बात की रिपोर्ट करें। अपना नाम देना ज़रूरी नहीं है।',
    grievanceCategoryLabel: 'श्रेणी',
    grievanceModuleLabel: 'संबंधित मॉड्यूल (वैकल्पिक)',
    grievanceModuleNone: 'किसी विशेष मॉड्यूल से संबंधित नहीं',
    grievanceDescLabel: 'क्या हुआ?',
    grievanceAnonHint: 'आपका नाम, ID, और संपर्क सभी वैकल्पिक हैं — आप इसे गुमनाम रूप से जमा कर सकते हैं।',
    grievanceContactLabel: 'संपर्क (वैकल्पिक, फ़ॉलो-अप के लिए)',
    grievanceSubmitBtn: 'रिपोर्ट जमा करें',
    grievanceSubmittedTitle: 'रिपोर्ट जमा हो गई',
    grievanceSubmittedDetail: 'यह दर्ज कर लिया गया है और एडमिन डैशबोर्ड पर अनुपालन अधिकारियों को दिखेगा।',
    grievanceRefLabel: 'संदर्भ संख्या',

    // एडमिन: समग्र MIS दृश्य
    adminAggregateHeading: 'समग्र अवलोकन (MIS)',
    adminAggregateImportLabel: 'समग्र आँकड़ों के लिए कई एक्सपोर्ट फ़ाइलें इम्पोर्ट करें',
    adminPassRateHeading: 'मॉड्यूल अनुसार उत्तीर्ण दर',
    adminMostMissedHeading: 'सबसे ज़्यादा गलत हुए प्रश्न',
    adminCoverageHeading: 'कर्मचारी कवरेज (इस बैच में)',
    adminCoverageFormat: '{n} कर्मचारी इस इम्पोर्ट किए गए बैच में',
    adminPassRateFormat: '{passes}/{attempts} प्रयास उत्तीर्ण ({rate}%)',
    adminMissedFormat: '{count} बार गलत — {question}',
    adminExcludedFilesNote: 'आँकड़ों से बाहर रखा गया (अखंडता जांच विफल): {n} फ़ाइल(ें)।',
    adminGrievancesHeading: 'दर्ज की गई चिंताएँ',
    adminNoGrievances: 'कोई दर्ज नहीं।',
    adminAuditReportBtn: 'ऑडिट रिपोर्ट बनाएँ',

    // ऑडिट रिपोर्ट बॉडी
    auditReportTitle: 'एआर सेफ्टी ट्रेनर — लेजर ऑडिट रिपोर्ट',
    auditReportGeneratedOn: 'बनाई गई तारीख',
    auditReportDeviceFingerprint: 'जारीकर्ता डिवाइस फ़िंगरप्रिंट',
    auditReportWorker: 'कर्मचारी',
    auditReportEntries: 'लेजर एंट्री (कालानुक्रमिक)',
    auditReportIntegrity: 'अखंडता जांच',
    auditReportIntegrityPass: 'उत्तीर्ण — {n} एंट्री बरकरार सत्यापित, कोई छेड़छाड़ नहीं मिली।',
    auditReportIntegrityFail: 'विफल — एंट्री #{n} पर चेन टूटी हुई है। जारी होने के बाद डेटा बदला गया।',
    auditReportScopeNote:
      'यह रिपोर्ट आंतरिक समीक्षा या RTI-शैली के प्रकटीकरण अनुरोध के लिए उपयुक्त है। यह एक ही कर्मचारी के डिवाइस पर दर्ज और उससे एक्सपोर्ट किए गए डेटा को दर्शाती है, और केंद्रीकृत सरकारी रिकॉर्ड-कीपिंग का विकल्प नहीं है।',
    auditStatusPass: 'उत्तीर्ण',
    auditStatusFail: 'अनुत्तीर्ण',
    auditEntryQuiz: '#{seq} ({time}): क्विज़ पूर्ण — {module} — {score}/{total} — {status}',
    auditEntryCert: '#{seq} ({time}): प्रमाणपत्र जारी — {module} — {name} ({id}) — {score}/{total}',
    auditEntryGrievance: '#{seq} ({time}): चिंता दर्ज — श्रेणी: {category}{moduleSuffix}',
    auditEntryUnknown: '#{seq} ({time}): {type}',

    // आपातकालीन प्रतिक्रिया — वॉइस-आधारित प्राथमिक चिकित्सा + ईमानदार कैमरा सहायता
    emergencyHeading: 'आपातकालीन प्रतिक्रिया',
    emergencySubheading: 'क्या हुआ बताइए, या नीचे सूची से चुनें। यह कैमरे से निदान नहीं करता — आप चोट बताते या चुनते हैं, और यह आपको उसमें मार्गदर्शन करता है।',
    emergencyMicBtn: '🎤 क्या हुआ बताइए',
    emergencyMicListening: 'सुन रहा है…',
    emergencyMicUnsupported: 'इस डिवाइस पर वॉइस इनपुट उपलब्ध नहीं है — नीचे दी गई सूची का उपयोग करें।',
    emergencyMicNoMatch: 'स्पष्ट मिलान नहीं मिला — कृपया नीचे सूची से चुनें।',
    emergencyGridHeading: 'या सीधे चुनें',
    emergencyBackToHub: '← आपातकालीन प्रतिक्रिया पर वापस जाएँ',
    emergencyStepOf: 'चरण {n} / {total}',
    emergencyCameraAssistBtn: '📷 कैमरा सहायता शुरू करें (गति जांच)',
    emergencyCameraAssistHeading: 'सीपीआर गति — कैमरा सहायता',
    emergencyCameraAssistNote:
      'यह केवल आपके हाथ की गति को ट्रैक करके प्रति मिनट कंप्रेशन का अनुमान लगाता है — यह किसी चोट का निदान नहीं करता या गाइड के चरणों की जगह नहीं लेता। दिखाई गई गहराई सापेक्ष है, सटीक माप नहीं।',
    emergencyCameraPermissionDenied: 'कैमरा उपलब्ध नहीं है या अनुमति नहीं मिली। ऊपर की गाइड इसके बिना भी पूरी तरह काम करती है — लगभग 100-120 कंप्रेशन प्रति मिनट की गति बनाए रखें।',
    emergencyCameraRateLabel: 'अनुमानित गति',
    emergencyCameraRateUnit: 'कंप्रेशन/मिनट',
    emergencyCameraLowConfidence: 'आपका हाथ स्पष्ट नहीं दिख रहा — कैमरे के पास आएं / रोशनी बढ़ाएं।',
    emergencyCameraTargetBand: 'लक्ष्य: 100-120/मिनट',
    emergencyCameraStartBtn: 'शुरू करें',
    emergencyCameraStopBtn: 'रोकें',
    emergencyPoseAssistBtn: '📷 मुझे कैमरे पर दिखाएं',
    emergencyPoseAssistNote: 'यह केवल शरीर पर वहां इशारा करता है जहां, आपके पहले से बताए गए चोट के आधार पर — यह कभी अनुमान नहीं लगाता कि क्या हुआ।',
    emergencyGuideNotFound: 'वह गाइड उपलब्ध नहीं है।',
    emergencyCompleteBody: 'आपने सभी चरण पूरे कर लिए। प्रशिक्षित चिकित्सा सहायता आने तक मदद जारी रखें — आप इस गाइड को कभी भी दोबारा खोल सकते हैं।',
  },
}

// Language registry — mirrors modules.js's own status field naming.
// 'active' languages have real, human-translated copy in STRINGS above.
// 'locked' entries are a name-only scaffold: showing that a language
// exists is not the same claim as translating into it, so these stay
// honest without inventing content in languages we can't verify
// (esp. Santali in Ol Chiki script, and Mundari/Ho/Kurukh, none of which
// have a native-speaker/translator reviewing them yet).
export const LANGUAGES = [
  { code: 'en', name: 'English', status: 'active' },
  { code: 'hi', name: 'हिंदी', status: 'active' },
  { code: 'sat', name: 'ᱥᱟᱱᱛᱟᱲᱤ (Santali)', status: 'locked' },
  { code: 'mnd', name: 'Mundari', status: 'locked' },
  { code: 'hoc', name: 'Ho', status: 'locked' },
  { code: 'kru', name: 'Kurukh', status: 'locked' },
]

let currentLang = localStorage.getItem('lang') || 'en'

export function t(key, vars) {
  const str = STRINGS[currentLang]?.[key] ?? STRINGS.en[key] ?? key
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '')
}

export function getLang() {
  return currentLang
}

export function toggleLang() {
  currentLang = currentLang === 'en' ? 'hi' : 'en'
  localStorage.setItem('lang', currentLang)
}

export function pick(field) {
  // field is a {en, hi} object from modules.js
  return field?.[currentLang] ?? field?.en ?? ''
}
