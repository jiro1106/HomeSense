# HomeSense

HomeSense is a full-stack household electricity-monitoring thesis project. It uses Tuya smart-plug telemetry to help households identify high-consumption appliances, understand usage patterns, predict bills, and receive energy-saving recommendations.

The web showcase is available at [homesense-web.vercel.app](https://homesense-web.vercel.app/).

## What I contributed

- Led a three-person thesis team developing the HomeSense system.
- Built the Python telemetry collector and MongoDB data pipelines for appliance-level and household energy analytics.
- Architected the FastAPI backend and developed 15+ REST API endpoints for monitoring, bill prediction, and recommendation workflows.
- Implemented linear-regression bill predictions and rule-based energy-saving recommendations.

## How it works

<div align="center">
  <strong>Tuya smart plug</strong><br />
  ↓<br />
  <strong>Python collector</strong><br />
  ↓<br />
  <strong>MongoDB</strong><br />
  ↓<br />
  <strong>FastAPI backend</strong><br />
  ↓<br />
  <strong>Prediction and recommendation services</strong><br />
  ↓<br />
  <strong>HomeSense mobile app</strong>
</div>

## Screenshots

<table align="center">
  <tr><th>Live usage</th><th>Bill prediction</th><th>Usage history</th></tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/jiro1106/homesense-web/main/frontend/src/assets/bare-app-screen-1.png" alt="HomeSense live usage screen" width="150" /></td>
    <td align="center"><img src="https://raw.githubusercontent.com/jiro1106/homesense-web/main/frontend/src/assets/bare-app-screen-2.png" alt="HomeSense bill prediction screen" width="150" /></td>
    <td align="center"><img src="https://raw.githubusercontent.com/jiro1106/homesense-web/main/frontend/src/assets/bare-app-screen-3.png" alt="HomeSense usage history screen" width="150" /></td>
  </tr>
  <tr><th>Device details</th><th>Recommendations</th><th>Alerts</th></tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/jiro1106/homesense-web/main/frontend/src/assets/bare-app-screen-4.png" alt="HomeSense device details screen" width="150" /></td>
    <td align="center"><img src="https://raw.githubusercontent.com/jiro1106/homesense-web/main/frontend/src/assets/bare-app-screen-5.png" alt="HomeSense recommendations screen" width="150" /></td>
    <td align="center"><img src="https://raw.githubusercontent.com/jiro1106/homesense-web/main/frontend/src/assets/bare-app-screen-6.png" alt="HomeSense alerts screen" width="150" /></td>
  </tr>
</table>

## Architecture

| Layer | Technology | Purpose |
| --- | --- | --- |
| Data collection | Python, Tuya IoT SDK | Collects appliance-level telemetry from smart plugs. |
| Data storage | MongoDB | Stores device data, readings, and historical consumption. |
| Application API | FastAPI | Serves monitoring data and app workflows through REST endpoints. |
| Predictions | Python, linear regression | Estimates monthly electricity bills from usage trends. |
| Recommendations | Rule-based logic | Flags high consumption and suggests energy-saving actions. |
| Mobile app | React Native | Displays usage, predictions, alerts, and recommendations. |

## Repository contents

- `Backend/` — Python telemetry collector, FastAPI application, and backend services.
- `Frontend/` — HomeSense mobile-app source.
- `admin/` — Administrative or management-facing app code.
- `Regression/` — Prediction and regression-related work.
- `MVP/` — Initial product scope and thesis planning notes.
- `Postman/` — API collections and environment templates.

## Local setup

Create a Python virtual environment locally, install the project dependencies, and provide your own Tuya and MongoDB credentials through local environment files. Never commit credentials, device identifiers, virtual environments, or generated files.

## Project status

This repository contains the thesis implementation and supporting development artifacts. The separate [web showcase](https://github.com/jiro1106/homesense-web) presents the product and mobile-app experience.
