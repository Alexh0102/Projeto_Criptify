import { FileKey2, Upload, X } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { formatFileSize } from '../../lib/criptoveu'
import AdvancedOptions from '../ui/AdvancedOptions'

type Props = {
  mode: 'encrypt' | 'decrypt'
  enabled: boolean
  required: boolean
  keyFile: File | null
  inputId: string
  disabled: boolean
  onEnabledChange: (enabled: boolean) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}

function KeyFilePicker({
  keyFile,
  inputId,
  disabled,
  onFileChange,
  onClear,
}: Pick<
  Props,
  'keyFile' | 'inputId' | 'disabled' | 'onFileChange' | 'onClear'
>) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        className="surface-upload flex cursor-pointer items-center gap-3 rounded-[22px] p-4 transition"
      >
        <input
          id={inputId}
          type="file"
          className="hidden"
          disabled={disabled}
          onChange={onFileChange}
        />
        <span className="icon-chip p-2.5">
          <Upload className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-white">
            {keyFile
              ? t('files.workspace.keyFile.change')
              : t('files.workspace.keyFile.choose')}
          </span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            {t('files.workspace.keyFile.limit')}
          </span>
        </span>
      </label>

      {keyFile ? (
        <div className="flex items-center justify-between gap-3 rounded-[20px] border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
          <div className="flex min-w-0 items-center gap-3">
            <FileKey2 className="h-5 w-5 shrink-0 text-emerald-200" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {keyFile.name}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {formatFileSize(keyFile.size)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label={t('files.workspace.keyFile.remove')}
            className="icon-chip shrink-0 p-2 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="rounded-[20px] border border-amber-300/20 bg-amber-300/[0.07] p-4 text-xs leading-6 text-amber-50">
        <p>{t('files.workspace.keyFile.noRecovery')}</p>
        <p>{t('files.workspace.keyFile.notEmbedded')}</p>
        <p>{t('files.workspace.keyFile.exactBytes')}</p>
      </div>
    </div>
  )
}

export default function KeyFileProtectionPanel(props: Props) {
  const { t } = useTranslation()

  if (props.mode === 'decrypt') {
    if (!props.required) {
      return null
    }

    return (
      <section className="surface-primary rounded-[28px] border border-amber-300/20 p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="icon-chip p-2.5">
            <FileKey2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">
              {t('files.workspace.keyFile.requiredTitle')}
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              {t('files.workspace.keyFile.requiredHelper')}
            </p>
          </div>
        </div>
        <KeyFilePicker {...props} />
      </section>
    )
  }

  return (
    <AdvancedOptions
      title={t('files.workspace.keyFile.title')}
      helper={t('files.workspace.keyFile.helper')}
    >
      <label className="flex cursor-pointer items-start gap-3 rounded-[20px] border border-white/10 bg-white/[0.025] p-4">
        <input
          type="checkbox"
          checked={props.enabled}
          disabled={props.disabled}
          onChange={(event) => props.onEnabledChange(event.target.checked)}
          className="mt-1 accent-cyan-400"
        />
        <span>
          <span className="block text-sm font-medium text-white">
            {t('files.workspace.keyFile.enable')}
          </span>
          <span className="mt-1 block text-xs leading-6 text-zinc-400">
            {t('files.workspace.keyFile.enableDescription')}
          </span>
        </span>
      </label>

      {props.enabled ? (
        <div className="mt-4">
          <KeyFilePicker {...props} />
        </div>
      ) : null}
    </AdvancedOptions>
  )
}
