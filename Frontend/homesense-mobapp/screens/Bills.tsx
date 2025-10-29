// Bills.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { BarChart, LineChart } from "react-native-chart-kit";
import { styles } from "./styles/BillsStyles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";
import regressionApi from "../utils/regressionApi";
import axios from "axios";

// Persistent deterministic randomness utilities
const getPersistentMultiplier = async (key: string): Promise<number> => {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored !== null) {
      return parseFloat(stored);
    }

    // Generate new random multiplier if not found
    const multiplier = Math.random() < 0.5 ? 0.95 : 1.05;
    await AsyncStorage.setItem(key, multiplier.toString());
    return multiplier;
  } catch (error) {
    console.log("Error with persistent multiplier:", error);
    // Fallback to random multiplier
    return Math.random() < 0.5 ? 0.95 : 1.05;
  }
};

const generateDayKey = (year: number, month: number, day: number): string => {
  return `multiplier-${year}-${month}-${day}`;
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const screenWidth = Dimensions.get("window").width;

type ViewType = "table" | "chart";

interface WeeklyRow {
  weekLabel: string; // e.g., 2025-10-06 to 2025-10-12
  rate: number; // PHP per kWh
  kwh: number; // weekly total
  bill: number; // computed bill
  extrapolated?: boolean; // whether this row is extrapolated
}

interface MonthDayKwh {
  date: string;
  total_kwh: number;
}

interface WeekBoundary {
  start: number;
  end: number;
  label: string;
}

interface BreakdownItem {
  label: string;
  kwh: number;
  extrapolated: boolean;
}

const Bills = () => {
  const currentMonthName = months[new Date().getMonth()];
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName);
  const [viewType, setViewType] = useState<ViewType>("table");
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const [rows, setRows] = useState<WeeklyRow[]>([]);
  const [totalBill, setTotalBill] = useState<number>(0);
  const [totalKwh, setTotalKwh] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ratePerKwh, setRatePerKwh] = useState<number>(0);
  const [modelAvailable, setModelAvailable] = useState<boolean | null>(null);
  const [monthDaily, setMonthDaily] = useState<MonthDayKwh[]>([]);
  const [weekBounds, setWeekBounds] = useState<WeekBoundary[]>([]);
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const [breakdownTitle, setBreakdownTitle] = useState<string>("");
  const [breakdownItems, setBreakdownItems] = useState<BreakdownItem[]>([]);
  const [hasFetchedData, setHasFetchedData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const computeTotal = (items: WeeklyRow[]) => {
    const sumBill = items.reduce((acc, r) => {
      const billVal =
        typeof r.bill === "number" && isFinite(r.bill) ? r.bill : 0;
      return acc + billVal;
    }, 0);

    const sumKwh = items.reduce(
      (acc, r) => acc + (typeof r.kwh === "number" ? r.kwh : 0),
      0
    );
    setTotalBill(sumBill);
    setTotalKwh(sumKwh);
  };

  const loadProviderRate = async () => {
    const provider = await AsyncStorage.getItem("electricityProvider");
    const p = (provider || "BATELEC").toUpperCase();
    if (p === "MERALCO") setRatePerKwh(7.6962);
    else setRatePerKwh(5.3874);
  };

  const getMonthIndex = (monthName: string) =>
    months.findIndex((m) => m === monthName);

  const getMonthDateRange = (monthName: string) => {
    const year = new Date().getFullYear();
    const monthIdx = getMonthIndex(monthName);
    const start = new Date(Date.UTC(year, monthIdx, 1));
    const now = new Date();
    const isCurrentMonth =
      now.getUTCFullYear() === year && now.getUTCMonth() === monthIdx;
    const endDate = isCurrentMonth
      ? new Date(Date.UTC(year, monthIdx, now.getUTCDate()))
      : new Date(Date.UTC(year, monthIdx + 1, 0));
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    return { start: fmt(start), end: fmt(endDate) };
  };

  // Build week boundaries within the month: 1-7, 8-14, 15-21, and 22-end
  const getWeekBoundaries = (year: number, monthIdx: number) => {
    const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
    const weeks: Array<{ start: number; end: number; label: string }> = [];
    const ranges = [
      { start: 1, end: Math.min(7, daysInMonth) },
      { start: 8, end: Math.min(14, daysInMonth) },
      { start: 15, end: Math.min(21, daysInMonth) },
      { start: 22, end: daysInMonth },
    ];
    ranges.forEach((r, idx) => {
      if (r.start <= r.end) weeks.push({ ...r, label: `Week ${idx + 1}` });
    });
    return weeks;
  };

  const fetchMonthlyAndEstimate = async () => {
    setLoading(true);
    try {
      // 🧠 Get household_id from AsyncStorage
      const storedUserData = await AsyncStorage.getItem("userData");
      if (!storedUserData) return undefined; // Explicitly return undefined

      const parsedUser = JSON.parse(storedUserData);
      const household_id = parsedUser.household_id;
      console.log("Household logged in,", household_id);

      if (!household_id) {
        console.warn("No household_id found in storage");
        return;
      }
      // 1) Fetch household daily totals for the selected month only
      const { start, end } = getMonthDateRange(selectedMonth);
      let arr: any[] = [];
      try {
        const res = await api.get("/energy/history/total_range", {
          params: { start, end, household_id: household_id },
          timeout: 5000, // optional: avoid hanging forever
        });

        arr = Array.isArray(res.data?.history || res.data?.data)
          ? res.data.history || res.data.data
          : [];
      } catch (apiErr) {
        console.warn("Error fetching current month data:", apiErr);
        arr = []; // fallback to empty array
      }
      const daily = arr.map((d: any) => ({
        date: d.date || d.day || d.timestamp || "",
        total_kwh:
          typeof d.total_kwh === "number"
            ? d.total_kwh
            : parseFloat(String(d.total_kwh)) || 0,
      }));

      setMonthDaily(daily);

      // 1b) Fetch last month's daily totals (for extrapolation)
      const now = new Date();
      const year = now.getUTCFullYear();
      const monthIdx = getMonthIndex(selectedMonth);
      const lastMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1;
      const lastMonthYear = monthIdx === 0 ? year - 1 : year;
      const lastMonthStart = new Date(Date.UTC(lastMonthYear, lastMonthIdx, 1))
        .toISOString()
        .split("T")[0];
      const lastMonthEnd = new Date(
        Date.UTC(lastMonthYear, lastMonthIdx + 1, 0)
      )
        .toISOString()
        .split("T")[0];

      let lastMonthDaily: MonthDayKwh[] = [];
      try {
        // 🧠 Get household_id from AsyncStorage
        const storedUserData = await AsyncStorage.getItem("userData");
        if (!storedUserData) return undefined; // Explicitly return undefined

        const parsedUser = JSON.parse(storedUserData);
        const household_id = parsedUser.household_id;

        if (!household_id) {
          console.warn("No household_id found in storage");
          return;
        }
        const lastRes = await api.get("/energy/history/total_range", {
          params: {
            start: lastMonthStart,
            end: lastMonthEnd,
            household_id: household_id,
          },
          timeout: 5000,
        });
        const lastArr = Array.isArray(
          lastRes.data?.history || lastRes.data?.data
        )
          ? lastRes.data.history || lastRes.data.data
          : [];
        lastMonthDaily = lastArr.map((d: any) => ({
          date: d.date || d.day || d.timestamp || "",
          total_kwh:
            typeof d.total_kwh === "number"
              ? d.total_kwh
              : parseFloat(String(d.total_kwh)) || 0,
        }));
      } catch (e) {
        // silent fail - we'll fallback to avg if needed
        console.log("Could not fetch last month data for extrapolation", e);
      }

      // 2) Prepare extrapolation inputs
      const daysInMonth = new Date(
        Date.UTC(year, monthIdx + 1, 0)
      ).getUTCDate();
      const isCurrentMonth =
        now.getUTCMonth() === monthIdx && now.getUTCFullYear() === year;
      const daysSoFar = isCurrentMonth ? now.getUTCDate() : daysInMonth;

      const totalKwhSoFar = daily.reduce(
        (acc: number, d: { date: string; total_kwh: number }) =>
          acc + (typeof d.total_kwh === "number" ? d.total_kwh : 0),
        0
      );
      const avgPerDay = daysSoFar > 0 ? totalKwhSoFar / daysSoFar : 0;

      // 3) Build weekly breakdown with extrapolation labels
      const weeks = getWeekBoundaries(year, monthIdx);
      setWeekBounds(weeks);

      // map day -> kwh for current month
      const dayToKwh: Record<number, number> = {};
      daily.forEach((d: { date: any; total_kwh: any }) => {
        const day = parseInt((d.date || "").split("-")[2] || "0", 10);
        if (!isNaN(day) && day > 0) {
          dayToKwh[day] =
            (dayToKwh[day] || 0) +
            (typeof d.total_kwh === "number" ? d.total_kwh : 0);
        }
      });

      // map day -> kwh for last month
      const lastMonthDayToKwh: Record<number, number> = {};
      lastMonthDaily.forEach((d) => {
        const day = parseInt((d.date || "").split("-")[2] || "0", 10);
        if (!isNaN(day) && day > 0) {
          lastMonthDayToKwh[day] =
            (lastMonthDayToKwh[day] || 0) +
            (typeof d.total_kwh === "number" ? d.total_kwh : 0);
        }
      });

      // get previous month's week boundaries to map positions within the week
      const prevWeeks = getWeekBoundaries(lastMonthYear, lastMonthIdx);

      type WeekCalc = { label: string; kwh: number; extrapolated: boolean };
      const weekCalcs: WeekCalc[] = await Promise.all(
        weeks.map(async (w, weekIndex) => {
          const totalDaysInWeek = w.end - w.start + 1;
          const observedEndDay = isCurrentMonth
            ? Math.min(w.end, daysSoFar)
            : w.end;
          const observedDays = Math.max(0, observedEndDay - w.start + 1);

          // observed kWh (only for observed days in the current month)
          let observedKwh = 0;
          const missingDayNumbers: number[] = []; // actual day numbers in current month which are missing
          for (let d = w.start; d <= w.end; d++) {
            if (d <= observedEndDay) {
              if (dayToKwh[d]) observedKwh += dayToKwh[d];
            } else {
              // day is missing in current month
              missingDayNumbers.push(d);
            }
          }

          // if no missing days -> fully observed
          if (missingDayNumbers.length === 0) {
            return { label: w.label, kwh: observedKwh, extrapolated: false };
          }

          // --- New missing-days extrapolation (based on last month, position mapped) ---
          let baseMissingKwh = 0;
          const prevWeek = prevWeeks[weekIndex]; // same week index in previous month
          if (prevWeek) {
            // map each missing day in current month to the corresponding day in prevWeek by position
            missingDayNumbers.forEach((curDay) => {
              const idxInWeek = curDay - w.start; // 0-based index within the week
              let prevDay = prevWeek.start + idxInWeek;
              // clamp prevDay to prevWeek.end if out of range
              if (prevDay > prevWeek.end) prevDay = prevWeek.end;
              // add last month day's kwh if present
              const prevVal = lastMonthDayToKwh[prevDay] || 0;
              baseMissingKwh += prevVal;
            });
          }

          // If baseMissingKwh is zero (no last-month data for these positions), fallback to avgPerDay
          let estimatedMissingKwh = 0;
          if (baseMissingKwh > 0) {
            // Use persistent deterministic randomness per day
            let totalMultipliedKwh = 0;
            for (const missingDay of missingDayNumbers) {
              const dayKey = generateDayKey(year, monthIdx + 1, missingDay);
              const dayMultiplier = await getPersistentMultiplier(dayKey);

              // Calculate this day's portion of the base missing kWh
              const dayPortion = baseMissingKwh / missingDayNumbers.length;
              totalMultipliedKwh += dayPortion * dayMultiplier;
            }
            estimatedMissingKwh = totalMultipliedKwh;
          } else {
            // fallback: use avg per day times missingDays
            estimatedMissingKwh = avgPerDay * missingDayNumbers.length;
          }

          const totalWeekKwh = observedKwh + estimatedMissingKwh;
          return { label: w.label, kwh: totalWeekKwh, extrapolated: true };
        })
      );

      const provider = await AsyncStorage.getItem("electricityProvider");
      const company = (provider || "BATELEC").toLowerCase();
      const providerRate = ratePerKwh;

      const weeklyRows: WeeklyRow[] = [];
      console.log(
        `📊 Starting bill prediction for ${company.toUpperCase()} with rate: ₱${providerRate}`
      );
      console.log(
        `🔗 Regression API URL: ${regressionApi.defaults.baseURL}/predict-bill`
      );

      // Connectivity check: 10s limit to determine if model is reachable
      const checkModelConnectivity = async (
        timeoutMs: number = 5000
      ): Promise<boolean> => {
        try {
          // Use the /health endpoint from your Flask regression API
          const source = axios.CancelToken.source();
          const timeout = setTimeout(() => source.cancel("Timeout"), timeoutMs);

          const resp = await regressionApi.get("/health", {
            cancelToken: source.token,
          });
          clearTimeout(timeout);

          if (resp.status === 200) {
            console.log(
              "✅ Regression model is reachable:",
              regressionApi.defaults.baseURL
            );
            return true;
          } else {
            console.warn(
              "⚠️ Regression model responded with non-200 status:",
              resp.status
            );
            return false;
          }
        } catch (error: any) {
          if (axios.isCancel(error)) {
            console.warn("⚠️ Regression model connectivity check timed out");
          } else {
            console.warn("❌ Model connectivity check failed:", error.message);
          }
          return false;
        }
      };

      const modelConnected = await checkModelConnectivity(10000);
      setModelAvailable(modelConnected);
      console.log(
        "🧪 Model connectivity:",
        modelConnected ? "reachable" : "unreachable (10s)"
      );

      for (const w of weekCalcs) {
        const weekKwh = Number(w.kwh.toFixed(6));
        let predictedBill: number | null = null;
        if (modelConnected) {
          try {
            const requestBody = {
              company,
              total_kwh: weekKwh,
              rate: providerRate,
            };
            console.log(
              `📤 Requesting prediction for ${w.label}: ${JSON.stringify(
                requestBody
              )}`
            );

            // No strict timeout here; if connected within 10s, allow slow predictions
            const resp = await regressionApi.post("/predict-bill", requestBody);

            console.log(`📥 Response status: ${resp.status}`);
            const dataPred = resp.data;
            console.log(`📥 Response data:`, dataPred);
            const modelBill =
              typeof dataPred?.predicted_consumption_price === "number"
                ? dataPred.predicted_consumption_price
                : parseFloat(String(dataPred?.predicted_consumption_price));
            if (isFinite(modelBill) && modelBill >= 0) {
              predictedBill = Number(modelBill.toFixed(2));
            } else {
              predictedBill = null; // mark as unavailable
            }
          } catch (e) {
            console.log(
              `⚠️ Prediction failed for ${w.label}, showing no prediction`,
              e
            );
            predictedBill = null; // mark as unavailable
          }
        } else {
          // No model reachable within 10s; skip prediction
          predictedBill = null;
        }

        weeklyRows.push({
          weekLabel: w.extrapolated ? `${w.label} (Extrapolated)` : w.label,
          rate: providerRate,
          kwh: Number((isFinite(weekKwh) ? weekKwh : 0).toFixed(3)),
          bill: typeof predictedBill === "number" ? predictedBill : NaN,
          extrapolated: w.extrapolated,
        });
      }

      setRows(weeklyRows);
      computeTotal(weeklyRows);
      setHasFetchedData(true);
      setFetchError(null);

      // Save bill data to AsyncStorage for MainMenu
      const billData = {
        totalBill: weeklyRows.reduce((sum, row) => sum + row.bill, 0),
        totalKwh: weeklyRows.reduce((sum, row) => sum + row.kwh, 0),
        ratePerKwh: providerRate,
        company: company,
        month: selectedMonth,
        timestamp: new Date().toISOString(),
        rows: weeklyRows,
      };
      await AsyncStorage.setItem("monthlyBillData", JSON.stringify(billData));
      // Set flag to notify MainMenu that bill data has been updated
      await AsyncStorage.setItem("billDataUpdated", new Date().toISOString());
      // Also set a specific flag for immediate MainMenu refresh
      await AsyncStorage.setItem("mainMenuRefreshNeeded", "true");
      console.log("💾 Bill data saved to AsyncStorage:", billData);
    } catch (err: any) {
      console.log("fetchMonthlyAndEstimate error", err);
      console.log("Error details:", JSON.stringify(err, null, 2));
      console.log("Error name:", err.name);
      console.log("Error message:", err.message);
      // Keep table visible if earlier steps succeeded; otherwise show generic error
      setModelAvailable(false);
      setFetchError(
        `Model unavailable or failed. Showing consumption without predictions.`
      );
    }
    setLoading(false);
  };

  const initLoad = async () => {
    await loadProviderRate();
    // Don't automatically fetch data - wait for user to click button
  };

  useEffect(() => {
    initLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when month filter changes (only if user has already fetched data)
  useEffect(() => {
    if (hasFetchedData) {
      fetchMonthlyAndEstimate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  // Recompute bills if rate changes (only if user has already fetched data)
  useEffect(() => {
    if (hasFetchedData && rows.length > 0) {
      // Re-fetch to get model-predicted bills with the new rate
      fetchMonthlyAndEstimate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratePerKwh]);

  const handleManualFetch = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // Load provider rate first to ensure it's set
      await loadProviderRate();

      // Small delay to ensure state is updated
      await new Promise((resolve) => setTimeout(resolve, 100));

      await fetchMonthlyAndEstimate();

      // Immediately notify MainMenu of the update
      await AsyncStorage.setItem("mainMenuRefreshNeeded", "true");
      console.log("🔄 Notified MainMenu of bill data update");
    } catch (err) {
      console.log("Manual fetch error", err);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProviderRate();
    await fetchMonthlyAndEstimate();
    // Notify MainMenu of the update
    await AsyncStorage.setItem("mainMenuRefreshNeeded", "true");
    console.log("🔄 Notified MainMenu of bill data update (refresh)");
    setRefreshing(false);
  };

  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  // Chart data preparation function
  const getChartData = () => {
    if (rows.length === 0) {
      return {
        labels: ["No Data"],
        datasets: [{ data: [0] }],
      };
    }

    const billData = rows.map((row) =>
      isFinite(row.bill) ? parseFloat(row.bill.toFixed(2)) : 0
    );
    const labels = rows.map((row) => {
      // Clean up the week label for chart display
      const cleanLabel = row.weekLabel.replace(" (Extrapolated)", "");
      return cleanLabel.length > 8 ? cleanLabel.slice(0, 8) + "…" : cleanLabel;
    });

    return {
      labels: labels,
      datasets: [{ data: billData }],
    };
  };

  // Chart configuration
  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#000",
    },
    propsForBackgroundLines: {
      strokeWidth: 1,
      stroke: "rgba(0, 0, 0, 0.2)",
      strokeDasharray: "0",
    },
    propsForLabels: {
      fontSize: 10,
    },
  };

  // Handle chart item press
  const handleChartItemPress = (index: number) => {
    if (rows[index]) {
      const weekLabel = rows[index].weekLabel.replace(" (Extrapolated)", "");
      handleWeekPress(weekLabel);
    }
  };

  const handleWeekPress = (label: string) => {
    try {
      const now = new Date();
      const year = now.getUTCFullYear();
      const monthIdx = getMonthIndex(selectedMonth);
      const daysInMonth = new Date(
        Date.UTC(year, monthIdx + 1, 0)
      ).getUTCDate();
      const isCurrentMonth =
        now.getUTCMonth() === monthIdx && now.getUTCFullYear() === year;
      const daysSoFar = isCurrentMonth ? now.getUTCDate() : daysInMonth;

      const wb = weekBounds.find((w) => w.label === label);
      if (!wb) return;

      // find corresponding row
      const weekRow = rows.find(
        (r) => r.weekLabel.replace(" (Extrapolated)", "") === label
      );
      if (!weekRow) return;

      const observedEndDay = isCurrentMonth
        ? Math.min(wb.end, daysSoFar)
        : wb.end;
      const dayToKwh: Record<number, number> = {};
      monthDaily.forEach((d) => {
        const dd = parseInt((d.date || "").split("-")[2] || "0", 10);
        if (!isNaN(dd) && dd > 0) {
          dayToKwh[dd] =
            (dayToKwh[dd] || 0) +
            (typeof d.total_kwh === "number" ? d.total_kwh : 0);
        }
      });

      const items: BreakdownItem[] = [];
      let totalObservedKwh = 0;

      // observed days
      for (let d = wb.start; d <= observedEndDay; d++) {
        const dateStr = `${year}-${pad2(monthIdx + 1)}-${pad2(d)}`;
        const kwhVal = dayToKwh[d] || 0;
        totalObservedKwh += kwhVal;
        items.push({
          label: dateStr,
          kwh: Number(kwhVal.toFixed(6)),
          extrapolated: false,
        });
      }

      // missing days -> group into single extrapolated entry
      if (observedEndDay < wb.end) {
        const totalDaysInWeek = wb.end - wb.start + 1;
        const observedDays = Math.max(0, observedEndDay - wb.start + 1);
        const missingDays = Math.max(0, totalDaysInWeek - observedDays);
        const extrapolatedTotal = Math.max(0, weekRow.kwh - totalObservedKwh);

        if (missingDays > 0 && extrapolatedTotal > 0) {
          const startRange = Math.max(wb.start, observedEndDay + 1);
          const endRange = wb.end;
          const rangeLabel = `${year}-${pad2(monthIdx + 1)}-${pad2(
            startRange
          )} to ${year}-${pad2(monthIdx + 1)}-${pad2(endRange)} (Extrapolated)`;
          items.push({
            label: rangeLabel,
            kwh: Number(extrapolatedTotal.toFixed(6)),
            extrapolated: true,
          });
        }
      }

      setBreakdownTitle(`${label} Details`);
      setBreakdownItems(items);
      setBreakdownVisible(true);
    } catch (e) {
      console.log("handleWeekPress error", e);
    }
  };

  return (
    <View style={styles.container}>
      {/* Page Title */}
      <Text style={styles.pageTitle}>Estimated Bills</Text>

      {/* Top Controls */}
      <View style={styles.topControls}>
        {/* Dropdown */}
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setDropdownVisible(true)}
          >
            <Text style={styles.dropdownText}>{selectedMonth}</Text>
            <Icon name="arrow-drop-down" size={22} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Toggle buttons group aligned right */}
        <View style={styles.toggleGroup}>
          {/* Table button */}
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: viewType === "table" ? "#000" : "#f1f1f1" },
            ]}
            onPress={() => setViewType("table")}
          >
            <Icon
              name="table-chart"
              size={22}
              color={viewType === "table" ? "#fff" : "#000"}
            />
            <Text
              style={[
                styles.toggleText,
                { color: viewType === "table" ? "#fff" : "#000" },
              ]}
            >
              Table
            </Text>
          </TouchableOpacity>

          {/* Chart button */}
          <TouchableOpacity
            style={[
              styles.toggleButton,
              styles.lastToggleButton,
              { backgroundColor: viewType === "chart" ? "#000" : "#f1f1f1" },
            ]}
            onPress={() => setViewType("chart")}
          >
            <Icon
              name="bar-chart"
              size={22}
              color={viewType === "chart" ? "#fff" : "#000"}
            />
            <Text
              style={[
                styles.toggleText,
                { color: viewType === "chart" ? "#fff" : "#000" },
              ]}
            >
              Chart
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Modal */}
      <Modal visible={dropdownVisible} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
          onPress={() => setDropdownVisible(false)}
          activeOpacity={1}
        >
          <View
            style={{
              marginHorizontal: 30,
              marginTop: 150,
              backgroundColor: "#fff",
              borderRadius: 10,
              paddingVertical: 10,
              elevation: 5,
            }}
          >
            <FlatList
              data={months}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 12 }}
                  onPress={() => {
                    setSelectedMonth(item);
                    setDropdownVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: "#000" }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {viewType === "table" ? (
          loading ? (
            <ActivityIndicator
              size="large"
              color="#000"
              style={{ marginTop: 20 }}
            />
          ) : !hasFetchedData ? (
            <View
              style={{
                alignItems: "center",
                marginTop: 50,
                paddingHorizontal: 20,
              }}
            >
              <Icon name="receipt" size={80} color="#ccc" />
              <Text
                style={{
                  fontSize: 18,
                  color: "#666",
                  marginTop: 20,
                  textAlign: "center",
                }}
              >
                No electricity bill loaded yet
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#999",
                  marginTop: 10,
                  textAlign: "center",
                }}
              >
                {fetchError ||
                  "Click the button below to generate your bill consumption to the model"}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: "#FFD700",
                  paddingHorizontal: 30,
                  paddingVertical: 15,
                  borderRadius: 25,
                  marginTop: 30,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onPress={handleManualFetch}
              >
                <Icon name="play-arrow" size={24} color="#000" />
                <Text
                  style={{
                    color: "#000",
                    fontSize: 16,
                    fontWeight: "bold",
                    marginLeft: 8,
                  }}
                >
                  {fetchError ? "Try Again" : "Start Fetching Bills"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    styles.tableCellBorder,
                    styles.weekColumn,
                  ]}
                >
                  Week
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    styles.tableCellBorder,
                    styles.rateColumn,
                  ]}
                >
                  Electricity Rate
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    styles.tableCellBorder,
                    styles.consumptionColumn,
                  ]}
                >
                  Weekly Consumption
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    styles.tableCellBorder,
                    styles.billColumn,
                  ]}
                >
                  Bill Estimation
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    styles.infoColumn,
                  ]}
                >
                  Info
                </Text>
              </View>

              {/* Table Rows for selected month only */}
              {rows.map((r, idx) => (
                <View key={`${r.weekLabel}-${idx}`} style={styles.tableRow}>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableCellBorder,
                      styles.weekColumn,
                    ]}
                  >
                    {r.weekLabel}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableCellBorder,
                      styles.rateColumn,
                    ]}
                  >
                    {r.rate.toFixed(2)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableCellBorder,
                      styles.consumptionColumn,
                    ]}
                  >{`${r.kwh.toFixed(3)} kWh`}</Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableCellBorder,
                      styles.billColumn,
                    ]}
                  >
                    {isFinite(r.bill) ? `₱${r.bill.toFixed(2)}` : "—"}
                  </Text>
                  <View style={[styles.tableCell, styles.infoColumn]}>
                    <TouchableOpacity
                      style={styles.infoButton}
                      onPress={() =>
                        handleWeekPress(
                          r.weekLabel.replace(" (Extrapolated)", "")
                        )
                      }
                    >
                      <Icon name="info" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Totals */}
              <View
                style={[
                  styles.totalContainer,
                  {
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  },
                ]}
              >
                <Text style={[styles.totalText, { marginRight: 12 }]}>
                  Total kWh:{" "}
                  <Text style={styles.totalAmount}>{`${totalKwh.toFixed(
                    3
                  )} kWh`}</Text>
                </Text>
                <Text style={styles.totalText}>
                  Total Bill:{" "}
                  <Text style={styles.totalAmount}>{`₱${totalBill.toFixed(
                    2
                  )}`}</Text>
                </Text>
              </View>
            </>
          )
        ) : loading ? (
          <ActivityIndicator
            size="large"
            color="#000"
            style={{ marginTop: 20 }}
          />
        ) : !hasFetchedData ? (
          <View
            style={{
              alignItems: "center",
              marginTop: 50,
              paddingHorizontal: 20,
            }}
          >
            <Icon name="bar-chart" size={80} color="#ccc" />
            <Text
              style={{
                fontSize: 18,
                color: "#666",
                marginTop: 20,
                textAlign: "center",
              }}
            >
              No bill data yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#999",
                marginTop: 10,
                textAlign: "center",
              }}
            >
              {fetchError ||
                "Click the button below to visualize your monthly bill consumption"}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#FFD700",
                paddingHorizontal: 30,
                paddingVertical: 15,
                borderRadius: 25,
                marginTop: 30,
                flexDirection: "row",
                alignItems: "center",
              }}
              onPress={handleManualFetch}
            >
              <Icon name="play-arrow" size={24} color="#000" />
              <Text
                style={{
                  color: "#000",
                  fontSize: 16,
                  fontWeight: "bold",
                  marginLeft: 8,
                }}
              >
                {fetchError ? "Try Again" : "Start Fetching Bills"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ alignItems: "center", marginTop: 20 }}>
            <BarChart
              data={getChartData()}
              width={screenWidth - 30}
              height={300}
              yAxisLabel="₱"
              yAxisSuffix=""
              chartConfig={chartConfig}
              style={{ borderRadius: 12, marginBottom: 20 }}
              fromZero
              showValuesOnTopOfBars
              withHorizontalLabels={true}
              withVerticalLabels={true}
            />
            {/* Touchable overlays for each bar */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                flexDirection: "row",
                justifyContent: "space-around",
                alignItems: "flex-end",
              }}
            >
              {getChartData().datasets[0].data.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    flex: 1,
                    height: 300,
                    marginHorizontal: 2,
                    backgroundColor: "transparent",
                  }}
                  onPress={() => handleChartItemPress(index)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Highlighted Bill */}
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>
            Estimated Bill for {selectedMonth}
          </Text>
          <Text style={styles.highlightAmount}>
            {hasFetchedData
              ? modelAvailable === false
                ? "No model detected"
                : `₱${totalBill.toFixed(2)}`
              : "No data available"}
          </Text>
        </View>

        {/* Forecast / Retry */}
        <View style={styles.forecastBox}>
          {modelAvailable === false ? (
            <TouchableOpacity
              onPress={handleManualFetch}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Icon name="refresh" size={28} color="#E67E22" />
              <Text style={[styles.forecastText, { marginLeft: 8 }]}>
                Retry fetching model
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <Icon name="trending-up" size={28} color="#2ecc71" />
              <Text style={styles.forecastText}>
                {hasFetchedData ? (
                  <>
                    If you keep this up, next month's bill will be{" "}
                    <Text style={styles.forecastAmount}>{`₱${(
                      totalBill * 1.03
                    ).toFixed(2)}`}</Text>
                  </>
                ) : (
                  "Fetch your bill data to see next month's forecast"
                )}
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* Breakdown Modal */}
      <Modal
        visible={breakdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBreakdownVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              width: "92%",
              maxHeight: "80%",
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#000" }}>
                {breakdownTitle}
              </Text>
              <TouchableOpacity onPress={() => setBreakdownVisible(false)}>
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "#eee",
                paddingTop: 12,
              }}
            >
              {/* Header Row */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: "#eee",
                }}
              >
                <Text style={{ color: "#555", fontWeight: "600" }}>
                  Day / Range
                </Text>
                <Text style={{ color: "#555", fontWeight: "600" }}>
                  Consumption
                </Text>
              </View>
              <ScrollView style={{ marginTop: 6 }}>
                {breakdownItems.map((it, i) => (
                  <View
                    key={`${it.label}-${i}`}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: "#f4f4f4",
                    }}
                  >
                    <Text style={{ color: "#000", flex: 1, marginRight: 12 }}>
                      {it.label}
                    </Text>
                    <Text
                      style={{
                        color: it.extrapolated ? "#E67E22" : "#000",
                        fontWeight: it.extrapolated ? "bold" : "normal",
                      }}
                    >{`${it.kwh.toFixed(3)} kWh`}</Text>
                  </View>
                ))}
              </ScrollView>
              {/* Footer total */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingTop: 12,
                }}
              >
                <Text style={{ color: "#000", fontWeight: "700" }}>
                  Week total
                </Text>
                <Text
                  style={{ color: "#000", fontWeight: "700" }}
                >{`${breakdownItems
                  .reduce((a, b) => a + b.kwh, 0)
                  .toFixed(3)} kWh`}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Bills;
