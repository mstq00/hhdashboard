"use client";

import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, LinearScale, CategoryScale, BarElement, Title, Tooltip, Legend } from "chart.js";

// Chart.js 구성요소 등록
ChartJS.register(LinearScale, CategoryScale, BarElement, Title, Tooltip, Legend);

export function BarChart({ data, options }: { data: any; options: any }) {
  return <Bar data={data} options={options} />;
} 