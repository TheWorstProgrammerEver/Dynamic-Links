import { describe, expect, test } from 'vitest'
import { addCreatedLinkCode, removeDeletedLinkCode } from '../../../src/state/linkCodeStateUpdates'
import type { LinkCodesState, LinkCodeSummary } from '../../../src/types/linkCodes'

const linkCode = (id: string, displayName: string): LinkCodeSummary => ({
  code: `${id}-code`,
  createdDate: '2026-07-04',
  displayName,
  id,
  responseMode: 'redirect',
  status: 'draft'
})

describe('Link Code state updates', () => {
  test('puts a created Link Code at the start without duplicating existing rows', () => {
    const updated = linkCode('existing', 'Updated')
    const state: LinkCodesState = {
      linkCodes: [
        linkCode('first', 'First'),
        linkCode('existing', 'Existing')
      ]
    }

    expect(addCreatedLinkCode(state, updated).linkCodes).toEqual([
      updated,
      state.linkCodes[0]
    ])
  })

  test('removes a deleted Link Code without reloading the whole state', () => {
    const state: LinkCodesState = {
      linkCodes: [
        linkCode('keep', 'Keep'),
        linkCode('delete', 'Delete')
      ]
    }

    expect(removeDeletedLinkCode(state, { id: 'delete' }).linkCodes).toEqual([
      state.linkCodes[0]
    ])
  })
})
