'use client'

import { useState, useTransition } from 'react'
import { X, Save, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { createGuidelineTemplate, updateGuidelineTemplate } from '@/app/admin/actions/guidelines'

interface GuidelineTemplate {
    id: string
    name: string
    content: string | null
}

interface AdminGuidelineModalProps {
    template?: GuidelineTemplate | null
    onClose: () => void
    onSuccess: () => void
}

export default function AdminGuidelineModal({ template, onClose, onSuccess }: AdminGuidelineModalProps) {
    const [name, setName] = useState(template?.name || '')
    const [content, setContent] = useState(template?.content || '')
    const [isPending, startTransition] = useTransition()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        const formData = new FormData()
        formData.append('name', name)
        formData.append('content', content)
        if (template) {
            formData.append('id', template.id)
        }

        startTransition(async () => {
            const action = template ? updateGuidelineTemplate : createGuidelineTemplate
            const res = await action(formData)

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(`Template ${template ? 'updated' : 'created'} successfully`)
                onSuccess()
                onClose()
            }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900">
                        {template ? 'Edit Template' : 'Create New Template'}
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                    <div className="p-6 space-y-4 overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Standard Kyorugi Rules 2026"
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                required
                            />
                        </div>

                        <div className="flex-1 flex flex-col min-h-0">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Content (Markdown/Text)</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Enter the rules, regulations, or template content here..."
                                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none font-mono text-sm"
                            />
                            <p className="text-xs text-gray-400 mt-1">Supports basic text formatting.</p>
                        </div>
                    </div>

                    {/* Footer - Fixed at bottom */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 z-10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !name.trim()}
                            className="px-6 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {isPending ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {template ? 'Update Template' : 'Create Template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
