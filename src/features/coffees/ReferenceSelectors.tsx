import { useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useLanguage } from '@/app/providers/LanguageContext'
import { presentError } from '@/app/errorPresentation'
import { normalizeReferenceName } from '@/domain/reference-data'
import type { UUID } from '@/domain/shared'

export interface ReferenceOption {
  id: UUID
  name: string
  group?: string
}

type CreateOption = (name: string) => Promise<ReferenceOption>

interface SelectorProps {
  id: string
  label: string
  options: ReferenceOption[]
  disabled?: boolean
  onCreate?: CreateOption
}

function SelectorError({ error }: { error: unknown }) {
  const { t } = useLanguage()
  return (
    <p role="alert" className="text-xs text-destructive">
      {t(presentError(error).messageKey)}
    </p>
  )
}

function useOptionSelector(options: ReferenceOption[], onCreate?: CreateOption) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [addedOptions, setAddedOptions] = useState<ReferenceOption[]>([])
  const [error, setError] = useState<unknown>()
  const allOptions = useMemo(() => {
    const optionIds = new Set(options.map((option) => option.id))
    return [
      ...options,
      ...addedOptions.filter((option) => !optionIds.has(option.id)),
    ]
  }, [addedOptions, options])
  const normalizedQuery = normalizeReferenceName(query)
  const filteredOptions = allOptions.filter((option) =>
    normalizeReferenceName(option.name).includes(normalizedQuery),
  )
  const canCreate =
    Boolean(onCreate && normalizedQuery) &&
    !allOptions.some(
      (option) =>
        normalizeReferenceName(option.name) === normalizedQuery,
    )

  async function createOption(): Promise<ReferenceOption | undefined> {
    if (!onCreate || !canCreate) return undefined
    setError(undefined)
    try {
      const option = await onCreate(query.trim())
      setAddedOptions((current) => [...current, option])
      setQuery('')
      return option
    } catch (reason) {
      setError(reason)
      return undefined
    }
  }

  const createLabel = t('createCustomOption').replace(
    '{name}',
    query.trim(),
  )

  return {
    t,
    query,
    setQuery,
    isOpen,
    setIsOpen,
    normalizedQuery,
    allOptions,
    filteredOptions,
    canCreate,
    createOption,
    createLabel,
    error,
  }
}

export function SearchableReferenceSelect({
  id,
  label,
  options,
  value,
  disabled = false,
  onCreate,
  onChange,
}: SelectorProps & {
  value: UUID | ''
  onChange: (value: UUID | '') => void
}) {
  const {
    t,
    query,
    setQuery,
    isOpen,
    setIsOpen,
    normalizedQuery,
    allOptions,
    filteredOptions,
    canCreate,
    createOption,
    createLabel,
    error,
  } = useOptionSelector(options, onCreate)
  const selected = allOptions.find((option) => option.id === value)

  async function addCustom() {
    const option = await createOption()
    if (option) {
      onChange(option.id)
      setIsOpen(false)
    }
  }

  function handleCreateKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (canCreate) {
      void addCustom()
      return
    }
    const firstOption = filteredOptions[0]
    if (firstOption) {
      onChange(firstOption.id)
      setQuery('')
      setIsOpen(false)
    }
  }

  return (
    <div
      className="space-y-1.5"
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget as Node | null,
          )
        ) {
          setIsOpen(false)
        }
      }}
    >
      <label htmlFor={id} className="block text-sm">
        {label}
      </label>
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={isOpen && !disabled}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        onFocus={() => setIsOpen(true)}
        disabled={disabled}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        onKeyDown={handleCreateKey}
        placeholder={t(disabled ? 'selectParentFirst' : 'searchReference')}
        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-55"
      />
      {selected && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="truncate">{selected.name}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={`${t('clearSelection')}: ${selected.name}`}
            className="shrink-0 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t('clearSelection')}
          </button>
        </div>
      )}
      {!disabled && isOpen && (
        <ul
          id={`${id}-options`}
          role="listbox"
          aria-label={label}
          className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border/70 bg-card p-1"
        >
          {filteredOptions.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={value === option.id}
                onClick={() => {
                  onChange(option.id)
                  setQuery('')
                  setIsOpen(false)
                }}
                className="min-h-9 w-full rounded-md px-2.5 text-start text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
              >
                {option.name}
              </button>
            </li>
          ))}
          {canCreate && (
            <li>
              <button
                type="button"
                onClick={() => void addCustom()}
                className="min-h-9 w-full rounded-md px-2.5 text-start text-sm font-medium text-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
              >
                + {createLabel}
              </button>
            </li>
          )}
          {filteredOptions.length === 0 && !canCreate && (
            <li className="px-2.5 py-2 text-xs text-muted-foreground">
              {t(normalizedQuery ? 'noReferenceMatches' : 'noReferenceOptions')}
            </li>
          )}
        </ul>
      )}
      {error !== undefined && <SelectorError error={error} />}
    </div>
  )
}

