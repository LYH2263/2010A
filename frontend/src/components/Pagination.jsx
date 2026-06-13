export default function Pagination({ currentPage, lastPage, total, onPageChange }) {
  if (lastPage <= 1) return null
  const prev = currentPage > 1 ? currentPage - 1 : null
  const next = currentPage < lastPage ? currentPage + 1 : null
  const showPages = () => {
    const pages = []
    let start = Math.max(1, currentPage - 2)
    let end = Math.min(lastPage, currentPage + 2)
    if (end - start < 4) {
      if (start === 1) end = Math.min(lastPage, start + 4)
      else end = Math.min(lastPage, end)
      start = Math.max(1, end - 4)
    }
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <p className="text-sm text-gray-500">
        共 {total} 条，第 {currentPage} / {lastPage} 页
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!prev}
          onClick={() => prev && onPageChange(prev)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        {showPages().map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-[2.25rem] px-2 py-1.5 rounded-lg border text-sm font-medium ${
              p === currentPage
                ? 'border-primary bg-primary text-white'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={!next}
          onClick={() => next && onPageChange(next)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </div>
    </div>
  )
}
