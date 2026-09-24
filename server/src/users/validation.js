// Validation + normalisation for registration and profile updates.
// Every check reports a short code per field ('required', 'invalid',
// 'too_short', 'weak'...). The app shows a translated message for each.

export const ROLES = ['worker', 'supervisor', 'admin']
export const LANGS = ['en', 'hi']

// All 24 districts of Jharkhand.
export const DISTRICTS = [
  'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum',
  'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara',
  'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu',
  'Ramgarh', 'Ranchi', 'Sahebganj', 'Seraikela Kharsawan', 'Simdega',
  'West Singhbhum',
]

const WORK_ID_RE = /^[A-Z0-9][A-Z0-9\-_/]{2,31}$/
const MOBILE_RE = /^[6-9]\d{9}$/ // Indian mobile numbers
const UAN_RE = /^\d{12}$/
const PASSWORD_MIN = 8

const str = (v) => (typeof v === 'string' ? v.trim() : '')

// "+91 98765-43210", "098765 43210" -> "9876543210"
export function normalizePhone(value) {
  const digits = str(value).replace(/[\s\-()]/g, '')
  return digits.replace(/^(\+91|91(?=\d{10}$)|0(?=\d{10}$))/, '')
}

export function normalizeWorkId(value) {
  return str(value).toUpperCase()
}

function normalizeUan(value) {
  return str(value).replace(/[\s-]/g, '')
}

export function checkPassword(password) {
  if (typeof password !== 'string' || password.length === 0) return 'required'
  if (password.length < PASSWORD_MIN) return 'too_short'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'weak'
  return null
}

// Fields a user may change on their own profile (not role / work ID).
function validateProfileFields(input, errors, { partial }) {
  const out = {}
  const has = (key) => !partial || input[key] !== undefined

  if (has('fullName')) {
    out.fullName = str(input.fullName)
    if (!out.fullName) errors.fullName = 'required'
    else if (out.fullName.length > 80) errors.fullName = 'invalid'
  }
  if (has('phone')) {
    out.phone = normalizePhone(input.phone)
    if (!out.phone) errors.phone = 'required'
    else if (!MOBILE_RE.test(out.phone)) errors.phone = 'invalid'
  }
  if (has('organisation')) {
    out.organisation = str(input.organisation)
    if (!out.organisation) errors.organisation = 'required'
    else if (out.organisation.length > 100) errors.organisation = 'invalid'
  }
  if (has('district')) {
    out.district = str(input.district)
    if (!out.district) errors.district = 'required'
    else if (!DISTRICTS.includes(out.district)) errors.district = 'invalid'
  }
  if (has('designation')) {
    out.designation = str(input.designation)
    if (out.designation.length > 60) errors.designation = 'invalid'
  }
  if (has('uan')) {
    out.uan = normalizeUan(input.uan)
    if (out.uan && !UAN_RE.test(out.uan)) errors.uan = 'invalid'
  }
  if (has('preferredLang')) {
    out.preferredLang = str(input.preferredLang) || 'en'
    if (!LANGS.includes(out.preferredLang)) errors.preferredLang = 'invalid'
  }
  return out
}

// Returns { value, errors }. `errors` is null when everything is valid.
export function validateRegistration(input = {}) {
  const errors = {}
  const value = validateProfileFields(input, errors, { partial: false })

  value.role = str(input.role)
  if (!ROLES.includes(value.role)) errors.role = value.role ? 'invalid' : 'required'

  value.workId = normalizeWorkId(input.workId)
  if (!value.workId) errors.workId = 'required'
  else if (!WORK_ID_RE.test(value.workId)) errors.workId = 'invalid'

  const passwordError = checkPassword(input.password)
  if (passwordError) errors.password = passwordError
  value.password = input.password

  if (input.consent !== true) errors.consent = 'required'

  return { value, errors: Object.keys(errors).length ? errors : null }
}

export function validateProfileUpdate(input = {}) {
  const errors = {}
  const value = validateProfileFields(input, errors, { partial: true })
  return { value, errors: Object.keys(errors).length ? errors : null }
}
