/**
 * Temperature colours: one step per °C from −6 to 18, blue → green → yellow.
 * Used for today's range bar and the forecast range rows.
 */
const STEPS = [
	"#249df2",
	"#239dec",
	"#239fec",
	"#23a3eb",
	"#23a6eb",
	"#23a9e9",
	"#22abe6",
	"#22aee4",
	"#22b1e0",
	"#21b1dd",
	"#23b6da",
	"#28b8d6",
	"#2abdd3",
	"#2fbfcf",
	"#34c4cc",
	"#36c6c9",
	"#43c9c0",
	"#59c9b3",
	"#6fc9a3",
	"#82c992",
	"#98c985",
	"#a8c977",
	"#b9c762",
	"#c7c74d",
	"#d1be31",
];
const COLDEST = -6;

export function temperatureColor(celsius: number): string {
	const index = Math.max(
		0,
		Math.min(STEPS.length - 1, Math.round(celsius) - COLDEST),
	);
	return STEPS[index];
}