export function SearchableReferenceMultiSelect({
  id,
  label,
  options,
  value,
  disabled = false,
  onCreate,
  onChange,
}: SelectorProps & {
  value: UUID[]
  onChange: (value: UUID[]) => void
}) {
  const {
    t,
    query,
    setQuery,
    isOpen,
    setIsOpen,
    normalizedQuery,
    allOptions,
    filteredOptions,
    canCreate,
    createOption,
    createLabel,
    error,
  } = useOptionSelector(options, onCreate)
  const selectedIds = new Set(value)
  const selectedOptions = value
    .map((optionId) => allOptions.find((option) => option.id === optionId))
    .filter((option): option is ReferenceOption => option !== undefined)
  const groups = new Map<string, ReferenceOption[]>()
  for (const option of filteredOptions) {
    const group = option.group ?? ''
    const optionsInGroup = groups.get(group) ?? []
    optionsInGroup.push(option)
    groups.set(group, optionsInGroup)
  }

  async function addCustom() {
    const option = await createOption()
    if (option) onChange([...value, option.id])
  }

  function toggleOption(option: ReferenceOption) {
    onChange(
      selectedIds.has(option.id)
        ? value.filter((optionId) => optionId !== option.id)
        : [...value, option.id],
    )
  }

  function handleCreateKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (canCreate) {
      void addCustom()
      return
    }
    const firstOption = filteredOptions[0]
    if (firstOption) toggleOption(firstOption)
  }

  return (
    <div
      className="space-y-1.5"
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget as Node | null,
          )
        ) {
          setIsOpen(false)
        }
      }}
    >
      <label htmlFor={id} className="block text-sm">
        {label}
      </label>
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={isOpen && !disabled}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        onFocus={() => setIsOpen(true)}
        disabled={disabled}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        onKeyDown={handleCreateKey}
        placeholder={t(disabled ? 'selectParentFirst' : 'searchReference')}
        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-55"
      />
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label={t('selectedOptions')}>
          {selectedOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option)}
              aria-label={`${t('removeSelectedOption')}: ${option.name}`}
              className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {option.name} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      {!disabled && isOpen && (
        <div
          id={`${id}-options`}
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
          className="max-h-44 overflow-y-auto rounded-lg border border-border/70 bg-card p-1"
        >
          {[...groups.entries()].map(([group, groupOptions]) => (
            <div key={group || 'ungrouped'}>
              {group && (
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group}
                </p>
              )}
              {groupOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={selectedIds.has(option.id)}
                  onClick={() => toggleOption(option)}
                  className={`min-h-9 w-full rounded-md px-2.5 text-start text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring ${
                    selectedIds.has(option.id)
                      ? 'bg-accent/70 text-accent-foreground'
                      : ''
                  }`}
                >
                  {option.name}
                </button>
              ))}
            </div>
          ))}
          {canCreate && (
            <button
              type="button"
              onClick={() => void addCustom()}
              className="min-h-9 w-full rounded-md px-2.5 text-start text-sm font-medium text-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            >
              + {createLabel}
            </button>
          )}
          {filteredOptions.length === 0 && !canCreate && (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">
              {t(normalizedQuery ? 'noReferenceMatches' : 'noReferenceOptions')}
            </p>
          )}
        </div>
      )}
      {error !== undefined && <SelectorError error={error} />}
    </div>
  )
}
