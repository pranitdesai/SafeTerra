# SIH 26191 — Intelligent Hazard Red-Zone, Carrying Capacity & Relocation Decision Support Portal

Build a completely new production-quality web portal from scratch for **Smart India Hackathon Problem Statement 26191**:

**“Intelligent Identification of Hazard-Based Red Zones, Carrying Capacity Assessment, and Immediate Relocation Needs for Vulnerable Habitations.”**

Do not build a simple CRUD dashboard. Build a complete **GIS-enabled disaster decision-support platform**.

The system must be designed for **all of India**, but use **Dehradun District, Uttarakhand** as the primary demonstration district because it has useful hazard and historical disaster data.

Dehradun must be demo data/configuration, NOT a hard-coded limitation.

---

# 1. CORE OBJECTIVE

The portal must answer this complete question:

> Which habitations are unsafe, why are they unsafe, how urgent is relocation, where can people safely relocate, can that site actually support them, what is the bottleneck, and what route should be used to reach the relocation site?

The complete workflow must be:

India\
→ State\
→ District\
→ Block/Tehsil\
→ Habitation/Settlement\
→ Multi-hazard assessment\
→ Hazard-zone classification\
→ Vulnerability\
→ Risk score\
→ Red/Safe/Buffer classification\
→ Relocation priority\
→ Candidate safe relocation sites\
→ Site suitability\
→ Carrying capacity\
→ Infrastructure bottleneck\
→ Actual route\
→ Relocation recommendation\
→ Explainable report

---

# 2. TECHNOLOGY STACK

Use:

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- MapLibre GL JS
- TanStack Query
- React Router
- Recharts or equivalent charting library

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy 2.x
- GeoAlchemy2
- Alembic

## Database

- PostgreSQL
- PostGIS

## GIS

- PostGIS spatial queries
- GeoJSON
- MapLibre
- OpenStreetMap-compatible road/network data
- Spatial distancment queries

## Authenticatione/intersection/contain

Implement secure JWT-based authentication with:

- access token
- refresh token
- password hashing
- role-based authorization

Do NOT use mock authentication in the final implementation.

---

# 3. USER ROLES

Implement these roles.

## SUPER ADMIN / ADMINISTRATOR

Full system access.

Can:

- create users
- create District Disaster Management Officers
- assign officers to districts
- manage states/districts
- manage datasets
- manage hazard layers
- manage settlements
- manage relocation sites
- view all districts
- view all analytics
- trigger data ingestion
- view audit logs
- configure risk weights
- manage system settings
- view nationwide map
- approve/override recommendations where appropriate

## DISTRICT DISASTER MANAGEMENT OFFICER (DDMO)

A DDMO is assigned to a district.

For the demonstration:

- create a DDMO assigned to **Dehradun District**

After login:

- automatically open Dehradun dashboard
- show Dehradun-focused analytics
- show Dehradun settlements
- show Dehradun hazard zones
- show Dehradun disaster history
- show Dehradun relocation candidates

However, the backend must remain generic.

A DDMO must NOT be able to access another district unless explicitly authorized by the system.

Never hard-code:

```text
district = Dehradun
```

Instead use:

```text
user.assigned_district_id
```

---

# 4. AUTHENTICATION FLOW

Create:

/login

Login fields:

- email/username
- password

After authentication:

ADMIN:\
→ National Dashboard

DDMO:\
→ Assigned District Dashboard

Implement:

- protected routes
- role middleware/dependencies
- token expiration
- refresh mechanism
- logout
- unauthorized handling
- audit logging

Never expose passwords or sensitive authentication information through APIs.

---

# 5. DATABASE DESIGN

Create a proper normalized PostgreSQL + PostGIS schema.

At minimum include:

## Administrative

- states
- districts
- blocks
- tehsils
- villages/settlements
- administrative\_boundaries

Every spatial administrative entity should support geometry.

Use appropriate PostGIS geometry types and SRIDs.

---

# 6. SETTLEMENT DATA

Each settlement should support:

- id
- name
- state\_id
- district\_id
- block\_id
- tehsil\_id
- latitude
- longitude
- geometry
- population
- households
- population\_density
- vulnerable\_population
- elderly\_population
- children\_population
- disabled\_population
- road\_access
- nearest\_healthcare\_distance
- nearest\_shelter\_distance
- nearest\_school\_distance
- water\_access
- electricity\_access
- sanitation\_access
- current\_hazard\_status
- risk\_score
- priority\_level

