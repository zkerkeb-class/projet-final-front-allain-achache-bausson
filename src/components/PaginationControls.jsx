function PaginationControls({
  page,
  pageSize,
  pageSizeOptions = [12, 24, 48],
  totalItems,
  label = 'elements',
  showPageSize = true,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const start = totalItems ? ((page - 1) * pageSize) + 1 : 0
  const end = totalItems ? Math.min(page * pageSize, totalItems) : 0

  if (totalItems <= 0) {
    return null
  }

  return (
    <div className="pagination-bar">
      <div className="pagination-summary">
        {start}-{end} / {totalItems} {label}
      </div>
      <div className="pagination-actions">
        {showPageSize ? (
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} style={{ maxWidth: '110px' }}>
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option} / page</option>
            ))}
          </select>
        ) : null}
        <button className="btn small" type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Prec.
        </button>
        <span className="chip">Page {page} / {totalPages}</span>
        <button className="btn small" type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          Suiv.
        </button>
      </div>
    </div>
  )
}

export default PaginationControls
