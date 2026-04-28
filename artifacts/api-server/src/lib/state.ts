/**
 * In-memory recommendation cache (rebuilt on demand) and small ephemeral state.
 */

export interface RouteRecommendation {
  id: string;
  shipmentId: string;
  label: string;
  viaHubIds: string[];
  viaHubNames: string[];
  etaDeltaHours: number;
  costDeltaUsd: number;
  carbonDeltaKg: number;
  riskAfter: number;
  justification: string;
}

const recommendationsByShipment = new Map<string, RouteRecommendation[]>();
const recommendationsById = new Map<string, RouteRecommendation>();

export function setRecommendations(
  shipmentId: string,
  recs: RouteRecommendation[],
): void {
  recommendationsByShipment.set(shipmentId, recs);
  for (const r of recs) {
    recommendationsById.set(r.id, r);
  }
}

export function getRecommendations(shipmentId: string): RouteRecommendation[] {
  return recommendationsByShipment.get(shipmentId) ?? [];
}

export function getRecommendationById(id: string): RouteRecommendation | undefined {
  return recommendationsById.get(id);
}

export function clearRecommendations(): void {
  recommendationsByShipment.clear();
  recommendationsById.clear();
}
