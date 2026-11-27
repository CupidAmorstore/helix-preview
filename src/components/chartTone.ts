const UP = { line: '#4CC38A', top: 'rgba(76, 195, 138, 0.18)', bottom: 'rgba(76, 195, 138, 0)' };
const DOWN = { line: '#F07A6A', top: 'rgba(240, 122, 106, 0.18)', bottom: 'rgba(240, 122, 106, 0)' };

/** Chart line colour follows the direction of the period on screen (same rule as the red/green change label). */
export const chartTone = (first: number | null, last: number | null) => (first !== null && last !== null && last < first ? DOWN : UP);
