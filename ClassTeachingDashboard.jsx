const { useEffect, useMemo, useState } = React;
const {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} = Recharts;

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

function normalizeText(value) {
  return value.toLocaleLowerCase();
}

function formatAverage(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildPanelData(seriesMap) {
  const seriesNames = Object.keys(seriesMap);
  const allYears = Array.from(
    new Set(
      seriesNames.flatMap((seriesName) =>
        Object.keys(seriesMap[seriesName]).map((year) => Number(year))
      )
    )
  ).sort((first, second) => first - second);

  const chartData = allYears.map((year) => {
    const row = { year };

    seriesNames.forEach((seriesName) => {
      if (Object.prototype.hasOwnProperty.call(seriesMap[seriesName], String(year))) {
        row[seriesName] = seriesMap[seriesName][year];
      } else {
        row[seriesName] = null;
      }
    });

    return row;
  });

  const stats = seriesNames.map((seriesName) => {
    const values = Object.values(seriesMap[seriesName]).map(Number);
    const totalStudents = values.reduce((sum, count) => sum + count, 0);

    return {
      name: seriesName,
      averageEnrollment: values.length ? totalStudents / values.length : 0,
      yearsTaught: values.length,
    };
  });

  return {
    chartData,
    stats,
    seriesNames,
  };
}

function ChartTooltip({ active, label, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const visiblePayload = payload.filter(
    (entry) => entry.value !== null && entry.value !== undefined
  );

  if (!visiblePayload.length) {
    return null;
  }

  return (
    <div
      className="rounded-2xl border px-4 py-3 shadow-xl"
      style={{
        backgroundColor: "#181b24",
        borderColor: "#282d3e",
        color: "#e0e4ef",
      }}
    >
      <div className="mb-2 text-sm font-medium">Year {label}</div>
      <div className="space-y-2 text-sm">
        {visiblePayload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
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

function TeachingDashboardPage({
  dataSource,
  pageTitle,
  pageDescription,
  searchLabel,
  searchPlaceholder,
  headingLabel,
  seriesLabel,
  emptyMessage,
}) {
  const [searchValue, setSearchValue] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);

  const options = useMemo(
    () =>
      Object.keys(dataSource).sort((first, second) =>
        first.localeCompare(second, "he")
      ),
    [dataSource]
  );

  const filteredOptions = useMemo(() => {
    const query = normalizeText(searchValue.trim());
    const selectedSet = new Set(selectedItems);

    return options
      .filter((option) => !selectedSet.has(option))
      .filter((option) => normalizeText(option).includes(query))
      .slice(0, 12);
  }, [options, searchValue, selectedItems]);

  const panels = useMemo(
    () =>
      selectedItems
        .filter((selection) => dataSource[selection])
        .map((selection) => ({
          name: selection,
          ...buildPanelData(dataSource[selection]),
        })),
    [dataSource, selectedItems]
  );

  function addSelection(value) {
    setSelectedItems((current) =>
      current.includes(value) ? current : [...current, value]
    );
    setSearchValue("");
  }

  function removeSelection(value) {
    setSelectedItems((current) => current.filter((item) => item !== value));
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
          <div className="relative">
            <label className="mb-2 block text-sm font-medium" htmlFor="entity-search">
              {searchLabel}
            </label>
            <input
              id="entity-search"
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-2xl border px-4 py-3 outline-none transition"
              style={{
                backgroundColor: "#0f1117",
                borderColor: "#282d3e",
                color: "#e0e4ef",
              }}
            />

            {searchValue.trim() && (
              <div
                className="absolute left-0 right-0 z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border shadow-2xl"
                style={{
                  backgroundColor: "#181b24",
                  borderColor: "#282d3e",
                }}
              >
                {filteredOptions.length ? (
                  filteredOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => addSelection(option)}
                      className="block w-full border-b px-4 py-3 text-right text-sm transition last:border-b-0 hover:opacity-90"
                      style={{
                        borderColor: "#282d3e",
                        color: "#e0e4ef",
                      }}
                    >
                      {option}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm" style={{ color: "#98a2c3" }}>
                    No matches found.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedItems.map((selection) => (
              <button
                key={selection}
                type="button"
                onClick={() => removeSelection(selection)}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "#181b24",
                  borderColor: "#282d3e",
                  color: "#e0e4ef",
                }}
              >
                <span>{selection}</span>
                <span aria-hidden="true">✕</span>
              </button>
            ))}
          </div>
        )}

        {panels.length === 0 ? (
          <div
            className="flex min-h-[360px] items-center justify-center rounded-3xl border px-6 text-center"
            style={{
              backgroundColor: "#181b24",
              borderColor: "#282d3e",
              color: "#98a2c3",
            }}
          >
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-5">
            {panels.map((panel) => (
              <section
                key={panel.name}
                className="rounded-3xl border p-5"
                style={{
                  backgroundColor: "#181b24",
                  borderColor: "#282d3e",
                }}
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div
                      className="text-xs uppercase tracking-[0.24em]"
                      style={{ color: "#98a2c3" }}
                    >
                      {headingLabel}
                    </div>
                    <h2
                      className="text-2xl md:text-3xl"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {panel.name}
                    </h2>
                    <div className="text-sm" style={{ color: "#a9b1c9" }}>
                      {panel.seriesNames.length} {seriesLabel}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSelection(panel.name)}
                    className="rounded-full border px-3 py-2 text-sm"
                    style={{
                      backgroundColor: "#0f1117",
                      borderColor: "#282d3e",
                      color: "#e0e4ef",
                    }}
                    aria-label={`Remove ${panel.name}`}
                  >
                    ✕
                  </button>
                </div>

                <div className="w-full" style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={panel.chartData}
                      margin={{ top: 12, right: 20, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid
                        stroke="#282d3e"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="year"
                        tick={{ fill: "#a9b1c9", fontSize: 12 }}
                        axisLine={{ stroke: "#282d3e" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#a9b1c9", fontSize: 12 }}
                        axisLine={{ stroke: "#282d3e" }}
                        tickLine={false}
                        width={44}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{
                          color: "#e0e4ef",
                          paddingTop: 14,
                        }}
                      />
                      {panel.seriesNames.map((seriesName, index) => {
                        const color = LINE_COLORS[index % LINE_COLORS.length];

                        return (
                          <Line
                            key={seriesName}
                            type="monotone"
                            dataKey={seriesName}
                            name={seriesName}
                            stroke={color}
                            strokeWidth={2.5}
                            dot={{ r: 3, strokeWidth: 0, fill: color }}
                            activeDot={{ r: 5 }}
                            connectNulls
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {panel.stats.map((stat) => (
                    <div
                      key={stat.name}
                      className="rounded-2xl border p-4"
                      style={{
                        backgroundColor: "#0f1117",
                        borderColor: "#282d3e",
                      }}
                    >
                      <div className="mb-3 text-sm font-medium">{stat.name}</div>
                      <div className="space-y-1 text-sm" style={{ color: "#a9b1c9" }}>
                        <div>Average enrollment: {formatAverage(stat.averageEnrollment)}</div>
                        <div>Years taught: {stat.yearsTaught}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
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
      dataSource={window.CLASS_DATA}
      pageTitle="Class Teaching Dashboard"
      pageDescription="Follow each lecture across years and compare how different instructors taught that class over time."
      searchLabel="Search classes"
      searchPlaceholder="Type a class name in Hebrew"
      headingLabel="Class"
      seriesLabel="instructors"
      emptyMessage="Search for a class above to view its lecture enrollment history."
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
