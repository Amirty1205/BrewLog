import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useLanguage } from '@/app/providers/LanguageContext'
import { presentError } from '@/app/errorPresentation'
import type { Coffee } from '@/domain/coffee-records'
import type {
  CustomReferenceCategory,
  ReferenceDataSnapshot,
  ReferenceEntry,
} from '@/domain/reference-data'
import type { UUID } from '@/domain/shared'
import {
  useAddMyCoffeeToCollection,
  useCoffeeCatalog,
  useCreateCatalogCoffee,
  useCreateCustomReference,
  useReferenceData,
} from './collection-api'
import type {
  CoffeeFormValues,
  PurchaseFormValues,
} from './collection-api'
import { filterCoffeeCatalog } from './collection-utils'
import {
  SearchableReferenceMultiSelect,
  SearchableReferenceSelect,
} from './ReferenceSelectors'
import type { ReferenceOption } from './ReferenceSelectors'

interface AddCoffeeDialogProps {
  onClose: () => void
}

function ErrorMessage({ error }: { error: unknown }) {
  const { t } = useLanguage()
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {t(presentError(error).messageKey)}
    </p>
  )
}

function toReferenceOption(reference: ReferenceEntry): ReferenceOption {
  return { id: reference.id, name: reference.name }
}

function NewCoffeeForm({
  busy,
  error,
  referenceData,
  referenceDataError,
  referenceDataPending,
  onCreateReference,
  onRetryReferences,
  onBack,
  onSubmit,
}: {
  busy: boolean
  error: unknown
  referenceData?: ReferenceDataSnapshot
  referenceDataError: unknown
  referenceDataPending: boolean
  onCreateReference: (
    category: CustomReferenceCategory,
    name: string,
    parentId?: UUID,
  ) => Promise<ReferenceOption>
  onRetryReferences: () => void
  onBack: () => void
  onSubmit: (values: CoffeeFormValues) => void
}) {
  const { t } = useLanguage()
  const [newFlavorFamilyId, setNewFlavorFamilyId] = useState<UUID | ''>('')
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CoffeeFormValues>({
    defaultValues: {
      name: '',
      roasteryId: '',
      originCountryId: '',
      originRegionId: '',
      originFarmId: '',
      varietyIds: [],
      processIds: [],
      flavorDescriptorIds: [],
      altitudeMin: '',
      altitudeMax: '',
      roastLevel: '',
      description: '',
    },
  })
  const countryId = useWatch({ control, name: 'originCountryId' })
  const regionId = useWatch({ control, name: 'originRegionId' })
  const origins = referenceData?.origins ?? []
  const varieties =
    referenceData?.varieties.map(({ id, name }) => ({ id, name })) ?? []
  const processes =
    referenceData?.processingMethods.map(({ id, name }) => ({ id, name })) ?? []
  const flavorDescriptors =
    referenceData?.flavorDescriptors.map((descriptor) => ({
      id: descriptor.id,
      name: descriptor.name,
      group:
        referenceData.flavorFamilies.find(
          (family) => family.id === descriptor.familyId,
        )?.name ?? t('flavorFamilyUnknown'),
    })) ?? []

  function createReference(category: CustomReferenceCategory, parentId?: UUID) {
    return (name: string) => onCreateReference(category, name, parentId)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h3 className="font-display text-xl">{t('createNewCoffee')}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {t('newCoffeeFormDescription')}
        </p>
      </div>

      <label className="block space-y-1.5 text-sm" htmlFor="coffee-name">
        <span>{t('coffeeNameLabel')}</span>
        <input
          id="coffee-name"
          autoFocus
          {...register('name', { required: t('fieldRequired') })}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        {errors.name?.message && (
          <span className="text-xs text-destructive">{errors.name.message}</span>
        )}
      </label>

      {referenceDataPending && (
        <p role="status" className="text-sm text-muted-foreground">
          {t('loadingReferenceData')}
        </p>
      )}
      {referenceDataError !== null && referenceDataError !== undefined && (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-destructive">
            {t(presentError(referenceDataError).messageKey)}
          </p>
          <button
            type="button"
            onClick={onRetryReferences}
            className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            {t('retry')}
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="roasteryId"
          render={({ field }) => (
            <SearchableReferenceSelect
              id="coffee-roastery"
              label={t('roasteryLabel')}
              options={
                referenceData?.roasteries.map(({ id, name }) => ({
                  id,
                  name,
                })) ?? []
              }
              value={field.value}
              onChange={field.onChange}
              onCreate={createReference('roastery')}
            />
          )}
        />
        <Controller
          control={control}
          name="originCountryId"
          render={({ field }) => (
            <SearchableReferenceSelect
              id="coffee-country"
              label={t('countryLabel')}
              options={origins
                .filter((origin) => origin.kind === 'country')
                .map(({ id, name }) => ({ id, name }))}
              value={field.value}
              onChange={(value) => {
                field.onChange(value)
                if (value !== field.value) {
                  setValue('originRegionId', '')
                  setValue('originFarmId', '')
                }
              }}
              onCreate={createReference('country')}
            />
          )}
        />
        <Controller
          control={control}
          name="originRegionId"
          render={({ field }) => (
            <SearchableReferenceSelect
              id="coffee-region"
              label={t('regionLabel')}
              options={origins
                .filter(
                  (origin) =>
                    origin.kind === 'region' &&
                    origin.parentId === countryId,
                )
                .map(({ id, name }) => ({ id, name }))}
              value={field.value}
              disabled={!countryId}
              onChange={(value) => {
                field.onChange(value)
                if (value !== field.value) setValue('originFarmId', '')
              }}
              onCreate={createReference('region', countryId || undefined)}
            />
          )}
        />
        <Controller
          control={control}
          name="originFarmId"
          render={({ field }) => {
            const parentId = regionId || countryId
            return (
              <SearchableReferenceSelect
                id="coffee-farm"
                label={t('farmLabel')}
                options={origins
                  .filter(
                    (origin) =>
                      origin.kind === 'farm' &&
                      origin.parentId === parentId,
                  )
                  .map(({ id, name }) => ({ id, name }))}
                value={field.value}
                disabled={!parentId}
                onChange={field.onChange}
                onCreate={createReference('farm', parentId || undefined)}
              />
            )
          }}
        />
      </div>

      <Controller
        control={control}
        name="varietyIds"
        render={({ field }) => (
          <SearchableReferenceMultiSelect
            id="coffee-varieties"
            label={t('varietyLabel')}
            options={varieties}
            value={field.value}
            onChange={field.onChange}
            onCreate={createReference('variety')}
          />
        )}
      />
      <Controller
        control={control}
        name="processIds"
        render={({ field }) => (
          <SearchableReferenceMultiSelect
            id="coffee-processes"
            label={t('processesLabel')}
            options={processes}
            value={field.value}
            onChange={field.onChange}
            onCreate={createReference('process')}
          />
        )}
      />

      <Controller
        control={control}
        name="flavorDescriptorIds"
        render={({ field }) => (
          <SearchableReferenceMultiSelect
            id="coffee-flavors"
            label={t('flavorsLabel')}
            options={flavorDescriptors}
            value={field.value}
            onChange={field.onChange}
            onCreate={
              newFlavorFamilyId
                ? createReference('flavor-descriptor', newFlavorFamilyId)
                : undefined
            }
          />
        )}
      />
      <SearchableReferenceSelect
        id="coffee-flavor-family"
        label={t('customFlavorFamilyLabel')}
        options={
          referenceData?.flavorFamilies.map(({ id, name }) => ({
            id,
            name,
          })) ?? []
        }
        value={newFlavorFamilyId}
        onChange={setNewFlavorFamilyId}
        onCreate={createReference('flavor-family')}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1.5 text-sm" htmlFor="coffee-altitude-min">
          <span>{t('altitudeMinLabel')}</span>
          <input
            id="coffee-altitude-min"
            type="number"
            min="0"
            step="any"
            {...register('altitudeMin')}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </label>
        <label className="block space-y-1.5 text-sm" htmlFor="coffee-altitude-max">
          <span>{t('altitudeMaxLabel')}</span>
          <input
            id="coffee-altitude-max"
            type="number"
            min="0"
            step="any"
            {...register('altitudeMax')}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </label>
        <label className="block space-y-1.5 text-sm" htmlFor="coffee-roast-level">
          <span>{t('roastLevelLabel')}</span>
          <select
            id="coffee-roast-level"
            {...register('roastLevel')}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <option value="">{t('roastLevelNone')}</option>
            <option value="light">{t('roastLevelLight')}</option>
            <option value="medium">{t('roastLevelMedium')}</option>
            <option value="dark">{t('roastLevelDark')}</option>
            <option value="unknown">{t('roastLevelUnknown')}</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1.5 text-sm" htmlFor="coffee-description">
        <span>{t('descriptionLabel')}</span>
        <textarea
          id="coffee-description"
          rows={3}
          {...register('description')}
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </label>

      {error !== undefined && <ErrorMessage error={error} />}

      <div className="flex flex-col-reverse justify-between gap-2 border-t border-border/70 pt-4 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t('chooseExistingCoffee')}
        </button>
        <button
          type="submit"
          disabled={busy || referenceDataPending || Boolean(referenceDataError)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
        >
          {busy ? t('savingCoffee') : t('continueToPurchase')}
          <ArrowRight size={16} aria-hidden="true" className="rtl:rotate-180" />
        </button>
      </div>
    </form>
  )
}

function PurchaseForm({
  coffee,
  roasteryName,
  busy,
  error,
  onBack,
  onSubmit,
}: {
  coffee: Coffee
  roasteryName?: string
  busy: boolean
  error: unknown
  onBack: () => void
  onSubmit: (values: PurchaseFormValues) => void
}) {
  const { t } = useLanguage()
  const [purchaseDateDefault] = useState(
    () => new Date().toISOString().slice(0, 10),
  )
  const { register, handleSubmit } = useForm<PurchaseFormValues>({
    defaultValues: {
      purchaseDate: purchaseDateDefault,
      price: '',
      currency: '',
      quantity: '',
      personalNotes: '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="rounded-xl border border-border/70 bg-muted/50 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t('selectedCoffeeLabel')}
        </p>
        <p className="mt-1 font-display text-xl">{coffee.name}</p>
        {roasteryName && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {roasteryName}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm" htmlFor="purchase-date">
          <span>
            {t('purchaseDateLabel')} · {t('optionalField')}
          </span>
          <input
            id="purchase-date"
            type="date"
            {...register('purchaseDate')}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
          <label className="block space-y-1.5 text-sm" htmlFor="purchase-price">
            <span>
              {t('priceLabel')} · {t('optionalField')}
            </span>
            <input
              id="purchase-price"
              type="number"
              min="0"
              step="any"
              {...register('price')}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </label>
          <label className="block space-y-1.5 text-sm" htmlFor="purchase-currency">
            <span>{t('currencyLabel')}</span>
            <input
              id="purchase-currency"
              {...register('currency')}
              className="h-11 w-full rounded-lg border border-input bg-background px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </label>
        </div>
        <label className="block space-y-1.5 text-sm" htmlFor="purchase-quantity">
          <span>
            {t('quantityLabel')} · {t('optionalField')}
          </span>
          <input
            id="purchase-quantity"
            type="number"
            min="0"
            step="any"
            {...register('quantity')}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </label>
      </div>

      <label className="block space-y-1.5 text-sm" htmlFor="personal-notes">
        <span>
          {t('personalNotesLabel')} · {t('optionalField')}
        </span>
        <textarea
          id="personal-notes"
          rows={4}
          {...register('personalNotes')}
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </label>

      {error !== undefined && <ErrorMessage error={error} />}

      <div className="flex flex-col-reverse justify-between gap-2 border-t border-border/70 pt-4 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t('back')}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
        >
          {busy ? t('addingCoffee') : t('addToCollection')}
          <Check size={16} aria-hidden="true" />
        </button>
      </div>
    </form>
  )
}

export function AddCoffeeDialog({ onClose }: AddCoffeeDialogProps) {
  const { language, t } = useLanguage()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { data: catalog, error: catalogError, isPending, refetch } = useCoffeeCatalog()
  const referenceQuery = useReferenceData()
  const createCoffee = useCreateCatalogCoffee()
  const createReferenceMutation = useCreateCustomReference()
  const addMyCoffee = useAddMyCoffeeToCollection()
  const [step, setStep] = useState<'coffee' | 'purchase'>('coffee')
  const [isCreating, setIsCreating] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [selectedCoffee, setSelectedCoffee] = useState<Coffee>()
  const [formError, setFormError] = useState<unknown>()
  const filteredCatalog = useMemo(
    () =>
      filterCoffeeCatalog(
        catalog ?? [],
        catalogSearch,
        language,
        referenceQuery.data,
      ),
    [catalog, catalogSearch, language, referenceQuery.data],
  )
  const roasteries = new Map(
    referenceQuery.data?.roasteries.map((reference) => [
      reference.id,
      reference.name,
    ]) ?? [],
  )
  const origins = new Map(
    referenceQuery.data?.origins.map((reference) => [
      reference.id,
      reference.name,
    ]) ?? [],
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  async function saveCoffee(values: CoffeeFormValues) {
    setFormError(undefined)
    try {
      const coffee = await createCoffee.mutateAsync(values)
      setSelectedCoffee(coffee)
      setIsCreating(false)
      setStep('purchase')
    } catch (error) {
      setFormError(error)
    }
  }

  async function createReference(
    category: CustomReferenceCategory,
    name: string,
    parentId?: UUID,
  ): Promise<ReferenceOption> {
    const reference = await createReferenceMutation.mutateAsync({
      category,
      name,
      parentId,
    })
    return toReferenceOption(reference)
  }

  async function savePurchase(values: PurchaseFormValues) {
    if (!selectedCoffee) return
    setFormError(undefined)
    try {
      await addMyCoffee.mutateAsync({ coffeeId: selectedCoffee.id, values })
      onClose()
    } catch (error) {
      setFormError(error)
    }
  }

  function closeDialog() {
    dialogRef.current?.close()
    onClose()
  }

  const isPurchaseStep = step === 'purchase' && selectedCoffee !== undefined

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="add-coffee-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog()
      }}
      className="fixed inset-0 m-0 h-dvh w-full max-w-none overflow-y-auto bg-transparent p-0 text-foreground backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-6">
        <section className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-background p-5 shadow-2xl sm:rounded-2xl sm:p-7">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                {t(isPurchaseStep ? 'purchaseDetailsStage' : 'chooseCoffeeStage')}
                <span className="px-1.5 text-muted-foreground">·</span>
                {isPurchaseStep ? '2 / 2' : '1 / 2'}
              </p>
              <h2
                id="add-coffee-title"
                className="mt-2 font-display text-3xl tracking-[-0.04em]"
              >
                {t('addCoffee')}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                {t('addCoffeeDescription')}
              </p>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              aria-label={t('cancel')}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          {isPurchaseStep ? (
            <PurchaseForm
              coffee={selectedCoffee}
              roasteryName={
                selectedCoffee.roasteryId
                  ? roasteries.get(selectedCoffee.roasteryId)
                  : undefined
              }
              busy={addMyCoffee.isPending}
              error={formError}
              onBack={() => {
                setStep('coffee')
                setFormError(undefined)
              }}
              onSubmit={(values) => void savePurchase(values)}
            />
          ) : isCreating ? (
            <NewCoffeeForm
              busy={createCoffee.isPending}
              error={formError}
              referenceData={referenceQuery.data}
              referenceDataError={referenceQuery.error}
              referenceDataPending={referenceQuery.isPending}
              onCreateReference={createReference}
              onRetryReferences={() => void referenceQuery.refetch()}
              onBack={() => {
                setIsCreating(false)
                setFormError(undefined)
              }}
              onSubmit={(values) => void saveCoffee(values)}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {t('chooseCoffeeDescription')}
              </p>
              <label className="relative block">
                <span className="sr-only">{t('searchCatalogLabel')}</span>
                <input
                  type="search"
                  value={catalogSearch}
                  onChange={(event) =>
                    setCatalogSearch(event.currentTarget.value)
                  }
                  placeholder={t('searchCatalogPlaceholder')}
                  className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </label>

              {isPending && (
                <p role="status" className="py-4 text-sm text-muted-foreground">
                  {t('catalogLoading')}
                </p>
              )}
              {catalogError && (
                <div className="space-y-3" role="alert">
                  <p className="text-sm text-destructive">
                    {t(presentError(catalogError).messageKey)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {t('retry')}
                  </button>
                </div>
              )}
              {!isPending && !catalogError && filteredCatalog.length > 0 && (
                <div
                  role="listbox"
                  aria-label={t('searchCatalogLabel')}
                  className="max-h-64 space-y-2 overflow-y-auto pe-1"
                >
                  {filteredCatalog.map((coffee) => {
                    const selected = selectedCoffee?.id === coffee.id
                    return (
                      <button
                        key={coffee.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => setSelectedCoffee(coffee)}
                        className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border p-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                          selected
                            ? 'border-primary bg-accent/70'
                            : 'border-border/70 bg-card hover:bg-muted'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {coffee.name}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {[
                              coffee.roasteryId
                                ? roasteries.get(coffee.roasteryId)
                                : undefined,
                              coffee.originFarmId
                                ? origins.get(coffee.originFarmId)
                                : undefined,
                              coffee.originRegionId
                                ? origins.get(coffee.originRegionId)
                                : undefined,
                              coffee.originCountryId
                                ? origins.get(coffee.originCountryId)
                                : undefined,
                            ]
                              .filter(Boolean)
                              .join(' · ') || t('coffeeDetailsNotSpecified')}
                          </span>
                        </span>
                        {selected ? (
                          <Check
                            size={18}
                            className="shrink-0 text-primary"
                            aria-hidden="true"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t('selectCoffee')}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
              {!isPending &&
                !catalogError &&
                catalog?.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
                    {t('catalogEmpty')}
                  </p>
                )}
              {!isPending &&
                !catalogError &&
                catalog &&
                catalog.length > 0 &&
                filteredCatalog.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t('catalogSearchEmpty')}
                  </p>
                )}

              <button
                type="button"
                onClick={() => {
                  setIsCreating(true)
                  setFormError(undefined)
                }}
                className="w-full rounded-xl border border-dashed border-primary/50 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                + {t('createNewCoffee')}
              </button>

              <div className="flex flex-col-reverse justify-between gap-2 border-t border-border/70 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="min-h-11 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  disabled={!selectedCoffee}
                  onClick={() => {
                    setStep('purchase')
                    setFormError(undefined)
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('continueToPurchase')}
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="rtl:rotate-180"
                  />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </dialog>
  )
}
