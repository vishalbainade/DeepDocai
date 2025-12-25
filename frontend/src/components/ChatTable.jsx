const ChatTable = ({ title, columns, rows }) => {
  // Graceful fallback if no data
  if (!rows || rows.length === 0) {
    return (
      <div className="my-4 p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
        <p className="text-sm text-slate-500 font-medium">No relevant structured data found in this document</p>
      </div>
    );
  }

  // Derive columns from first row if columns are missing or empty
  let finalColumns = columns;
  if (!finalColumns || finalColumns.length === 0) {
    // Use first row to determine column count
    const firstRow = rows[0] || [];
    const columnCount = firstRow.length;
    finalColumns = Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);
  }

  // Ensure all rows have the same number of columns
  const normalizedRows = rows.map(row => {
    const normalized = Array.isArray(row) ? [...row] : [];
    while (normalized.length < finalColumns.length) {
      normalized.push('');
    }
    return normalized.slice(0, finalColumns.length);
  });

  return (
    <div className="my-4">
      {title && (
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      )}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-md bg-white">
        <div className="w-full">
          <table className="w-full divide-y divide-slate-200">
            {/* Sticky Header */}
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-10">
              <tr>
                {finalColumns.map((column, index) => (
                  <th
                    key={index}
                    className="px-5 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200 break-words"
                  >
                    {column || `Column ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            {/* Table Body */}
            <tbody className="bg-white divide-y divide-slate-100">
              {normalizedRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`transition-colors hover:bg-slate-50 ${
                    rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  {finalColumns.map((_, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-5 py-3.5 text-sm text-slate-700 break-words"
                    >
                      {row[colIndex] || <span className="text-slate-400">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ChatTable;

