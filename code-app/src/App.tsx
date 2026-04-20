import { useState, useEffect } from 'react'
import './App.css'

type SLAProcess = {
  id: string
  name: string
  slaDescription: string
}

type Severity = 'green' | 'yellow' | 'red'

type SLABreach = {
  id: string
  processName: string
  slaDescription: string
  explanation: string
  dateFrom: string
  dateTo: string
  measurement: string
  severity: Severity
  createdOn?: string
}

type GeneratedSummary = {
  processName: string
  monthKey: string
  monthLabel: string
  periodFrom: string
  periodTo: string
  descriptionSection: string
  impactSection: string
  followUpSection: string
  actionPlanSection: string
}

type LockedSummaryRecord = {
  id: string
  processName: string
  monthKey: string
  monthLabel: string
  lockedAt: string
  summary: GeneratedSummary
}

type SummaryPayload = Record<string, unknown> &
  Partial<
  GeneratedSummary & {
    beskrivelse: string
    beskrivelseAfNedbrud: string
    kundepavirkning: string
    kundePaavirkning: string
    kundepåvirkning: string
    opfolgning: string
    opfølgning: string
    handlingsplan: string
  }
>

type CopilotSummaryResponse = {
  summary?: SummaryPayload
  data?: {
    summary?: SummaryPayload
  }
  result?: SummaryPayload
}

type DataverseEntity = {
  srv_slaburditsmprocesserid?: string
  srv_itsmprocessesnavn?: string
  srv_sladescription?: string
  srv_slaforklaring?: string
  srv_sladatafra?: string
  srv_sladatatil?: string
  srv_maling?: string
  srv_severity?: string
  createdon?: string
}

type DataverseRetrieveResponse = {
  entities: DataverseEntity[]
}

type XrmWebApi = {
  retrieveMultipleRecords: (entitySetName: string, query: string) => Promise<DataverseRetrieveResponse>
  createRecord: (entitySetName: string, data: Record<string, unknown>) => Promise<unknown>
}

type XrmGlobal = {
  WebApi?: XrmWebApi
}

const getXrm = () => {
  return (window as Window & { Xrm?: XrmGlobal }).Xrm
}

const getPreviousMonthDateRange = () => {
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  const now = new Date()
  const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastDayPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  return {
    dateFrom: formatLocalDate(firstDayPreviousMonth),
    dateTo: formatLocalDate(lastDayPreviousMonth),
  }
}

const mockProcesses: SLAProcess[] = [
  { id: '1', name: 'Incident Management', slaDescription: 'A1 - hændelser løst inden for 3 timer' },
  { id: '2', name: 'Incident Management', slaDescription: 'A2 - hændelser løst inden for 1 arbejdsdag' },
  { id: '3', name: 'Incident Management', slaDescription: 'B1 - hændelser løst inden for 3 arbejdsdage' },
  { id: '4', name: 'Incident Management', slaDescription: 'B2 - hændelser løst inden for 10 arbejdsdage' },
  { id: '5', name: 'Incident Management', slaDescription: 'B3 - hændelser løst inden for 20 arbejdsdage' },

  { id: '6', name: 'Major Incident', slaDescription: 'MI, vil der ske en kommunikation i form af Driftsinfo inden for 15 minutter' },
  { id: '7', name: 'Major Incident', slaDescription: 'MI, vil der ske en kommunikation i form af Driftsinfo inden for 30 minutter' },
  { id: '8', name: 'Major Incident', slaDescription: 'alle 1. mødeindkaldelser på en MI skal ske inden for 30 min af start på MI' },
  { id: '9', name: 'Major Incident', slaDescription: 'alle 1. mødeindkaldelser på en MI skal ske inden for 60 min af start på MI' },
  { id: '10', name: 'Major Incident', slaDescription: 'alle 1. møde på en MI skal være startet inden for 1 time af MI Start' },
  { id: '11', name: 'Major Incident', slaDescription: 'alle 1. møde på en MI skal være startet inden for 1 1/2 time af MI Start' },

  { id: '12', name: 'Request Management', slaDescription: 'alle standard ydelser er løst inden for aftalte tid' },
  { id: '13', name: 'Request Management', slaDescription: 'alle konsulent ydelser er der afgivet et tilbud eller en respons inden for 10 arbejdsdage' },
  { id: '14', name: 'Request Management', slaDescription: 'alt rådgivning er igangsat inden for 3 arbejdsdage' },

  { id: '15', name: 'Capacity Management', slaDescription: 'Alle kapacitetsområder rapporteres på driftboard' },
  { id: '16', name: 'Capacity Management', slaDescription: '100 % af Mængden af kapacitetsområde i Bankdatas ydelser som rapporteres til Driftsboard' },
  { id: '17', name: 'Capacity Management', slaDescription: 'Hvorvidt kapaciteten er under limit for den gældende grænseværdi f. den interne SLA for ydelsen/produktet/området' },

  { id: '18', name: 'Change Enablement', slaDescription: 'Normal Changes lukkes med successful (99% = Green, 95-99% = Yellow, <95% = Red)' },
  { id: '19', name: 'Change Enablement', slaDescription: 'Emergency Changes lukkes med successful (99% = Green, 95-99% = Yellow, <95% = Red)' },
  { id: '20', name: 'Change Enablement', slaDescription: 'Standard Changes lukkes med successful (99% = Green, 95-99% = Yellow, <95% = Red)' },

  { id: '21', name: 'Availability Management', slaDescription: 'Antal minutter målt på alle A1 eller en MI over mdr.' },

  { id: '22', name: 'Access Management', slaDescription: 'alle standard ydelser er løst inden for aftalte tid' },
  { id: '23', name: 'Access Management', slaDescription: 'alle konsulent ydelser er der afgivet et tilbud eller en respons inden for 10 arbejdsdage' },
  { id: '24', name: 'Access Management', slaDescription: 'alt rådgivning er igangsat inden for 3 arbejdsdage' },

  { id: '25', name: 'Problem Management', slaDescription: 'OnePager skal være tilgængelig på Sharepoint inden for 3 arbejdsdage på Major Incidents.' },
  { id: '26', name: 'Problem Management', slaDescription: 'RCA rapporter skal være løst ikke lukket inden for 11 arbejdsdage på Major Incidents - Sharepoint' },
  { id: '27', name: 'Problem Management', slaDescription: '90 %/Actions i RCA/PIR/BPM skal have en forventet tid (ETA) til implementeres når RCA er løst' },

  { id: '28', name: 'Continuity Management', slaDescription: '95 % af de planlagte Tests jf. Testårshjulet bliver gennemført til tiden' },
  { id: '29', name: 'Continuity Management', slaDescription: '90 % af alle testrapporter er tilgængelig for kunderne inden for 14 dage efter udført test' },
  { id: '30', name: 'Continuity Management', slaDescription: '90 % af alle findings i forbindelse med test vil der bliver fulgt op og rapporteret på' },
  { id: '31', name: 'Continuity Management', slaDescription: '95 % af alle indledende beredskabsmøder er afholdt inden for 15 min. efter beredskabslederen har aktiveret beredskabsledelsen' },
]

