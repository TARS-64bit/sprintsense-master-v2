import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import BacklogPage from "./pages/BacklogPage";
import SprintPlanPage from "./pages/SprintPlanPage";
import BoardPage from "./pages/BoardPage";
import ForecastPage from "./pages/ForecastPage";
import DependenciesPage from "./pages/DependenciesPage";
import TeamPage from "./pages/TeamPage";
import SettingsPage from "./pages/SettingsPage";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"     element={<Dashboard />} />
          <Route path="backlog"       element={<BacklogPage />} />
          <Route path="sprint"        element={<SprintPlanPage />} />
          <Route path="board"         element={<BoardPage />} />
          <Route path="forecast"      element={<ForecastPage />} />
          <Route path="dependencies"  element={<DependenciesPage />} />
          <Route path="team"          element={<TeamPage />} />
          <Route path="settings"      element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
