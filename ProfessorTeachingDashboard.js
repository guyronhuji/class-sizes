const { useEffect, useMemo, useState } = React;

const LINE_COLORS = [
  "#5b8af5",
  "#f5a85b",
  "#5bf5a8",
  "#f55b6a",
  "#a85bf5",
  "#f5e05b",
  "#5bf5f5",
  "#f55bf5",
];

const LINE_STYLES = ["", "12 7", "4 5", "18 6 4 6", "2 6", "10 4 2 4", "20 8"];
const CHART_WIDTH = 960;
const CHART_HEIGHT = 350;
const CHART_PADDING = { top: 20, right: 20, bottom: 42, left: 56 };

function normalizeText(value) {
  return String(value || "").toLocaleLowerCase();
}

function compareHebrewNames(first, second) {
  return first.localeCompare(second, "he", {
    sensitivity: "base",
    ignorePunctuation: true,
    numeric: true,
  });
}

function formatAverage(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildCombinedData(selectedItems, dataSource) {
  const lineDefinitions = [];

  selectedItems.forEach((entityName, entityIndex) => {
    const seriesMap = dataSource[entityName];

    if (!seriesMap) {
      return;
    }

    Object.keys(seriesMap).forEach((seriesName, seriesIndex) => {
      lineDefinitions.push({
        id: `${entityName}__${seriesName}`,
        entityName,
        seriesName,
        label: `${entityName} · ${seriesName}`,
        color: LINE_COLORS[seriesIndex % LINE_COLORS.length],
        dash: LINE_STYLES[entityIndex % LINE_STYLES.length],
        yearlyCounts: seriesMap[seriesName],
      });
    });
  });

  const allYears = Array.from(
    new Set(
      lineDefinitions.flatMap((lineDefinition) =>
        Object.keys(lineDefinition.yearlyCounts).map((year) => Number(year))
      )
    )
  ).sort((first, second) => first - second);

  const chartData = allYears.map((year) => {
    const row = { year };

    lineDefinitions.forEach((lineDefinition) => {
      row[lineDefinition.id] = Object.prototype.hasOwnProperty.call(
        lineDefinition.yearlyCounts,
        String(year)
      )
        ? lineDefinition.yearlyCounts[year]
        : null;
    });

    return row;
  });

  const stats = lineDefinitions.map((lineDefinition) => {
    const values = Object.values(lineDefinition.yearlyCounts).map(Number);
    const totalStudents = values.reduce((sum, count) => sum + count, 0);

    return {
      id: lineDefinition.id,
      color: lineDefinition.color,
      dash: lineDefinition.dash,
      entityName: lineDefinition.entityName,
      seriesName: lineDefinition.seriesName,
      averageEnrollment: values.length ? totalStudents / values.length : 0,
      yearsTaught: values.length,
    };
  });

  return {
    chartData,
    lineDefinitions,
    stats,
  };
}

function buildLinePath(points) {
  if (!points.length) {
    return "";
  }

  return points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    )
    .join(" ");
}

