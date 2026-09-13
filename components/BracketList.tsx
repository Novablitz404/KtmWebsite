'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { Category, Match, PoomsaeMatch } from '@prisma/client'
import BracketView from './BracketView'
import PoomsaeBracketView from './PoomsaeBracketView'
import type { ExtendedPoomsaeMatch } from './PoomsaeBracketView'
import { adaptPoomsaeMatchesToBracket, adaptPoomsaePreviewToBracket } from '@/lib/poomsae-bracket-adapter'
import PreviewBracketTree from './bracket/PreviewBracketTree'
import PoomsaePreviewGrid from './bracket/PoomsaePreviewGrid'
import {
    isHeightBased, getCompetitorCount, getMedalMultiplier, type PreviewMatch,
    previewSpecsToPdfMatches, poomsaePreviewToPdfMatches
} from '@/lib/bracket-preview-helpers'
import {
    generateAllBrackets, getTournamentAlerts, initiateSmartProposal, forceExecuteSmartAction,
    bulkUpdateCourts, previewCategoryBracket, reshuffleCategoryPreview, movePlayerToCategory,
    updateCategoryDaySettings, generateBracketsForCategory, simulateMatchSequence, previewDayMatchSchedule, getPlayerClubMap,
    declareKyorugiWinner, declarePoomsaeWinner
} from '@/app/actions'
import {
    Trophy, Medal, Wand2, Loader2, AlertCircle, Search,
    ShieldAlert, Split, Merge, Users, X, ChevronDown, Zap, ArrowRight, Clock, ChevronRight, Eye, Calendar,
    Download, MapPin, FileStack, Shuffle, ArrowRightLeft, Shield, CheckSquare, Layers, List
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import DaySchedulePDF from '@/components/pdf/DaySchedulePDF'
import type { DayScheduleMatch } from '@/components/pdf/DaySchedulePDF'
import BracketPDF from '@/components/pdf/BracketPDF'
import PoomsaeBracketPDF from '@/components/pdf/PoomsaeBracketPDF'
import AllCategoriesMatchListPDF from '@/components/pdf/AllCategoriesMatchListPDF'
import type { CategoryMatchGroup } from '@/components/pdf/AllCategoriesMatchListPDF'

const PDFDownloadLink = dynamic(
    () => import('@react-pdf/renderer').then(mod => ({ default: mod.PDFDownloadLink })),
    { ssr: false }
)

type SimulatedMatchMap = Record<string, Record<number, { globalId: number; day: number }>>

interface BracketListProps {
    categories: (Category & { matches: Match[], poomsaeMatches?: (PoomsaeMatch & { player: { name: string; club?: { name: string } | null } })[], _count?: { players: number } })[]
    tournamentName?: string
    publicView?: boolean
}

export default function BracketList({ categories, tournamentName, publicView = false }: BracketListProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'kyorugi' | 'poomsae' | 'kyukpa'>('kyorugi')
    const [isPending, startTransition] = useTransition()
    const [searchQuery, setSearchQuery] = useState('')
    const [alertFilter, setAlertFilter] = useState<'all' | 'uncontested' | 'merge' | 'split' | 'cross_division'>('all')
    const [dayFilter, setDayFilter] = useState<0|1|2|3>(0)
    const [courtPanelOpen, setCourtPanelOpen] = useState(true)
    const [bracketPdfPanelOpen, setBracketPdfPanelOpen] = useState(false)
    const [previewBracketPdfPanelOpen, setPreviewBracketPdfPanelOpen] = useState(false)
    const [downloadingBracketTreesDay, setDownloadingBracketTreesDay] = useState<number | null>(null)
    const [downloadingMatchListDay, setDownloadingMatchListDay] = useState<number | null>(null)
    const [downloadingByCategoryDay, setDownloadingByCategoryDay] = useState<number | null>(null)
    const [downloadingPreviewBracketTreesDay, setDownloadingPreviewBracketTreesDay] = useState<number | null>(null)
    const [downloadingPreviewMatchListDay, setDownloadingPreviewMatchListDay] = useState<number | null>(null)
    const [downloadingPreviewByCategoryDay, setDownloadingPreviewByCategoryDay] = useState<number | null>(null)

    // ── Division / skill filters ──────────────────────────────────────────────
    const [divisionFilter, setDivisionFilter] = useState<string>('All')
    const [skillFilter, setSkillFilter] = useState<string>('All')

    // ── Bulk selection (Day/Defer apply across many categories at once) ───────
    const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())
    const [bulkApplying, setBulkApplying] = useState(false)
    const [bulkDay, setBulkDay] = useState<string>('')
    const [bulkDefer, setBulkDefer] = useState<string>('')

    // ── Simulate Match Sequence (global numbering preview, no commit) ─────────
    const [globalMatchIds, setGlobalMatchIds] = useState<SimulatedMatchMap | null>(null)
    const [simulatingSequence, setSimulatingSequence] = useState(false)

    // ── Alerts-pending banner — dismissible; reappears if the alert count changes ──
    const [dismissedAlertsCount, setDismissedAlertsCount] = useState<number | null>(null)

    // ── Manual edits currently open in a category's preview (not yet committed) —
    // reported up by each CollapsibleBracket, carried into "Generate All" so it
    // doesn't just fall back to the last persisted seed order. ─────────────────
    const [dirtyEditsByCategory, setDirtyEditsByCategory] = useState<Record<string, PreviewMatch[]>>({})
    const handleEditedSpecsChanged = (categoryId: string, specs: PreviewMatch[] | null) => {
        setDirtyEditsByCategory(prev => {
            if (!specs) {
                if (!(categoryId in prev)) return prev
                const next = { ...prev }
                delete next[categoryId]
                return next
            }
            return { ...prev, [categoryId]: specs }
        })
    }

    useEffect(() => {
        setDivisionFilter('All')
        setSkillFilter('All')
        setBulkSelected(new Set())
        setGlobalMatchIds(null)
        setDirtyEditsByCategory({})
    }, [activeTab])

    const tournamentId = categories[0]?.tournamentId

    const queryClient = useQueryClient()
    const { data: alertData } = useQuery({
        queryKey: ['tournament-smart-alerts', tournamentId],
        queryFn: () => getTournamentAlerts(tournamentId),
        enabled: !!tournamentId && !publicView,
        staleTime: 1000 * 30
    })

    const alerts = alertData?.alerts || []
    const proposals = alertData?.proposals || []

    const alertsByCategory = new Map<string, any[]>()
    for (const alert of alerts) {
        const existing = alertsByCategory.get(alert.categoryId) || []
        existing.push(alert)
        alertsByCategory.set(alert.categoryId, existing)
    }

    if (categories.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Trophy size={24} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No categories yet</p>
                <p className="text-xs text-gray-400 mt-1">Add categories to generate matches.</p>
            </div>
        )
    }

    const kyorugiCategories = categories.filter(c => c.type === 'KYORUGI' || !c.type)
    const poomsaeCategories = categories.filter(c => c.type === 'POOMSAE')
    const kyukpaCategories  = categories.filter(c => c.type === 'KYUKPA')

    const displayedCategories = activeTab === 'kyorugi' ? kyorugiCategories
        : activeTab === 'poomsae' ? poomsaeCategories : kyukpaCategories

    const q = searchQuery.toLowerCase().trim()
    let filteredCategories = q
        ? displayedCategories.filter(c => c.name.toLowerCase().includes(q))
        : displayedCategories

    if (alertFilter !== 'all') {
        const targetType = alertFilter === 'uncontested' ? 'UNCONTESTED'
            : alertFilter === 'merge'          ? 'MERGE_SUGGESTION'
            : alertFilter === 'split'          ? 'SPLIT_SUGGESTION'
            : 'CROSS_DIVISION'
        filteredCategories = filteredCategories.filter(c => {
            const catAlerts = alertsByCategory.get(c.id)
            return catAlerts?.some(a => a.type === targetType)
        })
    }

    // Division = the leading words of a category name before the gender token,
    // e.g. "Cadet Female Intermediate Kyorugi - Feather" -> "Cadet"
    function divisionOf(name: string): string {
        const parts = name.split(' ')
        const genderIdx = parts.findIndex(p => ['Male', 'Female', 'Mixed'].includes(p))
        return genderIdx > 0 ? parts.slice(0, genderIdx).join(' ') : parts[0]
    }
    const divisions = ['All', ...Array.from(new Set(displayedCategories.map(c => divisionOf(c.name)))).sort()]
    const skillLevels = ['All', 'Novice', 'Intermediate', 'Advance']

    if (divisionFilter !== 'All') {
        filteredCategories = filteredCategories.filter(c => divisionOf(c.name) === divisionFilter)
    }
    if (skillFilter !== 'All' && activeTab === 'kyorugi') {
        filteredCategories = filteredCategories.filter(c => (c.skillLevel || 'Novice').toLowerCase() === skillFilter.toLowerCase())
    }

    // Medal tally — how many of each medal this discipline's (filtered) categories
    // will award. PAIR/TEAM categories award multiple medals per placement. A
    // KYORUGI category with just 1 competitor still awards Gold (auto-walkover —
    // see createUncontestedWalkoverMatch) — this used to require >= 2 back when a
    // 1-player category could never actually resolve a winner, but that's no
    // longer true, so it undercounted every uncontested category's projected gold.
    const medalEligible = filteredCategories.filter(c => getCompetitorCount(c._count?.players ?? 0, c.subtype) >= 1)
    const totalGold = medalEligible.reduce((sum, c) => sum + getMedalMultiplier(c.subtype), 0)
    const totalSilver = medalEligible
        .filter(c => getCompetitorCount(c._count?.players ?? 0, c.subtype) >= 2)
        .reduce((sum, c) => sum + getMedalMultiplier(c.subtype), 0)
    const totalBronze = medalEligible.reduce((sum, c) => {
        const cc = getCompetitorCount(c._count?.players ?? 0, c.subtype)
        const m = getMedalMultiplier(c.subtype)
        return sum + (cc > 3 ? 2 * m : cc === 3 ? 1 * m : 0)
    }, 0)

    const handleGenerateAll = () => {
        const alertWarning = totalAlerts > 0
            ? `\n\nNote: ${totalAlerts} pending alert${totalAlerts !== 1 ? 's' : ''} (uncontested/merge/split/cross-division) have not been resolved — generating now will lock in the current category groupings as-is.`
            : ''
        const dirtyCount = Object.keys(dirtyEditsByCategory).length
        const editsNote = dirtyCount > 0
            ? `\n\n${dirtyCount} ${dirtyCount !== 1 ? 'categories' : 'category'} still ${dirtyCount !== 1 ? 'have' : 'has'} an unsaved manual swap open in the preview — those will be carried into the generated bracket as-is.`
            : ''
        if (!confirm(`Regenerate ALL ${activeTab} matches? This will overwrite existing brackets.${alertWarning}${editsNote}`)) return
        startTransition(async () => {
            try {
                const targetType = activeTab === 'kyorugi' ? 'KYORUGI' : activeTab === 'poomsae' ? 'POOMSAE' : 'KYUKPA'
                const result = await generateAllBrackets(tournamentId, targetType, dirtyEditsByCategory)
                if (result?.success) {
                    toast.success(`Generated matches for ${result.count} categories!`)
                    setGlobalMatchIds(null)
                    setDirtyEditsByCategory({})
                }
                else toast.error(result?.message || 'Failed to generate matches.')
            } catch {
                toast.error('An error occurred while generating matches.')
            }
        })
    }

    async function handleBulkApply() {
        if (!bulkSelected.size || (!bulkDay && !bulkDefer)) return
        setBulkApplying(true)
        try {
            let deferFinals = true
            let deferFinalsToDay: number | null = null
            let deferSemisToDay: number | null = null
            if (bulkDefer === 'seq') deferFinals = false
            else if (bulkDefer === 'end') deferFinals = true
            else if (bulkDefer === 'finals-d2') { deferFinals = true; deferFinalsToDay = 2 }
            else if (bulkDefer === 'finals-d3') { deferFinals = true; deferFinalsToDay = 3 }
            else if (bulkDefer === 'semis-d2') { deferFinals = true; deferSemisToDay = 2 }
            else if (bulkDefer === 'semis-d3') { deferFinals = true; deferSemisToDay = 3 }

            await Promise.all(Array.from(bulkSelected).map(catId => {
                const cat = displayedCategories.find(c => c.id === catId)
                const day = bulkDay ? parseInt(bulkDay) : (cat?.scheduleDay ?? null)
                const df  = bulkDefer ? deferFinals      : (cat?.deferFinals      ?? true)
                const dfd = bulkDefer ? deferFinalsToDay : (cat?.deferFinalsToDay ?? null)
                const dsd = bulkDefer ? deferSemisToDay  : ((cat as any)?.deferSemisToDay ?? null)
                return updateCategoryDaySettings(catId, day, df, dfd, dsd)
            }))

            toast.success(`Applied to ${bulkSelected.size} ${bulkSelected.size === 1 ? 'category' : 'categories'}`)
            setBulkSelected(new Set())
            setBulkDay('')
            setBulkDefer('')
            router.refresh()
        } catch {
            toast.error('Bulk apply failed')
        } finally {
            setBulkApplying(false)
        }
    }

    async function handleSimulateSequence() {
        setSimulatingSequence(true)
        try {
            const targetType = activeTab === 'kyorugi' ? 'KYORUGI' : activeTab === 'poomsae' ? 'POOMSAE' : 'KYUKPA'
            const res = await simulateMatchSequence(tournamentId, targetType, {})
            if (res.success && res.mapping) {
                setGlobalMatchIds(res.mapping)
                toast.success('Match numbers simulated')
            } else {
                toast.error(res.message || 'Simulation failed')
            }
        } catch {
            toast.error('Simulation failed')
        } finally {
            setSimulatingSequence(false)
        }
    }

    // Already decided as WALKOVER (pending Generate) no longer counts as a
    // "pending" alert — it has a resolution, it's just waiting on the organiser
    // to click Generate rather than needing another decision. Without this, the
    // top "Alerts Pending" banner and its "Uncontested" count would never clear
    // even after choosing Walkover, since detectSmartAlerts still emits the
    // alert (relabeled) until the category is actually generated.
    const uncontestedCount  = alerts.filter(a => a.type === 'UNCONTESTED' && a.details?.resolution !== 'WALKOVER').length
    const mergeCount         = alerts.filter(a => a.type === 'MERGE_SUGGESTION').length
    const splitCount         = alerts.filter(a => a.type === 'SPLIT_SUGGESTION').length
    const crossDivCount      = alerts.filter(a => a.type === 'CROSS_DIVISION' && a.details?.resolution !== 'WALKOVER').length
    const totalAlerts        = uncontestedCount + mergeCount + splitCount + crossDivCount


    // Discipline tab config
    const discTabs = [
        { id: 'kyorugi', label: 'Kyorugi', icon: Trophy, count: kyorugiCategories.length },
        { id: 'poomsae', label: 'Poomsae', icon: Medal,  count: poomsaeCategories.length },
        { id: 'kyukpa',  label: 'Kyukpa',  icon: Wand2,  count: kyukpaCategories.length  },
    ]

    // Multi-day: find the highest day used across the visible categories
    const maxScheduleDay = displayedCategories.reduce((max, c) => {
        const d = Math.max(c.scheduleDay ?? 1, c.deferFinalsToDay ?? 1)
        return d > max ? d : max
    }, 1)
    const dayTabs = [0, 1, 2, 3].filter(d => d === 0 || d <= maxScheduleDay) as (0|1|2|3)[]

    // Build flat schedule list (running order, sorted by matchId) for an arbitrary
    // day — factored out so it can be reused both for the currently-selected
    // dayFilter tab and for the bulk per-day PDF download below, which needs it
    // for whichever day button was clicked regardless of what's on screen.
    function buildDayScheduleRows(day: number) {
        const rows: { matchId: number|null; categoryName: string; categoryId: string; round: number; court: string; isFinal: boolean; scheduledDay: number|null; player1Name: string; player2Name: string }[] = []
        const isPoomsaeCat = activeTab === 'poomsae' || activeTab === 'kyukpa'
        for (const cat of displayedCategories) {
            if (isPoomsaeCat) {
                // Group poomsae performances by matchId (multiple performers share one matchId)
                const grouped = new Map<number, { names: string[]; round: number; court: string; scheduledDay: number | null }>()
                for (const m of (cat.poomsaeMatches || [])) {
                    if ((m as any).scheduledDay === day) {
                        const mid = (m as any).matchId as number
                        if (!grouped.has(mid)) {
                            grouped.set(mid, {
                                names: [],
                                round: (m as any).round,
                                court: (m as any).court || 'Unassigned',
                                scheduledDay: (m as any).scheduledDay,
                            })
                        }
                        const name = (m as any).player?.name || (m as any).displayName || ''
                        if (name) grouped.get(mid)!.names.push(name)
                    }
                }
                for (const [mid, g] of grouped) {
                    rows.push({
                        matchId: mid,
                        categoryName: cat.name,
                        categoryId: cat.id,
                        round: g.round,
                        court: g.court,
                        isFinal: g.round === 3,
                        scheduledDay: g.scheduledDay,
                        player1Name: g.names.join(', '),
                        player2Name: '',
                    })
                }
            } else {
                for (const m of cat.matches) {
                    if ((m as any).scheduledDay === day) {
                        const maxRound = Math.max(...cat.matches.map(x => x.round))
                        rows.push({
                            matchId: (m as any).matchId,
                            categoryName: cat.name,
                            categoryId: cat.id,
                            round: m.round,
                            court: (m as any).court || 'Unassigned',
                            isFinal: m.round === maxRound,
                            scheduledDay: (m as any).scheduledDay,
                            player1Name: m.player1 === 'BYE' ? 'BYE' : m.player1 || '',
                            player2Name: m.player2 === 'BYE' ? 'BYE' : m.player2 || '',
                        })
                    }
                }
            }
        }
        rows.sort((a, b) => (a.matchId ?? 0) - (b.matchId ?? 0))
        return rows
    }
    const dayScheduleRows = dayFilter > 0 ? buildDayScheduleRows(dayFilter) : []

    // Court editing state
    const [courtEdits, setCourtEdits] = useState<Record<string, string>>({})
    const [savingCourts, setSavingCourts] = useState(false)

    // Unique categories in the current day view for court assignment
    const dayCategoryIds = useMemo(() => {
        const ids = new Set<string>()
        for (const r of dayScheduleRows) ids.add(r.categoryId)
        return Array.from(ids)
    }, [dayScheduleRows])

    const dayCategoriesWithCourt = useMemo(() => {
        const map = new Map<string, { name: string; court: string }>()
        for (const r of dayScheduleRows) {
            if (!map.has(r.categoryId)) {
                map.set(r.categoryId, { name: r.categoryName, court: r.court })
            }
        }
        return Array.from(map.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name))
    }, [dayScheduleRows])

    async function handleSaveCourts() {
        const updates = Object.entries(courtEdits)
            .filter(([catId, court]) => {
                const existing = dayCategoriesWithCourt.find(([id]) => id === catId)
                return existing && existing[1].court !== court
            })
            .map(([categoryId, court]) => ({ categoryId, court }))

        if (updates.length === 0) { toast.info('No court changes to save'); return }
        setSavingCourts(true)
        try {
            const r = await bulkUpdateCourts(updates, tournamentId)
            if (r.success) {
                toast.success(`Updated courts for ${updates.length} categor${updates.length === 1 ? 'y' : 'ies'}`)
                setCourtEdits({})
            } else {
                toast.error(r.message || 'Failed to update courts')
            }
        } catch { toast.error('Failed to update courts') }
        finally { setSavingCourts(false) }
    }

    // Build round label helper
    function roundLabel(round: number, isFinal: boolean): string {
        if (isFinal) return 'Final'
        if (round === 1) return 'Round 1'
        return `Round ${round}`
    }

    // Regroups a flat day's match rows (already sorted by matchId) by category —
    // used to build the single-file "Match List By Category" PDF that rides
    // alongside the flat, match-number-sorted one in both the real and preview
    // per-day bulk downloads.
    function groupRowsByCategory(rows: { matchId: number | null; categoryName: string; round: number; isFinal: boolean; court: string; player1Name: string; player2Name: string; scheduledDay?: number | null }[]): CategoryMatchGroup[] {
        const map = new Map<string, typeof rows>()
        for (const r of rows) {
            if (!map.has(r.categoryName)) map.set(r.categoryName, [])
            map.get(r.categoryName)!.push(r)
        }
        const groups: CategoryMatchGroup[] = []
        for (const [categoryName, catRows] of map) {
            groups.push({
                categoryName,
                matches: catRows.map(r => ({
                    matchId: r.matchId,
                    round: r.round,
                    roundLabel: roundLabel(r.round, r.isFinal),
                    isFinal: r.isFinal,
                    court: r.court,
                    day: r.scheduledDay ?? null,
                    player1Name: r.player1Name,
                    player2Name: r.player2Name,
                })),
            })
        }
        return groups
    }

    // Saves a blob either into the picked directory (dirHandle) or via a
    // triggered browser download — the same two-path pattern used throughout
    // the per-day bulk download flows below, factored out to avoid repeating it.
    async function savePdfBlob(blob: Blob, fileName: string, dirHandle: FileSystemDirectoryHandle | null) {
        if (dirHandle) {
            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
            const writable = await fileHandle.createWritable()
            await writable.write(blob)
            await writable.close()
        } else {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = fileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            setTimeout(() => URL.revokeObjectURL(url), 2000)
        }
    }

    // Requests a destination folder via the File System Access API, when
    // available — used only by the multi-file "Bracket Trees" downloads below;
    // the single-file Match List / By Category downloads don't need it.
    async function pickDirectoryOrNull(): Promise<{ dirHandle: FileSystemDirectoryHandle | null; cancelled: boolean }> {
        if (!('showDirectoryPicker' in window)) return { dirHandle: null, cancelled: false }
        try {
            const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
            return { dirHandle, cancelled: false }
        } catch (err: any) {
            if (err?.name === 'AbortError') return { dirHandle: null, cancelled: true }
            return { dirHandle: null, cancelled: false }
        }
    }

    // ── Bracket Trees only (already generated) ───────────────────────────────
    async function downloadBracketTreesForDay(day: number) {
        const { pdf } = await import('@react-pdf/renderer')
        const isPoomsaeCat = activeTab === 'poomsae' || activeTab === 'kyukpa'

        const catsForDay = displayedCategories.filter(cat => {
            if (isPoomsaeCat) {
                return (cat.poomsaeMatches || []).some(m => (m as any).scheduledDay === day)
            }
            return cat.matches.some(m => (m as any).scheduledDay === day)
        })

        if (catsForDay.length === 0) {
            toast.info(`No categories with matches on Day ${day}`)
            return
        }

        const { dirHandle, cancelled } = await pickDirectoryOrNull()
        if (cancelled) return

        setDownloadingBracketTreesDay(day)
        toast.info(`Generating ${catsForDay.length} bracket PDF${catsForDay.length !== 1 ? 's' : ''} for Day ${day}…`)

        let successCount = 0
        for (const cat of catsForDay) {
            try {
                let blob: Blob
                if (isPoomsaeCat) {
                    const dayMatches = (cat.poomsaeMatches || []).filter(
                        m => (m as any).scheduledDay === day
                    ) as unknown as ExtendedPoomsaeMatch[]
                    blob = await pdf(
                        <PoomsaeBracketPDF
                            tournamentName={tournamentName || 'Tournament'}
                            categoryName={cat.name}
                            matches={dayMatches}
                            isHeadToHead={cat.poomsaeFormat === 'HEAD_TO_HEAD'}
                        />
                    ).toBlob()
                } else {
                    const playerClubMap = await getPlayerClubMap(cat.id)
                    blob = await pdf(
                        <BracketPDF
                            tournamentName={tournamentName || 'Tournament'}
                            categoryName={cat.name}
                            matches={cat.matches}
                            playerClubMap={playerClubMap}
                        />
                    ).toBlob()
                }

                const safeName = cat.name.replace(/\s+/g, '-').replace(/[^\w-]/g, '')
                const fileName = `Day${day}-${safeName}-bracket.pdf`
                await savePdfBlob(blob, fileName, dirHandle)
                if (!dirHandle) await new Promise(r => setTimeout(r, 400)) // avoid browser throttling multiple downloads

                successCount++
            } catch (err) {
                console.error('Failed to generate bracket PDF for', cat.name, err)
                toast.error(`Failed: ${cat.name}`)
            }
        }

        setDownloadingBracketTreesDay(null)
        if (successCount > 0) {
            toast.success(`${dirHandle ? 'Saved' : 'Downloaded'} ${successCount} bracket PDF${successCount !== 1 ? 's' : ''} for Day ${day}`)
        }
    }

    // ── Match List only — flat, sorted by match number (already generated) ───
    async function downloadDayMatchListPDF(day: number) {
        const { pdf } = await import('@react-pdf/renderer')
        const isPoomsaeCat = activeTab === 'poomsae' || activeTab === 'kyukpa'

        const rows = buildDayScheduleRows(day)
        if (rows.length === 0) {
            toast.info(`No matches scheduled on Day ${day}`)
            return
        }

        setDownloadingMatchListDay(day)
        try {
            const listMatches: DayScheduleMatch[] = rows.map(r => ({
                matchId: r.matchId,
                categoryName: r.categoryName,
                round: r.round,
                roundLabel: roundLabel(r.round, r.isFinal),
                isFinal: r.isFinal,
                court: r.court,
                player1Name: r.player1Name,
                player2Name: r.player2Name,
                isPoomsae: isPoomsaeCat,
            }))
            const listBlob = await pdf(
                <DaySchedulePDF
                    tournamentName={tournamentName || 'Tournament'}
                    day={day}
                    matches={listMatches}
                    isPoomsae={isPoomsaeCat}
                />
            ).toBlob()
            await savePdfBlob(listBlob, `Day${day}-Match-List.pdf`, null)
            toast.success('Downloaded match list PDF')
        } catch (err) {
            console.error('Failed to generate match list PDF for day', day, err)
            toast.error('Failed to generate the match list PDF')
        } finally {
            setDownloadingMatchListDay(null)
        }
    }

    // ── Match List By Category only — grouped, one PDF (already generated) ───
    async function downloadDayMatchListByCategoryPDF(day: number) {
        const { pdf } = await import('@react-pdf/renderer')
        const isPoomsaeCat = activeTab === 'poomsae' || activeTab === 'kyukpa'

        const rows = buildDayScheduleRows(day)
        if (rows.length === 0) {
            toast.info(`No matches scheduled on Day ${day}`)
            return
        }

        setDownloadingByCategoryDay(day)
        try {
            const catGroups = groupRowsByCategory(rows)
            const disciplineLabel = activeTab === 'kyorugi' ? 'Kyorugi' : activeTab === 'poomsae' ? 'Poomsae' : 'Kyukpa'
            const catListBlob = await pdf(
                <AllCategoriesMatchListPDF
                    tournamentName={tournamentName || 'Tournament'}
                    groups={catGroups}
                    isPoomsae={isPoomsaeCat}
                    disciplineLabel={disciplineLabel}
                />
            ).toBlob()
            await savePdfBlob(catListBlob, `Day${day}-Match-List-By-Category.pdf`, null)
            toast.success('Downloaded match list by category PDF')
        } catch (err) {
            console.error('Failed to generate match list by category PDF for day', day, err)
            toast.error('Failed to generate the match list PDF')
        } finally {
            setDownloadingByCategoryDay(null)
        }
    }

    // ── Bracket Trees only (PREVIEW — not yet generated) ─────────────────────
    // Built from previewCategoryBracket's in-memory draw instead of persisted
    // Match/PoomsaeMatch rows — lets an organiser send a draft to clubs for
    // verification before committing to "Generate". Calling
    // previewCategoryBracket here also persists a seedOrder for any category
    // that doesn't have one yet, so what's in the PDF is exactly what
    // "Generate This Category" will produce later, not a different draw.
    async function downloadPreviewBracketTreesForDay(day: number) {
        const { pdf } = await import('@react-pdf/renderer')
        const isPoomsaeCat = activeTab === 'poomsae' || activeTab === 'kyukpa'

        const catsForDay = displayedCategories.filter(cat => {
            const matchCount = isPoomsaeCat ? (cat.poomsaeMatches || []).length : cat.matches.length
            if (matchCount > 0) return false // already generated — handled by the real panel instead
            return (cat.scheduleDay ?? 1) === day
        })

        if (catsForDay.length === 0) {
            toast.info(`No un-generated categories on Day ${day}`)
            return
        }

        const { dirHandle, cancelled } = await pickDirectoryOrNull()
        if (cancelled) return

        setDownloadingPreviewBracketTreesDay(day)
        toast.info(`Generating draft bracket PDFs for Day ${day}…`)

        let successCount = 0
        for (const cat of catsForDay) {
            try {
                const preview = await previewCategoryBracket(cat.id)
                if (!preview || preview.playerCount === 0) continue // nothing to draw

                let blob: Blob
                if (isPoomsaeCat) {
                    const pdfMatches = poomsaePreviewToPdfMatches(preview.poomsaeSpecs as any, preview.players)
                    blob = await pdf(
                        <PoomsaeBracketPDF
                            tournamentName={tournamentName || 'Tournament'}
                            categoryName={cat.name}
                            matches={pdfMatches}
                            isHeadToHead={cat.poomsaeFormat === 'HEAD_TO_HEAD'}
                            isPreview
                        />
                    ).toBlob()
                } else {
                    const pdfMatches = previewSpecsToPdfMatches(preview.specs as any, cat.name)
                    const playerClubMap = Object.fromEntries(
                        preview.players.filter(p => p.clubName).map(p => [p.name, p.clubName as string])
                    )
                    blob = await pdf(
                        <BracketPDF
                            tournamentName={tournamentName || 'Tournament'}
                            categoryName={cat.name}
                            matches={pdfMatches}
                            playerClubMap={playerClubMap}
                            isPreview
                        />
                    ).toBlob()
                }

                const safeName = cat.name.replace(/\s+/g, '-').replace(/[^\w-]/g, '')
                const fileName = `Day${day}-${safeName}-DRAFT-bracket.pdf`
                await savePdfBlob(blob, fileName, dirHandle)
                if (!dirHandle) await new Promise(r => setTimeout(r, 400))

                successCount++
            } catch (err) {
                console.error('Failed to generate preview bracket PDF for', cat.name, err)
                toast.error(`Failed: ${cat.name}`)
            }
        }

        setDownloadingPreviewBracketTreesDay(null)
        if (successCount > 0) {
            toast.success(`${dirHandle ? 'Saved' : 'Downloaded'} ${successCount} draft bracket PDF${successCount !== 1 ? 's' : ''} for Day ${day}`)
        } else {
            toast.info(`No categories with players on Day ${day}`)
        }
    }

    // ── Match List only — flat, sorted by match number (PREVIEW) ─────────────
    // Built from the exact same ordering buildOrderedKyorugiSpecs/
    // buildOrderedPoomsaeSpecs will use once generated, so these numbers aren't
    // just an approximation.
    async function downloadPreviewDayMatchListPDF(day: number) {
        const { pdf } = await import('@react-pdf/renderer')
        const isPoomsaeCat = activeTab === 'poomsae' || activeTab === 'kyukpa'

        setDownloadingPreviewMatchListDay(day)
        try {
            const targetType = activeTab === 'kyorugi' ? 'KYORUGI' : activeTab === 'poomsae' ? 'POOMSAE' : 'KYUKPA'
            const scheduleRows = await previewDayMatchSchedule(tournamentId, targetType, day)
            if (scheduleRows.length === 0) {
                toast.info(`No draft matches on Day ${day}`)
                return
            }
            const listMatches: DayScheduleMatch[] = scheduleRows.map(r => ({
                matchId: r.matchId,
                categoryName: r.categoryName,
                round: r.round,
                roundLabel: roundLabel(r.round, r.isFinal),
                isFinal: r.isFinal,
                court: r.court,
                player1Name: r.player1Name,
                player2Name: r.player2Name,
                isPoomsae: isPoomsaeCat,
            }))
            const listBlob = await pdf(
                <DaySchedulePDF
                    tournamentName={tournamentName || 'Tournament'}
                    day={day}
                    matches={listMatches}
                    isPoomsae={isPoomsaeCat}
                    isPreview
                />
            ).toBlob()
            await savePdfBlob(listBlob, `Day${day}-Match-List-DRAFT.pdf`, null)
            toast.success('Downloaded draft match list PDF')
        } catch (err) {
            console.error('Failed to generate preview match list PDF for day', day, err)
            toast.error('Failed to generate the draft match list PDF')
        } finally {
            setDownloadingPreviewMatchListDay(null)
        }
    }

    // ── Match List By Category only — grouped, one PDF (PREVIEW) ─────────────
    async function downloadPreviewDayMatchListByCategoryPDF(day: number) {
        const { pdf } = await import('@react-pdf/renderer')
        const isPoomsaeCat = activeTab === 'poomsae' || activeTab === 'kyukpa'

        setDownloadingPreviewByCategoryDay(day)
        try {
            const targetType = activeTab === 'kyorugi' ? 'KYORUGI' : activeTab === 'poomsae' ? 'POOMSAE' : 'KYUKPA'
            const scheduleRows = await previewDayMatchSchedule(tournamentId, targetType, day)
            if (scheduleRows.length === 0) {
                toast.info(`No draft matches on Day ${day}`)
                return
            }
            const catGroups = groupRowsByCategory(scheduleRows)
            const disciplineLabel = activeTab === 'kyorugi' ? 'Kyorugi' : activeTab === 'poomsae' ? 'Poomsae' : 'Kyukpa'
            const catListBlob = await pdf(
                <AllCategoriesMatchListPDF
                    tournamentName={tournamentName || 'Tournament'}
                    groups={catGroups}
                    isPoomsae={isPoomsaeCat}
                    disciplineLabel={disciplineLabel}
                    isPreview
                />
            ).toBlob()
            await savePdfBlob(catListBlob, `Day${day}-Match-List-By-Category-DRAFT.pdf`, null)
            toast.success('Downloaded draft match list by category PDF')
        } catch (err) {
            console.error('Failed to generate preview match list by category PDF for day', day, err)
            toast.error('Failed to generate the draft match list PDF')
        } finally {
            setDownloadingPreviewByCategoryDay(null)
        }
    }

    // Build PDF match data
    const dayPdfMatches: DayScheduleMatch[] = dayScheduleRows.map(r => ({
        matchId: r.matchId,
        categoryName: r.categoryName,
        round: r.round,
        roundLabel: roundLabel(r.round, r.isFinal),
        isFinal: r.isFinal,
        court: courtEdits[r.categoryId] ?? r.court,
        player1Name: r.player1Name,
        player2Name: r.player2Name,
    }))

    return (
        <>
        <div className="space-y-5">

            {/* ── Alert Strip ─────────────────────────────────────── */}
            {totalAlerts > 0 && !publicView && dismissedAlertsCount !== totalAlerts && (() => {
                return (
                    <div className="relative rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 pl-5 pr-10 py-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-amber-200/40 blur-2xl pointer-events-none" />

                        {/* Dismiss */}
                        <button
                            onClick={() => setDismissedAlertsCount(totalAlerts)}
                            title="Dismiss — reappears if the alert count changes"
                            className="absolute top-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-100 hover:text-amber-700 transition-colors"
                        >
                            <X size={13} />
                        </button>

                        {/* Row 1: label + filter pills */}
                        <div className="flex items-center gap-4 flex-wrap relative">
                            <div className="flex items-center gap-2.5 flex-shrink-0">
                                <div className="p-2 bg-amber-100 rounded-xl">
                                    <AlertCircle size={16} className="text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-amber-900 uppercase tracking-wide">
                                        {totalAlerts} Alert{totalAlerts !== 1 ? 's' : ''} Pending
                                    </p>
                                    <p className="text-[10px] text-amber-600 font-medium">
                                        Optional — you can generate brackets without resolving these
                                    </p>
                                </div>
                            </div>

                            <div className="h-5 w-px bg-amber-200 hidden sm:block" />

                            <div className="flex items-center gap-2 flex-wrap">
                                {uncontestedCount > 0 && (
                                    <button
                                        onClick={() => setAlertFilter(alertFilter === 'uncontested' ? 'all' : 'uncontested')}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
                                            alertFilter === 'uncontested'
                                                ? 'bg-yellow-400 text-yellow-900 border-yellow-400 shadow-sm scale-105'
                                                : 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
                                        }`}
                                    >
                                        <ShieldAlert size={10} />
                                        {uncontestedCount} Uncontested
                                    </button>
                                )}
                                {mergeCount > 0 && (
                                    <button
                                        onClick={() => setAlertFilter(alertFilter === 'merge' ? 'all' : 'merge')}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
                                            alertFilter === 'merge'
                                                ? 'bg-purple-500 text-white border-purple-500 shadow-sm scale-105'
                                                : 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200'
                                        }`}
                                    >
                                        <Merge size={10} />
                                        {mergeCount} Merge
                                    </button>
                                )}
                                {splitCount > 0 && (
                                    <button
                                        onClick={() => setAlertFilter(alertFilter === 'split' ? 'all' : 'split')}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
                                            alertFilter === 'split'
                                                ? 'bg-blue-500 text-white border-blue-500 shadow-sm scale-105'
                                                : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
                                        }`}
                                    >
                                        <Split size={10} />
                                        {splitCount} Split
                                    </button>
                                )}
                                {crossDivCount > 0 && (
                                    <button
                                        onClick={() => setAlertFilter(alertFilter === 'cross_division' ? 'all' : 'cross_division')}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
                                            alertFilter === 'cross_division'
                                                ? 'bg-orange-500 text-white border-orange-500 shadow-sm scale-105'
                                                : 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200'
                                        }`}
                                    >
                                        <ArrowRight size={10} />
                                        {crossDivCount} Cross Div
                                    </button>
                                )}
                                {alertFilter !== 'all' && (
                                    <button
                                        onClick={() => setAlertFilter('all')}
                                        className="text-amber-700 text-[11px] font-semibold hover:underline px-1"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* ── Toolbar Card ────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

                {/* Top row */}
                <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-100">
                    {/* Discipline tabs */}
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                        {discTabs.map(({ id, label, icon: Icon, count }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                    activeTab === id
                                        ? 'bg-white text-red-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                                }`}
                            >
                                <Icon size={14} />
                                {label}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    activeTab === id ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search + Generate */}
                    <div className="flex items-center gap-3">
                        {/* Medal tally — how many medals this discipline's (filtered) categories will award */}
                        {medalEligible.length > 0 && (
                            <span
                                title={`${medalEligible.length} medal-eligible ${medalEligible.length === 1 ? 'category' : 'categories'} in view`}
                                className="hidden md:inline-flex items-center gap-2 text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200"
                            >
                                <span className="text-amber-600">🥇{totalGold}</span>
                                <span className="text-gray-400">🥈{totalSilver}</span>
                                <span className="text-orange-700">🥉{totalBronze}</span>
                            </span>
                        )}

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                            <input
                                type="text"
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-8 pr-8 py-2 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl w-52 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {!publicView && (
                            <>
                                <div className="h-6 w-px bg-gray-200" />
                                {/* Simulate Match Sequence */}
                                <button
                                    onClick={handleSimulateSequence}
                                    disabled={simulatingSequence || displayedCategories.length === 0}
                                    title="Preview the global match numbering for this discipline, without generating anything"
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {simulatingSequence ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
                                    Simulate Sequence
                                </button>
                                {/* Generate All */}
                                <button
                                    onClick={handleGenerateAll}
                                    disabled={isPending || displayedCategories.length === 0}
                                    title={totalAlerts > 0 ? `${totalAlerts} alert(s) pending — you'll get a warning before generating` : undefined}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all
                                        bg-gradient-to-br from-red-600 to-red-700
                                        shadow-md shadow-red-500/20
                                        hover:shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5
                                        disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
                                >
                                    {isPending ? (
                                        <><Loader2 size={15} className="animate-spin" /> Generating...</>
                                    ) : (
                                        <><Zap size={15} /> Generate All</>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Day / Division / Skill filter row ──────────────── */}
                {(dayTabs.length > 1 || divisions.length > 2 || activeTab === 'kyorugi') && (
                    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 overflow-x-auto flex-nowrap">
                        {!publicView && dayTabs.length > 1 && (
                            <div className="flex items-center gap-1.5 flex-nowrap flex-shrink-0">
                                <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                                {dayTabs.map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setDayFilter(d)}
                                        className={`flex-shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                            dayFilter === d
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {d === 0 ? 'All Days' : `Day ${d}`}
                                    </button>
                                ))}
                                {dayFilter > 0 && (
                                    <span className="text-[10px] text-gray-400 ml-1">
                                        {dayScheduleRows.length} matches
                                    </span>
                                )}
                            </div>
                        )}
                        {!publicView && dayTabs.length > 1 && (divisions.length > 2 || activeTab === 'kyorugi') && (
                            <div className="h-4 w-px bg-gray-200 flex-shrink-0" />
                        )}
                        {divisions.length > 2 && (
                            <div className="flex items-center gap-1.5 flex-nowrap flex-shrink-0">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex-shrink-0">Division</span>
                                {divisions.map(div => (
                                    <button
                                        key={div}
                                        onClick={() => setDivisionFilter(div)}
                                        className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                            divisionFilter === div
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {div}
                                    </button>
                                ))}
                            </div>
                        )}
                        {divisions.length > 2 && activeTab === 'kyorugi' && (
                            <div className="h-4 w-px bg-gray-200 flex-shrink-0" />
                        )}
                        {activeTab === 'kyorugi' && (
                            <div className="flex items-center gap-1.5 flex-nowrap flex-shrink-0">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex-shrink-0">Skill</span>
                                {skillLevels.map(sk => (
                                    <button
                                        key={sk}
                                        onClick={() => setSkillFilter(sk)}
                                        className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                            skillFilter === sk
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {sk}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Bulk selection action bar ──────────────────────── */}
                {!publicView && bulkSelected.size > 0 && (
                    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-indigo-200 bg-indigo-50 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <Layers size={13} className="text-indigo-600" />
                            <span className="text-xs font-black text-indigo-700">{bulkSelected.size} selected</span>
                        </div>
                        <div className="w-px h-4 bg-indigo-200" />
                        <select
                            value={bulkDay}
                            onChange={e => setBulkDay(e.target.value)}
                            className="text-[11px] font-bold bg-white text-indigo-700 border border-indigo-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        >
                            <option value="">— Keep Day</option>
                            <option value="1">Day 1</option>
                            <option value="2">Day 2</option>
                            <option value="3">Day 3</option>
                        </select>
                        <select
                            value={bulkDefer}
                            onChange={e => setBulkDefer(e.target.value)}
                            className="text-[11px] font-bold bg-white text-amber-700 border border-amber-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
                        >
                            <option value="">— Keep Defer</option>
                            <option value="seq">Sequential</option>
                            <option value="end">End of Day</option>
                            <option value="finals-d2">Finals → Day 2</option>
                            <option value="finals-d3">Finals → Day 3</option>
                            <option value="semis-d2">Semis + Finals → Day 2</option>
                            <option value="semis-d3">Semis + Finals → Day 3</option>
                        </select>
                        <button
                            onClick={handleBulkApply}
                            disabled={bulkApplying || (!bulkDay && !bulkDefer)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-40"
                        >
                            {bulkApplying ? <Loader2 size={11} className="animate-spin" /> : <CheckSquare size={11} />}
                            Apply to {bulkSelected.size}
                        </button>
                        <button
                            onClick={() => setBulkSelected(new Set(filteredCategories.map(c => c.id)))}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            Select all {filteredCategories.length}
                        </button>
                        <button
                            onClick={() => { setBulkSelected(new Set()); setBulkDay(''); setBulkDefer('') }}
                            className="text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors ml-auto"
                        >
                            Clear
                        </button>
                    </div>
                )}

            </div>

            {/* ── All Days: Bulk Bracket PDF Download panel ──────────────── */}
            {!publicView && dayFilter === 0 && dayTabs.length > 1 && (() => {
                // Count categories per day for bracket downloads
                const availableDays = dayTabs.filter(x => x > 0)
                const isPoomsaeCat = activeTab === 'poomsae' || activeTab === 'kyukpa'
                const bracketCatsPerDay: Record<number, number> = {}
                for (const d of availableDays) {
                    bracketCatsPerDay[d] = displayedCategories.filter(cat =>
                        isPoomsaeCat
                            ? (cat.poomsaeMatches || []).some(m => (m as any).scheduledDay === d)
                            : cat.matches.some(m => (m as any).scheduledDay === d)
                    ).length
                }
                const daysWithCats = availableDays.filter(d => bracketCatsPerDay[d] > 0)
                if (daysWithCats.length === 0) return null
                return (
                    <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                        <button
                            className="w-full px-5 py-3.5 border-b border-violet-100 flex items-center justify-between hover:bg-violet-50/40 transition-colors"
                            onClick={() => setBracketPdfPanelOpen(o => !o)}
                        >
                            <div className="flex items-center gap-2">
                                <FileStack size={14} className="text-violet-500" />
                                <span className="text-sm font-black text-gray-800">Download Bracket PDFs</span>
                                <span className="text-xs text-gray-400 ml-1">— pick brackets, a match list, or a per-category match list, per day</span>
                            </div>
                            <ChevronDown
                                size={14}
                                className={`text-gray-400 transition-transform duration-200 ${bracketPdfPanelOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {bracketPdfPanelOpen && (
                            <div className="px-5 py-4 flex flex-wrap gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                {daysWithCats.map(d => (
                                    <div key={d} className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-violet-50/60 border border-violet-100">
                                        <span className="text-xs font-black text-violet-700 px-2 whitespace-nowrap">
                                            Day {d} <span className="font-semibold text-violet-400">({bracketCatsPerDay[d]})</span>
                                        </span>
                                        <button
                                            onClick={() => downloadBracketTreesForDay(d)}
                                            disabled={downloadingBracketTreesDay !== null}
                                            title="One bracket-tree PDF per category, saved to a folder of your choice"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all
                                                bg-gradient-to-br from-violet-500 to-purple-600
                                                shadow-sm shadow-violet-500/20
                                                hover:shadow-md hover:-translate-y-0.5
                                                disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
                                        >
                                            {downloadingBracketTreesDay === d
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : <FileStack size={12} />}
                                            Brackets
                                        </button>
                                        <button
                                            onClick={() => downloadDayMatchListPDF(d)}
                                            disabled={downloadingMatchListDay !== null}
                                            title="One PDF, flat list sorted by match number"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all
                                                bg-gradient-to-br from-indigo-500 to-indigo-600
                                                shadow-sm shadow-indigo-500/20
                                                hover:shadow-md hover:-translate-y-0.5
                                                disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
                                        >
                                            {downloadingMatchListDay === d
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : <Download size={12} />}
                                            Match List
                                        </button>
                                        <button
                                            onClick={() => downloadDayMatchListByCategoryPDF(d)}
                                            disabled={downloadingByCategoryDay !== null}
                                            title="One PDF, grouped under a header per category"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all
                                                bg-gradient-to-br from-teal-500 to-cyan-600
                                                shadow-sm shadow-teal-500/20
                                                hover:shadow-md hover:-translate-y-0.5
                                                disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
                                        >
                                            {downloadingByCategoryDay === d
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : <List size={12} />}
                                            By Category
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* ── All Days: Bulk PREVIEW Bracket PDF Download panel (not yet generated) ── */}
            {!publicView && dayFilter === 0 && dayTabs.length > 1 && (() => {
                const availableDays = dayTabs.filter(x => x > 0)
                const isPoomsaeCat = activeTab === 'poomsae' || activeTab === 'kyukpa'
                const previewCatsPerDay: Record<number, number> = {}
                for (const d of availableDays) {
                    previewCatsPerDay[d] = displayedCategories.filter(cat => {
                        const matchCount = isPoomsaeCat ? (cat.poomsaeMatches || []).length : cat.matches.length
                        return matchCount === 0 && (cat.scheduleDay ?? 1) === d
                    }).length
                }
                const daysWithPreviewCats = availableDays.filter(d => previewCatsPerDay[d] > 0)
                if (daysWithPreviewCats.length === 0) return null
                return (
                    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
                        <button
                            className="w-full px-5 py-3.5 border-b border-amber-100 flex items-center justify-between hover:bg-amber-50/40 transition-colors"
                            onClick={() => setPreviewBracketPdfPanelOpen(o => !o)}
                        >
                            <div className="flex items-center gap-2">
                                <FileStack size={14} className="text-amber-500" />
                                <span className="text-sm font-black text-gray-800">Download Bracket PDFs (Preview)</span>
                                <span className="text-xs text-gray-400 ml-1">— not yet generated, draft brackets/match lists per day — great for sending to clubs for verification before generating</span>
                            </div>
                            <ChevronDown
                                size={14}
                                className={`text-gray-400 transition-transform duration-200 ${previewBracketPdfPanelOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {previewBracketPdfPanelOpen && (
                            <div className="px-5 py-4 flex flex-wrap gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                {daysWithPreviewCats.map(d => (
                                    <div key={d} className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-amber-50/60 border border-amber-100">
                                        <span className="text-xs font-black text-amber-700 px-2 whitespace-nowrap">
                                            Day {d} <span className="font-semibold text-amber-400">({previewCatsPerDay[d]})</span>
                                        </span>
                                        <button
                                            onClick={() => downloadPreviewBracketTreesForDay(d)}
                                            disabled={downloadingPreviewBracketTreesDay !== null}
                                            title="One draft bracket-tree PDF per category, saved to a folder of your choice"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all
                                                bg-gradient-to-br from-amber-500 to-orange-600
                                                shadow-sm shadow-amber-500/20
                                                hover:shadow-md hover:-translate-y-0.5
                                                disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
                                        >
                                            {downloadingPreviewBracketTreesDay === d
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : <FileStack size={12} />}
                                            Brackets
                                        </button>
                                        <button
                                            onClick={() => downloadPreviewDayMatchListPDF(d)}
                                            disabled={downloadingPreviewMatchListDay !== null}
                                            title="One draft PDF, flat list sorted by match number"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all
                                                bg-gradient-to-br from-orange-500 to-red-500
                                                shadow-sm shadow-orange-500/20
                                                hover:shadow-md hover:-translate-y-0.5
                                                disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
                                        >
                                            {downloadingPreviewMatchListDay === d
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : <Download size={12} />}
                                            Match List
                                        </button>
                                        <button
                                            onClick={() => downloadPreviewDayMatchListByCategoryPDF(d)}
                                            disabled={downloadingPreviewByCategoryDay !== null}
                                            title="One draft PDF, grouped under a header per category"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all
                                                bg-gradient-to-br from-yellow-500 to-amber-600
                                                shadow-sm shadow-yellow-500/20
                                                hover:shadow-md hover:-translate-y-0.5
                                                disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
                                        >
                                            {downloadingPreviewByCategoryDay === d
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : <List size={12} />}
                                            By Category
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* ── Category List or Day Schedule View ──────────────── */}
            <div className="space-y-2">
                {dayFilter > 0 ? (
                    // ── Flat schedule list for selected day ──
                    dayScheduleRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 bg-white rounded-2xl border-2 border-dashed border-indigo-100 text-center">
                            <Calendar size={24} className="text-indigo-300 mb-3" />
                            <p className="text-sm font-semibold text-gray-500">No matches scheduled for Day {dayFilter}</p>
                            <p className="text-xs text-gray-400 mt-1">Generate brackets first, or adjust category day settings.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* ── Court Assignment Panel (collapsible) ─── */}
                            {!publicView && (
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <button
                                        className="w-full px-5 py-3.5 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50/60 transition-colors"
                                        onClick={() => setCourtPanelOpen(o => !o)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-orange-500" />
                                            <span className="text-sm font-black text-gray-800">Court Assignments</span>
                                            <span className="text-xs text-gray-400 ml-1">({dayCategoriesWithCourt.length} categories)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {Object.keys(courtEdits).length > 0 && courtPanelOpen && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleSaveCourts() }}
                                                    disabled={savingCourts}
                                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all
                                                        bg-gradient-to-br from-orange-500 to-orange-600
                                                        shadow-sm shadow-orange-500/20
                                                        hover:shadow-md hover:-translate-y-0.5
                                                        disabled:opacity-50 disabled:translate-y-0"
                                                >
                                                    {savingCourts ? <Loader2 size={11} className="animate-spin" /> : <MapPin size={11} />}
                                                    Save Courts
                                                </button>
                                            )}
                                            <ChevronDown
                                                size={14}
                                                className={`text-gray-400 transition-transform duration-200 ${courtPanelOpen ? 'rotate-180' : ''}`}
                                            />
                                        </div>
                                    </button>
                                    {courtPanelOpen && (
                                        <div className="px-5 py-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                                {dayCategoriesWithCourt.map(([catId, info]) => (
                                                    <div key={catId} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[11px] font-bold text-gray-800 truncate">{info.name}</p>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Court"
                                                            defaultValue={courtEdits[catId] ?? (info.court === 'Unassigned' ? '' : info.court)}
                                                            onChange={e => setCourtEdits(prev => ({ ...prev, [catId]: e.target.value }))}
                                                            className="w-16 text-center text-[11px] font-bold px-1.5 py-1 rounded-lg border border-orange-200 bg-white text-orange-700
                                                                focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all
                                                                placeholder:text-gray-300"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Day Match Table ─────────────────────── */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-indigo-500" />
                                        <span className="text-sm font-black text-gray-800">Day {dayFilter} — Match Schedule</span>
                                        <span className="text-xs text-gray-400 ml-1">({dayScheduleRows.length} matches)</span>
                                    </div>
                                    {/* Download buttons */}
                                    <div className="flex items-center gap-2">
                                        {/* Schedule PDF */}
                                        <PDFDownloadLink
                                            document={
                                                <DaySchedulePDF
                                                    tournamentName={tournamentName || 'Tournament'}
                                                    day={dayFilter}
                                                    matches={dayPdfMatches}
                                                    generatedAt={new Date().toLocaleString()}
                                                    isPoomsae={activeTab === 'poomsae' || activeTab === 'kyukpa'}
                                                />
                                            }
                                            fileName={`${(tournamentName || 'tournament').replace(/\s+/g, '-')}-day-${dayFilter}-${activeTab}-schedule.pdf`}
                                        >
                                            {({ loading: pdfLoading }: { loading: boolean }) => (
                                                <button
                                                    disabled={pdfLoading}
                                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all
                                                        bg-gradient-to-br from-indigo-500 to-indigo-600
                                                        shadow-sm shadow-indigo-500/20
                                                        hover:shadow-md hover:-translate-y-0.5
                                                        disabled:opacity-50 disabled:translate-y-0"
                                                >
                                                    {pdfLoading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                                                    {pdfLoading ? 'Preparing…' : 'Schedule PDF'}
                                                </button>
                                            )}
                                        </PDFDownloadLink>

                                        {/* Bracket PDFs (bulk per category) */}
                                        <button
                                            onClick={() => downloadBracketTreesForDay(dayFilter)}
                                            disabled={downloadingBracketTreesDay !== null}
                                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all
                                                bg-gradient-to-br from-violet-500 to-purple-600
                                                shadow-sm shadow-violet-500/20
                                                hover:shadow-md hover:-translate-y-0.5
                                                disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
                                        >
                                            {downloadingBracketTreesDay === dayFilter
                                                ? <Loader2 size={11} className="animate-spin" />
                                                : <FileStack size={11} />}
                                            {downloadingBracketTreesDay === dayFilter ? 'Downloading…' : 'Bracket PDFs'}
                                        </button>
                                        <button
                                            onClick={() => downloadDayMatchListByCategoryPDF(dayFilter)}
                                            disabled={downloadingByCategoryDay !== null}
                                            title="One PDF, grouped under a header per category"
                                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all
                                                bg-gradient-to-br from-teal-500 to-cyan-600
                                                shadow-sm shadow-teal-500/20
                                                hover:shadow-md hover:-translate-y-0.5
                                                disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
                                        >
                                            {downloadingByCategoryDay === dayFilter
                                                ? <Loader2 size={11} className="animate-spin" />
                                                : <List size={11} />}
                                            {downloadingByCategoryDay === dayFilter ? 'Downloading…' : 'By Category'}
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                {(activeTab === 'poomsae'
                                                    ? ['#','Category','Athlete / Team','Round','Court']
                                                    : ['#','Category','Player 1','','Player 2','Round','Court']
                                                ).map(h => (
                                                    <th key={h} className="px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dayScheduleRows.map((row, i) => (
                                                <tr key={i} className={`border-b border-gray-50 ${
                                                    row.isFinal ? 'bg-amber-50/60' : i % 2 === 0 ? '' : 'bg-gray-50/50'
                                                }`}>
                                                    <td className="px-4 py-2.5">
                                                        <span className="text-xs font-black text-indigo-600">#{row.matchId ?? '—'}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="text-xs font-semibold text-gray-800">{row.categoryName}</span>
                                                    </td>
                                                    {activeTab === 'poomsae' ? (
                                                        <td className="px-4 py-2.5">
                                                            <span className="text-xs text-gray-700">{row.player1Name || 'TBD'}</span>
                                                        </td>
                                                    ) : (
                                                        <>
                                                            <td className="px-4 py-2.5">
                                                                <span className="text-xs text-gray-700">{row.player1Name || 'TBD'}</span>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <span className="text-[10px] font-bold text-gray-300">vs</span>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <span className="text-xs text-gray-700">{row.player2Name || 'TBD'}</span>
                                                            </td>
                                                        </>
                                                    )}
                                                    <td className="px-4 py-2.5">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                            row.isFinal ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' :
                                                            row.round === 1 ? 'bg-gray-100 text-gray-600' :
                                                            'bg-blue-50 text-blue-700'
                                                        }`}>
                                                            {row.isFinal ? '🏆 Final' : row.round === 1 ? 'Round 1' : `Round ${row.round}`}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                            (courtEdits[row.categoryId] ?? row.court) && (courtEdits[row.categoryId] ?? row.court) !== 'Unassigned'
                                                                ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                                                                : 'text-gray-400'
                                                        }`}>
                                                            {(courtEdits[row.categoryId] ?? row.court) === 'Unassigned' ? '—' : (courtEdits[row.categoryId] ?? row.court) || '—'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )
                ) : (
                    // ── Normal expandable category list ──
                    filteredCategories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                <AlertCircle size={20} className="text-gray-300" />
                            </div>
                            <p className="text-sm font-semibold text-gray-500">
                                {searchQuery || alertFilter !== 'all'
                                    ? 'No categories match your filter.'
                                    : `No ${activeTab} categories found.`}
                            </p>
                            {(searchQuery || alertFilter !== 'all') && (
                                <button
                                    onClick={() => { setSearchQuery(''); setAlertFilter('all') }}
                                    className="text-red-600 text-xs font-semibold mt-2 hover:underline"
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredCategories.map((cat) => (
                            <CollapsibleBracket
                                key={cat.id}
                                category={cat}
                                isPoomsae={activeTab === 'poomsae' || activeTab === 'kyukpa'}
                                isKyorugi={activeTab === 'kyorugi'}
                                tournamentName={tournamentName}
                                alerts={alertsByCategory.get(cat.id) || []}
                                proposals={proposals}
                                tournamentId={tournamentId}
                                publicView={publicView}
                                onAlertResolved={() => queryClient.invalidateQueries({ queryKey: ['tournament-smart-alerts', tournamentId] })}
                                allCategoriesInDiscipline={displayedCategories.map(c => ({ id: c.id, name: c.name }))}
                                isBulkSelected={bulkSelected.has(cat.id)}
                                onBulkToggle={() => setBulkSelected(prev => {
                                    const next = new Set(prev)
                                    if (next.has(cat.id)) next.delete(cat.id)
                                    else next.add(cat.id)
                                    return next
                                })}
                                simulatedMatches={globalMatchIds?.[cat.id] ?? null}
                                onBracketShapeChanged={() => setGlobalMatchIds(null)}
                                onEditedSpecsChanged={handleEditedSpecsChanged}
                            />
                        ))
                    )
                )}
            </div>
        </div>
        </>
    )
}

// ─────────────────────────────────────────────
// CollapsibleBracket
// ─────────────────────────────────────────────
function CollapsibleBracket({
    category, isPoomsae = false, isKyorugi = true, tournamentName,
    alerts, proposals, tournamentId, publicView, onAlertResolved, allCategoriesInDiscipline,
    isBulkSelected, onBulkToggle, simulatedMatches, onBracketShapeChanged, onEditedSpecsChanged
}: {
    category: Category & { matches: Match[], poomsaeMatches?: (PoomsaeMatch & { player: { name: string; club?: { name: string } | null } })[], _count?: { players: number } },
    isPoomsae?: boolean, isKyorugi?: boolean, tournamentName?: string, alerts: any[], proposals: any[],
    tournamentId: string, publicView?: boolean, onAlertResolved: () => void,
    allCategoriesInDiscipline: { id: string; name: string }[],
    isBulkSelected?: boolean, onBulkToggle?: () => void,
    simulatedMatches?: Record<number, { globalId: number; day: number }> | null,
    // Called after a move or a single-category generate — either can change the
    // bracket shape or the shared tournament-wide numbering, which makes any
    // previously-simulated match numbers (for this or other categories) stale.
    onBracketShapeChanged?: () => void,
    // Reports this category's current hand-edited specs up to the top level (null
    // when there are no pending manual edits), so a bulk "Generate All" can carry
    // them forward instead of only reproducing the last persisted seed order.
    onEditedSpecsChanged?: (categoryId: string, specs: PreviewMatch[] | null) => void
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [localCourt, setLocalCourt] = useState(category.court || '')
    const [savingCourt, setSavingCourt] = useState(false)
    // HEAD_TO_HEAD rows are one-per-side (two rows per pairing) — count unique pairings.
    const matchCount = isPoomsae
        ? (category.poomsaeFormat === 'HEAD_TO_HEAD'
            ? new Set((category.poomsaeMatches || []).map(m => m.matchId)).size
            : (category.poomsaeMatches?.length || 0))
        : category.matches.length
    const isGenerated = matchCount > 0

    async function handleCourtBlur() {
        const trimmed = localCourt.trim()
        if (trimmed === (category.court || '')) return
        setSavingCourt(true)
        try {
            const r = await bulkUpdateCourts([{ categoryId: category.id, court: trimmed }], tournamentId)
            if (r.success) toast.success(`Court updated to "${trimmed || 'None'}"`);
            else toast.error('Failed to update court');
        } catch { toast.error('Failed to update court') }
        finally { setSavingCourt(false) }
    }

    // ── Manual "declare winner" — for organizers not using the external scoring
    // API. Kyorugi identifies by match id + slot; Poomsae head-to-head identifies
    // by the pairing's shared matchId + performance number (1/2), since the
    // adapted bracket's player1/player2 are display names, not IDs. ───────────
    const router = useRouter()

    async function handleDeclareKyorugiWinner(match: Match, slot: 'player1' | 'player2') {
        const result = await declareKyorugiWinner(match.id, slot)
        if (result.success) {
            toast.success('Winner declared')
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to declare winner')
        }
    }

    async function handleDeclarePoomsaeWinner(match: Match, slot: 'player1' | 'player2') {
        if (!match.categoryRefId || match.matchId == null) {
            toast.error('Failed to declare winner')
            return
        }
        const result = await declarePoomsaeWinner(match.categoryRefId, match.matchId, slot === 'player1' ? 1 : 2)
        if (result.success) {
            toast.success('Winner declared')
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to declare winner')
        }
    }

    // ── Day / Defer scheduling — a plain Category field, editable regardless of
    // whether this category's bracket has been generated yet ──────────────────
    const [savingDay, startDayTransition] = useTransition()
    const [localScheduleDay, setLocalScheduleDay] = useState<number | null>(category.scheduleDay ?? null)
    const [localDeferFinals, setLocalDeferFinals] = useState<boolean>(category.deferFinals ?? true)
    const [localDeferDay, setLocalDeferDay] = useState<number | null>(category.deferFinalsToDay ?? null)
    const [localDeferSemisToDay, setLocalDeferSemisToDay] = useState<number | null>((category as any).deferSemisToDay ?? null)

    // ── Not-yet-generated interactive preview (lazy-loaded on expand) ─────────
    const queryClient = useQueryClient()
    const { data: previewData, isLoading: previewLoading } = useQuery({
        queryKey: ['category-preview', category.id],
        queryFn: () => previewCategoryBracket(category.id),
        enabled: isOpen && !isGenerated && !publicView,
    })

    const [localSpecs, setLocalSpecs] = useState<PreviewMatch[]>([])
    // Tracks whether the user has manually swapped players since the last fresh
    // load/reshuffle — gates which path handleGenerateThisCategory takes below.
    const [hasManualEdits, setHasManualEdits] = useState(false)
    useEffect(() => {
        if (previewData) {
            setLocalSpecs(previewData.specs)
            setHasManualEdits(false)
            onEditedSpecsChanged?.(category.id, null)
        }
    }, [previewData])

    const [selected, setSelected] = useState<{ matchId: number; slot: 'player1' | 'player2'; player: { id: string; name: string } } | null>(null)
    const [reshuffling, setReshuffling] = useState(false)
    const [movePicker, setMovePicker] = useState<{ playerId: string; playerName: string } | null>(null)
    const [movingPlayer, setMovingPlayer] = useState(false)
    const [generatingThis, setGeneratingThis] = useState(false)

    const otherCategories = allCategoriesInDiscipline.filter(c => c.id !== category.id)

    function handlePlayerClick(matchId: number, slot: 'player1' | 'player2', player: { id: string; name: string }) {
        if (selected && selected.matchId === matchId && selected.slot === slot) { setSelected(null); return }
        if (!selected) { setSelected({ matchId, slot, player }); return }
        const specs = localSpecs.map(s => ({ ...s }))
        const matchA = specs.find(s => s.id === selected.matchId)
        const matchB = specs.find(s => s.id === matchId)
        if (matchA && matchB) {
            const pA = selected.slot === 'player1' ? matchA.player1 : matchA.player2
            const pB = slot === 'player1' ? matchB.player1 : matchB.player2
            if (selected.slot === 'player1') matchA.player1 = pB; else matchA.player2 = pB
            if (slot === 'player1') matchB.player1 = pA; else matchB.player2 = pA
            setLocalSpecs(specs)
            setHasManualEdits(true)
            onEditedSpecsChanged?.(category.id, specs)
        }
        setSelected(null)
    }

    async function handleReshuffle() {
        setReshuffling(true)
        try {
            const result = await reshuffleCategoryPreview(category.id)
            // Push into the same query cache the lazy preview fetch populates — the
            // useEffect below already syncs localSpecs (Kyorugi) from previewData, and
            // Poomsae's render reads previewData directly, so this one update covers both.
            if (result) { queryClient.setQueryData(['category-preview', category.id], result); setSelected(null) }
        } catch { toast.error('Failed to reshuffle') }
        finally { setReshuffling(false) }
    }

    async function handleMoveTo(targetCategoryId: string) {
        if (!movePicker) return
        setMovingPlayer(true)
        try {
            const result = await movePlayerToCategory(movePicker.playerId, targetCategoryId, tournamentId)
            if (result?.error) { toast.error(result.error); return }
            toast.success(`${movePicker.playerName} moved successfully`)
            setMovePicker(null); setSelected(null)
            await queryClient.invalidateQueries({ queryKey: ['category-preview', category.id] })
            await queryClient.invalidateQueries({ queryKey: ['category-preview', targetCategoryId] })
            onBracketShapeChanged?.()
        } catch { toast.error('Move failed') }
        finally { setMovingPlayer(false) }
    }

    async function handleGenerateThisCategory() {
        setGeneratingThis(true)
        try {
            // Poomsae generation already reproduces the shown preview on its own via
            // category.seedOrder (server-side fallback) — nothing to pass here.
            // Kyorugi: with no manual edits, same story — omitting seedOrder lets the
            // server fall back to category.seedOrder and regenerate the identical
            // bracket. Only when the user has actually swapped players do we need to
            // send the edited specs verbatim (see generateBracketsForCategory) —
            // passing a *derived* seed order in that case would get re-scrambled by
            // the seeding transform instead of reproducing the hand-made swap.
            const editedSpecs = (!isPoomsae && hasManualEdits) ? localSpecs : undefined
            await generateBracketsForCategory(category.id, undefined, undefined, editedSpecs)
            toast.success(`Generated bracket for "${category.name}"`)
            await queryClient.invalidateQueries({ queryKey: ['category-preview', category.id] })
            onBracketShapeChanged?.()
            onEditedSpecsChanged?.(category.id, null)
        } catch { toast.error('Failed to generate bracket') }
        finally { setGeneratingThis(false) }
    }

    const hasAlert  = alerts.some(a => a.type === 'UNCONTESTED')
    const hasMerge  = alerts.some(a => a.type === 'MERGE_SUGGESTION')
    const hasSplit  = alerts.some(a => a.type === 'SPLIT_SUGGESTION')
    const hasAnAlert = alerts.length > 0

    // Medal count for this category — PAIR/TEAM award multiple medals per placement
    const competitorCount = getCompetitorCount(category._count?.players ?? 0, category.subtype)
    const medalMultiplier = getMedalMultiplier(category.subtype)
    // A KYORUGI category with just 1 competitor still awards Gold via auto-walkover
    // (see createUncontestedWalkoverMatch) — same as the toolbar's medalEligible tally above.
    const showMedals = competitorCount >= 1

    // Simulated match numbering (from "Simulate Sequence" in the toolbar, if run)
    const simulatedValues = simulatedMatches ? Object.values(simulatedMatches) : []
    const simulatedRange = simulatedValues.length > 0
        ? {
            min: Math.min(...simulatedValues.map(v => v.globalId)),
            max: Math.max(...simulatedValues.map(v => v.globalId)),
            days: Array.from(new Set(simulatedValues.map(v => v.day))).sort((a, b) => a - b),
        }
        : null

    // Left accent colour
    const accentClass = hasAlert  ? 'bg-gradient-to-b from-amber-400 to-yellow-500'
        : hasMerge ? 'bg-gradient-to-b from-purple-400 to-violet-600'
        : hasSplit  ? 'bg-gradient-to-b from-blue-400 to-blue-600'
        : 'bg-gray-200'

    const borderClass = hasAlert  ? 'border-amber-200 hover:border-amber-300'
        : hasMerge ? 'border-purple-200 hover:border-purple-300'
        : hasSplit  ? 'border-blue-200 hover:border-blue-300'
        : 'border-gray-200 hover:border-gray-300'

    return (
        <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${borderClass}`}>
            <div className="flex">
                {/* Left accent bar */}
                <div className={`w-1 flex-shrink-0 ${accentClass}`} />

                {/* Header */}
                <div
                    className="flex-1 flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none hover:bg-gray-50/50 transition-colors"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {/* Bulk-select checkbox */}
                    {!publicView && onBulkToggle && (
                        <button
                            onClick={e => { e.stopPropagation(); onBulkToggle() }}
                            title="Select for bulk Day/Defer apply"
                            className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-all ${
                                isBulkSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 hover:border-indigo-400'
                            }`}
                        >
                            {isBulkSelected && <CheckSquare size={12} className="text-white" />}
                        </button>
                    )}

                    {/* Chevron */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                        isOpen ? 'bg-red-50 border border-red-100' : 'bg-gray-100 border border-gray-200'
                    }`}>
                        <ChevronDown
                            size={13}
                            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-red-500' : 'text-gray-400'}`}
                        />
                    </div>

                    {/* Category info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{category.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {/* Match count */}
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                {matchCount} Matches
                            </span>

                            {/* Medal tally */}
                            {showMedals && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200">
                                    <span className="text-amber-600">🥇{1 * medalMultiplier}</span>
                                    {competitorCount >= 2 && <span className="text-gray-400">🥈{1 * medalMultiplier}</span>}
                                    {competitorCount >= 3 && <span className="text-orange-700">🥉{(competitorCount > 3 ? 2 : 1) * medalMultiplier}</span>}
                                </span>
                            )}

                            {/* Court */}
                            {!publicView ? (
                                <div className="inline-flex items-center gap-1 bg-orange-50 border border-orange-100 rounded-md px-1.5 py-0.5">
                                    <MapPin size={8} className="text-orange-400 flex-shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Court"
                                        value={localCourt}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => setLocalCourt(e.target.value)}
                                        onBlur={handleCourtBlur}
                                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                                        disabled={savingCourt}
                                        className="w-12 text-[10px] font-bold text-orange-700 bg-transparent border-none outline-none placeholder:text-orange-300 disabled:opacity-50"
                                    />
                                    {savingCourt && <Loader2 size={8} className="animate-spin text-orange-400" />}
                                </div>
                            ) : category.court ? (
                                <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md uppercase">
                                    Court {category.court}
                                </span>
                            ) : null}

                            {/* Alert pills + inline proposal status */}
                            {!publicView && alerts.map((alert: any, i: number) => {
                                // Match the proposal for this specific alert
                                const matchedProposal = proposals.find((p: any) => {
                                    try {
                                        const d = JSON.parse(p.data)
                                        if (p.type === 'UNCONTESTED' && alert.type === 'UNCONTESTED')
                                            return d.playerId === alert.details?.playerId
                                        if (p.type === 'CROSS_DIVISION' && alert.type === 'CROSS_DIVISION')
                                            return d.playerId === alert.details?.playerId
                                        if (p.type === 'MERGE' && alert.type === 'MERGE_SUGGESTION')
                                            return d.sourceCategoryId === alert.categoryId
                                        if (p.type === 'SPLIT' && alert.type === 'SPLIT_SUGGESTION')
                                            return d.categoryId === alert.categoryId
                                    } catch { return false }
                                    return false
                                })

                                const isPending  = matchedProposal?.status === 'PENDING'
                                const votes: { clubId: string; vote: string }[] = matchedProposal?.votes || []
                                const hasVotes   = votes.length > 0

                                // Vote summary helpers
                                const moveUp   = votes.filter(v => v.vote === 'MOVE_UP').length
                                const walkover = votes.filter(v => v.vote === 'WALKOVER').length
                                const withdraw = votes.filter(v => v.vote === 'WITHDRAW').length
                                const agrees   = votes.filter(v => v.vote === 'AGREE').length
                                const disagrees = votes.filter(v => v.vote === 'DISAGREE').length

                                // Already decided as WALKOVER but not yet generated — same
                                // "resolved" state as the InlineAlertPanel's own tag below.
                                const isWalkoverDecidedPill = alert.details?.resolution === 'WALKOVER'

                                return (
                                    <span key={`${alert.type}-${i}`} className="inline-flex items-center gap-1 flex-wrap">
                                        {/* Alert type pill — clicking it opens the row (same as clicking
                                            anywhere else on it now that alerts/bracket share one toggle) */}
                                        <button
                                            onClick={e => { e.stopPropagation(); setIsOpen(true) }}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all hover:scale-105 ${
                                                isWalkoverDecidedPill
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                    : alert.type === 'UNCONTESTED'
                                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                                                    : alert.type === 'CROSS_DIVISION'
                                                    ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                                                    : alert.type === 'MERGE_SUGGESTION'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                            }`}
                                        >
                                            {isWalkoverDecidedPill ? null : alert.type === 'UNCONTESTED'     && <ShieldAlert size={9} />}
                                            {isWalkoverDecidedPill ? null : alert.type === 'CROSS_DIVISION'  && <ArrowRight size={9} />}
                                            {alert.type === 'MERGE_SUGGESTION' && <Merge size={9} />}
                                            {alert.type === 'SPLIT_SUGGESTION' && <Split size={9} />}
                                            {isWalkoverDecidedPill ? 'Resolved'
                                                : alert.type === 'UNCONTESTED'     ? 'Uncontested'
                                                : alert.type === 'CROSS_DIVISION'  ? 'Cross Div'
                                                : alert.type === 'MERGE_SUGGESTION' ? 'Merge' : 'Split'}
                                        </button>

                                        {/* Inline proposal status — shown only when a proposal exists */}
                                        {isPending && !hasVotes && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
                                                <Clock size={8} /> Awaiting Club
                                            </span>
                                        )}
                                        {isPending && hasVotes && (alert.type === 'UNCONTESTED' || alert.type === 'CROSS_DIVISION') && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-gray-200 text-gray-600">
                                                {moveUp   > 0 && <span className="text-amber-700">{moveUp}↑ Move Up</span>}
                                                {walkover > 0 && <span className="text-emerald-700">{walkover} Walkover</span>}
                                                {withdraw > 0 && <span className="text-red-700">{withdraw} Withdraw</span>}
                                            </span>
                                        )}
                                        {isPending && hasVotes && (alert.type === 'MERGE_SUGGESTION' || alert.type === 'SPLIT_SUGGESTION') && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-gray-200 text-gray-600">
                                                {agrees > 0    && <span className="text-emerald-700">{agrees} Agree</span>}
                                                {disagrees > 0 && <span className="text-red-700">{disagrees} Disagree</span>}
                                            </span>
                                        )}
                                    </span>
                                )
                            })}
                        </div>
                    </div>

                    {/* Right: match count + status dot */}
                    <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <div className="text-right hidden sm:block">
                            <div className="text-lg font-black text-gray-800 leading-none">{matchCount}</div>
                            <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">matches</div>
                        </div>
                        {matchCount > 0 ? (
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                        ) : (
                            <span className="h-2.5 w-2.5 rounded-full bg-gray-300 flex-shrink-0" />
                        )}
                    </div>
                </div>
            </div>

            {/* Day / Defer / Reshuffle sub-row */}
            {!publicView && (
                <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100 bg-gray-50/60 flex-wrap">
                    <select
                        value={localScheduleDay ?? ''}
                        onChange={e => {
                            const parsed = e.target.value ? parseInt(e.target.value) : null
                            setLocalScheduleDay(parsed)
                            startDayTransition(async () => { await updateCategoryDaySettings(category.id, parsed, localDeferFinals, localDeferDay) })
                        }}
                        disabled={savingDay}
                        title="Which day does this category play?"
                        className="text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-indigo-50 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
                    >
                        <option value="">— Day</option>
                        <option value="1">Day 1</option>
                        <option value="2">Day 2</option>
                        <option value="3">Day 3</option>
                    </select>
                    {!isPoomsae && (
                        <select
                            value={
                                !localDeferFinals ? 'seq'
                                : localDeferSemisToDay === 2 ? 'semis-d2'
                                : localDeferSemisToDay === 3 ? 'semis-d3'
                                : localDeferDay === 2 ? 'finals-d2'
                                : localDeferDay === 3 ? 'finals-d3'
                                : 'end'
                            }
                            onChange={e => {
                                const val = e.target.value
                                let newDeferFinals = true
                                let newDeferDay: number | null = null
                                let newDeferSemisToDay: number | null = null
                                if (val === 'seq') { newDeferFinals = false }
                                else if (val === 'end') { newDeferFinals = true }
                                else if (val === 'finals-d2') { newDeferFinals = true; newDeferDay = 2 }
                                else if (val === 'finals-d3') { newDeferFinals = true; newDeferDay = 3 }
                                else if (val === 'semis-d2') { newDeferFinals = true; newDeferSemisToDay = 2 }
                                else if (val === 'semis-d3') { newDeferFinals = true; newDeferSemisToDay = 3 }
                                setLocalDeferFinals(newDeferFinals)
                                setLocalDeferDay(newDeferDay)
                                setLocalDeferSemisToDay(newDeferSemisToDay)
                                startDayTransition(async () => {
                                    await updateCategoryDaySettings(category.id, localScheduleDay, newDeferFinals, newDeferDay, newDeferSemisToDay)
                                })
                            }}
                            disabled={savingDay || !localScheduleDay}
                            title="Finals / Semis handling"
                            className="text-[10px] font-bold bg-white text-amber-700 border border-amber-200 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
                        >
                            <option value="seq">Sequential</option>
                            <option value="end">End of Day</option>
                            <option value="finals-d2">Finals → Day 2</option>
                            <option value="finals-d3">Finals → Day 3</option>
                            <option value="semis-d2">Semis + Finals → Day 2</option>
                            <option value="semis-d3">Semis + Finals → Day 3</option>
                        </select>
                    )}
                    {savingDay && <Loader2 size={11} className="animate-spin text-gray-400" />}

                    {simulatedRange && (
                        <span
                            title="From the toolbar's Simulate Sequence — not committed until you generate"
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200"
                        >
                            <Shuffle size={10} />
                            {simulatedRange.min === simulatedRange.max ? `Match #${simulatedRange.min}` : `Matches #${simulatedRange.min}–${simulatedRange.max}`}
                            {simulatedRange.days.length > 0 && ` · Day ${simulatedRange.days.join('/')}`}
                        </span>
                    )}

                    {!isGenerated && (
                        <button
                            onClick={() => { setIsOpen(true); handleReshuffle() }}
                            disabled={reshuffling}
                            title="Expand and re-randomize the seeding"
                            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all disabled:opacity-40"
                        >
                            {reshuffling ? <Loader2 size={11} className="animate-spin" /> : <Shuffle size={11} />}
                            Reshuffle
                        </button>
                    )}
                </div>
            )}

            {/* Inline Alert Panel — shares the same expand toggle as the bracket below,
                so opening a category shows Uncontested/Merge/Split alongside it instead
                of needing a separate click on the small alert pill. */}
            {isOpen && hasAnAlert && !publicView && (
                <div className="border-t border-amber-100 bg-gradient-to-b from-amber-50/60 to-transparent animate-in fade-in slide-in-from-top-1 duration-200">
                    {alerts.map((alert: any, idx: number) => (
                        <InlineAlertPanel
                            key={`${alert.categoryId}-${alert.type}-${idx}`}
                            alert={alert}
                            proposals={proposals}
                            tournamentId={tournamentId}
                            onResolved={onAlertResolved}
                        />
                    ))}
                </div>
            )}

            {/* Bracket content */}
            {isOpen && (
                <div className="border-t border-gray-100 bg-white p-6 animate-in fade-in duration-200">
                    {isGenerated ? (
                        <div className="overflow-x-auto">
                            {isPoomsae && category.poomsaeFormat === 'HEAD_TO_HEAD' ? (
                                <BracketView
                                    matches={adaptPoomsaeMatchesToBracket(category.poomsaeMatches || [])}
                                    tournamentName={tournamentName}
                                    categoryName={category.name}
                                    categoryId={category.id}
                                    canManage={!publicView}
                                    onDeclareWinner={handleDeclarePoomsaeWinner}
                                />
                            ) : isPoomsae ? (
                                <PoomsaeBracketView
                                    matches={category.poomsaeMatches || []}
                                    tournamentName={tournamentName}
                                    categoryName={category.name}
                                />
                            ) : (
                                <BracketView
                                    matches={category.matches}
                                    tournamentName={tournamentName}
                                    categoryName={category.name}
                                    categoryId={category.id}
                                    canManage={!publicView}
                                    onDeclareWinner={handleDeclareKyorugiWinner}
                                />
                            )}
                        </div>
                    ) : publicView ? (
                        <div className="py-8 text-center text-sm text-gray-400">Bracket not yet generated.</div>
                    ) : previewLoading || !previewData ? (
                        <div className="py-8 flex items-center justify-center gap-2 text-sm text-gray-400">
                            <Loader2 size={14} className="animate-spin" /> Loading draw preview…
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-[11px] text-gray-400">
                                {isPoomsae
                                    ? 'Preview performance order · Reshuffle to re-randomize'
                                    : 'Click two Round 1 players to swap their seed positions · ⇆ moves a player to another category'}
                            </p>

                            {/* Move picker */}
                            {movePicker && !isPoomsae && (
                                <div className="px-4 py-3 rounded-xl bg-purple-50 border border-purple-100">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <p className="text-xs font-black mb-2 flex items-center gap-2 text-purple-700">
                                                <ArrowRightLeft size={12} />
                                                Move <span className="px-2 py-0.5 rounded-md text-[11px] bg-purple-100 text-purple-800">{movePicker.playerName}</span> to:
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                                {otherCategories.length === 0 ? (
                                                    <p className="text-xs text-purple-400">No other categories available.</p>
                                                ) : otherCategories.map(target => (
                                                    <button key={target.id} onClick={() => handleMoveTo(target.id)}
                                                        disabled={movingPlayer}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 transition-all disabled:opacity-40">
                                                        {movingPlayer ? <Loader2 size={9} className="animate-spin" /> : <Shield size={9} />}
                                                        {target.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button onClick={() => setMovePicker(null)} className="text-purple-400 hover:text-purple-600 transition-colors mt-0.5">
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isPoomsae && category.poomsaeFormat === 'HEAD_TO_HEAD' ? (
                                // Same tree component the generated HEAD_TO_HEAD bracket uses —
                                // read-only (no swap/move, matching the generated view too).
                                <BracketView
                                    matches={adaptPoomsaePreviewToBracket(previewData.poomsaeSpecs || [])}
                                    tournamentName={tournamentName}
                                    categoryName={category.name}
                                    categoryId={category.id}
                                    isPreview
                                    simulatedMatches={simulatedMatches}
                                />
                            ) : isPoomsae ? (
                                <PoomsaePreviewGrid
                                    poomsaeSpecs={previewData.poomsaeSpecs || []}
                                    playerMap={new Map(previewData.players.map(p => [p.id, p]))}
                                    isHeadToHead={false}
                                    simulatedMatches={simulatedMatches}
                                />
                            ) : (
                                <PreviewBracketTree
                                    specs={localSpecs}
                                    playerMap={new Map(previewData.players.map(p => [p.id, p]))}
                                    heightBased={isHeightBased(category.name)}
                                    selected={selected}
                                    onPlayerClick={handlePlayerClick}
                                    onMoveRequest={(pId, pName) => setMovePicker({ playerId: pId, playerName: pName })}
                                    hasMovePickerOpen={!!movePicker}
                                    simulatedMatches={simulatedMatches}
                                />
                            )}

                            {previewData.playerCount >= (isPoomsae ? 1 : 2) && (
                                <div className="flex justify-end pt-2 border-t border-gray-100">
                                    <button
                                        onClick={handleGenerateThisCategory}
                                        disabled={generatingThis}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-br from-red-600 to-red-700 shadow-md shadow-red-500/20 hover:shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {generatingThis ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                        Generate This Category
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────
// InlineAlertPanel
// ─────────────────────────────────────────────
function InlineAlertPanel({ alert, proposals, tournamentId, onResolved }: {
    alert: any, proposals: any[], tournamentId: string, onResolved: () => void
}) {
    const [loading,       setLoading]       = useState(false)
    const [forceDecision, setForceDecision] = useState(false)

    // Resolution is entirely the organiser's call now — clubs no longer vote on
    // these, so this only needs to find an existing PENDING proposal (e.g. one
    // left over from before this change) to reuse instead of creating a duplicate.
    const proposal = proposals.find((p: any) => {
        const data = JSON.parse(p.data)
        if (p.type === 'UNCONTESTED'    && alert.type === 'UNCONTESTED')    return data.playerId === alert.details?.playerId
        if (p.type === 'CROSS_DIVISION' && alert.type === 'CROSS_DIVISION') return data.playerId === alert.details?.playerId
        if (p.type === 'MERGE'          && alert.type === 'MERGE_SUGGESTION') return data.sourceCategoryId === alert.categoryId
        if (p.type === 'SPLIT'          && alert.type === 'SPLIT_SUGGESTION') return data.categoryId === alert.categoryId
        return false
    })

    async function ensureProposalId(): Promise<string> {
        if (proposal?.status === 'PENDING') return proposal.id

        if (alert.type === 'UNCONTESTED') {
            const r = await initiateSmartProposal(tournamentId, 'UNCONTESTED', {
                playerId: alert.details.playerId,
                playerName: alert.details.playerName,
                sourceCategoryId: alert.categoryId,
                sourceCategoryName: alert.details.sourceCategoryName || alert.categoryName,
                targetCategoryId: alert.details.targetCategoryId || null,
                targetCategoryName: alert.details.targetCategoryName || null,
            })
            return r.proposalId
        } else if (alert.type === 'CROSS_DIVISION') {
            const r = await initiateSmartProposal(tournamentId, 'CROSS_DIVISION', {
                playerId: alert.details.playerId,
                playerName: alert.details.playerName,
                sourceCategoryId: alert.categoryId,
                sourceCategoryName: alert.details.sourceCategoryName || alert.categoryName,
                targetCategoryId: alert.details.targetCategoryId,
                targetCategoryName: alert.details.targetCategoryName,
                clubId: alert.details.clubId || null,
                clubName: alert.details.clubName || null,
            })
            return r.proposalId
        } else if (alert.type === 'MERGE_SUGGESTION') {
            const r = await initiateSmartProposal(tournamentId, 'MERGE', {
                sourceCategoryId: alert.categoryId,
                targetCategoryId: alert.details.targetCategoryId
            })
            return r.proposalId
        } else {
            const r = await initiateSmartProposal(tournamentId, 'SPLIT', { categoryId: alert.categoryId })
            return r.proposalId
        }
    }

    async function handleAction(decision?: string) {
        setLoading(true)
        try {
            const proposalId = await ensureProposalId()
            const result = await forceExecuteSmartAction(proposalId, decision)
            if (result?.error) toast.error(result.error)
            else { toast.success('Resolved'); onResolved() }
        } catch {
            toast.error('Action failed')
        } finally {
            setLoading(false)
        }
    }

    const details = alert.details || {}
    const players  = details.players || (details.playerName
        ? [{ name: details.playerName, clubName: details.clubName, clubLogoUrl: details.clubLogoUrl }]
        : [])

    const isWalkoverDecided = alert.details?.resolution === 'WALKOVER'

    const alertColor = isWalkoverDecided
        ? { bg: 'bg-emerald-100', text: 'text-emerald-700', btn: 'bg-emerald-500 hover:bg-emerald-600' }
        : alert.type === 'UNCONTESTED'
        ? { bg: 'bg-amber-100',  text: 'text-amber-700',  btn: 'bg-amber-500 hover:bg-amber-600' }
        : alert.type === 'CROSS_DIVISION'
        ? { bg: 'bg-orange-100', text: 'text-orange-700', btn: 'bg-orange-500 hover:bg-orange-600' }
        : alert.type === 'MERGE_SUGGESTION'
        ? { bg: 'bg-purple-100', text: 'text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700' }
        : { bg: 'bg-blue-100',   text: 'text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-700' }

    return (
        <div className="px-5 py-4 border-b border-amber-100/80 last:border-b-0">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Left: alert info */}
                <div className="flex-1 min-w-0">
                    {/* Tag row */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${alertColor.bg} ${alertColor.text}`}>
                            {isWalkoverDecided ? null : alert.type === 'UNCONTESTED'     && <ShieldAlert size={9} />}
                            {isWalkoverDecided ? null : alert.type === 'CROSS_DIVISION'  && <ArrowRight size={9} />}
                            {alert.type === 'MERGE_SUGGESTION' && <Merge size={9} />}
                            {alert.type === 'SPLIT_SUGGESTION' && <Split size={9} />}
                            {isWalkoverDecided ? 'Walkover'
                                : alert.type === 'UNCONTESTED'      ? 'Uncontested'
                                : alert.type === 'CROSS_DIVISION'   ? 'Cross Division'
                                : alert.type === 'MERGE_SUGGESTION' ? 'Merge Suggestion'
                                : 'Split Suggestion'}
                        </span>
                    </div>

                    <p className="text-sm text-gray-700 font-medium leading-relaxed">{alert.message}</p>

                    {/* Athletes */}
                    {players.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                <Users size={9} /> Affected Athletes
                            </div>
                            {players.map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    {p.clubLogoUrl ? (
                                        <img src={p.clubLogoUrl} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-gray-200" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-[8px] font-black text-white">
                                            {(p.clubName || '?')[0]}
                                        </div>
                                    )}
                                    <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                                    <span className="text-gray-300">·</span>
                                    <span className="text-xs text-gray-500">{p.clubName}</span>
                                </div>
                            ))}
                            {details.playerCount && details.playerCount > players.length && (
                                <p className="text-xs text-gray-400 pl-3">
                                    + {details.playerCount - players.length} more athletes
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: action button */}
                <div className="flex-shrink-0 self-start">
                    {/* Already decided as WALKOVER but not yet generated — the actual
                        match/medal only gets created when Generate/Generate All runs,
                        so there's nothing left to do here, just show the decision. */}
                    {alert.details?.resolution === 'WALKOVER' ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200">
                            ✓ Walkover — will be generated
                        </div>
                    ) : (alert.type === 'UNCONTESTED' || alert.type === 'CROSS_DIVISION') ? (
                        forceDecision ? (
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Choose outcome:</p>
                                <div className="flex gap-1.5 flex-wrap">
                                    <button
                                        onClick={() => handleAction('MOVE_UP')}
                                        disabled={loading}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white bg-amber-500 hover:bg-amber-600 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 size={11} className="animate-spin" /> : '↑'}
                                        Move Up
                                    </button>
                                    <button
                                        onClick={() => handleAction('WALKOVER')}
                                        disabled={loading}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 size={11} className="animate-spin" /> : '✓'}
                                        Walkover
                                    </button>
                                    <button
                                        onClick={() => handleAction('WITHDRAW')}
                                        disabled={loading}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white bg-red-500 hover:bg-red-600 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 size={11} className="animate-spin" /> : '✕'}
                                        Withdraw
                                    </button>
                                    <button
                                        onClick={() => setForceDecision(false)}
                                        disabled={loading}
                                        className="px-2 py-2 rounded-xl text-xs font-black text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setForceDecision(true)}
                                disabled={loading}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 ${alertColor.btn}`}
                            >
                                {loading && <Loader2 size={12} className="animate-spin" />}
                                Decide
                            </button>
                        )
                    ) : (
                        /* MERGE/SPLIT — organiser executes directly, no club sign-off needed */
                        <button
                            onClick={() => handleAction()}
                            disabled={loading}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 ${alertColor.btn}`}
                        >
                            {loading && <Loader2 size={12} className="animate-spin" />}
                            {alert.type === 'MERGE_SUGGESTION' ? 'Merge Now' : 'Split Now'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