Do not calculate important values only in the frontend.

Backend must calculate and expose them.

---

# 7. MULTI-HAZARD SYSTEM

The system must support multiple hazards, not just one.

At minimum:

- flood
- landslide
- cloudburst
- extreme rainfall
- river erosion
- flash flood
- earthquake
- forest fire
- drought
- coastal hazard where applicable
- other future hazards

Do not hard-code the application around Dehradun-specific hazards.

Use a generic hazard model.

Each hazard should support:

- hazard type
- intensity
- probability
- severity
- spatial geometry
- source
- confidence
- date
- data version
- status

---

# 8. HAZARD ZONE CLASSIFICATION

Implement spatial hazard-zone classification.

Each location/settlement can be classified into:

- RED ZONE
- BUFFER / CAUTION ZONE
- SAFE ZONE

The exact classification must be configurable.

The backend must support multiple hazard layers being combined.

Example:

Settlement A:

- flood risk = high
- landslide risk = very high
- extreme rainfall = high
- historical disaster frequency = high

Result:\
RED ZONE

Do not make the classification a frontend-only calculation.

Create a backend service such as:

HazardClassificationService

It should:

1. retrieve relevant hazard layers
2. perform spatial intersection/containment
3. calculate hazard exposure
4. combine multiple hazards
5. return classification
6. return explanation/evidence

---

# 9. RISK ENGINE

Create a dedicated backend risk engine.

Initial configurable baseline:

- Flood Risk: 25%
- Landslide Risk: 20%
- Extreme Rainfall: 15%
- Disaster History: 15%
- Population Exposure: 10%
- Vulnerability: 10%
- Evacuation Difficulty: 5%

Total = 100%.

Do NOT claim these are official government weights.

Store the weights/configuration so they can be changed by an administrator.

Return:

```json
{
  "risk_score": 91,
  "risk_level": "VERY_HIGH",
  "zone_classification": "RED",
  "contributors": [],
  "explanation": [],
  "model_version": "v1"
}
```

The system must explain WHY the score is high.

Example:

```text
Landslide exposure: Very High
Historical disasters: High
Population exposure: High
Evacuation difficulty: High
```

Avoid black-box outputs.

---

# 10. VULNERABILITY ENGINE

Calculate vulnerability using available demographic and infrastructure indicators.

Consider:

- elderly
- children
- disability
- population density
- poverty/deprivation indicators if available
- healthcare accessibility
- road accessibility
- shelter availability
- water access
- electricity
- sanitation
- previous disaster impact

Return:

- vulnerability score
- vulnerability level
- contributing factors

---

# 11. DISASTER HISTORY

Store historical disaster events.

Each event should support:

- disaster type
- date
- location
- geometry
- severity
- deaths
- injuries
- houses damaged
- infrastructure damage
- affected population
- source
- confidence

Use historical frequency/severity as an input to risk and priority calculations.

---

# 12. RELOCATION PRIORITY

Every vulnerable settlement should receive:

- priority score
- priority level
- urgency
- reason

Priority levels:

- IMMEDIATE
- SHORT\_TERM
- MEDIUM\_TERM
- MONITOR

Example:

```text
Settlement: X

Risk: 91
Vulnerability: 87
Population exposed: 4200
Historical disaster frequency: High
Evacuation difficulty: High

Priority:
IMMEDIATE
```

The priority result must be explainable.

---

# 13. SAFE RELOCATION SITES

Create a relocation-site system.

Each site must support:

- site name
- geometry/location
- district
- land area
- ownership/status
- hazard exposure
- distance from source settlement
- road accessibility
- water availability
- electricity availability
- healthcare accessibility
- school accessibility
- shelter availability
- sanitation
- environmental constraints
- estimated capacity
- effective capacity
- suitability score

Only suitable/safe sites should be recommended.

---

# 14. SITE SUITABILITY

Create a configurable suitability engine.

Evaluate:

- hazard safety
- distance
- road access
- water
- electricity
- healthcare
- schools
- sanitation
- land availability
- environmental constraints
- population capacity

Return:

```text
Suitability Score: 91/100
Suitability Level: HIGH
```

And explain the score.

---

# 15. CARRYING CAPACITY ENGINE

This is a critical feature.

Do NOT calculate capacity simply from land area.

Calculate effective capacity using critical resources.

Example:

```text
Land capacity:       8000
Water capacity:      5000
Healthcare capacity: 6000
Road capacity:       7000
Electricity:         8000
```

Effective capacity:

```text
5000
```