function ChartTooltip({ tooltip }) {
  if (!tooltip) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-2xl border px-4 py-3 shadow-xl"
      style={{
        left: `${(tooltip.x / CHART_WIDTH) * 100}%`,
        top: `${(tooltip.y / CHART_HEIGHT) * 100}%`,
        transform: "translate(-50%, calc(-100% - 14px))",
        backgroundColor: "#181b24",
        borderColor: "#282d3e",
        color: "#e0e4ef",
      }}
    >
      <div className="mb-2 text-sm font-medium">Year {tooltip.year}</div>
      <div className="space-y-2 text-sm">
        {tooltip.entries.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="truncate" style={{ color: entry.color }}>
              {entry.name}
            </span>
            <span>{entry.value} students</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeriesLegend({ lineDefinitions }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {lineDefinitions.map((lineDefinition) => (
        <div key={lineDefinition.id} className="flex items-center gap-2 text-sm">
          <svg width="28" height="10" viewBox="0 0 28 10" aria-hidden="true">
            <line
              x1="1"
              x2="27"
              y1="5"
              y2="5"
              stroke={lineDefinition.color}
              strokeWidth="2.5"
              strokeDasharray={lineDefinition.dash || undefined}
              strokeLinecap="round"
            />
          </svg>
          <span style={{ color: "#c5cbe0" }}>{lineDefinition.label}</span>
        </div>
      ))}
    </div>
  );
}

function MultiEntityChart({ chartData, lineDefinitions }) {
  const [tooltip, setTooltip] = useState(null);

  const chartGeometry = useMemo(() => {
    const values = chartData.flatMap((row) =>
      lineDefinitions
        .map((lineDefinition) => row[lineDefinition.id])
        .filter((value) => value !== null && value !== undefined)
    );

    const yMax = values.length ? Math.max(...values) : 0;
    const innerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
    const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
    const xStep = chartData.length > 1 ? innerWidth / (chartData.length - 1) : 0;
    const safeMax = yMax > 0 ? yMax : 1;
    const yTickCount = 5;
    const yTicks = Array.from({ length: yTickCount }, (_, index) =>
      Math.round((safeMax * (yTickCount - 1 - index)) / (yTickCount - 1))
    );

    return { innerHeight, safeMax, xStep, yTicks };
  }, [chartData, lineDefinitions]);

  function getX(index) {
    return CHART_PADDING.left + chartGeometry.xStep * index;
  }

  function getY(value) {
    return (
      CHART_PADDING.top +
      chartGeometry.innerHeight * (1 - Number(value) / chartGeometry.safeMax)
    );
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-[350px] w-full overflow-visible"
        onMouseLeave={() => setTooltip(null)}
      >
        {chartGeometry.yTicks.map((tickValue) => {
          const y = getY(tickValue);

          return (
            <g key={tickValue}>
              <line
                x1={CHART_PADDING.left}
                x2={CHART_WIDTH - CHART_PADDING.right}
                y1={y}
                y2={y}
                stroke="#282d3e"
                strokeDasharray="3 3"
              />
              <text
                x={CHART_PADDING.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#a9b1c9"
              >
                {tickValue}
              </text>
            </g>
          );
        })}

        <line
          x1={CHART_PADDING.left}
          x2={CHART_PADDING.left}
          y1={CHART_PADDING.top}
          y2={CHART_HEIGHT - CHART_PADDING.bottom}
          stroke="#282d3e"
        />
        <line
          x1={CHART_PADDING.left}
          x2={CHART_WIDTH - CHART_PADDING.right}
          y1={CHART_HEIGHT - CHART_PADDING.bottom}
          y2={CHART_HEIGHT - CHART_PADDING.bottom}
          stroke="#282d3e"
        />

        {chartData.map((row, index) => (
          <text
            key={row.year}
            x={getX(index)}
            y={CHART_HEIGHT - CHART_PADDING.bottom + 20}
            textAnchor="middle"
            fontSize="12"
            fill="#a9b1c9"
          >
            {row.year}
          </text>
        ))}

        {lineDefinitions.map((lineDefinition) => {
          const points = chartData
            .map((row, rowIndex) => {
              const value = row[lineDefinition.id];

              if (value === null || value === undefined) {
                return null;
              }

              return {
                x: getX(rowIndex),
                y: getY(value),
                year: row.year,
                value,
              };
            })
            .filter(Boolean);

          return (
            <g key={lineDefinition.id}>
              <path
                d={buildLinePath(points)}
                fill="none"
                stroke={lineDefinition.color}
                strokeWidth="2.5"
                strokeDasharray={lineDefinition.dash || undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((point) => (
                <circle
                  key={`${lineDefinition.id}-${point.year}`}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={lineDefinition.color}
                  onMouseEnter={() =>
                    setTooltip({
                      x: point.x,
                      y: point.y,
                      year: point.year,
                      entries: [
                        {
                          color: lineDefinition.color,
                          name: lineDefinition.label,
                          value: point.value,
                        },
                      ],
                    })
                  }
                />
              ))}
            </g>
          );
        })}
      </svg>
      <ChartTooltip tooltip={tooltip} />
      <SeriesLegend lineDefinitions={lineDefinitions} />
    </div>
  );
}

function TeachingDashboardPage({
  dataSource,
  pageTitle,
  pageDescription,
  entityPluralLabel,
  selectionLabel,
  filterPlaceholder,
  seriesLabel,
  emptyMessage,
}) {
  const [filterValue, setFilterValue] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);

  const options = useMemo(
    () =>
      Object.keys(dataSource).sort((first, second) => compareHebrewNames(first, second)),
    [dataSource]
  );

  const visibleOptions = useMemo(() => {
    const query = normalizeText(filterValue.trim());

    return options
      .filter((option) =>
        query ? normalizeText(option).includes(query) : true
      );
  }, [filterValue, options]);

  const combinedData = useMemo(
    () => buildCombinedData(selectedItems, dataSource),
    [dataSource, selectedItems]
  );

  function updateSelection(event) {
    setSelectedItems(Array.from(event.target.selectedOptions, (option) => option.value));
  }

  return (
    <div
      className="min-h-screen w-full overflow-y-auto px-4 py-8 md:px-8"
      style={{
        backgroundColor: "#0f1117",
        color: "#e0e4ef",
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="./index.html"
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em]"
              style={{
                borderColor: "#282d3e",
                backgroundColor: "#181b24",
                color: "#98a2c3",
              }}
            >
              Back to landing page
            </a>
            <div
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em]"
              style={{
                borderColor: "#282d3e",
                backgroundColor: "#181b24",
                color: "#98a2c3",
              }}
            >
              Racah Institute of Physics · 2000-2026 · Lecture rows only
            </div>
          </div>

          <div className="space-y-2">
            <h1
              className="text-4xl leading-tight md:text-5xl"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {pageTitle}
            </h1>
            <p className="max-w-3xl text-sm md:text-base" style={{ color: "#a9b1c9" }}>
              {pageDescription}
            </p>
          </div>
        </header>

        <section
          className="rounded-3xl border p-5"
          style={{
            backgroundColor: "#181b24",
            borderColor: "#282d3e",
          }}
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(320px,380px)_1fr]">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="entity-filter">
                Filter options
              </label>
              <input
                id="entity-filter"
                type="text"
                value={filterValue}
                onChange={(event) => setFilterValue(event.target.value)}
                placeholder={filterPlaceholder}
                className="mb-4 w-full rounded-2xl border px-4 py-3 outline-none transition"
                style={{
                  backgroundColor: "#0f1117",
                  borderColor: "#282d3e",
                  color: "#e0e4ef",
                }}
              />

              <label className="mb-2 block text-sm font-medium" htmlFor="entity-select">
                {selectionLabel}
              </label>
              <select
                id="entity-select"
                multiple
                value={selectedItems}
                onChange={updateSelection}
                className="h-72 w-full rounded-2xl border px-3 py-3 outline-none"
                style={{
                  backgroundColor: "#0f1117",
                  borderColor: "#282d3e",
                  color: "#e0e4ef",
                }}
              >
                {visibleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-sm" style={{ color: "#98a2c3" }}>
                Use Cmd/Ctrl-click to select multiple {entityPluralLabel}.
              </p>
              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedItems([])}
                  className="mt-4 rounded-full border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "#181b24",
                    borderColor: "#282d3e",
                    color: "#e0e4ef",
                  }}
                >
                  Clear selection
                </button>
              )}
            </div>

            {combinedData.lineDefinitions.length === 0 ? (
              <div
                className="flex min-h-[360px] items-center justify-center rounded-2xl border px-6 text-center"
                style={{
                  backgroundColor: "#0f1117",
                  borderColor: "#282d3e",
                  color: "#98a2c3",
                }}
              >
                {emptyMessage}
              </div>
            ) : (
              <div
                className="rounded-2xl border p-4"
                style={{
                  backgroundColor: "#0f1117",
                  borderColor: "#282d3e",
                }}
              >
                <div className="mb-5 space-y-2">
                  <div
                    className="text-xs uppercase tracking-[0.24em]"
                    style={{ color: "#98a2c3" }}
                  >
                    Combined Plot
                  </div>
                  <h2
                    className="text-2xl md:text-3xl"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    {selectedItems.length} selected {entityPluralLabel}
                  </h2>
                </div>

                <MultiEntityChart
                  chartData={combinedData.chartData}
                  lineDefinitions={combinedData.lineDefinitions}
                />
              </div>
            )}
          </div>
        </section>

        {combinedData.lineDefinitions.length > 0 && (
          <section
            className="rounded-3xl border p-5"
            style={{
              backgroundColor: "#181b24",
              borderColor: "#282d3e",
            }}
          >
            <div className="mb-5 space-y-2">
              <div
                className="text-xs uppercase tracking-[0.24em]"
                style={{ color: "#98a2c3" }}
              >
                Course Summaries
              </div>
              <h2
                className="text-2xl md:text-3xl"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Course lines in the current comparison
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {combinedData.stats.map((stat) => (
                <div
                  key={stat.id}
                  className="rounded-2xl border p-4"
                  style={{
                    backgroundColor: "#0f1117",
                    borderColor: "#282d3e",
                  }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <svg width="28" height="10" viewBox="0 0 28 10" aria-hidden="true">
                      <line
                        x1="1"
                        x2="27"
                        y1="5"
                        y2="5"
                        stroke={stat.color}
                        strokeWidth="2.5"
                        strokeDasharray={stat.dash || undefined}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="text-sm font-medium">{stat.seriesName}</div>
                  </div>
                  <div
                    className="mb-2 text-xs uppercase tracking-[0.2em]"
                    style={{ color: "#98a2c3" }}
                  >
                    {stat.entityName}
                  </div>
                  <div className="space-y-1 text-sm" style={{ color: "#a9b1c9" }}>
                    <div>Average enrollment: {formatAverage(stat.averageEnrollment)}</div>
                    <div>Years taught: {stat.yearsTaught}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section
          className="rounded-3xl border p-5"
          style={{
            backgroundColor: "#181b24",
            borderColor: "#282d3e",
          }}
        >
          <div className="mb-2 text-sm font-medium">Chart rules</div>
          <div className="space-y-2 text-sm" style={{ color: "#a9b1c9" }}>
            <div>All selected {entityPluralLabel} appear on one shared plot.</div>
            <div>
              Color differentiates {seriesLabel}; line style differentiates the selected{" "}
              {entityPluralLabel}.
            </div>
            <div>
              {selectedItems.length} selected · {combinedData.lineDefinitions.length} visible
              lines
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-6 text-center"
      style={{
        backgroundColor: "#0f1117",
        color: "#e0e4ef",
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      Loading lecture enrollment data...
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-6 text-center"
      style={{
        backgroundColor: "#0f1117",
        color: "#f55b6a",
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      {message}
    </div>
  );
}

function App() {
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    window.dashboardDataReady
      .then(() => setStatus("ready"))
      .catch((error) => {
        setErrorMessage(error.message || "Failed to load dashboard data.");
        setStatus("error");
      });
  }, []);

  if (status === "loading") {
    return <LoadingState />;
  }

  if (status === "error") {
    return <ErrorState message={errorMessage} />;
  }

  return (
    <TeachingDashboardPage
      dataSource={window.TEACHER_DATA}
      pageTitle="Professor Teaching Dashboard"
      pageDescription="Select multiple professors from the list box and compare all of their courses on one shared chart."
      entityPluralLabel="professors"
      selectionLabel="Professors"
      filterPlaceholder="Filter professor names in Hebrew"
      seriesLabel="courses"
      emptyMessage="Select one or more professors from the box above to view their class enrollment history."
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
