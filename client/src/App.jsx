import { useState } from "react";
import "./App.css";

const API_URL = "https://sweety-glucose-tracker.onrender.com/api";

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [readings, setReadings] = useState([]);
  const [readingDate, setReadingDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [slot, setSlot] = useState("Morning (fasting)");
  const [glucoseValue, setGlucoseValue] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [reportType, setReportType] = useState("daily");
const [reportDate, setReportDate] = useState(
  new Date().toLocaleDateString("en-CA")
);
const [reportMonth, setReportMonth] = useState(
  new Date().toISOString().slice(0, 7)
);
const [reportData, setReportData] = useState(null);

  async function handleAuth(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/signup";
      const body = isLogin
        ? { email, password }
        : { name, email, password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Request failed");

      if (isLogin) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setMessage("");
        await fetchReadings(data.token);
      } else {
        setMessage("Account created successfully! Please log in.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (error) {
      setMessage(error.message || "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function fetchReadings(authToken = token) {
    try {
      const response = await fetch(`${API_URL}/readings`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load readings");

      setReadings(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function fetchReport() {
  setMessage("");
  setReportData(null);

  try {
    let endpoint = "";

    if (reportType === "daily") {
      endpoint = `/readings/reports/daily?date=${reportDate}`;
    } else if (reportType === "monthly") {
      endpoint = `/readings/reports/monthly?month=${reportMonth}`;
    } else {
      endpoint = "/readings/reports/previous-month";
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load report");
    }

    setReportData(data);
  } catch (error) {
    setMessage(error.message);
  }
}

  async function addReading(event) {
  event.preventDefault();
  setMessage("");

  try {
    const isEditing = editingId !== null;

    const response = await fetch(
      isEditing
        ? `${API_URL}/readings/${editingId}`
        : `${API_URL}/readings`,
      {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reading_date: readingDate,
          slot,
          value: Number(glucoseValue),
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not save reading");

    setMessage(isEditing ? "Reading updated successfully!" : "Reading added successfully!");
    setGlucoseValue("");
    setEditingId(null);
    await fetchReadings();
  } catch (error) {
    setMessage(error.message);
  }
}

  async function editReading(reading) {
  setEditingId(reading.id);
  setReadingDate(new Date(reading.reading_date).toLocaleDateString("en-CA"));
  setSlot(reading.slot);
  setGlucoseValue(String(reading.value));
  setMessage("Editing selected reading. Update the details and save.");
}


  async function deleteReading(id) {
    try {
      const response = await fetch(`${API_URL}/readings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not delete reading");

      setMessage("Reading deleted successfully!");
      await fetchReadings();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setReadings([]);
    setMessage("");
  }

  function switchMode(loginMode) {
    setIsLogin(loginMode);
    setMessage("");
  }

  if (token) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <div>
            <h1>Sweety 💗</h1>
            <p>Your personal blood glucose tracker</p>
          </div>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </header>

        <section className="dashboard-card">
          <h2>Add Glucose Reading</h2>
          <form onSubmit={addReading}>
            <label>
              Date
              <input
                type="date"
                value={readingDate}
                onChange={(event) => setReadingDate(event.target.value)}
                required
              />
            </label>

            <label>
              Reading Slot
              <select value={slot} onChange={(event) => setSlot(event.target.value)}>
                <option>Morning (fasting)</option>
                <option>After breakfast</option>
                <option>After lunch</option>
                <option>After dinner</option>
              </select>
            </label>

            <label>
              Glucose Value (mg/dL)
              <input
                type="number"
                min="40"
                max="600"
                value={glucoseValue}
                onChange={(event) => setGlucoseValue(event.target.value)}
                placeholder="Enter glucose value"
                required
              />
            </label>

            <button className="submit-btn" type="submit">
  {editingId !== null ? "Update Reading" : "Save Reading"}
</button>

{editingId !== null && (
  <button
    type="button"
    className="refresh-btn"
    onClick={() => {
      setEditingId(null);
      setGlucoseValue("");
      setMessage("");
    }}
  >
    Cancel Edit
  </button>
)}

          </form>
          {message && <p className="message">{message}</p>}
        </section>

        <section className="dashboard-card">
          <div className="section-heading">
            <h2>Reading History</h2>
            <button className="refresh-btn" onClick={() => fetchReadings()}>
              Refresh
            </button>
          </div>

          {readings.length === 0 ? (
            <p>No readings saved yet.</p>
          ) : (
            <div className="reading-list">
              {readings.map((reading) => (
                <div className="reading-item" key={reading.id}>
                  <div>
                    <strong>{reading.value} mg/dL</strong>
                    <p>{new Date(reading.reading_date).toLocaleDateString()} · {reading.slot}</p>
                  </div>

                  <button
  className="refresh-btn"
  onClick={() => editReading(reading)}
>
  Edit
</button>

                  <button
                    className="delete-btn"
                    onClick={() => deleteReading(reading.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

                <section className="dashboard-card">
          <h2>Glucose Reports</h2>

          <label>
            Report Type
            <select
              value={reportType}
              onChange={(event) => {
                setReportType(event.target.value);
                setReportData(null);
              }}
            >
              <option value="daily">Daily Report</option>
              <option value="monthly">Monthly Report</option>
              <option value="previous">Previous Month</option>
            </select>
          </label>

          {reportType === "daily" && (
            <label>
              Select Date
              <input
                type="date"
                value={reportDate}
                onChange={(event) => setReportDate(event.target.value)}
              />
            </label>
          )}

          {reportType === "monthly" && (
            <label>
              Select Month
              <input
                type="month"
                value={reportMonth}
                onChange={(event) => setReportMonth(event.target.value)}
              />
            </label>
          )}

          <button className="submit-btn" onClick={fetchReport}>
            Generate Report
          </button>

          {reportData && reportType === "daily" && (
            <div className="report-result">
              <h3>Daily Report — {reportData.date}</h3>
              <p>Total readings: {reportData.count}</p>

              {reportData.readings.length === 0 ? (
                <p>No readings found for this date.</p>
              ) : (
                reportData.readings.map((reading, index) => (
                  <p key={index}>
                    {reading.slot}: <strong>{reading.value} mg/dL</strong>
                  </p>
                ))
              )}
            </div>
          )}

          {reportData && reportType === "monthly" && (
            <div className="report-result">
              <h3>Monthly Report — {reportData.month}</h3>
              <p>Total readings: {reportData.summary.total_readings}</p>
              <p>Average: {reportData.summary.average_value ?? "N/A"} mg/dL</p>
              <p>Minimum: {reportData.summary.min_value ?? "N/A"} mg/dL</p>
              <p>Maximum: {reportData.summary.max_value ?? "N/A"} mg/dL</p>
            </div>
          )}

          {reportData && reportType === "previous" && (
            <div className="report-result">
              <h3>Previous Month Report</h3>
              {reportData.report.message ? (
                <p>{reportData.report.message}</p>
              ) : (
                <>
                  <p>Month: {reportData.report.month}</p>
                  <p>Total readings: {reportData.report.total_readings}</p>
                  <p>Average: {reportData.report.average_value} mg/dL</p>
                  <p>Minimum: {reportData.report.min_value} mg/dL</p>
                  <p>Maximum: {reportData.report.max_value} mg/dL</p>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="auth-card">
        <div className="logo">♡</div>
        <h1>Sweety</h1>
        <p className="subtitle">Your personal blood glucose tracker</p>

        <div className="tabs">
          <button
            type="button"
            className={isLogin ? "active" : ""}
            onClick={() => switchMode(true)}
          >
            Login
          </button>
          <button
            type="button"
            className={!isLogin ? "active" : ""}
            onClick={() => switchMode(false)}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleAuth}>
          {!isLogin && (
            <label>
              Full Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                required
              />
            </label>
          )}

          <label>
            Email Address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              minLength={8}
              required
            />
          </label>

          <button className="submit-btn" type="submit" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        <p className="switch-text">
          {isLogin ? "New to Sweety?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => switchMode(!isLogin)}>
            {isLogin ? "Create account" : "Login"}
          </button>
        </p>

        <p className="footer">Track your health, one reading at a time 💗</p>
      </div>
    </div>
  );
}

export default App;