because water is the bottleneck.

Return:

```json
{
  "effective_capacity": 5000,
  "bottleneck": "WATER",
  "status": "SUFFICIENT"
}
```

If:

```text
Population requiring relocation = 6200
Effective capacity = 5000
```

return:

```text
STATUS = INSUFFICIENT
BOTTLENECK = WATER
CAPACITY GAP = 1200
```

This must be visible in the UI.

---

# 16. RELOCATION RECOMMENDATION ENGINE

For an unsafe settlement:

1. identify suitable sites
2. remove unsafe sites
3. calculate distance
4. calculate route feasibility
5. calculate suitability
6. calculate carrying capacity
7. identify bottlenecks
8. rank candidate sites
9. recommend best site(s)

Example:

```text
SOURCE
Dehradun Settlement A

↓ Risk = 91
↓ Priority = IMMEDIATE

Candidate sites:

Site A
Suitability 91
Capacity 5200
Distance 18 km
Status Suitable

Site B
Suitability 84
Capacity 7000
Distance 31 km
Status Suitable

Site C
Suitability 63
Capacity 3000
Status Insufficient
```

Recommendation:

```text
Recommended Site: Site A
```

---

# 17. ACTUAL ROUTE TO RELOCATION SITE

This is mandatory.

The map must not only show a straight line.

Display the actual road route from:

```text
Unsafe habitation
        ↓
Road network
        ↓
Relocation site
```

Show:

- route polyline
- road distance
- estimated travel time
- route status
- route hazards
- blocked/unsafe segments if data is available

Use actual road-network routing where possible.

If a routing engine is used, isolate it behind a backend service.

Example:

```text
GET /api/relocation/{settlement_id}/route/{site_id}
```

Return:

```json
{
  "distance_km": 18.4,
  "duration_minutes": 42,
  "geometry": {},
  "hazard_crossings": [],
  "route_status": "FEASIBLE"
}
```

---

# 18. INDIA-WIDE MAP

The main map must initially show:

```text
INDIA
```

with state/district boundaries.

Admin:

- can browse all India

DDMO:

- map automatically focuses on assigned district
- but the underlying map remains national-capable

Use map layers for:

- states
- districts
- settlements
- hazard zones
- red zones
- safe zones
- relocation sites
- infrastructure
- disaster events
- routes

Use layer toggles.

---

# 19. DEHRADUN DEMONSTRATION

Prepare deterministic seed/demo data for:

```text
India
└── Uttarakhand
    └── Dehradun
        ├── settlements
        ├── hazard zones
        ├── historical disasters
        ├── infrastructure
        ├── relocation sites
        ├── carrying capacity
        └── routes
```

The demo must be reproducible.

Do not fabricate data and present it as official data.

Clearly label demonstration/seed data where authoritative data is not available.

Store:

- source
- source URL/name
- date collected
- confidence
- dataset version

---

# 20. DASHBOARD

Create a modern government/disaster-management style dashboard.

## National Admin Dashboard

Show:

- India map
- total districts
- high-risk settlements
- red-zone settlements
- immediate relocation cases
- available relocation sites
- capacity shortages
- active alerts

## DDMO Dashboard

Show assigned district:

```text
Dehradun District
```

KPIs:

- settlements assessed
- red-zone settlements
- high-risk settlements
- immediate relocation cases
- safe relocation sites
- total relocation capacity
- capacity deficits
- critical bottlenecks

---

# 21. SETTLEMENT DETAIL PAGE

Clicking a settlement should show:

```text
Settlement Name
District
Population

Risk Score
Risk Level
Zone Classification
Priority

Hazards
├── Flood
├── Landslide
├── Rainfall
└── Historical Events

Vulnerability

Why is this settlement at risk?

Recommended relocation sites

Best relocation site

Carrying capacity

Bottleneck

Route
```

Include map visualization.

---

# 22. RELOCATION PLANNER

Create a dedicated page:

```text
Select Settlement
        ↓
Assess Risk
        ↓
Find Safe Sites
        ↓
Compare Sites
        ↓
Check Capacity
        ↓
Check Route
        ↓
Recommend Site
```

Provide a comparison table:

| Site | Suitability | Capacity | Distance | Bottleneck | Status |
| ---- | ----------: | -------: | -------: | ---------- | ------ |

Allow the officer to inspect each site.

---

# 23. SCENARIO SIMULATION

Implement a scenario engine.

Example:

```text
Rainfall Increase: +30%
```

Then recalculate:

