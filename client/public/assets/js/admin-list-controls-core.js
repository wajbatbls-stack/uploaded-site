(() => {
  function pagination(totalItems, requestedPage, perPage) {
    const count = Math.max(0, Number(totalItems) || 0);
    const size = Math.max(1, Number(perPage) || 1);
    const totalPages = Math.max(1, Math.ceil(count / size));
    const page = Math.min(Math.max(1, Number(requestedPage) || 1), totalPages);
    return Object.freeze({ page, totalPages, start: (page - 1) * size, end: page * size, hasPrevious: page > 1, hasNext: count > 0 && page < totalPages });
  }

  function filterRecords(records, searchTerm, filterValue) {
    const term = String(searchTerm || "").trim().toLocaleLowerCase("ar-SA");
    const selected = String(filterValue || "");
    return records.filter(record => {
      const text = String(record.searchText || "").toLocaleLowerCase("ar-SA");
      return (!term || text.includes(term)) && (!selected || String(record.filterValue || "") === selected);
    });
  }

  window.WajbatAdminListCore = Object.freeze({ pagination, filterRecords });
})();
