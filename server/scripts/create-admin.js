// Creates an active Admin account from the command line. Admin sign-ups
// through the app need approval from an existing admin, so the very first
// admin has to be created this way:
//
//   npm run create-admin -- --work-id ADMIN-001 --phone 9876543210 \
//     --name "Asha Kumari" --org "DGMS Ranchi" --district Ranchi --password "S3cure-pass"

import { parseArgs } from 'node:util'
import { config } from '../src/config.js'
import { openDb } from '../src/db.js'
import { createUserRepo } from '../src/users/userRepo.js'
import { hashPassword } from '../src/auth/passwords.js'
import { validateRegistration } from '../src/users/validation.js'

const { values } = parseArgs({
  options: {
    'work-id': { type: 'string' },
    phone: { type: 'string' },
    name: { type: 'string' },
    org: { type: 'string' },
    district: { type: 'string' },
    password: { type: 'string' },
  },
})

const { value, errors } = validateRegistration({
  role: 'admin',
  workId: values['work-id'],
  phone: values.phone,
  fullName: values.name,
  organisation: values.org,
  district: values.district,
  password: values.password,
  consent: true,
})
if (errors) {
  console.error('Invalid input:', errors)
  process.exit(1)
}

const users = createUserRepo(openDb(config.dbPath))
if (users.findByWorkId(value.workId) || users.findByPhone(value.phone)) {
  console.error('A user with that work ID or phone already exists.')
  process.exit(1)
}
const admin = users.create(value, await hashPassword(value.password), 'active')
console.log(`Admin created: ${admin.work_id} (id ${admin.id})`)
