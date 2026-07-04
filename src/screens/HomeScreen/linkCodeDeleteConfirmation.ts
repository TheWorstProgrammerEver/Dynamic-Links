import type { LinkCodeSummary } from '../../types/linkCodes'

export type LinkCodeDeleteConfirmationState = {
  target?: LinkCodeSummary
}

export const closedLinkCodeDeleteConfirmationState: LinkCodeDeleteConfirmationState = {}

export const openLinkCodeDeleteConfirmation = (
  target: LinkCodeSummary
): LinkCodeDeleteConfirmationState => ({ target })

export const closeLinkCodeDeleteConfirmation = (): LinkCodeDeleteConfirmationState => (
  closedLinkCodeDeleteConfirmationState
)

export const isLinkCodeDeleteConfirmationOpen = (state: LinkCodeDeleteConfirmationState) => (
  Boolean(state.target)
)
