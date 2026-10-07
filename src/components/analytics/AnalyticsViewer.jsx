import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, PieChart, LineChart, Table as TableIcon, Download, Copy, Check, Sparkles, RefreshCw } from "lucide-react";

/**
 * Composant universel de visualisation dynamique Text-to-Viz (Apache ECharts).
 * Agnostique du domaine métier : rend n'importe quelle option ECharts et dataset tabulaire.
 */
export default function AnalyticsViewer({
  chartResponse,
  loading = false,
  onRefresh,
  height = "420px",
  className = ""
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [activeTab, setActiveTab] = useState("chart");
  const [selectedType, setSelectedType] = useState(null);
  const [copied, setCopied] = useState(false);

  const intent = chartResponse?.intent;
  const initialOption = chartResponse?.echarts_option;
  const aggregatedData = chartResponse?.aggregated_data || [];
  const insight = chartResponse?.summary_insight;

  // Type actif (initial ou surchargé par l'utilisateur)
  const currentChartType = selectedType || intent?.chart_type || "bar";

  // Charger la librairie ECharts dynamiquement si non présente
  useEffect(() => {
    let isMounted = true;

    async function initECharts() {
      if (!window.echarts) {
        // Injection script CDN si absent
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js";
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => { script.onload = resolve; });
      }

      if (!isMounted || !chartRef.current || !window.echarts) return;

      if (!chartInstance.current) {
        chartInstance.current = window.echarts.init(chartRef.current);
      }

      if (initialOption) {
        const option = adaptOption(initialOption, currentChartType);
        chartInstance.current.setOption(option, true);
        chartInstance.current.resize();
      }
    }

    initECharts();

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [initialOption, currentChartType, activeTab]);

  // Adapter le type de graphique à la volée côté client
  function adaptOption(baseOption, targetType) {
    if (!baseOption) return {};
    const cloned = JSON.parse(JSON.stringify(baseOption));

    if (targetType === "pie" || targetType === "doughnut") {
      const isDoughnut = targetType === "doughnut";
      if (cloned.xAxis) delete cloned.xAxis;
      if (cloned.yAxis) delete cloned.yAxis;
      if (cloned.grid) delete cloned.grid;

      cloned.tooltip = { trigger: "item", formatter: "{b}: {c} ({d}%)" };
      cloned.legend = { orient: "horizontal", bottom: 0 };

      // Adapter les séries
      const pieData = aggregatedData.map((row) => ({
        name: row._group_label || row[intent?.group_by?.[0]] || "Item",
        value: row[intent?.metrics?.[0]?.alias] || row.metric_value || 0
      }));

      cloned.series = [{
        type: "pie",
        radius: isDoughnut ? ["40%", "70%"] : "60%",
        data: pieData,
        label: { show: true, formatter: "{b}: {d}%" }
      }];
    } else if (targetType === "line" || targetType === "bar") {
      if (cloned.series) {
        cloned.series = cloned.series.map((s) => ({
          ...s,
          type: targetType,
          smooth: targetType === "line"
        }));
      }
    }

    return cloned;
  }

  // Télécharger le graphique en PNG
  const handleExportPNG = () => {
    if (!chartInstance.current) return;
    const url = chartInstance.current.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: "#ffffff"
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${intent?.title || "analytics-chart"}.png`;
    a.click();
  };

  // Copier l'option JSON
  const handleCopyJSON = () => {
    if (!initialOption) return;
    navigator.clipboard.writeText(JSON.stringify(initialOption, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Colonnes tabulaires
  const tableColumns = aggregatedData.length > 0 ? Object.keys(aggregatedData[0]).filter((k) => !k.startsWith("_")) : [];

  return (
    <Card className={`w-full shadow-sm border border-slate-200 dark:border-slate-800 ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {intent?.title || "Visualisation Analytique"}
              </CardTitle>
              {intent?.chart_type && (
                <Badge variant="outline" className="text-xs font-mono uppercase bg-slate-50">
                  {currentChartType}
                </Badge>
              )}
            </div>
            {intent?.subtitle && (
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {intent.subtitle}
              </CardDescription>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sélecteur de type rapide */}
            <div className="inline-flex rounded-md shadow-sm border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-900">
              <Button
                variant={currentChartType === "bar" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSelectedType("bar")}
                title="Graphique en barres"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={currentChartType === "line" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSelectedType("line")}
                title="Courbe d'évolution"
              >
                <LineChart className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={currentChartType === "pie" || currentChartType === "doughnut" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSelectedType(currentChartType === "doughnut" ? "pie" : "doughnut")}
                title="Graphique circulaire"
              >
                <PieChart className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Actions Export */}
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExportPNG}>
              <Download className="h-3.5 w-3.5" />
              PNG
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleCopyJSON}>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              JSON
            </Button>
            {onRefresh && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>

        {/* Bandeau Synthèse / Insight IA */}
        {insight && (
          <div className="mt-3 p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed">
              {insight}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-3">
            <TabsList className="grid w-48 grid-cols-2 h-8">
              <TabsTrigger value="chart" className="text-xs flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Graphique
              </TabsTrigger>
              <TabsTrigger value="table" className="text-xs flex items-center gap-1.5">
                <TableIcon className="h-3.5 w-3.5" />
                Données ({aggregatedData.length})
              </TabsTrigger>
            </TabsList>
            <span className="text-[11px] text-slate-400">
              {chartResponse?.execution_time_ms ? `${chartResponse.execution_time_ms} ms` : ""}
            </span>
          </div>

          <TabsContent value="chart" className="m-0 focus-visible:outline-none">
            <div
              ref={chartRef}
              style={{ width: "100%", height }}
              className="rounded-md flex items-center justify-center"
            >
              {!initialOption && (
                <p className="text-xs text-slate-400 italic">En attente de configuration graphique...</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="table" className="m-0 focus-visible:outline-none">
            {aggregatedData.length > 0 ? (
              <div className="rounded-md border border-slate-200 dark:border-slate-800 max-h-[380px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                      {tableColumns.map((col) => (
                        <TableHead key={col} className="text-xs font-semibold uppercase tracking-wider">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregatedData.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/40">
                        {tableColumns.map((col) => (
                          <TableCell key={col} className="text-xs font-mono py-2">
                            {typeof row[col] === "number" ? row[col].toLocaleString() : String(row[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Aucune donnée agrégée disponible.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