- hazard exposure
- risk score
- zone classification
- priority
- relocation requirement
- capacity gap
- recommended sites

Clearly label scenario outputs as:

```text
SIMULATION
```

Do not present them as observed facts.

---

# 24. DATA PROVENANCE

Every important dataset should track:

- source
- source type
- collected\_at
- valid\_from
- valid\_to if applicable
- confidence
- spatial reference
- dataset version

The UI should show:

```text
Data source
Last updated
Confidence
Model version
```

---

# 25. API DESIGN

Organize FastAPI routers by domain.

Example:

```text
/api/auth
/api/users
/api/states
/api/districts
/api/blocks
/api/settlements
/api/hazards
/api/hazard-zones
/api/disasters
/api/infrastructure
/api/risk
/api/vulnerability
/api/priority
/api/relocation-sites
/api/suitability
/api/capacity
/api/bottlenecks
/api/routes
/api/scenarios
/api/reports
/api/alerts
/api/admin
```

Use:

```text
router
→ schema validation
→ service
→ database
```

Do not put complex business logic directly inside route handlers.

---

# 26. POSTGIS REQUIREMENTS

Use PostGIS for actual spatial operations.

Implement backend spatial queries for:

- point in polygon
- polygon intersection
- distance between settlement and site
- hazard overlap
- infrastructure proximity
- route/hazard intersection
- district boundary filtering
- nearest candidate sites

Do not perform all spatial calculations in JavaScript.

---

# 27. SECURITY

Implement:

- password hashing
- JWT
- role-based authorization
- district-level authorization
- protected admin routes
- protected DDMO routes
- audit logs
- input validation
- SQL injection-safe ORM usage
- secure CORS configuration
- environment variables for secrets

Never commit secrets.

---

# 28. AUDIT LOG

Record important actions:

- login
- logout
- user creation
- officer assignment
- risk recalculation
- scenario execution
- relocation recommendation
- data import
- administrative override

Store:

- user
- action
- timestamp
- entity
- previous value where appropriate
- new value where appropriate

---

# 29. REPORTING

Allow an officer to generate a settlement relocation report.

Report should contain:

```text
Settlement
District
Population

Risk score
Risk level
Zone classification

Hazard assessment

Vulnerability

Disaster history

Relocation priority

Recommended relocation site

Suitability

Carrying capacity

Bottleneck

Route distance/time

Data sources

Model version

Generated timestamp
```

---

# 30. UI DESIGN

Use a professional disaster-management/GIS interface.

Style:

- clean
- serious
- government/command-center feel
- information-dense but readable
- responsive
- map-first

Main navigation:

```text
Dashboard
Map
Settlements
Hazards
Risk
Relocation
Capacity
Scenarios
Reports
Alerts

Admin-only:
Users
Data Management
Audit Logs
System Configuration
```

---

# 31. MAP UX

The map is a core product feature.

Support:

- zoom
- pan
- search
- district selection
- settlement selection
- layer controls
- legend
- popup
- route visualization
- hazard visualization
- red-zone highlighting
- safe-site highlighting

Clicking a settlement should open a detailed side panel.

Clicking a relocation site should show:

```text
Site
Suitability
Capacity
Bottleneck
Distance
Route
```

---

# 32. DEMO USER

Create deterministic seed users.

Example:

```text
Administrator
email: admin@demo.local

DDMO
email: ddmo.dehradun@demo.local
district: Dehradun
```

Do not expose real credentials in production documentation.

Passwords must be hashed.

---

# 33. DEMO STORY

The application must support this presentation sequence:

### Step 1

Login as DDMO.

### Step 2

System opens:

```text
Dehradun District Dashboard
```

### Step 3

Open map.

Show:

- district boundary
- settlements
- hazard zones
- red zones
- relocation sites

### Step 4

Select a high-risk settlement.

Show:

```text
Risk = High/Very High
Zone = RED
Priority = IMMEDIATE
```

### Step 5

Explain WHY.

Show hazard contributors and historical disaster evidence.

### Step 6

Click:

```text
Find Relocation Sites
```

### Step 7

Compare candidate sites.

### Step 8

Show:

```text
Recommended Site
Suitability
Effective Capacity
Bottleneck
```

### Step 9

Click:

```text
View Route
```

Display the actual road route on the map.

### Step 10

Run:

```text
Scenario: Rainfall +30%
```

Show how risk and relocation requirements change.

### Step 11

Generate report.

This must work as one continuous end-to-end workflow.

