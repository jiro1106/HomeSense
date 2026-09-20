# HomeSense

HomeSense is a full-stack household electricity-monitoring thesis project. It uses Tuya smart-plug telemetry to help households identify high-consumption appliances, understand usage patterns, predict bills, and receive energy-saving recommendations.

The web showcase is available at [homesense-web.vercel.app](https://homesense-web.vercel.app/).

## What I contributed

- Led a three-person thesis team developing the HomeSense system.
- Built the Python telemetry collector and MongoDB data pipelines for appliance-level and household energy analytics.
- Architected the FastAPI backend and developed 15+ REST API endpoints for monitoring, bill prediction, and recommendation workflows.
- Implemented linear-regression bill predictions and rule-based energy-saving recommendations.

## How it works

```
Tuya smart plug
↓
Python collector
↓
MongoDB
↓
FastAPI backend
↓
Prediction and recommendation services
↓
HomeSense mobile app
```

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

- `Backend/` — Tuya connection and backend-related code.
- `MVP/` — Initial product scope and thesis planning notes.
- `Postman/` — API collections and environment templates.

## Local setup

Create a Python virtual environment locally, install the project dependencies, and provide your own Tuya credentials through environment variables or a local configuration file. Never commit credentials, device identifiers, virtual environments, or generated files.

## Project status

This repository contains the thesis implementation and supporting development artifacts. The separate [web showcase](https://github.com/jiro1106/homesense-web) presents the product and mobile-app experience.
