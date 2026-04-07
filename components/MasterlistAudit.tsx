'use client'

import { useState } from 'react'
import { auditTournamentMasterlist, fixAuditIssues, AuditIssue } from '@/app/actions'
import {
    ShieldCheck, AlertTriangle, AlertCircle, Loader2,
    ChevronDown, ChevronUp, ClipboardList, CheckCircle2, Wrench, ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

interface MasterlistAuditProps {
    tournamentId: string
}

// ── Issue code → human label ─────────────────────────────────────────────────
const CODE_LABEL: Record<string, string> = {
    NO_BIRTHDAY:      'Missing Birthday',
    INVALID_BIRTHDAY: 'Invalid Birthday',
    NO_WEIGHT:        'Missing Weight',
    NO_HEIGHT:        'Missing Height',
    NO_GENDER:        'Missing Gender',
    AGE_TOO_YOUNG:    'Age Below Minimum',
    AGE_TOO_OLD:      'Age Above Maximum',
    GENDER_MISMATCH:  'Gender Mismatch',
    WEIGHT_TOO_LOW:   'Weight Below Minimum',
    WEIGHT_TOO_HIGH:  'Weight Above Maximum',
    HEIGHT_TOO_LOW:   'Height Below Minimum',
    HEIGHT_TOO_HIGH:  'Height Above Maximum',
    BELT_MISMATCH:    'Belt Mismatch',
    SKILL_MISMATCH:   'Skill Level Mismatch',
    WRONG_CATEGORY:   'Wrong Category',
}

// ── Discipline pill colour ────────────────────────────────────────────────────
const TYPE_BADGE: Record<string, string> = {
    KYORUGI: 'bg-red-100 text-red-700',
    POOMSAE: 'bg-blue-100 text-blue-700',
    KYUKPA:  'bg-purple-100 text-purple-700',
}

export default function MasterlistAudit({ tournamentId }: MasterlistAuditProps) {
    const [isOpen, setIsOpen]       = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [isFixing, setIsFixing]   = useState(false)
    const [issues, setIssues]       = useState<AuditIssue[] | null>(null)
    const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set())

    const runAudit = async () => {
        setIsRunning(true)
        setIssues(null)
        try {
            const result = await auditTournamentMasterlist(tournamentId)
            setIssues(result)
            setIsOpen(true)
            const codes = new Set(result.map(i => i.code))
            setExpandedCodes(codes)
        } finally {
            setIsRunning(false)
        }
    }

    const handleFixAll = async () => {
        if (!issues) return
        const fixable = issues.filter(
            i => i.fixable && i.suggestedCategoryId && i.suggestedCategoryName
        )
        // Deduplicate by playerId — one fix per player
        const seen = new Set<string>()
        const uniqueFixes = fixable.filter(i => {
            if (seen.has(i.playerId)) return false
            seen.add(i.playerId)
            return true
        }).map(i => ({
            playerId: i.playerId,
            playerName: i.playerName,
            currentCategoryName: i.categoryName,
            suggestedCategoryId: i.suggestedCategoryId!,
            suggestedCategoryName: i.suggestedCategoryName!,
        }))

        if (uniqueFixes.length === 0) return
        setIsFixing(true)
        try {
            const result = await fixAuditIssues(tournamentId, uniqueFixes)
            toast.success(`Fixed ${result.fixed} athlete${result.fixed !== 1 ? 's' : ''}`, {
                description: result.details.map(d => `${d.playerName}: ${d.from} → ${d.to}`).join('\n'),
                duration: 8000,
            })
            // Re-run audit to refresh results
            await runAudit()
        } catch (err: any) {
            toast.error(err?.message || 'Failed to apply fixes')
        } finally {
            setIsFixing(false)
        }
    }

    const toggleCode = (code: string) => {
        setExpandedCodes(prev => {
            const next = new Set(prev)
            next.has(code) ? next.delete(code) : next.add(code)
            return next
        })
    }

    // Group issues by code
    const grouped = issues
        ? Object.entries(
            issues.reduce<Record<string, AuditIssue[]>>((acc, iss) => {
                ;(acc[iss.code] ||= []).push(iss)
                return acc
            }, {})
          ).sort(([a], [b]) => {
              const aHasError = issues.some(i => i.code === a && i.severity === 'error')
              const bHasError = issues.some(i => i.code === b && i.severity === 'error')
              return (bHasError ? 1 : 0) - (aHasError ? 1 : 0)
          })
        : []

    const errorCount   = issues?.filter(i => i.severity === 'error').length   ?? 0
    const warningCount = issues?.filter(i => i.severity === 'warning').length ?? 0
    const isClean      = issues !== null && issues.length === 0

    // Count unique fixable players
    const fixablePlayerIds = new Set(
        issues?.filter(i => i.fixable && i.suggestedCategoryId).map(i => i.playerId) ?? []
    )
    const fixableCount = fixablePlayerIds.size

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">

            {/* ── Header / trigger ───────────────────────────────── */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/60">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <ClipboardList size={15} className="text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Masterlist Audit</h3>
                        <p className="text-[11px] text-gray-400">Detect discrepancies across all registered athletes.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Summary badges */}
                    {issues !== null && (
                        <div className="flex items-center gap-1.5">
                            {isClean ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black">
                                    <CheckCircle2 size={11} /> All Clear
                                </span>
                            ) : (
                                <>
                                    {errorCount > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-xl text-[10px] font-black">
                                            <AlertCircle size={11} /> {errorCount} Error{errorCount !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {warningCount > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black">
                                            <AlertTriangle size={11} /> {warningCount} Warning{warningCount !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Fix All button — only when fixable issues exist */}
                    {fixableCount > 0 && (
                        <button
                            type="button"
                            onClick={handleFixAll}
                            disabled={isFixing || isRunning}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-emerald-500/20 hover:-translate-y-0.5"
                        >
                            {isFixing
                                ? <><Loader2 size={13} className="animate-spin" /> Fixing...</>
                                : <><Wrench size={13} /> Fix {fixableCount} Athlete{fixableCount !== 1 ? 's' : ''}</>
                            }
                        </button>
                    )}

                    {/* Run audit button */}
                    <button
                        type="button"
                        onClick={runAudit}
                        disabled={isRunning || isFixing}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-500/20 hover:-translate-y-0.5"
                    >
                        {isRunning
                            ? <><Loader2 size={13} className="animate-spin" /> Running...</>
                            : <><ShieldCheck size={13} /> {issues !== null ? 'Re-run Audit' : 'Run Audit'}</>
                        }
                    </button>

                    {/* Collapse toggle */}
                    {issues !== null && issues.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setIsOpen(o => !o)}
                            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        >
                            {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                    )}
                </div>
            </div>

            {/* ── All-clear state ─────────────────────────────────── */}
            {isClean && (
                <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                        <CheckCircle2 size={22} className="text-emerald-500" />
                    </div>
                    <p className="text-sm font-bold text-gray-700">No discrepancies found</p>
                    <p className="text-xs text-gray-400">All registered athletes passed the masterlist check.</p>
                </div>
            )}

            {/* ── Issues list ─────────────────────────────────────── */}
            {isOpen && issues !== null && issues.length > 0 && (
                <div className="divide-y divide-gray-50">
                    {grouped.map(([code, groupIssues]) => {
                        const isError = groupIssues[0].severity === 'error'
                        const expanded = expandedCodes.has(code)
                        const groupFixableCount = new Set(
                            groupIssues.filter(i => i.fixable).map(i => i.playerId)
                        ).size

                        return (
                            <div key={code}>
                                {/* Group header */}
                                <button
                                    type="button"
                                    onClick={() => toggleCode(code)}
                                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50/80 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        {isError
                                            ? <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                                            : <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                                        }
                                        <span className="text-sm font-bold text-gray-800">
                                            {CODE_LABEL[code] ?? code}
                                        </span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                            isError ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {groupIssues.length}
                                        </span>
                                        {/* Fixable badge */}
                                        {groupFixableCount > 0 && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                <Wrench size={9} /> {groupFixableCount} fixable
                                            </span>
                                        )}
                                    </div>
                                    {expanded
                                        ? <ChevronUp size={13} className="text-gray-400" />
                                        : <ChevronDown size={13} className="text-gray-400" />
                                    }
                                </button>

                                {/* Issue rows */}
                                {expanded && (
                                    <div className="bg-gray-50/40 border-t border-gray-100">
                                        {groupIssues.map(iss => (
                                            <div
                                                key={`${iss.playerId}-${iss.code}`}
                                                className="flex items-start gap-4 px-8 py-3 border-b border-gray-100 last:border-0"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-bold text-gray-900">{iss.playerName}</span>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${TYPE_BADGE[iss.categoryType] ?? 'bg-gray-100 text-gray-600'}`}>
                                                            {iss.categoryType}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{iss.categoryName}</p>
                                                    <p className={`text-xs mt-1 font-medium ${isError ? 'text-red-600' : 'text-amber-700'}`}>
                                                        {iss.message}
                                                    </p>

                                                    {/* Suggested category */}
                                                    {iss.fixable && iss.suggestedCategoryName && (
                                                        <div className="flex items-center gap-1.5 mt-1.5">
                                                            <ArrowRight size={11} className="text-emerald-500 flex-shrink-0" />
                                                            <span className="text-[11px] text-emerald-700 font-semibold">
                                                                Will move to: {iss.suggestedCategoryName}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
                                                    iss.fixable ? 'bg-emerald-400' : isError ? 'bg-red-500' : 'bg-amber-400'
                                                }`} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
