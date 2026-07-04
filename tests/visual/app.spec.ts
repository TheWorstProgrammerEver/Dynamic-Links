import { expect, test, type Page } from '@playwright/test'
import { routeRuntimeConfig } from './runtimeConfig'
import { deleteSupabaseUsersByEmail } from './supabaseTestAuth'

const createdUserEmails = new Set<string>()

const uniqueTestEmail = () => {
  const uniqueDomain = `visual-${Date.now()}-${Math.random().toString(36).slice(2)}.example.com`

  return `link.owner@${uniqueDomain}`
}

const createAccount = async (page: Page) => {
  const email = uniqueTestEmail()
  createdUserEmails.add(email)

  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()

  await expect(page).toHaveURL(/\/sign-in$/)
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('password')
  await page.getByRole('button', { name: 'Create account' }).click()

  return email
}

test.beforeEach(async ({ page }) => {
  await routeRuntimeConfig(page)
})

test.afterEach(async () => {
  const emails = Array.from(createdUserEmails)
  createdUserEmails.clear()
  await deleteSupabaseUsersByEmail(emails)
})

test('renders configured authentication methods', async ({ page }) => {
  await page.goto('/sign-in')

  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in with passkey' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Password/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Magic link/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /One-time code/ })).toBeVisible()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /One-time code/ }).click()
  await expect(page.getByLabel('Password', { exact: true })).not.toBeVisible()
  await expect(page.getByLabel('Name', { exact: true })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Send code' })).toBeVisible()

  await page.getByRole('button', { name: /Magic link/ }).click()
  await expect(page.getByLabel('Password', { exact: true })).not.toBeVisible()
  await expect(page.getByLabel('Name', { exact: true })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Send magic link' })).toBeVisible()

  await page.getByRole('button', { name: 'Create an account' }).click()
  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Password/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Magic link/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /One-time code/ })).toBeVisible()

  await page.getByRole('button', { name: /One-time code/ }).click()
  await expect(page.getByRole('button', { name: 'Send code' })).toBeVisible()

  await page.getByRole('button', { name: /Magic link/ }).click()
  await expect(page.getByRole('button', { name: 'Send magic link' })).toBeVisible()

  await page.getByRole('button', { name: /Password/ }).click()
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
  await expect(page.getByLabel('Name', { exact: true })).not.toBeVisible()
})

test('protects app routes until the user signs in', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
})

test('creates an account, signs out, and signs back in', async ({ page }) => {
  const email = await createAccount(page)

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Link Codes', exact: true })).toBeVisible()
  await expect(page.getByText('No Link Codes yet')).toBeVisible()
  await expect(page.getByRole('link', { name: `Open profile for ${email}` })).toBeVisible()

  await page.getByLabel('Name', { exact: true }).fill('Launch page')
  await page.getByRole('button', { name: 'Create Link Code' }).click()
  const launchPageRow = page.getByRole('listitem').filter({ hasText: 'Launch page' })
  await expect(launchPageRow).toBeVisible()
  await expect(page.locator('code').filter({ hasText: /^[23456789abcdefghijkmnpqrstuvwxyz]{8,}$/ })).toBeVisible()
  const qrImage = launchPageRow.getByRole('img', { name: 'QR code for Launch page' })
  await expect(qrImage).toBeVisible()
  await expect(qrImage).toHaveAttribute('src', /\/code\/[^/]+\/qr\.png$/)
  await expect.poll(async () => (
    await qrImage.evaluate((image) => (image as HTMLImageElement).naturalWidth)
  )).toBeGreaterThan(0)
  await expect(page.getByText('No Link Codes yet')).not.toBeVisible()

  await page.getByRole('link', { name: `Open profile for ${email}` }).click()
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
  await page.getByRole('button', { name: 'Log out' }).click()

  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()

  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  await expect(page).toHaveURL('/profile')
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()

  await page.getByRole('link', { name: 'Home' }).click()
  await expect(launchPageRow).toBeVisible()
})

test('deletes a Link Code only after confirmation', async ({ page }) => {
  await createAccount(page)

  await expect(page).toHaveURL('/')
  await page.getByLabel('Name', { exact: true }).fill('Temporary launch')
  await page.getByRole('button', { name: 'Create Link Code' }).click()

  const linkCodeRow = page.getByRole('listitem').filter({ hasText: 'Temporary launch' })
  await expect(linkCodeRow).toBeVisible()

  await linkCodeRow.getByRole('button', { name: 'Delete Temporary launch' }).click()
  const confirmationDialog = page.getByRole('dialog', { name: 'Delete Link Code' })
  await expect(confirmationDialog).toBeVisible()

  await confirmationDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(confirmationDialog).not.toBeVisible()
  await expect(linkCodeRow).toBeVisible()

  await linkCodeRow.getByRole('button', { name: 'Delete Temporary launch' }).click()
  await confirmationDialog.getByRole('button', { name: 'Delete Link Code' }).click()

  await expect(confirmationDialog).not.toBeVisible()
  await expect(page.getByText('Temporary launch')).not.toBeVisible()
  await expect(page.getByText('No Link Codes yet')).toBeVisible()
})
