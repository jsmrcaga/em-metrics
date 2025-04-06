// Monthly
// - Assume 4 engineers
// - Assume 20 PRs
// -> 5 diffs/eng

// 1 / 4 = 0.25
// 0.25 * 20 = 5 diffs/eng

// Yearly
// Jan = 20 PRs 4 eng (5de)
// Feb = 22 PRs 5 eng (4.4de)
// Mar = 26 PRs 5 eng (5.2de)
// Quarter = 13.6de (counting 5 eng in the end) but (14.5714285714 with average engineer number)
// Yearly 54.4 de (counts 5 eng only) but (55.3220338983 with average eng number)

// Jan = 0.25 * 20 = 5
// Feb = 0.2 * 22 = 4.4
// Mar = 0.2 * 26 = 5.2
// Quarter = avg(rate) * PR count = 14.7333333333 (counts the 4 eng initially)
// Yearly = 55.5333333333 (takes into account January with 4 eng)

// So we can send 2 metrics
// PR rate = 1 / nb_engineers
// PR count = the number of PRs

// Advantage of using rate: we don't track PRs individually, but the "rate" per engineer
// This allows us to gather data that prevents tracking "per author"


