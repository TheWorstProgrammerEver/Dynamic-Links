import { describe, expect, it } from 'vitest'
import {
  isLinkCodeCodeConflictError,
  LinkCodeCodeValidationError,
  normalizeLinkCodeCode
} from '../../../common/linkCodeCodes'

describe('Link Code codes', () => {
  it('normalizes short custom codes with supported URL path segment characters', () => {
    expect(normalizeLinkCodeCode(' go ')).toBe('go')
    expect(normalizeLinkCodeCode('Launch_1.2-~')).toBe('Launch_1.2-~')
  })

  it('rejects blank and unsupported path characters', () => {
    expect(() => normalizeLinkCodeCode(' ')).toThrow(LinkCodeCodeValidationError)
    expect(() => normalizeLinkCodeCode('launch page')).toThrow(/letters, numbers/)
    expect(() => normalizeLinkCodeCode('launch/page')).toThrow(/letters, numbers/)
    expect(() => normalizeLinkCodeCode('launch%2Fpage')).toThrow(/letters, numbers/)
  })

  it('recognizes database unique conflicts for Link Code strings', () => {
    expect(isLinkCodeCodeConflictError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "link_codes_code_key"'
    })).toBe(true)

    expect(isLinkCodeCodeConflictError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "other_key"'
    })).toBe(false)
  })
})
