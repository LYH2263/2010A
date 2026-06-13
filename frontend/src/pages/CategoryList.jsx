import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCategories, deleteCategory } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const PER_PAGE = 10

export default function CategoryList() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(1)

  const load = (p = page) => getCategories({ per_page: PER_PAGE, page: p }).then(setRes).catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load(page) }, [page])

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: '删除分类',
      message: `确定删除「${name}」？若分类下仍有关联商品将删除失败。`,
      confirmText: '确认删除',
      tone: 'danger',
    })
    if (!ok) return
    deleteCategory(id).then(() => { showToast('分类已删除', 'success'); load(page) }).catch((e) => showToast(e.message))
  }

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!res) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const list = res.data ?? res
  const total = res.total ?? list.length
  const currentPage = res.current_page ?? 1
  const lastPage = res.last_page ?? 1

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">分类列表</h1>
          <p className="text-gray-500 text-sm mt-0.5">管理商品分类，用于对商品进行归类展示与筛选</p>
        </div>
        <Link to="/categories/create" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium shrink-0">新增分类</Link>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无分类</p>
            <p className="text-sm mt-1">添加分类后，新建商品时可选择对应分类</p>
            <Link to="/categories/create" className="inline-block mt-4 text-primary hover:underline">去新增分类</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">标识</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">排序</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((c) => (
                    <tr key={c.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{c.id}</td>
                      <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.slug ?? '-'}</td>
                      <td className="px-4 py-3 text-sm">{c.sort_order}</td>
                      <td className="px-4 py-3 text-sm">
                        <Link to={'/categories/' + c.id + '/edit'} className="text-primary hover:underline">编辑</Link>
                        <button type="button" onClick={() => handleDelete(c.id, c.name)} className="text-red-600 hover:underline ml-2">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-sm text-gray-500">共 {total} 个分类</span>
            <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
          </div>
          </>
        )}
      </div>
    </div>
  )
}
