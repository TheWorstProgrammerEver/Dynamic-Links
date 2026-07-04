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
    content: 'Hello',
    contentType: 'text/html; charset=utf-8',
    mode: 'raw_content',
    statusCode: 201
  },
  responseMode: 'raw_content',
  status: 'active'
}

describe('Link Code edit form', () => {
  it('creates editable state from a redirect Link Code', () => {
    expect(createLinkCodeEditFormState(redirectLinkCode)).toEqual(expect.objectContaining({
      code: 'abc123',
      displayName: 'Launch page',
      id: 'link-code-id',
      redirectUrl: 'https://example.com/launch',
      responseMode: 'redirect'
    }))
  })

  it('creates normalized update params after field changes', () => {
    const form = updateLinkCodeEditFormField(
      updateLinkCodeEditFormField(
        updateLinkCodeEditFormField(createLinkCodeEditFormState(redirectLinkCode), 'responseMode', 'raw_content'),
        'rawContent',
        'Updated'
      ),
      'rawStatusCode',
      '204'
    )

    expect(linkCodeEditFormToUpdateParams(form)).toEqual({
      displayName: 'Launch page',
      id: 'link-code-id',
      responseConfig: {
        content: 'Updated',
        contentType: 'text/plain; charset=utf-8',
        mode: 'raw_content',
        statusCode: 204
      }
    })
  })

  it('summarizes the active response config', () => {
    expect(formatLinkCodeResponseConfig(redirectLinkCode)).toBe('https://example.com/launch')
    expect(formatLinkCodeResponseConfig(rawContentLinkCode)).toBe('201 text/html; charset=utf-8')
  })
})
