// Per-item machinery registry — same shape and purpose as content/ppeItems.js,
// reached from the Machinery Safety module's "Explore each item in
// detail" gallery. Distinct machines from the continuous miner (which
// keeps its own dedicated hotspot scene + quiz), general material-
// handling equipment relevant to the same PS "Machinery Safety" domain.
//
// `scale`: same 1m-normalized-export issue as every model so far
// (confirmed via each file's accessor min/max) — these are estimates
// targeting a plausible real-world size, not measured against the actual
// machines. Verify in real AR on a phone and adjust if either looks off.

export const machineryItems = [
  {
    id: 'forklift',
    model: '/models/forklift.glb',
    scale: 3.5, // target ~3.5m long, a real forklift including forks
    title: { en: 'Forklift', hi: 'फोर्कलिफ्ट' },
    info: {
      en: 'Never exceed the rated load capacity or drive with forks raised — both are leading causes of tip-overs. The operator’s rear visibility is limited, so pedestrians must stay clear of the reversing path and never walk under a raised load.',
      hi: 'रेटेड लोड क्षमता से अधिक न लादें और फोर्क उठाकर गाड़ी न चलाएं — दोनों पलटने (टिप-ओवर) का मुख्य कारण हैं। ऑपरेटर की पीछे की दृश्यता सीमित होती है, इसलिए पैदल चलने वालों को पीछे जाने के रास्ते से दूर रहना चाहिए और कभी भी उठे हुए लोड के नीचे नहीं चलना चाहिए।',
    },
  },
  {
    id: 'conveyor-belt',
    model: '/models/conveyor-belt.glb',
    scale: 4, // target ~4m, a representative conveyor segment
    title: { en: 'Conveyor Belt', hi: 'कन्वेयर बेल्ट' },
    info: {
      en: 'The nip points where the belt meets a pulley or roller can pull in loose clothing, hair, or a hand in an instant. Never reach onto a moving belt to clear a blockage — use the emergency-stop pull-cord along its length first.',
      hi: 'जहां बेल्ट पुली या रोलर से मिलती है वहां के चुभने वाले बिंदु (निप पॉइंट) पल भर में ढीले कपड़े, बाल, या हाथ खींच सकते हैं। चलती हुई बेल्ट पर रुकावट हटाने के लिए कभी हाथ न डालें — पहले बेल्ट के साथ लगी इमरजेंसी-स्टॉप पुल-कॉर्ड का उपयोग करें।',
    },
  },
]

export const getMachineryItem = (id) => machineryItems.find((i) => i.id === id)
