import React, { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import EmployeeList from "./EmployeeList"; // dashboard page
import AddEmployee from "./AddEmployee";   // add employee form
import EditEmployee from "./EditEmployee";

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());

  // -------------------- Load Data --------------------
  const loadData = async () => {
    try {
      const res = await fetch(`/api/data?year=${year}`);
      const json = await res.json();
      setEmployees(json.employees || []);
      setLeaves(json.leaves || []);
    } catch (err) {
      console.error("Load data error:", err);
    }
  };

  // -------------------- Delete Leave --------------------
  const handleDeleteLeave = async (id) => {
    if (!window.confirm("Σίγουρα θέλεις να διαγράψεις αυτήν την άδεια;")) return;
    try {
      await fetch(`/api/delete-leave/${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error("Delete leave error:", err);
    }
  };

  // -------------------- Edit Leave --------------------
  const handleEditLeave = async (leave) => {
    const from = prompt("Νέα ημερομηνία έναρξης (YYYY-MM-DD):", leave.from);
    const to = prompt("Νέα ημερομηνία λήξης (YYYY-MM-DD):", leave.to);
    if (!from || !to) return;

    const days = Math.floor((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1;

    try {
      await fetch(`/api/update-leave`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leave.id, from, to, days }),
      });
      loadData();
    } catch (err) {
      console.error("Update leave error:", err);
    }
  };

  // -------------------- Add Leave --------------------
  const addLeave = async (e) => {
    e.preventDefault();
    const form = e.target;
    const employeeId = form.employee.value;
    const from = form.from.value;
    const to = form.to.value;
    const days = Math.floor((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1;

    try {
      await fetch(`/api/add-leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Date.now().toString(), employeeId, from, to, days }),
      });
      form.reset();
      loadData();
    } catch (err) {
      console.error("Add leave error:", err);
    }
  };

  // -------------------- Export --------------------
  const doExport = () => {
    window.open(`/api/export?year=${year}`, "_blank");
  };

  // -------------------- Effect --------------------
  useEffect(() => {
    loadData();
  }, [year]);

  // -------------------- Render --------------------
  return (
    <div className="container mx-auto p-4">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <Link to="/">
          <img src="/STIRIXIS.png" alt="STIRIXIS Logo" className="h-16 w-auto cursor-pointer" />
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex justify-center gap-4 mb-6">
        <Link to="/add" className="btn btn-blue">
          Προσθήκη Νέου Εργαζομένου
        </Link>
        <Link to="/edit" className="btn btn-yellow">
          Επεξεργασία Εργαζομένου
        </Link>
      </div>

      {/* Routes */}
      <Routes>
        <Route
          path="/"
          element={
            <EmployeeList
              employees={employees}
              leaves={leaves}
              year={year}
              setYear={setYear}
              addLeave={addLeave}
              loadData={loadData}
              doExport={doExport}
              handleEditLeave={handleEditLeave}
              handleDeleteLeave={handleDeleteLeave}
            />
          }
        />
        <Route path="/add" element={<AddEmployee loadData={loadData} />} />
        <Route path="/edit" element={<EditEmployee loadData={loadData} />} />
      </Routes>
    </div>
  );
}
