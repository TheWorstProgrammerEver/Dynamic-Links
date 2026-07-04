import { List, ListItem } from '../../../lib/ui/List/List'
import { LoaderContainer } from '../../../lib/ui/LoaderContainer/LoaderContainer'
import { Section } from '../../../lib/ui/Section/Section'
import styles from './HomeScreen.module.scss'
import { useHomeScreenViewModel } from './useHomeScreenViewModel'

export const HomeScreen = () => {
  const viewModel = useHomeScreenViewModel()

  return (
    <section className={styles.screen} aria-labelledby="home-title">
      <header className={styles.header}>
        <p>{viewModel.accountEmail}</p>
        <h2 id="home-title">Link Codes</h2>
      </header>

      <Section title="Owned Link Codes" titleId="owned-link-codes-title">
        <LoaderContainer loader={viewModel.linkCodesLoad} loadingLabel="Loading Link Codes...">
          {viewModel.linkCodesLoad.error && (
            <p className={styles.error} role="alert">{viewModel.linkCodesLoad.error}</p>
          )}

          {viewModel.linkCodes.length > 0 && (
            <List ariaLabel="Owned Link Codes">
              {viewModel.linkCodes.map((linkCode) => (
                <ListItem
                  key={linkCode.id}
                  details={(
                    <>
                      <strong>{linkCode.displayName}</strong>
                      <code className={styles.code}>{linkCode.code}</code>
                      <span className={styles.meta}>
                        <span>{viewModel.responseModeLabels[linkCode.responseMode]}</span>
                        <span>{viewModel.statusLabels[linkCode.status]}</span>
                      </span>
                    </>
                  )}
                />
              ))}
            </List>
          )}

          {viewModel.linkCodes.length === 0 && viewModel.linkCodesLoad.settled && !viewModel.linkCodesLoad.error && (
            <p className={styles.empty}>No Link Codes yet</p>
          )}
        </LoaderContainer>
      </Section>
    </section>
  )
}
