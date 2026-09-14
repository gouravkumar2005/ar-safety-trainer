// Emergency Response guide content — grounded in Indian Red Cross Society
// first-aid protocol. This module is deliberately different from every
// other module in the app: it has no .glb (see main.js's routing), and the
// entry point is voice-triaged (voiceCommand.js) or a manual grid
// (emergencyHub.js), not a locked/passed gate.
//
// Safety boundary (do not weaken this): nothing in this app ever infers
// WHAT injury occurred from a camera. The person says or picks the injury;
// only after that is chosen may a camera assist with WHERE (cprCameraAssist.js's
// real hand-motion CPR rate, poseTracker.js's positioning overlay). Keep
// that boundary intact when editing this file or anything that reads it.

export const EMERGENCY_GUIDES = [
  {
    id: 'bleeding',
    keywords: {
      en: ['bleeding', 'cut', 'blood', 'wound', 'gash', 'sliced', 'cut myself', 'cut my hand', 'cut my leg'],
      hi: ['खून', 'खून बह रहा', 'कट गया', 'चोट लगी', 'घाव', 'खून निकल रहा'],
    },
    title: { en: 'Bleeding / Cut', hi: 'खून बहना / कट लगना' },
    summary: {
      en: 'Someone has a cut or open wound that is bleeding.',
      hi: 'किसी को कट या घाव से खून बह रहा है।',
    },
    steps: [
      {
        title: { en: 'Apply direct pressure', hi: 'सीधा दबाव डालें' },
        info: {
          en: 'Press a clean cloth or gauze firmly on the wound with your hand. Keep steady pressure — do not lift the cloth to check, it can restart the bleeding.',
          hi: 'साफ कपड़ा या गॉज़ घाव पर हाथ से मजबूती से दबाएं। लगातार दबाव बनाए रखें — जांचने के लिए कपड़ा न उठाएं, इससे खून फिर बह सकता है।',
        },
        // Optional, off by default — see poseTracker.js. Positioning only,
        // for the limb already identified by the person: never a guess at
        // what the injury is.
        poseAssist: true,
      },
      {
        title: { en: 'Dress the wound', hi: 'घाव पर पट्टी बांधें' },
        info: {
          en: 'Once bleeding slows, cover with a sterile dressing or clean cloth and secure with a bandage. Keep it snug, not too tight.',
          hi: 'खून धीमा होने पर, स्टेराइल ड्रेसिंग या साफ कपड़े से ढकें और पट्टी से बांधें। ज्यादा कसें नहीं।',
        },
      },
      {
        title: { en: 'Still bleeding? Use a pressure point', hi: 'फिर भी खून बह रहा है? प्रेशर पॉइंट दबाएं' },
        info: {
          en: 'If blood soaks through, add more cloth on top (don\'t remove the first layer) and press a pressure point above the wound — between the wound and the heart.',
          hi: 'अगर खून कपड़े से रिसने लगे, तो ऊपर और कपड़ा रखें (पहली परत न हटाएं) और घाव के ऊपर, घाव और दिल के बीच, प्रेशर पॉइंट दबाएं।',
        },
      },
      {
        title: { en: 'Elevate the limb', hi: 'अंग को ऊपर उठाएं' },
        info: {
          en: 'If the wound is on an arm or leg and there is no fracture, raise it above heart level to slow the bleeding.',
          hi: 'अगर घाव हाथ या पैर पर है और हड्डी नहीं टूटी है, तो उसे दिल के स्तर से ऊपर उठाएं जिससे खून बहना धीमा हो।',
        },
      },
      {
        title: { en: 'Get medical help', hi: 'चिकित्सा सहायता लें' },
        info: {
          en: 'Keep pressure on until help arrives. For a deep, large, or spurting wound, treat it as an emergency and get the person to medical care immediately.',
          hi: 'मदद आने तक दबाव बनाए रखें। गहरे, बड़े या तेज़ी से बह रहे घाव को आपातकाल मानें और तुरंत चिकित्सा सहायता तक पहुंचाएं।',
        },
      },
    ],
  },
  {
    id: 'fracture',
    keywords: {
      en: ['fracture', 'broken bone', 'broken leg', 'broken arm', 'broke my leg', 'broke my arm', 'leg is broken', 'can\'t move my leg'],
      hi: ['हड्डी टूट गई', 'पैर टूट गया', 'हाथ टूट गया', 'फ्रैक्चर', 'हड्डी में चोट'],
    },
    title: { en: 'Fracture / Broken Bone', hi: 'हड्डी टूटना / फ्रैक्चर' },
    summary: {
      en: 'Someone may have broken or injured a bone and cannot move it normally.',
      hi: 'किसी की हड्डी टूट गई है या चोटिल है और वह सामान्य रूप से उसे हिला नहीं पा रहा है।',
    },
    steps: [
      {
        title: { en: "Don't move the person", hi: 'व्यक्ति को न हिलाएं' },
        info: {
          en: 'Keep the injured person still. Do not try to straighten the limb or move them unless they are in immediate danger (e.g. near moving machinery).',
          hi: 'घायल व्यक्ति को स्थिर रखें। अंग को सीधा करने या हिलाने की कोशिश न करें, जब तक कि वे तुरंत खतरे में न हों (जैसे चलती मशीनरी के पास)।',
        },
      },
      {
        title: { en: 'Support the joints above and below', hi: 'ऊपर और नीचे के जोड़ों को सहारा दें' },
        info: {
          en: 'If you have a splint (a rigid board, rolled cloth, or similar), immobilize the joint above the break AND the joint below it — not just the break itself.',
          hi: 'अगर स्प्लिंट (कठोर पट्टी, लपेटा हुआ कपड़ा) उपलब्ध है, तो टूटी हड्डी के ऊपर और नीचे दोनों जोड़ों को स्थिर करें — सिर्फ टूटी जगह को नहीं।',
        },
        // Optional, off by default — see poseTracker.js. Positioning only.
        poseAssist: true,
      },
      {
        title: { en: 'Secure with a bandage', hi: 'पट्टी से बांधें' },
        info: {
          en: 'Tie the splint in place with bandages or cloth strips, snug but not cutting off circulation. Check fingers/toes stay warm and normal-colored.',
          hi: 'स्प्लिंट को पट्टी या कपड़े की पट्टियों से बांधें, कसा हुआ लेकिन खून का बहाव न रुके। उंगलियां गर्म और सामान्य रंग की रहें, यह जांचते रहें।',
        },
      },
      {
        title: { en: 'Keep still and get help', hi: 'स्थिर रखें और मदद बुलाएं' },
        info: {
          en: 'Do not give food or water in case surgery is needed. Get the person to medical care, keeping the injured area as still as possible during transport.',
          hi: 'सर्जरी की जरूरत पड़ सकती है, इसलिए खाना-पानी न दें। व्यक्ति को चिकित्सा सहायता तक पहुंचाएं, ले जाते समय चोटिल हिस्से को यथासंभव स्थिर रखें।',
        },
      },
    ],
  },
  {
    id: 'burn',
    keywords: {
      en: ['burn', 'burned', 'burnt', 'fire', 'hot', 'scald', 'burned my hand', 'burnt myself'],
      hi: ['जल गया', 'जल गई', 'आग लगी', 'जलन', 'झुलस गया'],
    },
    title: { en: 'Burn', hi: 'जलना' },
    summary: {
      en: 'Someone has been burned by heat, steam, chemicals, or electricity.',
      hi: 'किसी को गर्मी, भाप, रसायन या बिजली से जलन हुई है।',
    },
    steps: [
      {
        title: { en: 'Cool the burn immediately', hi: 'तुरंत जगह को ठंडा करें' },
        info: {
          en: 'Run cool (not ice-cold) running water over the burn for at least 10-20 minutes. Remove nearby jewellery/tight clothing before swelling starts.',
          hi: 'जली हुई जगह पर कम से कम 10-20 मिनट तक ठंडा (बर्फ जैसा ठंडा नहीं) बहता पानी डालें। सूजन शुरू होने से पहले आसपास के गहने/तंग कपड़े हटा दें।',
        },
      },
      {
        title: { en: 'Never use ice, oil, or ointment', hi: 'बर्फ, तेल या मलहम कभी न लगाएं' },
        info: {
          en: 'Ice can damage burned skin further. Home remedies like oil, toothpaste, or ointment can trap heat and increase infection risk — do not use them.',
          hi: 'बर्फ जली हुई त्वचा को और नुकसान पहुंचा सकती है। तेल, टूथपेस्ट या मलहम जैसे घरेलू नुस्खे गर्मी को अंदर रोक सकते हैं और संक्रमण का खतरा बढ़ा सकते हैं — इनका उपयोग न करें।',
        },
      },
      {
        title: { en: 'Cover loosely', hi: 'ढीला ढकें' },
        info: {
          en: 'Once cooled, cover loosely with a sterile non-stick dressing or clean cloth. Do not burst any blisters that have formed.',
          hi: 'ठंडा करने के बाद, स्टेराइल नॉन-स्टिक ड्रेसिंग या साफ कपड़े से ढीला ढकें। बने हुए छालों को न फोड़ें।',
        },
      },
      {
        title: { en: 'Get medical help', hi: 'चिकित्सा सहायता लें' },
        info: {
          en: 'Any burn larger than the person\'s palm, on the face/hands/joints, or from chemicals/electricity needs urgent medical attention — get help right away.',
          hi: 'व्यक्ति की हथेली से बड़ा जलना, चेहरे/हाथों/जोड़ों पर जलना, या रसायन/बिजली से जलना — इन सबके लिए तुरंत चिकित्सा सहायता चाहिए।',
        },
      },
    ],
  },
  {
    id: 'choking',
    keywords: {
      en: ['choking', 'choke', 'can\'t breathe', 'cannot breathe', 'stuck in throat', 'something stuck'],
      hi: ['दम घुट रहा', 'गला घुट रहा', 'सांस नहीं आ रही', 'गले में फंस गया'],
    },
    title: { en: 'Choking', hi: 'दम घुटना' },
    summary: {
      en: 'Someone has something stuck in their throat and cannot breathe or cough properly.',
      hi: 'किसी के गले में कुछ फंस गया है और वह ठीक से सांस या खांस नहीं पा रहा है।',
    },
    steps: [
      {
        title: { en: 'Confirm they are choking', hi: 'पुष्टि करें कि दम घुट रहा है' },
        info: {
          en: 'Ask "Are you choking?" If they cannot speak, cough, or breathe, act immediately. If they CAN cough forcefully, encourage coughing instead — don\'t intervene yet.',
          hi: '"क्या तुम्हारा दम घुट रहा है?" पूछें। अगर वे बोल, खांस या सांस नहीं ले पा रहे, तुरंत मदद करें। अगर वे जोर से खांस पा रहे हैं, तो उन्हें खांसने दें — अभी हस्तक्षेप न करें।',
        },
      },
      {
        title: { en: '5 back blows', hi: '5 बार पीठ पर थपकी' },
        info: {
          en: 'Lean them forward, support their chest with one hand. With the heel of your other hand, give 5 firm blows between the shoulder blades.',
          hi: 'उन्हें आगे की ओर झुकाएं, एक हाथ से छाती को सहारा दें। दूसरे हाथ की एड़ी से कंधे की हड्डियों के बीच 5 बार जोर से थपकी दें।',
        },
      },
      {
        title: { en: 'Abdominal thrusts if not cleared', hi: 'अगर साफ नहीं हुआ तो पेट पर धक्का दें' },
        info: {
          en: 'Stand behind them, fist above the navel, other hand over it, and give 5 sharp inward-and-upward thrusts. Alternate 5 back blows and 5 thrusts.',
          hi: 'उनके पीछे खड़े हों, नाभि के ऊपर मुट्ठी रखें, दूसरे हाथ से पकड़ें, और 5 बार अंदर-ऊपर की ओर जोर से धक्का दें। 5 पीठ थपकी और 5 धक्कों को बारी-बारी करें।',
        },
      },
      {
        title: { en: 'Continue until help arrives', hi: 'मदद आने तक जारी रखें' },
        info: {
          en: 'Keep alternating until the object is coughed out, the person can breathe normally, or emergency help arrives. If they become unresponsive, begin CPR.',
          hi: 'तब तक बारी-बारी करते रहें जब तक वस्तु बाहर न निकले, व्यक्ति सामान्य रूप से सांस न ले पाए, या आपातकालीन मदद न आ जाए। अगर वे बेहोश हो जाएं, तो CPR शुरू करें।',
        },
      },
    ],
  },
  {
    id: 'cpr',
    keywords: {
      en: ['cpr', 'unconscious', 'not breathing', 'collapsed', 'fainted', 'not responding', 'no pulse'],
      hi: ['बेहोश', 'सांस नहीं ले रहा', 'गिर गया', 'होश नहीं आ रहा', 'सीपीआर'],
    },
    title: { en: 'CPR / Unconscious Person', hi: 'सीपीआर / बेहोश व्यक्ति' },
    summary: {
      en: 'Someone is unconscious and not breathing normally.',
      hi: 'कोई बेहोश है और सामान्य रूप से सांस नहीं ले रहा है।',
    },
    steps: [
      {
        title: { en: 'Check responsiveness, shout for help', hi: 'होश जांचें, मदद के लिए चिल्लाएं' },
        info: {
          en: 'Tap their shoulders and shout. If there is no response, shout loudly for others nearby to come and help.',
          hi: 'उनके कंधों को थपथपाएं और जोर से पुकारें। कोई प्रतिक्रिया न मिले तो आसपास के लोगों को मदद के लिए जोर से बुलाएं।',
        },
      },
      {
        title: { en: 'Call for emergency help', hi: 'आपातकालीन सहायता बुलाएं' },
        info: {
          en: 'Send someone to call the site emergency number / ambulance (108 in India) immediately. Do not delay compressions waiting for this — send someone else.',
          hi: 'किसी को तुरंत साइट आपातकालीन नंबर / एम्बुलेंस (भारत में 108) पर कॉल करने भेजें। इसके इंतजार में कंप्रेशन में देरी न करें — किसी और को भेजें।',
        },
      },
      {
        title: { en: 'Position your hands', hi: 'हाथों की स्थिति बनाएं' },
        info: {
          en: 'Kneel beside them. Place the heel of one hand on the center of the chest, the other hand on top, fingers interlocked. Lock your elbows straight.',
          hi: 'उनके बगल में घुटनों के बल बैठें। एक हाथ की एड़ी छाती के बीच में रखें, दूसरा हाथ उसके ऊपर, उंगलियां आपस में जोड़ें। कोहनी सीधी रखें।',
        },
      },
      {
        title: { en: 'Start compressions', hi: 'कंप्रेशन शुरू करें' },
        info: {
          en: 'Push hard and fast, straight down about 5-6 cm, at 100-120 compressions per minute — roughly the beat of "Stayin\' Alive". Let the chest fully recoil between pushes. Use the camera assist below to check your rate against real detected motion.',
          hi: 'सीधा नीचे लगभग 5-6 सेमी दबाएं, 100-120 कंप्रेशन प्रति मिनट की गति से — तेज़ और मजबूती से। हर दबाव के बाद छाती को पूरी तरह ऊपर आने दें। नीचे दिए कैमरा असिस्ट से अपनी असल गति जांचें।',
        },
        // Real hand-motion-derived compressions/min — see handTracker.js.
        cameraAssist: true,
      },
      {
        title: { en: 'Continue with rescue breaths if trained', hi: 'प्रशिक्षित हैं तो रेस्क्यू ब्रेथ भी दें' },
        info: {
          en: 'If trained, give 30 compressions then 2 rescue breaths, and repeat. If not trained, hands-only continuous compressions are still effective — keep going until help arrives or the person responds.',
          hi: 'अगर प्रशिक्षित हैं, तो 30 कंप्रेशन के बाद 2 रेस्क्यू ब्रेथ दें, और दोहराएं। अगर प्रशिक्षित नहीं हैं, तो सिर्फ हाथों से लगातार कंप्रेशन भी प्रभावी है — मदद आने या व्यक्ति के होश में आने तक जारी रखें।',
        },
      },
    ],
  },
]

export function findGuideById(id) {
  return EMERGENCY_GUIDES.find((g) => g.id === id) || null
}

// Simple keyword-match triage — never guesses. Returns a guide only when a
// keyword from the transcript clearly appears; otherwise null, so the
// caller falls back to the manual grid rather than open the wrong guide.
export function matchGuideFromTranscript(transcript) {
  if (!transcript) return null
  const text = transcript.toLowerCase()
  for (const guide of EMERGENCY_GUIDES) {
    const allKeywords = [...guide.keywords.en, ...guide.keywords.hi]
    for (const kw of allKeywords) {
      if (text.includes(kw.toLowerCase())) return guide
    }
  }
  return null
}
