/** Sets the numbers inside a sentence in the mono face, so figures line up and read as live data. */
export function Nums({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(±?\d[\d.:,]*(?:×|%)?)/g);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        i % 2 ? (
          <span key={i} className="num">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </span>
  );
}