---

# 34. IMPORTANT DEVELOPMENT RULES

Do NOT:

- hard-code Dehradun throughout the code
- create fake AI predictions and call them real
- put business logic in React
- calculate important risk only in frontend
- treat the map as decoration
- use random values
- create disconnected CRUD pages
- duplicate database logic
- expose database internals directly to frontend
- skip migrations
- skip tests
- redesign architecture unnecessarily

Do:

- build reusable services
- use PostgreSQL/PostGIS properly
- use migrations
- use seed data
- use deterministic calculations
- keep model interfaces modular
- make the AI model pluggable
- expose explainable outputs
- maintain data provenance
- write tests
- keep APIs documented through FastAPI/OpenAPI

---

# 35. AI MODEL INTEGRATION

The ML model is being developed separately by another team member.

Therefore create a clean interface such as:

```text
RiskModel
    ↓
DeterministicRiskModel
    ↓
MLRiskModel
```

The portal must work WITHOUT the ML model initially.

Later the ML model can be plugged into:

```text
hazard classification
risk prediction
vulnerability prediction
relocation priority
```

Do not tightly couple the application to one ML framework.

The backend should be able to receive model outputs such as:

```json
{
  "risk_score": 91,
  "risk_probability": 0.91,
  "zone": "RED",
  "model_version": "ml-v1",
  "confidence": 0.88
}
```

---

# 36. TESTING

Create tests for:

- authentication
- authorization
- district isolation
- settlement API
- hazard API
- spatial queries
- risk calculation
- vulnerability calculation
- priority calculation
- carrying capacity
- bottleneck detection
- relocation ranking
- route API
- scenario simulation

Include integration tests using PostgreSQL/PostGIS where appropriate.

---

# 37. IMPLEMENTATION ORDER

Do not attempt to build everything simultaneously.

Build in this order:

## Phase 1

Project foundation

## Phase 2

PostgreSQL + PostGIS

## Phase 3

Authentication + RBAC

## Phase 4

Administrative hierarchy

## Phase 5

Settlements

## Phase 6

Hazards + hazard zones

## Phase 7

Disaster history

## Phase 8

Risk + vulnerability + explainability

## Phase 9

Relocation priority

## Phase 10

Relocation sites

## Phase 11

Suitability + carrying capacity

## Phase 12

Bottleneck engine

## Phase 13

Routing

## Phase 14

India/Dehradun GIS map

## Phase 15

Dashboard/UI

## Phase 16

Scenario simulation

## Phase 17

Reports

## Phase 18

Testing/security/audit

## Phase 19

ML integration

---

# 38. FIRST TASK

Start by creating the complete project foundation.

Before implementing individual features:

1. Create the project structure.
2. Configure PostgreSQL/PostGIS.
3. Configure SQLAlchemy + GeoAlchemy2.
4. Configure Alembic.
5. Create environment configuration.
6. Create FastAPI application.
7. Create React frontend.
8. Create authentication architecture.
9. Create user/role/district schema.
10. Create initial migrations.
11. Create deterministic seed system.
12. Create API error handling.
13. Create logging.
14. Create testing structure.

Then implement authentication and RBAC first.

After that implement the complete vertical slice:

```text
Dehradun
→ Settlement
→ Hazard
→ Risk
→ Red Zone
→ Priority
→ Relocation Site
→ Suitability
→ Capacity
→ Bottleneck
→ Route
→ Recommendation
```

Do not proceed to advanced AI until this complete workflow works.

---

# 39. DEFINITION OF DONE

The project is considered MVP-complete only when a DDMO can:

1. Login.
2. Automatically access their assigned district.
3. See the district on the GIS map.
4. See settlements.
5. See multi-hazard zones.
6. Identify red-zone settlements.
7. Open a settlement.
8. See risk and vulnerability.
9. Understand why it is risky.
10. See relocation priority.
11. Find safe relocation sites.
12. Compare candidate sites.
13. See carrying capacity.
14. See the bottleneck.
15. See actual road route.
16. Receive a ranked recommendation.
17. Run a scenario.
18. Generate a report.

The Administrator must additionally be able to:

- manage DDMOs
- assign districts
- view all India
- manage datasets
- inspect audit logs
- configure risk parameters

Build the system so that **Dehradun is the first working demonstration, but adding another Indian district requires data/configuration rather than rewriting application code.**

Prioritize correctness, explainability, spatial intelligence, security, maintainability, and a complete end-to-end working demonstration over adding unnecessary features.
