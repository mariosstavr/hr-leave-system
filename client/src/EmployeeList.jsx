import React, { useState } from "react";
import DatePicker from "react-multi-date-picker";

export default function EmployeeList({
  employees = [],
  leaves = [],
  year,
  setYear,
  loadData,
  doExport,
  handleEditLeave,
  handleDeleteLeave,
  API_URL,
}) {
  const [form, setForm] = useState({ employee: "", dates: [] });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const addLeave = async (leaveData) => {
    try {
      await fetch(`/api/add-leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...leaveData, id: Date.now().toString() }),
      });
      loadData();
    } catch (err) {
      console.error("Failed to add leave:", err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.employee || form.dates.length === 0) return;
    const sorted = [...form.dates].sort((a, b) => new Date(a) - new Date(b));
    const from = sorted[0].format("YYYY-MM-DD");
    const to = sorted[sorted.length - 1].format("YYYY-MM-DD");
    addLeave({ employeeId: form.employee, from, to, days: sorted.length });
    setForm({ employee: "", dates: [] });
  };

  // click handler (stringify IDs to avoid type mismatch)
  const handleSelectEmployee = (employeeOrId) => {
    const id = employeeOrId && employeeOrId.id ? String(employeeOrId.id) : String(employeeOrId);
    console.log("Clicked employee:", id, employeeOrId);
    setSelectedEmployeeId(id);
  };

  // make sure we compare strings to avoid number/string mismatches
  const filteredLeaves = selectedEmployeeId
    ? (leaves || []).filter((l) => String(l.employeeId) === String(selectedEmployeeId))
    : leaves || [];

  const selectedEmployee = (employees || []).find(
    (x) => String(x.id) === String(selectedEmployeeId)
  );

  return (
    <div>
      {/* Add Leave Form */}
      <div className="card mb-4 p-4 border rounded shadow">
        <h3 className="text-lg font-bold mb-2">Καταχώρηση Άδειας</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <select
            name="employee"
            required
            className="border p-2 rounded"
            value={form.employee}
            onChange={(e) => setForm({ ...form, employee: e.target.value })}
          >
            <option value="">-- Επέλεξε υπάλληλο --</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <DatePicker
            multiple
            value={form.dates}
            onChange={(dates) => setForm({ ...form, dates })}
            format="YYYY-MM-DD"
            className="border p-2 rounded"
          />

          {form.dates.length > 0 && (
            <small className="text-gray-600">Επιλεγμένες ημέρες: {form.dates.length}</small>
          )}

          <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            Καταχώρηση
          </button>
        </form>
      </div>

      {/* Year Filter & Export */}
      <div className="card mb-4 p-4 border rounded shadow">
        <h3 className="text-lg font-bold mb-2">Φίλτρο Έτους</h3>
        <div className="flex items-center gap-2">
          <label>Επιλογή Έτους:</label>
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="border p-2 rounded" />

          <button onClick={doExport} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Export σε Excel
          </button>

          <button
            onClick={() => window.open(`/api/export-summary?year=${year}`, "_blank")}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Export Σύνοψη
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card mb-4 p-4 border rounded shadow">
        <h3 className="text-lg font-bold mb-2">Εργαζόμενοι</h3>
        <table className="table-auto border-collapse border w-full">
          <thead>
            <tr>
              <th className="border p-2">Όνομα</th>
              <th className="border p-2">Δικαιούμενες</th>
              <th className="border p-2">Πήρε</th>
              <th className="border p-2">Υπόλοιπο</th>
            </tr>
          </thead>
          <tbody>
            {(employees || []).map((e) => (
              <tr
                key={e.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectEmployee(e)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") handleSelectEmployee(e);
                }}
                // inline style to force pointer cursor if some global CSS overrides it
                style={{ cursor: "pointer", userSelect: "none" }}
                className={`${
                  String(selectedEmployeeId) === String(e.id) ? "bg-yellow-100 font-semibold" : "hover:bg-gray-50"
                }`}
              >
                <td className="border p-2" style={{ cursor: "pointer" }}>{e.name}</td>
                <td className="border p-2" style={{ cursor: "pointer" }}>{e.quota ?? "-"}</td>
                <td className="border p-2" style={{ cursor: "pointer" }}>{e.totalTaken}</td>
                <td className="border p-2" style={{ cursor: "pointer" }}>{e.remaining ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {selectedEmployee && (
          <div className="mt-2 flex items-center gap-2">
            <div className="px-3 py-1 border rounded">Επιλεγμένος: {selectedEmployee.name}</div>
            <button className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500" onClick={() => setSelectedEmployeeId(null)}>
              Εμφάνιση όλων
            </button>
          </div>
        )}
      </div>

      {/* Leaves Table */}
      <div className="card mb-4 p-4 border rounded shadow">
        <h3 className="text-lg font-bold mb-2">Καταχωρήσεις Άδειας ({year})</h3>
        <table className="table-auto border-collapse border w-full">
          <thead>
            <tr>
              <th className="border p-2">Εργαζόμενος</th>
              <th className="border p-2">From</th>
              <th className="border p-2">To</th>
              <th className="border p-2">Ημέρες</th>
              <th className="border p-2">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {(filteredLeaves || []).map((l) => {
              const emp = (employees || []).find((e) => String(e.id) === String(l.employeeId));
              return (
                <tr key={l.id}>
                  <td className="border p-2">{emp ? emp.name : l.employeeId}</td>
                  <td className="border p-2">{l.from}</td>
                  <td className="border p-2">{l.to}</td>
                  <td className="border p-2">{l.days}</td>
                  <td className="border p-2 flex gap-2">
                    <button onClick={() => handleEditLeave(l)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "16px" }}>
                      ✏️
                    </button>
                    <button onClick={() => handleDeleteLeave(l.id)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "16px" }}>
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
