import { useDarkColors, useIsDark } from '../utils/darkMode';

const ChatTable = ({ title, columns, rows }) => {
  const dc = useDarkColors();
  const isDark = useIsDark();
  // Graceful fallback if no data
  if (!rows || rows.length === 0) {
    return (
      <div className="my-4 p-6 rounded-xl text-center border transition-colors duration-300" style={{ backgroundColor: dc.bgSecondary, borderColor: dc.borderPrimary }}>
        <p className="text-sm font-medium transition-colors duration-300" style={{ color: dc.textMuted }}>No relevant structured data found in this document</p>
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
        <h3 className="text-lg font-semibold mb-4 transition-colors duration-300" style={{ color: dc.textPrimary }}>{title}</h3>
      )}
      <div className="rounded-xl overflow-hidden shadow-md transition-colors duration-300" style={{ border: `1px solid ${dc.borderPrimary}`, backgroundColor: dc.bgPrimary }}>
        <div className="w-full">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            {/* Sticky Header */}
            <thead className="sticky top-0 z-10" style={{ background: isDark ? 'linear-gradient(to right, #1e293b, #0f172a)' : 'linear-gradient(to right, #f8fafc, #f1f5f9)' }}>
              <tr style={{ borderBottom: `1px solid ${dc.borderPrimary}` }}>
                {finalColumns.map((column, index) => (
                  <th
                    key={index}
                    className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider break-words transition-colors duration-300"
                    style={{ color: dc.textPrimary }}
                  >
                    {column || `Column ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            {/* Table Body */}
            <tbody className="transition-colors duration-300">
              {normalizedRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="transition-colors border-b"
                  style={{ 
                    backgroundColor: rowIndex % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                    borderColor: dc.borderPrimary,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = dc.bgHover }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = rowIndex % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') }}
                >
                  {finalColumns.map((_, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-5 py-3.5 text-sm break-words transition-colors duration-300"
                      style={{ color: dc.textSecondary }}
                    >
                      {row[colIndex] || <span style={{ color: dc.textFaint }}>-</span>}
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

