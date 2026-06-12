import type { ProductSearchResult } from "@shared/searchTypes";

import { TrendScoreExplain } from "@/components/intelligence/TrendScoreExplain";

import { Badge } from "@/components/ui/badge";

import { Card } from "@/components/ui/card";

import { AlertTriangle, Clock } from "lucide-react";



type Props = { product: ProductSearchResult };



export function ProductWhyPanel({ product }: Props) {

  const explanation = product.rankingExplanation;

  const lowConfidence = explanation?.confidence === "low";

  const staleFeatures = explanation?.staleFeatures;

  const signalRows = explanation?.signals?.length

    ? explanation.signals

    : explanation?.topSignals ?? [];



  return (

    <Card className="p-4 space-y-3">

      <div className="flex flex-wrap items-center gap-2">

        <h4 className="font-semibold text-sm">Why this product?</h4>

        {lowConfidence ? (

          <Badge variant="outline" className="text-[10px] gap-1">

            Low confidence

          </Badge>

        ) : null}

        {staleFeatures ? (

          <Badge variant="outline" className="text-[10px] gap-1">

            <Clock className="w-3 h-3" />

            Stale signals

          </Badge>

        ) : null}

        {product.inferredScores || explanation?.inferredScores ? (

          <Badge variant="outline" className="text-[10px] gap-1 text-amber-700 border-amber-300">

            <AlertTriangle className="w-3 h-3" />

            Estimated scores

          </Badge>

        ) : null}

      </div>

      {explanation?.summary ? (

        <p className="text-sm text-muted-foreground">{explanation.summary}</p>

      ) : product.rankReason ? (

        <p className="text-sm text-muted-foreground">{product.rankReason}</p>

      ) : null}

      {product.trendScoreInputs ? (

        <TrendScoreExplain inputs={product.trendScoreInputs} score={product.trendScore ?? 0} />

      ) : null}

      {signalRows.length ? (

        <ul className="text-xs space-y-1.5 text-muted-foreground">

          {signalRows.map((s) => (

            <li key={s.name} className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">

              <span className="text-foreground">{s.name}</span>

              <span className="tabular-nums">

                {s.score}/100 · weight {Math.round(s.weight * 100)}% · +{s.contribution.toFixed(1)}

              </span>

            </li>

          ))}

        </ul>

      ) : null}

    </Card>

  );

}

