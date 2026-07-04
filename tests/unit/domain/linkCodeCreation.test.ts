import { describe, expect, it } from 'vitest'
import {
  createLinkCodeWithRandomCode,
  defaultGeneratedLinkCodeLength,
  generateRandomLinkCode,
  LinkCodeCollisionError,
  linkCodeAlphabet,
  LinkCodeValidationError,
  minimumGeneratedLinkCodeLength
} from '../../../common/linkCodeCreation'

describe('Link Code creation', () => {
  it('generates default-length codes from cryptographic bytes and the Link Code alphabet', () => {
    const code = generateRandomLinkCode({
      randomBytes: (bytes) => {
        bytes.set([0, 31, 32, 63, 64, 95, 96, 127, 128, 159])

        return bytes
      }
    })

    expect(code).toHaveLength(defaultGeneratedLinkCodeLength)
    expect(code).toBe(`${linkCodeAlphabet[0]}${linkCodeAlphabet[31]}`.repeat(5))
  })

  it('rejects generated Link Code lengths below the minimum', () => {
    expect(() => generateRandomLinkCode({ length: minimumGeneratedLinkCodeLength - 1 }))
      .toThrow(/at least 8/)
  })

  it('trims names and retries bounded uniqueness collisions', async () => {
    const collision = new Error('duplicate')
    const attempts: Array<{ code: string; displayName: string }> = []
    const generatedCodes = ['same-code', 'unique-code']
    const result = await createLinkCodeWithRandomCode({
      displayName: ' Launch page ',
      generateCode: () => generatedCodes[attempts.length],
      insert: async (attempt) => {
        attempts.push(attempt)

        if (attempt.code === 'same-code') {
          throw collision
        }

        return { id: 'created', ...attempt }
      },
      isCodeCollisionError: (error) => error === collision
    })

    expect(result).toEqual({
      code: 'unique-code',
      displayName: 'Launch page',
      id: 'created'
    })
    expect(attempts).toEqual([
      { code: 'same-code', displayName: 'Launch page' },
      { code: 'unique-code', displayName: 'Launch page' }
    ])
  })

  it('returns a retriable error after bounded uniqueness collisions', async () => {
    const collision = new Error('duplicate')
    const attempts: string[] = []

    await expect(createLinkCodeWithRandomCode({
      displayName: 'Launch page',
      generateCode: () => 'same-code',
      insert: async (attempt) => {
        attempts.push(attempt.code)
        throw collision
      },
      isCodeCollisionError: (error) => error === collision,
      maxAttempts: 2
    })).rejects.toBeInstanceOf(LinkCodeCollisionError)

    expect(attempts).toEqual(['same-code', 'same-code'])
  })

  it('rejects blank names before generating or inserting a code', async () => {
    let generated = false
    let inserted = false

    await expect(createLinkCodeWithRandomCode({
      displayName: '   ',
      generateCode: () => {
        generated = true

        return 'unused-code'
      },
      insert: async () => {
        inserted = true

        return { id: 'unused' }
      },
      isCodeCollisionError: () => false
    })).rejects.toBeInstanceOf(LinkCodeValidationError)

    expect(generated).toBe(false)
    expect(inserted).toBe(false)
  })
})
