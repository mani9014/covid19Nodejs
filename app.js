const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const dbpath = path.join(__dirname, "covid19India.db");
const app = express();
app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`Error message: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDbObjectToResponseObjectDistinct = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//get all states
app.get("/states/", async (request, response) => {
  const getStatesQuery = `SELECT * FROM state ORDER BY state_id`;
  const getStatesArray = await db.all(getStatesQuery);
  response.send(
    getStatesArray.map((eachState) =>
      convertDbObjectToResponseObject(eachState)
    )
  );
});

//get one state
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * FROM state WHERE state_id=${stateId}`;
  const getStateArray = await db.get(getStateQuery);
  response.send(convertDbObjectToResponseObject(getStateArray));
});

//create distinct
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistinctQuery = `INSERT INTO district(
      district_name,
    state_id,
    cases,
    cured,
    active,
    deaths
  )
   VALUES (
        '${districtName}',${stateId},${cases},${cured},${active},${deaths}
    )`;
  const addDistinctArray = await db.run(addDistinctQuery);
  response.send("District Successfully Added");
});

//get one distinct
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistinctQuery = `SELECT * FROM district WHERE district_id=${districtId}`;
  const getDistinctArray = await db.get(getDistinctQuery);
  response.send(convertDbObjectToResponseObjectDistinct(getDistinctArray));
});

//delete distinct
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistinct = `DELETE FROM district WHERE district_id=${districtId}`;
  await db.run(deleteDistinct);
  response.send("District Removed");
});

//update distinct
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const distinctDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = distinctDetails;
  const updateDistinct = `UPDATE district SET 
     district_name = '${districtName}',
     state_id=${stateId},
     cases=${cases},
     cured=${cured},
     active=${active},
     deaths=${deaths}
     WHERE district_id=${districtId}`;
  await db.run(updateDistinct);
  response.send("District Details Updated");
});

//
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `SELECT 
     SUM(cases),SUM(cured),SUM(active),SUM(deaths)
     FROM district WHERE state_id=${stateId}`;
  const stats = await db.get(getStateStatsQuery);
  // console.log(stats);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `SELECT state_id FROM district WHERE 
    district_id=${districtId}`;
  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery);
  const getStateNameQuery = `
    select state_name as stateName from state
    where state_id = ${getDistrictIdQueryResponse.state_id};
    `; //With this we will get state_name as stateName using the state_id
  const getStateNameQueryResponse = await db.get(getStateNameQuery);
  response.send(getStateNameQueryResponse);
});

module.exports = app;
