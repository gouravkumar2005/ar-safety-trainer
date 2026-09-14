// Per-item PPE registry — one real .glb per item, for the "tap Vest, see
// the actual vest" gallery (src/screens/ppeGallery.js /
// ppeItemViewer.js), reached from the combined PPE Compliance module.
//
// title/info below are the *exact* bilingual copy already written for
// each item's hotspot in modules.js's ppe-compliance entry (hs-1..hs-5) —
// intentionally not rewritten, so the combined-model hotspot sheet and
// this per-item gallery describe each item identically. If you ever edit
// one, edit the other to match (see the note in the plan about merging
// these into one source of truth later).
//
// `scale`: every one of these files was exported normalized to a 1-metre
// bounding box (confirmed by reading each accessor's min/max — every
// model's longest axis measured exactly 1.000), which looks fine in this
// small in-page viewer (it auto-frames regardless of absolute scale) but
// is very wrong in real AR, where actual meters matter — a helmet would
// appear about a metre across, roughly table-sized. Each value below is
// an estimate targeting a plausible real-world size for that item; see
// ppeItemViewer.js for how it's applied. Test in real AR on a phone and
// adjust any that still look off — same spirit as the hotspot-position
// tuning note in modules.js.
//
// `consequence`: new, additive field — narrated by ppeEquipSim.js right
// after each item is equipped ("if you skip this, X can happen"). Same
// underlying facts as `info` above, just reframed negatively for that
// moment; doesn't touch `info`, which other screens (hotspot sheet,
// gallery) still use as-is.

export const ppeItems = [
  {
    id: 'ppe-helmet',
    model: '/models/ppe-helmet.glb',
    scale: 0.28, // target ~28cm across, a real safety helmet
    title: { en: 'Helmet with cap lamp', hi: 'कैप लैंप सहित हेलमेट' },
    info: {
      en: 'Protects against falling debris and low-roof strikes; the lamp is your primary light source underground — check its charge before every shift.',
      hi: 'गिरते मलबे और नीची छत की चोट से बचाता है; लैंप भूमिगत आपका मुख्य प्रकाश स्रोत है — हर शिफ्ट से पहले इसकी चार्जिंग जांचें।',
    },
    consequence: {
      en: "Without it, falling rock or a low-roof strike can cause a fatal head injury in seconds — that's why it's the first thing you put on.",
      hi: 'इसके बिना, गिरता पत्थर या नीची छत की चोट कुछ ही सेकंड में जानलेवा सिर की चोट का कारण बन सकती है — इसीलिए यह सबसे पहले पहना जाता है।',
    },
  },
  {
    id: 'ppe-scsr',
    model: '/models/ppe-scsr.glb',
    scale: 0.2, // target ~20cm, a handheld emergency-breathing canister
    title: { en: 'Self-contained self-rescuer (SCSR)', hi: 'सेल्फ-कंटेन्ड सेल्फ-रेस्क्यूअर (SCSR)' },
    info: {
      en: 'Emergency breathing device for escape during fire or gas emergencies. Must be worn on your belt at all times — never left at the surface or in a locker.',
      hi: 'आग या गैस आपातकाल में बचने के लिए आपातकालीन श्वास उपकरण। इसे हमेशा अपनी बेल्ट पर पहनना चाहिए — कभी सतह पर या लॉकर में न छोड़ें।',
    },
    consequence: {
      en: 'Without it on your belt, a sudden gas or fire emergency gives you no way to breathe safely while escaping — seconds decide survival underground.',
      hi: 'इसे बेल्ट पर न पहनने पर, अचानक गैस या आग की आपातस्थिति में बचकर निकलते समय सुरक्षित सांस लेने का कोई तरीका नहीं बचता — भूमिगत में सेकंड ही जीवन-मृत्यु तय करते हैं।',
    },
  },
  {
    id: 'ppe-vest',
    model: '/models/ppe-vest.glb',
    scale: 0.55, // target ~55cm wide, a hi-vis vest laid out
    title: { en: 'High-visibility vest', hi: 'हाई-विज़िबिलिटी वेस्ट' },
    info: {
      en: 'Makes you visible to machine operators and vehicle drivers in low light. Damaged or faded reflective strips must be reported and replaced.',
      hi: 'कम रोशनी में मशीन ऑपरेटरों और वाहन चालकों को आपको देखने में मदद करता है। क्षतिग्रस्त या फीकी रिफ्लेक्टिव पट्टी की सूचना देकर बदलवाएं।',
    },
    consequence: {
      en: 'Without it, a machine operator or vehicle driver may simply not see you in low light before it is too late.',
      hi: 'इसके बिना, कम रोशनी में मशीन ऑपरेटर या वाहन चालक को आप समय रहते दिख ही नहीं सकते।',
    },
  },
  {
    id: 'ppe-boots',
    model: '/models/ppe-boots.glb',
    scale: 0.35, // target ~35cm for the pair, a real safety boot's length
    title: { en: 'Steel-toe safety boots', hi: 'स्टील-टो सेफ्टी बूट्स' },
    info: {
      en: 'Protects feet from falling material and crush hazards, with slip-resistant soles for wet or uneven mine floors.',
      hi: 'गिरने वाली सामग्री और कुचलने के खतरे से पैरों की रक्षा करता है, और गीले या असमान खदान फर्श के लिए फिसलन-रोधी सोल होता है।',
    },
    consequence: {
      en: 'Without steel-toe boots, a dropped tool or falling material can crush or break the bones in your foot.',
      hi: 'स्टील-टो बूट्स के बिना, गिरा हुआ औज़ार या सामग्री आपके पैर की हड्डियों को कुचल या तोड़ सकती है।',
    },
  },
  {
    id: 'ppe-gas-detector',
    model: '/models/ppe-gas-detector.glb',
    scale: 0.12, // target ~12cm, a small handheld/clip-on detector
    title: { en: 'Personal gas detector', hi: 'व्यक्तिगत गैस डिटेक्टर' },
    info: {
      en: 'Clipped to your vest, it continuously monitors methane and other hazardous gases and alarms before levels become dangerous. Never enter a work area if it fails its start-up self-test.',
      hi: 'आपकी वेस्ट पर क्लिप किया गया यह उपकरण मीथेन और अन्य खतरनाक गैसों की लगातार निगरानी करता है और खतरनाक स्तर से पहले अलार्म देता है। यदि यह स्टार्ट-अप सेल्फ-टेस्ट में विफल हो तो कार्य क्षेत्र में प्रवेश न करें।',
    },
    consequence: {
      en: 'Without it, you get no warning before methane or another gas reaches a dangerous, explosive level.',
      hi: 'इसके बिना, मीथेन या किसी अन्य गैस के खतरनाक, विस्फोटक स्तर तक पहुंचने से पहले कोई चेतावनी नहीं मिलती।',
    },
  },
]

export const getPpeItem = (id) => ppeItems.find((i) => i.id === id)
