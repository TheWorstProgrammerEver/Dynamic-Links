import { randomUUID } from 'node:crypto'
import { createAdminClient } from './localSupabase'

export type FixtureUser = {
  email: string
  id: string
  name: string
  password: string
}

export type SecurityFixture = {
  linkCodes: {
    hidden: string
    visible: string
  }
  prefix: string
  users: {
    outsider: FixtureUser
    owner: FixtureUser
  }
}

const password = 'password123'
const today = '2026-07-04'

const createEmptyFixture = (): SecurityFixture => {
  const prefix = `security-${Date.now()}-${randomUUID().slice(0, 8)}`
  const user = (role: string, name: string): FixtureUser => ({
    email: `${prefix}-${role}@example.com`,
    id: '',
    name,
    password
  })

  return {
    prefix,
    users: {
      owner: user('owner', 'Security Owner'),
      outsider: user('outsider', 'Security Outsider')
    },
    linkCodes: {
      visible: randomUUID(),
      hidden: randomUUID()
    }
  }
}

const createUsers = async (fixture: SecurityFixture) => {
  const admin = createAdminClient()

  for (const user of Object.values(fixture.users)) {
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      password: user.password,
      user_metadata: {
        display_name: user.name
      }
    })

    if (error) {
      throw error
    }

    user.id = data.user.id
  }
}

const seedFixtureRows = async (fixture: SecurityFixture) => {
  const { linkCodes, prefix, users } = fixture
  const { error } = await createAdminClient()
    .from('link_codes')
    .insert([
      {
        id: linkCodes.visible,
        owner_user_id: users.owner.id,
        display_name: `${prefix} visible Link Code`,
        code: `${prefix}-visible`,
        response_mode: 'redirect',
        status: 'active',
        created_date: today,
        updated_date: today
      },
      {
        id: linkCodes.hidden,
        owner_user_id: users.outsider.id,
        display_name: `${prefix} hidden Link Code`,
        code: `${prefix}-hidden`,
        response_mode: 'raw_content',
        status: 'draft',
        created_date: today,
        updated_date: today
      }
    ])

  if (error) {
    throw error
  }
}

export const cleanupSecurityFixture = async (fixture?: SecurityFixture) => {
  if (!fixture) {
    return
  }

  const admin = createAdminClient()

  await admin.from('link_codes').delete().ilike('code', `${fixture.prefix}%`)
  await Promise.all(Object.values(fixture.users)
    .filter((user) => user.id)
    .map((user) => admin.auth.admin.deleteUser(user.id)))
}

export const createSecurityFixture = async () => {
  const fixture = createEmptyFixture()

  try {
    await createUsers(fixture)
    await seedFixtureRows(fixture)

    return fixture
  } catch (error) {
    await cleanupSecurityFixture(fixture)
    throw error
  }
}
