// Training module registry.
//
// The PS asks for 5 domains: fire & explosion, gas leak & confined space,
// machinery safety, chemical hazard, emergency response. Only
// `machinery-safety` is wired to a real .glb right now (the continuous
// miner model). `ppe-compliance` is a 6th, cross-cutting module — it's not
// one of the PS's named domains, but PPE compliance is itself a
// DGMS-recognized competency, and it's what the team's second model
// (worker PPE/uniform) actually depicts.
//
// `fire-explosion` and the rest are intentionally locked/model:null — we
// don't have real fire/gas/chemical/emergency-response models yet, and
// showing a mislabeled model (e.g. the mining machine under a "fire"
// title) would be worse than an honest "not ready" placeholder. Unlock
// each one the same way machinery-safety was unlocked: drop a .glb into
// public/models/, flip status to 'active', fill in hotspots/quiz. No other
// file needs to change — home/homeScreen.js/arViewer.training/quizScreen.js/result.js all iterate
// this registry generically.
//
// hotspot.position / hotspot.normal use <model-viewer> hotspot syntax
// ("x y z" in the model's local space). The values below are generic
// starting guesses — open the module in the browser and nudge them until
// they sit on the right part of your model (see README "Tuning hotspots").

export const modules = [
  {
    id: 'ppe-compliance',
    domain: 'ppe-compliance',
    status: 'active',
    title: { en: 'PPE Compliance Check', hi: 'व्यक्तिगत सुरक्षा उपकरण (PPE) जांच' },
    summary: {
      en: 'Confirm you have the right protective gear before entering any work area.',
      hi: 'किसी भी कार्य क्षेत्र में जाने से पहले सही सुरक्षा उपकरण की पुष्टि करें।',
    },
    // This module also acts as a mandatory pre-training gate — see
    // isPpePassed()/requiresPpeGate() below and app/router.js. It stays
    // unlocked and revisitable on the home screen regardless of gate state.
    model: '/models/ppe-uniform.glb',
    // The exported .glb was normalized to a 1m bounding box (its tallest
    // axis = exactly 1.000, confirmed by reading the accessor min/max) —
    // harmless in the small in-page viewer (it auto-frames to whatever
    // size exists) but very wrong in real AR, where actual meters matter:
    // this uniform would appear about half a real person's height. `scale`
    // corrects it without needing to re-export the file — see
    // training/arViewerScreen.js's comment for how it's applied and why cameraTarget
    // math needs it too. This is an estimate (target ~1.75m, a person in
    // full kit) — nudge it after testing in real AR on a phone if it
    // still looks off, same spirit as the hotspot-position tuning note.
    scale: 1.75,
    poster: null,
    // Opts into the "Explore each item in detail" gallery (src/screens/
    // itemGallery/galleryScreen.js) — a generic flag, not a hardcoded module-id check in
    // training/arViewerScreen.js, so any future module with its own per-item models
    // could opt in the same way.
    hasItemGallery: true,
    // The guided tour's *primary* content is "walk through each PPE item"
    // rather than hotspots on the combined model — a separate flag from
    // hasItemGallery on purpose: machinery-safety below has an item
    // gallery too (forklift/conveyor) but its tour should still walk its
    // hotspots, not that gallery. See training/tourScreen.js.
    tourItemMode: true,
    // Indicative only — see nsqfDisclaimerNote in i18n.js. This is NOT an
    // official NSDC/NSQF accreditation, just an internal reference mapping
    // so the certificate can describe itself in the same vocabulary
    // PMKVY/NSQF-aligned schemes use.
    nsqf: {
      level: 3,
      competency: {
        en: 'Personal protective equipment usage and workplace hazard awareness',
        hi: 'व्यक्तिगत सुरक्षा उपकरण उपयोग एवं कार्यस्थल खतरा जागरूकता',
      },
    },
    hotspots: [
      {
        id: 'hs-1',
        position: '0 1.6 0.3',
        normal: '0 1 0',
        label: { en: 'Helmet with cap lamp', hi: 'कैप लैंप सहित हेलमेट' },
        info: {
          en: 'Protects against falling debris and low-roof strikes; the lamp is your primary light source underground — check its charge before every shift.',
          hi: 'गिरते मलबे और नीची छत की चोट से बचाता है; लैंप भूमिगत आपका मुख्य प्रकाश स्रोत है — हर शिफ्ट से पहले इसकी चार्जिंग जांचें।',
        },
      },
      {
        id: 'hs-2',
        position: '0 1.1 0.4',
        normal: '0 0 1',
        label: { en: 'Self-contained self-rescuer (SCSR)', hi: 'सेल्फ-कंटेन्ड सेल्फ-रेस्क्यूअर (SCSR)' },
        info: {
          en: 'Emergency breathing device for escape during fire or gas emergencies. Must be worn on your belt at all times — never left at the surface or in a locker.',
          hi: 'आग या गैस आपातकाल में बचने के लिए आपातकालीन श्वास उपकरण। इसे हमेशा अपनी बेल्ट पर पहनना चाहिए — कभी सतह पर या लॉकर में न छोड़ें।',
        },
      },
      {
        id: 'hs-3',
        position: '0 0.9 0.2',
        normal: '1 0 0',
        label: { en: 'High-visibility vest', hi: 'हाई-विज़िबिलिटी वेस्ट' },
        info: {
          en: 'Makes you visible to machine operators and vehicle drivers in low light. Damaged or faded reflective strips must be reported and replaced.',
          hi: 'कम रोशनी में मशीन ऑपरेटरों और वाहन चालकों को आपको देखने में मदद करता है। क्षतिग्रस्त या फीकी रिफ्लेक्टिव पट्टी की सूचना देकर बदलवाएं।',
        },
      },
      {
        id: 'hs-4',
        position: '0 0.1 0.3',
        normal: '0 -1 0',
        label: { en: 'Steel-toe safety boots', hi: 'स्टील-टो सेफ्टी बूट्स' },
        info: {
          en: 'Protects feet from falling material and crush hazards, with slip-resistant soles for wet or uneven mine floors.',
          hi: 'गिरने वाली सामग्री और कुचलने के खतरे से पैरों की रक्षा करता है, और गीले या असमान खदान फर्श के लिए फिसलन-रोधी सोल होता है।',
        },
      },
      {
        id: 'hs-5',
        position: '0.4 0.9 0.2',
        normal: '1 0 0',
        label: { en: 'Personal gas detector', hi: 'व्यक्तिगत गैस डिटेक्टर' },
        info: {
          en: 'Clipped to your vest, it continuously monitors methane and other hazardous gases and alarms before levels become dangerous. Never enter a work area if it fails its start-up self-test.',
          hi: 'आपकी वेस्ट पर क्लिप किया गया यह उपकरण मीथेन और अन्य खतरनाक गैसों की लगातार निगरानी करता है और खतरनाक स्तर से पहले अलार्म देता है। यदि यह स्टार्ट-अप सेल्फ-टेस्ट में विफल हो तो कार्य क्षेत्र में प्रवेश न करें।',
        },
      },
    ],
    quiz: [
      {
        question: {
          en: 'Where should your self-contained self-rescuer (SCSR) be at all times during a shift?',
          hi: 'शिफ्ट के दौरान आपका SCSR हमेशा कहाँ होना चाहिए?',
        },
        options: [
          { en: 'On your belt, with you', hi: 'आपकी बेल्ट पर, आपके साथ' },
          { en: 'In your locker at the surface', hi: 'सतह पर आपके लॉकर में' },
          { en: "In the supervisor's office", hi: 'सुपरवाइज़र के कार्यालय में' },
          { en: 'Only carried on gas-leak days', hi: 'केवल गैस-रिसाव वाले दिनों में साथ रखा जाए' },
        ],
        correctIndex: 0,
      },
      {
        question: {
          en: 'Your personal gas detector fails its start-up self-test. What should you do?',
          hi: 'आपका गैस डिटेक्टर स्टार्ट-अप सेल्फ-टेस्ट में विफल हो जाता है। आपको क्या करना चाहिए?',
        },
        options: [
          { en: "Enter the work area anyway, it's probably fine", hi: 'फिर भी कार्य क्षेत्र में प्रवेश करें' },
          { en: 'Tap it a few times and continue', hi: 'इसे कुछ बार थपथपाएँ और आगे बढ़ें' },
          { en: 'Do not enter; report it and get a working unit first', hi: 'प्रवेश न करें; रिपोर्ट करें और पहले कार्यशील उपकरण लें' },
          { en: "Borrow a coworker's and return it later", hi: 'सहकर्मी का उधार लें और बाद में लौटा दें' },
        ],
        correctIndex: 2,
      },
      {
        question: {
          en: 'Why must damaged reflective strips on a hi-vis vest be reported?',
          hi: 'हाई-विज़ वेस्ट की क्षतिग्रस्त रिफ्लेक्टिव पट्टी की सूचना क्यों देनी चाहिए?',
        },
        options: [
          { en: 'It affects how the vest looks in photos', hi: 'यह फोटो में वेस्ट कैसा दिखता है इसे प्रभावित करता है' },
          { en: 'It reduces visibility to machine operators and drivers in low light', hi: 'यह कम रोशनी में दृश्यता कम करता है' },
          { en: "It voids the vest's warranty", hi: 'यह वारंटी को रद्द कर देता है' },
          { en: 'It has no real safety impact', hi: 'इसका सुरक्षा पर कोई प्रभाव नहीं है' },
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'fire-explosion',
    domain: 'fire-explosion',
    status: 'locked',
    title: { en: 'Fire & Explosion Response', hi: 'आग और विस्फोट से बचाव' },
    summary: {
      en: 'Waiting for a real fire/explosion 3D model.',
      hi: '3D मॉडल की प्रतीक्षा है।',
    },
    model: null,
    nsqf: null,
  },
  {
    id: 'gas-leak',
    domain: 'gas-leak',
    status: 'locked',
    title: { en: 'Gas Leak & Confined Space', hi: 'गैस रिसाव और संकुचित स्थान' },
    summary: { en: 'Waiting for a 3D model.', hi: '3D मॉडल की प्रतीक्षा है।' },
    model: null,
    nsqf: null,
  },
  {
    id: 'machinery-safety',
    domain: 'machinery-safety',
    status: 'active',
    title: { en: 'Machinery Safety', hi: 'मशीनरी सुरक्षा' },
    summary: {
      en: 'Operate and maintain a continuous miner safely — gas monitoring, mechanical, electrical, and roof-fall hazards.',
      hi: 'कंटीन्यूअस माइनर को सुरक्षित रूप से चलाएँ और उसका रखरखाव करें — गैस निगरानी, यांत्रिक, विद्युत और छत-गिरने के खतरे।',
    },
    model: '/models/continuous-miner.glb',
    // Same 1m-normalized-export issue as ppe-uniform above — this model's
    // longest axis measured exactly 1.000 in the file, so without a scale
    // correction it'd appear as a 1-metre toy in AR instead of the
    // room-filling machine it should be. Estimate, targeting ~9m long
    // (compact continuous miners run roughly 9-12m) — verify in real AR
    // and adjust if it still reads wrong.
    scale: 9,
    poster: null,
    // Explore-each-item gallery (forklift, conveyor belt) alongside this
    // module's own continuous-miner hotspot scene — see
    // content/machineryItems.js / content/itemGalleries.js.
    hasItemGallery: true,
    // Indicative only — see nsqfDisclaimerNote in i18n.js.
    nsqf: {
      level: 4,
      competency: {
        en: 'Safe operation and hazard recognition around heavy mining machinery',
        hi: 'भारी खनन मशीनरी के आसपास सुरक्षित संचालन एवं खतरा पहचान',
      },
    },
    hotspots: [
      {
        id: 'hs-1',
        position: '0 0.6 1.2',
        normal: '0 0 1',
        label: { en: 'Cutting drum — methane & coal dust ignition zone', hi: 'कटिंग ड्रम — मीथेन व कोयला धूल ज्वलन क्षेत्र' },
        info: {
          en: 'The rotating drum shears coal directly from the seam, releasing methane and fine coal dust — the single biggest ignition risk on this machine. A calibrated methane detector must read safe levels before cutting starts and be monitored continuously while it runs; cutting stops immediately if gas readings rise.',
          hi: 'घूमने वाला ड्रम सीधे कोयला सीवन से कोयला काटता है, जिससे मीथेन गैस और महीन कोयला धूल निकलती है — यह इस मशीन का सबसे बड़ा ज्वलन खतरा है। कटिंग शुरू करने से पहले कैलिब्रेटेड मीथेन डिटेक्टर से सुरक्षित स्तर की पुष्टि करें और चलते समय लगातार निगरानी रखें; गैस स्तर बढ़ने पर कटिंग तुरंत रोक दें।',
        },
      },
      {
        id: 'hs-2',
        position: '0 0.3 0.4',
        normal: '0 1 0',
        label: { en: 'Cutting drum & conveyor — pinch/crush point', hi: 'कटिंग ड्रम व कन्वेयर — चुभने/कुचलने का खतरा बिंदु' },
        info: {
          en: 'The rotating drum and the gathering-arm conveyor that moves cut coal to the rear can trap loose clothing, hands, or feet in seconds. Keep clear of moving parts, never reach across the conveyor while it runs, and maintain the guards.',
          hi: 'घूमने वाला ड्रम और कटे हुए कोयले को पीछे ले जाने वाला गैदरिंग-आर्म कन्वेयर कुछ ही सेकंड में ढीले कपड़े, हाथ या पैर फंसा सकते हैं। चलते हुए पुर्जों से दूर रहें, कन्वेयर चलते समय कभी उस पर हाथ न डालें, और गार्ड को सही स्थिति में बनाए रखें।',
        },
      },
      {
        id: 'hs-3',
        position: '-0.4 0.2 -1.3',
        normal: '0 0 -1',
        label: { en: 'Trailing cable — high-voltage hazard', hi: 'ट्रेलिंग केबल — उच्च वोल्टेज खतरा' },
        info: {
          en: 'The high-voltage trailing cable powers the machine as it advances and is exposed to crushing and abrasion from tramming. A damaged or exposed cable can cause electrocution or arc-flash ignition. Inspect it before each shift; never step on or drive over a cable, and report any damage before continuing.',
          hi: 'उच्च वोल्टेज ट्रेलिंग केबल मशीन को आगे बढ़ते समय बिजली देती है और चलने के दौरान दबने व घिसने के खतरे में रहती है। क्षतिग्रस्त या खुली केबल बिजली के झटके या आर्क-फ्लैश ज्वलन का कारण बन सकती है। हर शिफ्ट से पहले इसका निरीक्षण करें; केबल पर कभी पैर न रखें या वाहन न चलाएँ, और क्षति की सूचना दिए बिना काम जारी न रखें।',
        },
      },
      {
        id: 'hs-4',
        position: '0 1.6 0.8',
        normal: '0 1 0',
        label: { en: 'Freshly cut face — roof fall risk', hi: 'ताज़ा कटा हुआ फेस — छत गिरने का खतरा' },
        info: {
          en: 'The roof directly behind the cutting head is freshly exposed and not yet permanently supported — this is where fall-of-ground incidents happen. Temporary supports must be installed per the roof control plan before anyone works or walks under unsupported strata.',
          hi: 'कटिंग हेड के ठीक पीछे की छत अभी-अभी उजागर हुई है और अभी तक स्थायी रूप से सपोर्ट नहीं की गई है — यहीं पर छत गिरने की घटनाएँ होती हैं। बिना सपोर्ट वाली छत के नीचे काम करने या चलने से पहले रूफ कंट्रोल प्लान के अनुसार अस्थायी सपोर्ट लगाए जाने चाहिए।',
        },
      },
      {
        id: 'hs-5',
        position: '0.7 0.5 0',
        normal: '1 0 0',
        label: { en: 'Isolation point — lockout-tagout & hearing protection', hi: 'आइसोलेशन पॉइंट — लॉकआउट-टैगआउट व श्रवण सुरक्षा' },
        info: {
          en: "Before any maintenance, jam-clearing, or repair, isolate power at this point, lock it out, and tag it with your name — never rely on the operator's word alone. The machine also runs loud enough to cause hearing damage over a shift; hearing protection is mandatory in this zone.",
          hi: 'किसी भी रखरखाव, जाम हटाने या मरम्मत से पहले, इस बिंदु पर बिजली आइसोलेट करें, लॉकआउट करें, और अपने नाम का टैग लगाएँ — केवल ऑपरेटर के कहने पर भरोसा न करें। यह मशीन इतनी तेज़ आवाज़ में चलती है कि एक शिफ्ट में सुनने की क्षमता को नुकसान पहुँचा सकती है; इस क्षेत्र में श्रवण सुरक्षा पहनना अनिवार्य है।',
        },
      },
    ],
    quiz: [
      {
        question: {
          en: 'Before the cutting drum starts shearing coal, what must be confirmed first?',
          hi: 'कटिंग ड्रम द्वारा कोयला काटना शुरू करने से पहले, सबसे पहले किस बात की पुष्टि होनी चाहिए?',
        },
        options: [
          { en: 'The conveyor belt speed is set to maximum', hi: 'कन्वेयर बेल्ट की गति अधिकतम पर सेट है' },
          { en: 'A calibrated methane/gas detector shows safe levels', hi: 'एक कैलिब्रेटेड मीथेन/गैस डिटेक्टर सुरक्षित स्तर दिखा रहा है' },
          { en: 'The operator has finished their tea break', hi: 'ऑपरेटर की चाय की छुट्टी खत्म हो गई है' },
          { en: 'The coal output target for the shift has been set', hi: 'शिफ्ट के लिए कोयला उत्पादन लक्ष्य तय कर दिया गया है' },
        ],
        correctIndex: 1,
      },
      {
        question: {
          en: 'A jam needs clearing on the conveyor while the continuous miner is still connected to power. What is the correct first step?',
          hi: 'कन्वेयर में जाम लगा है जबकि कंटीन्यूअस माइनर अभी भी बिजली से जुड़ा है। सही पहला कदम क्या है?',
        },
        options: [
          { en: 'Reach in carefully while a colleague watches the controls', hi: 'एक सहकर्मी को नियंत्रण देखने देकर सावधानी से हाथ अंदर डालें' },
          { en: 'Reduce the conveyor speed and clear it while it moves slowly', hi: 'कन्वेयर की गति कम करें और धीमी गति में ही उसे साफ़ करें' },
          { en: 'Isolate the power, lock it out, and tag it with your name before going near moving parts', hi: 'चलते पुर्जों के पास जाने से पहले बिजली आइसोलेट करें, लॉकआउट करें, और अपने नाम का टैग लगाएँ' },
          { en: 'Ask the operator to turn the machine off and on again quickly once you are done', hi: 'आपका काम पूरा होते ही ऑपरेटर से मशीन को जल्दी से बंद और चालू करने को कहें' },
        ],
        correctIndex: 2,
      },
      {
        question: {
          en: 'Why is the area directly behind the cutting head especially dangerous immediately after cutting?',
          hi: 'कटाई के तुरंत बाद कटिंग हेड के ठीक पीछे का क्षेत्र विशेष रूप से खतरनाक क्यों होता है?',
        },
        options: [
          { en: 'It is the coolest part of the machine', hi: 'यह मशीन का सबसे ठंडा हिस्सा होता है' },
          { en: 'The newly exposed roof has not yet been supported and can fall', hi: 'नई उजागर हुई छत अभी तक सपोर्ट नहीं की गई है और गिर सकती है' },
          { en: 'It is farthest from the emergency exit', hi: 'यह आपातकालीन निकास से सबसे दूर होता है' },
          { en: 'The conveyor belt is switched off there', hi: 'वहाँ कन्वेयर बेल्ट बंद रहती है' },
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'chemical-hazard',
    domain: 'chemical-hazard',
    status: 'locked',
    title: { en: 'Chemical Hazard Handling', hi: 'रासायनिक खतरा प्रबंधन' },
    summary: { en: 'Waiting for a 3D model.', hi: '3D मॉडल की प्रतीक्षा है।' },
    model: null,
    nsqf: null,
  },
  {
    id: 'emergency-response',
    domain: 'emergency-response',
    status: 'active',
    title: { en: 'Emergency Response Procedures', hi: 'आपातकालीन प्रतिक्रिया प्रक्रिया' },
    summary: {
      en: 'Say what happened, or pick from the list — get voice-guided first-aid steps.',
      hi: 'क्या हुआ बताएं, या सूची से चुनें — वॉइस-निर्देशित प्राथमिक चिकित्सा चरण पाएं।',
    },
    // Deliberately no .glb — this module's core mechanic is voice triage
    // plus honest live-camera assist (real hand-motion CPR rate,
    // position-only overlays), not a static 3D scene. app/routes.js lists
    // the emergency routes first, so this id goes to emergency/hubScreen.js instead of
    // training/arViewerScreen.js. See emergency/emergencyGuides.js for the actual content
    // and emergency/hubScreen.js / emergency/guideScreen.js for the flow.
    model: null,
    // No quiz/gate/certificate for this module (by design) — it's a
    // reference/assist tool for a live emergency, not a graded module.
    nsqf: {
      level: 3,
      competency: {
        en: 'Basic first-aid response and emergency procedure awareness',
        hi: 'बुनियादी प्राथमिक चिकित्सा प्रतिक्रिया और आपातकालीन प्रक्रिया जागरूकता',
      },
    },
  },
]

export const getModule = (id) => modules.find((m) => m.id === id)

// The PPE module doubles as a mandatory induction gate: every other active
// module redirects here until it's been passed at least once. It stays
// unlocked/revisitable on the home screen regardless of gate state (see
// home/homeScreen.js, which doesn't consult this at all — only app/router.js does).
export const PPE_GATE_MODULE_ID = 'ppe-compliance'

// Unlike every other module, this one has no .glb and no quiz/gate — its
// screens (emergency/hubScreen.js / emergency/guideScreen.js / emergency/cprCameraScreen.js) are
// voice/camera-driven, not a <model-viewer> scene. app/routes.js lists
// the emergency routes first, so this id skips training/arViewerScreen.js.
export const EMERGENCY_RESPONSE_MODULE_ID = 'emergency-response'
