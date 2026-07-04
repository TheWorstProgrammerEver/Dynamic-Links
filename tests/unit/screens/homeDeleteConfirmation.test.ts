import { describe, expect, test } from 'vitest'
import {
  closeLinkCodeDeleteConfirmation,
  closedLinkCodeDeleteConfirmationState,
  isLinkCodeDeleteConfirmationOpen,
  openLinkCodeDeleteConfirmation
} from '../../../src/screens/HomeScreen/linkCodeDeleteConfirmation'
import type { LinkCodeSummary } from '../../../src/types/linkCodes'

const linkCode: LinkCodeSummary = {
  code: 'launch001',
  createdDate: '2026-07-04',
  displayName: 'Launch page',
  id: 'link-code-1',
  responseConfig: {
    mode: 'redirect',
    redirectUrl: ''
  },
  responseMode: 'redirect',
  status: 'active'
}

describe('Link Code delete confirmation state', () => {
  test('starts closed', () => {
    expect(isLinkCodeDeleteConfirmationOpen(closedLinkCodeDeleteConfirmationState)).toBe(false)
    expect(closedLinkCodeDeleteConfirmationState.target).toBeUndefined()
  })

  test('opens for the selected Link Code', () => {
    const state = openLinkCodeDeleteConfirmation(linkCode)

    expect(isLinkCodeDeleteConfirmationOpen(state)).toBe(true)
    expect(state.target).toBe(linkCode)
  })

  test('closes without retaining the selected Link Code', () => {
    const state = closeLinkCodeDeleteConfirmation()

    expect(isLinkCodeDeleteConfirmationOpen(state)).toBe(false)
    expect(state.target).toBeUndefined()
  })
})
