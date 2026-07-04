import { Save } from 'lucide-react'
import { useId, type FormEvent } from 'react'
import { AppDialog, DialogFooterActions } from '../../../lib/ui/AppDialog/AppDialog'
import { AsynchronousSubmitButton } from '../../../lib/ui/AsynchronousSubmitButton/AsynchronousSubmitButton'
import { Button } from '../../../lib/ui/Button/Button'
import { ComponentRoleContext } from '../../../lib/ui/ComponentRoleContext/ComponentRoleContext'
import { FormGrid } from '../../../lib/ui/FormGrid/FormGrid'
import type { LoaderState } from '../../../lib/hooks/useLoader'
import type { LinkCodeEditFormField, LinkCodeEditFormState } from './linkCodeEditForm'
import styles from './HomeScreen.module.scss'

type LinkCodeEditDialogProps = {
  error?: string
  form?: LinkCodeEditFormState
  loader: LoaderState
  onChange: (field: LinkCodeEditFormField, value: string) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  open: boolean
}

export const LinkCodeEditDialog = ({
  error,
  form,
  loader,
  onChange,
  onClose,
  onSubmit,
  open
}: LinkCodeEditDialogProps) => {
  const formId = useId()
  const codeInputId = useId()
  const nameInputId = useId()
  const redirectModeId = useId()
  const rawContentModeId = useId()
  const redirectUrlId = useId()
  const rawContentId = useId()
  const rawContentTypeId = useId()
  const rawStatusCodeId = useId()
  const errorId = useId()

  return (
    <AppDialog
      footer={(
        <DialogFooterActions>
          <ComponentRoleContext role="primary">
            <AsynchronousSubmitButton form={formId} loader={loader} statusLabel="Saving Link Code...">
              <Save aria-hidden="true" />
              Save changes
            </AsynchronousSubmitButton>
          </ComponentRoleContext>

          <ComponentRoleContext role="secondary">
            <Button type="button" onClick={onClose}>Cancel</Button>
          </ComponentRoleContext>
        </DialogFooterActions>
      )}
      open={open}
      title="Edit Link Code"
      onClose={onClose}
    >
      {form && (
        <FormGrid
          aria-describedby={error ? errorId : undefined}
          id={formId}
          singleColumn
          onSubmit={onSubmit}
          noValidate
        >
          {form.canEditCustomLinkCode
            ? (
              <label htmlFor={codeInputId}>
                Code
                <input
                  autoComplete="off"
                  id={codeInputId}
                  name="code"
                  onChange={(event) => onChange('code', event.currentTarget.value)}
                  type="text"
                  value={form.code}
                />
              </label>
            )
            : (
              <p className={styles.dialogMeta}>
                <code className={styles.code}>{form.code}</code>
              </p>
            )}

          <label htmlFor={nameInputId}>
            Name
            <input
              autoComplete="off"
              id={nameInputId}
              name="displayName"
              onChange={(event) => onChange('displayName', event.currentTarget.value)}
              type="text"
              value={form.displayName}
            />
          </label>

          <fieldset className={styles.modeChoices}>
            <legend>Response mode</legend>
            <label htmlFor={redirectModeId}>
              <input
                checked={form.responseMode === 'redirect'}
                id={redirectModeId}
                name="responseMode"
                onChange={() => onChange('responseMode', 'redirect')}
                type="radio"
                value="redirect"
              />
              Redirect
            </label>
            <label htmlFor={rawContentModeId}>
              <input
                checked={form.responseMode === 'raw_content'}
                id={rawContentModeId}
                name="responseMode"
                onChange={() => onChange('responseMode', 'raw_content')}
                type="radio"
                value="raw_content"
              />
              Raw content
            </label>
          </fieldset>

          {form.responseMode === 'redirect' && (
            <label htmlFor={redirectUrlId}>
              Redirect URL
              <input
                id={redirectUrlId}
                name="redirectUrl"
                onChange={(event) => onChange('redirectUrl', event.currentTarget.value)}
                type="url"
                value={form.redirectUrl}
              />
            </label>
          )}

          {form.responseMode === 'raw_content' && (
            <>
              <label htmlFor={rawStatusCodeId}>
                Status code
                <input
                  id={rawStatusCodeId}
                  inputMode="numeric"
                  max="599"
                  min="200"
                  name="rawStatusCode"
                  onChange={(event) => onChange('rawStatusCode', event.currentTarget.value)}
                  type="number"
                  value={form.rawStatusCode}
                />
              </label>

              <label htmlFor={rawContentTypeId}>
                Content type
                <input
                  id={rawContentTypeId}
                  name="rawContentType"
                  onChange={(event) => onChange('rawContentType', event.currentTarget.value)}
                  type="text"
                  value={form.rawContentType}
                />
              </label>

              <label htmlFor={rawContentId}>
                Response content
                <textarea
                  className={styles.contentEditor}
                  id={rawContentId}
                  name="rawContent"
                  onChange={(event) => onChange('rawContent', event.currentTarget.value)}
                  rows={8}
                  value={form.rawContent}
                />
              </label>
            </>
          )}

          {error && (
            <p className={styles.error} id={errorId} role="alert">{error}</p>
          )}
        </FormGrid>
      )}
    </AppDialog>
  )
}
