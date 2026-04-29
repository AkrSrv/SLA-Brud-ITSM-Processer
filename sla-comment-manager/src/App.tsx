import { useState } from 'react'

type InputData = {
  serviceName?: string
  month?: string
  eventsText?: string
  requestId?: string
  generatedAt?: string
  incidentCount?: number
  productCount?: number
  status?: string
  aiComment?: string
  srv_slakommentarid?: string
  srv_status?: number
}

type SummaryData = {
  descriptionSection: string
  impactSection: string
  followUpSection: string
  actionPlanSection: string
}

type CommentRecord = InputData & {
  id: string
  summary: SummaryData
  isEditing: boolean
}

const defaultSummary: SummaryData = {
  descriptionSection: '',
  impactSection: '',
  followUpSection: '',
  actionPlanSection: '',
}

function parseAiCommentToSummary(comment: string): SummaryData {
  // Split text by section headers
  const sections = {
    description: '',
    impact: '',
    followup: '',
    action: ''
  }

  // Define header patterns
  const descPattern = /beskrivelse\s+af\s+nedbrud[\s\/]*sla-brud\s*:?/i
  const impactPattern = /kundepåvirkning\s*:?/i
  const followupPattern = /opfølgning\s*:?/i
  const actionPattern = /handlingsplan\s*:?/i

  // Find positions of each header
  const descMatch = comment.match(descPattern)
  const impactMatch = comment.match(impactPattern)
  const followupMatch = comment.match(followupPattern)
  const actionMatch = comment.match(actionPattern)

  // Extract content between headers
  let descStart = descMatch ? descMatch.index! + descMatch[0].length : 0
  let impactStart = impactMatch ? impactMatch.index! + impactMatch[0].length : comment.length
  let followupStart = followupMatch ? followupMatch.index! + followupMatch[0].length : comment.length
  let actionStart = actionMatch ? actionMatch.index! + actionMatch[0].length : comment.length

  // Get the actual start positions for content extraction
  const descEnd = impactMatch ? impactMatch.index : comment.length
  const impactEnd = followupMatch ? followupMatch.index : comment.length
  const followupEnd = actionMatch ? actionMatch.index : comment.length
  const actionEnd = comment.length

  sections.description = comment.substring(descStart, descEnd).trim()
  sections.impact = comment.substring(impactStart, impactEnd).trim()
  sections.followup = comment.substring(followupStart, followupEnd).trim()
  sections.action = comment.substring(actionStart, actionEnd).trim()

  return {
    descriptionSection: sections.description || '',
    impactSection: sections.impact || '',
    followUpSection: sections.followup || '',
    actionPlanSection: sections.action || '',
  }
}

function buildAiCommentFromSummary(summary: SummaryData) {
  const parts = []
  
  if (summary.descriptionSection.trim()) {
    parts.push('Beskrivelse af nedbrud/SLA-brud:')
    parts.push(summary.descriptionSection.trim())
    parts.push('')
  }
  
  if (summary.impactSection.trim()) {
    parts.push('Kundepåvirkning:')
    parts.push(summary.impactSection.trim())
    parts.push('')
  }
  
  if (summary.followUpSection.trim()) {
    parts.push('Opfølgning:')
    parts.push(summary.followUpSection.trim())
    parts.push('')
  }
  
  if (summary.actionPlanSection.trim()) {
    parts.push('Handlingsplan:')
    parts.push(summary.actionPlanSection.trim())
  }
  
  return parts.join('\n').trim()
}

