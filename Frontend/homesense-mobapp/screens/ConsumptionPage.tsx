import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import { styles } from "./styles/ConsumptionPageStyles";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";
import { Swipeable } from "react-native-gesture-handler";
import { LineChart, BarChart } from "react-native-chart-kit";

type ConsumptionPageNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "ConsumptionPage"
>;

const timeRanges = ["Daily", "Weekly", "Monthly"];
const sortOptions = ["Date", "Appliance"];

interface Appliance {
  device_id: string;
  appliance_name: string;
  appliance_type: string;
  location: string;
}

interface ApplianceData {
  device_id: string;
  name: string;
  location: string;
  time: string;
  status: string;
  usage: string;
  week_start?: string;
  week_end?: string;
  timestamp?: string;
}

interface TotalEntry {
  label: string;
  usage: string;
}
const screenWidth = Dimensions.get("window").width;

const ConsumptionPage = () => {
  const navigation = useNavigation<ConsumptionPageNavProp>();
  const [selectedRange, setSelectedRange] = useState<
    "Daily" | "Weekly" | "Monthly"
  >("Daily");
  const [viewType, setViewType] = useState<"table" | "chart">("table");
  const [sortBy, setSortBy] = useState<"Date" | "Appliance">("Date");

  // Modals
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [applianceDropdownVisible, setApplianceDropdownVisible] =
    useState(false);
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);

  // Filter
  const [filterType, setFilterType] = useState<
    "all" | "individual" | "household"
  >("all");
  const [selectedAppliance, setSelectedAppliance] = useState<Appliance | null>(
    null
  );

  // Data
  const [appliances, setAppliances] = useState<ApplianceData[]>([]);
  const [registeredAppliances, setRegisteredAppliances] = useState<Appliance[]>(
    []
  );
  const [dailyStatus, setDailyStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalsData, setTotalsData] = useState<TotalEntry[]>([]);
  const [selectedDataPoint, setSelectedDataPoint] = useState<{
    time: string;
    location?: string;
    usage: string;
    name: string;
    week_start?: string;
    week_end?: string;
  } | null>(null);

  // Total usage state
  const [totalUsage, setTotalUsage] = useState<string>("0 kWh");
  const [loadingTotal, setLoadingTotal] = useState(false);

  // Helper function to get week range from week_start
  // Helper function to get fixed week range within a month
  const getWeekRange = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth();

    const startDay = date.getDate();

    let start: number, end: number;

    if (startDay >= 1 && startDay <= 7) {
      start = 1;
      end = 7;
    } else if (startDay >= 8 && startDay <= 14) {
      start = 8;
      end = 14;
    } else if (startDay >= 15 && startDay <= 21) {
      start = 15;
      end = 21;
    } else {
      start = 22;
      // get last day of month
      end = new Date(year, month + 1, 0).getDate();
    }

    const format = (d: number) => {
      const dd = d.toString().padStart(2, "0");
      const mm = (month + 1).toString().padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    };

    return {
      start: format(start),
      end: format(end),
    };
  };

  // Sort appliances data
  const sortAppliancesData = (data: ApplianceData[]) => {
    const sortedData = [...data];

    if (sortBy === "Date") {
      return sortedData.sort((a, b) => {
        const timeA = a.timestamp || a.time;
        const timeB = b.timestamp || b.time;
        return timeB.localeCompare(timeA);
      });
    } else if (sortBy === "Appliance") {
      return sortedData.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sortedData;
  };

  // Fetch registered appliances
  const fetchRegisteredAppliances = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem("userData");
      if (!storedUserData) return [];
      const parsedUser = JSON.parse(storedUserData);
      const household_id = parsedUser.household_id;

      const response = await api.get(
        `/appliances?household_id=${household_id}`
      );
      setRegisteredAppliances(response.data.appliances || []);
    } catch (err) {
      console.warn("Failed to load appliances:", err);
      setRegisteredAppliances([]);
    }
  };

  // Fetch total usage
  const fetchTotalUsage = async () => {
    setLoadingTotal(true);
    try {
      const storedUserData = await AsyncStorage.getItem("userData");
      if (!storedUserData) return;
      const parsedUser = JSON.parse(storedUserData);
      const household_id = parsedUser.household_id;
      console.log("Household logged in,", household_id);

      let endpoint = "";

      // For Weekly range, calculate calendar week total from daily data
      if (selectedRange === "Weekly") {
        const now = new Date();
        const year = now.getUTCFullYear();
        const monthIdx = now.getUTCMonth();
        const daysInMonth = new Date(
          Date.UTC(year, monthIdx + 1, 0)
        ).getUTCDate();

        // Determine current calendar week (Week 4 = days 22-end)
        let weekStartDay = 22;
        let weekEndDay = daysInMonth;
        const currentDay = now.getUTCDate();

        if (currentDay >= 1 && currentDay <= 7) {
          weekStartDay = 1;
          weekEndDay = 7;
        } else if (currentDay >= 8 && currentDay <= 14) {
          weekStartDay = 8;
          weekEndDay = 14;
        } else if (currentDay >= 15 && currentDay <= 21) {
          weekStartDay = 15;
          weekEndDay = 21;
        }

        const monthStart = new Date(Date.UTC(year, monthIdx, 1))
          .toISOString()
          .split("T")[0];
        const monthEnd = new Date(Date.UTC(year, monthIdx + 1, 0))
          .toISOString()
          .split("T")[0];

        try {
          if (filterType === "all" || filterType === "household") {
            // Fetch household daily totals
            const historyRes = await api.get("/energy/history/total_range", {
              params: { start: monthStart, end: monthEnd, household_id },
            });

            const arr = Array.isArray(
              historyRes.data?.history || historyRes.data?.data
            )
              ? historyRes.data.history || historyRes.data.data
              : [];

            let weekTotal = 0;
            arr.forEach((d: any) => {
              const dateStr = d.date || d.day || d.timestamp || "";
              if (dateStr) {
                const day = new Date(dateStr + "T00:00:00Z").getUTCDate();
                if (day >= weekStartDay && day <= weekEndDay) {
                  const kwh =
                    typeof d.total_kwh === "number"
                      ? d.total_kwh
                      : parseFloat(String(d.total_kwh)) || 0;
                  weekTotal += kwh;
                }
              }
            });

            setTotalUsage(`${weekTotal.toFixed(6)} kWh`);
            setLoadingTotal(false);
            return;
          } else if (selectedAppliance) {
            // Fetch individual appliance daily totals
            const historyRes = await api.get(
              `/energy/history/range/${selectedAppliance.device_id}`,
              {
                params: { start: monthStart, end: monthEnd, household_id },
              }
            );

            const arr = Array.isArray(
              historyRes.data?.history || historyRes.data?.data
            )
              ? historyRes.data.history || historyRes.data.data
              : [];

            let weekTotal = 0;
            arr.forEach((d: any) => {
              const dateStr = d.date || d.day || d.timestamp || "";
              if (dateStr) {
                const day = new Date(dateStr + "T00:00:00Z").getUTCDate();
                if (day >= weekStartDay && day <= weekEndDay) {
                  const kwh =
                    typeof d.total_kwh === "number"
                      ? d.total_kwh
                      : parseFloat(String(d.total_kwh)) || 0;
                  weekTotal += kwh;
                }
              }
            });

            setTotalUsage(`${weekTotal.toFixed(6)} kWh`);
            setLoadingTotal(false);
            return;
          }
        } catch (err) {
          console.warn(
            "Failed to fetch calendar week total, falling back to ISO week:",
            err
          );
          // Fall through to use ISO week endpoint as fallback
        }
      }

      if (filterType === "all") {
        // Total for all appliances
        if (selectedRange === "Daily") {
          endpoint = `/energy/daily/total?household_id=${household_id}`;
        } else if (selectedRange === "Weekly") {
          endpoint = `/energy/weekly/total?household_id=${household_id}&limit=1`;
        } else if (selectedRange === "Monthly") {
          endpoint = `/energy/monthly/total?household_id=${household_id}&limit=1`;
        }
      } else if (filterType === "household") {
        if (selectedRange === "Daily") {
          endpoint = `/energy/daily/total?household_id=${household_id}`;
        } else if (selectedRange === "Weekly") {
          endpoint = `/energy/weekly/total?household_id=${household_id}&limit=1`;
        } else if (selectedRange === "Monthly") {
          endpoint = `/energy/monthly/total?household_id=${household_id}&limit=1`;
        }
      } else if (selectedAppliance) {
        // Total for individual appliance
        if (selectedRange === "Daily") {
          endpoint = `/energy/daily/${selectedAppliance.device_id}?household_id=${household_id}`;
        } else if (selectedRange === "Weekly") {
          endpoint = `/energy/weekly/${selectedAppliance.device_id}?household_id=${household_id}&limit=1`;
        } else if (selectedRange === "Monthly") {
          endpoint = `/energy/monthly/${selectedAppliance.device_id}?household_id=${household_id}&limit=1`;
        }
      }
      if (endpoint) {
        const res = await api.get(endpoint);
        console.log("Total Usage Response:", res.data); // Debug log

        // Parse response based on endpoint type
        let total = 0;
        if (filterType === "all") {
          if (selectedRange === "Daily") {
            // Response: { total_kwh: number, ... }
            total =
              typeof res.data.total_kwh === "number"
                ? res.data.total_kwh
                : parseFloat(res.data.total_kwh) || 0;
          } else if (selectedRange === "Weekly") {
            // Response: { data: [{ week_start, week_end, weekly_total_kwh }] }
            const data = res.data.data || [];
            if (data.length > 0) {
              total =
                typeof data[0].weekly_total_kwh === "number"
                  ? data[0].weekly_total_kwh
                  : parseFloat(data[0].weekly_total_kwh) || 0;
            }
          } else if (selectedRange === "Monthly") {
            // Response: { data: [{ month, monthly_total_kwh }] }
            const data = res.data.data || [];
            if (data.length > 0) {
              total =
                typeof data[0].monthly_total_kwh === "number"
                  ? data[0].monthly_total_kwh
                  : parseFloat(data[0].monthly_total_kwh) || 0;
            }
          }
        } else if (filterType === "household") {
          setSelectedAppliance(null);
          if (selectedRange === "Daily") {
            // Response: { total_kwh: number, ... }
            total =
              typeof res.data.total_kwh === "number"
                ? res.data.total_kwh
                : parseFloat(res.data.total_kwh) || 0;
          } else if (selectedRange === "Weekly") {
            // Response: { data: [{ week_start, week_end, weekly_total_kwh }] }
            const data = res.data.data || [];
            if (data.length > 0) {
              total =
                typeof data[0].weekly_total_kwh === "number"
                  ? data[0].weekly_total_kwh
                  : parseFloat(data[0].weekly_total_kwh) || 0;
            }
          } else if (selectedRange === "Monthly") {
            // Response: { data: [{ month, monthly_total_kwh }] }
            const data = res.data.data || [];
            if (data.length > 0) {
              total =
                typeof data[0].monthly_total_kwh === "number"
                  ? data[0].monthly_total_kwh
                  : parseFloat(data[0].monthly_total_kwh) || 0;
            }
          }
        } else {
          // Individual appliance
          if (selectedRange === "Daily") {
            // Response: { total_kwh: number, ... }
            total =
              typeof res.data.total_kwh === "number"
                ? res.data.total_kwh
                : parseFloat(res.data.total_kwh) || 0;
          } else if (
            selectedRange === "Weekly" ||
            selectedRange === "Monthly"
          ) {
            // Response: { data: [{ total_kwh }] }
            const data = res.data.data || [];
            if (data.length > 0) {
              total =
                typeof data[0].total_kwh === "number"
                  ? data[0].total_kwh
                  : parseFloat(data[0].total_kwh) || 0;
            }
          }
        }

        console.log("Parsed Total:", total); // Debug log
        setTotalUsage(`${total.toFixed(6)} kWh`);
      } else {
        setTotalUsage("0 kWh");
      }
    } catch (error) {
      console.log("Error fetching total usage:", error);
      setTotalUsage("0 kWh");
    }
    setLoadingTotal(false);
  };

  // Fetch consumption data
  const fetchData = async () => {
    setLoading(true);
    try {
      const storedUserData = await AsyncStorage.getItem("userData");
      if (!storedUserData) return;
      const parsedUser = JSON.parse(storedUserData);
      const household_id = parsedUser.household_id;
      console.log("Household logged in,", household_id);

      // 🏠 If user selected "Household"
      if (filterType === "household") {
        if (selectedRange === "Daily") {
          const endpoint = `/energy/daily/total?household_id=${household_id}`;
          const res = await api.get(endpoint);
          const formatted = [
            {
              label: res.data.date || "N/A",
              usage:
                typeof res.data.total_kwh === "number"
                  ? `${res.data.total_kwh.toFixed(3)} kWh`
                  : `${parseFloat(res.data.total_kwh || 0).toFixed(3)} kWh`,
            },
          ];
          setTotalsData(formatted);
          setLoading(false);
          return;
        } else if (selectedRange === "Weekly") {
          // Fetch daily totals and group into calendar month-based weeks
          const now = new Date();
          const year = now.getUTCFullYear();
          const monthIdx = now.getUTCMonth();
          const daysInMonth = new Date(
            Date.UTC(year, monthIdx + 1, 0)
          ).getUTCDate();
          const monthStart = new Date(Date.UTC(year, monthIdx, 1))
            .toISOString()
            .split("T")[0];
          const monthEnd = new Date(Date.UTC(year, monthIdx + 1, 0))
            .toISOString()
            .split("T")[0];

          // Define calendar week boundaries (same as Bills.tsx)
          const weekBoundaries = [
            { start: 1, end: Math.min(7, daysInMonth) },
            { start: 8, end: Math.min(14, daysInMonth) },
            { start: 15, end: Math.min(21, daysInMonth) },
            { start: 22, end: daysInMonth },
          ];

          try {
            // Fetch daily household totals for the current month
            const historyRes = await api.get("/energy/history/total_range", {
              params: { start: monthStart, end: monthEnd, household_id },
            });

            const arr = Array.isArray(
              historyRes.data?.history || historyRes.data?.data
            )
              ? historyRes.data.history || historyRes.data.data
              : [];

            // Create a map of day -> total_kwh
            const dayToKwh: Record<number, number> = {};
            arr.forEach((d: any) => {
              const dateStr = d.date || d.day || d.timestamp || "";
              if (dateStr) {
                const day = new Date(dateStr + "T00:00:00Z").getUTCDate();
                if (!isNaN(day) && day > 0 && day <= 31) {
                  const kwh =
                    typeof d.total_kwh === "number"
                      ? d.total_kwh
                      : parseFloat(String(d.total_kwh)) || 0;
                  dayToKwh[day] = (dayToKwh[day] || 0) + kwh;
                }
              }
            });

            // Calculate totals for each calendar week
            const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
            const formatted = weekBoundaries
              .map((week) => {
                let weekTotal = 0;
                for (let day = week.start; day <= week.end; day++) {
                  if (dayToKwh[day]) {
                    weekTotal += dayToKwh[day];
                  }
                }

                const weekStartDate = `${year}-${pad2(monthIdx + 1)}-${pad2(
                  week.start
                )}`;
                const weekEndDate = `${year}-${pad2(monthIdx + 1)}-${pad2(
                  week.end
                )}`;

                return {
                  label: `${weekStartDate} - ${weekEndDate}`,
                  usage: `${weekTotal.toFixed(3)} kWh`,
                };
              })
              .reverse(); // newest last for better trend reading

            setTotalsData(formatted);
            setLoading(false);
            return;
          } catch (err) {
            console.warn(
              "Failed to fetch calendar week totals, falling back to ISO weeks:",
              err
            );
            // Fallback to ISO week endpoint
            const endpoint = `/energy/weekly/total?household_id=${household_id}&limit=4`;
            const res = await api.get(endpoint);
            const dataArr =
              res.data.data ||
              (Array.isArray(res.data) ? res.data : [res.data]);
            const formatted = dataArr.map((d: any) => ({
              label:
                d.date ||
                (d.week_start && d.week_end
                  ? `${d.week_start} - ${d.week_end}`
                  : d.month || "N/A"),
              usage: d.total_kwh
                ? `${d.total_kwh.toFixed(3)} kWh`
                : d.weekly_total_kwh
                ? `${d.weekly_total_kwh.toFixed(3)} kWh`
                : d.monthly_total_kwh
                ? `${d.monthly_total_kwh.toFixed(3)} kWh`
                : "0 kWh",
            }));
            setTotalsData(formatted.reverse());
            setLoading(false);
            return;
          }
        } else if (selectedRange === "Monthly") {
          const endpoint = `/energy/monthly/total?household_id=${household_id}`;
          const res = await api.get(endpoint);
          const dataArr =
            res.data.data || (Array.isArray(res.data) ? res.data : [res.data]);
          const formatted = dataArr.map((d: any) => ({
            label: d.month || d.date || "N/A",
            usage: d.monthly_total_kwh
              ? `${d.monthly_total_kwh.toFixed(3)} kWh`
              : d.total_kwh
              ? `${d.total_kwh.toFixed(3)} kWh`
              : "0 kWh",
          }));
          setTotalsData(formatted.reverse());
          setLoading(false);
          return;
        }
      }
      const applianceList =
        filterType === "all"
          ? registeredAppliances
          : selectedAppliance
          ? [selectedAppliance]
          : [];

      const requests = applianceList.map((appliance) => {
        let endpoint = "";
        if (selectedRange === "Daily")
          endpoint = `/energy/daily/${appliance.device_id}?household_id=${household_id}`;
        else if (selectedRange === "Weekly")
          endpoint = `/energy/weekly/${appliance.device_id}?household_id=${household_id}&limit=2`;
        else if (selectedRange === "Monthly")
          endpoint = `/energy/monthly/${appliance.device_id}?household_id=${household_id}`;
        return api.get(endpoint);
      });

      const responses = await Promise.all(requests);

      const allData: ApplianceData[] = [];

      // For Weekly range, fetch daily totals to recalculate calendar week totals
      if (selectedRange === "Weekly") {
        const now = new Date();
        const year = now.getUTCFullYear();
        const monthIdx = now.getUTCMonth();
        const monthStart = new Date(Date.UTC(year, monthIdx, 1))
          .toISOString()
          .split("T")[0];
        const monthEnd = new Date(Date.UTC(year, monthIdx + 1, 0))
          .toISOString()
          .split("T")[0];

        // Fetch daily history for each appliance using the history/range endpoint
        const dailyRequests = applianceList.map((appliance) => {
          return api
            .get(`/energy/history/range/${appliance.device_id}`, {
              params: {
                start: monthStart,
                end: monthEnd,
                household_id: household_id,
              },
            })
            .catch(() => null); // Handle errors gracefully
        });

        const dailyResponses = await Promise.all(dailyRequests);

        // Create a map of device_id -> day -> kwh for quick lookup
        const deviceDayToKwh: Record<string, Record<number, number>> = {};

        // Process individual appliance daily totals
        dailyResponses.forEach((dailyRes, i) => {
          if (!dailyRes || !dailyRes.data) return;

          const appliance = applianceList[i];
          if (!appliance) return;

          // Handle response format from /energy/history/range/{device_name}
          const dailyArr = Array.isArray(
            dailyRes.data.history || dailyRes.data.data
          )
            ? dailyRes.data.history || dailyRes.data.data
            : dailyRes.data.date
            ? [dailyRes.data]
            : [];

          if (!deviceDayToKwh[appliance.device_id]) {
            deviceDayToKwh[appliance.device_id] = {};
          }

          dailyArr.forEach((d: any) => {
            const dateStr = d.date || d.day || d.timestamp || "";
            if (dateStr) {
              // Parse the date and extract the day of month
              const day = new Date(dateStr + "T00:00:00Z").getUTCDate();
              if (!isNaN(day) && day > 0 && day <= 31) {
                const kwh =
                  typeof d.total_kwh === "number"
                    ? d.total_kwh
                    : parseFloat(String(d.total_kwh || d.kwh || 0)) || 0;
                deviceDayToKwh[appliance.device_id][day] =
                  (deviceDayToKwh[appliance.device_id][day] || 0) + kwh;
              }
            }
          });
        });

        // Process responses and recalculate calendar week totals
        responses.forEach((res, i) => {
          const appliance = applianceList[i];
          const dataArr = Array.isArray(res.data.history || res.data.data)
            ? res.data.history || res.data.data
            : [res.data];

          dataArr.forEach((d: any) => {
            let timeDisplay = "";
            let week_start = "";
            let week_end = "";
            let timestamp = "";
            let weekKwh = 0;

            if (d.week_start) {
              const weekRange = getWeekRange(d.week_start);
              timeDisplay = `${weekRange.start} to ${weekRange.end}`;
              week_start = weekRange.start;
              week_end = weekRange.end;
              timestamp = weekRange.start;

              // Recalculate total for the calendar week range
              const startDay = parseInt(
                weekRange.start.split("-")[2] || "0",
                10
              );
              const endDay = parseInt(weekRange.end.split("-")[2] || "0", 10);

              if (
                !isNaN(startDay) &&
                !isNaN(endDay) &&
                deviceDayToKwh[appliance.device_id]
              ) {
                for (let day = startDay; day <= endDay; day++) {
                  if (deviceDayToKwh[appliance.device_id][day]) {
                    weekKwh += deviceDayToKwh[appliance.device_id][day];
                  }
                }
              }

              // If no daily data found, fallback to original ISO week total
              if (weekKwh === 0) {
                weekKwh =
                  typeof d.total_kwh === "number"
                    ? d.total_kwh
                    : parseFloat(String(d.total_kwh || d.kwh || 0)) || 0;
              }
            } else {
              timeDisplay = d.date || d.month || "N/A";
              timestamp = d.date || d.month || "";
              weekKwh =
                typeof d.total_kwh === "number"
                  ? d.total_kwh
                  : parseFloat(String(d.total_kwh || d.kwh || 0)) || 0;
            }

            allData.push({
              device_id: appliance.device_id,
              name: appliance?.appliance_name || "Unknown",
              location: appliance?.location || "Unknown",
              time: timeDisplay,
              status: "N/A",
              usage: `${weekKwh.toFixed(3)} kWh`,
              week_start: week_start,
              week_end: week_end,
              timestamp: timestamp,
            });
          });
        });
      } else {
        // For Daily and Monthly, use original logic
        responses.forEach((res, i) => {
          const appliance = applianceList[i];
          const dataArr = Array.isArray(res.data.history || res.data.data)
            ? res.data.history || res.data.data
            : [res.data];

          dataArr.forEach((d: any) => {
            let timeDisplay = "";
            let week_start = "";
            let week_end = "";
            let timestamp = "";

            // For Daily and Monthly ranges
            timeDisplay = d.date || d.week_start || d.month || "N/A";
            timestamp = d.date || d.week_start || d.month || "";

            allData.push({
              device_id: appliance.device_id,
              name: appliance?.appliance_name || "Unknown",
              location: appliance?.location || "Unknown",
              time: timeDisplay,
              status: "N/A",
              usage: d.total_kwh
                ? `${d.total_kwh} kWh`
                : d.kwh
                ? `${d.kwh} kWh`
                : "0 kWh",
              week_start: week_start,
              week_end: week_end,
              timestamp: timestamp,
            });
          });
        });
      }

      // Sort the data based on current sort selection
      const sortedData = sortAppliancesData(allData);
      setAppliances(sortedData);

      // Fetch statuses if Daily
      if (selectedRange === "Daily") {
        const statusRes = await api.get(
          `/energy/summary?household_id=${household_id}`
        );
        const statusMap: Record<string, string> = {};
        statusRes.data.summary.forEach((item: any) => {
          statusMap[item.device_id] =
            item.status.toLowerCase() === "active" ? "ON" : "OFF";
        });
        setDailyStatus(statusMap);
      } else {
        setDailyStatus({});
      }
    } catch (error) {
      console.log("Error fetching appliance data:", error);
      setAppliances([]);
      setDailyStatus({});
    }
    setLoading(false);
  };

  const handleUnregister = async (device_id: string) => {
    Alert.alert(
      "Confirm Unregister",
      "Are you sure you want to unregister this appliance?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unregister",
          style: "destructive",
          onPress: async () => {
            try {
              const storedUserData = await AsyncStorage.getItem("userData");
              if (!storedUserData) return [];
              const parsedUser = JSON.parse(storedUserData);
              const household_id = parsedUser.household_id;
              await api.delete(
                `/appliances/${device_id}?household_id=${household_id}`
              );
              setRegisteredAppliances((prev) =>
                prev.filter((item) => item.device_id !== device_id)
              );
              setAppliances((prev) =>
                prev.filter((item) => item.device_id !== device_id)
              );
              Alert.alert("Success", "Appliance unregistered successfully");
            } catch (error) {
              console.warn("Error unregistering appliance:", error);
              Alert.alert("Error", "Failed to unregister appliance");
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRegisteredAppliances();
    await fetchData();
    await fetchTotalUsage();
    setRefreshing(false);
  };

  useEffect(() => {
    const loadAppliances = async () => {
      await fetchRegisteredAppliances(); // state update happens inside nested function
    };

    loadAppliances(); // call the nested function
  }, []);

  useEffect(() => {
    if (registeredAppliances.length === 0) return;

    const loadData = async () => {
      await fetchData();
      await fetchTotalUsage();
    };

    loadData(); // call the nested function
  }, [
    filterType,
    selectedAppliance,
    selectedRange,
    registeredAppliances,
    sortBy,
  ]);

  const renderRightActions = (device_id: string) => (
    <TouchableOpacity
      style={{
        backgroundColor: "red",
        justifyContent: "center",
        alignItems: "center",
        width: 80,
        height: "100%",
      }}
      onPress={() => handleUnregister(device_id)}
    >
      <Icon name="delete" size={24} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 12 }}>Delete</Text>
    </TouchableOpacity>
  );

  // Chart data and handlers
  const handleChartItemPress = (index: number) => {
    if (filterType === "household") {
      const total = totalsData[index];
      if (total) {
        setSelectedDataPoint({
          time: total.label, // use label for household
          usage: total.usage,
          name: "Household Total",
          location: "n/a", // optional, can show "Total" or leave blank
          // Remove appliance-specific fields like location, week_start, etc.
        });
      }
    } else {
      const appliance = appliances[index];
      if (appliance) {
        setSelectedDataPoint({
          time: appliance.time,
          location: appliance.location,
          usage: appliance.usage,
          name: appliance.name,
          week_start: appliance.week_start,
          week_end: appliance.week_end,
        });
      }
    }
  };

  // Close data summary
  const handleCloseDataSummary = () => {
    setSelectedDataPoint(null);
  };

  // Prepare chart data with proper handling for zero values
  const getChartData = () => {
    let usageData: number[] = [];
    let labels: string[] = [];

    if (filterType === "household") {
      // 🏠 Household total logic using totalsData
      usageData = totalsData.map((item) => {
        const value = parseFloat(item.usage.replace(" kWh", ""));
        return isNaN(value) ? 0 : parseFloat(value.toFixed(2));
      });

      labels = totalsData.map((item) => {
        if (selectedRange === "Weekly") {
          const parts = item.label.split(" - "); // split start and end
          if (parts.length === 2) {
            const start = new Date(parts[0]);
            const end = new Date(parts[1]);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              // Format as MM/DD–DD
              const startStr = `${start.getMonth() + 1}/${start.getDate()}`;
              const endStr = `${end.getDate()}`; // only day for end
              return `${startStr}–${endStr}`;
            }
          }
        }
        // Fallback for daily/monthly or invalid format
        return item.label;
      });

      // Handle case when totalsData is empty
      if (totalsData.length === 0) {
        usageData = [0];
        labels = ["No Data"];
      }
    } else {
      // 🔹 Keep your original appliances logic for non-household filters
      usageData = appliances.map((item) => {
        const usageValue = parseFloat(item.usage.replace(" kWh", ""));
        const safeValue = isNaN(usageValue) ? 0 : usageValue;
        return parseFloat(safeValue.toFixed(2));
      });

      labels = appliances.map((item) =>
        filterType === "all"
          ? item.name.length > 8
            ? item.name.slice(0, 8) + "…"
            : item.name
          : selectedRange === "Weekly" && item.week_start
          ? item.time.split(" to ")[0]
          : item.time
      );

      // Handle case when appliances is empty
      if (appliances.length === 0) {
        usageData = [0];
        labels = ["No Data"];
      }
    }
    console.log("Chart Labels:", labels);
    console.log("Chart Usage:", usageData);
    return {
      labels,
      datasets: [{ data: usageData }],
    };
  };

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

  // Custom chart component with touch handling and usage labels
  const renderChartWithTouch = () => {
    const chartData = getChartData();

    if (filterType === "all") {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ paddingHorizontal: 15 }}
        >
          <View style={{ flexDirection: "row" }}>
            <BarChart
              data={chartData}
              width={Math.max(chartData.labels.length * 80, screenWidth - 30)} // Dynamic width
              height={320}
              yAxisLabel=""
              yAxisSuffix=" kWh"
              chartConfig={chartConfig}
              style={{ borderRadius: 12, marginBottom: 40 }}
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
              {chartData.datasets[0].data.map((_, index) => (
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
        </ScrollView>
      );
    } else {
      return (
        <View>
          <LineChart
            data={chartData}
            width={screenWidth - 30}
            height={320}
            yAxisLabel=""
            yAxisSuffix=" kWh"
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: 12, marginBottom: 40 }}
            fromZero
            withHorizontalLabels={true}
            withVerticalLabels={true}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={true}
            withHorizontalLines={true}
            decorator={() => {
              return (
                <View>
                  {chartData.datasets[0].data.map((value, index) => {
                    // Use the right source based on filterType
                    const sourceItem =
                      filterType === "household"
                        ? totalsData[index]
                        : appliances[index];

                    if (!sourceItem) return null;

                    // Calculate x position for the dot
                    const xPosition =
                      (index * (screenWidth - 250)) /
                        (chartData.labels.length - 1) +
                      97;

                    // Calculate y position for the dot (inverted because chart coordinates start from top)
                    const maxDataValue = Math.max(
                      ...chartData.datasets[0].data
                    );
                    const chartHeight = 250;
                    const paddingTop = 50;

                    let yPosition;
                    if (maxDataValue === 0) {
                      yPosition = paddingTop + chartHeight - 10; // Bottom of chart for zero values
                    } else {
                      yPosition =
                        paddingTop +
                        chartHeight -
                        (value * chartHeight) / maxDataValue;
                    }

                    // Adjust y position for label placement (above the dot)
                    const labelYPosition = yPosition - 63;

                    // Get the usage string from the correct data source
                    const fullUsage = sourceItem.usage;

                    return (
                      <View
                        key={index}
                        style={{
                          position: "absolute",
                          left: xPosition - 25,
                          top: labelYPosition,
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          paddingHorizontal: 6,
                          paddingVertical: 3,
                          borderRadius: 4,
                          minWidth: 50,
                          alignItems: "center",
                          zIndex: 1000,
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontSize: 10,
                            fontWeight: "bold",
                          }}
                        >
                          {`${parseFloat(fullUsage.replace(" kWh", "")).toFixed(
                            2
                          )} kWh`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            }}
          />
          {/* Touchable overlays for data points */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              flexDirection: "row",
              justifyContent: "space-around",
            }}
          >
            {chartData.datasets[0].data.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  flex: 1,
                  height: 320,
                  marginHorizontal: 2,
                  backgroundColor: "transparent",
                }}
                onPress={() => handleChartItemPress(index)}
              />
            ))}
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Appliance Records</Text>

      {/* Top Controls */}
      <View style={styles.topControls}>
        {/* Time Range and Sort Column */}
        <View style={styles.timeSortColumn}>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setDropdownVisible(true)}
            >
              <Text style={styles.dropdownText}>{selectedRange}</Text>
              <Icon name="arrow-drop-down" size={22} color="#000" />
            </TouchableOpacity>
            {/* Only show Sort button if filter is NOT household */}
            {filterType !== "household" && (
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => setSortDropdownVisible(true)}
              >
                <Icon name="swap-vert" size={17} color="#000" />
                <Text style={styles.sortButtonText}>Sort</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

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

        <TouchableOpacity
          style={[
            styles.toggleButton,
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

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterVisible(true)}
        >
          <Icon name="filter-list" size={17} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Time Range Dropdown Modal */}
      <Modal visible={dropdownVisible} transparent animationType="fade">
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
            onPress={() => setDropdownVisible(false)}
          />
          <View
            style={{
              position: "absolute",
              top: 150,
              left: 30,
              right: 30,
              backgroundColor: "#fff",
              borderRadius: 10,
              paddingVertical: 10,
              elevation: 5,
            }}
          >
            <FlatList
              data={timeRanges}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 12 }}
                  onPress={() => {
                    setSelectedRange(item as "Daily" | "Weekly" | "Monthly");
                    setDropdownVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: "#000" }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterVisible} transparent animationType="fade">
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
            onPress={() => setFilterVisible(false)}
          />
          <View
            style={{
              position: "absolute",
              top: 150,
              left: 30,
              right: 30,
              backgroundColor: "#fff",
              borderRadius: 10,
              paddingVertical: 10,
              elevation: 5,
            }}
          >
            <TouchableOpacity
              style={{ padding: 12 }}
              onPress={() => {
                setFilterType("all");
                setFilterVisible(false);
              }}
            >
              <Text style={{ fontSize: 16, color: "#000" }}>
                Show All Appliances
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ padding: 12 }}
              onPress={() => {
                setFilterType("individual");
                setSelectedAppliance(null);
                setFilterVisible(false);
              }}
            >
              <Text style={{ fontSize: 16, color: "#000" }}>
                Show Individual Appliance
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ padding: 12 }}
              onPress={() => {
                setFilterType("household");
                setFilterVisible(false);
              }}
            >
              <Text style={{ fontSize: 16, color: "#000" }}>
                Show Household Total
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Individual Appliance Dropdown Modal */}
      <Modal
        visible={applianceDropdownVisible}
        transparent
        animationType="fade"
      >
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
            onPress={() => setApplianceDropdownVisible(false)}
          />
          <View
            style={{
              position: "absolute",
              top: 200,
              left: 30,
              right: 30,
              backgroundColor: "#fff",
              borderRadius: 10,
              paddingVertical: 10,
              elevation: 5,
            }}
          >
            <FlatList
              data={registeredAppliances}
              keyExtractor={(item) => item.device_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 12 }}
                  onPress={() => {
                    setSelectedAppliance(item);
                    setApplianceDropdownVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: "#000" }}>
                    {item.appliance_name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Sort Dropdown Modal */}
      <Modal visible={sortDropdownVisible} transparent animationType="fade">
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
            onPress={() => setSortDropdownVisible(false)}
          />
          <View
            style={{
              position: "absolute",
              top: 150,
              left: 30,
              right: 30,
              backgroundColor: "#fff",
              borderRadius: 10,
              paddingVertical: 10,
              elevation: 5,
            }}
          >
            <FlatList
              data={sortOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 12 }}
                  onPress={() => {
                    setSortBy(item as "Date" | "Appliance");
                    setSortDropdownVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: "#000" }}>
                    Sort by {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filterType === "all" ? (
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              marginBottom: 8,
              color: "#000",
            }}
          >
            All Appliances
          </Text>
        ) : filterType === "household" ? (
          // 🏠 Case 2: Household — no dropdown
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              marginBottom: 8,
              color: "#000",
            }}
          >
            Household Total
          </Text>
        ) : (
          <View style={{ marginBottom: 8 }}>
            <TouchableOpacity
              style={[styles.dropdownButton, { minWidth: 160 }]}
              onPress={() => setApplianceDropdownVisible(true)}
            >
              <Text style={styles.dropdownText}>
                {selectedAppliance
                  ? selectedAppliance.appliance_name
                  : "Select Appliance"}
              </Text>
              <Icon name="arrow-drop-down" size={22} color="#000" />
            </TouchableOpacity>
          </View>
        )}

        {/* Selected Data Point Info */}
        {viewType === "chart" && selectedDataPoint && (
          <View style={[styles.dataPointStyle]}>
            {/* Close Button */}
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "rgba(0, 0, 0, 0.1)",
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={handleCloseDataSummary}
            >
              <Icon name="close" size={18} color="#000" />
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 14,
                fontWeight: "bold",
                color: "#000",
                marginRight: 30,
              }}
            >
              Data Summary:
            </Text>
            {filterType === "all" && (
              <Text style={{ fontSize: 12, color: "#000" }}>
                Appliance: {selectedDataPoint.name}
              </Text>
            )}
            <Text style={{ fontSize: 12, color: "#000" }}>
              {selectedRange === "Weekly" &&
              selectedDataPoint.week_start &&
              selectedDataPoint.week_end
                ? `Week: ${selectedDataPoint.week_start} to ${selectedDataPoint.week_end}`
                : `Date: ${selectedDataPoint.time}`}
            </Text>
            <Text style={{ fontSize: 12, color: "#000" }}>
              Location: {selectedDataPoint.location}
            </Text>
            <Text style={{ fontSize: 12, color: "#000" }}>
              Usage: {selectedDataPoint.usage}
            </Text>
          </View>
        )}

        {/* Table or Chart */}
        {viewType === "table" ? (
          loading ? (
            <ActivityIndicator
              size="large"
              color="#000"
              style={{ marginTop: 20 }}
            />
          ) : filterType === "household" ? (
            <>
              {/* 🏠 Household Total Table */}
              <View
                style={[
                  styles.tableHeader,
                  { borderBottomWidth: 1, borderBottomColor: "#ddd" },
                ]}
              >
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    styles.tableCellBorder,
                  ]}
                >
                  {selectedRange === "Weekly"
                    ? "Week Range"
                    : selectedRange === "Monthly"
                    ? "Month"
                    : "Date"}
                </Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>
                  Total Usage
                </Text>
              </View>

              {totalsData.map((item, index) => {
                return (
                  <View
                    key={index}
                    style={[
                      styles.tableRow,
                      { borderBottomWidth: 1, borderBottomColor: "#eee" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableCellBorder,
                        { fontSize: 12 },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellBorder]}>
                      {item.usage}
                    </Text>
                  </View>
                );
              })}
            </>
          ) : (
            <>
              {/* Table with grid lines */}
              <View
                style={[
                  styles.tableHeader,
                  { borderBottomWidth: 1, borderBottomColor: "#ddd" },
                ]}
              >
                <Text
                  style={[
                    styles.applianceCell,
                    styles.tableHeaderText,
                    styles.tableCellBorder,
                  ]}
                >
                  Appliance
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    styles.tableCellBorder,
                  ]}
                >
                  Location
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    styles.tableCellBorder,
                  ]}
                >
                  {selectedRange === "Weekly" ? "Week Range" : "Date"}
                </Text>
                {selectedRange === "Daily" && (
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderText2,
                      styles.tableCellBorder,
                      styles.statusCell,
                    ]}
                  >
                    Status
                  </Text>
                )}
                <Text style={[styles.tableCell, styles.tableHeaderText]}>
                  Usage
                </Text>
              </View>

              {sortAppliancesData(appliances).map((item, index) => (
                <Swipeable
                  key={index}
                  renderRightActions={() => renderRightActions(item.device_id)}
                >
                  <View
                    style={[
                      styles.tableRow,
                      { borderBottomWidth: 1, borderBottomColor: "#eee" },
                    ]}
                  >
                    <Text
                      style={[styles.applianceCell, styles.tableCellBorder]}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellBorder]}>
                      {item.location}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableCellBorder,
                        { fontSize: 12 },
                      ]}
                    >
                      {item.time}
                    </Text>

                    {/* Status only for Daily */}
                    {selectedRange === "Daily" && (
                      <Text
                        style={[
                          styles.tableCell,
                          styles.tableCellBorder,
                          styles.statusCell,
                          {
                            color:
                              dailyStatus[item.device_id] === "ON"
                                ? "green"
                                : "red",
                          },
                        ]}
                      >
                        {dailyStatus[item.device_id] || "OFF"}
                      </Text>
                    )}

                    <Text style={styles.tableCell}>{item.usage}</Text>
                  </View>
                </Swipeable>
              ))}
            </>
          )
        ) : (
          <View style={{ marginTop: 20 }}>{renderChartWithTouch()}</View>
        )}

        {/* Total Usage Section */}
        <View
          style={{
            marginTop: 30,
            marginBottom: 20,
            padding: 20,
            backgroundColor: "#f8f8f8",
            borderRadius: 12,
            borderWidth: 2,
            borderColor: "#000",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
                {filterType === "all"
                  ? `Current Total ${selectedRange} Consumption \n(All Appliances)`
                  : `Current Total ${selectedRange} Consumption${
                      selectedAppliance
                        ? ` \n(${selectedAppliance.appliance_name})`
                        : ""
                    }`}
              </Text>
              {loadingTotal ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text
                  style={{ fontSize: 28, fontWeight: "bold", color: "#000" }}
                >
                  {totalUsage}
                </Text>
              )}
            </View>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "#000",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Icon name="bolt" size={32} color="#FFD700" />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <SafeAreaView style={styles.bottomNavContainer} edges={["bottom"]}>
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.replace("MainMenu")}
          >
            <Icon name="home" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Icon name="description" size={24} color="#FFD700" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab}>
            <Icon name="add" size={30} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Icon name="attach-money" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Icon name="flash-on" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default ConsumptionPage;
