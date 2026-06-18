import type { RiskTier } from "@prisma/client";
import { env } from "@/config/env";

const THRESHOLDS = {
	CRITICAL: env.ALERT_CRITICAL_THRESHOLD,
	DETENTION_RISK: env.ALERT_DETENTION_THRESHOLD,
	EARLY_WARNING: env.ALERT_EARLY_WARNING_THRESHOLD,
};

export function calculateRiskTier(percentage: number): RiskTier {
	if (percentage < THRESHOLDS.CRITICAL) return "CRITICAL";
	if (percentage < THRESHOLDS.DETENTION_RISK) return "DETENTION_RISK";
	if (percentage < THRESHOLDS.EARLY_WARNING) return "EARLY_WARNING";
	return "SAFE";
}

export function calculateClassesNeeded(
	attended: number,
	total: number,
	targetPercentage = 75,
): number {
	// How many consecutive classes must the student attend to reach target
	// Formula: (target * (total + x) / 100) <= (attended + x)
	// Solved: x = (target*total - 100*attended) / (100 - target)
	const needed = Math.ceil((targetPercentage * total - 100 * attended) / (100 - targetPercentage));
	return Math.max(0, needed);
}

export function calculateClassesCanMiss(
	attended: number,
	total: number,
	targetPercentage = 75,
): number {
	// How many more classes can the student miss and still stay above target
	// Formula: (attended) / (total + x) >= target/100
	// Solved: x = (attended * 100/target) - total
	const canMiss = Math.floor((attended * 100) / targetPercentage - total);
	return Math.max(0, canMiss);
}