function App() {
  const [summary, setSummary] = useState<SummaryData>(defaultSummary)
  const [message, setMessage] = useState('')
  const [dataverseBaseUrl] = useState('https://org4572d424.crm4.dynamics.com')
  const [entityPluralName] = useState('srv_slakommentars')
  const [accessToken, setAccessToken] = useState('')
  const [isLoadingDataverse, setIsLoadingDataverse] = useState(false)
  const [dataverseError, setDataverseError] = useState('')
  const [comments, setComments] = useState<CommentRecord[]>([])
  const [selectedMonth, setSelectedMonth] = useState('2026-03')
  const [selectedService, setSelectedService] = useState('')
  const [availableServices, setAvailableServices] = useState<string[]>([])
  const [editingRecord, setEditingRecord] = useState<CommentRecord | null>(null)

  const loadServicesForMonth = async () => {
    setIsLoadingDataverse(true)
    setDataverseError('')
    setMessage('')
    setAvailableServices([])
    setSelectedService('')

    if (!accessToken) {
      setDataverseError('Indsæt access token.')
      setIsLoadingDataverse(false)
      return
    }

    const url = `${dataverseBaseUrl.replace(/\/$/, '')}/api/data/v9.1/${entityPluralName}?$select=srv_ydelse&$filter=srv_maned eq '${selectedMonth}'&$orderby=srv_ydelse asc`

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Dataverse indlæsning mislykkedes: ${response.status} ${response.statusText} - ${body}`)
      }

      const data = await response.json()
      const uniqueServices = Array.from(new Set(data.value.map((item: any) => item.srv_ydelse).filter(Boolean))) as string[]
      setAvailableServices(uniqueServices)
      setMessage(`${uniqueServices.length} ydelser fundet for ${selectedMonth}. Vælg en ydelse.`)
    } catch (error) {
      setDataverseError(error instanceof Error ? error.message : 'Ukendt Dataverse-fejl')
    } finally {
      setIsLoadingDataverse(false)
    }
  }

  const loadCommentsForSelectedService = async () => {
    if (!selectedService) {
      setDataverseError('Vælg først en ydelse.')
      return
    }

    setIsLoadingDataverse(true)
    setDataverseError('')
    setMessage('')

    if (!accessToken) {
      setDataverseError('Indsæt access token.')
      setIsLoadingDataverse(false)
      return
    }

    const url = `${dataverseBaseUrl.replace(/\/$/, '')}/api/data/v9.1/${entityPluralName}?$select=srv_slakommentarid,srv_requestid,srv_ydelse,srv_maned,srv_generettidspunkt,srv_status,srv_aigeneretkommentar,srv_redigeretkommentar,srv_endeligkommentar,srv_godkendttidspunkt,srv_godkendtaf&$filter=srv_maned eq '${selectedMonth}' and srv_ydelse eq '${selectedService}'`

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Dataverse indlæsning mislykkedes: ${response.status} ${response.statusText} - ${body}`)
      }

      const data = await response.json()
      const records: CommentRecord[] = data.value.map((item: any) => ({
        id: item.srv_slakommentarid,
        srv_slakommentarid: item.srv_slakommentarid,
        requestId: item.srv_requestid,
        serviceName: item.srv_ydelse,
        month: item.srv_maned,
        generatedAt: item.srv_generettidspunkt,
        status: item.srv_status === 923910000 ? 'Kladde' : item.srv_status === 923910001 ? 'Til redigering' : item.srv_status === 923910002 ? 'Godkendt' : 'Ukendt',
        srv_status: item.srv_status,
        aiComment: item.srv_aigeneretkommentar,
        summary: item.srv_aigeneretkommentar ? parseAiCommentToSummary(item.srv_aigeneretkommentar) : defaultSummary,
        isEditing: false,
      }))

      setComments(records)
      setMessage(`${records.length} kommentarer indlæst for ${selectedService}.`)
    } catch (error) {
      setDataverseError(error instanceof Error ? error.message : 'Ukendt Dataverse-fejl')
    } finally {
      setIsLoadingDataverse(false)
    }
  }

  const selectCommentForEditing = (record: CommentRecord) => {
    setEditingRecord({ ...record, isEditing: true })
    setSummary(record.summary)
  }

  const saveComment = async (status: number) => {
    if (!editingRecord || !accessToken) return

    setIsLoadingDataverse(true)
    setDataverseError('')
    setMessage('')

    const cleanId = editingRecord.id.replace(/[{}]/g, '')
    const url = `${dataverseBaseUrl.replace(/\/$/, '')}/api/data/v9.1/${entityPluralName}(${cleanId})`
    const updatedComment = buildAiCommentFromSummary(summary)

    // Bestem hvilket felt skal gemmes baseret på status
    const updatePayload: any = {
      srv_status: status,
    }

    if (status === 923910001) {
      // Til redigering senere - gem i "srv_redigeretkommentar"
      updatePayload.srv_redigeretkommentar = updatedComment
    } else if (status === 923910002) {
      // Godkendt - gem i "srv_endeligkommentar" og sæt godkendt tidspunkt + godkendt af
      updatePayload.srv_endeligkommentar = updatedComment
      updatePayload.srv_godkendttidspunkt = new Date().toISOString()
      // Sæt godkendt af til nuværende bruger (kan være hardcoded eller hentes fra token)
      updatePayload.srv_godkendtaf = 'Produktansvarlig'
    }

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
        body: JSON.stringify(updatePayload),
      })

      if (!response.ok && response.status !== 204) {
        const body = await response.text()
        throw new Error(`Dataverse gem mislykkedes: ${response.status} ${response.statusText} - ${body}`)
      }

      // Opdater lokal state
      setComments(prev => prev.map(c =>
        c.id === editingRecord.id
          ? { 
              ...c, 
              summary, 
              srv_status: status, 
              status: status === 923910001 ? 'Til redigering' : status === 923910002 ? 'Godkendt' : c.status,
              aiComment: updatedComment
            }
          : c
      ))

      // Hvis godkendt, luk redigeringen og vis låst version
      if (status === 923910002) {
        setEditingRecord(null)
        setMessage(`✅ Kommentar godkendt og låst for redigering!\nGodkendt tidspunkt: ${new Date().toLocaleString('da-DK')}\nData gemt i "srv_endeligkommentar"`)
      } else {
        setEditingRecord(null)
        setMessage(`💾 Kommentar gemt til senere redigering i "srv_redigeretkommentar"`)
      }
    } catch (error) {
      setDataverseError(error instanceof Error ? error.message : 'Ukendt Dataverse-fejl')
    } finally {
      setIsLoadingDataverse(false)
    }
  }

  return (
    <div className="app-container">
      <header>
        <h1>SLA Kommentar Manager</h1>
        <p>Hent kommentarer fra Dataverse for en måned, vælg ydelse, rediger kommentarer og gem som kladde eller godkendt.</p>
      </header>

      <section className="panel">
        <h2>0. Dataverse konfiguration</h2>
        <div className="grid">
          <div>
            <label>Dataverse base URL</label>
            <p className="readonly-value">{dataverseBaseUrl}</p>
          </div>
          <div>
            <label>Entitetsnavn</label>
            <p className="readonly-value">{entityPluralName}</p>
          </div>
          <div>
            <label>Måned (YYYY-MM)</label>
            <input
              type="text"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              placeholder="2026-03"
            />
          </div>
        </div>

        <div className="summary-actions">
          <button onClick={loadServicesForMonth} disabled={isLoadingDataverse}>1. Hent ydelser for måned</button>
        </div>
        <div className="summary-block">
          <label>Access token</label>
          <textarea
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Indsæt Bearer token til Dataverse her"
          />
        </div>
        {dataverseError && <div className="alert alert-error">{dataverseError}</div>}
      </section>

      {availableServices.length > 0 && !editingRecord && (
        <section className="panel">
          <h2>1. Vælg ydelse for {selectedMonth}</h2>
          <div className="grid">
            <div>
              <label>Ydelse</label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
              >
                <option value="">-- Vælg en ydelse --</option>
                {availableServices.map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="summary-actions">
            <button onClick={loadCommentsForSelectedService} disabled={isLoadingDataverse || !selectedService}>2. Hent kommentarer for ydelse</button>
          </div>
        </section>
      )}

      {comments.length > 0 && !editingRecord && (
        <section className="panel">
          <h2>2. Kommentarer for {selectedService}</h2>
          <div className="comments-list">
            {comments.map(comment => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <strong>{comment.serviceName}</strong>
                  <span className={`status ${comment.status?.toLowerCase().replace(' ', '-')}`}>{comment.status}</span>
                </div>
                <p>Request ID: {comment.requestId}</p>
                <p>Genereret: {comment.generatedAt}</p>
                <button onClick={() => selectCommentForEditing(comment)}>Rediger</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {editingRecord && (
        <section className="panel">
          <h2>3. Rediger kommentar for {editingRecord.serviceName}</h2>
          <div className="grid">
            <div>
              <strong>Request ID</strong>
              <p>{editingRecord.requestId}</p>
            </div>
            <div>
              <strong>Måned</strong>
              <p>{editingRecord.month}</p>
            </div>
            <div>
              <strong>Status</strong>
              <p>{editingRecord.status}</p>
            </div>
          </div>

          <div className="summary-block">
            <label>Beskrivelse af nedbrud/SLA-brud</label>
            <textarea
              value={summary.descriptionSection}
              onChange={(e) => setSummary({ ...summary, descriptionSection: e.target.value })}
            />
          </div>
          <div className="summary-block">
            <label>Kundepåvirkning</label>
            <textarea
              value={summary.impactSection}
              onChange={(e) => setSummary({ ...summary, impactSection: e.target.value })}
            />
          </div>
          <div className="summary-block">
            <label>Opfølgning</label>
            <textarea
              value={summary.followUpSection}
              onChange={(e) => setSummary({ ...summary, followUpSection: e.target.value })}
            />
          </div>
          <div className="summary-block">
            <label>Handlingsplan</label>
            <textarea
              value={summary.actionPlanSection}
              onChange={(e) => setSummary({ ...summary, actionPlanSection: e.target.value })}
            />
          </div>

          <div className="summary-actions">
            <button onClick={() => saveComment(923910001)} disabled={isLoadingDataverse}>💾 Gem til redigering senere</button>
            <button className="save-button" onClick={() => saveComment(923910002)} disabled={isLoadingDataverse}>✅ Gem som godkendt</button>
            <button onClick={() => setEditingRecord(null)}>❌ Annuller</button>
          </div>
        </section>
      )}

      {message && <div className="alert alert-success">{message}</div>}
    </div>
  )
}

export default App
