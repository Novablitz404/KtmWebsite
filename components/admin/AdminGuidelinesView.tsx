'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, FileText, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { deleteGuidelineTemplate } from '@/app/admin/actions/guidelines'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchGuidelineTemplates } from '@/app/admin/fetch'
import TableRowsSkeleton from '@/components/admin/TableRowsSkeleton'
import AdminGuidelineModal from '@/components/admin/AdminGuidelineModal'
import AdminGuidelineBuilder from '@/components/admin/AdminGuidelineBuilder'

interface GuidelineTemplate {
    id: string
    name: string
    content: string | null
    createdAt: Date
    updatedAt?: Date
}

interface AdminGuidelinesViewProps { }

const PAGE_SIZE = 10

export default function AdminGuidelinesView({ }: AdminGuidelinesViewProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<GuidelineTemplate | null>(null)
    const [builderTemplateId, setBuilderTemplateId] = useState<string | null>(null)
    const queryClient = useQueryClient()

    useMemo(() => {
        setCurrentPage(1)
    }, [searchQuery])

    const { data, isLoading } = useQuery({
        queryKey: ['admin-guidelines', currentPage, searchQuery],
        queryFn: () => fetchGuidelineTemplates(currentPage, PAGE_SIZE, searchQuery),
        placeholderData: keepPreviousData
    })

    const templates = data?.templates || []
    const totalPages = data?.totalPages || 1

    const handleEdit = (template: any) => {
        setEditingTemplate(template)
        setIsModalOpen(true)
    }

    const handleManageStructure = (id: string) => {
        setBuilderTemplateId(id)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return

        try {
            const res = await deleteGuidelineTemplate(id)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Template deleted')
                queryClient.invalidateQueries({ queryKey: ['admin-guidelines'] })
            }
        } catch (error) {
            toast.error('Failed to delete template')
        }
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingTemplate(null)
    }

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['admin-guidelines'] })
    }

    if (builderTemplateId) {
        return (
            <div className="h-full bg-gray-50 p-4 sm:p-6 lg:p-8 animate-in slide-in-from-right duration-300">
                <AdminGuidelineBuilder
                    templateId={builderTemplateId}
                    onClose={() => setBuilderTemplateId(null)}
                />
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <div className="flex-1 flex flex-col min-h-0 sm:p-6 sm:max-w-[1920px] sm:mx-auto w-full">

                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-4 sm:px-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Guideline Templates</h2>
                        <p className="text-sm text-gray-500 mt-1">Create and manage rule templates for tournaments.</p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search templates..."
                                className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => { setEditingTemplate(null); setIsModalOpen(true) }}
                            className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            New Template
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="flex-1 flex flex-col min-h-0 bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-200 overflow-hidden">
                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 relative">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Template Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview Content</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Created</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {isLoading && !data ? (
                                    <TableRowsSkeleton columns={4} />
                                ) : templates.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                                            No templates found. Create one to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    templates.map((template: any) => (
                                        <tr key={template.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-semibold text-gray-900 text-sm">{template.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-500 line-clamp-1 max-w-md">
                                                    {template.content || <span className="italic text-gray-400">No content added</span>}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(template.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleManageStructure(template.id)}
                                                        className="text-gray-500 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                                                        title="Manage Categories"
                                                    >
                                                        <Layers className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(template)}
                                                        className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Edit Template"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(template.id, template.name)}
                                                        className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Template"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white flex items-center justify-end">
                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={`p-2 rounded-lg transition-all ${currentPage === 1
                                    ? 'text-gray-300 cursor-not-allowed hidden'
                                    : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-gray-900 active:scale-95'
                                    }`}
                                title="Previous Page"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-1.5 px-3">
                                <span className="text-sm font-bold text-gray-900">Page {currentPage}</span>
                                <span className="text-xs text-gray-400 font-medium">of {Math.max(totalPages, 1)}</span>
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className={`p-2 rounded-lg transition-all ${currentPage === totalPages
                                    ? 'text-gray-300 cursor-not-allowed hidden'
                                    : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-gray-900 active:scale-95'
                                    }`}
                                title="Next Page"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {isModalOpen && (
                    <AdminGuidelineModal
                        template={editingTemplate}
                        onClose={handleCloseModal}
                        onSuccess={handleSuccess}
                    />
                )}
            </div>
        </div>
    )
}
