import { useId } from 'react'
import { Plus } from 'lucide-react'
import { AsynchronousSubmitButton } from '../../../lib/ui/AsynchronousSubmitButton/AsynchronousSubmitButton'
import { ComponentRoleContext } from '../../../lib/ui/ComponentRoleContext/ComponentRoleContext'
import { FormGrid } from '../../../lib/ui/FormGrid/FormGrid'
import { List, ListItem } from '../../../lib/ui/List/List'
import { LoaderContainer } from '../../../lib/ui/LoaderContainer/LoaderContainer'
import { Section } from '../../../lib/ui/Section/Section'
import styles from './HomeScreen.module.scss'
import { useHomeScreenViewModel } from './useHomeScreenViewModel'

export const HomeScreen = () => {
  const viewModel = useHomeScreenViewModel()
  const nameInputId = useId()
  const nameErrorId = useId()
  const createForm = viewModel.createLinkCodeForm

  return (
    <section className={styles.screen} aria-labelledby="home-title">
      <header className={styles.header}>
        <p>{viewModel.accountEmail}</p>
        <h2 id="home-title">Link Codes</h2>
      </header>

      <Section title="Create Link Code" titleId="create-link-code-title">
        <FormGrid singleColumn onSubmit={createForm.submit} noValidate>
          <label htmlFor={nameInputId}>
            Name
            <input
              aria-describedby={createForm.error ? nameErrorId : undefined}
              aria-invalid={Boolean(createForm.error)}
              autoComplete="off"
              id={nameInputId}
              name="displayName"
              onChange={createForm.updateName}
              type="text"
              value={createForm.name}
            />
          </label>

          {createForm.error && (
            <p className={styles.error} id={nameErrorId} role="alert">{createForm.error}</p>
          )}

          <ComponentRoleContext role="primary">
            <AsynchronousSubmitButton loader={createForm.loader} statusLabel="Creating Link Code...">
              <Plus aria-hidden="true" />
              Create Link Code
            </AsynchronousSubmitButton>
          </ComponentRoleContext>
        </FormGrid>
      </Section>

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
