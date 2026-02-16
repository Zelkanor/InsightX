import Link from "next/link";

function timeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export const WatchlistNews = ({ news }: WatchlistNewsProps) => {
  if (!news || news.length === 0) return null;

  return (
    <section>
      <h2 className="watchlist-title mb-6">News</h2>
      <div className="watchlist-news">
        {news.map((article) => (
          <article key={article.id} className="news-item flex flex-col">
            {/* Symbol tag */}
            {article.related && (
              <span className="news-tag">{article.related}</span>
            )}

            {/* Headline */}
            <h3 className="news-title">{article.headline}</h3>

            {/* Meta */}
            <div className="news-meta">
              <span>{article.source}</span>
              <span className="mx-2">·</span>
              <span>{timeAgo(article.datetime)}</span>
            </div>

            {/* Summary */}
            <p className="news-summary">{article.summary}</p>

            {/* CTA */}
            <Link
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-cta mt-auto"
            >
              Read More →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
};
