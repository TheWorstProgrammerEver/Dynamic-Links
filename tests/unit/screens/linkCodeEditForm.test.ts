import { describe, expect, it } from 'vitest'
import type { LinkCodeSummary } from '../../../src/types/linkCodes'
import {
  createLinkCodeEditFormState,
  formatLinkCodeResponseConfig,
  linkCodeEditFormToUpdateParams,
  updateLinkCodeEditFormField
} from '../../../src/screens/HomeScreen/linkCodeEditForm'

const redirectLinkCode: LinkCodeSummary = {
  code: 'abc123',
  createdDate: '2026-07-04',
  displayName: 'Launch page',
  id: 'link-code-id',
  responseConfig: {
    mode: 'redirect',
    redirectUrl: 'https://example.com/launch'
  },
  responseMode: 'redirect',
  status: 'draft'
}

const rawContentLinkCode: LinkCodeSummary = {
  code: 'raw123',
  createdDate: '2026-07-04',
  displayName: 'Content page',
  id: 'raw-link-code-id',
  responseConfig: {
    mode: 'raw_content',
    responseMessage: 'HTTP/1.1 201 Created\nContent-Type: text/html; charset=utf-8\n\nHello'
  },
  responseMode: 'raw_content',
  status: 'active'
}

describe('Link Code edit form', () => {
  it('creates editable state from a redirect Link Code', () => {
    expect(createLinkCodeEditFormState(redirectLinkCode)).toEqual(expect.objectContaining({
      canEditCustomLinkCode: false,
      code: 'abc123',
      displayName: 'Launch page',
      id: 'link-code-id',
      redirectUrl: 'https://example.com/launch',
      responseMode: 'redirect',
      status: 'draft'
    }))
  })

  it('updates status in editable state', () => {
    const form = updateLinkCodeEditFormField(
      createLinkCodeEditFormState(redirectLinkCode),
      'status',
      'disabled'
    )

    expect(form.status).toBe('disabled')
  })

  it('tracks custom code changes for premium edit forms', () => {
    const form = updateLinkCodeEditFormField(
      createLinkCodeEditFormState(redirectLinkCode, true),
      'code',
      ' go '
    )

    expect(linkCodeEditFormToUpdateParams(form)).toEqual(expect.objectContaining({
      code: 'go'
    }))
  })

  it('omits custom code from non-premium edit params', () => {
    const form = updateLinkCodeEditFormField(
      createLinkCodeEditFormState(redirectLinkCode),
      'code',
      'go'
    )

    expect(linkCodeEditFormToUpdateParams(form)).not.toHaveProperty('code')
  })

  it('creates normalized update params after field changes', () => {
    const form = updateLinkCodeEditFormField(
      updateLinkCodeEditFormField(
        updateLinkCodeEditFormField(createLinkCodeEditFormState(redirectLinkCode), 'responseMode', 'raw_content'),
        'rawResponseMessage',
        'HTTP/1.1 202 Accepted\nContent-Type: text/plain; charset=utf-8\n\nUpdated'
      ),
      'displayName',
      'Updated launch page'
    )

    expect(linkCodeEditFormToUpdateParams(form)).toEqual({
      displayName: 'Updated launch page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'raw_content',
        responseMessage: 'HTTP/1.1 202 Accepted\nContent-Type: text/plain; charset=utf-8\n\nUpdated'
      },
      status: 'draft'
    })
  })

  it('summarizes the active response config', () => {
    expect(formatLinkCodeResponseConfig(redirectLinkCode)).toBe('https://example.com/launch')
    expect(formatLinkCodeResponseConfig(rawContentLinkCode)).toBe('201 text/html; charset=utf-8')
  })
})
