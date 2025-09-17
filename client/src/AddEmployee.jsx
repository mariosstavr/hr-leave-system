import React, { useState, useEffect } from "react";

export default function AddEmployee({ loadData }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [quota, setQuota] = useState("");

  // Fetch all employees
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees`); // use relative path
      const data = await res.json();
      setEmployees(data || []);
    } catch (err) {
      console.error("Error loading employees:", err);
      setEmployees([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Add new employee
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("Συμπλήρωσε το όνομα του εργαζόμενου!");

    try {
      await fetch(`/api/add-employee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Date.now().toString(),
          name: name.trim(),
          year: new Date().getFullYear(),
          days: quota ? Number(quota) : null,
        }),
      });

      setName("");
      setQuota("");
      fetchEmployees();
      if (loadData) loadData();
      alert("Ο εργαζόμενος προστέθηκε!");
    } catch (err) {
      console.error("Add employee error:", err);
      alert("Σφάλμα κατά την προσθήκη του εργαζόμενου!");
    }
  };

  // Delete employee
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Θέλετε να διαγραφεί ο εργαζόμενος "${name}" ;`)) return;

    try {
      await fetch(`/api/delete-employee/${id}`, { method: "DELETE" });
      fetchEmployees();
      if (loadData) loadData();
    } catch (err) {
      console.error("Delete employee error:", err);
      alert("Σφάλμα κατά τη διαγραφή του εργαζόμενου!");
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* Add Employee Form */}
      <h2 className="text-xl font-bold mb-4">Προσθήκη Νέου Εργαζόμενου</h2>
      <form onSubmit={handleAdd} className="flex flex-col gap-3 max-w-md mb-6">
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Όνομα εργαζόμενου"
          className="border p-2 rounded"
        />
        <input
          name="quota"
          type="number"
          value={quota}
          onChange={(e) => setQuota(e.target.value)}
          placeholder="Σύνολο δικαιούμενων ημερών (προαιρετικό)"
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Προσθήκη
        </button>
      </form>

      {/* Employee List */}
      <h2 className="text-xl font-bold mb-4">Λίστα Όλων των Εργαζομένων</h2>
      {loading ? (
        <p>Φόρτωση...</p>
      ) : employees.length === 0 ? (
        <p>Δεν υπάρχουν εργαζόμενοι.</p>
      ) : (
        <table className="table-auto border-collapse border w-full">
          <thead>
            <tr>
              <th className="border p-2">Όνομα</th>
              <th className="border p-2 text-center">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td className="border p-2">{emp.name}</td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => handleDelete(emp.id, emp.name)}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                  >
                    ❌
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
