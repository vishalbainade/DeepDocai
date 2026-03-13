const CitationBadge = ({ citation, onClick }) => {
  if (!citation) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => onClick?.(citation)}
      title={citation.preview || `Open page ${citation.page}`}
      className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 transition hover:border-amber-300 hover:bg-amber-100"
    >
      {`Page ${citation.page}`}
    </button>
  );
};

export default CitationBadge;
