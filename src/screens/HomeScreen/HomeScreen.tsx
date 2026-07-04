import { useId } from 'react'
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { AppDialog, DialogFooterActions } from '../../../lib/ui/AppDialog/AppDialog'
import { AsynchronousSubmitButton } from '../../../lib/ui/AsynchronousSubmitButton/AsynchronousSubmitButton'
import { Button } from '../../../lib/ui/Button/Button'
import { ComponentRoleContext } from '../../../lib/ui/ComponentRoleContext/ComponentRoleContext'
import { FormGrid } from '../../../lib/ui/FormGrid/FormGrid'
import { List, ListItem } from '../../../lib/ui/List/List'
import { LoaderContainer } from '../../../lib/ui/LoaderContainer/LoaderContainer'
import { ResponsiveButton } from '../../../lib/ui/ResponsiveButton/ResponsiveButton'
import { Section } from '../../../lib/ui/Section/Section'
import { LinkCodeEditDialog } from './LinkCodeEditDialog'
import styles from './HomeScreen.module.scss'
import { useHomeScreenViewModel } from './useHomeScreenViewModel'

export const HomeScreen = () => {
  const viewModel = useHomeScreenViewModel()
  const nameInputId = useId()
  const nameErrorId = useId()
  const deleteFormId = useId()
  const createForm = viewModel.createLinkCodeForm
  const deleteConfirmation = viewModel.deleteLinkCodeConfirmation

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
              {viewModel.linkCodes.map((linkCode) => {
                const publicUrl = viewModel.publicUrlForLinkCode(linkCode)
                const copied = viewModel.publicUrlCopyStatus.copiedLinkCodeId === linkCode.id

                return (
                  <ListItem
                    key={linkCode.id}
                    actions={(
                      <>
                        <ComponentRoleContext role="secondary">
                          <ResponsiveButton
                            icon={<Copy />}
                            label={`Copy public URL for ${linkCode.displayName}`}
                            type="button"
                            onClick={() => void viewModel.copyPublicUrl(linkCode)}
                          >
                            {copied ? 'Copied' : 'Copy URL'}
                          </ResponsiveButton>
                        </ComponentRoleContext>

                        <ComponentRoleContext role="secondary">
                          <ResponsiveButton
                            icon={<Pencil />}
                            label={`Edit ${linkCode.displayName}`}
                            type="button"
                            onClick={() => viewModel.openEditLinkCode(linkCode)}
                          >
                            Edit
                          </ResponsiveButton>
                        </ComponentRoleContext>

                        <ComponentRoleContext role="destructive">
                          <ResponsiveButton
                            type="button"
                            icon={<Trash2 />}
                            label={`Delete ${linkCode.displayName}`}
                            onClick={() => deleteConfirmation.request(linkCode)}
                          >
                            Delete
                          </ResponsiveButton>
                        </ComponentRoleContext>
                      </>
                    )}
                    actionsLabel={`${linkCode.displayName} actions`}
                    details={(
                      <>
                        <strong>{linkCode.displayName}</strong>
                        <code className={styles.code}>{linkCode.code}</code>
                        <a className={styles.publicUrl} href={publicUrl} target="_blank" rel="noreferrer">
                          {publicUrl}
                        </a>
                        <span className={styles.meta}>
                          <span>{viewModel.responseModeLabels[linkCode.responseMode]}</span>
                          <span>{viewModel.formatResponseConfig(linkCode)}</span>
                          <span>{viewModel.statusLabels[linkCode.status]}</span>
                        </span>
                      </>
                    )}
                  />
                )
              })}
            </List>
          )}

          {viewModel.publicUrlCopyStatus.error && (
            <p className={styles.error} role="alert">{viewModel.publicUrlCopyStatus.error}</p>
          )}

          {viewModel.publicUrlCopyStatus.copiedLinkCodeId && !viewModel.publicUrlCopyStatus.error && (
            <p className={styles.status} role="status">Public URL copied.</p>
          )}

          {viewModel.linkCodes.length === 0 && viewModel.linkCodesLoad.settled && !viewModel.linkCodesLoad.error && (
            <p className={styles.empty}>No Link Codes yet</p>
          )}
        </LoaderContainer>
      </Section>

      <AppDialog
        open={deleteConfirmation.open}
        title="Delete Link Code"
        onClose={deleteConfirmation.cancel}
        footer={(
          <DialogFooterActions>
            <ComponentRoleContext role="destructive">
              <AsynchronousSubmitButton
                form={deleteFormId}
                loader={deleteConfirmation.loader}
                statusLabel="Deleting Link Code..."
              >
                <Trash2 aria-hidden="true" />
                Delete Link Code
              </AsynchronousSubmitButton>
            </ComponentRoleContext>
            <ComponentRoleContext role="secondary">
              <Button
                type="button"
                disabled={deleteConfirmation.loader.busy}
                onClick={deleteConfirmation.cancel}
              >
                Cancel
              </Button>
            </ComponentRoleContext>
          </DialogFooterActions>
        )}
      >
        <form id={deleteFormId} className={styles.deleteConfirmation} onSubmit={deleteConfirmation.confirm}>
          <p>
            This permanently removes <strong>{deleteConfirmation.target?.displayName}</strong>.
          </p>
          {deleteConfirmation.target && (
            <p>
              Code <code className={styles.code}>{deleteConfirmation.target.code}</code> will stop appearing in your Link Codes.
            </p>
          )}
          {deleteConfirmation.error && (
            <p className={styles.error} role="alert">{deleteConfirmation.error}</p>
          )}
        </form>
      </AppDialog>

      <LinkCodeEditDialog
        error={viewModel.editLinkCodeDialog.error}
        form={viewModel.editLinkCodeDialog.form}
        loader={viewModel.editLinkCodeDialog.loader}
        open={viewModel.editLinkCodeDialog.open}
        onChange={viewModel.editLinkCodeDialog.updateField}
        onClose={viewModel.editLinkCodeDialog.close}
        onSubmit={viewModel.editLinkCodeDialog.submit}
      />
    </section>
  )
}
