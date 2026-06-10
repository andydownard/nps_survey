import type Database from 'better-sqlite3';

interface SeedRow {
  score: number;
  comment: string;
  hoursAgo: number;
}

const SEED_ROWS: SeedRow[] = [
  // Commented rows (from prototype's COMMENTED array)
  { score: 10, comment: "Genuinely changed how I build. Shipped my first real app in week three.", hoursAgo: 3 },
  { score: 9,  comment: "The mentors are incredible — went from zero to deploying every single day.", hoursAgo: 6 },
  { score: 10, comment: "Best money I've spent on learning. The vibe-first approach just clicks.", hoursAgo: 24 },
  { score: 9,  comment: "Loved the project-based structure. Already told two friends to sign up.", hoursAgo: 30 },
  { score: 10, comment: "Felt like cheating — I'm building things I never thought I could.", hoursAgo: 48 },
  { score: 8,  comment: "Really enjoyed it overall, just wish the cohort had been a bit smaller.", hoursAgo: 4 },
  { score: 7,  comment: "Solid fundamentals. Would've loved more live pairing sessions.", hoursAgo: 50 },
  { score: 6,  comment: "Decent intro, but I expected more depth on deployment and tooling.", hoursAgo: 5 },
  { score: 5,  comment: "Good content, but the projects felt rushed and feedback was thin.", hoursAgo: 26 },
  { score: 3,  comment: "Pace was too fast and mentors were hard to reach when I got stuck.", hoursAgo: 75 },
  // Promoters without comments (25 rows, scores cycle 10/9/10/9/10)
  { score: 10, comment: '', hoursAgo: 1  },
  { score: 9,  comment: '', hoursAgo: 2  },
  { score: 10, comment: '', hoursAgo: 4  },
  { score: 9,  comment: '', hoursAgo: 7  },
  { score: 10, comment: '', hoursAgo: 11 },
  { score: 10, comment: '', hoursAgo: 15 },
  { score: 9,  comment: '', hoursAgo: 19 },
  { score: 10, comment: '', hoursAgo: 24 },
  { score: 9,  comment: '', hoursAgo: 48 },
  { score: 10, comment: '', hoursAgo: 72 },
  { score: 10, comment: '', hoursAgo: 96 },
  { score: 9,  comment: '', hoursAgo: 120 },
  { score: 10, comment: '', hoursAgo: 144 },
  { score: 9,  comment: '', hoursAgo: 8  },
  { score: 10, comment: '', hoursAgo: 12 },
  { score: 10, comment: '', hoursAgo: 18 },
  { score: 9,  comment: '', hoursAgo: 22 },
  { score: 10, comment: '', hoursAgo: 36 },
  { score: 9,  comment: '', hoursAgo: 60 },
  { score: 10, comment: '', hoursAgo: 84 },
  { score: 9,  comment: '', hoursAgo: 108 },
  { score: 10, comment: '', hoursAgo: 132 },
  { score: 9,  comment: '', hoursAgo: 156 },
  { score: 10, comment: '', hoursAgo: 168 },
  { score: 9,  comment: '', hoursAgo: 180 },
  // Passives without comments (9 rows, scores cycle 8/7/8/7/8)
  { score: 8,  comment: '', hoursAgo: 16 },
  { score: 7,  comment: '', hoursAgo: 32 },
  { score: 8,  comment: '', hoursAgo: 56 },
  { score: 7,  comment: '', hoursAgo: 80 },
  { score: 8,  comment: '', hoursAgo: 104 },
  { score: 7,  comment: '', hoursAgo: 128 },
  { score: 8,  comment: '', hoursAgo: 152 },
  { score: 7,  comment: '', hoursAgo: 176 },
  { score: 8,  comment: '', hoursAgo: 200 },
  // Detractors without comments (2 rows)
  { score: 6,  comment: '', hoursAgo: 40 },
  { score: 4,  comment: '', hoursAgo: 88 },
];

export function seedIfEmpty(db: Database.Database): void {
  const count = (db.prepare('SELECT COUNT(*) as n FROM responses').get() as { n: number }).n;
  if (count > 0) return;

  const insert = db.prepare(
    `INSERT INTO responses (score, comment, created_at)
     VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ? || ' hours'))`
  );

  const insertMany = db.transaction((rows: SeedRow[]) => {
    for (const row of rows) {
      insert.run(row.score, row.comment, String(-row.hoursAgo));
    }
  });

  insertMany(SEED_ROWS);
}
