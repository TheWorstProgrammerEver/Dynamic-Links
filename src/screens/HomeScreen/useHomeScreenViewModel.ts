import { useMemo } from 'react'
import { useAuthContext } from '../../contexts/AuthContext'
import { useLinkCodes } from '../../state/useLinkCodes'
import type { LinkCodeResponseMode, LinkCodeStatus } from '../../types/linkCodes'

const responseModeLabels: Record<LinkCodeResponseMode, string> = {
  redirect: 'Redirect',
  raw_content: 'Raw content'
}

const statusLabels: Record<LinkCodeStatus, string> = {
  active: 'Active',
  disabled: 'Disabled',
  draft: 'Draft'
}

export const useHomeScreenViewModel = () => {
  const { currentAccount } = useAuthContext()
  const linkCodes = useLinkCodes(currentAccount)

  return useMemo(() => ({
    accountEmail: currentAccount?.email,
    linkCodes: linkCodes.linkCodes,
    linkCodesLoad: linkCodes.linkCodesLoad,
    responseModeLabels,
    statusLabels
  }), [currentAccount?.email, linkCodes.linkCodes, linkCodes.linkCodesLoad])
}
