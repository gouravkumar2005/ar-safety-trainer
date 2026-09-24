// Account feature: log in, register, view/edit your profile, and (admins)
// approve or disable accounts. Talks to the accounts server in ../../server.
import './account.css'
import { renderLogin } from './loginScreen.js'
import { renderRegister } from './registerScreen.js'
import { renderProfile } from './profileScreen.js'
import { renderUsers } from './usersScreen.js'

export const routes = [
  { path: '/login', render: renderLogin, guestOnly: true },
  { path: '/register', render: renderRegister, guestOnly: true },
  { path: '/profile', render: renderProfile },
  { path: '/users', render: renderUsers, roles: ['admin'] },
]
