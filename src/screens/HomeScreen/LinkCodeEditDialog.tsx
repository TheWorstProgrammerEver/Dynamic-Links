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
  const statusSelectId = useId()
  const redirectModeId = useId()
  const rawContentModeId = useId()
  const redirectUrlId = useId()
  const rawResponseMessageId = useId()
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

          <label htmlFor={statusSelectId}>
            Status
            <select
              id={statusSelectId}
              name="status"
              onChange={(event) => onChange('status', event.currentTarget.value)}
              value={form.status}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
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
            <label htmlFor={rawResponseMessageId}>
              HTTP response message
              <textarea
                className={styles.contentEditor}
                id={rawResponseMessageId}
                name="rawResponseMessage"
                onChange={(event) => onChange('rawResponseMessage', event.currentTarget.value)}
                rows={12}
                value={form.rawResponseMessage}
              />
            </label>
          )}

          {error && (
            <p className={styles.error} id={errorId} role="alert">{error}</p>
          )}
        </FormGrid>
      )}
    </AppDialog>
  )
}