const mockBreaches: SLABreach[] = [
  {
    id: '1',
    processName: 'Incident Management',
    slaDescription: 'Incident skal løses inden for 4 timer',
    explanation: 'Demo: Systemnedetid på 2 timer - løste først efter 4 timer',
    dateFrom: '2026-03-28',
    dateTo: '2026-03-28',
    measurement: '120 minutter',
    severity: 'red',
    createdOn: '2026-03-28',
  },
]

const processNameOptions = [
  'Incident Management',
  'Problem Management',
  'Major Incident',
  'Request Management',
  'Patch Management',
  'Capacity Management',
  'Change Enablement',
  'Availability Management',
  'Continuity Management',
  'Access Management',
  'Supplier Management',
]

export default function App() {
  const defaultDateRange = getPreviousMonthDateRange()
  const [processes, setProcesses] = useState<SLAProcess[]>([])
  const [selectedProcessName, setSelectedProcessName] = useState('')
  const [selectedProcessId, setSelectedProcessId] = useState('')
  const [breaches, setBreaches] = useState<SLABreach[]>([])

  // Form states
  const [explanation, setExplanation] = useState('')
  const [dateFrom, setDateFrom] = useState(defaultDateRange.dateFrom)
  const [dateTo, setDateTo] = useState(defaultDateRange.dateTo)
  const [measurement, setMeasurement] = useState('')
  const [severity, setSeverity] = useState<Severity>('green')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [loadingProcesses, setLoadingProcesses] = useState(false)
  const [answeredDescriptionIdsByProcess, setAnsweredDescriptionIdsByProcess] = useState<Record<string, string[]>>({})
  const [showMorePrompt, setShowMorePrompt] = useState(false)
  const [generatedSummary, setGeneratedSummary] = useState<GeneratedSummary | null>(null)
  const [editableSummary, setEditableSummary] = useState<GeneratedSummary | null>(null)
  const [summarySavedMessage, setSummarySavedMessage] = useState('')
  const [isSummaryLocked, setIsSummaryLocked] = useState(false)
  const [lockedSummaries, setLockedSummaries] = useState<LockedSummaryRecord[]>([])
  const [managerViewProcessName, setManagerViewProcessName] = useState('')
  const [selectedLockedSummary, setSelectedLockedSummary] = useState<LockedSummaryRecord | null>(null)

  const allDescriptionsForSelectedProcess = selectedProcessName
    ? processes.filter((process) => process.name === selectedProcessName)
    : []
  const answeredDescriptionIds = new Set(answeredDescriptionIdsByProcess[selectedProcessName] || [])
  const alreadyReportedDescriptions = new Set(
    breaches
      .filter(
        (breach) =>
          breach.processName === selectedProcessName && breach.dateFrom === dateFrom && breach.dateTo === dateTo
      )
      .map((breach) => breach.slaDescription)
  )
  const availableDescriptions = allDescriptionsForSelectedProcess.filter(
    (process) => !answeredDescriptionIds.has(process.id) && !alreadyReportedDescriptions.has(process.slaDescription)
  )
  const selectedProcess = availableDescriptions.find((process) => process.id === selectedProcessId) || null
  const availableProcessNames =
    processes.length > 0 ? Array.from(new Set(processes.map((process) => process.name))).sort() : processNameOptions

  const formatMonthYearDa = (dateValue: string) => {
    if (!dateValue) {
      return 'ukendt periode'
    }

    const [year, month] = dateValue.split('-')
    const monthNumber = Number(month)
    const monthNames = [
      'januar',
      'februar',
      'marts',
      'april',
      'maj',
      'juni',
      'juli',
      'august',
      'september',
      'oktober',
      'november',
      'december',
    ]

    return `${monthNames[monthNumber - 1] || 'ukendt måned'} ${year}`
  }

  const toMonthKey = (dateValue: string) => {
    if (!dateValue || dateValue.length < 7) {
      return ''
    }

    return dateValue.slice(0, 7)
  }

  const toFirstDayOfMonth = (dateValue: string) => {
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) {
      return dateValue
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}-01`
  }

  const toLastDayOfMonth = (dateValue: string) => {
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) {
      return dateValue
    }

    const year = date.getFullYear()
    const month = date.getMonth()
    const lastDate = new Date(year, month + 1, 0)
    const monthText = String(lastDate.getMonth() + 1).padStart(2, '0')
    const dayText = String(lastDate.getDate()).padStart(2, '0')
    return `${lastDate.getFullYear()}-${monthText}-${dayText}`
  }

  const isFirstDayOfMonth = (dateValue: string) => dateValue.endsWith('-01')

  const isLastDayOfMonth = (dateValue: string) => {
    if (!dateValue) {
      return false
    }

    return toLastDayOfMonth(dateValue) === dateValue
  }

  const currentMonthKey = toMonthKey(dateFrom)
  const isCurrentPeriodLocked =
    !!selectedProcessName &&
    !!currentMonthKey &&
    lockedSummaries.some(
      (item) => item.processName === selectedProcessName && item.monthKey === currentMonthKey
    )

  const historyFilterProcess = generatedSummary?.processName || selectedProcessName
  const historyFilterFrom = generatedSummary?.periodFrom || dateFrom
  const historyFilterTo = generatedSummary?.periodTo || dateTo
  const displayedBreaches = historyFilterProcess
    ? breaches.filter(
        (breach) =>
          breach.processName === historyFilterProcess &&
          breach.dateFrom === historyFilterFrom &&
          breach.dateTo === historyFilterTo
      )
    : breaches

  const generateLocalProcessSummary = (
    processName: string,
    fromDate: string,
    toDate: string,
    allBreaches: SLABreach[]
  ): GeneratedSummary | null => {
    const allProcessSlaDescriptions = processes
      .filter((process) => process.name === processName)
      .map((process) => process.slaDescription)

    const processPeriodBreaches = allBreaches.filter(
      (breach) => breach.processName === processName && breach.dateFrom === fromDate && breach.dateTo === toDate
    )

    const redBreaches = processPeriodBreaches.filter((breach) => breach.severity === 'red')
    const monthLabel = formatMonthYearDa(fromDate)

    if (redBreaches.length === 0) {
      return null
    }

    const coveredSlaCount = new Set(processPeriodBreaches.map((breach) => breach.slaDescription)).size
    const totalSlaCount = allProcessSlaDescriptions.length

    const incidentsNarrative = redBreaches
      .map((breach) => {
        const scoreText = breach.measurement ? `Målingen var ${breach.measurement}` : 'Målingen er registreret som afvigende'
        return `${breach.slaDescription}: ${scoreText}. Forklaringen angiver, at ${breach.explanation.toLowerCase()}.`
      })
      .join(' ')

    return {
      processName,
      monthKey: toMonthKey(fromDate),
      monthLabel,
      periodFrom: fromDate,
      periodTo: toDate,
      descriptionSection:
        `I ${monthLabel} er der registreret ${redBreaches.length} kritiske hændelse(r) inden for ${processName}. ` +
        `Der er indberettet svar på ${coveredSlaCount} ud af ${totalSlaCount} relevante SLA-beskrivelser for processen i perioden ${fromDate} til ${toDate}. ` +
        incidentsNarrative,
      impactSection:
        'De registrerede hændelser har medført risiko for forsinkelser i bankernes forretningsnære processer, herunder håndtering af incidents, ændringer og serviceleverancer. Påvirkningen vurderes primært som øget usikkerhed omkring leveringstid og forudsigelighed for de berørte kunder.',
      followUpSection:
        'Hændelserne er gennemgået med de ansvarlige drifts- og procesteams med fokus på årsagsafklaring, validering af tidslinjer og vurdering af afhængigheder på tværs af leverancer. Der arbejdes systematisk med at sikre fælles forståelse af, hvor procesforløb og koordinering kan styrkes.',
      actionPlanSection:
        'Der igangsættes målrettet opfølgning med tydelig ansvarstildeling, skærpet overvågning af de mest følsomme aktiviteter samt strammere styring af kommunikation og eskalation. Derudover planlægges forebyggende procesjusteringer og læringsopsamling, så tilsvarende hændelser reduceres i kommende rapporteringsperioder.',
    }
  }

  const generateProcessSummary = async (
    processName: string,
    fromDate: string,
    toDate: string,
    allBreaches: SLABreach[]
  ): Promise<GeneratedSummary | null> => {
    const localSummary = generateLocalProcessSummary(processName, fromDate, toDate, allBreaches)
    if (!localSummary) {
      return null
    }

    const endpoint = import.meta.env.VITE_COPILOT_STUDIO_ENDPOINT as string | undefined
    const apiKey = import.meta.env.VITE_COPILOT_STUDIO_API_KEY as string | undefined

    if (!endpoint) {
      return localSummary
    }

    const pickFirstText = (source: SummaryPayload | null | undefined, keys: string[]) => {
      for (const key of keys) {
        const value = source?.[key]
        if (typeof value === 'string' && value.trim()) {
          return value
        }
      }

      return ''
    }

    try {
      const redEvents = allBreaches
        .filter(
          (breach) =>
            breach.processName === processName &&
            breach.dateFrom === fromDate &&
            breach.dateTo === toDate &&
            breach.severity === 'red'
        )
        .map((breach) => ({
          procesnavn: breach.processName,
          aktivitet: breach.slaDescription,
          slaScore: breach.measurement,
          status: breach.severity,
          start: breach.dateFrom,
          slut: breach.dateTo,
          fejlbeskrivelse: breach.explanation,
        }))

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          processName,
          periodFrom: fromDate,
          periodTo: toDate,
          events: redEvents,
          instruction:
            'Generér dansk professionel opsummering med sektionerne: beskrivelse, kundepåvirkning, opfølgning, handlingsplan. Brug neutral tone og afsnit.',
        }),
      })

      if (!response.ok) {
        return localSummary
      }

      const payload = (await response.json()) as CopilotSummaryResponse | SummaryPayload
      const responsePayload = payload as CopilotSummaryResponse
      const summaryPayload = responsePayload.summary ?? responsePayload.data?.summary ?? responsePayload.result ?? payload

      const descriptionSection =
        pickFirstText(summaryPayload, ['descriptionSection', 'beskrivelse', 'beskrivelseAfNedbrud']) ||
        localSummary.descriptionSection
      const impactSection =
        pickFirstText(summaryPayload, ['impactSection', 'kundepavirkning', 'kundePaavirkning', 'kundepåvirkning']) ||
        localSummary.impactSection
      const followUpSection =
        pickFirstText(summaryPayload, ['followUpSection', 'opfolgning', 'opfølgning']) ||
        localSummary.followUpSection
      const actionPlanSection =
        pickFirstText(summaryPayload, ['actionPlanSection', 'handlingsplan']) || localSummary.actionPlanSection

      return {
        ...localSummary,
        descriptionSection,
        impactSection,
        followUpSection,
        actionPlanSection,
      }
    } catch {
      return localSummary
    }
  }

  const getRemainingDescriptionCount = (
    processName: string,
    fromDate: string,
    toDate: string,
    answeredMap: Record<string, string[]>,
    breachesSource: SLABreach[]
  ) => {
    const allForProcess = processes.filter((process) => process.name === processName)
    const answeredIds = new Set(answeredMap[processName] || [])
    const reportedDescriptions = new Set(
      breachesSource
        .filter(
          (breach) =>
            breach.processName === processName && breach.dateFrom === fromDate && breach.dateTo === toDate
        )
        .map((breach) => breach.slaDescription)
    )

    return allForProcess.filter(
      (process) => !answeredIds.has(process.id) && !reportedDescriptions.has(process.slaDescription)
    ).length
  }

  // Hent processer når appen starter
  useEffect(() => {
    fetchProcesses()
    fetchBreaches()
  }, [])

  useEffect(() => {
    if (selectedProcessId && !availableDescriptions.some((process) => process.id === selectedProcessId)) {
      setSelectedProcessId('')
    }
  }, [selectedProcessId, availableDescriptions])

  const fetchProcesses = async () => {
    setLoadingProcesses(true)
    try {
      const xrm = getXrm()
      const isInPowerApps = typeof xrm !== 'undefined'

      if (isInPowerApps) {
        if (xrm && xrm.WebApi) {
          console.log('Fetching SLA processes from Dataverse...')
          const response = await xrm.WebApi.retrieveMultipleRecords('srv_slaburditsmprocesser', '?$select=srv_itsmprocessesnavn,srv_sladescription')

          const fetchedProcesses: SLAProcess[] = response.entities
            .filter((entity) => entity.srv_itsmprocessesnavn && entity.srv_sladescription)
            .map((entity, index) => ({
              id: entity.srv_slaburditsmprocesserid || `process-${index}`,
              name: entity.srv_itsmprocessesnavn || '',
              slaDescription: entity.srv_sladescription || '',
            }))

          setProcesses(fetchedProcesses)
          console.log('Loaded', fetchedProcesses.length, 'processes')
        }
      } else {
        console.log('Loading demo processes...')
        setProcesses(mockProcesses)
      }
    } catch (error) {
      console.error('Error fetching processes:', error)
      setProcesses(mockProcesses)
    } finally {
      setLoadingProcesses(false)
    }
  }

  const fetchBreaches = async () => {
    try {
      const xrm = getXrm()
      const isInPowerApps = typeof xrm !== 'undefined'

      if (isInPowerApps) {
        if (xrm && xrm.WebApi) {
          console.log('Fetching SLA breaches from Dataverse...')
          const response = await xrm.WebApi.retrieveMultipleRecords(
            'srv_slaburditsmprocesser',
            '?$select=srv_itsmprocessesnavn,srv_sladescription,srv_slaforklaring,srv_sladatafra,srv_sladatatil,srv_maling,srv_severity,createdon&$orderby=createdon desc'
          )

          const fetchedBreaches: SLABreach[] = response.entities
            .filter(
              (entity) =>
                entity.srv_itsmprocessesnavn &&
                entity.srv_sladescription &&
                entity.srv_slaforklaring &&
                entity.srv_sladatafra &&
                entity.srv_sladatatil &&
                entity.srv_maling &&
                entity.srv_severity
            )
            .map((entity, index) => ({
              id: entity.srv_slaburditsmprocesserid || `breach-${index}`,
              processName: entity.srv_itsmprocessesnavn || '',
              slaDescription: entity.srv_sladescription || '',
              explanation: entity.srv_slaforklaring || '',
              dateFrom: entity.srv_sladatafra?.split('T')[0] || '',
              dateTo: entity.srv_sladatatil?.split('T')[0] || '',
              measurement: entity.srv_maling || '',
              severity: (entity.srv_severity?.toLowerCase() as Severity) || 'green',
              createdOn: entity.createdon?.split('T')[0],
            }))

          setBreaches(fetchedBreaches)
        }
      } else {
        setBreaches(mockBreaches)
      }
    } catch (error) {
      console.error('Error fetching breaches:', error)
      setBreaches(mockBreaches)
    }
  }

  const handleProcessChange = (processName: string) => {
    setSelectedProcessName(processName)
    setSelectedProcessId('')
    setShowMorePrompt(false)
    setExplanation('')
    setDateFrom(defaultDateRange.dateFrom)
    setDateTo(defaultDateRange.dateTo)
    setMeasurement('')
    setSeverity('green')
    setMessage('')
  }

  const submitBreach = async () => {
    if (isCurrentPeriodLocked) {
      setMessage('🔒 Denne måned er låst til rapportering for den valgte proces. Der kan ikke indrapporteres flere hændelser.')
      return
    }

    if (!selectedProcess) {
      setMessage('Vælg venligst en ITSM proces')
      return
    }
    if (!explanation.trim()) {
      setMessage('Angiv venligst en forklaring på SLA bruddet')
      return
    }
    if (!dateFrom) {
      setMessage('Angiv venligst start dato')
      return
    }
    if (!dateTo) {
      setMessage('Angiv venligst slut dato')
      return
    }
    if (!measurement.trim()) {
      setMessage('Angiv venligst måling af bruddet')
      return
    }

    if (!isFirstDayOfMonth(dateFrom)) {
      setMessage('Fra dato skal være den 1. dag i måneden.')
      return
    }

    if (!isLastDayOfMonth(dateTo)) {
      setMessage('Til dato skal være den sidste dag i måneden.')
      return
    }

    if (toMonthKey(dateFrom) !== toMonthKey(dateTo)) {
      setMessage('Fra dato og Til dato skal være i samme måned.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const xrm = getXrm()
      const isInPowerApps = typeof xrm !== 'undefined'
      const submittedProcessName = selectedProcess.name
      const submittedSlaDescription = selectedProcess.slaDescription
      const submittedDateFrom = dateFrom
      const submittedDateTo = dateTo

      if (isInPowerApps) {
        if (xrm && xrm.WebApi) {
          console.log('Saving SLA breach to Dataverse...')
          await xrm.WebApi.createRecord('srv_slaburditsmprocesser', {
            srv_itsmprocessesnavn: submittedProcessName,
            srv_sladescription: submittedSlaDescription,
            srv_slaforklaring: explanation,
            srv_sladatafra: new Date(dateFrom).toISOString(),
            srv_sladatatil: new Date(dateTo).toISOString(),
            srv_maling: measurement,
            srv_severity: severity.toUpperCase(),
          })
        }
      } else {
        console.log('Demo: Would save', {
          selectedProcess: submittedProcessName,
          slaDescription: submittedSlaDescription,
          explanation,
          dateFrom,
          dateTo,
          measurement,
          severity,
        })
        await new Promise((resolve) => setTimeout(resolve, 800))
      }

      const submittedBreach: SLABreach = {
        id: `local-${Date.now()}`,
        processName: submittedProcessName,
        slaDescription: submittedSlaDescription,
        explanation,
        dateFrom: submittedDateFrom,
        dateTo: submittedDateTo,
        measurement,
        severity,
        createdOn: new Date().toISOString().split('T')[0],
      }

      const updatedBreaches = [submittedBreach, ...breaches]
      setBreaches(updatedBreaches)

      const nextAnsweredMap: Record<string, string[]> = {
        ...answeredDescriptionIdsByProcess,
        [submittedProcessName]: Array.from(
          new Set([...(answeredDescriptionIdsByProcess[submittedProcessName] || []), selectedProcess.id])
        ),
      }
      setAnsweredDescriptionIdsByProcess(nextAnsweredMap)

      const remainingCount = getRemainingDescriptionCount(
        submittedProcessName,
        submittedDateFrom,
        submittedDateTo,
        nextAnsweredMap,
        updatedBreaches
      )

      if (remainingCount > 0) {
        setShowMorePrompt(true)
        setMessage(`✅ SLA brud registreret. Vil du indberette flere? (${remainingCount} tilbage)`) 
        setSelectedProcessId('')
        setExplanation('')
        setMeasurement('')
        setSeverity('green')
      } else {
        const summary = await generateProcessSummary(
          submittedProcessName,
          submittedDateFrom,
          submittedDateTo,
          updatedBreaches
        )

        if (summary) {
          setGeneratedSummary(summary)
          setEditableSummary(summary)
          setIsSummaryLocked(false)
          setSummarySavedMessage('ℹ️ Opsummering er automatisk genereret og klar til redigering.')
        } else {
          setGeneratedSummary(null)
          setEditableSummary(null)
          setSummarySavedMessage('')
        }

        setShowMorePrompt(false)
        setMessage(
          summary
            ? '✅ SLA brud registreret. Opsummering er automatisk genereret og klar til redigering.'
            : '✅ SLA brud registreret. Alle SLA-beskrivelser for denne proces/periode er nu besvaret.'
        )
        setSelectedProcessName('')
        setSelectedProcessId('')
        setExplanation('')
        setDateFrom(defaultDateRange.dateFrom)
        setDateTo(defaultDateRange.dateTo)
        setMeasurement('')
        setSeverity('green')
      }

      if (isInPowerApps) {
        fetchBreaches() // Refresh list from Dataverse
      }
    } catch (error) {
      console.error('Save error:', error)
      setMessage('❌ Fejl: ' + (error instanceof Error ? error.message : 'Ukendt fejl'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      <div className="app-card">
        <div className="app-header">
          <h1>SLA Brud Rapportering</h1>
          <p className="subtitle">Registrer SLA brud for ITSM processer</p>
        </div>

        {/* Proces valg */}
        <div className="form-row">
          <label htmlFor="process" className="input-label">
            ITSM Proces Navn *
          </label>
          {loadingProcesses ? (
            <p className="loading-text">Henter processer...</p>
          ) : (
            <select
              id="process"
              value={selectedProcessName}
              onChange={(e) => handleProcessChange(e.target.value)}
              className="input-select"
              disabled={loading}
            >
              <option value="">-- Vælg proces --</option>
              {availableProcessNames.map((processName) => (
                <option key={processName} value={processName}>
                  {processName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Valg af SLA Beskrivelse */}
        <div className="form-row">
          <label htmlFor="slaDescription" className="input-label">
            Valg af SLA beskrivelse *
          </label>
          <select
            id="slaDescription"
            value={selectedProcessId}
            onChange={(e) => {
              setSelectedProcessId(e.target.value)
              setShowMorePrompt(false)
              setMessage('')
            }}
            className="input-select"
            disabled={loading || !selectedProcessName}
          >
            <option value="">-- Vælg SLA beskrivelse --</option>
            {availableDescriptions.map((process) => (
              <option key={process.id} value={process.id}>
                {process.slaDescription}
              </option>
            ))}
          </select>
        </div>

        {selectedProcessName && !loadingProcesses && availableDescriptions.length === 0 && (
          <div className="form-row">
            <p className="empty-text">Alle SLA-beskrivelser for denne proces og periode er allerede besvaret.</p>
          </div>
        )}

        {selectedProcess && (
          <div className="form-row">
            <div className="sla-description">
              <label className="input-label">Valgt SLA Beskrivelse</label>
              <p className="description-text">{selectedProcess.slaDescription}</p>
            </div>
          </div>
        )}

        {/* Forklaring */}
        <div className="form-row">
          <label htmlFor="explanation" className="input-label">
            SLA Forklaring *
          </label>
          <textarea
            id="explanation"
            rows={4}
            placeholder="Beskriv hvad der forårsagede SLA bruddet..."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="input-textarea"
            disabled={loading || !selectedProcess}
          />
        </div>

        {/* Datoer */}
        <div className="form-row-grid">
          <div className="form-row">
            <label htmlFor="dateFrom" className="input-label">
              SLA Dato Fra *
            </label>
            <input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                const normalizedFrom = toFirstDayOfMonth(e.target.value)
                setDateFrom(normalizedFrom)
                setDateTo(toLastDayOfMonth(normalizedFrom))
              }}
              className="input-select"
              disabled={loading || !selectedProcess || isCurrentPeriodLocked}
            />
          </div>
          <div className="form-row">
            <label htmlFor="dateTo" className="input-label">
              SLA Dato Til *
            </label>
            <input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => {
                const normalizedTo = toLastDayOfMonth(e.target.value)
                setDateTo(normalizedTo)
                setDateFrom(toFirstDayOfMonth(normalizedTo))
              }}
              className="input-select"
              disabled={loading || !selectedProcess || isCurrentPeriodLocked}
            />
          </div>
        </div>

        {isCurrentPeriodLocked && (
          <div className="form-row">
            <p className="locked-period-info">
              🔒 Denne måned er låst for den valgte proces, fordi opsummeringen allerede er låst til rapportering.
            </p>
          </div>
        )}

        {/* Måling */}
        <div className="form-row">
          <label htmlFor="measurement" className="input-label">
            Måling *
          </label>
          <input
            id="measurement"
            type="text"
            placeholder="Fx: 120 minutter, 5 timer, 50% kapacitet..."
            value={measurement}
            onChange={(e) => setMeasurement(e.target.value)}
            className="input-select"
            disabled={loading || !selectedProcess || isCurrentPeriodLocked}
          />
        </div>

        {/* Severity */}
        <div className="form-row">
          <label className="input-label">Severity *</label>
          <div className="severity-buttons">
            {(['green', 'yellow', 'red'] as Severity[]).map((level) => (
              <button
                key={level}
                className={`severity-btn severity-${level} ${severity === level ? 'active' : ''}`}
                onClick={() => setSeverity(level)}
                disabled={loading || !selectedProcess || isCurrentPeriodLocked}
              >
                {level === 'green' ? '🟢 Grøn' : level === 'yellow' ? '🟡 Gul' : '🔴 Rød'}
              </button>
            ))}
          </div>
        </div>

        {/* Gem knap */}
        <button className="submit-button" onClick={submitBreach} disabled={loading || !selectedProcess || isCurrentPeriodLocked}>
          {loading ? 'Gemmer...' : 'Gem SLA Brud'}
        </button>

        {message && <div className="feedback-message">{message}</div>}

        {showMorePrompt && selectedProcessName && (
          <div className="continue-prompt">
            <p>Er der flere SLA-beskrivelser du vil indberette brud på?</p>
            <div className="continue-actions">
              <button
                className="submit-button"
                onClick={() => {
                  setShowMorePrompt(false)
                  setMessage('Vælg næste SLA-beskrivelse fra listen.')
                }}
              >
                Ja, vis næste
              </button>
              <button
                className="severity-btn"
                onClick={async () => {
                  const finishedProcessName = selectedProcessName
                  const finishedDateFrom = dateFrom
                  const finishedDateTo = dateTo
                  const summary = await generateProcessSummary(
                    finishedProcessName,
                    finishedDateFrom,
                    finishedDateTo,
                    breaches
                  )
                  if (summary) {
                    setGeneratedSummary(summary)
                    setEditableSummary(summary)
                    setSummarySavedMessage('')
                    setIsSummaryLocked(false)
                  } else {
                    setGeneratedSummary(null)
                    setEditableSummary(null)
                    setSummarySavedMessage('')
                    setIsSummaryLocked(false)
                  }

                  setShowMorePrompt(false)
                  setSelectedProcessName('')
                  setSelectedProcessId('')
                  setExplanation('')
                  setDateFrom(defaultDateRange.dateFrom)
                  setDateTo(defaultDateRange.dateTo)
                  setMeasurement('')
                  setSeverity('green')
                  setMessage(
                    summary
                      ? '✅ Tak. Indberetning afsluttet for nu. Opsummering for røde hændelser er genereret.'
                      : 'ℹ️ Tak. Der er ingen røde hændelser i perioden, så der blev ikke genereret en opsummering.'
                  )
                }}
              >
                Nej, færdig
              </button>
            </div>
          </div>
        )}

        {generatedSummary && editableSummary && (
          <div className="summary-section">
            <h3>Månedlig opsummering ({generatedSummary.processName} - {generatedSummary.monthLabel})</h3>

            <div className="summary-block">
              <h4>Beskrivelse af nedbrud/SLA-brud:</h4>
              <textarea
                className="summary-textarea"
                value={editableSummary.descriptionSection}
                disabled={isSummaryLocked}
                onChange={(e) => {
                  setEditableSummary({ ...editableSummary, descriptionSection: e.target.value })
                  setSummarySavedMessage('')
                }}
              />
            </div>

            <div className="summary-block">
              <h4>Kundepåvirkning:</h4>
              <textarea
                className="summary-textarea"
                value={editableSummary.impactSection}
                disabled={isSummaryLocked}
                onChange={(e) => {
                  setEditableSummary({ ...editableSummary, impactSection: e.target.value })
                  setSummarySavedMessage('')
                }}
              />
            </div>

            <div className="summary-block">
              <h4>Opfølgning:</h4>
              <textarea
                className="summary-textarea"
                value={editableSummary.followUpSection}
                disabled={isSummaryLocked}
                onChange={(e) => {
                  setEditableSummary({ ...editableSummary, followUpSection: e.target.value })
                  setSummarySavedMessage('')
                }}
              />
            </div>

            <div className="summary-block">
              <h4>Handlingsplan:</h4>
              <textarea
                className="summary-textarea"
                value={editableSummary.actionPlanSection}
                disabled={isSummaryLocked}
                onChange={(e) => {
                  setEditableSummary({ ...editableSummary, actionPlanSection: e.target.value })
                  setSummarySavedMessage('')
                }}
              />
            </div>

            <div className="summary-actions">
              <button
                className="submit-button"
                disabled={isSummaryLocked}
                onClick={() => {
                  setGeneratedSummary(editableSummary)
                  setSummarySavedMessage('✅ Opsummeringen er gemt lokalt i appen. Angiv senere hvor den skal gemmes permanent.')
                }}
              >
                Gem opsummering
              </button>

              <button
                className="severity-btn"
                disabled={isSummaryLocked}
                onClick={() => {
                  const lockedRecord: LockedSummaryRecord = {
                    id: `locked-${Date.now()}`,
                    processName: editableSummary.processName,
                    monthKey: editableSummary.monthKey,
                    monthLabel: editableSummary.monthLabel,
                    lockedAt: new Date().toISOString(),
                    summary: editableSummary,
                  }

                  setLockedSummaries((prev) => {
                    const withoutSamePeriod = prev.filter(
                      (item) => !(item.processName === lockedRecord.processName && item.monthKey === lockedRecord.monthKey)
                    )
                    return [lockedRecord, ...withoutSamePeriod]
                  })
                  setGeneratedSummary(editableSummary)
                  setIsSummaryLocked(true)
                  setSummarySavedMessage('🔒 Opsummeringen er nu låst fast til rapportering og kan ikke længere redigeres.')
                }}
              >
                Lås opsummering fast til rapportering
              </button>

              {summarySavedMessage && <p className="summary-save-message">{summarySavedMessage}</p>}
            </div>
          </div>
        )}

        <div className="manager-overview-section">
          <h3>Procesmanager-overblik pr. måned</h3>

          <div className="form-row">
            <label htmlFor="managerProcess" className="input-label">
              Vælg procesnavn
            </label>
            <select
              id="managerProcess"
              value={managerViewProcessName}
              onChange={(e) => {
                setManagerViewProcessName(e.target.value)
                setSelectedLockedSummary(null)
              }}
              className="input-select"
            >
              <option value="">-- Vælg proces --</option>
              {processNameOptions.map((processName) => (
                <option key={processName} value={processName}>
                  {processName}
                </option>
              ))}
            </select>
          </div>

          {managerViewProcessName && (
            <div className="month-list">
              {Array.from(
                new Set(
                  breaches
                    .filter((breach) => breach.processName === managerViewProcessName)
                    .map((breach) => toMonthKey(breach.dateFrom))
                    .filter((monthKey) => monthKey)
                )
              )
                .sort((a, b) => b.localeCompare(a))
                .map((monthKey) => {
                  const monthBreaches = breaches.filter(
                    (breach) =>
                      breach.processName === managerViewProcessName && toMonthKey(breach.dateFrom) === monthKey
                  )
                  const lockedForMonth = lockedSummaries.find(
                    (item) => item.processName === managerViewProcessName && item.monthKey === monthKey
                  )

                  return (
                    <div key={monthKey} className="month-row">
                      <div>
                        <strong>{formatMonthYearDa(`${monthKey}-01`)}</strong>
                        <p>{monthBreaches.length} registrering(er)</p>
                      </div>
                      <button
                        className="severity-btn"
                        disabled={!lockedForMonth}
                        onClick={() => setSelectedLockedSummary(lockedForMonth || null)}
                      >
                        {lockedForMonth ? 'Vis låst tekst' : 'Ingen låst tekst'}
                      </button>
                    </div>
                  )
                })}
            </div>
          )}

          {selectedLockedSummary && (
            <div className="summary-section">
              <h3>
                Låst rapporttekst ({selectedLockedSummary.processName} - {selectedLockedSummary.monthLabel})
              </h3>

              <div className="summary-block">
                <h4>Beskrivelse af nedbrud/SLA-brud:</h4>
                <p>{selectedLockedSummary.summary.descriptionSection}</p>
              </div>

              <div className="summary-block">
                <h4>Kundepåvirkning:</h4>
                <p>{selectedLockedSummary.summary.impactSection}</p>
              </div>

              <div className="summary-block">
                <h4>Opfølgning:</h4>
                <p>{selectedLockedSummary.summary.followUpSection}</p>
              </div>

              <div className="summary-block">
                <h4>Handlingsplan:</h4>
                <p>{selectedLockedSummary.summary.actionPlanSection}</p>
              </div>
            </div>
          )}
        </div>

        {/* Historik */}
        <div className="history-section">
          <h3>
            Seneste SLA Brud Rapporter
            {historyFilterProcess && ` (${historyFilterProcess}, ${historyFilterFrom} til ${historyFilterTo})`}
          </h3>
          {displayedBreaches.length > 0 ? (
            <div className="breach-list">
              {displayedBreaches.map((breach) => (
                <div key={breach.id} className="breach-item">
                  <div className="breach-header">
                    <h4>{breach.processName}</h4>
                    <span className={`severity-badge severity-${breach.severity}`}>
                      {breach.severity === 'green' ? '🟢' : breach.severity === 'yellow' ? '🟡' : '🔴'}
                    </span>
                  </div>
                  <p className="breach-sla-description">{breach.slaDescription}</p>
                  <p className="breach-text">{breach.explanation}</p>
                  <div className="breach-details">
                    <span>📅 {breach.dateFrom} til {breach.dateTo}</span>
                    <span>📊 {breach.measurement}</span>
                    {breach.createdOn && <span>📝 {breach.createdOn}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">Ingen SLA brud registreret for valgt proces/periode</p>
          )}
        </div>
      </div>
    </div>
  )
}
