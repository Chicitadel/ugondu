/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Autopilot / Safety
 * File           : budget.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export interface Budget {
    maxCostPerExecution: number;
    dailyLimit: number;
    currency: string;
}

/**
 * @class BudgetManager
 * @description Safety controller enforcing autonomous execution cost limits.
 * @classification ENTERPRISE
 */
export class BudgetManager {
    private cumulativeSpentToday: number = 0;

    public checkBudget(estimatedCost: number, budget: Budget): boolean {
        if (estimatedCost > budget.maxCostPerExecution) {
            return false;
        }
        if (this.cumulativeSpentToday + estimatedCost > budget.dailyLimit) {
            return false;
        }
        return true;
    }

    public deductCost(actualCost: number): void {
        this.cumulativeSpentToday += Math.max(0, actualCost);
    }

    public getSpentToday(): number {
        return this.cumulativeSpentToday;
    }

    public resetDailyBudget(): void {
        this.cumulativeSpentToday = 0;
    }
}
